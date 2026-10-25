// @actora/sdk — Reputation module
export { ReputationRegistry } from './reputation'
export type { ReputationConfig, ReputationFlavor, ReputationSummary, ReputationFeedback } from './reputation'
export {
  SETTLEMENT_PROOF_DOMAIN_NAME,
  SETTLEMENT_PROOF_DOMAIN_VERSION,
  SETTLEMENT_PROOF_TYPES,
  getSettlementDomain,
  signSettlementProof,
  submitSettlement,
  submitSubscriptionSettlement,
} from './settlement'
export type {
  SettlementChain,
  SettlementDomain,
  SettlementDomainResponse,
  SettlementProofMessage,
  SubmitSettlementInput,
  SubmitSettlementResult,
  SubmitSubscriptionSettlementInput,
  SubscriptionSettlementResult,
  SubscriptionSettlementStatus,
} from './settlement'
export const REPUTATION_VERSION = '0.2.0'
