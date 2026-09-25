import { A as AgentRunContext } from '../agent-runner-B_lCqbQw.mjs';
export { O as OnChainReader, R as RunnableSkill, W as WalletSigner } from '../agent-runner-B_lCqbQw.mjs';
import { C as ChainConfig } from '../config-DOyidIlP.mjs';
import { WalletKeyDerivationParams, DerivationMode, Eip712Types } from '../core/index.mjs';
import '../types-D4CaANmj.mjs';
import 'viem';
import '../ipfs/index.mjs';
import '@noble/ciphers/utils.js';

/**
 * OPT-IN browser-wallet decryption. EIP-1193 wallets cannot export the account
 * private key, so the payload key is derived from a deterministic signature
 * instead: `personal_sign` text (v1) or EIP-712 typed data (v2), both fed into
 * the same HKDF-SHA256 construction.
 *
 * The derived key never leaves the browser and the account key is untouched.
 * Once agents are published with a set of values, that whole set is frozen:
 *
 *   v1 `personal-sign-hkdf` : `message` / `salt` / `infoPrefix`
 *   v2 `eip712-hkdf`        : `domain` / `types` / `primaryType` / `infoPrefix`
 *                             (the typed-data message is derived from the
 *                              address, never from user input)
 *
 * Changing any of them makes existing payloads undecryptable. v1 and v2
 * coexist — old payloads stay decryptable with `mode: 'personal-sign-hkdf'`.
 */
interface WalletKeyDerivationConfig extends WalletKeyDerivationParams {
    /**
     * `'personal-sign-hkdf'` (v1): signs a frozen text message — wallets render
     * it as a blind-sign prompt.
     * `'eip712-hkdf'` (v2): signs EIP-712 typed data — the wallet shows a
     * structured, domain-scoped prompt.
     */
    mode: DerivationMode;
    /** v2 only: override the EIP-712 domain (defaults to `DEFAULT_EIP712_DOMAIN`). */
    domain?: Record<string, unknown>;
    /** v2 only: override the EIP-712 types (defaults to `DEFAULT_EIP712_TYPES`). */
    types?: Eip712Types;
    /** v2 only: override the EIP-712 primary type (defaults to `PayloadKey`). */
    primaryType?: string;
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
