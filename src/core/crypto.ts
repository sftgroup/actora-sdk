// ---------------------------------------------------------------------------
// @actora/sdk — Crypto Engine
// ---------------------------------------------------------------------------
// AES-256-GCM for content encryption (NIST standard wire format).
// ECIES (secp256k1) for key wrapping.
//
// Wire format (AES-256-GCM):
//   base64( IV[12] || ciphertext || authTag[16] )
//
// ECIES wire format (compatible with eciesjs):
//   hex( ephemeralPub[33] || IV[16] || ciphertext || MAC[32] )
//
// Pure JS — works in browser, Node, edge. No native deps except @noble/*.
// ---------------------------------------------------------------------------

import { gcm } from '@noble/ciphers/aes.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { hmac } from '@noble/hashes/hmac.js'
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js'

// ── randomBytes implementation (cross-runtime: browser / Node) ────────────

export function randomBytes(length: number): Uint8Array {
  // browser: crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(length)
    crypto.getRandomValues(buf)
    return buf
  }
  // Node: crypto.randomBytes
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto')
  return new Uint8Array(nodeCrypto.randomBytes(length))
}

import type { EncryptedPayload, AgentPrivatePayload } from './types'
import type { PackResult } from './types'

// ── Re-exports for convenience ─────────────────────────────────────────────

export { bytesToHex, hexToBytes }

// ── Constants ──────────────────────────────────────────────────────────────

const AES_KEY_SIZE = 32
const IV_SIZE = 12 // GCM recommended
const TAG_SIZE = 16 // GCM auth tag

// ── Base64 helpers (cross-runtime) ─────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  // Works in browser (btoa + binary) and Node (Buffer)
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'))
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ── AES-256-GCM ────────────────────────────────────────────────────────────

/**
 * Encrypt with AES-256-GCM.
 * Wire format: base64( IV[12] || ciphertext || authTag[16] )
 */
export function aesEncrypt(plaintext: string, keyHex: string): string {
  const key = hexToBytes(keyHex)
  const iv = randomBytes(IV_SIZE)
  const plainBytes = new TextEncoder().encode(plaintext)

  const cipher = gcm(key, iv)
  const encrypted = cipher.encrypt(plainBytes)
  // noble gcm.encrypt returns: ciphertext || authTag(16)
  const ciphertext = encrypted.subarray(0, -TAG_SIZE)
  const authTag = encrypted.subarray(-TAG_SIZE)

  // Pack: IV || ciphertext || authTag
  const combined = new Uint8Array(IV_SIZE + ciphertext.length + TAG_SIZE)
  combined.set(iv, 0)
  combined.set(ciphertext, IV_SIZE)
  combined.set(authTag, IV_SIZE + ciphertext.length)

  return toBase64(combined)
}

/**
 * Decrypt AES-256-GCM.
 */
export function aesDecrypt(encryptedBase64: string, keyHex: string): string {
  const key = hexToBytes(keyHex)
  const combined = fromBase64(encryptedBase64)

  const iv = combined.subarray(0, IV_SIZE)
  const ciphertext = combined.subarray(IV_SIZE, -TAG_SIZE)
  const authTag = combined.subarray(-TAG_SIZE)

  const cipher = gcm(key, iv)
  // noble decrypt expects: ciphertext || authTag
  const ciphertextWithTag = new Uint8Array(ciphertext.length + TAG_SIZE)
  ciphertextWithTag.set(ciphertext, 0)
  ciphertextWithTag.set(authTag, ciphertext.length)

  const decrypted = cipher.decrypt(ciphertextWithTag)
  return new TextDecoder().decode(decrypted)
}

/**
 * Encrypt with AES-256-GCM — master-key wire format.
 * Layout: base64( IV[12] || authTag[16] || ciphertext ).
 * Kept byte-for-byte compatible with the Gateway's legacy at-rest key
 * encryption (`gateway/src/lib/crypto.ts`) so existing stored rows decrypt
 * unchanged. New code should prefer `aesEncrypt`/`aesDecrypt` unless data
 * written in this layout must be read.
 */
export function encryptWithKey(plaintext: string, keyHex: string): string {
  const key = hexToBytes(keyHex)
  const iv = randomBytes(IV_SIZE)
  const plainBytes = new TextEncoder().encode(plaintext)

  const cipher = gcm(key, iv)
  const encrypted = cipher.encrypt(plainBytes)
  const ciphertext = encrypted.subarray(0, -TAG_SIZE)
  const authTag = encrypted.subarray(-TAG_SIZE)

  const combined = new Uint8Array(IV_SIZE + TAG_SIZE + ciphertext.length)
  combined.set(iv, 0)
  combined.set(authTag, IV_SIZE)
  combined.set(ciphertext, IV_SIZE + TAG_SIZE)

  return toBase64(combined)
}

/**
 * Decrypt AES-256-GCM — master-key wire format
 * (base64( IV[12] || authTag[16] || ciphertext )).
 */
export function decryptWithKey(encryptedBase64: string, keyHex: string): string {
  const key = hexToBytes(keyHex)
  const combined = fromBase64(encryptedBase64)

  const iv = combined.subarray(0, IV_SIZE)
  const authTag = combined.subarray(IV_SIZE, IV_SIZE + TAG_SIZE)
  const ciphertext = combined.subarray(IV_SIZE + TAG_SIZE)

  const cipher = gcm(key, iv)
  const ciphertextWithTag = new Uint8Array(ciphertext.length + TAG_SIZE)
  ciphertextWithTag.set(ciphertext, 0)
  ciphertextWithTag.set(authTag, ciphertext.length)

  const decrypted = cipher.decrypt(ciphertextWithTag)
  return new TextDecoder().decode(decrypted)
}

/**
 * Generate a cryptographically random AES-256 key (hex, 64 chars).
 */
export function generateAesKey(): string {
  return bytesToHex(randomBytes(AES_KEY_SIZE))
}

// ── ECIES (secp256k1) ──────────────────────────────────────────────────────
//
// eciesjs-compatible wire format:
//   ephemeralPub(33B compressed) || IV(16B) || ciphertext || MAC(32B)
//   Encoding: hex
//
// HKDF(SHA-256) derives AES key + HMAC key from ECDH shared secret.
// ---------------------------------------------------------------------------

function eciesEncode(
  ephemeralPub: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  mac: Uint8Array
): string {
  const out = new Uint8Array(33 + 16 + ciphertext.length + 32)
  out.set(ephemeralPub, 0)
  out.set(iv, 33)
  out.set(ciphertext, 33 + 16)
  out.set(mac, 33 + 16 + ciphertext.length)
  return bytesToHex(out)
}

function eciesDecode(dataHex: string): {
  ephemeralPub: Uint8Array
  iv: Uint8Array
  ciphertext: Uint8Array
  mac: Uint8Array
} {
  const d = hexToBytes(dataHex)
  return {
    ephemeralPub: d.subarray(0, 33),
    iv: d.subarray(33, 49),
    ciphertext: d.subarray(49, -32),
    mac: d.subarray(-32),
  }
}

// Simple AES-256-CTR implementation on top of @noble/ciphers AES core
function aesCtrEncrypt(key: Uint8Array, ctrBytes: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 16
  const cipher = gcm(key, ctrBytes) // GCM internally handles CTR
  // Use noble's CTR approach: encrypt the plaintext directly with the derived stream
  // noble uses AES-CTR internally for GCM; simpler: implement CTR with AES-ECB
  const result = new Uint8Array(data.length)
  const counter = new Uint8Array(blockSize)
  counter.set(ctrBytes)
  for (let i = 0; i < data.length; i += blockSize) {
    const keystream = gcm(key, counter).encrypt(new Uint8Array(blockSize))
    for (let j = 0; j < blockSize && i + j < data.length; j++) {
      result[i + j] = keystream[j]! ^ data[i + j]!
    }
    // Increment counter (big-endian)
    for (let j = blockSize - 1; j >= 0; j--) {
      const val = counter[j]
      if (val !== undefined) {
        counter[j] = (val + 1) & 0xff
        if (counter[j] !== 0) break
      }
    }
  }
  return result
}

/**
 * Encrypt data with recipient's secp256k1 public key (ECIES).
 *
 * @param dataHex    The data to encrypt (hex, e.g. AES key)
 * @param publicKey  Recipient's public key (hex, 04-prefixed uncompressed or 02/03 compressed)
 */
export function eciesEncrypt(dataHex: string, publicKey: string): string {
  // 1. Ephemeral keypair
  const ephPriv = randomBytes(32)
  const ephPub = secp256k1.getPublicKey(ephPriv, true) // 33B compressed

  // 2. Parse recipient public key
  let recipientPub: Uint8Array
  if (publicKey.startsWith('04') && publicKey.length === 130) {
    recipientPub = hexToBytes(publicKey)
  } else if (publicKey.startsWith('02') || publicKey.startsWith('03')) {
    recipientPub = hexToBytes(publicKey)
  } else {
    throw new Error('Invalid public key format: expected hex with 02/03/04 prefix')
  }

  // 3. ECDH
  const shared = secp256k1.getSharedSecret(ephPriv, recipientPub)
  const sharedX = shared.subarray(1, 33) // x-coordinate only
  const sharedKey = sha256(sharedX)

  // 4. HKDF: encKey(32) || macKey(32)
  const hkdfOut = hkdf(sha256, sharedKey, undefined, undefined, 64)
  const encKey = hkdfOut.subarray(0, 32)
  const macKey = hkdfOut.subarray(32, 64)

  // 5. AES-256-CTR encrypt
  const iv = randomBytes(16)
  const plaintext = hexToBytes(dataHex)
  const ciphertext = aesCtrEncrypt(encKey, iv, plaintext)

  // 6. HMAC: MAC(ephemeralPub || IV || ciphertext)
  const macInput = new Uint8Array(33 + 16 + ciphertext.length)
  macInput.set(ephPub, 0)
  macInput.set(iv, 33)
  macInput.set(ciphertext, 33 + 16)
  const mac = hmac(sha256, macKey, macInput)

  return eciesEncode(ephPub, iv, ciphertext, mac)
}

/**
 * Normalize a secp256k1 private key to bare 32-byte hex.
 *
 * Noble's `hexToBytes` rejects a `0x` prefix outright, which used to surface as
 * an opaque "hex string expected" error for keys copied straight out of a
 * wallet / `.env`. Accept both forms and fail with an actionable message.
 */
function normalizePrivateKey(privateKey: string): string {
  const hex = typeof privateKey === 'string' && privateKey.startsWith('0x')
    ? privateKey.slice(2)
    : privateKey
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'Invalid private key: expected 32-byte hex (64 hex chars; "0x" prefix is optional)'
    )
  }
  return hex
}

/**
 * Decrypt ECIES ciphertext with recipient's secp256k1 private key.
 */
export function eciesDecrypt(dataHex: string, privateKey: string): string {
  const { ephemeralPub, iv, ciphertext, mac } = eciesDecode(dataHex)

  // 1. ECDH
  const privBytes = hexToBytes(normalizePrivateKey(privateKey))
  const shared = secp256k1.getSharedSecret(privBytes, ephemeralPub)
  const sharedX = shared.subarray(1, 33)
  const sharedKey = sha256(sharedX)

  // 2. HKDF
  const hkdfOut = hkdf(sha256, sharedKey, undefined, undefined, 64)
  const encKey = hkdfOut.subarray(0, 32)
  const macKey = hkdfOut.subarray(32, 64)

  // 3. Verify MAC
  const macInput = new Uint8Array(33 + 16 + ciphertext.length)
  macInput.set(ephemeralPub, 0)
  macInput.set(iv, 33)
  macInput.set(ciphertext, 33 + 16)
  const expectedMac = hmac(sha256, macKey, macInput)
  if (!constantTimeEqual(mac, expectedMac)) {
    throw new Error('ECIES decryption failed: MAC mismatch')
  }

  // 4. Decrypt
  const plaintext = aesCtrEncrypt(encKey, iv, ciphertext) // CTR encrypt = decrypt
  return bytesToHex(plaintext)
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

// ── High-Level: Agent Pack / Unpack ────────────────────────────────────────

/**
 * Encrypt an Agent's private payload with AES-256-GCM.
 */
export function encryptPayload(
  payload: AgentPrivatePayload,
  keyHex?: string
): EncryptedPayload {
  const key = keyHex ?? generateAesKey()
  return {
    encrypted: true,
    algorithm: 'AES-256-GCM',
    data: aesEncrypt(JSON.stringify(payload), key),
  }
}

/**
 * Decrypt an EncryptedPayload.
 */
export function decryptPayload(
  encrypted: EncryptedPayload,
  keyHex: string
): AgentPrivatePayload {
  if (encrypted.algorithm !== 'AES-256-GCM') {
    throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`)
  }
  return JSON.parse(aesDecrypt(encrypted.data, keyHex)) as AgentPrivatePayload
}

/**
 * Pack an AgentPayload for publishing.
 *   1. Split public/private
 *   2. AES-256-GCM encrypt private part
 *   3. ECIES wrap AES key with creator's public key
 */
export function packAgentForPublish(
  agent: import('./types').AgentPayload,
  publicKey: string,
  aesKeyHex?: string
): PackResult {
  const key = aesKeyHex ?? generateAesKey()

  const eciesEncryptedKeyHex = eciesEncrypt(key, publicKey)

  return {
    encryptedCid: '', // filled after IPFS upload
    publicCid: '',    // filled after IPFS upload
    aesKeyHex: key,
    eciesEncryptedKeyHex,
  }
}

// ── Integrated Publish Pipeline ────────────────────────────────────────────

import type { IPFSUploader, IPFSUploadResult } from '../ipfs/ipfs-uploader'

export interface PublishAgentConfig {
  /** Agent payload to publish */
  agent: import('./types').AgentPayload
  /** Creator's secp256k1 public key (hex) */
  publicKey: string
  /** IPFS uploader instance with Pinata JWT configured */
  uploader: IPFSUploader
  /** Optional AES key (auto-generated if not provided) */
  aesKeyHex?: string
  /** Agent name for IPFS metadata */
  agentName?: string
  /**
   * Pre-publish self-check: the payload private key that will be used to
   * decrypt this agent. When provided, the ECIES-wrapped AES key is unwrapped
   * with it before anything is uploaded, and a mismatch aborts with an error.
   *
   * This is the cheapest way to catch a wrong key or a derivation-`mode`
   * mismatch **before minting** — `tokenURI` is immutable, so an agent minted
   * with the wrong key can never be decrypted. Recommended whenever the private
   * key is available at publish time (e.g. straight from
   * `deriveKeyPairFromWallet()`).
   */
  verifyWithPrivateKey?: string
}

export interface PublishAgentResult {
  /** AES encryption key (hex) */
  aesKeyHex: string
  /** ECIES-encrypted AES key for on-chain storage */
  eciesEncryptedKeyHex: string
  /** CID of the encrypted private payload on IPFS */
  encryptedCid: string
  /** Public IPFS gateway URL to the encrypted payload */
  encryptedUrl: string
  /** CID of the public metadata on IPFS */
  publicCid: string
  /** Public IPFS gateway URL to the public metadata */
  publicUrl: string
  /** Full PackResult (compatible with existing code) */
  pack: PackResult
  /** Raw IPFS upload results */
  uploads: { encrypted: IPFSUploadResult; public: IPFSUploadResult }
}

/**
 * Full publish pipeline: encrypt + upload to IPFS.
 *
 * Usage:
 *   const uploader = new IPFSUploader({ pinataJwt: '...' })
 *   const result = await publishAgent({ agent, publicKey, uploader })
 *   // result.encryptedCid → IPFS CID to mint as on-chain tokenURI
 */
export async function publishAgent(config: PublishAgentConfig): Promise<PublishAgentResult> {
  const { agent, publicKey, uploader, aesKeyHex, agentName } = config

  if (!uploader.isConfigured()) {
    throw new Error('IPFSUploader is not configured — set pinataJwt or customEndpoint')
  }

  const key = aesKeyHex ?? generateAesKey()
  const eciesEncryptedKeyHex = eciesEncrypt(key, publicKey)

  // Pre-publish self-check — must run before any upload/mint, because a wrong
  // private key (or a v1/v2 derivation mismatch) is only discoverable here.
  if (config.verifyWithPrivateKey) {
    let unwrapped: string
    try {
      unwrapped = eciesDecrypt(eciesEncryptedKeyHex, config.verifyWithPrivateKey)
    } catch (err) {
      throw new Error(
        'Pre-publish self-check failed: the supplied private key cannot unwrap the AES key ' +
        `(${(err as Error).message}). Check that it matches \`publicKey\` and that the publish ` +
        'and decrypt paths use the same derivation mode. Nothing was uploaded.'
      )
    }
    if (unwrapped !== key) {
      throw new Error(
        'Pre-publish self-check failed: the unwrapped AES key does not match the one used to ' +
        'encrypt the payload. Nothing was uploaded.'
      )
    }
  }

  // Split into private (encrypted) and public payloads
  const privatePayload: import('./types').AgentPrivatePayload = {
    prompt: agent.prompt,
    skills: agent.skills,
    mcp: agent.mcp,
  }
  const encryptedPayload = encryptPayload(privatePayload, key)

  // Upload both parts to IPFS in parallel
  const [encrypted, publicMeta] = await Promise.all([
    uploader.uploadEncryptedPayload(encryptedPayload, agentName),
    uploader.uploadJSON({
      name: agent.name,
      description: agent.description,
      version: agent.version,
      tags: agent.tags,
      capabilities: agent.capabilities,
      category: agent.category,
      eciesKey: eciesEncryptedKeyHex,
    }),
  ])

  const pack: PackResult = {
    encryptedCid: encrypted.cid,
    publicCid: publicMeta.cid,
    aesKeyHex: key,
    eciesEncryptedKeyHex,
  }

  return {
    aesKeyHex: key,
    eciesEncryptedKeyHex,
    encryptedCid: encrypted.cid,
    encryptedUrl: encrypted.url,
    publicCid: publicMeta.cid,
    publicUrl: publicMeta.url,
    pack,
    uploads: { encrypted, public: publicMeta },
  }
}

/**
 * Unpack an Agent:
 *   1. ECIES decrypt the AES key (private key)
 *   2. AES-256-GCM decrypt the payload
 */
export function unpackAgent(
  encryptedPayload: EncryptedPayload,
  eciesEncryptedKey: string,
  privateKey: string
): AgentPrivatePayload {
  const aesKeyHex = eciesDecrypt(eciesEncryptedKey, privateKey)
  return decryptPayload(encryptedPayload, aesKeyHex)
}

// ── Key Pair Utilities ─────────────────────────────────────────────────────

/**
 * Generate a secp256k1 keypair compatible with Ethereum wallets.
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const priv = randomBytes(32)
  const pub = secp256k1.getPublicKey(priv, false) // uncompressed 04-prefixed
  return { privateKey: bytesToHex(priv), publicKey: bytesToHex(pub) }
}

/**
 * Derive public key from private key (hex; `0x` prefix optional).
 */
export function getPublicKey(privateKey: string): string {
  return bytesToHex(secp256k1.getPublicKey(hexToBytes(normalizePrivateKey(privateKey)), false))
}

// ── Wallet-derived key pair ────────────────────────────────────────────────
//
// Browser wallets (EIP-1193: MetaMask / OKX / Rabby / Trust / Coinbase) can
// never hand over the account private key, and `eth_getEncryptionPublicKey`
// (EIP-1024) is deprecated and MetaMask-only. The portable alternative is to
// derive a *separate* secp256k1 payload key from a deterministic secret:
//
//   v1/v2: secret = signature (65 B)               [personal_sign / EIP-712]
//   v3   : secret = WebAuthn PRF output (32 B)     [passkey — not a signature]
//   privateKey = HKDF-SHA256(IKM=secret, salt, info || address)[retry:i]
//
// The account key never leaves the wallet; the derived key never leaves the
// browser. Decryption replays the same secret.
//
// FROZEN CONTRACT — once agents are published with these values, changing any
// of them (or the publishing address) makes every already-published payload
// permanently undecryptable.
//
//   v1 `personal-sign-hkdf` : `message` / `salt` / `infoPrefix`
//   v2 `eip712-hkdf`        : `domain` / `types` / `primaryType` / `message` / `infoPrefix`
//   v3 `webauthn-prf-hkdf`  : `prfSalt` / `salt` / `infoPrefix` / **rpId** / **credentialId**
//
// v3 adds two dimensions the signature modes do not have: the WebAuthn RP ID
// (the site's registrable domain — the browser enforces it, which is what makes
// v3 phishing-resistant) and the credential itself. Both are *mandatory* to
// reproduce the key, so they are recorded on-chain (see
// `PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE`).
//
// Bump `infoPrefix` version only together with a migration story. All versions
// coexist: v1/v2 payloads stay decryptable. See `DEFAULT_DERIVATION_INFO_PREFIX_V3`.
//
// REQUIREMENT (signature modes only): the wallet must sign deterministically
// (RFC 6979 — MetaMask / Ledger / Trezor do; some MPC / custodial wallets do
// not). Use `assertDeterministic` when deriving a *publishing* key. v3 is
// deterministic by construction (PRF has no counter).

/**
 * Derivation profile.
 *
 * - `personal-sign-hkdf` (v1): IKM = `personal_sign` signature (65 B)
 * - `eip712-hkdf` (v2): IKM = `eth_signTypedData_v4` signature (65 B)
 * - `webauthn-prf-hkdf` (v3): IKM = WebAuthn **PRF** output (32 B, *not* a signature)
 */
export type DerivationMode = 'personal-sign-hkdf' | 'eip712-hkdf' | 'webauthn-prf-hkdf'

/** Default frozen message signed by the wallet (byte-exact; never localize). v1 only. */
export const DEFAULT_DERIVATION_MESSAGE =
  'Actora: derive agent payload encryption key (v1). ' +
  'This signature authorizes no transaction and no payment.'

export const DEFAULT_DERIVATION_SALT = 'actora/expert-enc'
export const DEFAULT_DERIVATION_INFO_PREFIX = 'agent-payload-encryption/v1'
/** HKDF info prefix for v2 (`eip712-hkdf`); `/<lowercased address>` is appended. */
export const DEFAULT_DERIVATION_INFO_PREFIX_V2 = 'agent-payload-encryption/v2'
/** HKDF info prefix for v3 (`webauthn-prf-hkdf`); `/<lowercased address>` is appended. */
export const DEFAULT_DERIVATION_INFO_PREFIX_V3 = 'agent-payload-encryption/v3'

/** HKDF info prefix for a mode, before the `/<address>` suffix. */
export function defaultInfoPrefixFor(mode: DerivationMode): string {
  if (mode === 'eip712-hkdf') return DEFAULT_DERIVATION_INFO_PREFIX_V2
  if (mode === 'webauthn-prf-hkdf') return DEFAULT_DERIVATION_INFO_PREFIX_V3
  return DEFAULT_DERIVATION_INFO_PREFIX
}

// ── v2: EIP-712 typed-data derivation ──────────────────────────────────────
//
// v1 signs free-form text, which EIP-1193 wallets can only render as a blind
// "sign this message" prompt, and the string is public + fixed ⇒ replayable by
// any phishing site. v2 keeps the HKDF construction byte-for-byte identical and
// only replaces *what is signed*: EIP-712 typed data, so the wallet shows a
// structured, domain-scoped prompt that names the contract intent.
//
//   signature  = eth_signTypedData_v4(domain, types, message)
//   privateKey = HKDF-SHA256(IKM = signature[65B], salt, info)[retry:i]
//
// No timestamp / nonce: the signature must be reproducible forever, otherwise
// the payload becomes undecryptable.

export interface Eip712TypeEntry {
  name: string
  type: string
}
export type Eip712Types = Record<string, Eip712TypeEntry[]>

export interface Eip712TypedData {
  domain: Record<string, unknown>
  types: Eip712Types
  primaryType: string
  message: Record<string, unknown>
}

/** Default v2 domain. Frozen — see the FROZEN CONTRACT note above. */
export const DEFAULT_EIP712_DOMAIN = {
  name: 'Actora Agent Payload',
  version: '2',
}

/** Default v2 `types`. Frozen. Treat as read-only; the builder clones it. */
export const DEFAULT_EIP712_TYPES: Eip712Types = {
  PayloadKey: [
    { name: 'address', type: 'address' },
    { name: 'purpose', type: 'string' },
    { name: 'version', type: 'uint256' },
  ],
}

export const DEFAULT_EIP712_PRIMARY_TYPE = 'PayloadKey'
export const DEFAULT_EIP712_PURPOSE = 'agent-payload-encryption'
export const DEFAULT_EIP712_MESSAGE_VERSION = 2

/** Per-field overrides for the v2 typed data. Omitted fields use the defaults. */
export interface Eip712DerivationOverrides {
  domain?: Record<string, unknown>
  types?: Eip712Types
  primaryType?: string
  message?: Record<string, unknown>
}

/**
 * Build the canonical v2 typed data for a publisher/subscriber address.
 *
 * `message.address` is lowercased to match the HKDF `info` binding, so the two
 * bindings cannot drift. Deterministic: no timestamp, no nonce.
 */
export function buildPayloadKeyTypedData(
  address: string,
  overrides: Eip712DerivationOverrides = {}
): Eip712TypedData {
  if (!address) {
    throw new Error('Address is required for key derivation (bound into the EIP-712 message)')
  }
  const source = overrides.types ?? DEFAULT_EIP712_TYPES
  const types: Eip712Types = {}
  for (const [key, entries] of Object.entries(source)) {
    types[key] = entries.map((entry) => ({ name: entry.name, type: entry.type }))
  }
  return {
    domain: { ...DEFAULT_EIP712_DOMAIN, ...overrides.domain },
    types,
    primaryType: overrides.primaryType ?? DEFAULT_EIP712_PRIMARY_TYPE,
    message: {
      address: address.toLowerCase(),
      purpose: DEFAULT_EIP712_PURPOSE,
      version: DEFAULT_EIP712_MESSAGE_VERSION,
      ...overrides.message,
    },
  }
}

// ── v3: WebAuthn PRF derivation ────────────────────────────────────────────
//
// v1/v2 derive from a *signature*, which is public and replayable: anything that
// can make the user sign the same payload derives the same payload key. Adding
// fields cannot fix it — a nonce / timestamp would make the key *unreproducible*
// instead. v3 changes the IKM **source**: the WebAuthn PRF extension output,
// which the authenticator computes from the credential and which the browser
// binds to the RP ID (your registrable domain). A phishing site on another
// origin cannot obtain it, and there is no signature to replay.
//
//   prfOutput  = PRF(credential, salt)                    ← 32 bytes, stable
//   privateKey = HKDF-SHA256(IKM = prfOutput, salt, info)[retry:i]
//
// Cost: the key is bound to (credential, rpId) instead of just an address, so
// losing the credential — or serving from a different domain — makes published
// payloads undecryptable. Both values are therefore recorded on-chain
// (`PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE`); without them v3 is *not* recoverable.

/** Frozen PRF evaluation salt (utf8). Changing it derives a different key. */
export const DEFAULT_PRF_SALT = 'actora/expert-enc'

/** `prf.eval.first` bytes for a PRF salt (defaults to the frozen `DEFAULT_PRF_SALT`). */
export function prfSaltBytes(salt: string = DEFAULT_PRF_SALT): Uint8Array {
  return utf8(salt)
}

/**
 * On-chain attribute key holding everything needed to *reproduce* a v3 key:
 * the WebAuthn RP ID, the credential ID and the PRF salt. A credential is not
 * discoverable from the address alone, so without this a v3 payload cannot be
 * decrypted even by the right user on the right device.
 *
 * Write it with `AgentRegistry.setPayloadKeyCredential()`.
 */
export const PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE = 'payload_key_credential'

export interface PayloadKeyCredential {
  /** WebAuthn RP ID — the registrable domain the credential is bound to. */
  rpId: string
  /** Base64url credential ID (a public handle, not a secret). */
  credentialId: string
  /** PRF evaluation salt. Defaults to `DEFAULT_PRF_SALT`. */
  prfSalt?: string
  /** Publishing address (lowercased) — the same binding used by the HKDF info. */
  address?: string
  /** HKDF info prefix actually used (defaults to the v3 prefix). */
  infoPrefix?: string
}

/** Serialize a credential binding for the `payload_key_credential` attribute. */
export function serializePayloadKeyCredential(credential: PayloadKeyCredential): string {
  if (!credential || !credential.rpId) {
    throw new Error('rpId is required to bind a v3 credential (the credential is RP-ID scoped)')
  }
  if (!credential.credentialId) {
    throw new Error('credentialId is required to bind a v3 credential (otherwise the key is unrecoverable)')
  }
  return JSON.stringify({
    rpId: credential.rpId,
    credentialId: credential.credentialId,
    ...(credential.prfSalt ? { prfSalt: credential.prfSalt } : {}),
    ...(credential.address ? { address: credential.address.toLowerCase() } : {}),
    ...(credential.infoPrefix ? { infoPrefix: credential.infoPrefix } : {}),
  })
}

/** Parse the `payload_key_credential` attribute; `undefined` when absent/invalid. */
export function readPayloadKeyCredential(
  attributes: Record<string, string | undefined>
): PayloadKeyCredential | undefined {
  const raw = attributes[PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE]
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as PayloadKeyCredential
    if (!parsed || typeof parsed.rpId !== 'string' || typeof parsed.credentialId !== 'string') {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

/** Stop after this many HKDF attempts to find a valid secp256k1 scalar. */
const DEFAULT_DERIVATION_MAX_ATTEMPTS = 8

/** Fixed plaintext used by the pre-return ECIES round-trip self-check. */
const SELF_CHECK_PROBE = '6163746f72612d73656c662d636865636b' // utf8 "actora-self-check"

/** Narrow an untrusted value (e.g. an on-chain attribute) to `DerivationMode`. */
export function isDerivationMode(value: unknown): value is DerivationMode {
  return value === 'personal-sign-hkdf' || value === 'eip712-hkdf' || value === 'webauthn-prf-hkdf'
}

/**
 * On-chain attribute key recording which derivation mode an agent was published
 * with. Read it to decide how to derive the payload key before attempting a
 * decrypt — without it a third-party runner has to guess (and guessing wrong
 * looks exactly like "the payload is corrupt").
 *
 * Write it with `AgentRegistry.setPayloadKeyMode()` (or `setAttributes`).
 */
export const PAYLOAD_KEY_MODE_ATTRIBUTE = 'payload_key_mode'

/**
 * Read the recorded derivation mode off a link/attribute map. Returns
 * `undefined` when absent — or when the value was written by a newer SDK
 * version that this one does not understand (check the raw attribute to tell
 * those two cases apart).
 */
export function readPayloadKeyMode(
  attributes: Record<string, string | undefined>
): DerivationMode | undefined {
  const raw = attributes[PAYLOAD_KEY_MODE_ATTRIBUTE]
  return isDerivationMode(raw) ? raw : undefined
}

export interface WalletKeyDerivationParams {
  /**
   * Which signature the payload key is derived from. Defaults to
   * `'personal-sign-hkdf'` (v1) — omitting it keeps existing callers on the
   * frozen v1 path.
   */
  mode?: DerivationMode
  /** Frozen message to sign (v1 only). Defaults to `DEFAULT_DERIVATION_MESSAGE`. */
  message?: string
  /** HKDF salt (domain separation). Defaults to `DEFAULT_DERIVATION_SALT`. */
  salt?: string
  /**
   * HKDF info prefix; `/<lowercased address>` is appended. Defaults to the
   * prefix of the selected `mode` (`agent-payload-encryption/v1`, `/v2` or `/v3`).
   */
  infoPrefix?: string
  /** Max HKDF attempts when the candidate scalar is out of range (default 8). */
  maxAttempts?: number
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let out = 0n
  for (const b of bytes) out = (out << 8n) | BigInt(b)
  return out
}

/** Shared HKDF body — identical for every mode; only the IKM source differs. */
function deriveFromIkmHex(
  ikmHex: string,
  address: string,
  params: WalletKeyDerivationParams,
  label: string
): string {
  const hex = ikmHex.startsWith('0x') ? ikmHex.slice(2) : ikmHex
  const ikm = hexToBytes(hex)
  if (ikm.length < 32) {
    throw new Error(`${label} too short for key derivation (${ikm.length} bytes, need >= 32)`)
  }
  if (!address) throw new Error('Address is required for key derivation (bound into HKDF info)')

  const salt = utf8(params.salt ?? DEFAULT_DERIVATION_SALT)
  const infoBase = `${
    params.infoPrefix ?? defaultInfoPrefixFor(params.mode ?? 'personal-sign-hkdf')
  }/${address.toLowerCase()}`
  const maxAttempts = Math.max(1, params.maxAttempts ?? DEFAULT_DERIVATION_MAX_ATTEMPTS)
  const n = secp256k1.CURVE.n

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Attempt 0 uses the frozen info string verbatim; retries only append a
    // suffix, so the primary path stays byte-stable across releases.
    const info = utf8(attempt === 0 ? infoBase : `${infoBase}/retry:${attempt}`)
    const candidate = hkdf(sha256, ikm, salt, info, 32)
    const scalar = bytesToBigInt(candidate)
    if (scalar > 0n && scalar < n) return bytesToHex(candidate)
  }
  throw new Error(`HKDF produced no valid secp256k1 scalar in ${maxAttempts} attempts`)
}

/**
 * Derive a secp256k1 private key (32-byte hex) from a wallet signature.
 *
 * Deterministic: same signature + same address + same params ⇒ same key.
 * `mode` only selects the default `infoPrefix`; the HKDF construction itself is
 * identical for v1/v2/v3 (the IKM is the wallet's 65-byte signature for v1/v2).
 * Throws when the signature is unusable or no valid scalar is found.
 */
export function derivePrivateKeyFromSignature(
  signature: string,
  address: string,
  params: WalletKeyDerivationParams = {}
): string {
  return deriveFromIkmHex(signature, address, params, 'Signature')
}

/**
 * Derive a secp256k1 private key (32-byte hex) from a raw IKM.
 *
 * Needed by `webauthn-prf-hkdf` (v3), whose IKM is the 32-byte WebAuthn PRF
 * output rather than a 65-byte signature. The HKDF construction is byte-for-byte
 * the same as `derivePrivateKeyFromSignature` — only the secret's origin differs,
 * which is why switching modes cannot be fixed by re-encoding a signature.
 */
export function derivePrivateKeyFromIkm(
  ikm: string,
  address: string,
  params: WalletKeyDerivationParams = {}
): string {
  return deriveFromIkmHex(ikm, address, params, 'IKM')
}

export interface DeriveKeyPairFromWalletArgs extends WalletKeyDerivationParams {
  /** v1 signer: wallet message signer (wagmi `signMessage` / viem `WalletClient.signMessage`). */
  signMessage(message: string): Promise<string>
  /**
   * v2 signer (`mode: 'eip712-hkdf'`): EIP-712 typed-data signer
   * (viem `WalletClient.signTypedData` / `eth_signTypedData_v4`). Required by v2.
   */
  signTypedData?(typedData: Eip712TypedData): Promise<string>
  /** v2 only: typed-data field overrides. Ignored by v1. */
  typedData?: Eip712DerivationOverrides
  /**
   * v3 secret provider (`mode: 'webauthn-prf-hkdf'`): returns the WebAuthn PRF
   * output as hex (32 bytes). Typically
   * `() => evaluatePrf({ credentialId, rpId }).then((r) => r.prfOutputHex)`.
   * Required by v3 — **there is deliberately no fallback to `signMessage`**.
   */
  getPrfOutput?(): Promise<string>
  /** Signer address (any case) — bound into the HKDF info string. */
  address: string
  /**
   * **Default `true`** (since 0.19.0) for the *signature* modes: sign twice and
   * require identical signatures. Catches non-deterministic (non-RFC-6979)
   * wallets, whose published agents could never be decrypted again — a *silent*
   * data-loss bug that only surfaces weeks later. Costs one extra prompt; pass
   * `false` to skip it (e.g. when the signer is already known to be
   * deterministic, or the flow must not prompt twice).
   *
   * Ignored by v3: the PRF has no counter, so it is deterministic by
   * construction and re-probing would only cost another biometric prompt.
   */
  assertDeterministic?: boolean
  /**
   * **Default `true`**: ECIES round-trip the derived pair (wrap + unwrap a
   * probe) before returning, so a public key whose private key cannot unwrap
   * the AES key fails here instead of after minting. Pure computation, no extra
   * prompt.
   */
  selfCheck?: boolean
}

/**
 * Derive the payload key pair from a browser wallet or a passkey.
 *
 * v1 (`mode: 'personal-sign-hkdf'`, default): signs a frozen text message.
 * v2 (`mode: 'eip712-hkdf'`): signs EIP-712 typed data, so the wallet renders a
 * structured, domain-scoped prompt instead of a blind `personal_sign`.
 * v3 (`mode: 'webauthn-prf-hkdf'`): no signature at all — the IKM is the
 * WebAuthn PRF output, bound by the browser to the RP ID, so it cannot be
 * replayed by a phishing site on another origin. Requires `getPrfOutput` (and,
 * for decryption later, the credential recorded via
 * `PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE`).
 *
 * Publishing: `publishAgent({ agent, publicKey, uploader })` with the returned
 * `publicKey`; pass `verifyWithPrivateKey: <privateKey>` there to dry-run the
 * unwrap before anything is minted. Decrypting: pass the returned `privateKey`
 * to `AgentRunner` via `WalletSigner.deriveEncryptionKey()` (or `unpackAgent()`
 * directly).
 *
 * Safety checks default on (`assertDeterministic` for v1/v2, `selfCheck` for
 * all) — both guard against publishing an agent that can never be decrypted.
 */
export async function deriveKeyPairFromWallet(
  args: DeriveKeyPairFromWalletArgs
): Promise<{ privateKey: string; publicKey: string }> {
  const mode = args.mode ?? 'personal-sign-hkdf'

  const sign = async (): Promise<string> => {
    if (mode === 'webauthn-prf-hkdf') {
      if (!args.getPrfOutput) {
        // No fallback on purpose: silently signing instead would put the user
        // back on a replayable key while believing they are on a passkey.
        throw new Error(
          "mode: 'webauthn-prf-hkdf' requires a getPrfOutput function " +
          '(e.g. () => evaluatePrf({ credentialId, rpId }).then(r => r.prfOutputHex)). ' +
          'It will NOT fall back to signMessage: a passkey-derived key cannot be ' +
          'reproduced from a signature.'
        )
      }
      return args.getPrfOutput()
    }
    if (mode === 'eip712-hkdf') {
      if (!args.signTypedData) {
        throw new Error(
          "mode: 'eip712-hkdf' requires a signTypedData function " +
          '(viem WalletClient.signTypedData / eth_signTypedData_v4)'
        )
      }
      return args.signTypedData(buildPayloadKeyTypedData(args.address, args.typedData))
    }
    return args.signMessage(args.message ?? DEFAULT_DERIVATION_MESSAGE)
  }

  const signature = await sign()

  if (mode !== 'webauthn-prf-hkdf' && (args.assertDeterministic ?? true)) {
    const second = await sign()
    if (second.toLowerCase() !== signature.toLowerCase()) {
      throw new Error(
        'Wallet returned different signatures for the same payload — it is not RFC 6979 ' +
        'deterministic, so a derived key cannot be reproduced and the agent would be ' +
        'permanently undecryptable. Use a deterministic wallet (MetaMask / Ledger / Trezor) ' +
        'or inject the key via WalletSigner.getPrivateKey() / AgentRunnerConfig.unpack.'
      )
    }
  }

  const privateKey = derivePrivateKeyFromIkm(signature, args.address, args)
  const publicKey = getPublicKey(privateKey)

  if (args.selfCheck ?? true) {
    const probe = SELF_CHECK_PROBE
    if (eciesDecrypt(eciesEncrypt(probe, publicKey), privateKey) !== probe) {
      throw new Error(
        'Self-check failed: the derived key pair cannot round-trip ECIES. ' +
        'Do not publish with this key — the agent would be undecryptable.'
      )
    }
  }

  return { privateKey, publicKey }
}
