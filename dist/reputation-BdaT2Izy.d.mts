import { Address, PublicClient } from 'viem';

interface ReputationConfig {
    contractAddress: Address;
    publicClient: PublicClient;
}
type ReputationFlavor = 'legacy' | 'standard';
/** 归一化的信誉聚合结果（标准形参）。 */
interface ReputationSummary {
    count: number;
    value: bigint;
    valueDecimals: number;
}
/** 归一化的单条反馈（标准形参）。 */
interface ReputationFeedback {
    value: bigint;
    valueDecimals: number;
    tag1: string;
    tag2: string;
    isRevoked: boolean;
}
declare class ReputationRegistry {
    private address;
    private publicClient;
    /** 实现风格探测结果（缓存）：standard=canonical / legacy=历史实现。 */
    private flavor?;
    constructor(config: ReputationConfig);
    /**
     * 尝试读取 legacy 视图 `getReputationSummary()`：
     *   - 成功 → 判定 `'legacy'`
     *   - 确定 revert → 判定 `'standard'`（canonical 无该视图，只有 `getSummary`）
     * 结果缓存在实例上，因此 legacy 链**不会**因探测产生额外调用。
     */
    private legacyProbe;
    /** 实现风格（缓存）：`'standard'`=官方 canonical / `'legacy'`=历史实现。 */
    getFlavor(): Promise<ReputationFlavor>;
    /**
     * 聚合读取（标准形参）。
     * @dev legacy：转调 `getReputationSummary`（uint8 均分）→ 归一化为 `valueDecimals=0`；
     *      standard：转调标准 `getSummary`。
     *      注意：standard 下 `clients` 为空会 revert（标准要求显式传入客户地址）。
     */
    getSummary(agentId: number, clients?: Address[], tag1?: string, tag2?: string): Promise<ReputationSummary>;
    /** legacy 兼容聚合（uint8 均分）。standard 下由 `getSummary` 归一到 0-100。 */
    getReputationSummary(agentId: number, clients?: Address[], tag1?: string, tag2?: string): Promise<{
        count: number;
        averageScore: number;
    }>;
    /** 单条反馈（标准形参）。 */
    readFeedback(agentId: number, clientAddress: Address, index: number): Promise<ReputationFeedback>;
    /** 给出反馈的客户地址列表（两版同签名）。 */
    getClients(agentId: number): Promise<Address[]>;
    /** 某客户在 agent 上的最后反馈索引（0 表示没有）。 */
    getLastIndex(agentId: number, clientAddress: Address): Promise<number>;
}

export { type ReputationConfig as R, type ReputationFeedback as a, type ReputationFlavor as b, ReputationRegistry as c, type ReputationSummary as d };
