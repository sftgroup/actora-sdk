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
  /** 可选：注册用户 JWT（Authorization: Bearer）——发布/管理中心化 Agent 时使用。 */
  accessToken?: string
  /** 可选：租户 API Key（X-Api-Key）——发布/管理中心化 Agent 时使用（owner=partner-<slug>）。 */
  apiKey?: string
}

export interface CentralAgentListFilters {
  activeOnly?: boolean
  category?: string
  page?: number
  pageSize?: number
}

/** 发布中心化 Agent 的输入（POST /api/v1/agents/central）。 */
export interface CreateCentralAgentInput {
  name: string
  description?: string
  tags?: string[]
  capabilities?: string[]
  skills?: string[]
  category?: string
}

/** 更新中心化 Agent 的输入（PATCH 语义：仅更新提供的字段）。 */
export type UpdateCentralAgentInput = Partial<CreateCentralAgentInput> & { isActive?: boolean }

/** 添加中心化订阅计划（POST /api/v1/agents/central/:id/plans）。 */
export interface CreateCentralPlanInput {
  /** wei 十进制字符串（正数）。 */
  priceWei: string
  /** 周期：day | week | month | year（默认 month）。 */
  period?: string
}

/** 网关返回的计划行（central_plans）。 */
export interface CentralPlanRow {
  id: number
  agentId: number
  priceWei: string
  period: string
  active: boolean
}

/** 中心化 Agent 客户端：公开只读（查询/订阅状态/我的订阅）+ 鉴权管理（发布/更新/下架/计划）。 */
export class CentralAgentClient {
  constructor(private opts: CentralAgentClientOptions) {}

  private get base(): string {
    return this.opts.baseUrl.replace(/\/$/, '')
  }

  /** 鉴权头：X-Api-Key（租户 Key）；JWT 由 request 助手按 accessToken 追加 Bearer。 */
  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.opts.apiKey) headers['X-Api-Key'] = this.opts.apiKey
    return headers
  }

  // ── 公开只读 ─────────────────────────────────────────────────────────────

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

  // ── 鉴权管理（需 accessToken 或 apiKey）────────────────────────────────

  /**
   * 发布中心化 Agent（POST /api/v1/agents/central）。owner = 鉴权主体：
   * JWT → 注册用户钱包；租户 Key → partner-<slug>（平台自身名下，适合「平台为市场建 Agent」）。
   * 默认附带一个月度计划（作者可在管理页调整/停用）。
   */
  async create(input: CreateCentralAgentInput): Promise<{ agent: CentralAgentSummary }> {
    return request(
      this.base,
      '/api/v1/agents/central',
      { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(input) },
      this.opts.accessToken
    )
  }

  /** 我的中心化 Agent 列表（GET /api/v1/agents/central/mine，含订阅计划）。 */
  async listMine(): Promise<{ agents: CentralAgentSummary[] }> {
    return request(this.base, '/api/v1/agents/central/mine', { headers: this.authHeaders() }, this.opts.accessToken)
  }

  /** 更新中心化 Agent（PATCH 语义：仅更新提供的字段）。 */
  async update(agentId: number, input: UpdateCentralAgentInput): Promise<{ agent: CentralAgentSummary }> {
    return request(
      this.base,
      `/api/v1/agents/central/${agentId}`,
      { method: 'PATCH', headers: this.authHeaders(), body: JSON.stringify(input) },
      this.opts.accessToken
    )
  }

  /** 下架中心化 Agent（软删除 is_active=false，订阅访问随之失效）。 */
  async deactivate(agentId: number): Promise<{ success: boolean }> {
    return request(this.base, `/api/v1/agents/central/${agentId}`, { method: 'DELETE', headers: this.authHeaders() }, this.opts.accessToken)
  }

  /** 上架中心化 Agent（重新启用）。 */
  async activate(agentId: number): Promise<{ agent: CentralAgentSummary }> {
    return this.update(agentId, { isActive: true })
  }

  /** 添加订阅计划（priceWei 为 wei 十进制字符串）。 */
  async createPlan(agentId: number, input: CreateCentralPlanInput): Promise<{ plan: CentralPlanRow }> {
    return request(
      this.base,
      `/api/v1/agents/central/${agentId}/plans`,
      { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(input) },
      this.opts.accessToken
    )
  }

  /** 停用订阅计划（订阅访问随之失效）。 */
  async deactivatePlan(agentId: number, planId: number): Promise<{ success: boolean }> {
    return request(
      this.base,
      `/api/v1/agents/central/${agentId}/plans/${planId}`,
      { method: 'DELETE', headers: this.authHeaders() },
      this.opts.accessToken
    )
  }
}
