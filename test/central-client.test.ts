// CentralAgentClient — C-6 中心化 Agent 市场公开只读客户端 unit tests.
// Covers: list (source=central fixed + filters), get (detail + subscriptionPlans),
// checkSubscription, and mySubscriptions.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CentralAgentClient } from '../src/central'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('CentralAgentClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const makeClient = () => new CentralAgentClient({ baseUrl: 'https://gw.example.com/' })

  const firstCall = (call: unknown[]) => {
    const [url, init] = call as [string, RequestInit]
    return { url, method: init?.method ?? 'GET', headers: (init?.headers ?? {}) as Record<string, string> }
  }

  it('list() fixes source=central and forwards pagination filters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ agents: [], total: 0, page: 1, pageSize: 50 }))
    await makeClient().list({ activeOnly: true, category: 'finance', page: 2, pageSize: 10 })
    const { url } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/agents?source=central&activeOnly=true&category=finance&page=2&pageSize=10')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('list() without filters sends only source=central', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ agents: [], total: 0, page: 1, pageSize: 50 }))
    await makeClient().list()
    const { url } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/agents?source=central')
  })

  it('get() returns the agent detail with subscriptionPlans', async () => {
    const detail = {
      id: -3, owner: '0xabc', name: 'Quant Bot', description: 'x',
      tags: [], capabilities: ['chat'], skills: [], category: 'finance',
      isActive: true, source: 'central',
      subscriptionPlans: [{ planId: 7, price: '1000000000000000000', period: 'month', payToken: 'native', isActive: true, trialDays: 0, creator: '0xabc' }],
    }
    fetchMock.mockResolvedValue(jsonResponse(detail))
    const res = await makeClient().get(-3)
    expect(fetchMock.mock.calls[0]![0]).toBe('https://gw.example.com/api/v1/agents/-3')
    expect(res.id).toBe(-3)
    expect(res.subscriptionPlans?.[0]?.period).toBe('month')
  })

  it('checkSubscription() encodes subscriber and agentId', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ chain: 'oxachain', subscriber: '0xabc', agentId: -3, active: true }))
    const res = await makeClient().checkSubscription('0xAbC123', -3)
    const { url } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/chain/check-subscription?subscriber=0xAbC123&agentId=-3')
    expect(res.active).toBe(true)
  })

  it('mySubscriptions() returns the fiat subscription rows', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      subscriptions: [{ id: 9, agentId: -3, planId: 7, provider: 'x402', providerSubId: null, status: 'active', currency: 'usd', amountCents: null, period: 'month', startsAt: '2026-09-01T00:00:00Z', expiresAt: '2026-10-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }],
    }))
    const res = await makeClient().mySubscriptions('0xAbC123')
    const { url } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/fiat/subscriptions?subscriber=0xAbC123')
    expect(res.subscriptions[0]?.status).toBe('active')
  })

  it('propagates gateway error message on HTTP failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Agent not found' }, 404))
    await expect(makeClient().get(12345)).rejects.toThrow('Agent not found')
  })

  // ── 鉴权管理（accessToken / apiKey） ────────────────────────────────────

  const bodyOf = (call: unknown[]) => JSON.parse((call as [string, RequestInit])[1]?.body as string)

  it('create() sends POST with tenant X-Api-Key header', async () => {
    const client = new CentralAgentClient({ baseUrl: 'https://gw.example.com/', apiKey: 'agentx_sk_test' })
    fetchMock.mockResolvedValue(jsonResponse({ agent: { id: -4, name: 'Quant Bot', source: 'central' } }, 201))
    await client.create({ name: 'Quant Bot', description: 'x', category: 'finance', capabilities: ['chat'], skills: ['analysis'], tags: ['quant'] })
    const { url, method, headers } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/agents/central')
    expect(method).toBe('POST')
    expect(headers['X-Api-Key']).toBe('agentx_sk_test')
    expect(headers['Authorization']).toBeUndefined()
    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({ name: 'Quant Bot', description: 'x', category: 'finance', capabilities: ['chat'], skills: ['analysis'], tags: ['quant'] })
  })

  it('create() sends Bearer accessToken when configured (registered user)', async () => {
    const client = new CentralAgentClient({ baseUrl: 'https://gw.example.com/', accessToken: 'jwt-abc' })
    fetchMock.mockResolvedValue(jsonResponse({ agent: { id: -4, source: 'central' } }, 201))
    await client.create({ name: 'My Agent' })
    const { headers } = firstCall(fetchMock.mock.calls[0]!)
    expect(headers['Authorization']).toBe('Bearer jwt-abc')
  })

  it('listMine() GETs /central/mine with auth header', async () => {
    const client = new CentralAgentClient({ baseUrl: 'https://gw.example.com/', apiKey: 'agentx_sk_test' })
    fetchMock.mockResolvedValue(jsonResponse({ agents: [{ id: -4, subscriptionPlans: [] }] }))
    const res = await client.listMine()
    const { url, method, headers } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/agents/central/mine')
    expect(method).toBe('GET')
    expect(headers['X-Api-Key']).toBe('agentx_sk_test')
    expect(res.agents[0]?.id).toBe(-4)
  })

  it('update() PATCHes only the provided fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ agent: { id: -4, name: 'Renamed' } }))
    await makeClient().update(-4, { name: 'Renamed', isActive: true })
    const { url, method } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/agents/central/-4')
    expect(method).toBe('PATCH')
    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({ name: 'Renamed', isActive: true })
  })

  it('deactivate() / activate() toggle is_active via DELETE and PATCH', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    await makeClient().deactivate(-4)
    expect(firstCall(fetchMock.mock.calls[0]!).method).toBe('DELETE')
    expect(firstCall(fetchMock.mock.calls[0]!).url).toBe('https://gw.example.com/api/v1/agents/central/-4')

    fetchMock.mockResolvedValue(jsonResponse({ agent: { id: -4, isActive: true } }))
    await makeClient().activate(-4)
    expect(firstCall(fetchMock.mock.calls[1]!).method).toBe('PATCH')
    expect(bodyOf(fetchMock.mock.calls[1]!)).toEqual({ isActive: true })
  })

  it('createPlan() / deactivatePlan() manage central_plans', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ plan: { id: 9, agentId: -4, priceWei: '1000000000000000000', period: 'month', active: true } }, 201))
    const res = await makeClient().createPlan(-4, { priceWei: '1000000000000000000', period: 'month' })
    let call = firstCall(fetchMock.mock.calls[0]!)
    expect(call.url).toBe('https://gw.example.com/api/v1/agents/central/-4/plans')
    expect(call.method).toBe('POST')
    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({ priceWei: '1000000000000000000', period: 'month' })
    expect(res.plan.period).toBe('month')

    fetchMock.mockResolvedValue(jsonResponse({ success: true }))
    await makeClient().deactivatePlan(-4, 9)
    call = firstCall(fetchMock.mock.calls[1]!)
    expect(call.url).toBe('https://gw.example.com/api/v1/agents/central/-4/plans/9')
    expect(call.method).toBe('DELETE')
  })
})
