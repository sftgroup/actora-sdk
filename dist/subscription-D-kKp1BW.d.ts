import { Address, PublicClient, WalletClient, Hash } from 'viem';
import { d as AgentSubscription } from './types-C6xHfvpn.js';

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
    /** Get the default platform fee in basis points (250 = 2.5%). Actora currently sets this to 0. */
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

export { type CreatePlanParams as C, type PlanDetail as P, SUBSCRIPTION_PERIODS as S, ZERO_ADDRESS as Z, type CreatePlanResult as a, type PlanType as b, type SubscribeResult as c, type SubscriptionConfig as d, type SubscriptionDetail as e, SubscriptionManager as f, type SubscriptionPeriod as g, guardSubscription as h };
