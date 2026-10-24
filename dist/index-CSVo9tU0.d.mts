import { A as AgentLoopConfig, a as AgentLoopResult, T as ToolCallRecord, c as LLMProvider, L as LLMMessage, O as OpenAIToolDef } from './types-6ttfEKn5.mjs';
import { R as RunnableSkill, b as AgentRunner } from './agent-runner-CVpGoUs7.mjs';
import { TraceConfig, TraceEvent } from './traces/index.mjs';
import { Address, PublicClient, WalletClient, Hash } from 'viem';
import { b as A2AAgentCard, d as A2ATask, r as AgentSubscription } from './types-ATMM4oRG.mjs';
import { D as DerivationMode, q as PayloadKeyCredential } from './crypto-DcBuG_jD.mjs';
import { IPFSUploader } from './ipfs/index.mjs';
import { EventEmitter } from 'events';

declare class AgentLoop {
    private config;
    private executor;
    private tools;
    private systemPrompt;
    private aborted;
    private abortController;
    private sessionId;
    private readonly compactor;
    private readonly factExtractor;
    private readonly tracer;
    constructor(config: AgentLoopConfig);
    abort(): void;
    run(userMessage: string, history?: {
        role: 'user' | 'assistant';
        content: string;
    }[]): Promise<AgentLoopResult>;
    private recallMemory;
    private storeMemory;
    private runIteration;
}

interface ExecuteOptions {
    skills: RunnableSkill[];
    timeoutMs?: number;
}
declare class ToolExecutor {
    private skills;
    private timeoutMs;
    constructor(opts: ExecuteOptions);
    executeSingle(name: string, args: Record<string, unknown>): Promise<ToolCallRecord>;
    executeBatch(calls: {
        callId: string;
        name: string;
        arguments: Record<string, unknown>;
    }[]): Promise<ToolCallRecord[]>;
    hasTool(name: string): boolean;
    getToolNames(): string[];
    private normalizeResult;
}

declare class ContextCompactor {
    private readonly llmProvider;
    private readonly compactModel;
    constructor(llmProvider: LLMProvider, compactModel?: string);
    /** Rough token estimation: 1 token ≈ 4 characters */
    estimateTokens(messages: LLMMessage[]): number;
    /**
     * Compact messages: keep system prompt + last 2 turns, summarize the rest.
     * Returns original array if not enough messages or compaction fails.
     */
    compact(messages: LLMMessage[]): Promise<LLMMessage[]>;
}

declare class FactExtractor {
    private readonly llmProvider;
    private readonly factModel;
    constructor(llmProvider: LLMProvider, factModel?: string);
    /** Extract simple facts from the conversation for memory storage */
    extract(userMessage: string, assistantResponse: string): Promise<string[]>;
}

declare class LoopTraceEmitter {
    private readonly config;
    constructor(config?: TraceConfig);
    emit(event: Omit<TraceEvent, 'timestamp'>): void;
}

declare function buildTools(skills: RunnableSkill[]): OpenAIToolDef[];
declare function buildSystemPrompt(prompt: string, skills: RunnableSkill[]): string;

interface A2AConfig {
    contractAddress: Address;
    publicClient: PublicClient;
    walletClient: WalletClient;
}
declare class A2AProtocol {
    private address;
    private publicClient;
    private walletClient;
    constructor(config: A2AConfig);
    private get account();
    createAgentCard(agentId: number, card: {
        name: string;
        description: string;
        version: string;
        capabilities: string[];
        supportedTasks: string[];
        commProtocol?: string;
        authMethod?: string;
        cardURI?: string;
    }): Promise<{
        cardId: number;
        txHash: Hash;
    }>;
    getAgentCard(agentId: number): Promise<A2AAgentCard | null>;
    createTask(agentId: number, taskType: string, input: string | Record<string, unknown>): Promise<{
        taskId: number;
        txHash: Hash;
    }>;
    completeTask(taskId: number, output: unknown, status?: number): Promise<Hash>;
    getTask(taskId: number): Promise<A2ATask | null>;
    getUserTasks(user: Address): Promise<number[]>;
    getAgentTasks(agentId: number): Promise<A2ATask[]>;
    getAddress(): Promise<Address>;
    private _parseUintFromLog;
}

declare const ZERO_ADDRESS: Address;
interface SubscriptionConfig {
    contractAddress: Address;
    publicClient: PublicClient;
    walletClient: WalletClient;
}
/** PlanType enum: 0=Subscription, 1=UsageBased, 2=Hybrid. */
type PlanType = 0 | 1 | 2;
interface PlanDetail {
    planId: number;
    agentId: number;
    /** Agent owner, derived via `identityRegistry.ownerOf(agentId)`. */
    creator: Address;
    /** Alias of `subscriptionPrice` (kept for existing callers). */
    price: bigint;
    /** Billing period name: day | week | month | quarter | year. */
    period: string;
    active: boolean;
    /** ERC-20 pay token; address(0) = native token. */
    payToken: Address;
    /** Always 0 — ERC8004SubscriptionManager has no trial period. */
    trialDays: number;
    name: string;
    description: string;
    planType: PlanType;
    subscriptionPrice: bigint;
    usagePrice: bigint;
    billingPeriod: number;
    /** Max usage per billing period (0 = unlimited). */
    maxUsage: bigint;
    /** Total usage limit for usage-based plans (0 = unlimited). */
    totalUsageLimit: bigint;
    /** Platform fee snapshot in basis points (100 = 1%). */
    platformFeePercentage: number;
}
interface SubscriptionDetail {
    subscriptionId: number;
    planId: number;
    subscriber: Address;
    agentId: number;
    /** 0=Active, 1=Cancelled, 2=Expired, 3=PaymentFailed, 4=Suspended */
    status: number;
    planType: PlanType;
    startedAt: number;
    /** Next charge date. Usage-based plans keep this at the start date. */
    nextBillingDate: number;
    endDate: number;
    /** Billing period name: day | week | month | quarter | year. */
    period: string;
    payToken: Address;
    amountPaid: bigint;
    currentPeriodUsage: bigint;
    totalUsage: bigint;
    remainingUsage: bigint;
    lastPaymentDate: number;
}
declare const SUBSCRIPTION_PERIODS: readonly ["day", "week", "month", "quarter", "year"];
type SubscriptionPeriod = (typeof SUBSCRIPTION_PERIODS)[number];
interface CreatePlanParams {
    agentId: number;
    /** Plan name — required on-chain (non-empty). Defaults to `Plan #<agentId>`. */
    name?: string;
    description?: string;
    /** 0=Subscription (default), 1=UsageBased, 2=Hybrid. */
    planType?: PlanType;
    /** Recurring price in wei / token units. Required unless planType=1. */
    price?: bigint;
    /** Per-use price. Required when planType is 1 or 2. */
    usagePrice?: bigint;
    /** Must be one of: day | week | month | quarter | year. */
    period: SubscriptionPeriod;
    /** ERC20 pay token; default zero address = native token. */
    payToken?: Address;
    /** Max usage per billing period (0 = unlimited). */
    maxUsage?: bigint;
    /** Total usage limit (0 = unlimited). */
    totalUsageLimit?: bigint;
}
interface CreatePlanResult {
    planId: number;
    txHash: Hash;
}
interface SubscribeResult {
    subscriptionId: number;
    txHash: Hash;
    subscriber: Address;
    agentId: number;
    /** Unix timestamp (seconds) of the next scheduled charge. */
    nextBillingDate: number;
}
declare class SubscriptionManager {
    private address;
    private publicClient;
    private walletClient;
    constructor(config: SubscriptionConfig);
    /**
     * Resolve the caller account for write operations.
     *
     * Prefers `walletClient.account` (a full viem Account object with signing
     * capability) over `getAddresses()[0]` (a bare address string). Passing a
     * bare string as `account` makes viem route `writeContract` through
     * `eth_sendTransaction` (node-managed accounts only), which fails for local
     * signers; the full object enables local signing via `eth_sendRawTransaction`.
     * In browser wallets (e.g. MetaMask) `client.account` is a json-rpc account
     * and the provider signs, so both paths keep working.
     */
    private _resolveAccount;
    /** Get the default platform fee in basis points (e.g. 250 = 2.5%). */
    getPlatformFeeBps(): Promise<number>;
    /** Check whether an ERC-20 token is accepted by the plan price oracle. */
    isTokenWhitelisted(token: Address): Promise<boolean>;
    /** Get full plan details; `creator` is the identity owner of `agentId`. */
    getPlan(planId: number): Promise<PlanDetail>;
    /**
     * Create a subscription plan for an agent.
     *
     * @param params.period  Must be 'day' | 'week' | 'month' | 'quarter' | 'year'.
     * @returns              { planId, txHash } (planId parsed from PlanCreated event)
     */
    createPlan(params: CreatePlanParams): Promise<CreatePlanResult>;
    /**
     * Subscribe to a plan.
     * For ETH plans: pass valueWei = plan.price.
     * For ERC20 plans: auto-detects from plan.payToken, calls approve + subscribe.
     *                    User must have approved this contract for plan.price tokens.
     *
     * @returns SubscribeResult — subscriptionId/nextBillingDate/subscriber parsed
     *          from the SubscriptionCreated event (no longer hardcoded to 0).
     */
    subscribe(planId: number, opts?: {
        valueWei?: bigint;
        approveTokenFirst?: boolean;
    }): Promise<SubscribeResult>;
    /**
     * One-step createPlan + subscribe (two transactions).
     * Saves the caller one round of plan lookup when the plan does not exist yet.
     */
    createPlanAndSubscribe(params: CreatePlanParams): Promise<CreatePlanResult & SubscribeResult>;
    /** Cancel subscription. ERC8004SubscriptionManager settles payments immediately. */
    cancel(subscriptionId: number): Promise<Hash>;
    hasActiveSubscription(subscriber: Address, agentId: number): Promise<boolean>;
    /**
     * Latest subscription of `subscriber` for `agentId`.
     *
     * ERC8004SubscriptionManager indexes subscriptions by ID only, so this scans
     * `getUserSubscriptions(subscriber)`. Prefers an active, non-expired entry;
     * otherwise falls back to the newest one.
     */
    getSubscription(subscriber: Address, agentId: number): Promise<AgentSubscription | null>;
    /** Full subscription detail (status, usage counters, payment token). */
    getSubscriptionDetail(subscriptionId: number): Promise<SubscriptionDetail>;
    /** All subscription IDs owned by a wallet. */
    getUserSubscriptions(user: Address): Promise<number[]>;
    private _readPlanRaw;
    private _readSubscription;
    private _readUserSubscriptions;
    /** Plan creator — the identity (ERC-721) owner of `agentId`. */
    private _agentOwner;
    private _findEventLog;
    /** Parse planId from the PlanCreated event in a transaction receipt. */
    private _parsePlanIdFromReceipt;
    /** Parse subscriptionId/subscriber/agentId/nextBillingDate from SubscriptionCreated. */
    private _parseSubscribedFromReceipt;
}
declare function guardSubscription(manager: SubscriptionManager, user: Address, agentId: number): Promise<AgentSubscription>;

declare const STANDARD_IDENTITY_ABI: {
    readonly setAgentURI: {
        readonly inputs: readonly [{
            readonly name: "agentId";
            readonly type: "uint256";
        }, {
            readonly name: "newURI";
            readonly type: "string";
        }];
        readonly name: "setAgentURI";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    };
    readonly setMetadata: {
        readonly inputs: readonly [{
            readonly name: "agentId";
            readonly type: "uint256";
        }, {
            readonly name: "metadataKey";
            readonly type: "string";
        }, {
            readonly name: "metadataValue";
            readonly type: "bytes";
        }];
        readonly name: "setMetadata";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    };
    readonly getMetadata: {
        readonly inputs: readonly [{
            readonly name: "agentId";
            readonly type: "uint256";
        }, {
            readonly name: "metadataKey";
            readonly type: "string";
        }];
        readonly name: "getMetadata";
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    };
    readonly setAgentWallet: {
        readonly inputs: readonly [{
            readonly name: "agentId";
            readonly type: "uint256";
        }, {
            readonly name: "newWallet";
            readonly type: "address";
        }, {
            readonly name: "deadline";
            readonly type: "uint256";
        }, {
            readonly name: "signature";
            readonly type: "bytes";
        }];
        readonly name: "setAgentWallet";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    };
    readonly getAgentWallet: {
        readonly inputs: readonly [{
            readonly name: "agentId";
            readonly type: "uint256";
        }];
        readonly name: "getAgentWallet";
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    };
    readonly unsetAgentWallet: {
        readonly inputs: readonly [{
            readonly name: "agentId";
            readonly type: "uint256";
        }];
        readonly name: "unsetAgentWallet";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    };
    readonly isAuthorizedOrOwner: {
        readonly inputs: readonly [{
            readonly name: "spender";
            readonly type: "address";
        }, {
            readonly name: "agentId";
            readonly type: "uint256";
        }];
        readonly name: "isAuthorizedOrOwner";
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    };
    readonly ownerOf: {
        readonly inputs: readonly [{
            readonly name: "tokenId";
            readonly type: "uint256";
        }];
        readonly name: "ownerOf";
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    };
    readonly getVersion: {
        readonly inputs: readonly [];
        readonly name: "getVersion";
        readonly outputs: readonly [{
            readonly name: "";
            readonly type: "string";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    };
};
interface AgentRegistryConfig {
    /** IdentityRegistry contract address */
    contractAddress: Address;
    /** viem PublicClient for read calls */
    publicClient: PublicClient;
    /** viem WalletClient for write calls */
    walletClient: WalletClient;
    /**
     * 日志派生读取的起始区块（canonical 标准没有 `totalAgents`/`getAgentsByOwner`
     * 视图，需从 `Registered`/`Transfer` 日志派生）。默认 0。
     */
    fromBlock?: number;
}
/** Public, human-readable subset of on-chain agent metadata. */
interface AgentSummaryMetadata {
    name: string;
    description: string;
    capabilities: string[];
    skills: string[];
    /** Application category / use case (AGENT_CATEGORIES value; undefined = other). */
    category?: string;
    /** Marketplace-visible availability; tokenURI JSON may override the default true. */
    isActive: boolean;
}
/** Lightweight agent record returned by getAllAgents(). */
interface AgentSummary {
    agentId: number;
    owner: string;
    tokenURI: string;
    metadata: AgentSummaryMetadata;
    /** Unix timestamp (seconds); 0 when the tokenURI metadata has no createdAt. */
    createdAt: number;
}
interface GetAllAgentsOptions {
    /** First agent ID to scan (default: 0 for canonical standard, 1 for legacy). */
    fromId?: number;
    /** Last agent ID to scan (default: the max agent ID on chain). */
    toId?: number;
    /** Only return agents whose metadata.isActive === true (default: false). */
    activeOnly?: boolean;
    /** Only return agents whose capabilities include ALL of these (AND). */
    capabilities?: string[];
    /** RPC batching size (default: 10). */
    batchSize?: number;
}
/** Full structured metadata for one agent (on-chain keys + tokenURI JSON). */
interface StructuredAgentMetadata {
    name: string;
    description: string;
    encryptedPayloadCid: string;
    eciesEncryptedKey: string;
    publicPayloadCid: string;
    capabilities: string[];
    skills: string[];
    /** Application category / use case (AGENT_CATEGORIES value; '' = other). */
    category?: string;
    isActive: boolean;
}
/**
 * Parse base64 data-URI tokenURI → JSON metadata (null if not parseable).
 * Tolerant of contract bugs: trims trailing garbage after base64 padding,
 * repairs unterminated JSON (unclosed quotes/braces), and falls back to a
 * regex extraction of the name field.
 */
declare function parseTokenURIJSON(tokenURI: string): Record<string, unknown> | null;
/** 单条链上属性；`value` 为明文文本，写入合约时编码为 bytes。 */
interface MetadataAttribute {
    key: string;
    value: string;
}
/**
 * 把 `{ key: value }` 规范化为链上属性数组：
 *   - 字符串原样；
 *   - 数字 / 布尔 → String()；
 *   - 数组 / 对象 → JSON.stringify（`skills` 等属性的链上约定是「UTF-8 文本 + JSON」）。
 * `undefined` / `null` 的键会被跳过。
 */
declare function toAttributes(patch: Record<string, unknown>): MetadataAttribute[];
declare class AgentRegistry {
    private address;
    private publicClient;
    private walletClient;
    /** 日志派生读取的起始区块。 */
    private fromBlock;
    /** 实现风格探测结果（缓存）：standard=canonical / legacy=历史实现。 */
    private flavor?;
    /** `maxAgentId()` 的短时缓存（避免每次列表都重扫日志）。 */
    private maxIdCache?;
    constructor(config: AgentRegistryConfig);
    /**
     * 尝试读取 legacy 视图 `totalAgents()`：
     *   - 成功 → 判定 `'legacy'` 并返回计数值（= 单调最大 agentId）
     *   - revert → 判定 `'standard'`（canonical 无该视图）并返回 `null`
     * 结果缓存在实例上，因此 legacy 链**不会**因探测产生额外调用。
     */
    private legacyCounter;
    /**
     * 注册表实现风格（缓存）：
     *   - `'standard'`：canonical ERC-8004（无 `totalAgents` 等旧视图，用日志/`ownerOf` 派生）
     *   - `'legacy'`  ：历史一代 / 早期 draft（读取走旧视图）
     */
    getFlavor(): Promise<'legacy' | 'standard'>;
    private getRegisteredLogs;
    private getTransferLogs;
    /** 由 `Registered` 日志派生最大 agentId；无日志返回 -1。 */
    private deriveMaxFromLogs;
    /**
     * 当前最大 agentId；无 agent 时返回 `-1`。
     *   - legacy  ：`totalAgents()`（= 单调最大 ID）
     *   - standard：由 `Registered` 日志派生（标准合约没有计数器视图）
     * 结果短时缓存（15s）。
     */
    maxAgentId(): Promise<number>;
    /**
     * Register a new Agent NFT on-chain.
     *
     * @param tokenURI    IPFS URI of the public metadata (ipfs://...)
     * @param metadata    Key-value metadata (encryptedPayloadCid, eciesEncryptedKey, etc.)
     * @param valueWei    Optional: native currency to send with registration
     * @returns           { agentId: number, txHash: Hash }
     */
    register(tokenURI: string, metadata: {
        key: string;
        value: string;
    }[], valueWei?: bigint): Promise<{
        agentId: number;
        txHash: Hash;
    }>;
    /**
     * 整组覆盖写入链上属性（合约 `updateMetadata`）。
     *
     * ⚠️ 合约实现会先清空该 agent 的**全部属性键**（`delete _agentMetadataKeys`），
     * 再写入传入数组 ⇒ **只传部分键会抹掉其余属性**（如 name/description/category/…）。
     * 增量场景请用 `setAttributes()`。
     */
    overwriteAttributes(agentId: number, attributes: MetadataAttribute[]): Promise<Hash>;
    /**
     * 增量更新链上属性：读回现有属性 → 合并 patch → 整组写回。
     * 未在 `patch` 中出现的键保持原值（规避合约「整组覆盖」的破坏性语义）。
     *
     * 例（公开托管对话可读的技能集）：
     *   await registry.setAttributes(agentId, { skills: [{ name, description, inputSchema,
     *     execution: { type: 'mcp', endpoint, toolName } }] })
     */
    setAttributes(agentId: number, patch: Record<string, unknown>): Promise<Hash>;
    /**
     * 记录该档案的 payload 派生 mode（链上属性 `payload_key_mode`）。
     *
     * 仅记录「宣称」值，合约不做校验，但这是跨实现的**标准字段**：
     * 第三方 runner 据此判断该用 v1 还是 v2 派生，否则「用错 mode」与
     * 「载荷损坏」在现象上完全一样。
     *
     *   await registry.setPayloadKeyMode(agentId, 'eip712-hkdf')
     *
     * 读取：`readPayloadKeyMode(await registry.getAttributes(agentId))`
     */
    setPayloadKeyMode(agentId: number, mode: DerivationMode): Promise<Hash>;
    /**
     * 记录 v3（`webauthn-prf-hkdf`）解密所必需的两项绑定：WebAuthn RP ID 与
     * credentialId（PRF 盐可省，默认冻结值）。
     *
     * v3 的密钥绑定在 (rpId, credential) 上，**无法从地址反推凭据** —— 不写这两个
     * 字段，即使本人拿着正确的 passkey 也找不回派生密钥（表现与"载荷损坏"一样）。
     *
     *   await registry.setPayloadKeyCredential(agentId, {
     *     rpId: 'app.example.com',
     *     credentialId,                       // createPrfCredential() 的返回值
     *     address: account.address,
     *   })
     *
     * 读取：`readPayloadKeyCredential(await registry.getAttributes(agentId))`
     */
    setPayloadKeyCredential(agentId: number, credential: PayloadKeyCredential): Promise<Hash>;
    /**
     * Simple register — just a tokenURI, no extra metadata.
     */
    registerSimple(tokenURI: string, valueWei?: bigint): Promise<{
        agentId: number;
        txHash: Hash;
    }>;
    /** 更新 agent 的 URI（canonical `setAgentURI`）。owner / approved 方可调用。 */
    setAgentURI(agentId: number, newURI: string): Promise<Hash>;
    /** 写入/更新单个链上属性（canonical `setMetadata`；非破坏性——不影响其他键）。 */
    setMetadata(agentId: number, key: string, value: string): Promise<Hash>;
    /**
     * 绑定 agent 的验证钱包（canonical `setAgentWallet`）。
     * `signature` 为 newWallet 对 EIP-712 `AgentWalletSet(agentId,newWallet,owner,deadline)`
     * 的签名（EOA 走 ECDSA / 智能合约钱包走 ERC-1271）；`deadline` 为 Unix 秒且不得超过
     * 当前时间 5 分钟。owner 转让时合约会自动清除绑定。
     */
    setAgentWallet(agentId: number, newWallet: Address, deadline: number, signature: `0x${string}`): Promise<Hash>;
    /** 清除 agent 的验证钱包绑定（canonical `unsetAgentWallet`）。 */
    unsetAgentWallet(agentId: number): Promise<Hash>;
    /** 读取单个链上属性（canonical `getMetadata`）；UTF-8 解码，非法字节回退原始 hex。 */
    getMetadata(agentId: number, key: string): Promise<string>;
    /** 读取 agent 的验证钱包（canonical `getAgentWallet`；未绑定返回 0x0）。 */
    getAgentWallet(agentId: number): Promise<Address>;
    /** spender 是否为 agent 的 owner 或被授权方（canonical `isAuthorizedOrOwner`）。 */
    isAuthorizedOrOwner(spender: Address, agentId: number): Promise<boolean>;
    /** agent 的 owner（ERC-721 `ownerOf`；不存在则 revert）。 */
    ownerOf(agentId: number): Promise<Address>;
    /** 注册表实现版本（canonical `getVersion`，标准实现返回 "2.0.0"）。 */
    getVersion(): Promise<string>;
    /**
     * Get all agent IDs owned by an address.
     * legacy ：直接读 `getAgentsByOwner`；
     * standard：标准注册表没有该视图 → 由 `Transfer` 日志推导每个 token 的最新持有者。
     */
    getAgentsByOwner(owner: Address): Promise<number[]>;
    /** Get the current agent counter（legacy `getCurrentAgentId`；standard 0-based → maxId+1）。 */
    getCurrentAgentId(): Promise<number>;
    /** Check if an agent exists（legacy `agentExists`；standard 用 `ownerOf` 试探）。 */
    agentExists(agentId: number): Promise<boolean>;
    /** Get the tokenURI for an agent. */
    tokenURI(agentId: number): Promise<string>;
    /** Get all metadata attributes for an agent as key-value pairs. */
    getAttributes(agentId: number): Promise<Record<string, string>>;
    /** Total number of registered agents（standard 0-based → maxId+1；legacy 计数器）。 */
    totalAgents(): Promise<number>;
    /**
     * Structured metadata for one agent.
     * Combines on-chain attributes (encryptedPayloadCid / eciesEncryptedKey /
     * publicPayloadCid) with the tokenURI JSON (name/description/capabilities/skills).
     * `isActive` defaults to on-chain existence, overridable via tokenURI JSON.
     */
    getAgentMetadata(agentId: number): Promise<StructuredAgentMetadata>;
    /**
     * Batch-read all agents in a contiguous ID range with optional filters.
     * Replaces the manual binary-search + per-ID ownerOf loop used by chain-sync.
     */
    getAllAgents(options?: GetAllAgentsOptions): Promise<AgentSummary[]>;
    /** Extract tokenId from the Transfer event in the receipt. */
    private _parseAgentIdFromReceipt;
}
/** Extract IPFS CID from an ipfs:// URI. */
declare function cidFromURI(uri: string): string;

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

interface PlatformToolDef {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}
interface PlatformToolContext {
    agentRunner: AgentRunner;
    a2a: A2AProtocol;
    subscriptionManager: SubscriptionManager;
    agentRegistry: AgentRegistry;
    reputationRegistry?: ReputationRegistry;
    configurationRegistry?: {
        getConfig(agentId: number, key: string): Promise<{
            value: string;
            dataType: string;
        }>;
        getAgentConfigs(agentId: number): Promise<unknown[]>;
        setConfig(agentId: number, key: string, value: string, dataType: string): Promise<unknown>;
    };
    multiEndpointRegistry?: {
        getAgentEndpoints(agentId: number): Promise<unknown[]>;
        getActiveAgentEndpoints(agentId: number): Promise<unknown[]>;
        getBestMCPUrl(agentId: number): Promise<string>;
    };
    gatewayUrl?: string;
    gatewayToken?: string;
    userAddress: string;
    ipfsUploader?: IPFSUploader;
}
declare function buildPlatformTools(available?: ('identity' | 'subscription' | 'a2a' | 'reputation' | 'configuration' | 'endpoint' | 'gateway' | 'ipfs')[]): PlatformToolDef[];
declare function getAllPlatformToolNames(): string[];

declare function executePlatformTool(toolName: string, args: Record<string, unknown>, ctx: PlatformToolContext): Promise<unknown>;
/**
 * Merge platform tools into an AgentLoop's skill list.
 * When AgentLoop calls execute(toolName, args), the platform executor handles it.
 */
declare function wrapPlatformToolsAsSkills(ctx: PlatformToolContext, modules?: ('identity' | 'subscription' | 'a2a' | 'reputation' | 'configuration' | 'endpoint' | 'gateway' | 'ipfs')[]): RunnableSkill[];

interface A2ADaemonConfig {
    /** Your agent's numeric ID */
    agentId: number;
    /** Initialized A2AProtocol instance */
    a2a: A2AProtocol;
    /** Gateway URL for fetching pre-computed LLM results */
    gatewayUrl?: string;
    /** Poll interval in milliseconds (default: 15000) */
    pollIntervalMs?: number;
    /** If true, daemon will auto-complete tasks (call completeTask on-chain) */
    autoComplete?: boolean;
    /** Max tasks to process per poll (default: 3) */
    maxPerPoll?: number;
}
interface A2ATaskResult {
    task: A2ATask;
    /** LLM-generated output from Gateway (if available) */
    gatewayOutput?: string;
    /** If task was auto-completed on-chain */
    completed: boolean;
    /** Transaction hash if completed */
    txHash?: string;
    /** Error message if failed */
    error?: string;
}
declare class A2ADaemon extends EventEmitter {
    private config;
    private timer;
    private isRunning;
    private processedTasks;
    constructor(config: A2ADaemonConfig);
    start(): void;
    stop(): void;
    get status(): {
        running: boolean;
        agentId: number;
        processedCount: number;
    };
    private poll;
    /**
     * Get pending tasks assigned to this agent using getAgentTasks() from the contract.
     */
    private getPendingTasks;
    /**
     * Process a pending A2A task:
     *   1. Try Gateway API for pre-computed LLM result
     *   2. Call completeTask() on-chain with the owner's wallet
     */
    private processPendingTask;
}

export { type A2AConfig as A, buildSystemPrompt as B, ContextCompactor as C, buildTools as D, cidFromURI as E, FactExtractor as F, type GetAllAgentsOptions as G, executePlatformTool as H, getAllPlatformToolNames as I, guardSubscription as J, parseTokenURIJSON as K, LoopTraceEmitter as L, type MetadataAttribute as M, toAttributes as N, wrapPlatformToolsAsSkills as O, type PlanDetail as P, type ReputationConfig as R, SubscriptionManager as S, ToolExecutor as T, ZERO_ADDRESS as Z, A2ADaemon as a, type A2ADaemonConfig as b, A2AProtocol as c, type A2ATaskResult as d, AgentLoop as e, AgentRegistry as f, type AgentRegistryConfig as g, type AgentSummary as h, type AgentSummaryMetadata as i, type CreatePlanParams as j, type CreatePlanResult as k, type PlanType as l, type PlatformToolContext as m, type PlatformToolDef as n, type ReputationFeedback as o, type ReputationFlavor as p, ReputationRegistry as q, type ReputationSummary as r, STANDARD_IDENTITY_ABI as s, SUBSCRIPTION_PERIODS as t, type StructuredAgentMetadata as u, type SubscribeResult as v, type SubscriptionConfig as w, type SubscriptionDetail as x, type SubscriptionPeriod as y, buildPlatformTools as z };
