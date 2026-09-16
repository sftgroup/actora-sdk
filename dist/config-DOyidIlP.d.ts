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
