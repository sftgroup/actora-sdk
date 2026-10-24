// @actora/sdk — Payment module (three-rail subscription payments + generic clients)
export { SubscriptionPayments } from './payments'
export type {
  SubscriptionPaymentMethod,
  SubscriptionPaymentsConfig,
  PaySubscriptionInput,
  PaySubscriptionResult,
  X402Info,
} from './payments'

// R19.3 (D11): platform subscription-tier purchases (tenant plans) share the
// same unified payments endpoint; the business binding is `purpose='tenant-plan'`.
export { TenantPlanPayments } from './tenant-plan'
export type {
  TenantPlanPaymentMethod,
  TenantPlanPaymentsConfig,
  BuyTenantPlanInput,
  BuyTenantPlanResult,
} from './tenant-plan'

// v0.9.3: the generic engine (@keelcodes/payments) adds MPP payment channels,
// stablecoin (EIP-3009 / Permit2), period authorization and a2a-pay. Actora
// re-exports the protocol-level clients so integrators can drive those rails
// directly; the business semantics stay in `@keelcodes/payments` metadata.
//
// 0.20.6: 包名由已退役的 `@0xinfrax/payments` 迁到 `@keelcodes/payments ^0.3.1`
// （公开 API 逐字节一致，仅品牌/命名空间变更）；gateway 早已使用该包。
//
// R17.5: @keelcodes/payments@0.1.2 removed the a2a and period rails from the
// generic engine, so Actora self-hosted both (services/payments-a2a-period.ts).
// R17.6: @keelcodes/payments@0.1.3 restored both rails inside the engine. The
// gateway now delegates to the module rails while keeping the HTTP contract
// identical, so A2AClient / PeriodClient keep their public signatures and
// B-side callers see zero change.
// 0.3.0：@keelcodes/payments 移除 MPP（以及 fiat/Stripe）两条 rail，MPPClient 不再导出。
export { X402Client, PaymentsClient } from '@keelcodes/payments'
export { A2AClient } from './a2a-client'
export { PeriodClient } from './period-client'
export type { ClientOptions } from '@keelcodes/payments'

// P6.2: spend policy (business limits → Gator caveat mapping) + approval queue.
export { SpendPolicyClient } from './spend-policy'
export type {
  SpendChain,
  SpendPolicy,
  SpendPolicyDoc,
  SpendPolicyClientConfig,
  SpendGateResult,
  SpendApproval,
  SpendDecisionCode,
  GatorCaveat,
  SpendSession,
  EnableSpendSessionResult,
  ConfirmSpendSessionResult,
  SpendSessionRevokeDraft,
  SpendSessionRevokeResult,
} from './spend-policy'

/** 对齐的通用支付引擎版本（`@keelcodes/payments`）。 */
export const PAYMENT_VERSION = '0.3.1'
