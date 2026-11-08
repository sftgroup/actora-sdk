export { R as ReputationConfig, a as ReputationFeedback, b as ReputationFlavor, c as ReputationRegistry, d as ReputationSummary } from '../reputation-BdaT2Izy.mjs';
import { Hex, WalletClient, Account } from 'viem';

type SettlementChain = 'bsc' | 'ethereum' | 'base' | 'sepolia';
declare const SETTLEMENT_PROOF_DOMAIN_NAME = "ActoraPaymentSettlement";
declare const SETTLEMENT_PROOF_DOMAIN_VERSION = "1";
/** 与合约 / 网关逐字一致的 EIP-712 结构体定义。 */
declare const SETTLEMENT_PROOF_TYPES: {
    readonly SettlementProof: readonly [{
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly name: "payer";
        readonly type: "address";
    }, {
        readonly name: "asset";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }, {
        readonly name: "rail";
        readonly type: "string";
    }, {
        readonly name: "taskRef";
        readonly type: "bytes32";
    }, {
        readonly name: "settlementRef";
        readonly type: "bytes32";
    }, {
        readonly name: "settledAt";
        readonly type: "uint64";
    }];
};
/**
 * 结算 rail 命名空间；用于推导 `settlementRef`。
 * `sessionKey` 为历史 rail：2026-11-08 AA 下线后不再产生新记录，保留用于复核历史回执。
 */
type SettlementRail = 'erc8183' | 'milestone' | 'x402' | 'sessionKey';
/**
 * 同一 job 下所有结算的聚合键（信誉按 taskRef 汇总）。
 * 与网关 `jobs.id` 对应：`taskRef = keccak256(utf8(jobId))`。
 */
declare function deriveTaskRef(jobId: string): Hex;
/**
 * 单笔结算的幂等键（信誉按 settlementRef 去重）。约定：
 *   * `erc8183`   —— `bytes32(uint256(jobId))`，保持 Erc8183Verifier 既有约定；
 *   * `milestone` —— `keccak256(utf8(`${jobId}:${milestoneIndex}`))`；
 *   * `x402`      —— `keccak256(utf8(txHash))`；
 *   * `sessionKey`—— `keccak256(utf8(`${subscriptionId}:${period}`))`。
 */
declare function deriveSettlementRef(rail: SettlementRail, ref: string, milestoneIndex?: number): Hex;
interface SettlementDomain {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: `0x${string}`;
}
interface SettlementDomainResponse {
    chain: SettlementChain;
    chainId: number;
    domain: SettlementDomain;
    types: typeof SETTLEMENT_PROOF_TYPES;
    primaryType: 'SettlementProof';
}
interface SettlementProofMessage {
    agentId: bigint;
    payer: `0x${string}`;
    asset: `0x${string}`;
    amount: bigint;
    rail: string;
    taskRef: Hex;
    settlementRef: Hex;
    settledAt: bigint;
}
interface SubmitSettlementResult {
    reference: string;
    chain: SettlementChain;
    agentId: number;
    payer: string;
    amountWei: string;
    status: string;
    txHash: string | null;
    idempotent: boolean;
}
type SubscriptionSettlementStatus = 'recorded' | 'already_recorded' | 'no_subscription' | 'cancelled' | 'not_configured' | 'writer_not_configured' | 'failed';
interface SubscriptionSettlementResult {
    ok: boolean;
    status: SubscriptionSettlementStatus;
    subscriptionId?: number;
    txHash?: string;
    reason?: string;
}
/**
 * 读取某链的 EIP-712 结算域（GET /api/v1/reputation/settlement-domain/:chain）。
 * 客户端不应硬编码 verifyingContract —— Oracle 可能按链升级。
 */
declare function getSettlementDomain(baseUrl: string, chain: SettlementChain, accessToken?: string): Promise<SettlementDomainResponse>;
/** 付款方对一笔结算记录做 EIP-712 签名（域请先经 getSettlementDomain 获取）。 */
declare function signSettlementProof(params: {
    wallet: WalletClient;
    account?: Account;
    domain: SettlementDomain;
    message: SettlementProofMessage;
}): Promise<Hex>;
interface SubmitSettlementInput {
    chain: SettlementChain;
    agentId: number;
    reference: string;
    payer: string;
    payerSignature: Hex;
    /** 请求有效期（unix 秒），网关侧护栏，不进合约结构体。 */
    deadline: number;
    amountWei?: string;
    metadata?: Record<string, unknown>;
}
/** 提交 EOA 签名的结算（POST /api/v1/reputation/submit-settlement）。 */
declare function submitSettlement(baseUrl: string, input: SubmitSettlementInput, accessToken?: string): Promise<SubmitSettlementResult>;
interface SubmitSubscriptionSettlementInput {
    chain: SettlementChain;
    agentId: number;
    /** 订阅的链上付款方；AA 自动续订场景为智能账户地址。 */
    subscriber: string;
}
/**
 * 提交链上订阅结算（POST /api/v1/reputation/submit-subscription-settlement）。
 * 免签名：证据为 SubscriptionManager 的公开订阅状态。
 */
declare function submitSubscriptionSettlement(baseUrl: string, input: SubmitSubscriptionSettlementInput, accessToken?: string): Promise<SubscriptionSettlementResult>;

declare const REPUTATION_VERSION = "0.2.0";

export { REPUTATION_VERSION, SETTLEMENT_PROOF_DOMAIN_NAME, SETTLEMENT_PROOF_DOMAIN_VERSION, SETTLEMENT_PROOF_TYPES, type SettlementChain, type SettlementDomain, type SettlementDomainResponse, type SettlementProofMessage, type SettlementRail, type SubmitSettlementInput, type SubmitSettlementResult, type SubmitSubscriptionSettlementInput, type SubscriptionSettlementResult, type SubscriptionSettlementStatus, deriveSettlementRef, deriveTaskRef, getSettlementDomain, signSettlementProof, submitSettlement, submitSubscriptionSettlement };
