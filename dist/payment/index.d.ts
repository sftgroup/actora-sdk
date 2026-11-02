import { Address, Hash, WalletClient } from 'viem';
import { ChainKey as ChainKey$1, ClientOptions } from '@keelcodes/payments';
export { ClientOptions, PaymentsClient, X402Client } from '@keelcodes/payments';
import { f as SubscriptionManager } from '../subscription-D-kKp1BW.js';
import '../types-C6xHfvpn.js';

type SubscriptionPaymentMethod = 'chain' | 'x402';
type SubscriptionPeriod = 'day' | 'week' | 'month' | 'year';
type ChainKey = ChainKey$1;
interface SubscriptionPaymentsConfig {
    /** Actora Gateway base URL (required for fiat / x402 rails). */
    gatewayUrl?: string;
    /** Optional gateway bearer token. */
    accessToken?: string;
    /** Chain rail — required for `method: 'chain'` and for automatic x402 payment. */
    subscriptionManager?: SubscriptionManager;
    /** Wallet used to automatically fund an x402 payment (if txHash is not supplied). */
    walletClient?: WalletClient;
    /** Which chain to verify x402 payments on (default: bsc). */
    chain?: ChainKey;
}
interface PaySubscriptionInput {
    planId: number;
    agentId: number;
    method: SubscriptionPaymentMethod;
    /** Buyer wallet. Required for x402; chain resolves from the wallet client. */
    subscriber?: Address;
    /** Chain rail: native value override (defaults to the plan price). */
    valueWei?: bigint;
    /** Chain rail: approve the ERC20 token before subscribing. */
    approveTokenFirst?: boolean;
    /** x402 rail: already-sent on-chain payment tx. When omitted and a wallet
     *  client is configured, the payment is sent automatically. */
    txHash?: string;
    /** x402 rail: plan price in wei. When set, the automatic x402 payment uses
     *  this amount instead of reading the plan from the chain contract — needed
     *  for centralized agents whose plans live off-chain (central_plans). */
    priceWei?: bigint;
    /** Billing period (default 'month'). */
    period?: SubscriptionPeriod;
}
type PaySubscriptionResult = {
    method: 'chain';
    subscriptionId: number;
    txHash: Hash;
} | {
    method: 'x402';
    subscriptionId: number;
    txHash: string;
    creditedWei?: string;
};
/** x402 protocol discovery returned by the unified endpoint. */
interface X402Info {
    enabled: boolean;
    priceWei: string;
    payTo: string;
    network: string;
    chain: ChainKey;
}
declare class SubscriptionPayments {
    private config;
    private client;
    constructor(config: SubscriptionPaymentsConfig);
    /** Pay for (or renew) a subscription using the chosen rail. */
    pay(input: PaySubscriptionInput): Promise<PaySubscriptionResult>;
    /**
     * Unified access check across all rails (chain OR x402 / publisher fiat) via
     * the unified /api/v1/payments/access endpoint.
     */
    hasAccess(agentId: number, subscriber: Address): Promise<boolean>;
    /**
     * x402 protocol discovery (price / pay-to wallet / network).
     * @param agentId 传入时返回**该 agent 的收款地址**（`agents.payout_address`），
     *   让自动付款直接付给开发者；未配置该地址时网关回 409 PAYOUT_NOT_CONFIGURED。
     */
    fetchX402Info(agentId?: number): Promise<X402Info>;
    private _payChain;
    private _payX402;
    /** Send the on-chain native transfer to the platform wallet (x402 rail). */
    private _autoFundX402;
    private _fetchJson;
}

type TenantPlanPaymentMethod = 'chain' | 'fiat' | 'x402';
interface TenantPlanPaymentsConfig {
    /** Actora Gateway base URL. */
    gatewayUrl: string;
    /** Optional gateway bearer token (B-end wallet JWT). */
    accessToken?: string;
    /** Which chain to verify on-chain payments on (default: bsc). */
    chain?: ChainKey;
}
interface BuyTenantPlanInput {
    /** Platform plan id (plans table UUID). */
    tenantPlanId: string;
    /** Buying wallet address. */
    subscriber: Address;
    method: TenantPlanPaymentMethod;
    /** chain | x402: already-sent on-chain payment tx. */
    txHash?: Hash | string;
    /** fiat: redirect targets after Stripe checkout. */
    successUrl?: string;
    cancelUrl?: string;
}
type BuyTenantPlanResult = {
    method: 'chain' | 'x402';
    tenantId: string;
    planId: string;
    planSlug: string;
    quotaDaily: string;
    txHash: string;
} | {
    method: 'fiat';
    sessionUrl: string;
    sessionId: string;
    redirect: true;
};
declare class TenantPlanPayments {
    private config;
    constructor(config: TenantPlanPaymentsConfig);
    /** Buy a platform subscription tier on the chosen rail. */
    buy(input: BuyTenantPlanInput): Promise<BuyTenantPlanResult>;
    private _fetchJson;
}

/** a2a-pay client: paymentId two-phase (create → pay → settle). */
declare class A2AClient {
    private opts;
    constructor(opts: ClientOptions);
    /** Phase 1: create a payment intent. */
    create(input: {
        payer: string;
        amountWei: string;
        payee?: string;
        chain?: ChainKey$1;
        metadata?: Record<string, unknown>;
    }): Promise<{
        paymentId: string;
        amountWei: string;
        payee: string;
    }>;
    /** Phase 2: verify the payer's on-chain payment tx (receipt only). */
    settle(input: {
        paymentId: string;
        txHash: string;
        chain?: ChainKey$1;
    }): Promise<{
        verified: boolean;
        paymentId: string;
        payer: string;
        creditedWei: string;
    }>;
}

/** Period-authorization client (P4): charge a period / read state. */
declare class PeriodClient {
    private opts;
    constructor(opts: ClientOptions);
    charge(authorizationId: string): Promise<{
        renewed: boolean;
        remainingWei: string;
    }>;
    authorization(authorizationId: string): Promise<{
        id: string;
        owner: string;
        remainingWei: string;
        periods: number;
        status: string;
    }>;
}

type SpendChain = 'bsc' | 'ethereum' | 'base';
/** 业务策略（与网关 services/spend-policy.ts 的 SpendPolicy 同构）。 */
interface SpendPolicy {
    version: 1;
    maxPerTxWei: string;
    periodSeconds: number;
    periodLimitWei: string;
    /** 0 = 不限 */
    maxCalls: number;
    /** 链 → 允许的收款地址；空数组 = 该链不限制 */
    allowedTargets: Record<string, string[]>;
    tokenCaps: Array<{
        chain: SpendChain;
        token: string;
        periodAmountWei: string;
        periodSeconds: number;
    }>;
    /** 命中已有订阅/拥有关系时跳过限额 */
    skipWhenSubscribed: boolean;
    /** > 0 时超过该额度的单笔需人工审批 */
    approvalAboveWei: string;
    /** unix 秒；0 = 不过期 */
    validUntil: number;
}
/** Gator caveat（enforcer 合约地址由 Delegation Framework 地址表解析）。 */
interface GatorCaveat {
    enforcer: string;
    terms: `0x${string}`;
    args: `0x${string}`;
    description: string;
}
interface SpendPolicyDoc {
    chain: SpendChain;
    enabled: boolean;
    policy: SpendPolicy;
    caveats: GatorCaveat[];
}
type SpendDecisionCode = 'ALLOW' | 'POLICY_MISSING' | 'POLICY_DISABLED' | 'POLICY_UNAVAILABLE' | 'POLICY_EXPIRED' | 'SUBSCRIPTION_COVERED' | 'INVALID_CHAIN' | 'INVALID_AMOUNT' | 'TARGET_NOT_ALLOWED' | 'PER_TX_LIMIT' | 'PERIOD_LIMIT' | 'CALL_LIMIT' | 'APPROVAL_REQUIRED' | 'APPROVAL_PENDING' | 'APPROVAL_REJECTED' | 'APPROVED_BY_USER';
interface SpendGateResult {
    allow: boolean;
    decision: 'allow' | 'deny' | 'needs_approval';
    code: SpendDecisionCode;
    reason: string;
    remainingWei: string;
    approvalId?: number;
}
interface SpendApproval {
    id: number;
    subscriber: string;
    chain: string;
    target: string;
    amount_wei: string;
    target_agent_id: number | null;
    ref_id: string | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_at: string;
    decided_at: string | null;
    decided_by: string | null;
    consumed_at: string | null;
}
/** 单链按次 session 授权状态（GET /session）。 */
interface SpendSession {
    chain: string;
    accountAddress: string;
    status: 'pending' | 'enabled' | 'disabled' | string;
    /** unix 秒 */
    validUntil: number;
    sessionSigner: string;
}
/** enable 的返回值：owner 对 `digest` 裸签（eth_sign 语义）后走 confirm。 */
interface EnableSpendSessionResult {
    accountAddress: string;
    accountDeployed: boolean;
    sessionId: string;
    sessionSigner: string;
    digest: string;
    validUntil: string;
    /** 链上已有旧 session 时，网关先自愈撤销（v1 无需用户处理）。 */
    needsSessionRevoke?: boolean;
    disableUserOpHash?: string;
    disableSessionId?: string;
}
interface ConfirmSpendSessionResult {
    userOpHash: string;
    txHash: string | null;
    receiptSuccess: boolean;
}
/** 撤销第一步的产物：owner 对 `digest` 裸签，再原样带回 `revokeSession`。 */
interface SpendSessionRevokeDraft {
    accountAddress: string;
    sessionId: string;
    digest: string;
    validUntil: number;
}
interface SpendSessionRevokeResult {
    revoked: boolean;
    userOpHash: string;
    txHash: string | null;
}
interface SpendPolicyClientConfig {
    gatewayUrl: string;
    /** Tenant API Key（actora_...） */
    apiKey?: string;
    /** 网关 JWT（钱包登录后获取） */
    accessToken?: string;
}
declare class SpendPolicyClient {
    private readonly config;
    private readonly baseUrl;
    constructor(config: SpendPolicyClientConfig);
    private request;
    /** 该钱包全部链的策略。 */
    list(): Promise<Array<{
        chain: string;
        policy: SpendPolicy;
        enabled: boolean;
        validUntil: number;
    }>>;
    /** 单链策略 + 派生的 Gator caveat 组合。 */
    get(chain: SpendChain): Promise<SpendPolicyDoc>;
    /** 写入 / 更新策略（非法字段网关返回 400）。 */
    put(chain: SpendChain, policy: SpendPolicy, enabled?: boolean): Promise<SpendPolicyDoc & {
        enabled: boolean;
    }>;
    /** 停用策略（保留记录，可重新 put 启用）。 */
    disable(chain: SpendChain): Promise<{
        chain: SpendChain;
        enabled: boolean;
    }>;
    /**
     * dry-run 校验一笔支出（不落流水、不代付）。
     * `refId` 建议传任务/订单稳定 ID：超额时会据此进入审批队列并去重。
     */
    check(input: {
        chain: SpendChain;
        target: string;
        amountWei: string;
        refId?: string;
        targetAgentId?: number;
        subscribed?: boolean;
    }): Promise<SpendGateResult>;
    /** 超额审批队列（默认全部，可传 status 过滤）。 */
    approvals(opts?: {
        status?: 'pending' | 'approved' | 'rejected';
        limit?: number;
    }): Promise<SpendApproval[]>;
    /** 人工审批（approve 只能被消费一次；reject 后同一 refId 永久拒绝）。 */
    decide(id: number, decision: 'approve' | 'reject'): Promise<SpendApproval>;
    /** 我的全部链 session 授权状态。 */
    sessions(): Promise<SpendSession[]>;
    /**
     * 第一步：创建 session（必要时顺带部署智能账户）并返回 owner 待签 digest。
     * 用户对 `digest` 裸签后调用 `confirmSession` 上链。
     */
    enableSession(input?: {
        chain?: SpendChain;
        policy?: SpendPolicy;
    }): Promise<EnableSpendSessionResult>;
    /** 第二步：提交 owner 裸签（65 字节 hex）完成授权。 */
    confirmSession(input: {
        chain?: SpendChain;
        ownerSignature: string;
    }): Promise<ConfirmSpendSessionResult>;
    /**
     * 撤销第一步：冻结撤销 op 并返回待签 digest（网关落草稿，避免 nonce/gas 变化导致签名失配）。
     * v0 存量 session 无法在链上定位，网关返回 409，需重新 `enableSession` 迁移到 v1。
     */
    prepareSessionRevoke(input?: {
        chain?: SpendChain;
    }): Promise<SpendSessionRevokeDraft>;
    /** 撤销第二步：带回第一步的 `digest` 的 owner 签名提交上链。 */
    revokeSession(input: {
        chain?: SpendChain;
        ownerSignature: string;
        /** 可选，用于校验与 `prepareSessionRevoke` 返回的 digest 一致。 */
        userOpHash?: string;
    }): Promise<SpendSessionRevokeResult>;
}

/** 对齐的通用支付引擎版本（`@keelcodes/payments`）。 */
declare const PAYMENT_VERSION = "0.3.1";

export { A2AClient, type BuyTenantPlanInput, type BuyTenantPlanResult, type ConfirmSpendSessionResult, type EnableSpendSessionResult, type GatorCaveat, PAYMENT_VERSION, type PaySubscriptionInput, type PaySubscriptionResult, PeriodClient, type SpendApproval, type SpendChain, type SpendDecisionCode, type SpendGateResult, type SpendPolicy, SpendPolicyClient, type SpendPolicyClientConfig, type SpendPolicyDoc, type SpendSession, type SpendSessionRevokeDraft, type SpendSessionRevokeResult, type SubscriptionPaymentMethod, SubscriptionPayments, type SubscriptionPaymentsConfig, type TenantPlanPaymentMethod, TenantPlanPayments, type TenantPlanPaymentsConfig, type X402Info };
