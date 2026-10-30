type PassportChain = 'central' | 'bsc' | 'ethereum' | 'base';
type EndpointKind = 'a2a' | 'mcp' | 'openapi' | 'x402';
type EndpointStatus = 'pending' | 'live' | 'failed' | 'delisted';
interface AgentSpecSnapshot {
    specVersion: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    capabilities: string[];
    skills: unknown[];
    card: Record<string, unknown>;
    /** derived = 链上派生；declared = 开发者显式声明（派生刷新不会覆盖）。 */
    origin: 'derived' | 'declared';
    updatedAt: string | null;
}
interface AgentEndpointSnapshot {
    id: number;
    kind: EndpointKind;
    url: string;
    protocolVersion: string;
    isPrimary: boolean;
    status: EndpointStatus;
    probeResult: unknown;
    probedAt: string | null;
    retryAfter: string | null;
}
/** 声誉三态：verified（观测充分）/ limited（有观测但不足）/ unobserved（无观测）。 */
interface AgentReputationBucket {
    state: 'verified' | 'limited' | 'unobserved';
    observationCount: number;
    receiptCount: number;
    okCount: number;
    errorCount: number;
    settlementCount: number;
    feedbackCount: number;
    /** 无回执时为 null（不是 0）。 */
    successRate: number | null;
    avgLatencyMs: number | null;
    lastActivityAt: string | null;
    computedAt: string | null;
}
interface AgentPassport {
    id: number;
    chain: string;
    owner: string;
    name: string;
    description: string;
    tags: string[];
    capabilities: string[];
    spec: AgentSpecSnapshot | null;
    endpoints: AgentEndpointSnapshot[];
    reputation: AgentReputationBucket | null;
}
type ReceiptKind = 'run' | 'task' | 'a2a';
type ReceiptRail = 'none' | 'owner' | 'entitlement' | 'subscription' | 'per_call';
type ReceiptStatus = 'ok' | 'error';
interface Receipt {
    receiptId: string;
    chain: string;
    agentId: number;
    kind: ReceiptKind;
    subject: string;
    rail: ReceiptRail;
    reference: string;
    amountWei: string;
    payTo: string;
    status: ReceiptStatus;
    requestHash: string;
    responseHash: string;
    latencyMs: number | null;
    meta: Record<string, unknown>;
    issuer: string;
    signature: string;
    issuedAt: string;
    /** 是否带平台签名（未配置签名密钥时为 false）。 */
    signed: boolean;
}
type ReceiptVerifyReason = 'unsigned' | 'hash-mismatch' | 'bad-signature' | 'signer-mismatch';
interface ReceiptVerification {
    valid: boolean;
    reason?: ReceiptVerifyReason;
}
interface ReceiptDetail {
    receipt: Receipt;
    verification: ReceiptVerification;
}
interface ListReceiptsFilter {
    chain?: string;
    agentId?: number;
    subject?: string;
    /** 游标：返回早于该时间的回执。 */
    before?: string;
    /** 默认 20，上限 100。 */
    limit?: number;
}
type WebhookEvent = 'receipt.created' | 'endpoint.down' | 'endpoint.recovered' | '*';
interface WebhookEndpoint {
    id: string;
    owner: string;
    chain: string;
    agentId: number | null;
    url: string;
    events: string[];
    active: boolean;
    failureCount: number;
    lastError: string;
    lastSuccessAt: string | null;
    createdAt: string;
}
interface CreateWebhookInput {
    url: string;
    events?: WebhookEvent[];
    chain?: string;
    agentId?: number | null;
}
/** 创建响应：secret 只出现这一次。 */
interface CreateWebhookResult {
    endpoint: WebhookEndpoint;
    secret: string;
    note: string;
}
type PayoutSource = 'configured' | 'owner' | 'platform' | null;
interface AgentPayout {
    chain: string;
    agentId: number;
    /** null = 未配置或已撤回收款意图。 */
    payoutAddress: string | null;
    payTo: string | null;
    source: PayoutSource;
}
type PublishTargetId = 'a2a' | 'mcp' | 'cursor' | 'x402' | 'openai' | 'claude' | 'virtuals';
type PublishMode = 'auto' | 'manual';
type PublishStatus = 'ready' | 'blocked';
type PublishBlockedReason = 'NO_A2A_ENDPOINT' | 'NO_MCP_ENDPOINT' | 'NO_PAYOUT_ADDRESS';
interface PublishTarget {
    id: PublishTargetId;
    label: string;
    mode: PublishMode;
    status: PublishStatus;
    reason?: PublishBlockedReason;
    artifact: Record<string, unknown>;
    notes: string;
}
interface PublishPlan {
    chain: string;
    agentId: number;
    agent: {
        name: string;
        description: string;
        owner: string;
        tags: string[];
        origin: string;
    };
    card: Record<string, unknown>;
    targets: PublishTarget[];
    generatedAt: string;
}
declare class PassportApiError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, status: number, message?: string);
}
interface PassportClientOptions {
    /** Actora Gateway 基础 URL，例如 https://actora.codes。 */
    baseUrl: string;
    /** 注册用户 JWT（Authorization: Bearer）—— 收款地址写操作与 Webhook 管理需要。 */
    accessToken?: string;
    /** 租户 API Key（X-Api-Key）—— 与 accessToken 二选一。 */
    apiKey?: string;
}
declare class PassportClient {
    private readonly opts;
    constructor(opts: PassportClientOptions);
    private get base();
    private call;
    /** `chain` 缺省时由网关跨链解析（central → bsc → ethereum → base）。 */
    getAgent(agentId: number, chain?: string): Promise<AgentPassport>;
    /** 单张回执 + 平台验签结果（公开）。 */
    getReceipt(receiptId: string): Promise<ReceiptDetail>;
    /** 回执列表：`chain` / `agentId` / `subject` 至少给一个，否则网关 400。 */
    listReceipts(filter: ListReceiptsFilter): Promise<Receipt[]>;
    getPayout(chain: PassportChain, agentId: number): Promise<AgentPayout>;
    /**
     * 设置 / 清除收款地址（仅 owner）。
     * @param payoutAddress null = 撤回收款意图，此后该 agent 不再生成 402。
     */
    setPayout(chain: PassportChain, agentId: number, payoutAddress: string | null): Promise<AgentPayout>;
    listWebhooks(): Promise<WebhookEndpoint[]>;
    createWebhook(input: CreateWebhookInput): Promise<CreateWebhookResult>;
    revokeWebhook(id: string): Promise<void>;
    /** 各平台物料；`blocked` 的条目带 `reason`（不发外部请求）。 */
    getPublishPlan(chain: PassportChain, agentId: number): Promise<PublishPlan>;
}

export { type AgentEndpointSnapshot, type AgentPassport, type AgentPayout, type AgentReputationBucket, type AgentSpecSnapshot, type CreateWebhookInput, type CreateWebhookResult, type EndpointKind, type EndpointStatus, type ListReceiptsFilter, PassportApiError, type PassportChain, PassportClient, type PassportClientOptions, type PayoutSource, type PublishBlockedReason, type PublishMode, type PublishPlan, type PublishStatus, type PublishTarget, type PublishTargetId, type Receipt, type ReceiptDetail, type ReceiptKind, type ReceiptRail, type ReceiptStatus, type ReceiptVerification, type ReceiptVerifyReason, type WebhookEndpoint, type WebhookEvent };
