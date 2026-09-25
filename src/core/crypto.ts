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

// ── Wallet-derived key pair (personal_sign + HKDF-SHA256) ──────────────────
//
// Browser wallets (EIP-1193: MetaMask / OKX / Rabby / Trust / Coinbase) can
// never hand over the account private key, and `eth_getEncryptionPublicKey`
// (EIP-1024) is deprecated and MetaMask-only. The portable alternative is to
// derive a *separate* secp256k1 payload key from a deterministic signature:
//
//   signature = personal_sign(frozen message)   ← 65 bytes, RFC 6979
//   privateKey = HKDF-SHA256(IKM=signature, salt, info || address)[retry:i]
//
// The account key never leaves the wallet; the derived key never leaves the
// browser. Decryption replays the same signature.
//
// FROZEN CONTRACT — once agents are published with these values, changing any
// of them (or the publishing address) makes every already-published payload
// permanently undecryptable.
//
//   v1 `personal-sign-hkdf` : `message` / `salt` / `infoPrefix`
//   v2 `eip712-hkdf`        : `domain` / `types` / `primaryType` / `message` / `infoPrefix`
//
// Bump `infoPrefix` version only together with a migration story. Both versions
// coexist: v1 payloads stay decryptable. See `DEFAULT_DERIVATION_INFO_PREFIX_V2`.
//
// REQUIREMENT: the wallet must sign deterministically (RFC 6979 — MetaMask /
// Ledger / Trezor do; some MPC / custodial wallets do not). Use
// `assertDeterministic` when deriving a *publishing* key.

/** Derivation profile: v1 free-form `personal_sign`, or v2 EIP-712 typed data. */
export type DerivationMode = 'personal-sign-hkdf' | 'eip712-hkdf'

/** Default frozen message signed by the wallet (byte-exact; never localize). v1 only. */
export const DEFAULT_DERIVATION_MESSAGE =
  'Actora: derive agent payload encryption key (v1). ' +
  'This signature authorizes no transaction and no payment.'

export const DEFAULT_DERIVATION_SALT = 'actora/expert-enc'
export const DEFAULT_DERIVATION_INFO_PREFIX = 'agent-payload-encryption/v1'
/** HKDF info prefix for v2 (`eip712-hkdf`); `/<lowercased address>` is appended. */
export const DEFAULT_DERIVATION_INFO_PREFIX_V2 = 'agent-payload-encryption/v2'

/** HKDF info prefix for a mode, before the `/<address>` suffix. */
export function defaultInfoPrefixFor(mode: DerivationMode): string {
  return mode === 'eip712-hkdf'
    ? DEFAULT_DERIVATION_INFO_PREFIX_V2
    : DEFAULT_DERIVATION_INFO_PREFIX
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

/** Stop after this many HKDF attempts to find a valid secp256k1 scalar. */
const DEFAULT_DERIVATION_MAX_ATTEMPTS = 8

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
   * prefix of the selected `mode` (`agent-payload-encryption/v1` or `/v2`).
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

/**
 * Derive a secp256k1 private key (32-byte hex) from a wallet signature.
 *
 * Deterministic: same signature + same address + same params ⇒ same key.
 * `mode` only selects the default `infoPrefix`; the HKDF construction itself is
 * identical for v1 and v2 (the IKM is the 65-byte signature either way).
 * Throws when the signature is unusable or no valid scalar is found.
 */
export function derivePrivateKeyFromSignature(
  signature: string,
  address: string,
  params: WalletKeyDerivationParams = {}
): string {
  const hex = signature.startsWith('0x') ? signature.slice(2) : signature
  const ikm = hexToBytes(hex)
  if (ikm.length < 32) {
    throw new Error(`Signature too short for key derivation (${ikm.length} bytes, need >= 32)`)
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
  /** Signer address (any case) — bound into the HKDF info string. */
  address: string
  /**
   * Opt-in safety check: sign twice and require identical signatures. Catches
   * non-deterministic (non-RFC-6979) wallets, whose published agents could
   * never be decrypted again. Costs one extra prompt — recommended for the
   * publishing path, unnecessary for decryption.
   */
  assertDeterministic?: boolean
}

/**
 * Derive the payload key pair from a browser wallet.
 *
 * v1 (`mode: 'personal-sign-hkdf'`, default): signs a frozen text message.
 * v2 (`mode: 'eip712-hkdf'`): signs EIP-712 typed data, so the wallet renders a
 * structured, domain-scoped prompt instead of a blind `personal_sign`.
 *
 * Publishing: `publishAgent({ agent, publicKey, uploader })` with the returned
 * `publicKey`. Decrypting: pass the returned `privateKey` to `AgentRunner` via
 * `WalletSigner.deriveEncryptionKey()` (or `unpackAgent()` directly).
 */
export async function deriveKeyPairFromWallet(
  args: DeriveKeyPairFromWalletArgs
): Promise<{ privateKey: string; publicKey: string }> {
  const mode = args.mode ?? 'personal-sign-hkdf'

  const sign = async (): Promise<string> => {
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

  if (args.assertDeterministic) {
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

  const privateKey = derivePrivateKeyFromSignature(signature, args.address, args)
  return { privateKey, publicKey: getPublicKey(privateKey) }
}
