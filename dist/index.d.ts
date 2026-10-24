import { M as McpConnection } from './types-ATMM4oRG.js';
export { b as A2AAgentCard, c as A2ASkillExecution, d as A2ATask, e as A2ATaskStatus, f as AGENT_CATEGORIES, g as ActoraConfig, h as ActoraContracts, i as ActoraError, j as ActoraErrorCode, k as AgentCategory, A as AgentPayload, l as AgentPricing, a as AgentPrivatePayload, m as AgentPublicPayload, n as AgentReputation, o as AgentReview, p as AgentSearchQuery, q as AgentSearchResult, r as AgentSubscription, E as EncryptedPayload, J as JSONSchema, s as JSONSchemaProperty, t as McpTransport, O as OnChainAgentMetadata, P as PackResult, u as PricingType, R as RegisteredAgent, S as SkillDef, v as SkillExecutionMode, w as SkillExecutionRemote, x as SubscriptionRequired, y as SubscriptionStatus, U as UnpackResult } from './types-ATMM4oRG.js';
export { a as DEFAULT_DERIVATION_INFO_PREFIX, b as DEFAULT_DERIVATION_INFO_PREFIX_V2, c as DEFAULT_DERIVATION_INFO_PREFIX_V3, d as DEFAULT_DERIVATION_MESSAGE, e as DEFAULT_DERIVATION_SALT, f as DEFAULT_EIP712_DOMAIN, g as DEFAULT_EIP712_MESSAGE_VERSION, h as DEFAULT_EIP712_PRIMARY_TYPE, i as DEFAULT_EIP712_PURPOSE, j as DEFAULT_EIP712_TYPES, k as DEFAULT_PRF_SALT, D as DerivationMode, l as DeriveKeyPairFromWalletArgs, m as Eip712DerivationOverrides, n as Eip712TypeEntry, o as Eip712TypedData, E as Eip712Types, P as PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE, p as PAYLOAD_KEY_MODE_ATTRIBUTE, q as PayloadKeyCredential, r as PublishAgentConfig, s as PublishAgentResult, W as WalletKeyDerivationParams, t as aesDecrypt, u as aesEncrypt, v as buildPayloadKeyTypedData, w as decryptPayload, x as decryptWithKey, y as defaultInfoPrefixFor, z as deriveKeyPairFromWallet, A as derivePrivateKeyFromIkm, B as derivePrivateKeyFromSignature, C as eciesDecrypt, F as eciesEncrypt, G as encryptPayload, H as encryptWithKey, I as generateAesKey, J as generateKeyPair, K as getPublicKey, L as isDerivationMode, M as packAgentForPublish, N as prfSaltBytes, O as publishAgent, Q as randomBytes, R as readPayloadKeyCredential, S as readPayloadKeyMode, T as serializePayloadKeyCredential, U as unpackAgent } from './crypto-Din2ikPh.js';
export { CreatePrfCredentialOptions, EvaluatePrfOptions, PrfCapability, PrfCredential, PrfError, PrfErrorCode, createPrfCredential, evaluatePrf, getPrfCapability } from './core/index.js';
import { Hash, Address, PublicClient, WalletClient } from 'viem';
export { a as A2ASkillResult, A as AgentRunContext, b as AgentRunner, c as AgentRunnerConfig, I as IPFSFetcher, d as IPFSFetcherConfig, O as OnChainReader, R as RunnableSkill, W as WalletSigner, e as defaultIPFSFetcher } from './agent-runner-rDuplD1X.js';
import { S as SubscriptionManager } from './index-So55LIh7.js';
export { A as A2AConfig, a as A2ADaemon, b as A2ADaemonConfig, c as A2AProtocol, d as A2ATaskResult, e as AgentLoop, f as AgentRegistry, g as AgentRegistryConfig, h as AgentSummary, i as AgentSummaryMetadata, C as ContextCompactor, j as CreatePlanParams, k as CreatePlanResult, F as FactExtractor, G as GetAllAgentsOptions, L as LoopTraceEmitter, M as MetadataAttribute, P as PlanDetail, l as PlanType, m as PlatformToolContext, n as PlatformToolDef, R as ReputationConfig, o as ReputationFeedback, p as ReputationFlavor, q as ReputationRegistry, r as ReputationSummary, s as STANDARD_IDENTITY_ABI, t as SUBSCRIPTION_PERIODS, u as StructuredAgentMetadata, v as SubscribeResult, w as SubscriptionConfig, x as SubscriptionDetail, y as SubscriptionPeriod, T as ToolExecutor, Z as ZERO_ADDRESS, z as buildPlatformTools, B as buildSystemPrompt, D as buildTools, E as cidFromURI, H as executePlatformTool, I as getAllPlatformToolNames, J as guardSubscription, K as parseTokenURIJSON, N as toAttributes, O as wrapPlatformToolsAsSkills } from './index-So55LIh7.js';
export { A as AgentLoopConfig, a as AgentLoopResult, C as ChatRequest, b as ChatStreamEvent, L as LLMMessage, c as LLMProvider, d as LLMToolCall, e as LoopRunContext, O as OpenAIToolDef, T as ToolCallRecord, f as ToolCallResult, g as ToolCallStart } from './types-Cv-LIswG.js';
export { GatewayProvider, GatewayProviderConfig, OpenAIProvider, OpenAIProviderConfig, ProviderFactoryConfig, createLLMProvider } from './llm/index.js';
export { EndpointRecord, MultiEndpointClient, MultiEndpointConfig } from './endpoint/index.js';
export { ConfigEntry, ConfigurationClient, ConfigurationConfig } from './configuration/index.js';
export { IPFSUploadResult, IPFSUploader, IPFSUploaderConfig, defaultIPFSUploader } from './ipfs/index.js';
export { MemoryConfig, MemoryFact, MemoryProvider } from './memory/index.js';
export { HttpTraceEmitter, NoopTraceEmitter, TraceConfig, TraceEmitter, TraceEvent } from './traces/index.js';
export { BrowserAction, BrowserActionResult, executeBrowserAction, extractAccessibleDOM, sleep } from './skills/index.js';
export { A2ADelegatedTaskResult, A2A_STATUS, ConversationChatParams, ConversationChatResult, ConversationClient, ConversationClientConfig, ConversationCreateSessionParams, ConversationCreateTaskParams, ConversationSSEEvent, ConversationSkillDef, ConversationTask, ConversationTaskError, ConversationTaskStatus, OnChainApprovalRequest, SessionKeyInfo } from './conversation/index.js';
import { ChainKey as ChainKey$1, ClientOptions } from '@0xinfrax/payments';
export { ClientOptions, PaymentsClient, X402Client } from '@0xinfrax/payments';
export { C as ChainConfig, a as ConfigRegistryOpts, b as ConfigurationRegistry, K as KNOWN_CHAINS } from './config-DOyidIlP.js';
export { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import 'events';

type ActoraEventType = 'Transfer' | 'AgentRegistered' | 'Registered' | 'PlanCreated' | 'SubscriptionCreated';
interface ActoraChainEvent {
    type: ActoraEventType;
    args: Record<string, unknown>;
    txHash: Hash;
}
interface EventListenerOptions {
    /** IdentityRegistry address (emits Transfer / AgentRegistered). */
    identityRegistryAddress?: Address;
    /** SubscriptionManager address (emits PlanCreated / Subscribed). */
    subscriptionManagerAddress?: Address;
    events: ActoraEventType[];
    onEvent: (event: ActoraChainEvent) => void;
    /** Start listening from this block (default: latest). */
    fromBlock?: number;
    /** Polling interval in ms (default: 4000). */
    pollingInterval?: number;
}
/**
 * Subscribe to Actora contract events and receive a normalized callback.
 *
 * @returns A function that unsubscribes from all watched events.
 */
declare function subscribeToEvents(publicClient: PublicClient, options: EventListenerOptions): Promise<() => void>;

declare const REGISTRY_VERSION = "0.1.0";

interface Actora402Config {
    subscriptionManagerAddress: Address;
    publicClient: PublicClient;
    walletClient: WalletClient;
}
declare class Actora402 {
    private config;
    constructor(config: Actora402Config);
    /**
     * Require active subscription — or throw with auto-pay info.
     *
     * Usage:
     *   await x402.requireSubscription(agentId, address, { planIds: [1,2,3] })
     *
     * On success, returns silently.
     * On failure, throws ActoraError with paymentInfo populated
     * so the caller can auto-pay via wallet/X402.
     */
    requireSubscription(agentId: number, address: Address, opts?: {
        planIds?: number[];
    }): Promise<void>;
    /**
     * Subscribe to a plan + wait for receipt.
     * Returns subscriptionId from the Subscribed event.
     *
     * NOTE: For ERC20 plans, the caller must approve token spending
     * BEFORE calling this method. Use X402 SDK or wagmi's useWriteContract
     * for the approve step.
     */
    subscribeAndWait(planId: number, price: bigint, payToken: Address): Promise<number>;
}

declare const SUBSCRIPTION_VERSION = "0.3.0";

type SubscriptionPaymentMethod = 'chain' | 'fiat' | 'x402';
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
    /** Buyer wallet. Required for fiat / x402; chain resolves from the wallet client. */
    subscriber?: Address;
    /** Chain rail: native value override (defaults to the plan price). */
    valueWei?: bigint;
    /** Chain rail: approve the ERC20 token before subscribing. */
    approveTokenFirst?: boolean;
    /** Fiat rail: amount in minor units (cents). Optional — the Gateway
     *  auto-prices from the on-chain plan when planId is sent without it. */
    amountCents?: number;
    /** Fiat rail: currency code (default 'usd'). */
    currency?: string;
    /** Fiat rail: redirect targets after Stripe checkout. */
    successUrl?: string;
    cancelUrl?: string;
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
    method: 'fiat';
    sessionUrl: string;
    sessionId: string;
    redirect: true;
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
     * Unified access check across all rails (chain OR fiat/x402) via the
     * unified /api/v1/payments/access endpoint.
     */
    hasAccess(agentId: number, subscriber: Address): Promise<boolean>;
    /** x402 protocol discovery (price / pay-to wallet / network). */
    fetchX402Info(): Promise<X402Info>;
    private _payChain;
    private _payFiat;
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

declare const PAYMENT_VERSION = "0.3.0";

declare const A2A_VERSION = "0.1.0";

interface MCPTool {
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
}
interface MCPCallResult {
    content: {
        type: string;
        text?: string;
        data?: string;
    }[];
    isError?: boolean;
}
interface MCPConnectorConfig {
    /** MCP server base URL */
    url: string;
    /** Transport type */
    transport?: 'http' | 'sse';
    /** Auth header value (e.g. "Bearer xxx") */
    authHeader?: string;
    /** Request timeout in ms (default: 30_000) */
    timeoutMs?: number;
    /** Optional: subscriber address for subscription-gated MCP servers */
    subscriberAddress?: string;
    /** Optional: wallet signature for authentication */
    signature?: string;
    timestamp?: number;
}
declare class MCPConnector {
    private config;
    constructor(config: MCPConnectorConfig);
    /** Create from an Agent's McpConnection. */
    static fromAgent(mcp: McpConnection, opts?: Partial<MCPConnectorConfig>): MCPConnector;
    /** List available tools from the MCP server. */
    listTools(): Promise<MCPTool[]>;
    /** Call a tool on the MCP server. */
    callTool(name: string, args?: Record<string, unknown>): Promise<MCPCallResult>;
    listResources(): Promise<unknown[]>;
    readResource(uri: string): Promise<unknown>;
    private _request;
}

declare const MCP_VERSION = "0.1.0";

declare const REPUTATION_VERSION = "0.1.0";

declare const CONFIG_VERSION = "0.1.0";

/** 中心化 Agent 的订阅计划（与链上 subscriptionPlans 同一响应结构，订阅流程无感）。 */
interface CentralPlan {
    planId: number;
    /** wei，十进制字符串（避免 JS 精度丢失）。 */
    price: string;
    /** 订阅周期：day | week | month | year。 */
    period: string;
    payToken: 'native';
    isActive: boolean;
    trialDays: number;
    creator: string;
}
/** 中心化 Agent 摘要（列表 / 详情响应）。 */
interface CentralAgentSummary {
    id: number;
    owner: string;
    name: string;
    description: string;
    tags: string[];
    capabilities: string[];
    skills: string[];
    category: string;
    isActive: boolean;
    source: 'central';
    agentCreatedAt?: string;
    syncedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    subscriptionPlans?: CentralPlan[];
}
/** 钱包的链下订阅记录（fiat_subscriptions，provider='x402'）。 */
interface CentralSubscription {
    id: number;
    agentId: number;
    planId: number | null;
    provider: string;
    providerSubId: string | null;
    status: string;
    currency: string | null;
    amountCents: number | null;
    period: string | null;
    startsAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}
interface CentralAgentClientOptions {
    /** Actora Gateway 基础 URL，例如 https://actora.codes。 */
    baseUrl: string;
    /** 可选：注册用户 JWT（Authorization: Bearer）——发布/管理中心化 Agent 时使用。 */
    accessToken?: string;
    /** 可选：租户 API Key（X-Api-Key）——发布/管理中心化 Agent 时使用（owner=partner-<slug>）。 */
    apiKey?: string;
}
interface CentralAgentListFilters {
    activeOnly?: boolean;
    category?: string;
    page?: number;
    pageSize?: number;
}
/** 发布中心化 Agent 的输入（POST /api/v1/agents/central）。 */
interface CreateCentralAgentInput {
    name: string;
    description?: string;
    tags?: string[];
    capabilities?: string[];
    skills?: string[];
    category?: string;
}
/** 更新中心化 Agent 的输入（PATCH 语义：仅更新提供的字段）。 */
type UpdateCentralAgentInput = Partial<CreateCentralAgentInput> & {
    isActive?: boolean;
};
/** 添加中心化订阅计划（POST /api/v1/agents/central/:id/plans）。 */
interface CreateCentralPlanInput {
    /** wei 十进制字符串（正数）。 */
    priceWei: string;
    /** 周期：day | week | month | year（默认 month）。 */
    period?: string;
}
/** 网关返回的计划行（central_plans）。 */
interface CentralPlanRow {
    id: number;
    agentId: number;
    priceWei: string;
    period: string;
    active: boolean;
}
/** 中心化 Agent 客户端：公开只读（查询/订阅状态/我的订阅）+ 鉴权管理（发布/更新/下架/计划）。 */
declare class CentralAgentClient {
    private opts;
    constructor(opts: CentralAgentClientOptions);
    private get base();
    /** 鉴权头：X-Api-Key（租户 Key）；JWT 由 request 助手按 accessToken 追加 Bearer。 */
    private authHeaders;
    /**
     * 查询中心化 Agent 列表（公开）。固定 source='central'，
     * 与链上 Agent 天然隔离；page/pageSize 分页（网关默认 pageSize=50，上限 100）。
     */
    list(filters?: CentralAgentListFilters): Promise<{
        agents: CentralAgentSummary[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    /**
     * 查询单个中心化 Agent 详情（公开），含订阅计划（subscriptionPlans，
     * 与链上同一结构，可直接喂给 SubscriptionPayments.pay({ planId, priceWei, period })）。
     */
    get(agentId: number): Promise<CentralAgentSummary>;
    /**
     * 订阅状态检查（公开）：resolveAccess 链下优先——中心化 Agent（负 ID）无链上
     * 代币，访问记录在 fiat_subscriptions（x402 通道），由网关判定是否放行。
     */
    checkSubscription(subscriber: string, agentId: number): Promise<{
        chain: string;
        subscriber: string;
        agentId: number;
        active: boolean;
    }>;
    /** 我的中心化订阅列表（公开，按钱包地址查询链下 fiat_subscriptions）。 */
    mySubscriptions(subscriber: string): Promise<{
        subscriptions: CentralSubscription[];
    }>;
    /**
     * 发布中心化 Agent（POST /api/v1/agents/central）。owner = 鉴权主体：
     * JWT → 注册用户钱包；租户 Key → partner-<slug>（平台自身名下，适合「平台为市场建 Agent」）。
     * 默认附带一个月度计划（作者可在管理页调整/停用）。
     */
    create(input: CreateCentralAgentInput): Promise<{
        agent: CentralAgentSummary;
    }>;
    /** 我的中心化 Agent 列表（GET /api/v1/agents/central/mine，含订阅计划）。 */
    listMine(): Promise<{
        agents: CentralAgentSummary[];
    }>;
    /** 更新中心化 Agent（PATCH 语义：仅更新提供的字段）。 */
    update(agentId: number, input: UpdateCentralAgentInput): Promise<{
        agent: CentralAgentSummary;
    }>;
    /** 下架中心化 Agent（软删除 is_active=false，订阅访问随之失效）。 */
    deactivate(agentId: number): Promise<{
        success: boolean;
    }>;
    /** 上架中心化 Agent（重新启用）。 */
    activate(agentId: number): Promise<{
        agent: CentralAgentSummary;
    }>;
    /** 添加订阅计划（priceWei 为 wei 十进制字符串）。 */
    createPlan(agentId: number, input: CreateCentralPlanInput): Promise<{
        plan: CentralPlanRow;
    }>;
    /** 停用订阅计划（订阅访问随之失效）。 */
    deactivatePlan(agentId: number, planId: number): Promise<{
        success: boolean;
    }>;
}

/** 证明包（与网关 services/execution-proof.ts 的 ExecutionProofBundle 对齐）。 */
interface ExecutionProofBundle {
    tag: 'signed-manifest-v1';
    requestHash: string;
    manifestHash: string;
    manifest: Record<string, unknown>;
    signature: string;
    signer: string;
}
type ExecutionProofVerifyReason = 'bad-tag' | 'bad-manifest' | 'request-hash-mismatch' | 'manifest-hash-mismatch' | 'expired' | 'bad-signature' | 'signer-mismatch';
interface ExecutionProofVerifyResult {
    valid: boolean;
    signer: string | null;
    manifestHash: string | null;
    reason?: ExecutionProofVerifyReason;
}
/** 校验执行证明（POST /api/v1/proofs/verify）。 */
declare function verifyExecutionProof(baseUrl: string, proof: ExecutionProofBundle, accessToken?: string): Promise<ExecutionProofVerifyResult>;

export { A2AClient, A2A_VERSION, Actora402, type Actora402Config, type ActoraChainEvent, type ActoraEventType, type BuyTenantPlanInput, type BuyTenantPlanResult, CONFIG_VERSION, CentralAgentClient, type CentralAgentClientOptions, type CentralAgentListFilters, type CentralAgentSummary, type CentralPlan, type CentralPlanRow, type CentralSubscription, type ConfirmSpendSessionResult, type CreateCentralAgentInput, type CreateCentralPlanInput, type EnableSpendSessionResult, type EventListenerOptions, type ExecutionProofBundle, type ExecutionProofVerifyReason, type ExecutionProofVerifyResult, type GatorCaveat, type MCPCallResult, MCPConnector, type MCPConnectorConfig, type MCPTool, MCP_VERSION, McpConnection, PAYMENT_VERSION, type PaySubscriptionInput, type PaySubscriptionResult, PeriodClient, REGISTRY_VERSION, REPUTATION_VERSION, SUBSCRIPTION_VERSION, type SpendApproval, type SpendChain, type SpendDecisionCode, type SpendGateResult, type SpendPolicy, SpendPolicyClient, type SpendPolicyClientConfig, type SpendPolicyDoc, type SpendSession, type SpendSessionRevokeDraft, type SpendSessionRevokeResult, SubscriptionManager, type SubscriptionPaymentMethod, SubscriptionPayments, type SubscriptionPaymentsConfig, type TenantPlanPaymentMethod, TenantPlanPayments, type TenantPlanPaymentsConfig, type UpdateCentralAgentInput, type X402Info, subscribeToEvents, verifyExecutionProof };
