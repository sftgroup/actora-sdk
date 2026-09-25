import { M as McpConnection, b as AgentReview, c as AgentReputation } from './types-D4CaANmj.js';
export { d as A2AAgentCard, e as A2ASkillExecution, f as A2ATask, g as A2ATaskStatus, h as AGENT_CATEGORIES, i as ActoraConfig, j as ActoraContracts, k as ActoraError, l as ActoraErrorCode, m as AgentCategory, a as AgentPayload, n as AgentPricing, A as AgentPrivatePayload, o as AgentPublicPayload, p as AgentSearchQuery, q as AgentSearchResult, r as AgentSubscription, E as EncryptedPayload, J as JSONSchema, s as JSONSchemaProperty, t as McpTransport, O as OnChainAgentMetadata, P as PackResult, u as PricingType, R as RegisteredAgent, S as SkillDef, v as SkillExecutionMode, w as SkillExecutionRemote, x as SubscriptionRequired, y as SubscriptionStatus, U as UnpackResult } from './types-D4CaANmj.js';
export { DEFAULT_DERIVATION_INFO_PREFIX, DEFAULT_DERIVATION_INFO_PREFIX_V2, DEFAULT_DERIVATION_MESSAGE, DEFAULT_DERIVATION_SALT, DEFAULT_EIP712_DOMAIN, DEFAULT_EIP712_MESSAGE_VERSION, DEFAULT_EIP712_PRIMARY_TYPE, DEFAULT_EIP712_PURPOSE, DEFAULT_EIP712_TYPES, DerivationMode, DeriveKeyPairFromWalletArgs, Eip712DerivationOverrides, Eip712TypeEntry, Eip712TypedData, Eip712Types, PAYLOAD_KEY_MODE_ATTRIBUTE, PublishAgentConfig, PublishAgentResult, WalletKeyDerivationParams, aesDecrypt, aesEncrypt, buildPayloadKeyTypedData, decryptPayload, decryptWithKey, defaultInfoPrefixFor, deriveKeyPairFromWallet, derivePrivateKeyFromSignature, eciesDecrypt, eciesEncrypt, encryptPayload, encryptWithKey, generateAesKey, generateKeyPair, getPublicKey, isDerivationMode, packAgentForPublish, publishAgent, randomBytes, readPayloadKeyMode, unpackAgent } from './core/index.js';
import { Hash, Address, PublicClient, WalletClient } from 'viem';
export { a as A2ASkillResult, A as AgentRunContext, b as AgentRunner, c as AgentRunnerConfig, I as IPFSFetcher, d as IPFSFetcherConfig, O as OnChainReader, R as RunnableSkill, W as WalletSigner, e as defaultIPFSFetcher } from './agent-runner-BRmpSXrU.js';
import { S as SubscriptionManager } from './index-iaAuhFlL.js';
export { A as A2AConfig, a as A2ADaemon, b as A2ADaemonConfig, c as A2AProtocol, d as A2ATaskResult, e as AgentLoop, f as AgentRegistry, g as AgentRegistryConfig, h as AgentSummary, i as AgentSummaryMetadata, C as ContextCompactor, j as CreatePlanParams, k as CreatePlanResult, F as FactExtractor, G as GetAllAgentsOptions, L as LoopTraceEmitter, M as MetadataAttribute, P as PlanDetail, l as PlatformToolContext, m as PlatformToolDef, n as SUBSCRIPTION_PERIODS, o as StructuredAgentMetadata, p as SubscribeResult, q as SubscriptionConfig, r as SubscriptionDetail, s as SubscriptionPeriod, T as ToolExecutor, Z as ZERO_ADDRESS, t as buildPlatformTools, u as buildSystemPrompt, v as buildTools, w as cidFromURI, x as executePlatformTool, y as getAllPlatformToolNames, z as guardSubscription, B as parseTokenURIJSON, D as toAttributes, E as wrapPlatformToolsAsSkills } from './index-iaAuhFlL.js';
export { A as AgentLoopConfig, a as AgentLoopResult, C as ChatRequest, b as ChatStreamEvent, L as LLMMessage, c as LLMProvider, d as LLMToolCall, e as LoopRunContext, O as OpenAIToolDef, T as ToolCallRecord, f as ToolCallResult, g as ToolCallStart } from './types-DtPSrWjd.js';
export { GatewayProvider, GatewayProviderConfig, OpenAIProvider, OpenAIProviderConfig, ProviderFactoryConfig, createLLMProvider } from './llm/index.js';
export { EndpointRecord, MultiEndpointClient, MultiEndpointConfig } from './endpoint/index.js';
export { ConfigEntry, ConfigurationClient, ConfigurationConfig } from './configuration/index.js';
export { IPFSUploadResult, IPFSUploader, IPFSUploaderConfig, defaultIPFSUploader } from './ipfs/index.js';
export { MemoryConfig, MemoryFact, MemoryProvider } from './memory/index.js';
export { HttpTraceEmitter, NoopTraceEmitter, TraceConfig, TraceEmitter, TraceEvent } from './traces/index.js';
export { BrowserAction, BrowserActionResult, executeBrowserAction, extractAccessibleDOM, sleep } from './skills/index.js';
export { A2ADelegatedTaskResult, A2A_STATUS, BillingBalance, ConversationChatParams, ConversationChatResult, ConversationClient, ConversationClientConfig, ConversationCreateSessionParams, ConversationCreateTaskParams, ConversationSSEEvent, ConversationSkillDef, ConversationTask, ConversationTaskError, ConversationTaskStatus, OnChainApprovalRequest, SessionKeyAuthStatus, SessionKeyInfo } from './conversation/index.js';
import { ClientOptions, ChainKey as ChainKey$1 } from '@0xinfrax/payments';
export { ClientOptions, MPPClient, PaymentsClient, X402Client } from '@0xinfrax/payments';
export { C as ChainConfig, a as ConfigRegistryOpts, b as ConfigurationRegistry, K as KNOWN_CHAINS } from './config-DOyidIlP.js';
export { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import 'events';

type ActoraEventType = 'Transfer' | 'AgentRegistered' | 'PlanCreated' | 'Subscribed';
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
type ChainKey = 'oxachain' | 'sepolia' | 'bsc' | 'ethereum' | 'base';
interface SubscriptionPaymentsConfig {
    /** Actora Gateway base URL (required for fiat / x402 rails). */
    gatewayUrl?: string;
    /** Optional gateway bearer token. */
    accessToken?: string;
    /** Chain rail — required for `method: 'chain'` and for automatic x402 payment. */
    subscriptionManager?: SubscriptionManager;
    /** Wallet used to automatically fund an x402 payment (if txHash is not supplied). */
    walletClient?: WalletClient;
    /** Which chain to verify x402 payments on (default: oxachain). */
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
    /** Which chain to verify on-chain payments on (default: oxachain). */
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
    /** Phase 2: verify the payer's on-chain payment tx and credit it. */
    settle(input: {
        paymentId: string;
        txHash: string;
        chain?: ChainKey$1;
    }): Promise<{
        verified: boolean;
        paymentId: string;
        payer: string;
        creditedWei: string;
        balanceWei: string;
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

interface BillingClientConfig {
    /** Gateway base URL, e.g. https://actora.codes */
    gatewayUrl: string;
    /** Tenant API Key (actora_...) issued after registration (alternative to accessToken) */
    apiKey?: string;
    /** Gateway JWT access token from wallet-signed login (alternative to apiKey) */
    accessToken?: string;
    /** End-user wallet for balance queries within the tenant (optional) */
    endUserId?: string;
}
interface BalanceResult {
    /** Balance in OXA as a high-precision decimal string, e.g. "1.500000000000000000". "0" when never funded. */
    balance: string;
    /** Raw balance in wei (string) — use for exact programmatic comparison against priceWei. */
    balanceWei: string;
    currency: 'OXA';
    /** ISO timestamp of the last ledger update, or null when never funded. */
    updatedAt: string | null;
    /** The wallet the balance was queried for (tenant or proxied end user). */
    subject: string;
    /** Platform pay-to wallet for top-ups (present when x402 is enabled). */
    payTo?: string;
    /** Per-request pay-per-call price in wei (present when x402 is enabled). */
    priceWei?: string;
}
/**
 * Balance query client for B-end integrations.
 * @example
 * const billing = new BillingClient({ gatewayUrl, apiKey: 'actora_xxx' })
 * const { balanceWei, priceWei } = await billing.getBalance()
 * if (balanceWei && priceWei && BigInt(balanceWei) < BigInt(priceWei)) {
 *   // show top-up prompt: send native token to billing.payTo
 * }
 */
declare class BillingClient {
    private readonly config;
    private readonly baseUrl;
    constructor(config: BillingClientConfig);
    private _headers;
    /**
     * Query the x402 ledger balance for the tenant (default) or a proxied
     * end-user wallet. Never throws on a zero balance — balance "0" is a normal
     * response. Throws only on auth/transport errors.
     * @param opts.endUserId 0x wallet to query instead of the tenant's own balance
     */
    getBalance(opts?: {
        endUserId?: string;
    }): Promise<BalanceResult>;
}

/** AgentWalletConfig 客户端配置。 */
interface AgentWalletConfigOptions {
    /** Gateway 地址（如 https://actora.codes）。 */
    baseUrl: string;
    /** Gateway ADMIN_KEY（admin 路由鉴权，平台全量）。与 apiKey 二选一。 */
    adminKey?: string;
    /** 租户 API Key（actora_...，租户作用域，仅限自有 agent）。与 adminKey 二选一。 */
    apiKey?: string;
}
interface AgentWalletInfo {
    agentId: number;
    email: string;
    walletAddress: string;
    chain: string;
    sessionUnlocked: boolean;
    sessionExpiresAt: string | null;
}
interface BindAgentWalletInput {
    agentId: number;
    /** MPC 钱包注册邮箱（sendCode/register 所用）。 */
    email: string;
    /** MPC 钱包地址。 */
    walletAddress: string;
    /** 链名，默认 'oxachain'。 */
    chain?: string;
}
interface AuthorizePaymentSessionInput {
    agentId: number;
    email: string;
    /** 邮箱收到的 6 位验证码（MPC session.unlock）。 */
    code: string;
}
interface AuthorizePaymentSessionResult {
    address: string;
    expiresAt: string;
}
interface AgentWalletStatus extends AgentWalletInfo {
    chainBalanceWei: string | null;
}
/**
 * agent 自主钱包管理客户端：绑定 MPC 钱包 / 授权付款会话 / 查询状态。
 * 绑定 + 解锁完成后，A2A 委派由 gateway 服务端自动代付，SDK 侧无需再参与付款。
 */
declare class AgentWalletConfig {
    private opts;
    constructor(opts: AgentWalletConfigOptions);
    /** 绑定 agent 与 MPC 钱包（agent_id 唯一，重复绑定覆盖 email/地址/链）。 */
    bindWallet(input: BindAgentWalletInput): Promise<{
        success: boolean;
    }>;
    /** 邮箱验证码解锁 MPC 会话（令牌由 gateway 加密存储，服务端自动代付使用）。 */
    authorizePaymentSession(input: AuthorizePaymentSessionInput): Promise<AuthorizePaymentSessionResult>;
    /** 查询单个 agent 自主钱包状态（含链上原生币余额）。 */
    status(agentId: number): Promise<AgentWalletStatus>;
    /** 列出已绑定 agent 钱包（apiKey 模式下仅返回自有 agent）。 */
    list(): Promise<{
        wallets: AgentWalletInfo[];
    }>;
    /** 解绑（清除钱包绑定与会话）。 */
    unbind(agentId: number): Promise<{
        success: boolean;
    }>;
}

declare const PAYMENT_VERSION = "0.1.3";

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

interface ReputationConfig {
    contractAddress: Address;
    publicClient: PublicClient;
    walletClient: WalletClient;
}
declare class ReputationRegistry {
    private address;
    private publicClient;
    private walletClient;
    constructor(config: ReputationConfig);
    private get account();
    /** Submit a rating (1-5) with optional comment. */
    rate(agentId: number, rating: number, comment?: string): Promise<Hash>;
    /** Get average rating and total count. */
    getRating(agentId: number): Promise<{
        averageRating: number;
        totalRatings: number;
    }>;
    /** Get all reviews for an agent. */
    getReviews(agentId: number): Promise<AgentReview[]>;
    /** Get full reputation summary. */
    getReputation(agentId: number): Promise<AgentReputation>;
}

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

export { A2AClient, A2A_VERSION, Actora402, type Actora402Config, type ActoraChainEvent, type ActoraEventType, AgentReputation, AgentReview, AgentWalletConfig, type AgentWalletConfigOptions, type AgentWalletInfo, type AgentWalletStatus, type AuthorizePaymentSessionInput, type AuthorizePaymentSessionResult, type BalanceResult, BillingClient, type BillingClientConfig, type BindAgentWalletInput, type BuyTenantPlanInput, type BuyTenantPlanResult, CONFIG_VERSION, CentralAgentClient, type CentralAgentClientOptions, type CentralAgentListFilters, type CentralAgentSummary, type CentralPlan, type CentralPlanRow, type CentralSubscription, type CreateCentralAgentInput, type CreateCentralPlanInput, type EventListenerOptions, type MCPCallResult, MCPConnector, type MCPConnectorConfig, type MCPTool, MCP_VERSION, McpConnection, PAYMENT_VERSION, type PaySubscriptionInput, type PaySubscriptionResult, PeriodClient, REGISTRY_VERSION, REPUTATION_VERSION, type ReputationConfig, ReputationRegistry, SUBSCRIPTION_VERSION, SubscriptionManager, type SubscriptionPaymentMethod, SubscriptionPayments, type SubscriptionPaymentsConfig, type TenantPlanPaymentMethod, TenantPlanPayments, type TenantPlanPaymentsConfig, type UpdateCentralAgentInput, type X402Info, subscribeToEvents };
