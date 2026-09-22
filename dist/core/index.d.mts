import { a as AgentPayload, P as PackResult, E as EncryptedPayload, A as AgentPrivatePayload } from '../types-D4CaANmj.mjs';
export { d as A2AAgentCard, e as A2ASkillExecution, f as A2ATask, g as A2ATaskStatus, h as AGENT_CATEGORIES, i as ActoraConfig, j as ActoraContracts, k as ActoraError, l as ActoraErrorCode, m as AgentCategory, n as AgentPricing, o as AgentPublicPayload, c as AgentReputation, b as AgentReview, p as AgentSearchQuery, q as AgentSearchResult, r as AgentSubscription, J as JSONSchema, s as JSONSchemaProperty, M as McpConnection, t as McpTransport, O as OnChainAgentMetadata, u as PricingType, R as RegisteredAgent, S as SkillDef, v as SkillExecutionMode, w as SkillExecutionRemote, x as SubscriptionRequired, y as SubscriptionStatus, U as UnpackResult } from '../types-D4CaANmj.mjs';
import { IPFSUploader, IPFSUploadResult } from '../ipfs/index.mjs';
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
 * Derive public key from private key (hex).
 */
declare function getPublicKey(privateKey: string): string;
/** Default frozen message signed by the wallet (byte-exact; never localize). */
declare const DEFAULT_DERIVATION_MESSAGE: string;
declare const DEFAULT_DERIVATION_SALT = "actora/expert-enc";
declare const DEFAULT_DERIVATION_INFO_PREFIX = "agent-payload-encryption/v1";
interface WalletKeyDerivationParams {
    /** Frozen message to sign. Defaults to `DEFAULT_DERIVATION_MESSAGE`. */
    message?: string;
    /** HKDF salt (domain separation). Defaults to `DEFAULT_DERIVATION_SALT`. */
    salt?: string;
    /** HKDF info prefix; `/<lowercased address>` is appended. */
    infoPrefix?: string;
    /** Max HKDF attempts when the candidate scalar is out of range (default 8). */
    maxAttempts?: number;
}
/**
 * Derive a secp256k1 private key (32-byte hex) from a wallet signature.
 *
 * Deterministic: same signature + same address + same params ⇒ same key.
 * Throws when the signature is unusable or no valid scalar is found.
 */
declare function derivePrivateKeyFromSignature(signature: string, address: string, params?: WalletKeyDerivationParams): string;
interface DeriveKeyPairFromWalletArgs extends WalletKeyDerivationParams {
    /** Wallet message signer (wagmi `signMessage` / viem `WalletClient.signMessage`). */
    signMessage(message: string): Promise<string>;
    /** Signer address (any case) — bound into the HKDF info string. */
    address: string;
    /**
     * Opt-in safety check: sign the message twice and require identical
     * signatures. Catches non-deterministic (non-RFC-6979) wallets, whose
     * published agents could never be decrypted again. Costs one extra prompt —
     * recommended for the publishing path, unnecessary for decryption.
     */
    assertDeterministic?: boolean;
}
/**
 * Derive the payload key pair from a browser wallet.
 *
 * Publishing: `publishAgent({ agent, publicKey, uploader })` with the returned
 * `publicKey`. Decrypting: pass the returned `privateKey` to `AgentRunner` via
 * `WalletSigner.deriveEncryptionKey()` (or `unpackAgent()` directly).
 */
declare function deriveKeyPairFromWallet(args: DeriveKeyPairFromWalletArgs): Promise<{
    privateKey: string;
    publicKey: string;
}>;

export { AgentPayload, AgentPrivatePayload, DEFAULT_DERIVATION_INFO_PREFIX, DEFAULT_DERIVATION_MESSAGE, DEFAULT_DERIVATION_SALT, type DeriveKeyPairFromWalletArgs, EncryptedPayload, PackResult, type PublishAgentConfig, type PublishAgentResult, type WalletKeyDerivationParams, aesDecrypt, aesEncrypt, decryptPayload, decryptWithKey, deriveKeyPairFromWallet, derivePrivateKeyFromSignature, eciesDecrypt, eciesEncrypt, encryptPayload, encryptWithKey, generateAesKey, generateKeyPair, getPublicKey, packAgentForPublish, publishAgent, randomBytes, unpackAgent };
