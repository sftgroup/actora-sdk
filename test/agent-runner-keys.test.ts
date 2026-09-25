// AgentRunner key sources + browser-wallet key derivation (personal_sign + HKDF).
// Covers: derivation determinism/params, publish→decrypt round trip, key-source
// priority, and error-code preservation.
import { describe, it, expect } from 'vitest'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hashTypedData } from 'viem'

import { AgentRunner } from '../src/agent/agent-runner'
import type { OnChainReader, WalletSigner } from '../src/agent/agent-runner'
import type { IPFSFetcher } from '../src/registry/ipfs-fetcher'
import type { IPFSUploader } from '../src/ipfs/ipfs-uploader'
import {
  DEFAULT_DERIVATION_INFO_PREFIX,
  DEFAULT_DERIVATION_INFO_PREFIX_V2,
  DEFAULT_DERIVATION_INFO_PREFIX_V3,
  DEFAULT_DERIVATION_MESSAGE,
  DEFAULT_EIP712_PRIMARY_TYPE,
  DEFAULT_EIP712_PURPOSE,
  DEFAULT_PRF_SALT,
  PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE,
  PAYLOAD_KEY_MODE_ATTRIBUTE,
  buildPayloadKeyTypedData,
  bytesToHex,
  deriveKeyPairFromWallet,
  derivePrivateKeyFromIkm,
  derivePrivateKeyFromSignature,
  eciesDecrypt,
  eciesEncrypt,
  encryptPayload,
  generateAesKey,
  generateKeyPair,
  getPublicKey,
  hexToBytes,
  isDerivationMode,
  packAgentForPublish,
  publishAgent,
  readPayloadKeyCredential,
  readPayloadKeyMode,
  serializePayloadKeyCredential,
  unpackAgent,
} from '../src/core/crypto'
import type { Eip712TypedData } from '../src/core/crypto'
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

/** RFC 6979-style deterministic eth_signTypedData_v4 stand-in (real EIP-712 digest). */
function deterministicSignTypedData(typedData: Eip712TypedData): string {
  const digest = hashTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  } as Parameters<typeof hashTypedData>[0])
  const sig = secp256k1.sign(hexToBytes(digest.slice(2)), WALLET_PRIVATE_KEY)
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

  it('checks determinism by default since 0.19.0, and can be opted out', async () => {
    let call = 0
    const signer = async (m: string) => deterministicSignMessage(m + call++)
    await expect(
      deriveKeyPairFromWallet({ signMessage: signer, address: WALLET_ADDRESS }),
    ).rejects.toThrow(/not RFC 6979 deterministic/)

    call = 0
    await expect(
      deriveKeyPairFromWallet({
        signMessage: signer,
        address: WALLET_ADDRESS,
        assertDeterministic: false,
      }),
    ).resolves.toEqual(expect.objectContaining({ privateKey: expect.any(String) }))
  })

  it('round-trips the derived pair as a self-check (selfCheck default on)', async () => {
    const wallet = { signMessage: async (m: string) => deterministicSignMessage(m), address: WALLET_ADDRESS }
    const checked = await deriveKeyPairFromWallet(wallet)
    const unchecked = await deriveKeyPairFromWallet({ ...wallet, selfCheck: false })
    expect(unchecked).toEqual(checked)

    // The returned pair is usable as advertised: it wraps and unwraps.
    expect(eciesDecrypt(eciesEncrypt('ab'.repeat(32), checked.publicKey), checked.privateKey)).toBe(
      'ab'.repeat(32),
    )
  })
})

// ── v2: EIP-712 typed-data derivation (`eip712-hkdf`) ──────────────────────
// Same HKDF construction as v1; only *what is signed* changes. v1 stays
// supported so already-published payloads remain decryptable.

describe('buildPayloadKeyTypedData', () => {
  it('fills in the frozen v2 defaults and lowercases the address', () => {
    const typed = buildPayloadKeyTypedData(WALLET_ADDRESS)
    expect(typed.domain).toEqual({ name: 'Actora Agent Payload', version: '2' })
    expect(typed.primaryType).toBe(DEFAULT_EIP712_PRIMARY_TYPE)
    expect(typed.types.PayloadKey).toEqual([
      { name: 'address', type: 'address' },
      { name: 'purpose', type: 'string' },
      { name: 'version', type: 'uint256' },
    ])
    expect(typed.message).toEqual({
      address: WALLET_ADDRESS.toLowerCase(),
      purpose: DEFAULT_EIP712_PURPOSE,
      version: 2,
    })
  })

  it('carries no timestamp/nonce (the signature must be replayable forever)', () => {
    const a = buildPayloadKeyTypedData(WALLET_ADDRESS)
    const b = buildPayloadKeyTypedData(WALLET_ADDRESS)
    expect(a).toEqual(b)
    expect(JSON.stringify(a.message)).not.toMatch(/time|nonce|deadline|expir/i)
  })

  it('applies overrides without mutating the exported defaults', () => {
    const typed = buildPayloadKeyTypedData(WALLET_ADDRESS, {
      domain: { chainId: 56 },
      primaryType: 'Custom',
    })
    expect(typed.domain).toEqual({ name: 'Actora Agent Payload', version: '2', chainId: 56 })
    expect(typed.primaryType).toBe('Custom')
    expect(DEFAULT_EIP712_PRIMARY_TYPE).toBe('PayloadKey')
  })

  it('rejects a missing address', () => {
    expect(() => buildPayloadKeyTypedData('')).toThrow(/Address is required/)
  })
})

describe("deriveKeyPairFromWallet ({ mode: 'eip712-hkdf' })", () => {
  const v2 = {
    mode: 'eip712-hkdf' as const,
    signTypedData: async (t: Eip712TypedData) => deterministicSignTypedData(t),
    address: WALLET_ADDRESS,
  }

  it('is deterministic and round-trips publish → decrypt', async () => {
    const first = await deriveKeyPairFromWallet(v2)
    const second = await deriveKeyPairFromWallet({ ...v2 })
    expect(second).toEqual(first)
    expect(secp256k1.utils.isValidPrivateKey(first.privateKey)).toBe(true)

    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture(first.publicKey)
    expect(unpackAgent(encryptedPayload, eciesEncryptedKey, first.privateKey).prompt).toBe(
      AGENT.prompt,
    )
  })

  it('derives a different key than v1 for the same address (info prefix v2)', async () => {
    const v1 = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    expect((await deriveKeyPairFromWallet(v2)).privateKey).not.toBe(v1.privateKey)
    expect(
      derivePrivateKeyFromSignature('0x' + 'ab'.repeat(65), WALLET_ADDRESS, {
        mode: 'eip712-hkdf',
      }),
    ).not.toBe(derivePrivateKeyFromSignature('0x' + 'ab'.repeat(65), WALLET_ADDRESS))
  })

  it('binds the address in both the typed data and the HKDF info (same 口径 ⇒ same key)', async () => {
    const lower = await deriveKeyPairFromWallet(v2)
    const upper = await deriveKeyPairFromWallet({ ...v2, address: WALLET_ADDRESS.toUpperCase() })
    expect(upper.privateKey).toBe(lower.privateKey)

    const other = await deriveKeyPairFromWallet({
      ...v2,
      address: '0x1111111111111111111111111111111111111111',
    })
    expect(other.privateKey).not.toBe(lower.privateKey)
  })

  it('fails to decrypt once a frozen v2 value changes (domain / types / infoPrefix)', async () => {
    const published = await deriveKeyPairFromWallet(v2)
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture(published.publicKey)

    for (const override of [
      { typedData: { domain: { name: 'Other' } } },
      { infoPrefix: 'agent-payload-encryption/v3' },
      { typedData: { message: { version: 3 } } },
      {
        typedData: {
          types: {
            PayloadKey: [
              { name: 'address', type: 'address' },
              { name: 'purpose', type: 'string' },
              { name: 'version', type: 'string' },
            ],
          },
          message: { version: '3' },
        },
      },
    ]) {
      const rotated = await deriveKeyPairFromWallet({ ...v2, ...override })
      expect(rotated.privateKey).not.toBe(published.privateKey)
      expect(() => unpackAgent(encryptedPayload, eciesEncryptedKey, rotated.privateKey)).toThrow()
    }
  })

  it('requires signTypedData and detects non-deterministic wallets', async () => {
    await expect(
      deriveKeyPairFromWallet({
        mode: 'eip712-hkdf',
        signMessage: async (m: string) => deterministicSignMessage(m),
        address: WALLET_ADDRESS,
      }),
    ).rejects.toThrow(/requires a signTypedData/)

    let call = 0
    await expect(
      deriveKeyPairFromWallet({
        ...v2,
        signTypedData: async (t: Eip712TypedData) => deterministicSignTypedData(t) + (call++ ? '00' : ''),
        assertDeterministic: true,
      }),
    ).rejects.toThrow(/not RFC 6979 deterministic/)
  })

  it('keeps v1 working when mode is omitted (no regression for published payloads)', async () => {
    const published = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture(published.publicKey)
    expect(unpackAgent(encryptedPayload, eciesEncryptedKey, published.privateKey).prompt).toBe(
      AGENT.prompt,
    )
    // Explicit v1 mode is byte-identical to the omitted-mode default.
    const explicit = await deriveKeyPairFromWallet({
      mode: 'personal-sign-hkdf',
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    expect(explicit).toEqual(published)
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

// ── Private-key input normalisation (`0x` prefix) ──────────────────────────
// Regression: noble's `hexToBytes` rejects a leading `0x`, so keys copied out
// of a wallet / `.env` used to fail with an opaque error.

describe('private key accepts an optional 0x prefix', () => {
  const bare = WALLET_PRIVATE_KEY
  const prefixed = `0x${WALLET_PRIVATE_KEY}`

  it('eciesDecrypt yields the same AES key for bare and 0x-prefixed input', () => {
    const { eciesEncryptedKey, aesKeyHex } = encryptedFixture()
    expect(eciesDecrypt(eciesEncryptedKey, bare)).toBe(aesKeyHex)
    expect(eciesDecrypt(eciesEncryptedKey, prefixed)).toBe(aesKeyHex)
  })

  it('unpackAgent round-trips with a 0x-prefixed private key', () => {
    const { encryptedPayload, eciesEncryptedKey } = encryptedFixture()
    expect(unpackAgent(encryptedPayload, eciesEncryptedKey, prefixed)).toMatchObject({
      prompt: AGENT.prompt,
    })
  })

  it('getPublicKey accepts both forms', () => {
    expect(getPublicKey(prefixed)).toBe(getPublicKey(bare))
  })

  it('rejects a malformed key with an actionable message', () => {
    const { eciesEncryptedKey } = encryptedFixture()
    for (const bad of ['0xabc', 'zz'.repeat(32), prefixed + '00']) {
      expect(() => eciesDecrypt(eciesEncryptedKey, bad)).toThrow(/32-byte hex/)
    }
  })
})

// ── Pre-publish self-check + mode binding ──────────────────────────────────
// `tokenURI` is immutable once minted, so a wrong key / wrong mode must be
// caught before anything is uploaded.

describe('publishAgent pre-publish self-check', () => {
  function fakeUploader(seen: string[]) {
    return {
      isConfigured: () => true,
      uploadEncryptedPayload: async () => {
        seen.push('encrypted')
        return { cid: 'cid-enc', url: 'https://gw/cid-enc', size: 1 }
      },
      uploadJSON: async () => {
        seen.push('public')
        return { cid: 'cid-pub', url: 'https://gw/cid-pub', size: 1 }
      },
    } as unknown as IPFSUploader
  }

  it('passes when the private key matches the published public key', async () => {
    const { privateKey, publicKey } = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    const seen: string[] = []
    const result = await publishAgent({
      agent: AGENT,
      publicKey,
      uploader: fakeUploader(seen),
      verifyWithPrivateKey: privateKey,
    })
    expect(result.eciesEncryptedKeyHex).toBeTruthy()
    expect(seen).toEqual(['encrypted', 'public'])
  })

  it('aborts before uploading when the key does not match (e.g. wrong mode)', async () => {
    const { publicKey } = await deriveKeyPairFromWallet({
      signMessage: async (m: string) => deterministicSignMessage(m),
      address: WALLET_ADDRESS,
    })
    // Same signer, v2 mode ⇒ different private key than the v1-derived publicKey.
    const wrongMode = await deriveKeyPairFromWallet({
      mode: 'eip712-hkdf',
      signTypedData: async (t: Eip712TypedData) => deterministicSignTypedData(t),
      address: WALLET_ADDRESS,
    })

    const seen: string[] = []
    await expect(
      publishAgent({
        agent: AGENT,
        publicKey,
        uploader: fakeUploader(seen),
        verifyWithPrivateKey: wrongMode.privateKey,
      }),
    ).rejects.toThrow(/Pre-publish self-check failed/)
    expect(seen).toEqual([]) // nothing was uploaded ⇒ nothing can be minted
  })
})

describe('payload_key_mode attribute', () => {
  it('round-trips a known mode and ignores unknown values', () => {
    expect(PAYLOAD_KEY_MODE_ATTRIBUTE).toBe('payload_key_mode')
    expect(
      readPayloadKeyMode({ [PAYLOAD_KEY_MODE_ATTRIBUTE]: 'eip712-hkdf' }),
    ).toBe('eip712-hkdf')
    expect(
      readPayloadKeyMode({ [PAYLOAD_KEY_MODE_ATTRIBUTE]: 'personal-sign-hkdf' }),
    ).toBe('personal-sign-hkdf')
    expect(readPayloadKeyMode({ [PAYLOAD_KEY_MODE_ATTRIBUTE]: 'webauthn-prf-hkdf' })).toBe(
      'webauthn-prf-hkdf',
    )
    // Absent ⇒ the caller must fall back; unknown ⇒ do not silently guess.
    expect(readPayloadKeyMode({})).toBeUndefined()
    expect(readPayloadKeyMode({ [PAYLOAD_KEY_MODE_ATTRIBUTE]: 'something-else' })).toBeUndefined()
  })

  it('isDerivationMode narrows only the modes this SDK can derive', () => {
    expect(isDerivationMode('personal-sign-hkdf')).toBe(true)
    expect(isDerivationMode('eip712-hkdf')).toBe(true)
    expect(isDerivationMode('webauthn-prf-hkdf')).toBe(true)
    expect(isDerivationMode('something-else')).toBe(false)
    expect(isDerivationMode(undefined)).toBe(false)
  })
})

// ── v3: webauthn-prf-hkdf ──────────────────────────────────────────────────
// The IKM is a 32-byte PRF output, not a signature. Everything downstream of the
// IKM must stay byte-identical, and a mode mix-up must never silently "work".

describe('webauthn-prf-hkdf', () => {
  // A fixed 32-byte stand-in for a PRF output (real ones come from the
  // authenticator; the derivation only cares that it is 32 bytes of hex).
  const PRF_OUTPUT = '5a'.repeat(32)

  it('derives deterministically from a PRF output, and changes with it', () => {
    const a = derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { mode: 'webauthn-prf-hkdf' })
    const b = derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { mode: 'webauthn-prf-hkdf' })
    const other = derivePrivateKeyFromIkm('5b'.repeat(32), WALLET_ADDRESS, {
      mode: 'webauthn-prf-hkdf',
    })
    expect(a).toBe(b)
    expect(a).not.toBe(other)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('gives a different key per version for the same IKM (no silent cross-mode use)', () => {
    // Same 32-byte secret, three versioned info prefixes ⇒ three distinct keys.
    const v1 = derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { infoPrefix: DEFAULT_DERIVATION_INFO_PREFIX })
    const v2 = derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { infoPrefix: DEFAULT_DERIVATION_INFO_PREFIX_V2 })
    const v3 = derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { mode: 'webauthn-prf-hkdf' })
    expect(new Set([v1, v2, v3]).size).toBe(3)
    expect(v3).toBe(
      derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { infoPrefix: DEFAULT_DERIVATION_INFO_PREFIX_V3 }),
    )
  })

  it('binds the address into the key, like every other mode', () => {
    const here = derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { mode: 'webauthn-prf-hkdf' })
    const elsewhere = derivePrivateKeyFromIkm(PRF_OUTPUT, '0x' + '22'.repeat(20), {
      mode: 'webauthn-prf-hkdf',
    })
    expect(here).not.toBe(elsewhere)
  })

  it('rejects a PRF output that is too short', () => {
    expect(() => derivePrivateKeyFromIkm('5a'.repeat(16), WALLET_ADDRESS)).toThrow(/IKM too short/)
  })

  it('requires getPrfOutput and never falls back to signMessage', async () => {
    let signed: string | null = null
    await expect(
      deriveKeyPairFromWallet({
        mode: 'webauthn-prf-hkdf',
        address: WALLET_ADDRESS,
        signMessage: async (m: string) => {
          signed = m
          return deterministicSignMessage(m)
        },
      }),
    ).rejects.toThrow(/requires a getPrfOutput function/)
    // The whole point of v3: no silent degradation to a replayable signature.
    expect(signed).toBeNull()
  })

  it('derives the pair from getPrfOutput without prompting a wallet', async () => {
    let calls = 0
    const { privateKey, publicKey } = await deriveKeyPairFromWallet({
      mode: 'webauthn-prf-hkdf',
      address: WALLET_ADDRESS,
      getPrfOutput: async () => {
        calls++
        return PRF_OUTPUT
      },
      signMessage: async () => {
        throw new Error('signMessage must not be called in v3')
      },
    })
    // Once only: PRF has no counter, so re-probing would just cost a second prompt.
    expect(calls).toBe(1)
    expect(privateKey).toBe(
      derivePrivateKeyFromIkm(PRF_OUTPUT, WALLET_ADDRESS, { mode: 'webauthn-prf-hkdf' }),
    )
    expect(eciesDecrypt(eciesEncrypt('cd'.repeat(32), publicKey), privateKey)).toBe('cd'.repeat(32))
  })
})

describe('payload_key_credential binding (v3)', () => {
  it('round-trips the rpId + credentialId needed to reproduce a v3 key', () => {
    const serialized = serializePayloadKeyCredential({
      rpId: 'app.example.com',
      credentialId: 'AbC-123_x',
      address: WALLET_ADDRESS,
      prfSalt: DEFAULT_PRF_SALT,
    })
    const parsed = readPayloadKeyCredential({ [PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE]: serialized })
    expect(parsed).toEqual({
      rpId: 'app.example.com',
      credentialId: 'AbC-123_x',
      address: WALLET_ADDRESS.toLowerCase(),
      prfSalt: DEFAULT_PRF_SALT,
    })
  })

  it('refuses to serialize without rpId or credentialId', () => {
    // Both are mandatory: a credential is RP-ID scoped and cannot be discovered
    // from an address, so half a binding is worse than none (it looks complete).
    expect(() => serializePayloadKeyCredential({ rpId: '', credentialId: 'x' })).toThrow(/rpId/)
    expect(() => serializePayloadKeyCredential({ rpId: 'a.com', credentialId: '' })).toThrow(
      /credentialId/,
    )
  })

  it('returns undefined for absent or malformed attributes', () => {
    expect(readPayloadKeyCredential({})).toBeUndefined()
    expect(readPayloadKeyCredential({ [PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE]: 'not json' })).toBeUndefined()
    expect(
      readPayloadKeyCredential({ [PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE]: '{"rpId":"a.com"}' }),
    ).toBeUndefined()
  })
})
