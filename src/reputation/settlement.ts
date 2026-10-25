// ---------------------------------------------------------------------------
// @actora/sdk — 结算信誉提交（P4.2 / P4.4）
// ---------------------------------------------------------------------------
// 两条写入路径，都落在网关 PaymentReputationOracle(V2) 后面：
//
//   ① submitSettlement        —— EOA 付款方离线签 EIP-712 `SettlementProof`，
//                                网关核对 PC-4 结算记录后由 writer 上链。
//   ② submitSubscriptionSettlement —— 链上订阅（含 AA 自动续订）**无需签名**：
//                                证据直接取自 SubscriptionManager 的公开状态，
//                                任何人都能提交，第三方可独立复核。
//
// getSettlementDomain 返回 EIP-712 域 + 结构体类型，保证客户端与合约逐字一致。
// ---------------------------------------------------------------------------

import type { Account, Hex, WalletClient } from 'viem'
import { request } from '../payment/a2a-client'

export type SettlementChain = 'bsc' | 'ethereum' | 'base' | 'sepolia'

export const SETTLEMENT_PROOF_DOMAIN_NAME = 'ActoraPaymentSettlement'
export const SETTLEMENT_PROOF_DOMAIN_VERSION = '1'

/** 与合约 / 网关逐字一致的 EIP-712 结构体定义。 */
export const SETTLEMENT_PROOF_TYPES = {
  SettlementProof: [
    { name: 'agentId', type: 'uint256' },
    { name: 'payer', type: 'address' },
    { name: 'asset', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'rail', type: 'string' },
    { name: 'taskRef', type: 'bytes32' },
    { name: 'settlementRef', type: 'bytes32' },
    { name: 'settledAt', type: 'uint64' },
  ],
} as const

const PRIMARY_TYPE = 'SettlementProof' as const

export interface SettlementDomain {
  name: string
  version: string
  chainId: number
  verifyingContract: `0x${string}`
}

export interface SettlementDomainResponse {
  chain: SettlementChain
  chainId: number
  domain: SettlementDomain
  types: typeof SETTLEMENT_PROOF_TYPES
  primaryType: 'SettlementProof'
}

export interface SettlementProofMessage {
  agentId: bigint
  payer: `0x${string}`
  asset: `0x${string}`
  amount: bigint
  rail: string
  taskRef: Hex
  settlementRef: Hex
  settledAt: bigint
}

export interface SubmitSettlementResult {
  reference: string
  chain: SettlementChain
  agentId: number
  payer: string
  amountWei: string
  status: string
  txHash: string | null
  idempotent: boolean
}

export type SubscriptionSettlementStatus =
  | 'recorded'
  | 'already_recorded'
  | 'no_subscription'
  | 'cancelled'
  | 'not_configured'
  | 'writer_not_configured'
  | 'failed'

export interface SubscriptionSettlementResult {
  ok: boolean
  status: SubscriptionSettlementStatus
  subscriptionId?: number
  txHash?: string
  reason?: string
}

/**
 * 读取某链的 EIP-712 结算域（GET /api/v1/reputation/settlement-domain/:chain）。
 * 客户端不应硬编码 verifyingContract —— Oracle 可能按链升级。
 */
export async function getSettlementDomain(
  baseUrl: string,
  chain: SettlementChain,
  accessToken?: string,
): Promise<SettlementDomainResponse> {
  return request(baseUrl, `/api/v1/reputation/settlement-domain/${chain}`, { method: 'GET' }, accessToken)
}

/** 付款方对一笔结算记录做 EIP-712 签名（域请先经 getSettlementDomain 获取）。 */
export async function signSettlementProof(params: {
  wallet: WalletClient
  account?: Account
  domain: SettlementDomain
  message: SettlementProofMessage
}): Promise<Hex> {
  const account = params.account ?? params.wallet.account
  if (!account) throw new Error('signSettlementProof: wallet has no account')
  return params.wallet.signTypedData({
    account,
    domain: params.domain,
    types: SETTLEMENT_PROOF_TYPES,
    primaryType: PRIMARY_TYPE,
    message: params.message,
  })
}

export interface SubmitSettlementInput {
  chain: SettlementChain
  agentId: number
  reference: string
  payer: string
  payerSignature: Hex
  /** 请求有效期（unix 秒），网关侧护栏，不进合约结构体。 */
  deadline: number
  amountWei?: string
  metadata?: Record<string, unknown>
}

/** 提交 EOA 签名的结算（POST /api/v1/reputation/submit-settlement）。 */
export async function submitSettlement(
  baseUrl: string,
  input: SubmitSettlementInput,
  accessToken?: string,
): Promise<SubmitSettlementResult> {
  return request(
    baseUrl,
    '/api/v1/reputation/submit-settlement',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    accessToken,
  )
}

export interface SubmitSubscriptionSettlementInput {
  chain: SettlementChain
  agentId: number
  /** 订阅的链上付款方；AA 自动续订场景为智能账户地址。 */
  subscriber: string
}

/**
 * 提交链上订阅结算（POST /api/v1/reputation/submit-subscription-settlement）。
 * 免签名：证据为 SubscriptionManager 的公开订阅状态。
 */
export async function submitSubscriptionSettlement(
  baseUrl: string,
  input: SubmitSubscriptionSettlementInput,
  accessToken?: string,
): Promise<SubscriptionSettlementResult> {
  return request(
    baseUrl,
    '/api/v1/reputation/submit-subscription-settlement',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    accessToken,
  )
}
