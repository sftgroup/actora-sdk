// SpendPolicyClient — 按次 session 授权（Keel v1）单测。
// 对应网关 /api/v1/spend-policy/session{,/enable,/confirm,/revoke} 的接线。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SpendPolicyClient } from '../src/payment/spend-policy'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const SIG = `0x${'ab'.repeat(65)}`

describe('SpendPolicyClient — session', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const make = () => new SpendPolicyClient({ gatewayUrl: 'https://gw.example.com', accessToken: 'jwt-abc' })

  const firstCall = (call: unknown[]) => {
    const [url, init] = call as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    const body = init.body ? JSON.parse(init.body as string) : undefined
    return { url, method: init.method, headers, body }
  }

  it('sessions() GETs /session and unwraps the list', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      sessions: [{ chain: 'bsc', accountAddress: '0xacc', status: 'enabled', validUntil: 1890000000, sessionSigner: '0xsig' }],
    }))
    const res = await make().sessions()
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({ chain: 'bsc', status: 'enabled' })
    const { url, method, headers } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/spend-policy/session')
    expect(method).toBe('GET')
    expect(headers['Authorization']).toBe('Bearer jwt-abc')
  })

  it('enableSession() POSTs chain + policy to /session/enable', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ digest: '0xdigest', sessionId: 's1', accountAddress: '0xacc' }))
    const policy = { version: 1, maxPerTxWei: '1', periodSeconds: 86400, periodLimitWei: '2', maxCalls: 0 } as any
    const res = await make().enableSession({ chain: 'bsc', policy })
    expect(res.digest).toBe('0xdigest')
    const { url, method, body } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/spend-policy/session/enable')
    expect(method).toBe('POST')
    expect(body).toMatchObject({ chain: 'bsc' })
  })

  it('confirmSession() POSTs the owner signature to /session/confirm', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ userOpHash: '0xop', txHash: '0xtx', receiptSuccess: true }))
    const res = await make().confirmSession({ chain: 'bsc', ownerSignature: SIG })
    expect(res).toMatchObject({ userOpHash: '0xop', receiptSuccess: true })
    const { url, body } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/spend-policy/session/confirm')
    expect(body).toEqual({ chain: 'bsc', ownerSignature: SIG })
  })

  it('prepareSessionRevoke() POSTs without ownerSignature and returns the digest', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      accountAddress: '0xacc', sessionId: 's1', digest: '0xdigest', validUntil: 1890000000,
    }))
    const res = await make().prepareSessionRevoke({ chain: 'bsc' })
    expect(res.digest).toBe('0xdigest')
    const { url, body } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/spend-policy/session/revoke')
    expect(body).toEqual({ chain: 'bsc' })
    expect(body.ownerSignature).toBeUndefined()
  })

  it('revokeSession() POSTs the signature + digest hash', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ revoked: true, userOpHash: '0xop', txHash: '0xtx' }))
    const res = await make().revokeSession({ chain: 'bsc', ownerSignature: SIG, userOpHash: '0xdigest' })
    expect(res.revoked).toBe(true)
    const { url, body } = firstCall(fetchMock.mock.calls[0]!)
    expect(url).toBe('https://gw.example.com/api/v1/spend-policy/session/revoke')
    expect(body).toEqual({ chain: 'bsc', ownerSignature: SIG, userOpHash: '0xdigest' })
  })

  it('surfaces the gateway error message on 409 (v0 session cannot be located)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      error: 'SESSION_REVOKE_PREPARE_FAILED',
      message: 'session was created by the legacy (v0) module',
    }, 409))
    await expect(make().prepareSessionRevoke({ chain: 'bsc' }))
      .rejects.toThrow('session was created by the legacy (v0) module')
  })
})
