import { Address, PublicClient, WalletClient, Hash } from 'viem';

interface ChainConfig {
    chainId: number;
    contracts: {
        identityRegistry: Address;
        subscriptionManager: Address;
        a2aProtocolRegistry: Address;
        reputationRegistry: Address;
        configurationRegistry: Address;
        multiEndpointRegistry: Address;
    };
    ipfsGateways: string[];
    rpcUrl?: string;
    /** 合约是否已部署（false = 预留条目，contracts 为占位地址，部署后填写并置 true）。 */
    deployed?: boolean;
}
/**
 * 合约地址表（与 gateway/src/config.ts 的默认值保持一致）。
 *
 * ReputationRegistry 自 2026-10-24 起统一指向官方 canonical 部署
 * `0x8004BAa1…9b63`（三链同地址）；legacy 自研注册表仅剩 Sepolia 测试网。
 * `ReputationRegistry` 适配器会按 `getReputationSummary` 是否存在自动识别
 * legacy / standard 两种实现，故地址切换不需要业务侧改代码。
 */
declare const KNOWN_CHAINS: Record<number, ChainConfig>;
interface ConfigRegistryOpts {
    contractAddress: Address;
    publicClient: PublicClient;
    walletClient: WalletClient;
}
declare class ConfigurationRegistry {
    private address;
    private publicClient;
    private walletClient;
    constructor(opts: ConfigRegistryOpts);
    private get account();
    set(key: string, value: string): Promise<Hash>;
    get(key: string): Promise<string>;
    getAll(): Promise<Record<string, string>>;
}

export { type ChainConfig as C, KNOWN_CHAINS as K, type ConfigRegistryOpts as a, ConfigurationRegistry as b };
