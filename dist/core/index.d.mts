export { d as A2AAgentCard, e as A2ASkillExecution, f as A2ATask, g as A2ATaskStatus, h as AGENT_CATEGORIES, i as ActoraConfig, j as ActoraContracts, k as ActoraError, l as ActoraErrorCode, m as AgentCategory, A as AgentPayload, n as AgentPricing, a as AgentPrivatePayload, o as AgentPublicPayload, c as AgentReputation, b as AgentReview, p as AgentSearchQuery, q as AgentSearchResult, r as AgentSubscription, E as EncryptedPayload, J as JSONSchema, s as JSONSchemaProperty, M as McpConnection, t as McpTransport, O as OnChainAgentMetadata, P as PackResult, u as PricingType, R as RegisteredAgent, S as SkillDef, v as SkillExecutionMode, w as SkillExecutionRemote, x as SubscriptionRequired, y as SubscriptionStatus, U as UnpackResult } from '../types-CX4o7N9P.mjs';
export { a as DEFAULT_DERIVATION_INFO_PREFIX, b as DEFAULT_DERIVATION_INFO_PREFIX_V2, c as DEFAULT_DERIVATION_INFO_PREFIX_V3, d as DEFAULT_DERIVATION_MESSAGE, e as DEFAULT_DERIVATION_SALT, f as DEFAULT_EIP712_DOMAIN, g as DEFAULT_EIP712_MESSAGE_VERSION, h as DEFAULT_EIP712_PRIMARY_TYPE, i as DEFAULT_EIP712_PURPOSE, j as DEFAULT_EIP712_TYPES, k as DEFAULT_PRF_SALT, D as DerivationMode, l as DeriveKeyPairFromWalletArgs, m as Eip712DerivationOverrides, n as Eip712TypeEntry, o as Eip712TypedData, E as Eip712Types, P as PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE, p as PAYLOAD_KEY_MODE_ATTRIBUTE, q as PayloadKeyCredential, r as PublishAgentConfig, s as PublishAgentResult, W as WalletKeyDerivationParams, t as aesDecrypt, u as aesEncrypt, v as buildPayloadKeyTypedData, w as decryptPayload, x as decryptWithKey, y as defaultInfoPrefixFor, z as deriveKeyPairFromWallet, A as derivePrivateKeyFromIkm, B as derivePrivateKeyFromSignature, C as eciesDecrypt, F as eciesEncrypt, G as encryptPayload, H as encryptWithKey, I as generateAesKey, J as generateKeyPair, K as getPublicKey, L as isDerivationMode, M as packAgentForPublish, N as prfSaltBytes, O as publishAgent, Q as randomBytes, R as readPayloadKeyCredential, S as readPayloadKeyMode, T as serializePayloadKeyCredential, U as unpackAgent } from '../crypto-DD1vVh_c.mjs';
export { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import '../ipfs/index.mjs';

type PrfErrorCode = 
/** Browser/authenticator does not implement the PRF extension. */
'PRF_UNSUPPORTED'
/** The credential is not available here (other device / other provider). */
 | 'PRF_CREDENTIAL_NOT_FOUND'
/** User dismissed the prompt, or it timed out. */
 | 'PRF_CANCELLED'
/** Anything else (RP ID mismatch, authenticator failure, …). */
 | 'PRF_FAILED';
/** Typed error so callers can branch without string matching. */
declare class PrfError extends Error {
    readonly code: PrfErrorCode;
    constructor(code: PrfErrorCode, message: string, options?: {
        cause?: unknown;
    });
}
interface PrfCapability {
    /** WebAuthn usable at all (secure context + API present). */
    webAuthn: boolean;
    /** Platform authenticator present (Touch ID / Windows Hello / Android). */
    userVerifyingPlatformAuthenticator: boolean | 'unknown';
    /** PRF support: only `true`/`false` when the browser can answer without a prompt. */
    prf: boolean | 'unknown';
    /** Where `prf` came from. */
    source: 'client-capabilities' | 'unavailable';
}
/**
 * Best-effort PRF capability probe that never prompts.
 *
 * `prf: 'unknown'` is a real answer: without
 * `PublicKeyCredential.getClientCapabilities()` (Chrome 133+) support can only be
 * determined by attempting a ceremony. Treat `'unknown'` as "may work" — v3
 * still fails loudly if it does not.
 */
declare function getPrfCapability(): Promise<PrfCapability>;
interface CreatePrfCredentialOptions {
    /** RP ID; defaults to `location.hostname`. Must be the domain you will keep serving from. */
    rpId?: string;
    rpName?: string;
    userName?: string;
    displayName?: string;
    /** PRF evaluation salt; defaults to the frozen `DEFAULT_PRF_SALT`. */
    salt?: string;
}
interface PrfCredential {
    /** Base64url credential ID — persist this (see `PayloadKeyCredential`). */
    credentialId: string;
    /** `prf.enabled` reported by the authenticator at registration. */
    prfEnabled: boolean;
    /** Present when the authenticator returned the PRF result during registration. */
    prfOutputHex: string | null;
    rpId: string;
    salt: string;
}
/**
 * Register a discoverable (resident) passkey with the PRF extension enabled.
 *
 * `residentKey: 'required'` + `userVerification: 'required'` so the credential
 * can be found again (and synced) without a user-name hint, which is what makes
 * decryption later possible without extra app state.
 */
declare function createPrfCredential(options?: CreatePrfCredentialOptions): Promise<PrfCredential>;
interface EvaluatePrfOptions {
    /** Base64url credential ID from `createPrfCredential` (or the on-chain binding). */
    credentialId: string;
    /** RP ID; defaults to `location.hostname`. Must match the credential's. */
    rpId?: string;
    /** PRF evaluation salt; defaults to the frozen `DEFAULT_PRF_SALT`. */
    salt?: string;
    /** Omit `allowCredentials` and let the browser pick a discoverable credential. */
    allowDiscoverable?: boolean;
}
/**
 * Evaluate the PRF for an existing credential and return its 32-byte output as
 * hex. This is the v3 IKM — stable for the same (credential, salt), and
 * impossible to obtain from another origin.
 */
declare function evaluatePrf(options: EvaluatePrfOptions): Promise<{
    prfOutputHex: string;
    rpId: string;
    salt: string;
}>;

export { type CreatePrfCredentialOptions, type EvaluatePrfOptions, type PrfCapability, type PrfCredential, PrfError, type PrfErrorCode, createPrfCredential, evaluatePrf, getPrfCapability };
