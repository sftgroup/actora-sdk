import { A as AgentRunContext } from '../agent-runner-Bb6j8FNy.mjs';
export { O as OnChainReader, R as RunnableSkill, W as WalletSigner } from '../agent-runner-Bb6j8FNy.mjs';
import { C as ChainConfig } from '../config-DTv6imOF.mjs';
import { W as WalletKeyDerivationParams, D as DerivationMode, E as Eip712Types } from '../crypto-CJLKU40y.mjs';
import '../types-C6xHfvpn.mjs';
import 'viem';
import '../ipfs/index.mjs';

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
interface WalletKeyDerivationConfig extends WalletKeyDerivationParams {
    /**
     * `'personal-sign-hkdf'` (v1): signs a frozen text message — wallets render it
     * as a blind-sign prompt.
     * `'eip712-hkdf'` (v2): signs EIP-712 typed data — structured, domain-scoped.
     * `'webauthn-prf-hkdf'` (v3): no signature; passkey PRF output bound to the
     * site's domain.
     */
    mode: DerivationMode;
    /** v2 only: override the EIP-712 domain (defaults to `DEFAULT_EIP712_DOMAIN`). */
    domain?: Record<string, unknown>;
    /** v2 only: override the EIP-712 types (defaults to `DEFAULT_EIP712_TYPES`). */
    types?: Eip712Types;
    /** v2 only: override the EIP-712 primary type (defaults to `PayloadKey`). */
    primaryType?: string;
    /** v3 only: base64url credential ID (from `createPrfCredential()` or the chain). */
    credentialId?: string;
    /** v3 only: WebAuthn RP ID; defaults to `location.hostname`. */
    rpId?: string;
    /** v3 only: PRF evaluation salt; defaults to the frozen `DEFAULT_PRF_SALT`. */
    prfSalt?: string;
}
interface UseAgentRunnerConfig {
    agentId: number;
    chainConfig?: ChainConfig;
    ipfsGateways?: string[];
    /**
     * Enable payload decryption with an injected browser wallet. Without this,
     * `useAgentRunner` can only work with wallets that export a private key.
     */
    encryptionKeyDerivation?: WalletKeyDerivationConfig;
}
interface UseAgentRunnerResult {
    ctx: AgentRunContext | null;
    isLoading: boolean;
    error: Error | null;
    /** Re-trigger the load (e.g. after connecting wallet or subscribing) */
    refetch: () => void;
}
declare function useAgentRunner(config: UseAgentRunnerConfig): UseAgentRunnerResult;

export { AgentRunContext, type UseAgentRunnerConfig, type UseAgentRunnerResult, type WalletKeyDerivationConfig, useAgentRunner };
