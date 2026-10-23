// ---------------------------------------------------------------------------
// Actora SDK — SpendPolicyClient（P6.2 / WS8）
// ---------------------------------------------------------------------------
// 花费策略是「业务策略 → Gator caveat 组合」的映射层：策略由网关持有（唯一事实
// 源），SDK 负责读写与 dry-run 校验；**ERC-7715 授权由外部钱包（MetaMask Smart
// Accounts / Gator）完成**，SDK 不发起授权请求、不签名 grant。
//
//   GET    /api/v1/spend-policy
//   GET    /api/v1/spend-policy/:chain           （含派生 caveats）
//   PUT    /api/v1/spend-policy/:chain
//   DELETE /api/v1/spend-policy/:chain
//   POST   /api/v1/spend-policy/check
//   GET    /api/v1/spend-policy/approvals
//   POST   /api/v1/spend-policy/approvals/:id/decide
//
// 按次 session 授权（x402 v2 / Keel v1；取代已下线的余额预充值）：
//   GET    /api/v1/spend-policy/session
//   POST   /api/v1/spend-policy/session/enable    返回 owner 待签 digest
//   POST   /api/v1/spend-policy/session/confirm   owner 裸签 → 上链
//   POST   /api/v1/spend-policy/session/revoke    两段式：无签名=返回 digest，有签名=上链
// ---------------------------------------------------------------------------

export type SpendChain = 'bsc' | 'ethereum' | 'base'

/** 业务策略（与网关 services/spend-policy.ts 的 SpendPolicy 同构）。 */
export interface SpendPolicy {
  version: 1
  maxPerTxWei: string
  periodSeconds: number
  periodLimitWei: string
  /** 0 = 不限 */
  maxCalls: number
  /** 链 → 允许的收款地址；空数组 = 该链不限制 */
  allowedTargets: Record<string, string[]>
  tokenCaps: Array<{ chain: SpendChain; token: string; periodAmountWei: string; periodSeconds: number }>
  /** 命中已有订阅/拥有关系时跳过限额 */
  skipWhenSubscribed: boolean
  /** > 0 时超过该额度的单笔需人工审批 */
  approvalAboveWei: string
  /** unix 秒；0 = 不过期 */
  validUntil: number
}

/** Gator caveat（enforcer 合约地址由 Delegation Framework 地址表解析）。 */
export interface GatorCaveat {
  enforcer: string
  terms: `0x${string}`
  args: `0x${string}`
  description: string
}

export interface SpendPolicyDoc {
  chain: SpendChain
  enabled: boolean
  policy: SpendPolicy
  caveats: GatorCaveat[]
}

export type SpendDecisionCode =
  | 'ALLOW'
  | 'POLICY_MISSING'
  | 'POLICY_DISABLED'
  | 'POLICY_UNAVAILABLE'
  | 'POLICY_EXPIRED'
  | 'SUBSCRIPTION_COVERED'
  | 'INVALID_CHAIN'
  | 'INVALID_AMOUNT'
  | 'TARGET_NOT_ALLOWED'
  | 'PER_TX_LIMIT'
  | 'PERIOD_LIMIT'
  | 'CALL_LIMIT'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_PENDING'
  | 'APPROVAL_REJECTED'
  | 'APPROVED_BY_USER'

export interface SpendGateResult {
  allow: boolean
  decision: 'allow' | 'deny' | 'needs_approval'
  code: SpendDecisionCode
  reason: string
  remainingWei: string
  approvalId?: number
}

export interface SpendApproval {
  id: number
  subscriber: string
  chain: string
  target: string
  amount_wei: string
  target_agent_id: number | null
  ref_id: string | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  decided_at: string | null
  decided_by: string | null
  consumed_at: string | null
}

/** 单链按次 session 授权状态（GET /session）。 */
export interface SpendSession {
  chain: string
  accountAddress: string
  status: 'pending' | 'enabled' | 'disabled' | string
  /** unix 秒 */
  validUntil: number
  sessionSigner: string
}

/** enable 的返回值：owner 对 `digest` 裸签（eth_sign 语义）后走 confirm。 */
export interface EnableSpendSessionResult {
  accountAddress: string
  accountDeployed: boolean
  sessionId: string
  sessionSigner: string
  digest: string
  validUntil: string
  /** 链上已有旧 session 时，网关先自愈撤销（v1 无需用户处理）。 */
  needsSessionRevoke?: boolean
  disableUserOpHash?: string
  disableSessionId?: string
}

export interface ConfirmSpendSessionResult {
  userOpHash: string
  txHash: string | null
  receiptSuccess: boolean
}

/** 撤销第一步的产物：owner 对 `digest` 裸签，再原样带回 `revokeSession`。 */
export interface SpendSessionRevokeDraft {
  accountAddress: string
  sessionId: string
  digest: string
  validUntil: number
}

export interface SpendSessionRevokeResult {
  revoked: boolean
  userOpHash: string
  txHash: string | null
}

export interface SpendPolicyClientConfig {
  gatewayUrl: string
  /** Tenant API Key（actora_...） */
  apiKey?: string
  /** 网关 JWT（钱包登录后获取） */
  accessToken?: string
}

export class SpendPolicyClient {
  private readonly baseUrl: string

  constructor(private readonly config: SpendPolicyClientConfig) {
    this.baseUrl = config.gatewayUrl.replace(/\/$/, '')
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (this.config.apiKey) headers['X-Api-Key'] = this.config.apiKey
    if (this.config.accessToken) headers['Authorization'] = `Bearer ${this.config.accessToken}`
    if (!this.config.apiKey && !this.config.accessToken) {
      throw new Error('SpendPolicyClient requires either apiKey or accessToken')
    }
    const res = await fetch(`${this.baseUrl}/api/v1/spend-policy${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = (json as any)?.message ?? (json as any)?.error ?? `HTTP ${res.status}`
      throw new Error(`Spend policy request failed: ${detail}`)
    }
    return json as T
  }

  /** 该钱包全部链的策略。 */
  async list(): Promise<Array<{ chain: string; policy: SpendPolicy; enabled: boolean; validUntil: number }>> {
    const out = await this.request<{ policies: Array<{ chain: string; policy: SpendPolicy; enabled: boolean; validUntil: number }> }>('GET', '')
    return out.policies
  }

  /** 单链策略 + 派生的 Gator caveat 组合。 */
  get(chain: SpendChain): Promise<SpendPolicyDoc> {
    return this.request('GET', `/${chain}`)
  }

  /** 写入 / 更新策略（非法字段网关返回 400）。 */
  put(chain: SpendChain, policy: SpendPolicy, enabled = true): Promise<SpendPolicyDoc & { enabled: boolean }> {
    return this.request('PUT', `/${chain}`, { policy, enabled })
  }

  /** 停用策略（保留记录，可重新 put 启用）。 */
  disable(chain: SpendChain): Promise<{ chain: SpendChain; enabled: boolean }> {
    return this.request('DELETE', `/${chain}`)
  }

  /**
   * dry-run 校验一笔支出（不落流水、不代付）。
   * `refId` 建议传任务/订单稳定 ID：超额时会据此进入审批队列并去重。
   */
  check(input: {
    chain: SpendChain
    target: string
    amountWei: string
    refId?: string
    targetAgentId?: number
    subscribed?: boolean
  }): Promise<SpendGateResult> {
    return this.request('POST', '/check', input)
  }

  /** 超额审批队列（默认全部，可传 status 过滤）。 */
  async approvals(opts: { status?: 'pending' | 'approved' | 'rejected'; limit?: number } = {}): Promise<SpendApproval[]> {
    const qs = new URLSearchParams()
    if (opts.status) qs.set('status', opts.status)
    if (opts.limit) qs.set('limit', String(opts.limit))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const out = await this.request<{ approvals: SpendApproval[] }>('GET', `/approvals${suffix}`)
    return out.approvals
  }

  /** 人工审批（approve 只能被消费一次；reject 后同一 refId 永久拒绝）。 */
  async decide(id: number, decision: 'approve' | 'reject'): Promise<SpendApproval> {
    const out = await this.request<{ approval: SpendApproval }>('POST', `/approvals/${id}/decide`, { decision })
    return out.approval
  }

  // ── 按次 session 授权（Keel v1；不预充值、不记账）─────────────────────

  /** 我的全部链 session 授权状态。 */
  async sessions(): Promise<SpendSession[]> {
    const out = await this.request<{ sessions: SpendSession[] }>('GET', '/session')
    return out.sessions
  }

  /**
   * 第一步：创建 session（必要时顺带部署智能账户）并返回 owner 待签 digest。
   * 用户对 `digest` 裸签后调用 `confirmSession` 上链。
   */
  enableSession(input: { chain?: SpendChain; policy?: SpendPolicy } = {}): Promise<EnableSpendSessionResult> {
    return this.request('POST', '/session/enable', input)
  }

  /** 第二步：提交 owner 裸签（65 字节 hex）完成授权。 */
  confirmSession(input: { chain?: SpendChain; ownerSignature: string }): Promise<ConfirmSpendSessionResult> {
    return this.request('POST', '/session/confirm', input)
  }

  /**
   * 撤销第一步：冻结撤销 op 并返回待签 digest（网关落草稿，避免 nonce/gas 变化导致签名失配）。
   * v0 存量 session 无法在链上定位，网关返回 409，需重新 `enableSession` 迁移到 v1。
   */
  prepareSessionRevoke(input: { chain?: SpendChain } = {}): Promise<SpendSessionRevokeDraft> {
    return this.request('POST', '/session/revoke', input)
  }

  /** 撤销第二步：带回第一步的 `digest` 的 owner 签名提交上链。 */
  revokeSession(input: {
    chain?: SpendChain
    ownerSignature: string
    /** 可选，用于校验与 `prepareSessionRevoke` 返回的 digest 一致。 */
    userOpHash?: string
  }): Promise<SpendSessionRevokeResult> {
    return this.request('POST', '/session/revoke', input)
  }
}
