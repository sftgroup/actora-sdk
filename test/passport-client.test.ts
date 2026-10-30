// PassportClient — 076 单元测试
// 覆盖：URL / 查询串拼接、鉴权头、错误码映射、收款地址清除语义、
// Webhook secret 一次性、发布计划 blocked 原因。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PassportClient, PassportApiError } from '../src/passport'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('PassportClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const makeClient = (opts: Partial<ConstructorParameters<typeof PassportClient>[0]> = {}) =>
    new PassportClient({ baseUrl: 'https://gw.example.com/', ...opts })

  const call = (i: number) => {
    const [url, init] = fetchMock.mock.calls[i] as [string, RequestInit]
    return {
      url,
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body,
    }
  }

  it('getAgent() 拼 chain 参数并去掉末尾斜杠', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7, chain: 'bsc', reputation: { state: 'unobserved' } }))
    const agent = await makeClient().getAgent(7, 'bsc')
    expect(call(0).url).toBe('https://gw.example.com/api/v1/agents/7?chain=bsc')
    expect(agent.reputation?.state).toBe('unobserved')
  })

  it('getAgent() 不传 chain 时不带查询串', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }))
    await makeClient().getAgent(7)
    expect(call(0).url).toBe('https://gw.example.com/api/v1/agents/7')
  })

  it('listReceipts() 过滤条件进查询串，空值不发送', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ receipts: [{ receiptId: 'r1' }] }))
    const rows = await makeClient().listReceipts({ chain: 'bsc', agentId: 0, limit: 5 })
    expect(call(0).url).toBe('https://gw.example.com/api/v1/receipts?chain=bsc&agentId=0&limit=5')
    expect(rows).toHaveLength(1)
  })

  it('listReceipts() 无过滤条件时由网关 400，错误码透传', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'chain required', code: 'FILTER_REQUIRED' }, 400))
    await expect(makeClient().listReceipts({})).rejects.toMatchObject({
      name: 'PassportApiError',
      code: 'FILTER_REQUIRED',
      status: 400,
    })
  })

  it('getReceipt() 返回回执与验签结果', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ receipt: { receiptId: 'r1' }, verification: { valid: true } }))
    const detail = await makeClient().getReceipt('r1')
    expect(call(0).url).toBe('https://gw.example.com/api/v1/receipts/r1')
    expect(detail.verification.valid).toBe(true)
  })

  it('setPayout() 带 Bearer，null 表示撤回收款意图', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ chain: 'bsc', agentId: 7, payoutAddress: null }))
    const res = await makeClient({ accessToken: 'jwt-1' }).setPayout('bsc', 7, null)
    const c = call(0)
    expect(c.url).toBe('https://gw.example.com/api/v1/agents/bsc/7/payout')
    expect(c.method).toBe('PUT')
    expect(c.headers.Authorization).toBe('Bearer jwt-1')
    expect(c.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(String(c.body))).toEqual({ payoutAddress: null })
    expect(res.payoutAddress).toBeNull()
  })

  it('需要鉴权的写操作在无凭证时本地拒绝，不发请求', async () => {
    await expect(makeClient().setPayout('bsc', 7, '0xabc')).rejects.toBeInstanceOf(PassportApiError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('listWebhooks() 使用 API Key 头并只返回 endpoints', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ endpoints: [{ id: 'w1', active: true }] }))
    const rows = await makeClient({ apiKey: 'k-1' }).listWebhooks()
    expect(call(0).headers['X-Api-Key']).toBe('k-1')
    expect(call(0).headers.Authorization).toBeUndefined()
    expect(rows).toHaveLength(1)
  })

  it('createWebhook() 返回一次性 secret', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ endpoint: { id: 'w1' }, secret: 'whsec_1', note: 'only once' }, 201))
    const res = await makeClient({ accessToken: 'jwt-1' }).createWebhook({
      url: 'https://hooks.example.com/a',
      events: ['receipt.created'],
    })
    expect(call(0).method).toBe('POST')
    expect(res.secret).toBe('whsec_1')
  })

  it('revokeWebhook() 走 DELETE', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    await makeClient({ accessToken: 'jwt-1' }).revokeWebhook('w 1')
    expect(call(0).url).toBe('https://gw.example.com/api/v1/webhooks/w%201')
    expect(call(0).method).toBe('DELETE')
  })

  it('getPublishPlan() 透传 blocked 原因', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        chain: 'bsc',
        agentId: 7,
        targets: [
          { id: 'a2a', status: 'blocked', reason: 'NO_A2A_ENDPOINT' },
          { id: 'openai', status: 'ready', artifact: { text: 'x' } },
        ],
      }),
    )
    const plan = await makeClient().getPublishPlan('bsc', 7)
    expect(plan.targets[0]?.reason).toBe('NO_A2A_ENDPOINT')
    expect(plan.targets[1]?.status).toBe('ready')
  })
})
