import { M as McpConnection } from './types-C6xHfvpn.mjs';
export { A as A2AAgentCard, e as A2ASkillExecution, a as A2ATask, f as A2ATaskStatus, g as AGENT_CATEGORIES, h as ActoraConfig, i as ActoraContracts, j as ActoraError, k as ActoraErrorCode, l as AgentCategory, b as AgentPayload, m as AgentPricing, c as AgentPrivatePayload, n as AgentPublicPayload, o as AgentReputation, p as AgentReview, q as AgentSearchQuery, r as AgentSearchResult, d as AgentSubscription, E as EncryptedPayload, J as JSONSchema, s as JSONSchemaProperty, t as McpTransport, O as OnChainAgentMetadata, P as PackResult, u as PricingType, R as RegisteredAgent, S as SkillDef, v as SkillExecutionMode, w as SkillExecutionRemote, x as SubscriptionRequired, y as SubscriptionStatus, U as UnpackResult } from './types-C6xHfvpn.mjs';
export { a as DEFAULT_DERIVATION_INFO_PREFIX, b as DEFAULT_DERIVATION_INFO_PREFIX_V2, c as DEFAULT_DERIVATION_INFO_PREFIX_V3, d as DEFAULT_DERIVATION_MESSAGE, e as DEFAULT_DERIVATION_SALT, f as DEFAULT_EIP712_DOMAIN, g as DEFAULT_EIP712_MESSAGE_VERSION, h as DEFAULT_EIP712_PRIMARY_TYPE, i as DEFAULT_EIP712_PURPOSE, j as DEFAULT_EIP712_TYPES, k as DEFAULT_PRF_SALT, D as DerivationMode, l as DeriveKeyPairFromWalletArgs, m as Eip712DerivationOverrides, n as Eip712TypeEntry, o as Eip712TypedData, E as Eip712Types, P as PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE, p as PAYLOAD_KEY_MODE_ATTRIBUTE, q as PayloadKeyCredential, r as PublishAgentConfig, s as PublishAgentResult, W as WalletKeyDerivationParams, t as aesDecrypt, u as aesEncrypt, v as buildPayloadKeyTypedData, w as decryptPayload, x as decryptWithKey, y as defaultInfoPrefixFor, z as deriveKeyPairFromWallet, A as derivePrivateKeyFromIkm, B as derivePrivateKeyFromSignature, C as eciesDecrypt, F as eciesEncrypt, G as encryptPayload, H as encryptWithKey, I as generateAesKey, J as generateKeyPair, K as getPublicKey, L as isDerivationMode, M as packAgentForPublish, N as prfSaltBytes, O as publishAgent, Q as randomBytes, R as readPayloadKeyCredential, S as readPayloadKeyMode, T as serializePayloadKeyCredential, U as unpackAgent } from './crypto-CJLKU40y.mjs';
export { CreatePrfCredentialOptions, EvaluatePrfOptions, PrfCapability, PrfCredential, PrfError, PrfErrorCode, createPrfCredential, evaluatePrf, getPrfCapability } from './core/index.mjs';
import { Hash, Address, PublicClient } from 'viem';
export { a as A2ASkillResult, A as AgentRunContext, b as AgentRunner, c as AgentRunnerConfig, I as IPFSFetcher, d as IPFSFetcherConfig, O as OnChainReader, R as RunnableSkill, W as WalletSigner, e as defaultIPFSFetcher } from './agent-runner-Bb6j8FNy.mjs';
export { A as A2ADaemon, a as A2ADaemonConfig, b as A2ATaskResult, c as AgentLoop, d as AgentRegistry, e as AgentRegistryConfig, f as AgentSummary, g as AgentSummaryMetadata, C as ContextCompactor, F as FactExtractor, G as GetAllAgentsOptions, L as LoopTraceEmitter, M as MetadataAttribute, P as PlatformToolContext, h as PlatformToolDef, S as STANDARD_IDENTITY_ABI, i as StructuredAgentMetadata, T as ToolExecutor, j as buildPlatformTools, k as buildSystemPrompt, l as buildTools, m as cidFromURI, n as executePlatformTool, o as getAllPlatformToolNames, p as parseTokenURIJSON, t as toAttributes, w as wrapPlatformToolsAsSkills } from './index-CGXWWH8K.mjs';
export { A as AgentLoopConfig, a as AgentLoopResult, C as ChatRequest, b as ChatStreamEvent, L as LLMMessage, c as LLMProvider, d as LLMToolCall, e as LoopRunContext, O as OpenAIToolDef, T as ToolCallRecord, f as ToolCallResult, g as ToolCallStart } from './types-DXP3qDSr.mjs';
export { GatewayProvider, GatewayProviderConfig, OpenAIProvider, OpenAIProviderConfig, ProviderFactoryConfig, createLLMProvider } from './llm/index.mjs';
export { Actora402, Actora402Config, SUBSCRIPTION_VERSION } from './subscription/index.mjs';
export { A2AClient, BuyTenantPlanInput, BuyTenantPlanResult, ConfirmSpendSessionResult, EnableSpendSessionResult, GatorCaveat, PAYMENT_VERSION, PaySubscriptionInput, PaySubscriptionResult, PeriodClient, SpendApproval, SpendChain, SpendDecisionCode, SpendGateResult, SpendPolicy, SpendPolicyClient, SpendPolicyClientConfig, SpendPolicyDoc, SpendSession, SpendSessionRevokeDraft, SpendSessionRevokeResult, SubscriptionPaymentMethod, SubscriptionPayments, SubscriptionPaymentsConfig, TenantPlanPaymentMethod, TenantPlanPayments, TenantPlanPaymentsConfig, X402Info } from './payment/index.mjs';
export { A2A_VERSION } from './a2a/index.mjs';
export { REPUTATION_VERSION, SETTLEMENT_PROOF_DOMAIN_NAME, SETTLEMENT_PROOF_DOMAIN_VERSION, SETTLEMENT_PROOF_TYPES, SettlementChain, SettlementDomain, SettlementDomainResponse, SettlementProofMessage, SettlementRail, SubmitSettlementInput, SubmitSettlementResult, SubmitSubscriptionSettlementInput, SubscriptionSettlementResult, SubscriptionSettlementStatus, deriveSettlementRef, deriveTaskRef, getSettlementDomain, signSettlementProof, submitSettlement, submitSubscriptionSettlement } from './reputation/index.mjs';
export { EndpointRecord, MultiEndpointClient, MultiEndpointConfig } from './endpoint/index.mjs';
export { IPFSUploadResult, IPFSUploader, IPFSUploaderConfig, defaultIPFSUploader } from './ipfs/index.mjs';
export { MemoryConfig, MemoryFact, MemoryProvider } from './memory/index.mjs';
export { HttpTraceEmitter, NoopTraceEmitter, TraceConfig, TraceEmitter, TraceEvent } from './traces/index.mjs';
export { BrowserAction, BrowserActionResult, executeBrowserAction, extractAccessibleDOM, sleep } from './skills/index.mjs';
export { A2ADelegatedTaskResult, A2A_STATUS, ConversationChatParams, ConversationChatResult, ConversationClient, ConversationClientConfig, ConversationCreateSessionParams, ConversationCreateTaskParams, ConversationRequestError, ConversationSSEEvent, ConversationSkillDef, ConversationTask, ConversationTaskError, ConversationTaskStatus, OnChainApprovalRequest, SessionKeyInfo } from './conversation/index.mjs';
export { ExecutionProofBundle, ExecutionProofVerifyReason, ExecutionProofVerifyResult, verifyExecutionProof } from './proofs/index.mjs';
export { AgentEndpointSnapshot, AgentPassport, AgentPayout, AgentReputationBucket, AgentSpecSnapshot, CreateWebhookInput, CreateWebhookResult, EndpointKind, EndpointStatus, ListReceiptsFilter, PassportApiError, PassportChain, PassportClient, PassportClientOptions, PayoutSource, PublishBlockedReason, PublishMode, PublishPlan, PublishStatus, PublishTarget, PublishTargetId, Receipt, ReceiptDetail, ReceiptKind, ReceiptRail, ReceiptStatus, ReceiptVerification, ReceiptVerifyReason, WebhookEndpoint, WebhookEvent } from './passport/index.mjs';
export { A as A2AConfig, a as A2AProtocol } from './a2a-bU3ngGJ2.mjs';
export { C as ChainConfig, a as ConfigRegistryOpts, b as ConfigurationRegistry, K as KNOWN_CHAINS } from './config-DTv6imOF.mjs';
export { ClientOptions, PaymentsClient, X402Client } from '@keelcodes/payments';
export { C as CreatePlanParams, a as CreatePlanResult, P as PlanDetail, b as PlanType, S as SUBSCRIPTION_PERIODS, c as SubscribeResult, d as SubscriptionConfig, e as SubscriptionDetail, f as SubscriptionManager, g as SubscriptionPeriod, Z as ZERO_ADDRESS, h as guardSubscription } from './subscription-DD5RHSzb.mjs';
export { R as ReputationConfig, a as ReputationFeedback, b as ReputationFlavor, c as ReputationRegistry, d as ReputationSummary } from './reputation-BdaT2Izy.mjs';
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

export { type ActoraChainEvent, type ActoraEventType, CONFIG_VERSION, CentralAgentClient, type CentralAgentClientOptions, type CentralAgentListFilters, type CentralAgentSummary, type CentralPlan, type CentralPlanRow, type CentralSubscription, type CreateCentralAgentInput, type CreateCentralPlanInput, type EventListenerOptions, type MCPCallResult, MCPConnector, type MCPConnectorConfig, type MCPTool, MCP_VERSION, McpConnection, REGISTRY_VERSION, type UpdateCentralAgentInput, subscribeToEvents };
