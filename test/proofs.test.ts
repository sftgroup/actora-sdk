// @actora/sdk — verifyExecutionProof 客户端单测（P5.4）
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyExecutionProof, type ExecutionProofBundle } from '../src/proofs'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const HASH = `0x${'ab'.repeat(32)}`
const SIGNER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

const PROOF: ExecutionProofBundle = {
  tag: 'signed-manifest-v1',
  requestHash: HASH,
  manifestHash: HASH,
  manifest: { agentId: 42 },
  signature: `0x${'11'.repeat(65)}`,
  signer: SIGNER,
}

describe('verifyExecutionProof', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POST /api/v1/proofs/verify，body 为 { proof }', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ valid: true, signer: SIGNER, manifestHash: HASH }))

    const res = await verifyExecutionProof('https://gw.example.com/', PROOF)

    expect(res).toEqual({ valid: true, signer: SIGNER, manifestHash: HASH })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://gw.example.com/api/v1/proofs/verify')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ proof: PROOF })
  })

  it('透传 reason（篡改 / 过期）', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ valid: false, signer: SIGNER, manifestHash: HASH, reason: 'manifest-hash-mismatch' }),
    )
    const res = await verifyExecutionProof('https://gw.example.com', PROOF)
    expect(res.valid).toBe(false)
    expect(res.reason).toBe('manifest-hash-mismatch')
  })

  it('HTTP 错误 → 抛出网关错误信息', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid JSON in request body' }, 400))
    await expect(verifyExecutionProof('https://gw.example.com', PROOF)).rejects.toThrow(
      'Invalid JSON in request body',
    )
  })
})
