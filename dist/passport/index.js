"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/passport/index.ts
var passport_exports = {};
__export(passport_exports, {
  PassportApiError: () => PassportApiError,
  PassportClient: () => PassportClient
});
module.exports = __toCommonJS(passport_exports);

// src/passport/passport-client.ts
var PassportApiError = class extends Error {
  constructor(code, status, message) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.name = "PassportApiError";
  }
  code;
  status;
};
function qs(params) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0 && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}
var PassportClient = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  get base() {
    return this.opts.baseUrl.replace(/\/$/, "");
  }
  async call(path, init, requireAuth = false) {
    const headers = {
      ...init?.headers ?? {}
    };
    if (init?.body !== void 0) headers["Content-Type"] = "application/json";
    if (this.opts.apiKey) headers["X-Api-Key"] = this.opts.apiKey;
    if (this.opts.accessToken) headers.Authorization = `Bearer ${this.opts.accessToken}`;
    if (requireAuth && !this.opts.accessToken && !this.opts.apiKey) {
      throw new PassportApiError("UNAUTHORIZED", 401);
    }
    const res = await fetch(`${this.base}${path}`, { ...init, headers });
    if (!res.ok) {
      let code = `HTTP_${res.status}`;
      let message;
      try {
        const body = await res.json();
        if (body.code) code = body.code;
        else if (body.error) code = body.error;
        message = body.message;
      } catch {
      }
      throw new PassportApiError(code, res.status, message);
    }
    return res.json();
  }
  // ── 护照（描述 / 端点 / 声誉）─────────────────────────────────────────────
  /** `chain` 缺省时由网关跨链解析（central → bsc → ethereum → base）。 */
  getAgent(agentId, chain) {
    return this.call(`/api/v1/agents/${agentId}${qs({ chain })}`);
  }
  // ── 回执 ────────────────────────────────────────────────────────────────
  /** 单张回执 + 平台验签结果（公开）。 */
  getReceipt(receiptId) {
    return this.call(`/api/v1/receipts/${encodeURIComponent(receiptId)}`);
  }
  /** 回执列表：`chain` / `agentId` / `subject` 至少给一个，否则网关 400。 */
  async listReceipts(filter) {
    const body = await this.call(
      `/api/v1/receipts${qs({
        chain: filter.chain,
        agentId: filter.agentId,
        subject: filter.subject,
        before: filter.before,
        limit: filter.limit
      })}`
    );
    return body.receipts ?? [];
  }
  // ── 收款地址 ─────────────────────────────────────────────────────────────
  getPayout(chain, agentId) {
    return this.call(`/api/v1/agents/${chain}/${agentId}/payout`);
  }
  /**
   * 设置 / 清除收款地址（仅 owner）。
   * @param payoutAddress null = 撤回收款意图，此后该 agent 不再生成 402。
   */
  setPayout(chain, agentId, payoutAddress) {
    return this.call(
      `/api/v1/agents/${chain}/${agentId}/payout`,
      { method: "PUT", body: JSON.stringify({ payoutAddress }) },
      true
    );
  }
  // ── Webhook ──────────────────────────────────────────────────────────────
  async listWebhooks() {
    const body = await this.call("/api/v1/webhooks", void 0, true);
    return body.endpoints ?? [];
  }
  createWebhook(input) {
    return this.call(
      "/api/v1/webhooks",
      { method: "POST", body: JSON.stringify(input) },
      true
    );
  }
  async revokeWebhook(id) {
    await this.call(`/api/v1/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
  }
  // ── 一源多发 ─────────────────────────────────────────────────────────────
  /** 各平台物料；`blocked` 的条目带 `reason`（不发外部请求）。 */
  getPublishPlan(chain, agentId) {
    return this.call(`/api/v1/agents/${chain}/${agentId}/publish-plan`);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PassportApiError,
  PassportClient
});
//# sourceMappingURL=index.js.map