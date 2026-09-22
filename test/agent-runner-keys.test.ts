// AgentRunner key sources + browser-wallet key derivation (personal_sign + HKDF).
// Covers: derivation determinism/params, publish→decrypt round trip, key-source
// priority, and error-code preservation.
import { describe, it, expect } from 'vitest'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'

import { AgentRunner } from '../src/agent/agent-runner'
import type { OnChainReader, WalletSigner } from '../src/agent/agent-runner'
import type { IPFSFetcher } from '../src/registry/ipfs-fetcher'
import {
  DEFAULT_DERIVATION_MESSAGE,
  bytesToHex,
  deriveKeyPairFromWallet,
  derivePrivateKeyFromSignature,
  eciesDecrypt,
  eciesEncrypt,
  encryptPayload,
  generateAesKey,
  generateKeyPair,
  getPublicKey,
  packAgentForPublish,
  unpackAgent,
} from '../src/core/crypto'
import type { AgentPayload, AgentPrivatePayload, EncryptedPayload } from '../src/core/types'
import { ActoraError, ActoraErrorCode } from '../src/core/types'

// ── Fixtures ───────────────────────────────────────────────────────────────

const AGENT: AgentPayload = {
  name: 'Encrypted Expert',
  description: 'public description',
  version: '1.0.0',
  tags: [],
  capabilities: [],
  supportedTasks: ['conversation'],
  communicationProtocol: 'mcp',
  authenticationMethod: 'ecdsa',
  pricing: { type: 'subscription', amount: '0.1', currency: '' },
  prompt: 'SECRET SYSTEM PROMPT',
  skills: [],
  mcp: { type: 'http', url: 'https://mcp.example.com' },
}

const WALLET_ADDRESS = '0xAbCd00000000000000000000000000000000Ef12'
const WALLET_PRIVATE_KEY = '11'.repeat(32)

/** RFC 6979-style deterministic personal_sign stand-in (same message ⇒ same sig). */
function deterministicSignMessage(message: string): string {
  const msgHash = sha256(new TextEncoder().encode(message))
  const sig = secp256k1.sign(msgHash, WALLET_PRIVATE_KEY)
  return '0x' + bytesToHex(sig.toCompactRawBytes()) + sig.recovery.toString(16).padStart(2, '0')
}

function encryptedFixture(publicKey: string = getPublicKey(WALLET_PRIVATE_KEY)): {
  encryptedPayload: EncryptedPayload
  eciesEncryptedKey: string
  aesKeyHex: string
} {
  const aesKeyHex = generateAesKey()
  const privatePayload: AgentPrivatePayload = {
    prompt: AGENT.prompt,
    skills: AGENT.skills,
    mcp: AGENT.mcp,
  }
  return {
    encryptedPayload: encryptPayload(privatePayload, aesKeyHex),
    eciesEncryptedKey: eciesEncrypt(aesKeyHex, publicKey),
    aesKeyHex,
  }
}

function makeRunner(config: {
  wallet: WalletSigner
  aesKeyHex?: string
  unpack?: (p: EncryptedPayload, k: string) => AgentPrivatePayload
  encryptedPayload: EncryptedPayload
  eciesEncryptedKey: string
}) {
  const reader: OnChainReader = {
    getTokenURI: async () => '',
    getAttributes: async () => ({
      encryptedPayloadCid: 'cid-enc',
      eciesEncryptedKey: config.eciesEncryptedKey,
    }),
    hasActiveSubscription: async () => true,
  }
  const ipfsFetcher = {
    fetchEncryptedPayload: async () => config.encryptedPayload,
  } as unknown as IPFSFetcher

  return new AgentRunner({
    reader,
    wallet: config.wallet,
    ipfsFetcher,
    aesKeyHex: config.aesKeyHex,
    unpack: config.unpack,
  })
}

const baseSigner: WalletSigner = {
  signMessage: async () => '0x' + '00'.repeat(65),
  getAddress: async () => WALLET_ADDRESS,
}

// ── Derivation ─────────────────────────────────────────────────────────────

describe('derivePrivateKeyFromSignature', () => {
  const sig = deterministicSignMessage(DEFAULT_DERIVATION_MESSAGE)

  it('is deterministic for the same signature + address', () => {
    expect(derivePrivateKeyFromSignature(sig, WALLET_ADDRESS)).toBe(
      derivePrivateKeyFromSignature(sig, WALLET_ADDRESS),
    )
  })

  it('produces a valid 32-byte secp256k1 scalar', () => {
    const key = derivePrivateKeyFromSignature(sig, WALLET_ADDRESS)
    expect(key).toHaveLength(64)
    expect(secp256k1.utils.isValidPrivateKey(key)).toBe(true)
  })

  it('is address- and param-bound (any change ⇒ different key)', () => {
    const base = derivePrivateKeyFromSignature(sig, WALLET_ADDRESS)
    expect(derivePrivateKeyFromSignature(sig, '0x0000000000000000000000000000000000000001')).not.toBe(base)
    expect(derivePrivateKeyFromSignature(sig, WALLET_ADDRESS, { salt: 'other-salt' })).not.toBe(base)
    expect(derivePrivateKeyFromSignature(sig, WALLET_ADDRESS, { infoPrefix: 'v2' })).not.toBe(base)
  })

  it('accepts signatures without the 0x prefix and rejects short input', () => {
    expect(derivePrivateKeyFromSignature(sig.slice(2), WALLET_ADDRESS)).toBe(
      derivePrivateKeyFromSignature(sig, WALLET_ADDRESS),
    )
    expect(() => derivePrivateKeyFromSignature('0xdeadbeef', WALLET_ADDRESS)).toThrow(/too short/)
  })
})

describe('deriveKeyPairFromWallet', () => {
  it('reproduces the same key pair and round-trips publish → decrypt', async () => {
    const wallet = {
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    }
    const first = await deriveKeyPairFromWallet(wallet)
    const second = await deriveKeyPairFromWallet(wallet)
    expect(second).toEqual(first)
    expect(first.publicKey.startsWith('04')).toBe(true)
    expect(first.publicKey).toHaveLength(130)

    // Publish with the derived public key, decrypt with the derived private key.
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture(first.publicKey)
    expect(unpackAgent(encryptedPayload, eciesEncryptedKey, first.privateKey).prompt).toBe(AGENT.prompt)
  })

  it('packs an ECIES-wrapped AES key that the derived key can unwrap', async () => {
    const { privateKey, publicKey } = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    const packed = packAgentForPublish(AGENT, publicKey, generateAesKey())
    expect(eciesDecrypt(packed.eciesEncryptedKeyHex, privateKey)).toBe(packed.aesKeyHex)
  })

  it('fails to decrypt after the frozen message changes (published agents are lost)', async () => {
    const published = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture(published.publicKey)

    const rotated = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
      message: DEFAULT_DERIVATION_MESSAGE + ' (v2)',
    })
    expect(rotated.privateKey).not.toBe(published.privateKey)
    expect(() => unpackAgent(encryptedPayload, eciesEncryptedKey, rotated.privateKey)).toThrow()
  })

  it('fails to decrypt with another wallet', async () => {
    const owner = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    const other = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: '0x1111111111111111111111111111111111111111',
    })
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture(owner.publicKey)
    expect(() => unpackAgent(encryptedPayload, eciesEncryptedKey, other.privateKey)).toThrow()
  })

  it('detects non-deterministic wallets when assertDeterministic is on', async () => {
    let call = 0
    await expect(
      deriveKeyPairFromWallet({
        signMessage: async (m: string) => deterministicSignMessage(m + call++),
        address: WALLET_ADDRESS,
        assertDeterministic: true,
      }),
    ).rejects.toThrow(/not RFC 6979 deterministic/)
  })
})

// ── AgentRunner key sources ────────────────────────────────────────────────

describe('AgentRunner decryption key sources', () => {
  it('decrypts with a host-supplied AES key (no ECIES)', async () => {
    const { encryptedPayload, eciesEncryptedKey, aesKeyHex } = encryptedFixture()
    const runner = makeRunner({
      wallet: baseSigner,
      aesKeyHex,
      encryptedPayload,
      eciesEncryptedKey,
    })
    await expect(runner.useAgent(1)).resolves.toMatchObject({ prompt: AGENT.prompt })
  })

  it('prefers a host-supplied unpack override', async () => {
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture()
    const runner = makeRunner({
      wallet: baseSigner,
      unpack: () => ({ prompt: 'from-host', skills: [], mcp: AGENT.mcp }),
      encryptedPayload,
      eciesEncryptedKey,
    })
    await expect(runner.useAgent(1)).resolves.toMatchObject({ prompt: 'from-host' })
  })

  it('decrypts via wallet.deriveEncryptionKey() (browser wallet path)', async () => {
    const { privateKey, publicKey } = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture(publicKey)
    const runner = makeRunner({
      wallet: { ...baseSigner, deriveEncryptionKey: async () => privateKey },
      encryptedPayload,
      eciesEncryptedKey,
    })
    await expect(runner.useAgent(1)).resolves.toMatchObject({ prompt: AGENT.prompt })
  })

  it('falls back to wallet.getPrivateKey() and prefers deriveEncryptionKey over it', async () => {
    const couple = generateKeyPair()
    const aesKeyHex = generateAesKey()
    const privatePayload: AgentPrivatePayload = { prompt: 'p', skills: [], mcp: AGENT.mcp }
    const encryptedPayload = encryptPayload(privatePayload, aesKeyHex)
    const eciesEncryptedKey = eciesEncrypt(aesKeyHex, couple.publicKey)

    const deriveOnly = makeRunner({
      wallet: { ...baseSigner, deriveEncryptionKey: async () => couple.privateKey },
      encryptedPayload,
      eciesEncryptedKey,
    })
    await expect(deriveOnly.useAgent(1)).resolves.toMatchObject({ prompt: 'p' })

    const fallback = makeRunner({
      wallet: { ...baseSigner, getPrivateKey: async () => couple.privateKey },
      encryptedPayload,
      eciesEncryptedKey,
    })
    await expect(fallback.useAgent(1)).resolves.toMatchObject({ prompt: 'p' })

    const preferred = makeRunner({
      wallet: {
        ...baseSigner,
        deriveEncryptionKey: async () => couple.privateKey,
        getPrivateKey: async () => generateKeyPair().privateKey,
      },
      encryptedPayload,
      eciesEncryptedKey,
    })
    await expect(preferred.useAgent(1)).resolves.toMatchObject({ prompt: 'p' })
  })

  it('keeps WALLET_NOT_CONNECTED when no key source exists', async () => {
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture()
    const runner = makeRunner({ wallet: baseSigner, encryptedPayload, eciesEncryptedKey })
    const err = await runner.useAgent(1).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ActoraError)
    expect((err as ActoraError).code).toBe(ActoraErrorCode.WALLET_NOT_CONNECTED)
    expect((err as Error).message).toMatch(/deriveEncryptionKey/)
  })

  it('wraps wrong-key failures as DECRYPTION_FAILED and keeps the cause', async () => {
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture()
    const runner = makeRunner({
      wallet: { ...baseSigner, getPrivateKey: async () => generateKeyPair().privateKey },
      encryptedPayload,
      eciesEncryptedKey,
    })
    const err = await runner.useAgent(1).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ActoraError)
    expect((err as ActoraError).code).toBe(ActoraErrorCode.DECRYPTION_FAILED)
    expect((err as Error).cause).toBeInstanceOf(Error)
  })
})
