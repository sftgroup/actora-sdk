// ---------------------------------------------------------------------------
// @actora/sdk — On-chain Event Listener
// ---------------------------------------------------------------------------
// Lightweight contract event subscription (Transfer / AgentRegistered on the
// IdentityRegistry, PlanCreated / SubscriptionCreated on the SubscriptionManager).
// Uses viem `watchContractEvent` in poll mode (works over any transport).
// Replaces 2-minute polling loops with near-real-time event-driven sync.
// ---------------------------------------------------------------------------

import { parseAbiItem } from 'viem'
import type { Address, Hash, PublicClient } from 'viem'

// ── Event ABIs ─────────────────────────────────────────────────────────────

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
)
const AGENT_REGISTERED_EVENT = parseAbiItem(
  'event AgentRegistered(uint256 indexed agentId, address indexed creator, string tokenURI)'
)
/** canonical ERC-8004 标准注册事件（历史实现用 `AgentRegistered`）。 */
const REGISTERED_EVENT = parseAbiItem(
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)'
)
const PLAN_CREATED_EVENT = parseAbiItem(
  'event PlanCreated(uint256 indexed planId, uint256 indexed agentId, string name, uint8 planType, address token, uint256 subscriptionPrice, uint256 usagePrice, uint8 billingPeriod, uint256 platformFeePercentage)'
)
const SUBSCRIPTION_CREATED_EVENT = parseAbiItem(
  'event SubscriptionCreated(uint256 indexed subscriptionId, uint256 indexed planId, uint256 indexed agentId, address subscriber, uint8 planType, uint256 startDate, uint256 nextBillingDate)'
)

const EVENT_ABI = {
  Transfer: TRANSFER_EVENT,
  AgentRegistered: AGENT_REGISTERED_EVENT,
  Registered: REGISTERED_EVENT,
  PlanCreated: PLAN_CREATED_EVENT,
  SubscriptionCreated: SUBSCRIPTION_CREATED_EVENT,
} as const

// ── Types ──────────────────────────────────────────────────────────────────

export type ActoraEventType = 'Transfer' | 'AgentRegistered' | 'Registered' | 'PlanCreated' | 'SubscriptionCreated'

export interface ActoraChainEvent {
  type: ActoraEventType
  args: Record<string, unknown>
  txHash: Hash
}

export interface EventListenerOptions {
  /** IdentityRegistry address (emits Transfer / AgentRegistered). */
  identityRegistryAddress?: Address
  /** SubscriptionManager address (emits PlanCreated / Subscribed). */
  subscriptionManagerAddress?: Address
  events: ActoraEventType[]
  onEvent: (event: ActoraChainEvent) => void
  /** Start listening from this block (default: latest). */
  fromBlock?: number
  /** Polling interval in ms (default: 4000). */
  pollingInterval?: number
}

// Which events each contract can emit.
const CONTRACT_EVENTS: Record<'identityRegistryAddress' | 'subscriptionManagerAddress', readonly ActoraEventType[]> = {
  // Transfer 两个实现都有；AgentRegistered=历史实现，Registered=canonical 标准
  identityRegistryAddress: ['Transfer', 'AgentRegistered', 'Registered'],
  subscriptionManagerAddress: ['PlanCreated', 'SubscriptionCreated'],
}

// ── Listener ───────────────────────────────────────────────────────────────

/**
 * Subscribe to Actora contract events and receive a normalized callback.
 *
 * @returns A function that unsubscribes from all watched events.
 */
export function subscribeToEvents(
  publicClient: PublicClient,
  options: EventListenerOptions
): Promise<() => void> {
  const unwatchAll: (() => void)[] = []

  const contracts = [
    { address: options.identityRegistryAddress, events: CONTRACT_EVENTS.identityRegistryAddress },
    { address: options.subscriptionManagerAddress, events: CONTRACT_EVENTS.subscriptionManagerAddress },
  ]

  for (const { address, events } of contracts) {
    if (!address) continue
    for (const eventName of events) {
      if (!options.events.includes(eventName)) continue
      unwatchAll.push(
        publicClient.watchContractEvent({
          address,
          abi: [EVENT_ABI[eventName]],
          eventName,
          fromBlock: options.fromBlock !== undefined ? BigInt(options.fromBlock) : undefined,
          pollingInterval: options.pollingInterval,
          onLogs: (logs) => {
            for (const log of logs) {
              options.onEvent({
                type: eventName,
                args: log.args as Record<string, unknown>,
                txHash: log.transactionHash,
              })
            }
          },
        })
      )
    }
  }

  return Promise.resolve(() => {
    for (const unwatch of unwatchAll) unwatch()
  })
}
