// ---------------------------------------------------------------------------
// @actora/sdk — useAgentRunner React Hook
// ---------------------------------------------------------------------------
// Wraps AgentRunner.useAgent() for React + wagmi integration.
//
//   const { ctx, isLoading, error } = useAgentRunner(agentId)
//   // ctx.prompt → inject into LLM
//   // ctx.skills → RunnableSkill[] with execute()
//   // ctx.mcp    → MCP connection info
// ---------------------------------------------------------------------------

'use client'

import { useState, useEffect, useRef } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import type { Address, TypedDataDomain } from 'viem'

import { AgentRunner } from '../agent/agent-runner'
import type { AgentRunContext, OnChainReader } from '../agent/agent-runner'
import { IPFSFetcher } from '../registry/ipfs-fetcher'
import { KNOWN_CHAINS } from '../config/config'
import type { ChainConfig } from '../config/config'
import {
  DEFAULT_DERIVATION_MESSAGE,
  buildPayloadKeyTypedData,
  derivePrivateKeyFromIkm,
} from '../core/crypto'
import type { DerivationMode, Eip712Types, WalletKeyDerivationParams } from '../core/crypto'
import { evaluatePrf } from '../core/webauthn-prf'

// ── IdentityRegistry ABI (minimal — only what useAgent needs) ──────────────

const IDENTITY_REGISTRY_ABI = [
  // getAgentMetadata returns MetadataEntry[] with key+value strings
  {
    name: 'getAgentMetadata',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'key', type: 'string' },
          { name: 'value', type: 'bytes' },
        ],
      },
    ],
  },
] as const

// ── SubscriptionManager ABI (minimal) ─────────────────────────────────────

const SUBSCRIPTION_MANAGER_ABI = [
  {
    name: 'hasActiveSubscription',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'subscriber', type: 'address' },
      { name: 'agentId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// ── Hook Config ────────────────────────────────────────────────────────────

/**
 * OPT-IN browser-wallet / passkey decryption. EIP-1193 wallets cannot export
 * the account private key, so the payload key is derived from a deterministic
 * secret instead — all three modes feed the *same* HKDF-SHA256 construction:
 *
 *   v1 `personal-sign-hkdf` : `personal_sign` of a frozen text message
 *   v2 `eip712-hkdf`        : EIP-712 typed data (structured prompt)
 *   v3 `webauthn-prf-hkdf`  : WebAuthn PRF output — *not* a signature, bound by
 *                             the browser to the RP ID, so it cannot be replayed
 *                             by a phishing site on another origin
 *
 * The derived key never leaves the browser and the account key is untouched.
 * Once agents are published with a set of values, that whole set is frozen:
 *
 *   v1: `message` / `salt` / `infoPrefix`
 *   v2: `domain` / `types` / `primaryType` / `infoPrefix`
 *       (the typed-data message is derived from the address, never user input)
 *   v3: `prfSalt` / `salt` / `infoPrefix` / `rpId` / `credentialId`
 *
 * Changing any of them makes existing payloads undecryptable. All three coexist.
 *
 * v3 notes: `credentialId` is required — read it back from the on-chain
 * `payload_key_credential` attribute (`readPayloadKeyCredential`) or pass it
 * explicitly; there is no way to discover a credential from an address. A
 * connected wallet is still needed for the address bound into the HKDF info, so
 * decrypt with the same address you published with. When PRF is unavailable this
 * throws `PRF_UNSUPPORTED` and **never** falls back to a signature.
 */
export interface WalletKeyDerivationConfig extends WalletKeyDerivationParams {
  /**
   * `'personal-sign-hkdf'` (v1): signs a frozen text message — wallets render it
   * as a blind-sign prompt.
   * `'eip712-hkdf'` (v2): signs EIP-712 typed data — structured, domain-scoped.
   * `'webauthn-prf-hkdf'` (v3): no signature; passkey PRF output bound to the
   * site's domain.
   */
  mode: DerivationMode
  /** v2 only: override the EIP-712 domain (defaults to `DEFAULT_EIP712_DOMAIN`). */
  domain?: Record<string, unknown>
  /** v2 only: override the EIP-712 types (defaults to `DEFAULT_EIP712_TYPES`). */
  types?: Eip712Types
  /** v2 only: override the EIP-712 primary type (defaults to `PayloadKey`). */
  primaryType?: string
  /** v3 only: base64url credential ID (from `createPrfCredential()` or the chain). */
  credentialId?: string
  /** v3 only: WebAuthn RP ID; defaults to `location.hostname`. */
  rpId?: string
  /** v3 only: PRF evaluation salt; defaults to the frozen `DEFAULT_PRF_SALT`. */
  prfSalt?: string
}

export interface UseAgentRunnerConfig {
  agentId: number
  chainConfig?: ChainConfig
  ipfsGateways?: string[]
  /**
   * Enable payload decryption with an injected browser wallet. Without this,
   * `useAgentRunner` can only work with wallets that export a private key.
   */
  encryptionKeyDerivation?: WalletKeyDerivationConfig
}

export interface UseAgentRunnerResult {
  ctx: AgentRunContext | null
  isLoading: boolean
  error: Error | null
  /** Re-trigger the load (e.g. after connecting wallet or subscribing) */
  refetch: () => void
}

// ── OnChainReader Implementation (viem) ────────────────────────────────────

class ViemOnChainReader implements OnChainReader {
  constructor(
    private publicClient: ReturnType<typeof usePublicClient>,
    private chainConfig: ChainConfig
  ) {}

  async getTokenURI(_agentId: number): Promise<string> {
    // tokenURI is standard ERC-721 metadata — not needed for our flow
    // Metadata is fetched via getAgentMetadata
    return ''
  }

  async getAttributes(agentId: number): Promise<Record<string, string>> {
    if (!this.publicClient) throw new Error('Public client not available')

    const entries = (await this.publicClient.readContract({
      address: this.chainConfig.contracts.identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgentMetadata',
      args: [BigInt(agentId)],
    })) as { key: string; value: string }[]

    const attrs: Record<string, string> = {}
    for (const entry of entries) {
      // value is bytes — convert to string
      const hexStr = entry.value
      if (hexStr && hexStr !== '0x') {
        attrs[entry.key] = hexToStringUTF8(hexStr)
      } else {
        attrs[entry.key] = ''
      }
    }
    return attrs
  }

  async hasActiveSubscription(address: string, agentId: number): Promise<boolean> {
    if (!this.publicClient) return false

    try {
      return (await this.publicClient.readContract({
        address: this.chainConfig.contracts.subscriptionManager,
        abi: SUBSCRIPTION_MANAGER_ABI,
        functionName: 'hasActiveSubscription',
        args: [address as Address, BigInt(agentId)],
      })) as boolean
    } catch {
      return false
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToStringUTF8(hex: string): string {
  if (!hex.startsWith('0x')) return hex
  const hexClean = hex.slice(2)
  if (hexClean.length === 0) return ''
  try {
    const bytes = new Uint8Array(hexClean.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexClean.substring(i * 2, i * 2 + 2), 16)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return hex
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAgentRunner(config: UseAgentRunnerConfig): UseAgentRunnerResult {
  const { agentId, chainConfig: chainConfigOverride, ipfsGateways, encryptionKeyDerivation } = config

  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [ctx, setCtx] = useState<AgentRunContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const runnerRef = useRef<AgentRunner | null>(null)
  const mountedRef = useRef(true)
  // Cache the derived payload key per (address + frozen params) so switching
  // agents or re-running the effect does not re-prompt the wallet.
  const derivedKeyRef = useRef<{ cacheKey: string; privateKey: string } | null>(null)

  const derivationCacheKey = encryptionKeyDerivation
    ? [
        encryptionKeyDerivation.mode,
        encryptionKeyDerivation.message ?? DEFAULT_DERIVATION_MESSAGE,
        encryptionKeyDerivation.salt ?? '',
        encryptionKeyDerivation.infoPrefix ?? '',
        encryptionKeyDerivation.domain ? JSON.stringify(encryptionKeyDerivation.domain) : '',
        encryptionKeyDerivation.primaryType ?? '',
        encryptionKeyDerivation.types ? JSON.stringify(encryptionKeyDerivation.types) : '',
        encryptionKeyDerivation.credentialId ?? '',
        encryptionKeyDerivation.rpId ?? '',
        encryptionKeyDerivation.prfSalt ?? '',
      ].join('|')
    : ''

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!publicClient || !walletClient) {
      setError(new Error('Wallet not connected'))
      return
    }

    const chainConfig =
      chainConfigOverride ?? (publicClient.chain?.id ? KNOWN_CHAINS[publicClient.chain.id] : undefined)

    if (!chainConfig) {
      setError(new Error(`Chain ${publicClient.chain?.id} not supported`))
      return
    }

    // Create OnChainReader
    const reader = new ViemOnChainReader(publicClient, chainConfig)

    // WalletSigner from wagmi
    const signer = {
      async signMessage(message: string): Promise<string> {
        if (!walletClient.account) throw new Error('Wallet not connected')
        return walletClient.signMessage({ account: walletClient.account, message })
      },
      async getAddress(): Promise<string> {
        if (!walletClient.account) throw new Error('Wallet not connected')
        return walletClient.account.address
      },
      ...(encryptionKeyDerivation
        ? {
            async deriveEncryptionKey(): Promise<string> {
              if (!walletClient.account) throw new Error('Wallet not connected')
              const address = walletClient.account.address.toLowerCase()
              const cacheKey = `${address}|${derivationCacheKey}`
              if (derivedKeyRef.current?.cacheKey === cacheKey) {
                return derivedKeyRef.current.privateKey
              }

              // The *secret source* differs per mode; the HKDF derivation below
              // is identical for all three (that is why mode cannot be changed
              // by re-encoding a signature).
              let secret: string
              if (encryptionKeyDerivation.mode === 'webauthn-prf-hkdf') {
                // v3: WebAuthn PRF — no signature at all. The credential is not
                // discoverable from the address, so it must be supplied (or read
                // from the on-chain `payload_key_credential` attribute).
                const credentialId = encryptionKeyDerivation.credentialId
                if (!credentialId) {
                  throw new Error(
                    'mode: "webauthn-prf-hkdf" requires `credentialId`. Read it from the ' +
                    'on-chain attribute (`readPayloadKeyCredential(await reader.getAttributes(agentId))`, ' +
                    'key "payload_key_credential") or pass it explicitly. It cannot be recovered ' +
                    'from the wallet address — without it the v3 payload key is not reproducible.'
                  )
                }
                const { prfOutputHex } = await evaluatePrf({
                  credentialId,
                  rpId: encryptionKeyDerivation.rpId,
                  salt: encryptionKeyDerivation.prfSalt,
                })
                secret = prfOutputHex
              } else if (encryptionKeyDerivation.mode === 'eip712-hkdf') {
                // v2: sign EIP-712 typed data — structured, domain-scoped prompt
                // instead of a blind text signature.
                const typedData = buildPayloadKeyTypedData(address, {
                  domain: encryptionKeyDerivation.domain,
                  types: encryptionKeyDerivation.types,
                  primaryType: encryptionKeyDerivation.primaryType,
                })
                secret = await walletClient.signTypedData({
                  account: walletClient.account,
                  domain: typedData.domain as TypedDataDomain,
                  types: typedData.types,
                  primaryType: typedData.primaryType,
                  message: typedData.message,
                })
              } else {
                const message = encryptionKeyDerivation.message ?? DEFAULT_DERIVATION_MESSAGE
                secret = await walletClient.signMessage({
                  account: walletClient.account,
                  message,
                })
              }

              const privateKey = derivePrivateKeyFromIkm(
                secret,
                address,
                encryptionKeyDerivation
              )
              derivedKeyRef.current = { cacheKey, privateKey }
              return privateKey
            },
          }
        : {}),
      async getPrivateKey(): Promise<string> {
        // wagmi walletClient never exposes the account private key (EIP-1193).
        throw new Error(
          'EIP-1193 wallets cannot export the account private key. Pass ' +
          '`encryptionKeyDerivation: { mode: "personal-sign-hkdf" | "eip712-hkdf" | ' +
          '"webauthn-prf-hkdf" }` to useAgentRunner to derive a separate payload key ' +
          'from a deterministic signature (v1/v2) or a passkey PRF (v3).'
        )
      },
    }

    // IPFS Fetcher
    const ipfsFetcher = new IPFSFetcher({
      fallbackGateways: ipfsGateways ?? chainConfig.ipfsGateways ?? [
        'gateway.pinata.cloud',
        'dweb.link',
        'cf-ipfs.com',
      ],
    })

    runnerRef.current = new AgentRunner({
      reader,
      wallet: signer,
      ipfsFetcher,
    })

    setIsLoading(true)
    setError(null)

    runnerRef.current
      .useAgent(agentId)
      .then(result => {
        if (mountedRef.current) {
          setCtx(result)
          setIsLoading(false)
        }
      })
      .catch(err => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
        }
      })

    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, publicClient?.chain?.id, publicClient, walletClient, refetchKey, derivationCacheKey])

  const refetch = () => setRefetchKey(k => k + 1)

  return { ctx, isLoading, error, refetch }
}
