// ---------------------------------------------------------------------------
// @actora/sdk — Subscription Manager (ERC8004SubscriptionManager)
// ---------------------------------------------------------------------------
// Wraps erc8004-extensions/SubscriptionManager.sol:
//   — 订阅时即时分账（agent owner + platformFeeCollector），无托管、无 trial
//   — 计划类型：Subscription / UsageBased / Hybrid
//   — 续费沿用 `processPayment(subscriptionId)`（由网关 AA session key 触发）
// Uses viem PublicClient / WalletClient (chain-agnostic).
// ---------------------------------------------------------------------------

import { decodeEventLog, parseAbiItem, toEventHash } from 'viem'
import type { PublicClient, WalletClient, Account, Address, Hash, Hex } from 'viem'
import type { AgentSubscription } from '../core/types'

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

// ── Event ABI (for receipt parsing) ────────────────────────────────────────
// 注意：这两条事件来自 ERC8004SubscriptionManager（canonical 扩展版），
// 与旧版 SubscriptionManager 的 PlanCreated / Subscribed 字段完全不同。

const PLAN_CREATED_EVENT = parseAbiItem(
  'event PlanCreated(uint256 indexed planId, uint256 indexed agentId, string name, uint8 planType, address token, uint256 subscriptionPrice, uint256 usagePrice, uint8 billingPeriod, uint256 platformFeePercentage)'
)
const SUBSCRIBED_EVENT = parseAbiItem(
  'event SubscriptionCreated(uint256 indexed subscriptionId, uint256 indexed planId, uint256 indexed agentId, address subscriber, uint8 planType, uint256 startDate, uint256 nextBillingDate)'
)
const PLAN_CREATED_TOPIC = toEventHash(PLAN_CREATED_EVENT)
const SUBSCRIBED_TOPIC = toEventHash(SUBSCRIBED_EVENT)

// ── ABI Fragments (ERC8004SubscriptionManager) ─────────────────────────────

const SUBSCRIPTION_ABI_V2 = {
  // Admin
  defaultPlatformFee: {
    inputs: [] as const, name: 'defaultPlatformFee' as const,
    outputs: [{ name: '', type: 'uint256' }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  priceOracle: {
    inputs: [] as const, name: 'priceOracle' as const,
    outputs: [{ name: '', type: 'address' }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  identityRegistry: {
    inputs: [] as const, name: 'identityRegistry' as const,
    outputs: [{ name: '', type: 'address' }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  // Plans
  createPlan: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'planType', type: 'uint8' },
      { name: 'token', type: 'address' },
      { name: 'subscriptionPrice', type: 'uint256' },
      { name: 'usagePrice', type: 'uint256' },
      { name: 'billingPeriod', type: 'uint8' },
      { name: 'maxUsage', type: 'uint256' },
      { name: 'totalUsageLimit', type: 'uint256' },
    ] as const,
    name: 'createPlan' as const,
    outputs: [{ name: 'planId', type: 'uint256' }] as const,
    stateMutability: 'nonpayable' as const, type: 'function' as const,
  },
  getPlan: {
    inputs: [{ name: 'planId', type: 'uint256' }] as const,
    name: 'getPlan' as const,
    outputs: [{
      type: 'tuple' as const,
      components: [
        { name: 'planId', type: 'uint256' } as const,
        { name: 'agentId', type: 'uint256' } as const,
        { name: 'name', type: 'string' } as const,
        { name: 'description', type: 'string' } as const,
        { name: 'planType', type: 'uint8' } as const,
        { name: 'token', type: 'address' } as const,
        { name: 'subscriptionPrice', type: 'uint256' } as const,
        { name: 'usagePrice', type: 'uint256' } as const,
        { name: 'billingPeriod', type: 'uint8' } as const,
        { name: 'maxUsage', type: 'uint256' } as const,
        { name: 'totalUsageLimit', type: 'uint256' } as const,
        { name: 'isActive', type: 'bool' } as const,
        { name: 'createdAt', type: 'uint256' } as const,
        { name: 'platformFeePercentage', type: 'uint256' } as const,
      ],
    }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  // Subscribe
  subscribe: {
    inputs: [{ name: 'planId', type: 'uint256' }] as const,
    name: 'subscribe' as const,
    outputs: [{ name: 'subscriptionId', type: 'uint256' }] as const,
    stateMutability: 'payable' as const, type: 'function' as const,
  },
  // Renew（保持旧版 processPayment 语义：延长同一 subscriptionId）
  processPayment: {
    inputs: [{ name: 'subscriptionId', type: 'uint256' }] as const,
    name: 'processPayment' as const,
    outputs: [] as const,
    stateMutability: 'payable' as const, type: 'function' as const,
  },
  cancelSubscription: {
    inputs: [{ name: 'subscriptionId', type: 'uint256' }] as const,
    name: 'cancelSubscription' as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const, type: 'function' as const,
  },
  // Queries
  getSubscription: {
    inputs: [{ name: 'subscriptionId', type: 'uint256' }] as const,
    name: 'getSubscription' as const,
    outputs: [{
      type: 'tuple' as const,
      components: [
        { name: 'subscriptionId', type: 'uint256' } as const,
        { name: 'planId', type: 'uint256' } as const,
        { name: 'agentId', type: 'uint256' } as const,
        { name: 'subscriber', type: 'address' } as const,
        { name: 'status', type: 'uint8' } as const,
        { name: 'planType', type: 'uint8' } as const,
        { name: 'startDate', type: 'uint256' } as const,
        { name: 'nextBillingDate', type: 'uint256' } as const,
        { name: 'endDate', type: 'uint256' } as const,
        { name: 'currentPeriodUsage', type: 'uint256' } as const,
        { name: 'totalUsage', type: 'uint256' } as const,
        { name: 'remainingUsage', type: 'uint256' } as const,
        { name: 'totalPaid', type: 'uint256' } as const,
        { name: 'createdAt', type: 'uint256' } as const,
        { name: 'lastPaymentDate', type: 'uint256' } as const,
        { name: 'paymentToken', type: 'address' } as const,
      ],
    }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  hasActiveSubscription: {
    inputs: [
      { name: 'subscriber', type: 'address' },
      { name: 'agentId', type: 'uint256' },
    ] as const,
    name: 'hasActiveSubscription' as const,
    outputs: [{ name: '', type: 'bool' }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  getUserSubscriptions: {
    inputs: [{ name: 'user', type: 'address' }] as const,
    name: 'getUserSubscriptions' as const,
    outputs: [{
      type: 'tuple[]' as const,
      components: [
        { name: 'subscriptionId', type: 'uint256' } as const,
        { name: 'planId', type: 'uint256' } as const,
        { name: 'agentId', type: 'uint256' } as const,
        { name: 'subscriber', type: 'address' } as const,
        { name: 'status', type: 'uint8' } as const,
        { name: 'planType', type: 'uint8' } as const,
        { name: 'startDate', type: 'uint256' } as const,
        { name: 'nextBillingDate', type: 'uint256' } as const,
        { name: 'endDate', type: 'uint256' } as const,
        { name: 'currentPeriodUsage', type: 'uint256' } as const,
        { name: 'totalUsage', type: 'uint256' } as const,
        { name: 'remainingUsage', type: 'uint256' } as const,
        { name: 'totalPaid', type: 'uint256' } as const,
        { name: 'createdAt', type: 'uint256' } as const,
        { name: 'lastPaymentDate', type: 'uint256' } as const,
        { name: 'paymentToken', type: 'address' } as const,
      ],
    }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  // Oracle whitelist
  isTokenSupported: {
    inputs: [{ name: 'token', type: 'address' }] as const,
    name: 'isTokenSupported' as const,
    outputs: [{ name: '', type: 'bool' }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
  // Identity owner（PlanDetail.creator 派生）
  ownerOf: {
    inputs: [{ name: 'tokenId', type: 'uint256' }] as const,
    name: 'ownerOf' as const,
    outputs: [{ name: '', type: 'address' }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
} as const

// ── ERC20 ABI (approve) ────────────────────────────────────────────────────

const ERC20_ABI = {
  approve: {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ] as const,
    name: 'approve' as const,
    outputs: [{ name: '', type: 'bool' }] as const,
    stateMutability: 'nonpayable' as const, type: 'function' as const,
  },
  allowance: {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ] as const,
    name: 'allowance' as const,
    outputs: [{ name: '', type: 'uint256' }] as const,
    stateMutability: 'view' as const, type: 'function' as const,
  },
} as const

// ── Types ──────────────────────────────────────────────────────────────────

export interface SubscriptionConfig {
  contractAddress: Address
  publicClient: PublicClient
  walletClient: WalletClient
}

/** PlanType enum: 0=Subscription, 1=UsageBased, 2=Hybrid. */
export type PlanType = 0 | 1 | 2

export interface PlanDetail {
  planId: number
  agentId: number
  /** Agent owner, derived via `identityRegistry.ownerOf(agentId)`. */
  creator: Address
  /** Alias of `subscriptionPrice` (kept for existing callers). */
  price: bigint
  /** Billing period name: day | week | month | quarter | year. */
  period: string
  active: boolean
  /** ERC-20 pay token; address(0) = native token. */
  payToken: Address
  /** Always 0 — ERC8004SubscriptionManager has no trial period. */
  trialDays: number
  name: string
  description: string
  planType: PlanType
  subscriptionPrice: bigint
  usagePrice: bigint
  billingPeriod: number
  /** Max usage per billing period (0 = unlimited). */
  maxUsage: bigint
  /** Total usage limit for usage-based plans (0 = unlimited). */
  totalUsageLimit: bigint
  /** Platform fee snapshot in basis points (100 = 1%). */
  platformFeePercentage: number
}

export interface SubscriptionDetail {
  subscriptionId: number
  planId: number
  subscriber: Address
  agentId: number
  /** 0=Active, 1=Cancelled, 2=Expired, 3=PaymentFailed, 4=Suspended */
  status: number
  planType: PlanType
  startedAt: number
  /** Next charge date. Usage-based plans keep this at the start date. */
  nextBillingDate: number
  endDate: number
  /** Billing period name: day | week | month | quarter | year. */
  period: string
  payToken: Address
  amountPaid: bigint
  currentPeriodUsage: bigint
  totalUsage: bigint
  remainingUsage: bigint
  lastPaymentDate: number
}

// On-chain `SubscriptionStatus` enum (erc8004-extensions/SubscriptionManager.sol):
//   0=Active, 1=Cancelled, 2=Expired, 3=PaymentFailed, 4=Suspended
// `AgentSubscription` models only four states, so the two failure states
// (PaymentFailed / Suspended) surface as 'pending'.
const SUBSCRIPTION_STATUS_NAMES: Record<number, AgentSubscription['status']> = {
  0: 'active',
  1: 'cancelled',
  2: 'expired',
  3: 'pending',
  4: 'pending',
}

// ── Period ─────────────────────────────────────────────────────────────────
// On-chain `BillingPeriod` enum: 0=Daily, 1=Weekly, 2=Monthly, 3=Quarterly,
// 4=Yearly. Typed here so consumers cannot pass 'monthly' and silently get a
// 30-day plan.

export const SUBSCRIPTION_PERIODS = ['day', 'week', 'month', 'quarter', 'year'] as const
export type SubscriptionPeriod = (typeof SUBSCRIPTION_PERIODS)[number]

const BILLING_PERIOD_NAMES = ['day', 'week', 'month', 'quarter', 'year'] as const
const BILLING_PERIOD_TO_ENUM: Record<SubscriptionPeriod, number> = {
  day: 0,
  week: 1,
  month: 2,
  quarter: 3,
  year: 4,
}

/** On-chain default `gracePeriod` (3 days); subscriptions stay valid within it. */
const GRACE_PERIOD_SECONDS = 3 * 24 * 60 * 60

export interface CreatePlanParams {
  agentId: number
  /** Plan name — required on-chain (non-empty). Defaults to `Plan #<agentId>`. */
  name?: string
  description?: string
  /** 0=Subscription (default), 1=UsageBased, 2=Hybrid. */
  planType?: PlanType
  /** Recurring price in wei / token units. Required unless planType=1. */
  price?: bigint
  /** Per-use price. Required when planType is 1 or 2. */
  usagePrice?: bigint
  /** Must be one of: day | week | month | quarter | year. */
  period: SubscriptionPeriod
  /** ERC20 pay token; default zero address = native token. */
  payToken?: Address
  /** Max usage per billing period (0 = unlimited). */
  maxUsage?: bigint
  /** Total usage limit (0 = unlimited). */
  totalUsageLimit?: bigint
}

export interface CreatePlanResult {
  planId: number
  txHash: Hash
}

export interface SubscribeResult {
  subscriptionId: number
  txHash: Hash
  subscriber: Address
  agentId: number
  /** Unix timestamp (seconds) of the next scheduled charge. */
  nextBillingDate: number
}

// ── Raw on-chain shapes (viem decodes structs to named objects) ─────────────

interface RawPlan {
  planId: bigint
  agentId: bigint
  name: string
  description: string
  planType: number
  token: string
  subscriptionPrice: bigint
  usagePrice: bigint
  billingPeriod: number
  maxUsage: bigint
  totalUsageLimit: bigint
  isActive: boolean
  createdAt: bigint
  platformFeePercentage: bigint
}

interface RawSubscription {
  subscriptionId: bigint
  planId: bigint
  agentId: bigint
  subscriber: string
  status: number
  planType: number
  startDate: bigint
  nextBillingDate: bigint
  endDate: bigint
  currentPeriodUsage: bigint
  totalUsage: bigint
  remainingUsage: bigint
  totalPaid: bigint
  createdAt: bigint
  lastPaymentDate: bigint
  paymentToken: string
}

// ── Subscription Manager ───────────────────────────────────────────────────

export class SubscriptionManager {
  private address: Address
  private publicClient: PublicClient
  private walletClient: WalletClient

  constructor(config: SubscriptionConfig) {
    this.address = config.contractAddress
    this.publicClient = config.publicClient
    this.walletClient = config.walletClient
  }

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
  private async _resolveAccount(): Promise<Account | Address> {
    const clientAccount = this.walletClient.account as Account | undefined
    if (clientAccount) return clientAccount
    const [address] = await this.walletClient.getAddresses()
    if (!address) throw new Error('Wallet not connected')
    return address
  }

  // ── Config Read ──────────────────────────────────────────────────────────

  /** Get the default platform fee in basis points (e.g. 250 = 2.5%). */
  async getPlatformFeeBps(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.defaultPlatformFee],
      functionName: 'defaultPlatformFee',
    })
    return Number(result)
  }

  /** Check whether an ERC-20 token is accepted by the plan price oracle. */
  async isTokenWhitelisted(token: Address): Promise<boolean> {
    const oracle = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.priceOracle],
      functionName: 'priceOracle',
    })
    const result = await this.publicClient.readContract({
      address: oracle as Address,
      abi: [SUBSCRIPTION_ABI_V2.isTokenSupported],
      functionName: 'isTokenSupported',
      args: [token],
    })
    return result as boolean
  }

  // ── Plans ────────────────────────────────────────────────────────────────

  /** Get full plan details; `creator` is the identity owner of `agentId`. */
  async getPlan(planId: number): Promise<PlanDetail> {
    const r = await this._readPlanRaw(planId)
    return {
      planId: Number(r.planId),
      agentId: Number(r.agentId),
      creator: await this._agentOwner(Number(r.agentId)),
      price: r.subscriptionPrice,
      period: BILLING_PERIOD_NAMES[Number(r.billingPeriod)] ?? 'month',
      active: r.isActive,
      payToken: r.token as Address,
      trialDays: 0,
      name: r.name,
      description: r.description,
      planType: Number(r.planType) as PlanType,
      subscriptionPrice: r.subscriptionPrice,
      usagePrice: r.usagePrice,
      billingPeriod: Number(r.billingPeriod),
      maxUsage: r.maxUsage,
      totalUsageLimit: r.totalUsageLimit,
      platformFeePercentage: Number(r.platformFeePercentage),
    }
  }

  /**
   * Create a subscription plan for an agent.
   *
   * @param params.period  Must be 'day' | 'week' | 'month' | 'quarter' | 'year'.
   * @returns              { planId, txHash } (planId parsed from PlanCreated event)
   */
  async createPlan(params: CreatePlanParams): Promise<CreatePlanResult> {
    const {
      agentId,
      name = `Plan #${agentId}`,
      description = '',
      planType = 0,
      price = 0n,
      usagePrice = 0n,
      period,
      payToken = ZERO_ADDRESS,
      maxUsage = 0n,
      totalUsageLimit = 0n,
    } = params

    const billingPeriod = BILLING_PERIOD_TO_ENUM[period]
    if (billingPeriod === undefined) {
      throw new Error(
        `Invalid period "${period}". Must be one of: ${SUBSCRIPTION_PERIODS.join(', ')}`
      )
    }
    if (planType !== 1 && price <= 0n) {
      throw new Error('price must be > 0 for subscription/hybrid plans')
    }
    if (planType !== 0 && usagePrice <= 0n) {
      throw new Error('usagePrice must be > 0 for usage-based/hybrid plans')
    }

    const account = await this._resolveAccount()

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.createPlan],
      functionName: 'createPlan',
      args: [
        BigInt(agentId),
        name,
        description,
        planType,
        payToken,
        price,
        usagePrice,
        billingPeriod,
        maxUsage,
        totalUsageLimit,
      ],
    })
    const hash = await this.walletClient.writeContract({ ...request, account })
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    return { planId: this._parsePlanIdFromReceipt(receipt), txHash: hash }
  }

  /**
   * Subscribe to a plan.
   * For ETH plans: pass valueWei = plan.price.
   * For ERC20 plans: auto-detects from plan.payToken, calls approve + subscribe.
   *                    User must have approved this contract for plan.price tokens.
   *
   * @returns SubscribeResult — subscriptionId/nextBillingDate/subscriber parsed
   *          from the SubscriptionCreated event (no longer hardcoded to 0).
   */
  async subscribe(
    planId: number,
    opts?: { valueWei?: bigint; approveTokenFirst?: boolean }
  ): Promise<SubscribeResult> {
    const account = await this._resolveAccount()

    const plan = await this.getPlan(planId)
    if (!plan.active) throw new Error('Plan not active')

    if (plan.payToken === ZERO_ADDRESS) {
      // ── ETH ──
      const value = opts?.valueWei ?? plan.price

      const { request } = await this.publicClient.simulateContract({
        account,
        address: this.address,
        abi: [SUBSCRIPTION_ABI_V2.subscribe],
        functionName: 'subscribe',
        args: [BigInt(planId)],
        value,
      })
      const hash = await this.walletClient.writeContract({ ...request, account })
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return { txHash: hash, ...this._parseSubscribedFromReceipt(receipt) }
    } else {
      // ── ERC20 ──
      const accountAddress = typeof account === 'string' ? account : account.address
      // Optionally approve first
      if (opts?.approveTokenFirst !== false) {
        const allowance = await this.publicClient.readContract({
          address: plan.payToken,
          abi: [ERC20_ABI.allowance],
          functionName: 'allowance',
          args: [accountAddress, this.address],
        })
        if ((allowance as bigint) < plan.price) {
          const { request: approveReq } = await this.publicClient.simulateContract({
            account,
            address: plan.payToken,
            abi: [ERC20_ABI.approve],
            functionName: 'approve',
            args: [this.address, plan.price],
          })
          await this.walletClient.writeContract({ ...approveReq, account })
        }
      }

      const { request } = await this.publicClient.simulateContract({
        account,
        address: this.address,
        abi: [SUBSCRIPTION_ABI_V2.subscribe],
        functionName: 'subscribe',
        args: [BigInt(planId)],
      })
      const hash = await this.walletClient.writeContract({ ...request, account })
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return { txHash: hash, ...this._parseSubscribedFromReceipt(receipt) }
    }
  }

  /**
   * One-step createPlan + subscribe (two transactions).
   * Saves the caller one round of plan lookup when the plan does not exist yet.
   */
  async createPlanAndSubscribe(params: CreatePlanParams): Promise<CreatePlanResult & SubscribeResult> {
    const { planId } = await this.createPlan(params)
    const subscribed = await this.subscribe(planId)
    return { planId, ...subscribed }
  }

  /** Cancel subscription. ERC8004SubscriptionManager settles payments immediately. */
  async cancel(subscriptionId: number): Promise<Hash> {
    const account = await this._resolveAccount()

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.cancelSubscription],
      functionName: 'cancelSubscription',
      args: [BigInt(subscriptionId)],
    })
    return this.walletClient.writeContract({ ...request, account })
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async hasActiveSubscription(subscriber: Address, agentId: number): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.hasActiveSubscription],
      functionName: 'hasActiveSubscription',
      args: [subscriber, BigInt(agentId)],
    })
    return result as boolean
  }

  /**
   * Latest subscription of `subscriber` for `agentId`.
   *
   * ERC8004SubscriptionManager indexes subscriptions by ID only, so this scans
   * `getUserSubscriptions(subscriber)`. Prefers an active, non-expired entry;
   * otherwise falls back to the newest one.
   */
  async getSubscription(subscriber: Address, agentId: number): Promise<AgentSubscription | null> {
    const subs = await this._readUserSubscriptions(subscriber)
    const matches = subs.filter((s) => Number(s.agentId) === Number(agentId))
    if (matches.length === 0) return null

    const now = Math.floor(Date.now() / 1000)
    const usable = matches.filter(
      (s) =>
        Number(s.status) === 0 &&
        (Number(s.planType) === 1 ||
          now <= Number(s.nextBillingDate) + GRACE_PERIOD_SECONDS)
    )
    const picked = [...(usable.length > 0 ? usable : matches)].sort(
      (a, b) => Number(b.subscriptionId) - Number(a.subscriptionId)
    )[0]
    if (!picked) return null
    const plan = await this._readPlanRaw(Number(picked.planId))

    return {
      subscriptionId: Number(picked.subscriptionId),
      subscriber: picked.subscriber as Address,
      agentId: Number(picked.agentId),
      status: SUBSCRIPTION_STATUS_NAMES[Number(picked.status)] ?? 'pending',
      startedAt: Number(picked.startDate),
      expiresAt: Number(picked.nextBillingDate),
      period: BILLING_PERIOD_NAMES[Number(plan.billingPeriod)] ?? 'month',
    }
  }

  /** Full subscription detail (status, usage counters, payment token). */
  async getSubscriptionDetail(subscriptionId: number): Promise<SubscriptionDetail> {
    const s = await this._readSubscription(subscriptionId)
    const plan = await this._readPlanRaw(Number(s.planId))

    return {
      subscriptionId: Number(s.subscriptionId),
      planId: Number(s.planId),
      subscriber: s.subscriber as Address,
      agentId: Number(s.agentId),
      status: Number(s.status),
      planType: Number(s.planType) as PlanType,
      startedAt: Number(s.startDate),
      nextBillingDate: Number(s.nextBillingDate),
      endDate: Number(s.endDate),
      period: BILLING_PERIOD_NAMES[Number(plan.billingPeriod)] ?? 'month',
      payToken: s.paymentToken as Address,
      amountPaid: s.totalPaid,
      currentPeriodUsage: s.currentPeriodUsage,
      totalUsage: s.totalUsage,
      remainingUsage: s.remainingUsage,
      lastPaymentDate: Number(s.lastPaymentDate),
    }
  }

  /** All subscription IDs owned by a wallet. */
  async getUserSubscriptions(user: Address): Promise<number[]> {
    const subs = await this._readUserSubscriptions(user)
    return subs.map((s) => Number(s.subscriptionId))
  }

  // ── Raw reads ────────────────────────────────────────────────────────────

  private async _readPlanRaw(planId: number): Promise<RawPlan> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.getPlan],
      functionName: 'getPlan',
      args: [BigInt(planId)],
    })
    return result as unknown as RawPlan
  }

  private async _readSubscription(subscriptionId: number): Promise<RawSubscription> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.getSubscription],
      functionName: 'getSubscription',
      args: [BigInt(subscriptionId)],
    })
    return result as unknown as RawSubscription
  }

  private async _readUserSubscriptions(user: Address): Promise<RawSubscription[]> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.getUserSubscriptions],
      functionName: 'getUserSubscriptions',
      args: [user],
    })
    return result as unknown as RawSubscription[]
  }

  /** Plan creator — the identity (ERC-721) owner of `agentId`. */
  private async _agentOwner(agentId: number): Promise<Address> {
    const registry = await this.publicClient.readContract({
      address: this.address,
      abi: [SUBSCRIPTION_ABI_V2.identityRegistry],
      functionName: 'identityRegistry',
    })
    return this.publicClient.readContract({
      address: registry as Address,
      abi: [SUBSCRIPTION_ABI_V2.ownerOf],
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    }) as Promise<Address>
  }

  // ── Receipt parsing (event-driven, no hardcoded IDs) ─────────────────────

  private _findEventLog(receipt: { logs: readonly unknown[] }, topic: Hex) {
    return receipt.logs.find((l) => (l as { topics?: readonly unknown[] }).topics?.[0] === topic)
  }

  /** Parse planId from the PlanCreated event in a transaction receipt. */
  private _parsePlanIdFromReceipt(receipt: { logs: readonly unknown[] }): number {
    const log = this._findEventLog(receipt, PLAN_CREATED_TOPIC)
    if (!log) {
      throw new Error('PlanCreated event not found in transaction receipt')
    }
    const decoded = decodeEventLog({
      abi: [PLAN_CREATED_EVENT],
      data: (log as { data: Hex }).data,
      topics: (log as { topics: [Hex, ...Hex[]] }).topics,
    })
    return Number(decoded.args.planId)
  }

  /** Parse subscriptionId/subscriber/agentId/nextBillingDate from SubscriptionCreated. */
  private _parseSubscribedFromReceipt(receipt: { logs: readonly unknown[] }): Omit<SubscribeResult, 'txHash'> {
    const log = this._findEventLog(receipt, SUBSCRIBED_TOPIC)
    if (!log) {
      throw new Error('SubscriptionCreated event not found in transaction receipt')
    }
    const decoded = decodeEventLog({
      abi: [SUBSCRIBED_EVENT],
      data: (log as { data: Hex }).data,
      topics: (log as { topics: [Hex, ...Hex[]] }).topics,
    })
    return {
      subscriptionId: Number(decoded.args.subscriptionId),
      subscriber: decoded.args.subscriber as Address,
      agentId: Number(decoded.args.agentId),
      nextBillingDate: Number(decoded.args.nextBillingDate),
    }
  }
}

// ── Subscription Guard ─────────────────────────────────────────────────────

export async function guardSubscription(
  manager: SubscriptionManager,
  user: Address,
  agentId: number
): Promise<AgentSubscription> {
  const active = await manager.hasActiveSubscription(user, agentId)
  if (!active) {
    throw new Error(
      `No active subscription for agent #${agentId}. ` +
      `Address ${user} must purchase a subscription first.`
    )
  }
  const sub = await manager.getSubscription(user, agentId)
  if (!sub) throw new Error(`Subscription not found for agent #${agentId}`)
  return sub
}
