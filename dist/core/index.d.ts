import { a as AgentPayload, P as PackResult, E as EncryptedPayload, A as AgentPrivatePayload } from '../types-D4CaANmj.js';
export { d as A2AAgentCard, e as A2ASkillExecution, f as A2ATask, g as A2ATaskStatus, h as AGENT_CATEGORIES, i as ActoraConfig, j as ActoraContracts, k as ActoraError, l as ActoraErrorCode, m as AgentCategory, n as AgentPricing, o as AgentPublicPayload, c as AgentReputation, b as AgentReview, p as AgentSearchQuery, q as AgentSearchResult, r as AgentSubscription, J as JSONSchema, s as JSONSchemaProperty, M as McpConnection, t as McpTransport, O as OnChainAgentMetadata, u as PricingType, R as RegisteredAgent, S as SkillDef, v as SkillExecutionMode, w as SkillExecutionRemote, x as SubscriptionRequired, y as SubscriptionStatus, U as UnpackResult } from '../types-D4CaANmj.js';
import { IPFSUploader, IPFSUploadResult } from '../ipfs/index.js';
export { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';

declare function randomBytes(length: number): Uint8Array;

/**
 * Encrypt with AES-256-GCM.
 * Wire format: base64( IV[12] || ciphertext || authTag[16] )
 */
declare function aesEncrypt(plaintext: string, keyHex: string): string;
/**
 * Decrypt AES-256-GCM.
 */
declare function aesDecrypt(encryptedBase64: string, keyHex: string): string;
/**
 * Encrypt with AES-256-GCM — master-key wire format.
 * Layout: base64( IV[12] || authTag[16] || ciphertext ).
 * Kept byte-for-byte compatible with the Gateway's legacy at-rest key
 * encryption (`gateway/src/lib/crypto.ts`) so existing stored rows decrypt
 * unchanged. New code should prefer `aesEncrypt`/`aesDecrypt` unless data
 * written in this layout must be read.
 */
declare function encryptWithKey(plaintext: string, keyHex: string): string;
/**
 * Decrypt AES-256-GCM — master-key wire format
 * (base64( IV[12] || authTag[16] || ciphertext )).
 */
declare function decryptWithKey(encryptedBase64: string, keyHex: string): string;
/**
 * Generate a cryptographically random AES-256 key (hex, 64 chars).
 */
declare function generateAesKey(): string;
/**
 * Encrypt data with recipient's secp256k1 public key (ECIES).
 *
 * @param dataHex    The data to encrypt (hex, e.g. AES key)
 * @param publicKey  Recipient's public key (hex, 04-prefixed uncompressed or 02/03 compressed)
 */
declare function eciesEncrypt(dataHex: string, publicKey: string): string;
/**
 * Decrypt ECIES ciphertext with recipient's secp256k1 private key.
 */
declare function eciesDecrypt(dataHex: string, privateKey: string): string;
/**
 * Encrypt an Agent's private payload with AES-256-GCM.
 */
declare function encryptPayload(payload: AgentPrivatePayload, keyHex?: string): EncryptedPayload;
/**
 * Decrypt an EncryptedPayload.
 */
declare function decryptPayload(encrypted: EncryptedPayload, keyHex: string): AgentPrivatePayload;
/**
 * Pack an AgentPayload for publishing.
 *   1. Split public/private
 *   2. AES-256-GCM encrypt private part
 *   3. ECIES wrap AES key with creator's public key
 */
declare function packAgentForPublish(agent: AgentPayload, publicKey: string, aesKeyHex?: string): PackResult;

interface PublishAgentConfig {
    /** Agent payload to publish */
    agent: AgentPayload;
    /** Creator's secp256k1 public key (hex) */
    publicKey: string;
    /** IPFS uploader instance with Pinata JWT configured */
    uploader: IPFSUploader;
    /** Optional AES key (auto-generated if not provided) */
    aesKeyHex?: string;
    /** Agent name for IPFS metadata */
    agentName?: string;
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
    verifyWithPrivateKey?: string;
}
interface PublishAgentResult {
    /** AES encryption key (hex) */
    aesKeyHex: string;
    /** ECIES-encrypted AES key for on-chain storage */
    eciesEncryptedKeyHex: string;
    /** CID of the encrypted private payload on IPFS */
    encryptedCid: string;
    /** Public IPFS gateway URL to the encrypted payload */
    encryptedUrl: string;
    /** CID of the public metadata on IPFS */
    publicCid: string;
    /** Public IPFS gateway URL to the public metadata */
    publicUrl: string;
    /** Full PackResult (compatible with existing code) */
    pack: PackResult;
    /** Raw IPFS upload results */
    uploads: {
        encrypted: IPFSUploadResult;
        public: IPFSUploadResult;
    };
}
/**
 * Full publish pipeline: encrypt + upload to IPFS.
 *
 * Usage:
 *   const uploader = new IPFSUploader({ pinataJwt: '...' })
 *   const result = await publishAgent({ agent, publicKey, uploader })
 *   // result.encryptedCid → IPFS CID to mint as on-chain tokenURI
 */
declare function publishAgent(config: PublishAgentConfig): Promise<PublishAgentResult>;
/**
 * Unpack an Agent:
 *   1. ECIES decrypt the AES key (private key)
 *   2. AES-256-GCM decrypt the payload
 */
declare function unpackAgent(encryptedPayload: EncryptedPayload, eciesEncryptedKey: string, privateKey: string): AgentPrivatePayload;
/**
 * Generate a secp256k1 keypair compatible with Ethereum wallets.
 */
declare function generateKeyPair(): {
    privateKey: string;
    publicKey: string;
};
/**
 * Derive public key from private key (hex; `0x` prefix optional).
 */
declare function getPublicKey(privateKey: string): string;
/** Derivation profile: v1 free-form `personal_sign`, or v2 EIP-712 typed data. */
type DerivationMode = 'personal-sign-hkdf' | 'eip712-hkdf';
/** Default frozen message signed by the wallet (byte-exact; never localize). v1 only. */
declare const DEFAULT_DERIVATION_MESSAGE: string;
declare const DEFAULT_DERIVATION_SALT = "actora/expert-enc";
declare const DEFAULT_DERIVATION_INFO_PREFIX = "agent-payload-encryption/v1";
/** HKDF info prefix for v2 (`eip712-hkdf`); `/<lowercased address>` is appended. */
declare const DEFAULT_DERIVATION_INFO_PREFIX_V2 = "agent-payload-encryption/v2";
/** HKDF info prefix for a mode, before the `/<address>` suffix. */
declare function defaultInfoPrefixFor(mode: DerivationMode): string;
interface Eip712TypeEntry {
    name: string;
    type: string;
}
type Eip712Types = Record<string, Eip712TypeEntry[]>;
interface Eip712TypedData {
    domain: Record<string, unknown>;
    types: Eip712Types;
    primaryType: string;
    message: Record<string, unknown>;
}
/** Default v2 domain. Frozen — see the FROZEN CONTRACT note above. */
declare const DEFAULT_EIP712_DOMAIN: {
    name: string;
    version: string;
};
/** Default v2 `types`. Frozen. Treat as read-only; the builder clones it. */
declare const DEFAULT_EIP712_TYPES: Eip712Types;
declare const DEFAULT_EIP712_PRIMARY_TYPE = "PayloadKey";
declare const DEFAULT_EIP712_PURPOSE = "agent-payload-encryption";
declare const DEFAULT_EIP712_MESSAGE_VERSION = 2;
/** Per-field overrides for the v2 typed data. Omitted fields use the defaults. */
interface Eip712DerivationOverrides {
    domain?: Record<string, unknown>;
    types?: Eip712Types;
    primaryType?: string;
    message?: Record<string, unknown>;
}
/**
 * Build the canonical v2 typed data for a publisher/subscriber address.
 *
 * `message.address` is lowercased to match the HKDF `info` binding, so the two
 * bindings cannot drift. Deterministic: no timestamp, no nonce.
 */
declare function buildPayloadKeyTypedData(address: string, overrides?: Eip712DerivationOverrides): Eip712TypedData;
/** Narrow an untrusted value (e.g. an on-chain attribute) to `DerivationMode`. */
declare function isDerivationMode(value: unknown): value is DerivationMode;
/**
 * On-chain attribute key recording which derivation mode an agent was published
 * with. Read it to decide how to derive the payload key before attempting a
 * decrypt — without it a third-party runner has to guess (and guessing wrong
 * looks exactly like "the payload is corrupt").
 *
 * Write it with `AgentRegistry.setPayloadKeyMode()` (or `setAttributes`).
 */
declare const PAYLOAD_KEY_MODE_ATTRIBUTE = "payload_key_mode";
/**
 * Read the recorded derivation mode off a link/attribute map. Returns
 * `undefined` when absent — or when the value was written by a newer SDK
 * version that this one does not understand (check the raw attribute to tell
 * those two cases apart).
 */
declare function readPayloadKeyMode(attributes: Record<string, string | undefined>): DerivationMode | undefined;
interface WalletKeyDerivationParams {
    /**
     * Which signature the payload key is derived from. Defaults to
     * `'personal-sign-hkdf'` (v1) — omitting it keeps existing callers on the
     * frozen v1 path.
     */
    mode?: DerivationMode;
    /** Frozen message to sign (v1 only). Defaults to `DEFAULT_DERIVATION_MESSAGE`. */
    message?: string;
    /** HKDF salt (domain separation). Defaults to `DEFAULT_DERIVATION_SALT`. */
    salt?: string;
    /**
     * HKDF info prefix; `/<lowercased address>` is appended. Defaults to the
     * prefix of the selected `mode` (`agent-payload-encryption/v1` or `/v2`).
     */
    infoPrefix?: string;
    /** Max HKDF attempts when the candidate scalar is out of range (default 8). */
    maxAttempts?: number;
}
/**
 * Derive a secp256k1 private key (32-byte hex) from a wallet signature.
 *
 * Deterministic: same signature + same address + same params ⇒ same key.
 * `mode` only selects the default `infoPrefix`; the HKDF construction itself is
 * identical for v1 and v2 (the IKM is the 65-byte signature either way).
 * Throws when the signature is unusable or no valid scalar is found.
 */
declare function derivePrivateKeyFromSignature(signature: string, address: string, params?: WalletKeyDerivationParams): string;
interface DeriveKeyPairFromWalletArgs extends WalletKeyDerivationParams {
    /** v1 signer: wallet message signer (wagmi `signMessage` / viem `WalletClient.signMessage`). */
    signMessage(message: string): Promise<string>;
    /**
     * v2 signer (`mode: 'eip712-hkdf'`): EIP-712 typed-data signer
     * (viem `WalletClient.signTypedData` / `eth_signTypedData_v4`). Required by v2.
     */
    signTypedData?(typedData: Eip712TypedData): Promise<string>;
    /** v2 only: typed-data field overrides. Ignored by v1. */
    typedData?: Eip712DerivationOverrides;
    /** Signer address (any case) — bound into the HKDF info string. */
    address: string;
    /**
     * **Default `true`** (since 0.19.0): sign twice and require identical
     * signatures. Catches non-deterministic (non-RFC-6979) wallets, whose
     * published agents could never be decrypted again — a *silent* data-loss bug
     * that only surfaces weeks later. Costs one extra prompt; pass `false` to
     * skip it (e.g. when the signer is already known to be deterministic, or the
     * flow must not prompt twice).
     */
    assertDeterministic?: boolean;
    /**
     * **Default `true`**: ECIES round-trip the derived pair (wrap + unwrap a
     * probe) before returning, so a public key whose private key cannot unwrap
     * the AES key fails here instead of after minting. Pure computation, no extra
     * prompt.
     */
    selfCheck?: boolean;
}
/**
 * Derive the payload key pair from a browser wallet.
 *
 * v1 (`mode: 'personal-sign-hkdf'`, default): signs a frozen text message.
 * v2 (`mode: 'eip712-hkdf'`): signs EIP-712 typed data, so the wallet renders a
 * structured, domain-scoped prompt instead of a blind `personal_sign`.
 *
 * Publishing: `publishAgent({ agent, publicKey, uploader })` with the returned
 * `publicKey`; pass `verifyWithPrivateKey: <privateKey>` there to dry-run the
 * unwrap before anything is minted. Decrypting: pass the returned `privateKey`
 * to `AgentRunner` via `WalletSigner.deriveEncryptionKey()` (or `unpackAgent()`
 * directly).
 *
 * Two safety checks run by default (`assertDeterministic`, `selfCheck`) — both
 * guard against publishing an agent that can never be decrypted again.
 */
declare function deriveKeyPairFromWallet(args: DeriveKeyPairFromWalletArgs): Promise<{
    privateKey: string;
    publicKey: string;
}>;

export { AgentPayload, AgentPrivatePayload, DEFAULT_DERIVATION_INFO_PREFIX, DEFAULT_DERIVATION_INFO_PREFIX_V2, DEFAULT_DERIVATION_MESSAGE, DEFAULT_DERIVATION_SALT, DEFAULT_EIP712_DOMAIN, DEFAULT_EIP712_MESSAGE_VERSION, DEFAULT_EIP712_PRIMARY_TYPE, DEFAULT_EIP712_PURPOSE, DEFAULT_EIP712_TYPES, type DerivationMode, type DeriveKeyPairFromWalletArgs, type Eip712DerivationOverrides, type Eip712TypeEntry, type Eip712TypedData, type Eip712Types, EncryptedPayload, PAYLOAD_KEY_MODE_ATTRIBUTE, PackResult, type PublishAgentConfig, type PublishAgentResult, type WalletKeyDerivationParams, aesDecrypt, aesEncrypt, buildPayloadKeyTypedData, decryptPayload, decryptWithKey, defaultInfoPrefixFor, deriveKeyPairFromWallet, derivePrivateKeyFromSignature, eciesDecrypt, eciesEncrypt, encryptPayload, encryptWithKey, generateAesKey, generateKeyPair, getPublicKey, isDerivationMode, packAgentForPublish, publishAgent, randomBytes, readPayloadKeyMode, unpackAgent };
