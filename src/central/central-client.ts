// ---------------------------------------------------------------------------
// @agentxv2/sdk — CentralAgentClient (C-6 中心化 Agent 市场 · 2026-09-05)
// ---------------------------------------------------------------------------
// 中心化 Agent（agents.source='central'，负 ID）不发布在链上：
//   - 订阅计划存于网关 DB（central_plans），付费复用同一 x402 通道
//     （价格覆盖走 SubscriptionPayments.pay({ priceWei, period })）。
//   - 查询 / 订阅状态 / 我的订阅均为网关公开 HTTP API，SDK 在此封装，
//     第三方项目（如 AItrader）无需自行拼接网关 URL。
// 发布（POST /api/v1/agents/central）需要 JWT 或租户 API Key，由调用方自持，
// 本客户端只封装公开只读端点。
// ---------------------------------------------------------------------------

import { request } from '../payment/a2a-client'

/** 中心化 Agent 的订阅计划（与链上 subscriptionPlans 同一响应结构，订阅流程无感）。 */
export interface CentralPlan {
  planId: number
  /** wei，十进制字符串（避免 JS 精度丢失）。 */
  price: string
  /** 订阅周期：day | week | month | year。 */
  period: string
  payToken: 'native'
  isActive: boolean
  trialDays: number
  creator: string
}

/** 中心化 Agent 摘要（列表 / 详情响应）。 */
export interface CentralAgentSummary {
  id: number
  owner: string
  name: string
  description: string
  tags: string[]
  capabilities: string[]
  skills: string[]
  category: string
  isActive: boolean
  source: 'central'
  agentCreatedAt?: string
  syncedAt?: string | null
  createdAt?: string
  updatedAt?: string
  subscriptionPlans?: CentralPlan[]
}

/** 钱包的链下订阅记录（fiat_subscriptions，provider='x402'）。 */
export interface CentralSubscription {
  id: number
  agentId: number
  planId: number | null
  provider: string
  providerSubId: string | null
  status: string
  currency: string | null
  amountCents: number | null
  period: string | null
  startsAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CentralAgentClientOptions {
  /** AgentX Gateway 基础 URL，例如 https://agentx.0xainet.top。 */
  baseUrl: string
  /** 可选 JWT（已注册用户）——当前公开端点用不到，为扩展保留。 */
  accessToken?: string
}

export interface CentralAgentListFilters {
  activeOnly?: boolean
  category?: string
  page?: number
  pageSize?: number
}

/** 中心化 Agent 公开只读客户端：查询 / 订阅状态 / 我的订阅。 */
export class CentralAgentClient {
  constructor(private opts: CentralAgentClientOptions) {}

  private get base(): string {
    return this.opts.baseUrl.replace(/\/$/, '')
  }

  /**
   * 查询中心化 Agent 列表（公开）。固定 source='central'，
   * 与链上 Agent 天然隔离；page/pageSize 分页（网关默认 pageSize=50，上限 100）。
   */
  async list(filters: CentralAgentListFilters = {}): Promise<{ agents: CentralAgentSummary[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams({ source: 'central' })
    if (filters.activeOnly !== undefined) params.set('activeOnly', String(filters.activeOnly))
    if (filters.category) params.set('category', filters.category)
    if (filters.page !== undefined) params.set('page', String(filters.page))
    if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize))
    return request(this.base, `/api/v1/agents?${params.toString()}`, undefined, this.opts.accessToken)
  }

  /**
   * 查询单个中心化 Agent 详情（公开），含订阅计划（subscriptionPlans，
   * 与链上同一结构，可直接喂给 SubscriptionPayments.pay({ planId, priceWei, period })）。
   */
  async get(agentId: number): Promise<CentralAgentSummary> {
    return request(this.base, `/api/v1/agents/${agentId}`, undefined, this.opts.accessToken)
  }

  /**
   * 订阅状态检查（公开）：resolveAccess 链下优先——中心化 Agent（负 ID）无链上
   * 代币，访问记录在 fiat_subscriptions（x402 通道），由网关判定是否放行。
   */
  async checkSubscription(subscriber: string, agentId: number): Promise<{ chain: string; subscriber: string; agentId: number; active: boolean }> {
    const params = new URLSearchParams({ subscriber, agentId: String(agentId) })
    return request(this.base, `/api/v1/chain/check-subscription?${params.toString()}`, undefined, this.opts.accessToken)
  }

  /** 我的中心化订阅列表（公开，按钱包地址查询链下 fiat_subscriptions）。 */
  async mySubscriptions(subscriber: string): Promise<{ subscriptions: CentralSubscription[] }> {
    const params = new URLSearchParams({ subscriber })
    return request(this.base, `/api/v1/fiat/subscriptions?${params.toString()}`, undefined, this.opts.accessToken)
  }
}
