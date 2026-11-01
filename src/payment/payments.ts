// ---------------------------------------------------------------------------
// @actora/sdk — SubscriptionPayments: unified three-rail subscription payment
// ---------------------------------------------------------------------------
// A single entry point for subscribing across all Actora payment rails:
//
//   method: 'chain'  → on-chain SubscriptionManager (native / ERC20, escrow)
//   method: 'fiat'   → Stripe Checkout（网关自建 rail，返回 sessionUrl 供跳转）
//   method: 'x402'   → native-token period payment via the unified endpoint
//
// 0.9.0: the fiat / x402 / access rails now talk to the generic
// `@keelcodes/payments` engine through the Gateway's unified endpoint
// (/api/v1/payments) via PaymentsClient. Actora subscription semantics
// (planId/agentId/subscription state) still live here — the generic module
// never interprets them.
// ---------------------------------------------------------------------------

import type { Address, Hash, WalletClient } from 'viem'
import { PaymentsClient } from '@keelcodes/payments'
import type { ChainKey as PaymentsChainKey } from '@keelcodes/payments'
import { SubscriptionManager } from '../subscription/subscription'

export type SubscriptionPaymentMethod = 'chain' | 'fiat' | 'x402'
export type SubscriptionPeriod = 'day' | 'week' | 'month' | 'year'
// @keelcodes/payments 自 0.2.0 起 ChainKey = string（不再枚举具体链），
// SDK 直接沿用引擎类型，避免自维护枚举与新链不同步。
export type ChainKey = PaymentsChainKey

export interface SubscriptionPaymentsConfig {
  /** Actora Gateway base URL (required for fiat / x402 rails). */
  gatewayUrl?: string
  /** Optional gateway bearer token. */
  accessToken?: string
  /** Chain rail — required for `method: 'chain'` and for automatic x402 payment. */
  subscriptionManager?: SubscriptionManager
  /** Wallet used to automatically fund an x402 payment (if txHash is not supplied). */
  walletClient?: WalletClient
  /** Which chain to verify x402 payments on (default: bsc). */
  chain?: ChainKey
}

export interface PaySubscriptionInput {
  planId: number
  agentId: number
  method: SubscriptionPaymentMethod
  /** Buyer wallet. Required for fiat / x402; chain resolves from the wallet client. */
  subscriber?: Address
  /** Chain rail: native value override (defaults to the plan price). */
  valueWei?: bigint
  /** Chain rail: approve the ERC20 token before subscribing. */
  approveTokenFirst?: boolean
  /** Fiat rail: amount in minor units (cents). Optional — the Gateway
   *  auto-prices from the on-chain plan when planId is sent without it. */
  amountCents?: number
  /** Fiat rail: currency code (default 'usd'). */
  currency?: string
  /** Fiat rail: redirect targets after Stripe checkout. */
  successUrl?: string
  cancelUrl?: string
  /** x402 rail: already-sent on-chain payment tx. When omitted and a wallet
   *  client is configured, the payment is sent automatically. */
  txHash?: string
  /** x402 rail: plan price in wei. When set, the automatic x402 payment uses
   *  this amount instead of reading the plan from the chain contract — needed
   *  for centralized agents whose plans live off-chain (central_plans). */
  priceWei?: bigint
  /** Billing period (default 'month'). */
  period?: SubscriptionPeriod
}

export type PaySubscriptionResult =
  | { method: 'chain'; subscriptionId: number; txHash: Hash }
  | { method: 'fiat'; sessionUrl: string; sessionId: string; redirect: true }
  | { method: 'x402'; subscriptionId: number; txHash: string; creditedWei?: string }

/** x402 protocol discovery returned by the unified endpoint. */
export interface X402Info {
  enabled: boolean
  priceWei: string
  payTo: string
  network: string
  chain: ChainKey
}

const PERIODS: readonly SubscriptionPeriod[] = ['day', 'week', 'month', 'year']

export class SubscriptionPayments {
  private client: PaymentsClient | null

  constructor(private config: SubscriptionPaymentsConfig) {
    this.client = config.gatewayUrl
      ? new PaymentsClient({ baseUrl: config.gatewayUrl, accessToken: config.accessToken })
      : null
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Pay for (or renew) a subscription using the chosen rail. */
  async pay(input: PaySubscriptionInput): Promise<PaySubscriptionResult> {
    switch (input.method) {
      case 'chain':
        return this._payChain(input)
      case 'fiat':
        return this._payFiat(input)
      case 'x402':
        return this._payX402(input)
    }
  }

  /**
   * Unified access check across all rails (chain OR fiat/x402) via the
   * unified /api/v1/payments/access endpoint.
   */
  async hasAccess(agentId: number, subscriber: Address): Promise<boolean> {
    if (!this.client) {
      throw new Error('hasAccess() requires a gatewayUrl')
    }
    const res = await this.client.access(subscriber, agentId, (this.config.chain ?? 'bsc') as PaymentsChainKey)
    return res.active === true
  }

  /**
   * x402 protocol discovery (price / pay-to wallet / network).
   * @param agentId 传入时返回**该 agent 的收款地址**（`agents.payout_address`），
   *   让自动付款直接付给开发者；未配置该地址时网关回 409 PAYOUT_NOT_CONFIGURED。
   */
  async fetchX402Info(agentId?: number): Promise<X402Info> {
    if (!this.client) {
      throw new Error('fetchX402Info() requires a gatewayUrl')
    }
    if (agentId === undefined) {
      const info = await this.client.info()
      return {
        enabled: Boolean(info.x402?.enabled),
        priceWei: info.x402?.priceWei ?? '0',
        payTo: info.x402?.payTo ?? '',
        network: info.x402?.network ?? '',
        chain: (info.x402?.chain ?? this.config.chain ?? 'bsc') as ChainKey,
      }
    }
    // Keel client.info() 不支持带参：按 agent 取收款地址走网关原生端点。
    const info = await this._fetchJson<{
      enabled?: boolean
      priceWei?: string
      payTo?: string
      network?: string
      chain?: string
    }>(`/api/v1/x402/info?agentId=${encodeURIComponent(String(agentId))}`)
    return {
      enabled: Boolean(info.enabled),
      priceWei: info.priceWei ?? '0',
      payTo: info.payTo ?? '',
      network: info.network ?? '',
      chain: (info.chain ?? this.config.chain ?? 'bsc') as ChainKey,
    }
  }

  // ── Rails ───────────────────────────────────────────────────────────────

  private async _payChain(input: PaySubscriptionInput): Promise<PaySubscriptionResult> {
    const sm = this.config.subscriptionManager
    if (!sm) throw new Error('method "chain" requires a SubscriptionManager in the config')
    const result = await sm.subscribe(input.planId, {
      valueWei: input.valueWei,
      approveTokenFirst: input.approveTokenFirst,
    })
    return { method: 'chain', subscriptionId: result.subscriptionId, txHash: result.txHash }
  }

  private async _payFiat(input: PaySubscriptionInput): Promise<PaySubscriptionResult> {
    // 2026-11-01：网关自建 Stripe rail 已接回（gateway/services/stripe.ts），
    // SDK 只需转发意图；**金额由网关按计划价服务端折算**，amountCents 仅作兼容保留。
    if (!this.client) throw new Error('method "fiat" requires a gatewayUrl')
    if (!input.subscriber) throw new Error('method "fiat" requires a subscriber address')
    if (!PERIODS.includes(input.period ?? 'month')) {
      throw new Error('period must be one of: day | week | month | year')
    }

    const data = await this._fetchJson<{ sessionUrl?: string; sessionId?: string; paymentId?: string }>('/api/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'fiat',
        subscriber: input.subscriber,
        agentId: input.agentId,
        planId: input.planId,
        period: input.period ?? 'month',
        currency: input.currency ?? 'usd',
        chain: this.config.chain ?? 'bsc',
        amountCents: input.amountCents,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      }),
    })
    if (!data.sessionUrl) throw new Error('fiat: gateway did not return a checkout session url')
    return {
      method: 'fiat',
      sessionUrl: data.sessionUrl,
      sessionId: data.sessionId ?? data.paymentId ?? '',
      redirect: true,
    }
  }

  private async _payX402(input: PaySubscriptionInput): Promise<PaySubscriptionResult> {
    if (!this.client) throw new Error('method "x402" requires a gatewayUrl')
    if (!input.subscriber) throw new Error('method "x402" requires a subscriber address')
    if (!PERIODS.includes(input.period ?? 'month')) {
      throw new Error('period must be one of: day | week | month | year')
    }

    // Automatically fund the payment when no txHash is supplied.
    let txHash = input.txHash
    if (!txHash) {
      txHash = await this._autoFundX402(input)
    }

    // The x402 subscription is Actora business (planId/agentId/txHash), so it
    // hits the unified endpoint with the full body — the generic client only
    // models rails, not subscription semantics.
    const data = await this._fetchJson<{ subscriptionId: number; creditedWei?: string }>('/api/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'x402',
        subscriber: input.subscriber,
        agentId: input.agentId,
        planId: input.planId,
        period: input.period ?? 'month',
        txHash,
        chain: this.config.chain ?? 'bsc',
      }),
    })
    return {
      method: 'x402',
      subscriptionId: data.subscriptionId,
      txHash,
      creditedWei: data.creditedWei,
    }
  }

  /** Send the on-chain native transfer to the platform wallet (x402 rail). */
  private async _autoFundX402(input: PaySubscriptionInput): Promise<string> {
    const { walletClient, subscriptionManager } = this.config
    if (!walletClient || !subscriptionManager) {
      throw new Error('x402 automatic payment needs a txHash, or a walletClient + subscriptionManager in the config')
    }
    // 按 agent 取收款地址：网关返回该 agent 的 payout_address（钱直达开发者）。
    const info = await this.fetchX402Info(input.agentId)
    if (!info.payTo) {
      throw new Error(`x402 payment target unavailable for agent ${input.agentId} (payout_address not configured)`)
    }
    if (!info.enabled) {
      throw new Error('x402 is not enabled on the Gateway (X402_ENABLED missing)')
    }
    const priceWei = BigInt(info.priceWei || '0')
    // Centralized agents have no on-chain plan — the caller supplies the plan
    // price directly (central_plans); otherwise read it from the chain.
    const amount = input.priceWei !== undefined
      ? (input.priceWei > priceWei ? input.priceWei : priceWei)
      : (async () => {
          const plan = await subscriptionManager!.getPlan(input.planId)
          return plan.price > priceWei ? plan.price : priceWei
        })()
    const resolvedAmount = typeof amount === 'bigint' ? amount : await amount
    let account = (walletClient.account as { address?: Address } | undefined)?.address
    if (!account) {
      const [addr] = await walletClient.getAddresses()
      account = addr
    }
    if (!account) throw new Error('Wallet not connected for x402 payment')
    const hash = await walletClient.sendTransaction({
      to: info.payTo as Address,
      value: resolvedAmount,
      chain: undefined,
      account,
    })
    return hash
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────

  private async _fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const base = (this.config.gatewayUrl ?? '').replace(/\/$/, '')
    const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) }
    if (this.config.accessToken) headers.Authorization = `Bearer ${this.config.accessToken}`
    const resp = await fetch(`${base}${path}`, { ...init, headers })
    if (!resp.ok) {
      let message = `Gateway request failed (${resp.status}): ${path}`
      try {
        const body = (await resp.json()) as { error?: string }
        if (body.error) message = body.error
      } catch { /* non-JSON error body */ }
      throw new Error(message)
    }
    return (await resp.json()) as T
  }
}
