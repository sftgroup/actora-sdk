import { A as AgentRunContext } from '../agent-runner-B_lCqbQw.mjs';
export { O as OnChainReader, R as RunnableSkill, W as WalletSigner } from '../agent-runner-B_lCqbQw.mjs';
import { C as ChainConfig } from '../config-DOyidIlP.mjs';
import { WalletKeyDerivationParams } from '../core/index.mjs';
import '../types-D4CaANmj.mjs';
import 'viem';
import '../ipfs/index.mjs';
import '@noble/ciphers/utils.js';

/**
 * OPT-IN browser-wallet decryption. EIP-1193 wallets cannot export the account
 * private key, so the payload key is derived from a deterministic
 * `personal_sign` signature instead (personal_sign + HKDF-SHA256).
 *
 * The derived key never leaves the browser and the account key is untouched.
 * `message` / `salt` / `infoPrefix` must stay byte-frozen once agents are
 * published with them — changing any of them makes existing payloads
 * undecryptable.
 */
interface WalletKeyDerivationConfig extends WalletKeyDerivationParams {
    mode: 'personal-sign-hkdf';
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
