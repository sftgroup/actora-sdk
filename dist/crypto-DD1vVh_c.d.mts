import { A as AgentPayload, P as PackResult, E as EncryptedPayload, a as AgentPrivatePayload } from './types-CX4o7N9P.mjs';
import { IPFSUploader, IPFSUploadResult } from './ipfs/index.mjs';

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
/**
 * Derivation profile.
 *
 * - `personal-sign-hkdf` (v1): IKM = `personal_sign` signature (65 B)
 * - `eip712-hkdf` (v2): IKM = `eth_signTypedData_v4` signature (65 B)
 * - `webauthn-prf-hkdf` (v3): IKM = WebAuthn **PRF** output (32 B, *not* a signature)
 */
type DerivationMode = 'personal-sign-hkdf' | 'eip712-hkdf' | 'webauthn-prf-hkdf';
/** Default frozen message signed by the wallet (byte-exact; never localize). v1 only. */
declare const DEFAULT_DERIVATION_MESSAGE: string;
declare const DEFAULT_DERIVATION_SALT = "actora/expert-enc";
declare const DEFAULT_DERIVATION_INFO_PREFIX = "agent-payload-encryption/v1";
/** HKDF info prefix for v2 (`eip712-hkdf`); `/<lowercased address>` is appended. */
declare const DEFAULT_DERIVATION_INFO_PREFIX_V2 = "agent-payload-encryption/v2";
/** HKDF info prefix for v3 (`webauthn-prf-hkdf`); `/<lowercased address>` is appended. */
declare const DEFAULT_DERIVATION_INFO_PREFIX_V3 = "agent-payload-encryption/v3";
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
/** Frozen PRF evaluation salt (utf8). Changing it derives a different key. */
declare const DEFAULT_PRF_SALT = "actora/expert-enc";
/** `prf.eval.first` bytes for a PRF salt (defaults to the frozen `DEFAULT_PRF_SALT`). */
declare function prfSaltBytes(salt?: string): Uint8Array;
/**
 * On-chain attribute key holding everything needed to *reproduce* a v3 key:
 * the WebAuthn RP ID, the credential ID and the PRF salt. A credential is not
 * discoverable from the address alone, so without this a v3 payload cannot be
 * decrypted even by the right user on the right device.
 *
 * Write it with `AgentRegistry.setPayloadKeyCredential()`.
 */
declare const PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE = "payload_key_credential";
interface PayloadKeyCredential {
    /** WebAuthn RP ID — the registrable domain the credential is bound to. */
    rpId: string;
    /** Base64url credential ID (a public handle, not a secret). */
    credentialId: string;
    /** PRF evaluation salt. Defaults to `DEFAULT_PRF_SALT`. */
    prfSalt?: string;
    /** Publishing address (lowercased) — the same binding used by the HKDF info. */
    address?: string;
    /** HKDF info prefix actually used (defaults to the v3 prefix). */
    infoPrefix?: string;
}
/** Serialize a credential binding for the `payload_key_credential` attribute. */
declare function serializePayloadKeyCredential(credential: PayloadKeyCredential): string;
/** Parse the `payload_key_credential` attribute; `undefined` when absent/invalid. */
declare function readPayloadKeyCredential(attributes: Record<string, string | undefined>): PayloadKeyCredential | undefined;
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
     * prefix of the selected `mode` (`agent-payload-encryption/v1`, `/v2` or `/v3`).
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
 * identical for v1/v2/v3 (the IKM is the wallet's 65-byte signature for v1/v2).
 * Throws when the signature is unusable or no valid scalar is found.
 */
declare function derivePrivateKeyFromSignature(signature: string, address: string, params?: WalletKeyDerivationParams): string;
/**
 * Derive a secp256k1 private key (32-byte hex) from a raw IKM.
 *
 * Needed by `webauthn-prf-hkdf` (v3), whose IKM is the 32-byte WebAuthn PRF
 * output rather than a 65-byte signature. The HKDF construction is byte-for-byte
 * the same as `derivePrivateKeyFromSignature` — only the secret's origin differs,
 * which is why switching modes cannot be fixed by re-encoding a signature.
 */
declare function derivePrivateKeyFromIkm(ikm: string, address: string, params?: WalletKeyDerivationParams): string;
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
    /**
     * v3 secret provider (`mode: 'webauthn-prf-hkdf'`): returns the WebAuthn PRF
     * output as hex (32 bytes). Typically
     * `() => evaluatePrf({ credentialId, rpId }).then((r) => r.prfOutputHex)`.
     * Required by v3 — **there is deliberately no fallback to `signMessage`**.
     */
    getPrfOutput?(): Promise<string>;
    /** Signer address (any case) — bound into the HKDF info string. */
    address: string;
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
declare function deriveKeyPairFromWallet(args: DeriveKeyPairFromWalletArgs): Promise<{
    privateKey: string;
    publicKey: string;
}>;

export { derivePrivateKeyFromIkm as A, derivePrivateKeyFromSignature as B, eciesDecrypt as C, type DerivationMode as D, type Eip712Types as E, eciesEncrypt as F, encryptPayload as G, encryptWithKey as H, generateAesKey as I, generateKeyPair as J, getPublicKey as K, isDerivationMode as L, packAgentForPublish as M, prfSaltBytes as N, publishAgent as O, PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE as P, randomBytes as Q, readPayloadKeyCredential as R, readPayloadKeyMode as S, serializePayloadKeyCredential as T, unpackAgent as U, type WalletKeyDerivationParams as W, DEFAULT_DERIVATION_INFO_PREFIX as a, DEFAULT_DERIVATION_INFO_PREFIX_V2 as b, DEFAULT_DERIVATION_INFO_PREFIX_V3 as c, DEFAULT_DERIVATION_MESSAGE as d, DEFAULT_DERIVATION_SALT as e, DEFAULT_EIP712_DOMAIN as f, DEFAULT_EIP712_MESSAGE_VERSION as g, DEFAULT_EIP712_PRIMARY_TYPE as h, DEFAULT_EIP712_PURPOSE as i, DEFAULT_EIP712_TYPES as j, DEFAULT_PRF_SALT as k, type DeriveKeyPairFromWalletArgs as l, type Eip712DerivationOverrides as m, type Eip712TypeEntry as n, type Eip712TypedData as o, PAYLOAD_KEY_MODE_ATTRIBUTE as p, type PayloadKeyCredential as q, type PublishAgentConfig as r, type PublishAgentResult as s, aesDecrypt as t, aesEncrypt as u, buildPayloadKeyTypedData as v, decryptPayload as w, decryptWithKey as x, defaultInfoPrefixFor as y, deriveKeyPairFromWallet as z };
