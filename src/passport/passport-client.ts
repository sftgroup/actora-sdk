// ---------------------------------------------------------------------------
// @actora/sdk — 护照客户端（076）
// ---------------------------------------------------------------------------
// 把「护照 / 回执 / 声誉 / 收款地址 / Webhook / 一源多发」这些网关读接口收在
// 一个客户端里，第三方项目不必自己拼 URL 与类型。
//
//   GET  /api/v1/agents/:id?chain=                     护照（描述来源 / 端点 / 声誉三态）
//   GET  /api/v1/receipts/:receiptId                   单张回执 + 平台验签结果
//   GET  /api/v1/receipts?chain=&agentId=&subject=     回执列表（至少一个过滤条件）
//   GET  /api/v1/agents/:chain/:agentId/payout         收款地址（公开读）
//   PUT  /api/v1/agents/:chain/:agentId/payout         收款地址（owner 写，需鉴权）
//   GET  /api/v1/webhooks                              自己的 Webhook 订阅（需鉴权）
//   POST /api/v1/webhooks                              新建订阅（secret 只返回一次）
//   DELETE /api/v1/webhooks/:id                        撤销订阅
//   GET  /api/v1/agents/:chain/:agentId/publish-plan    一源多发物料
//
// 语义约束（与网关一致）：
//   - 平台不代收、不抽成；`setPayout(..., null)` = 撤回收款意图，此后不再生成 402。
//   - 发布计划只产出物料，**不代开发者向第三方平台发请求**。
//   - 声誉是「观测了多少」，`unobserved` 时 `successRate` 为 null 而不是 0。
// ---------------------------------------------------------------------------

export type PassportChain = 'central' | 'bsc' | 'ethereum' | 'base'

export type EndpointKind = 'a2a' | 'mcp' | 'openapi' | 'x402'
export type EndpointStatus = 'pending' | 'live' | 'failed' | 'delisted'

export interface AgentSpecSnapshot {
  specVersion: string
  name: string
  description: string
  category: string
  tags: string[]
  capabilities: string[]
  skills: unknown[]
  card: Record<string, unknown>
  /** derived = 链上派生；declared = 开发者显式声明（派生刷新不会覆盖）。 */
  origin: 'derived' | 'declared'
  updatedAt: string | null
}

export interface AgentEndpointSnapshot {
  id: number
  kind: EndpointKind
  url: string
  protocolVersion: string
  isPrimary: boolean
  status: EndpointStatus
  probeResult: unknown
  probedAt: string | null
  retryAfter: string | null
}

/** 声誉三态：verified（观测充分）/ limited（有观测但不足）/ unobserved（无观测）。 */
export interface AgentReputationBucket {
  state: 'verified' | 'limited' | 'unobserved'
  observationCount: number
  receiptCount: number
  okCount: number
  errorCount: number
  settlementCount: number
  feedbackCount: number
  /** 无回执时为 null（不是 0）。 */
  successRate: number | null
  avgLatencyMs: number | null
  lastActivityAt: string | null
  computedAt: string | null
}

export interface AgentPassport {
  id: number
  chain: string
  owner: string
  name: string
  description: string
  tags: string[]
  capabilities: string[]
  spec: AgentSpecSnapshot | null
  endpoints: AgentEndpointSnapshot[]
  reputation: AgentReputationBucket | null
}

export type ReceiptKind = 'run' | 'task' | 'a2a'
export type ReceiptRail = 'none' | 'owner' | 'entitlement' | 'subscription' | 'per_call'
export type ReceiptStatus = 'ok' | 'error'

export interface Receipt {
  receiptId: string
  chain: string
  agentId: number
  kind: ReceiptKind
  subject: string
  rail: ReceiptRail
  reference: string
  amountWei: string
  payTo: string
  status: ReceiptStatus
  requestHash: string
  responseHash: string
  latencyMs: number | null
  meta: Record<string, unknown>
  issuer: string
  signature: string
  issuedAt: string
  /** 是否带平台签名（未配置签名密钥时为 false）。 */
  signed: boolean
}

export type ReceiptVerifyReason =
  | 'unsigned'
  | 'hash-mismatch'
  | 'bad-signature'
  | 'signer-mismatch'

export interface ReceiptVerification {
  valid: boolean
  reason?: ReceiptVerifyReason
}

export interface ReceiptDetail {
  receipt: Receipt
  verification: ReceiptVerification
}

export interface ListReceiptsFilter {
  chain?: string
  agentId?: number
  subject?: string
  /** 游标：返回早于该时间的回执。 */
  before?: string
  /** 默认 20，上限 100。 */
  limit?: number
}

export type WebhookEvent = 'receipt.created' | 'endpoint.down' | 'endpoint.recovered' | '*'

export interface WebhookEndpoint {
  id: string
  owner: string
  chain: string
  agentId: number | null
  url: string
  events: string[]
  active: boolean
  failureCount: number
  lastError: string
  lastSuccessAt: string | null
  createdAt: string
}

export interface CreateWebhookInput {
  url: string
  events?: WebhookEvent[]
  chain?: string
  agentId?: number | null
}

/** 创建响应：secret 只出现这一次。 */
export interface CreateWebhookResult {
  endpoint: WebhookEndpoint
  secret: string
  note: string
}

export type PayoutSource = 'configured' | 'owner' | 'platform' | null

export interface AgentPayout {
  chain: string
  agentId: number
  /** null = 未配置或已撤回收款意图。 */
  payoutAddress: string | null
  payTo: string | null
  source: PayoutSource
}

export type PublishTargetId = 'a2a' | 'mcp' | 'cursor' | 'x402' | 'openai' | 'claude' | 'virtuals'
export type PublishMode = 'auto' | 'manual'
export type PublishStatus = 'ready' | 'blocked'
export type PublishBlockedReason = 'NO_A2A_ENDPOINT' | 'NO_MCP_ENDPOINT' | 'NO_PAYOUT_ADDRESS'

export interface PublishTarget {
  id: PublishTargetId
  label: string
  mode: PublishMode
  status: PublishStatus
  reason?: PublishBlockedReason
  artifact: Record<string, unknown>
  notes: string
}

export interface PublishPlan {
  chain: string
  agentId: number
  agent: { name: string; description: string; owner: string; tags: string[]; origin: string }
  card: Record<string, unknown>
  targets: PublishTarget[]
  generatedAt: string
}

export class PassportApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'PassportApiError'
  }
}

export interface PassportClientOptions {
  /** Actora Gateway 基础 URL，例如 https://actora.codes。 */
  baseUrl: string
  /** 注册用户 JWT（Authorization: Bearer）—— 收款地址写操作与 Webhook 管理需要。 */
  accessToken?: string
  /** 租户 API Key（X-Api-Key）—— 与 accessToken 二选一。 */
  apiKey?: string
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export class PassportClient {
  constructor(private readonly opts: PassportClientOptions) {}

  private get base(): string {
    return this.opts.baseUrl.replace(/\/$/, '')
  }

  private async call<T>(path: string, init?: RequestInit, requireAuth = false): Promise<T> {
    const headers: Record<string, string> = {
      ...((init?.headers as Record<string, string>) ?? {}),
    }
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json'
    if (this.opts.apiKey) headers['X-Api-Key'] = this.opts.apiKey
    if (this.opts.accessToken) headers.Authorization = `Bearer ${this.opts.accessToken}`
    if (requireAuth && !this.opts.accessToken && !this.opts.apiKey) {
      throw new PassportApiError('UNAUTHORIZED', 401)
    }

    const res = await fetch(`${this.base}${path}`, { ...init, headers })
    if (!res.ok) {
      let code = `HTTP_${res.status}`
      let message: string | undefined
      try {
        const body = (await res.json()) as { error?: string; code?: string; message?: string }
        if (body.code) code = body.code
        else if (body.error) code = body.error
        message = body.message
      } catch {
        /* non-JSON */
      }
      throw new PassportApiError(code, res.status, message)
    }
    return res.json() as Promise<T>
  }

  // ── 护照（描述 / 端点 / 声誉）─────────────────────────────────────────────

  /** `chain` 缺省时由网关跨链解析（central → bsc → ethereum → base）。 */
  getAgent(agentId: number, chain?: string): Promise<AgentPassport> {
    return this.call<AgentPassport>(`/api/v1/agents/${agentId}${qs({ chain })}`)
  }

  // ── 回执 ────────────────────────────────────────────────────────────────

  /** 单张回执 + 平台验签结果（公开）。 */
  getReceipt(receiptId: string): Promise<ReceiptDetail> {
    return this.call<ReceiptDetail>(`/api/v1/receipts/${encodeURIComponent(receiptId)}`)
  }

  /** 回执列表：`chain` / `agentId` / `subject` 至少给一个，否则网关 400。 */
  async listReceipts(filter: ListReceiptsFilter): Promise<Receipt[]> {
    const body = await this.call<{ receipts: Receipt[] }>(
      `/api/v1/receipts${qs({
        chain: filter.chain,
        agentId: filter.agentId,
        subject: filter.subject,
        before: filter.before,
        limit: filter.limit,
      })}`,
    )
    return body.receipts ?? []
  }

  // ── 收款地址 ─────────────────────────────────────────────────────────────

  getPayout(chain: PassportChain, agentId: number): Promise<AgentPayout> {
    return this.call<AgentPayout>(`/api/v1/agents/${chain}/${agentId}/payout`)
  }

  /**
   * 设置 / 清除收款地址（仅 owner）。
   * @param payoutAddress null = 撤回收款意图，此后该 agent 不再生成 402。
   */
  setPayout(chain: PassportChain, agentId: number, payoutAddress: string | null): Promise<AgentPayout> {
    return this.call<AgentPayout>(
      `/api/v1/agents/${chain}/${agentId}/payout`,
      { method: 'PUT', body: JSON.stringify({ payoutAddress }) },
      true,
    )
  }

  // ── Webhook ──────────────────────────────────────────────────────────────

  async listWebhooks(): Promise<WebhookEndpoint[]> {
    const body = await this.call<{ endpoints: WebhookEndpoint[] }>('/api/v1/webhooks', undefined, true)
    return body.endpoints ?? []
  }

  createWebhook(input: CreateWebhookInput): Promise<CreateWebhookResult> {
    return this.call<CreateWebhookResult>(
      '/api/v1/webhooks',
      { method: 'POST', body: JSON.stringify(input) },
      true,
    )
  }

  async revokeWebhook(id: string): Promise<void> {
    await this.call<{ ok: boolean }>(`/api/v1/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' }, true)
  }

  // ── 一源多发 ─────────────────────────────────────────────────────────────

  /** 各平台物料；`blocked` 的条目带 `reason`（不发外部请求）。 */
  getPublishPlan(chain: PassportChain, agentId: number): Promise<PublishPlan> {
    return this.call<PublishPlan>(`/api/v1/agents/${chain}/${agentId}/publish-plan`)
  }
}
