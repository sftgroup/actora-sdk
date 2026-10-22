// ---------------------------------------------------------------------------
// @actora/sdk — 执行证明校验客户端（P5.4）
// ---------------------------------------------------------------------------
// 调用网关 POST /api/v1/proofs/verify（signed-manifest-v1）。第三方只需把
// 网关签发的证明包原样提交即可，无需在客户端重新实现 EIP-712 / 稳定序列化。
// ---------------------------------------------------------------------------

import { request } from '../payment/a2a-client'

/** 证明包（与网关 services/execution-proof.ts 的 ExecutionProofBundle 对齐）。 */
export interface ExecutionProofBundle {
  tag: 'signed-manifest-v1'
  requestHash: string
  manifestHash: string
  manifest: Record<string, unknown>
  signature: string
  signer: string
}

export type ExecutionProofVerifyReason =
  | 'bad-tag'
  | 'bad-manifest'
  | 'request-hash-mismatch'
  | 'manifest-hash-mismatch'
  | 'expired'
  | 'bad-signature'
  | 'signer-mismatch'

export interface ExecutionProofVerifyResult {
  valid: boolean
  signer: string | null
  manifestHash: string | null
  reason?: ExecutionProofVerifyReason
}

/** 校验执行证明（POST /api/v1/proofs/verify）。 */
export async function verifyExecutionProof(
  baseUrl: string,
  proof: ExecutionProofBundle,
  accessToken?: string,
): Promise<ExecutionProofVerifyResult> {
  return request(
    baseUrl,
    '/api/v1/proofs/verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof }),
    },
    accessToken,
  )
}
