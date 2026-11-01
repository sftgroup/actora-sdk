// src/payment/payments.ts
import { PaymentsClient } from "@keelcodes/payments";
var PERIODS = ["day", "week", "month", "year"];
var SubscriptionPayments = class {
  constructor(config) {
    this.config = config;
    this.client = config.gatewayUrl ? new PaymentsClient({ baseUrl: config.gatewayUrl, accessToken: config.accessToken }) : null;
  }
  config;
  client;
  // ── Public API ──────────────────────────────────────────────────────────
  /** Pay for (or renew) a subscription using the chosen rail. */
  async pay(input) {
    switch (input.method) {
      case "chain":
        return this._payChain(input);
      case "fiat":
        return this._payFiat(input);
      case "x402":
        return this._payX402(input);
    }
  }
  /**
   * Unified access check across all rails (chain OR fiat/x402) via the
   * unified /api/v1/payments/access endpoint.
   */
  async hasAccess(agentId, subscriber) {
    if (!this.client) {
      throw new Error("hasAccess() requires a gatewayUrl");
    }
    const res = await this.client.access(subscriber, agentId, this.config.chain ?? "bsc");
    return res.active === true;
  }
  /**
   * x402 protocol discovery (price / pay-to wallet / network).
   * @param agentId 传入时返回**该 agent 的收款地址**（`agents.payout_address`），
   *   让自动付款直接付给开发者；未配置该地址时网关回 409 PAYOUT_NOT_CONFIGURED。
   */
  async fetchX402Info(agentId) {
    if (!this.client) {
      throw new Error("fetchX402Info() requires a gatewayUrl");
    }
    if (agentId === void 0) {
      const info2 = await this.client.info();
      return {
        enabled: Boolean(info2.x402?.enabled),
        priceWei: info2.x402?.priceWei ?? "0",
        payTo: info2.x402?.payTo ?? "",
        network: info2.x402?.network ?? "",
        chain: info2.x402?.chain ?? this.config.chain ?? "bsc"
      };
    }
    const info = await this._fetchJson(`/api/v1/x402/info?agentId=${encodeURIComponent(String(agentId))}`);
    return {
      enabled: Boolean(info.enabled),
      priceWei: info.priceWei ?? "0",
      payTo: info.payTo ?? "",
      network: info.network ?? "",
      chain: info.chain ?? this.config.chain ?? "bsc"
    };
  }
  // ── Rails ───────────────────────────────────────────────────────────────
  async _payChain(input) {
    const sm = this.config.subscriptionManager;
    if (!sm) throw new Error('method "chain" requires a SubscriptionManager in the config');
    const result = await sm.subscribe(input.planId, {
      valueWei: input.valueWei,
      approveTokenFirst: input.approveTokenFirst
    });
    return { method: "chain", subscriptionId: result.subscriptionId, txHash: result.txHash };
  }
  async _payFiat(input) {
    if (!this.client) throw new Error('method "fiat" requires a gatewayUrl');
    if (!input.subscriber) throw new Error('method "fiat" requires a subscriber address');
    if (!PERIODS.includes(input.period ?? "month")) {
      throw new Error("period must be one of: day | week | month | year");
    }
    const data = await this._fetchJson("/api/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "fiat",
        subscriber: input.subscriber,
        agentId: input.agentId,
        planId: input.planId,
        period: input.period ?? "month",
        currency: input.currency ?? "usd",
        chain: this.config.chain ?? "bsc",
        amountCents: input.amountCents,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl
      })
    });
    if (!data.sessionUrl) throw new Error("fiat: gateway did not return a checkout session url");
    return {
      method: "fiat",
      sessionUrl: data.sessionUrl,
      sessionId: data.sessionId ?? data.paymentId ?? "",
      redirect: true
    };
  }
  async _payX402(input) {
    if (!this.client) throw new Error('method "x402" requires a gatewayUrl');
    if (!input.subscriber) throw new Error('method "x402" requires a subscriber address');
    if (!PERIODS.includes(input.period ?? "month")) {
      throw new Error("period must be one of: day | week | month | year");
    }
    let txHash = input.txHash;
    if (!txHash) {
      txHash = await this._autoFundX402(input);
    }
    const data = await this._fetchJson("/api/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "x402",
        subscriber: input.subscriber,
        agentId: input.agentId,
        planId: input.planId,
        period: input.period ?? "month",
        txHash,
        chain: this.config.chain ?? "bsc"
      })
    });
    return {
      method: "x402",
      subscriptionId: data.subscriptionId,
      txHash,
      creditedWei: data.creditedWei
    };
  }
  /** Send the on-chain native transfer to the platform wallet (x402 rail). */
  async _autoFundX402(input) {
    const { walletClient, subscriptionManager } = this.config;
    if (!walletClient || !subscriptionManager) {
      throw new Error("x402 automatic payment needs a txHash, or a walletClient + subscriptionManager in the config");
    }
    const info = await this.fetchX402Info(input.agentId);
    if (!info.payTo) {
      throw new Error(`x402 payment target unavailable for agent ${input.agentId} (payout_address not configured)`);
    }
    if (!info.enabled) {
      throw new Error("x402 is not enabled on the Gateway (X402_ENABLED missing)");
    }
    const priceWei = BigInt(info.priceWei || "0");
    const amount = input.priceWei !== void 0 ? input.priceWei > priceWei ? input.priceWei : priceWei : (async () => {
      const plan = await subscriptionManager.getPlan(input.planId);
      return plan.price > priceWei ? plan.price : priceWei;
    })();
    const resolvedAmount = typeof amount === "bigint" ? amount : await amount;
    let account = walletClient.account?.address;
    if (!account) {
      const [addr] = await walletClient.getAddresses();
      account = addr;
    }
    if (!account) throw new Error("Wallet not connected for x402 payment");
    const hash = await walletClient.sendTransaction({
      to: info.payTo,
      value: resolvedAmount,
      chain: void 0,
      account
    });
    return hash;
  }
  // ── HTTP helpers ────────────────────────────────────────────────────────
  async _fetchJson(path, init) {
    const base = (this.config.gatewayUrl ?? "").replace(/\/$/, "");
    const headers = { ...init?.headers };
    if (this.config.accessToken) headers.Authorization = `Bearer ${this.config.accessToken}`;
    const resp = await fetch(`${base}${path}`, { ...init, headers });
    if (!resp.ok) {
      let message = `Gateway request failed (${resp.status}): ${path}`;
      try {
        const body = await resp.json();
        if (body.error) message = body.error;
      } catch {
      }
      throw new Error(message);
    }
    return await resp.json();
  }
};

// src/payment/tenant-plan.ts
var TenantPlanPayments = class {
  constructor(config) {
    this.config = config;
  }
  config;
  /** Buy a platform subscription tier on the chosen rail. */
  async buy(input) {
    if (!input.txHash && input.method !== "fiat") {
      throw new Error("txHash is required for the chain / x402 rails");
    }
    const body = {
      method: input.method,
      purpose: "tenant-plan",
      tenantPlanId: input.tenantPlanId,
      subscriber: input.subscriber,
      chain: this.config.chain ?? "bsc",
      txHash: input.txHash,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    };
    const data = await this._fetchJson("/api/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (input.method === "fiat") {
      if (!data.sessionUrl) throw new Error("Fiat checkout returned no redirect URL");
      return { method: "fiat", sessionUrl: data.sessionUrl, sessionId: data.sessionId, redirect: true };
    }
    return {
      method: input.method,
      tenantId: String(data.tenantId ?? ""),
      planId: String(data.planId ?? ""),
      planSlug: String(data.planSlug ?? ""),
      quotaDaily: String(data.quotaDaily ?? "0"),
      txHash: String(input.txHash ?? "")
    };
  }
  // ── HTTP helpers ────────────────────────────────────────────────────────
  async _fetchJson(path, init) {
    const base = (this.config.gatewayUrl ?? "").replace(/\/$/, "");
    const headers = { ...init?.headers };
    if (this.config.accessToken) headers.Authorization = `Bearer ${this.config.accessToken}`;
    const resp = await fetch(`${base}${path}`, { ...init, headers });
    if (!resp.ok) {
      let message = `Gateway request failed (${resp.status}): ${path}`;
      try {
        const body = await resp.json();
        if (body.error) message = body.error;
      } catch {
      }
      throw new Error(message);
    }
    return await resp.json();
  }
};

// src/payment/index.ts
import { X402Client, PaymentsClient as PaymentsClient2 } from "@keelcodes/payments";

// src/payment/a2a-client.ts
async function request(baseUrl, path, init, accessToken) {
  const base = baseUrl.replace(/\/$/, "");
  const headers = {
    ...init?.headers ?? {}
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const resp = await fetch(`${base}${path}`, { ...init, headers });
  if (!resp.ok) {
    let message = `Payments request failed (${resp.status}): ${path}`;
    try {
      const body = await resp.json();
      if (body.error) message = body.error;
    } catch {
    }
    throw new Error(message);
  }
  return resp.json();
}
var A2AClient = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  /** Phase 1: create a payment intent. */
  async create(input) {
    return request(
      this.opts.baseUrl,
      "/api/v1/payments/a2a",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      this.opts.accessToken
    );
  }
  /** Phase 2: verify the payer's on-chain payment tx (receipt only). */
  async settle(input) {
    return request(
      this.opts.baseUrl,
      "/api/v1/payments/a2a/settle",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      this.opts.accessToken
    );
  }
};

// src/payment/period-client.ts
var PeriodClient = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  async charge(authorizationId) {
    return request(
      this.opts.baseUrl,
      "/api/v1/payments/period/charge",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorizationId }) },
      this.opts.accessToken
    );
  }
  async authorization(authorizationId) {
    return request(this.opts.baseUrl, `/api/v1/payments/period/authorization?authorizationId=${encodeURIComponent(authorizationId)}`, void 0, this.opts.accessToken);
  }
};

// src/payment/spend-policy.ts
var SpendPolicyClient = class {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.gatewayUrl.replace(/\/$/, "");
  }
  config;
  baseUrl;
  async request(method, path, body) {
    const headers = {};
    if (body !== void 0) headers["Content-Type"] = "application/json";
    if (this.config.apiKey) headers["X-Api-Key"] = this.config.apiKey;
    if (this.config.accessToken) headers["Authorization"] = `Bearer ${this.config.accessToken}`;
    if (!this.config.apiKey && !this.config.accessToken) {
      throw new Error("SpendPolicyClient requires either apiKey or accessToken");
    }
    const res = await fetch(`${this.baseUrl}/api/v1/spend-policy${path}`, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = json?.message ?? json?.error ?? `HTTP ${res.status}`;
      throw new Error(`Spend policy request failed: ${detail}`);
    }
    return json;
  }
  /** 该钱包全部链的策略。 */
  async list() {
    const out = await this.request("GET", "");
    return out.policies;
  }
  /** 单链策略 + 派生的 Gator caveat 组合。 */
  get(chain) {
    return this.request("GET", `/${chain}`);
  }
  /** 写入 / 更新策略（非法字段网关返回 400）。 */
  put(chain, policy, enabled = true) {
    return this.request("PUT", `/${chain}`, { policy, enabled });
  }
  /** 停用策略（保留记录，可重新 put 启用）。 */
  disable(chain) {
    return this.request("DELETE", `/${chain}`);
  }
  /**
   * dry-run 校验一笔支出（不落流水、不代付）。
   * `refId` 建议传任务/订单稳定 ID：超额时会据此进入审批队列并去重。
   */
  check(input) {
    return this.request("POST", "/check", input);
  }
  /** 超额审批队列（默认全部，可传 status 过滤）。 */
  async approvals(opts = {}) {
    const qs = new URLSearchParams();
    if (opts.status) qs.set("status", opts.status);
    if (opts.limit) qs.set("limit", String(opts.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const out = await this.request("GET", `/approvals${suffix}`);
    return out.approvals;
  }
  /** 人工审批（approve 只能被消费一次；reject 后同一 refId 永久拒绝）。 */
  async decide(id, decision) {
    const out = await this.request("POST", `/approvals/${id}/decide`, { decision });
    return out.approval;
  }
  // ── 按次 session 授权（Keel v1；不预充值、不记账）─────────────────────
  /** 我的全部链 session 授权状态。 */
  async sessions() {
    const out = await this.request("GET", "/session");
    return out.sessions;
  }
  /**
   * 第一步：创建 session（必要时顺带部署智能账户）并返回 owner 待签 digest。
   * 用户对 `digest` 裸签后调用 `confirmSession` 上链。
   */
  enableSession(input = {}) {
    return this.request("POST", "/session/enable", input);
  }
  /** 第二步：提交 owner 裸签（65 字节 hex）完成授权。 */
  confirmSession(input) {
    return this.request("POST", "/session/confirm", input);
  }
  /**
   * 撤销第一步：冻结撤销 op 并返回待签 digest（网关落草稿，避免 nonce/gas 变化导致签名失配）。
   * v0 存量 session 无法在链上定位，网关返回 409，需重新 `enableSession` 迁移到 v1。
   */
  prepareSessionRevoke(input = {}) {
    return this.request("POST", "/session/revoke", input);
  }
  /** 撤销第二步：带回第一步的 `digest` 的 owner 签名提交上链。 */
  revokeSession(input) {
    return this.request("POST", "/session/revoke", input);
  }
};

// src/payment/index.ts
var PAYMENT_VERSION = "0.3.1";
export {
  A2AClient,
  PAYMENT_VERSION,
  PaymentsClient2 as PaymentsClient,
  PeriodClient,
  SpendPolicyClient,
  SubscriptionPayments,
  TenantPlanPayments,
  X402Client
};
//# sourceMappingURL=index.mjs.map