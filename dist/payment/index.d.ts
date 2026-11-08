import { Address, Hash, WalletClient } from 'viem';
import { ChainKey as ChainKey$1, ClientOptions } from '@keelcodes/payments';
export { ClientOptions, PaymentsClient, X402Client } from '@keelcodes/payments';
import { f as SubscriptionManager } from '../subscription-D-kKp1BW.js';
import '../types-C6xHfvpn.js';

type SubscriptionPaymentMethod = 'chain' | 'x402';
type SubscriptionPeriod = 'day' | 'week' | 'month' | 'year';
type ChainKey = ChainKey$1;
interface SubscriptionPaymentsConfig {
    /** Actora Gateway base URL (required for fiat / x402 rails). */
    gatewayUrl?: string;
    /** Optional gateway bearer token. */
    accessToken?: string;
    /** Chain rail — required for `method: 'chain'` and for automatic x402 payment. */
    subscriptionManager?: SubscriptionManager;
    /** Wallet used to automatically fund an x402 payment (if txHash is not supplied). */
    walletClient?: WalletClient;
    /** Which chain to verify x402 payments on (default: bsc). */
    chain?: ChainKey;
}
interface PaySubscriptionInput {
    planId: number;
    agentId: number;
    method: SubscriptionPaymentMethod;
    /** Buyer wallet. Required for x402; chain resolves from the wallet client. */
    subscriber?: Address;
    /** Chain rail: native value override (defaults to the plan price). */
    valueWei?: bigint;
    /** Chain rail: approve the ERC20 token before subscribing. */
    approveTokenFirst?: boolean;
    /** x402 rail: already-sent on-chain payment tx. When omitted and a wallet
     *  client is configured, the payment is sent automatically. */
    txHash?: string;
    /** x402 rail: plan price in wei. When set, the automatic x402 payment uses
     *  this amount instead of reading the plan from the chain contract — needed
     *  for centralized agents whose plans live off-chain (central_plans). */
    priceWei?: bigint;
    /** Billing period (default 'month'). */
    period?: SubscriptionPeriod;
}
type PaySubscriptionResult = {
    method: 'chain';
    subscriptionId: number;
    txHash: Hash;
} | {
    method: 'x402';
    subscriptionId: number;
    txHash: string;
    creditedWei?: string;
};
/** x402 protocol discovery returned by the unified endpoint. */
interface X402Info {
    enabled: boolean;
    priceWei: string;
    payTo: string;
    network: string;
    chain: ChainKey;
}
declare class SubscriptionPayments {
    private config;
    private client;
    constructor(config: SubscriptionPaymentsConfig);
    /** Pay for (or renew) a subscription using the chosen rail. */
    pay(input: PaySubscriptionInput): Promise<PaySubscriptionResult>;
    /**
     * Unified access check across all rails (chain OR x402 / publisher fiat) via
     * the unified /api/v1/payments/access endpoint.
     */
    hasAccess(agentId: number, subscriber: Address): Promise<boolean>;
    /**
     * x402 protocol discovery (price / pay-to wallet / network).
     * @param agentId 传入时返回**该 agent 的收款地址**（`agents.payout_address`），
     *   让自动付款直接付给开发者；未配置该地址时网关回 409 PAYOUT_NOT_CONFIGURED。
     */
    fetchX402Info(agentId?: number): Promise<X402Info>;
    private _payChain;
    private _payX402;
    /** Send the on-chain native transfer to the platform wallet (x402 rail). */
    private _autoFundX402;
    private _fetchJson;
}

type TenantPlanPaymentMethod = 'chain' | 'fiat' | 'x402';
interface TenantPlanPaymentsConfig {
    /** Actora Gateway base URL. */
    gatewayUrl: string;
    /** Optional gateway bearer token (B-end wallet JWT). */
    accessToken?: string;
    /** Which chain to verify on-chain payments on (default: bsc). */
    chain?: ChainKey;
}
interface BuyTenantPlanInput {
    /** Platform plan id (plans table UUID). */
    tenantPlanId: string;
    /** Buying wallet address. */
    subscriber: Address;
    method: TenantPlanPaymentMethod;
    /** chain | x402: already-sent on-chain payment tx. */
    txHash?: Hash | string;
    /** fiat: redirect targets after Stripe checkout. */
    successUrl?: string;
    cancelUrl?: string;
}
type BuyTenantPlanResult = {
    method: 'chain' | 'x402';
    tenantId: string;
    planId: string;
    planSlug: string;
    quotaDaily: string;
    txHash: string;
} | {
    method: 'fiat';
    sessionUrl: string;
    sessionId: string;
    redirect: true;
};
declare class TenantPlanPayments {
    private config;
    constructor(config: TenantPlanPaymentsConfig);
    /** Buy a platform subscription tier on the chosen rail. */
    buy(input: BuyTenantPlanInput): Promise<BuyTenantPlanResult>;
    private _fetchJson;
}

/** a2a-pay client: paymentId two-phase (create → pay → settle). */
declare class A2AClient {
    private opts;
    constructor(opts: ClientOptions);
    /** Phase 1: create a payment intent. */
    create(input: {
        payer: string;
        amountWei: string;
        payee?: string;
        chain?: ChainKey$1;
        metadata?: Record<string, unknown>;
    }): Promise<{
        paymentId: string;
        amountWei: string;
        payee: string;
    }>;
    /** Phase 2: verify the payer's on-chain payment tx (receipt only). */
    settle(input: {
        paymentId: string;
        txHash: string;
        chain?: ChainKey$1;
    }): Promise<{
        verified: boolean;
        paymentId: string;
        payer: string;
        creditedWei: string;
    }>;
}

/** Period-authorization client (P4): charge a period / read state. */
declare class PeriodClient {
    private opts;
    constructor(opts: ClientOptions);
    charge(authorizationId: string): Promise<{
        renewed: boolean;
        remainingWei: string;
    }>;
    authorization(authorizationId: string): Promise<{
        id: string;
        owner: string;
        remainingWei: string;
        periods: number;
        status: string;
    }>;
}

/** 对齐的通用支付引擎版本（`@keelcodes/payments`）。 */
declare const PAYMENT_VERSION = "0.3.1";

export { A2AClient, type BuyTenantPlanInput, type BuyTenantPlanResult, PAYMENT_VERSION, type PaySubscriptionInput, type PaySubscriptionResult, PeriodClient, type SubscriptionPaymentMethod, SubscriptionPayments, type SubscriptionPaymentsConfig, type TenantPlanPaymentMethod, TenantPlanPayments, type TenantPlanPaymentsConfig, type X402Info };
