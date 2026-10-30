export { C as CreatePlanParams, a as CreatePlanResult, P as PlanDetail, b as PlanType, S as SUBSCRIPTION_PERIODS, c as SubscribeResult, d as SubscriptionConfig, e as SubscriptionDetail, f as SubscriptionManager, g as SubscriptionPeriod, Z as ZERO_ADDRESS, h as guardSubscription } from '../subscription-DD5RHSzb.mjs';
import { Address, PublicClient, WalletClient } from 'viem';
import '../types-C6xHfvpn.mjs';

interface Actora402Config {
    subscriptionManagerAddress: Address;
    publicClient: PublicClient;
    walletClient: WalletClient;
}
declare class Actora402 {
    private config;
    constructor(config: Actora402Config);
    /**
     * Require active subscription — or throw with auto-pay info.
     *
     * Usage:
     *   await x402.requireSubscription(agentId, address, { planIds: [1,2,3] })
     *
     * On success, returns silently.
     * On failure, throws ActoraError with paymentInfo populated
     * so the caller can auto-pay via wallet/X402.
     */
    requireSubscription(agentId: number, address: Address, opts?: {
        planIds?: number[];
    }): Promise<void>;
    /**
     * Subscribe to a plan + wait for receipt.
     * Returns subscriptionId from the Subscribed event.
     *
     * NOTE: For ERC20 plans, the caller must approve token spending
     * BEFORE calling this method. Use X402 SDK or wagmi's useWriteContract
     * for the approve step.
     */
    subscribeAndWait(planId: number, price: bigint, payToken: Address): Promise<number>;
}

declare const SUBSCRIPTION_VERSION = "0.3.0";

export { Actora402, type Actora402Config, SUBSCRIPTION_VERSION };
