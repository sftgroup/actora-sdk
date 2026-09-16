import { A as AgentRunContext } from '../agent-runner-BZ_IxFbK.mjs';
export { O as OnChainReader, R as RunnableSkill, W as WalletSigner } from '../agent-runner-BZ_IxFbK.mjs';
import { C as ChainConfig } from '../config-DOyidIlP.mjs';
import '../types-mZ3W6woU.mjs';
import 'viem';

interface UseAgentRunnerConfig {
    agentId: number;
    chainConfig?: ChainConfig;
    ipfsGateways?: string[];
}
interface UseAgentRunnerResult {
    ctx: AgentRunContext | null;
    isLoading: boolean;
    error: Error | null;
    /** Re-trigger the load (e.g. after connecting wallet or subscribing) */
    refetch: () => void;
}
declare function useAgentRunner(config: UseAgentRunnerConfig): UseAgentRunnerResult;

export { AgentRunContext, type UseAgentRunnerConfig, type UseAgentRunnerResult, useAgentRunner };
