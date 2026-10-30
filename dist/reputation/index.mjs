var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// node_modules/viem/_esm/utils/data/isHex.js
function isHex(value, { strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
var init_isHex = __esm({
  "node_modules/viem/_esm/utils/data/isHex.js"() {
    "use strict";
  }
});

// node_modules/viem/_esm/utils/data/size.js
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = __esm({
  "node_modules/viem/_esm/utils/data/size.js"() {
    "use strict";
    init_isHex();
  }
});

// node_modules/viem/_esm/errors/version.js
var version;
var init_version = __esm({
  "node_modules/viem/_esm/errors/version.js"() {
    "use strict";
    version = "2.55.2";
  }
});

// node_modules/viem/_esm/errors/base.js
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig, BaseError;
var init_base = __esm({
  "node_modules/viem/_esm/errors/base.js"() {
    "use strict";
    init_version();
    errorConfig = {
      getDocsUrl: ({ docsBaseUrl, docsPath = "", docsSlug }) => docsPath ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
      version: `viem@${version}`
    };
    BaseError = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.details;
          if (args.cause?.message)
            return args.cause.message;
          return args.details;
        })();
        const docsPath = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.docsPath || args.docsPath;
          return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsUrl ? [`Docs: ${docsUrl}`] : [],
          ...details ? [`Details: ${details}`] : [],
          ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
        ].join("\n");
        super(message, args.cause ? { cause: args.cause } : void 0);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "version", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "BaseError"
        });
        this.details = details;
        this.docsPath = docsPath;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version;
      }
      walk(fn) {
        return walk(this, fn);
      }
    };
  }
});

// node_modules/viem/_esm/errors/data.js
var SizeExceedsPaddingSizeError;
var init_data = __esm({
  "node_modules/viem/_esm/errors/data.js"() {
    "use strict";
    init_base();
    SizeExceedsPaddingSizeError = class extends BaseError {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/pad.js
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i = 0; i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm({
  "node_modules/viem/_esm/utils/data/pad.js"() {
    "use strict";
    init_data();
  }
});

// node_modules/viem/_esm/errors/encoding.js
var IntegerOutOfRangeError, SizeOverflowError;
var init_encoding = __esm({
  "node_modules/viem/_esm/errors/encoding.js"() {
    "use strict";
    init_base();
    IntegerOutOfRangeError = class extends BaseError {
      constructor({ max, min, signed, size: size2, value }) {
        super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
      }
    };
    SizeOverflowError = class extends BaseError {
      constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/encoding/fromHex.js
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
var init_fromHex = __esm({
  "node_modules/viem/_esm/utils/encoding/fromHex.js"() {
    "use strict";
    init_encoding();
    init_size();
  }
});

// node_modules/viem/_esm/utils/encoding/toHex.js
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  for (let i = 0; i < value.length; i++) {
    string += hexes[value[i]];
  }
  const hex = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
function stringToHex(value_, opts = {}) {
  const value = encoder.encode(value_);
  return bytesToHex(value, opts);
}
var hexes, encoder;
var init_toHex = __esm({
  "node_modules/viem/_esm/utils/encoding/toHex.js"() {
    "use strict";
    init_encoding();
    init_pad();
    init_fromHex();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
    encoder = /* @__PURE__ */ new TextEncoder();
  }
});

// node_modules/viem/_esm/utils/encoding/toBytes.js
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex_, opts = {}) {
  let hex = hex_;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hex = pad(hex, { dir: "right", size: opts.size });
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder2.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder2, charCodeMap;
var init_toBytes = __esm({
  "node_modules/viem/_esm/utils/encoding/toBytes.js"() {
    "use strict";
    init_base();
    init_isHex();
    init_pad();
    init_fromHex();
    init_toHex();
    encoder2 = /* @__PURE__ */ new TextEncoder();
    charCodeMap = {
      zero: 48,
      nine: 57,
      A: 65,
      F: 70,
      a: 97,
      f: 102
    };
  }
});

// node_modules/viem/_esm/utils/hash/keccak256.js
import { keccak_256 } from "@noble/hashes/sha3";
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm({
  "node_modules/viem/_esm/utils/hash/keccak256.js"() {
    "use strict";
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// src/reputation/reputation.ts
var ZERO32 = `0x${"0".repeat(64)}`;
function isRevertError(err) {
  let cur = err;
  for (let i = 0; i < 6 && cur; i++) {
    const e = cur;
    if (typeof e.name === "string" && /revert/i.test(e.name)) return true;
    if (typeof e.message === "string" && /revert/i.test(e.message)) return true;
    cur = e.cause;
  }
  return false;
}
function tagToBytes32(tag) {
  if (!tag) return ZERO32;
  const bytes = Buffer.from(tag, "utf8");
  if (bytes.length > 32) throw new Error("reputation tag exceeds 32 bytes");
  return `0x${bytes.toString("hex").padEnd(64, "0")}`;
}
function bytes32ToString(v) {
  const hex = v.slice(2);
  let end = hex.length;
  while (end > 0 && hex.slice(end - 2, end) === "00") end -= 2;
  const trimmed = hex.slice(0, end);
  return trimmed ? Buffer.from(trimmed, "hex").toString("utf8") : "";
}
var LEGACY_ABI = {
  getReputationSummary: {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" }
    ],
    name: "getReputationSummary",
    outputs: [
      { name: "count", type: "uint64" },
      { name: "averageScore", type: "uint8" }
    ],
    stateMutability: "view",
    type: "function"
  },
  readFeedback: {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "index", type: "uint64" }
    ],
    name: "readFeedback",
    outputs: [
      { name: "score", type: "uint8" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
      { name: "isRevoked", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  }
};
var STANDARD_ABI = {
  getSummary: {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" }
    ],
    name: "getSummary",
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" }
    ],
    stateMutability: "view",
    type: "function"
  },
  readFeedback: {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint64" }
    ],
    name: "readFeedback",
    outputs: [
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "isRevoked", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  }
};
var COMMON_ABI = {
  getClients: {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getClients",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  getLastIndex: {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" }
    ],
    name: "getLastIndex",
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function"
  }
};
var ReputationRegistry = class {
  address;
  publicClient;
  /** 实现风格探测结果（缓存）：standard=canonical / legacy=历史实现。 */
  flavor;
  constructor(config) {
    this.address = config.contractAddress;
    this.publicClient = config.publicClient;
  }
  // ── Implementation flavor detection ─────────────────────────────────────
  /**
   * 尝试读取 legacy 视图 `getReputationSummary()`：
   *   - 成功 → 判定 `'legacy'`
   *   - 确定 revert → 判定 `'standard'`（canonical 无该视图，只有 `getSummary`）
   * 结果缓存在实例上，因此 legacy 链**不会**因探测产生额外调用。
   */
  async legacyProbe() {
    if (this.flavor === "legacy") return true;
    if (this.flavor === "standard") return false;
    try {
      await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.getReputationSummary],
        functionName: "getReputationSummary",
        args: [0n, [], ZERO32, ZERO32]
      });
      this.flavor = "legacy";
      return true;
    } catch (err) {
      if (!isRevertError(err)) throw err;
      this.flavor = "standard";
      return false;
    }
  }
  /** 实现风格（缓存）：`'standard'`=官方 canonical / `'legacy'`=历史实现。 */
  async getFlavor() {
    return await this.legacyProbe() ? "legacy" : "standard";
  }
  // ── 读：聚合 ─────────────────────────────────────────────────────────
  /**
   * 聚合读取（标准形参）。
   * @dev legacy：转调 `getReputationSummary`（uint8 均分）→ 归一化为 `valueDecimals=0`；
   *      standard：转调标准 `getSummary`。
   *      注意：standard 下 `clients` 为空会 revert（标准要求显式传入客户地址）。
   */
  async getSummary(agentId, clients = [], tag1 = "", tag2 = "") {
    if (await this.legacyProbe()) {
      const r2 = await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.getReputationSummary],
        functionName: "getReputationSummary",
        args: [BigInt(agentId), clients, tagToBytes32(tag1), tagToBytes32(tag2)]
      });
      return { count: Number(r2[0]), value: BigInt(r2[1]), valueDecimals: 0 };
    }
    const r = await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_ABI.getSummary],
      functionName: "getSummary",
      args: [BigInt(agentId), clients, tag1, tag2]
    });
    return { count: Number(r[0]), value: r[1], valueDecimals: Number(r[2]) };
  }
  /** legacy 兼容聚合（uint8 均分）。standard 下由 `getSummary` 归一到 0-100。 */
  async getReputationSummary(agentId, clients = [], tag1 = "", tag2 = "") {
    if (await this.legacyProbe()) {
      const r = await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.getReputationSummary],
        functionName: "getReputationSummary",
        args: [BigInt(agentId), clients, tagToBytes32(tag1), tagToBytes32(tag2)]
      });
      return { count: Number(r[0]), averageScore: Number(r[1]) };
    }
    const { count, value, valueDecimals } = await this.getSummary(agentId, clients, tag1, tag2);
    return { count, averageScore: normalizeScore(value, valueDecimals) };
  }
  // ── 读：明细 / 枚举 ──────────────────────────────────────────────────
  /** 单条反馈（标准形参）。 */
  async readFeedback(agentId, clientAddress, index) {
    if (await this.legacyProbe()) {
      const r2 = await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.readFeedback],
        functionName: "readFeedback",
        args: [BigInt(agentId), clientAddress, BigInt(index)]
      });
      return {
        value: BigInt(r2[0]),
        valueDecimals: 0,
        tag1: bytes32ToString(r2[1]),
        tag2: bytes32ToString(r2[2]),
        isRevoked: r2[3]
      };
    }
    const r = await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_ABI.readFeedback],
      functionName: "readFeedback",
      args: [BigInt(agentId), clientAddress, BigInt(index)]
    });
    return {
      value: r[0],
      valueDecimals: Number(r[1]),
      tag1: r[2],
      tag2: r[3],
      isRevoked: r[4]
    };
  }
  /** 给出反馈的客户地址列表（两版同签名）。 */
  async getClients(agentId) {
    const r = await this.publicClient.readContract({
      address: this.address,
      abi: [COMMON_ABI.getClients],
      functionName: "getClients",
      args: [BigInt(agentId)]
    });
    return [...r];
  }
  /** 某客户在 agent 上的最后反馈索引（0 表示没有）。 */
  async getLastIndex(agentId, clientAddress) {
    const r = await this.publicClient.readContract({
      address: this.address,
      abi: [COMMON_ABI.getLastIndex],
      functionName: "getLastIndex",
      args: [BigInt(agentId), clientAddress]
    });
    return Number(r);
  }
};
function normalizeScore(value, valueDecimals) {
  let v = value;
  if (valueDecimals > 0) {
    v = v / 10n ** BigInt(valueDecimals);
  }
  if (v <= 0n) return 0;
  if (v >= 100n) return 100;
  return Number(v);
}

// node_modules/viem/_esm/index.js
init_pad();
init_toHex();
init_keccak256();

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

// src/reputation/settlement.ts
var SETTLEMENT_PROOF_DOMAIN_NAME = "ActoraPaymentSettlement";
var SETTLEMENT_PROOF_DOMAIN_VERSION = "1";
var SETTLEMENT_PROOF_TYPES = {
  SettlementProof: [
    { name: "agentId", type: "uint256" },
    { name: "payer", type: "address" },
    { name: "asset", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "rail", type: "string" },
    { name: "taskRef", type: "bytes32" },
    { name: "settlementRef", type: "bytes32" },
    { name: "settledAt", type: "uint64" }
  ]
};
var PRIMARY_TYPE = "SettlementProof";
function deriveTaskRef(jobId) {
  return keccak256(stringToHex(jobId));
}
function deriveSettlementRef(rail, ref, milestoneIndex = 0) {
  switch (rail) {
    case "erc8183":
      return pad(toHex(BigInt(ref)), { size: 32 });
    case "milestone":
      return keccak256(stringToHex(`${ref}:${milestoneIndex}`));
    case "x402":
    case "sessionKey":
      return keccak256(stringToHex(ref));
  }
}
async function getSettlementDomain(baseUrl, chain, accessToken) {
  return request(baseUrl, `/api/v1/reputation/settlement-domain/${chain}`, { method: "GET" }, accessToken);
}
async function signSettlementProof(params) {
  const account = params.account ?? params.wallet.account;
  if (!account) throw new Error("signSettlementProof: wallet has no account");
  return params.wallet.signTypedData({
    account,
    domain: params.domain,
    types: SETTLEMENT_PROOF_TYPES,
    primaryType: PRIMARY_TYPE,
    message: params.message
  });
}
async function submitSettlement(baseUrl, input, accessToken) {
  return request(
    baseUrl,
    "/api/v1/reputation/submit-settlement",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    },
    accessToken
  );
}
async function submitSubscriptionSettlement(baseUrl, input, accessToken) {
  return request(
    baseUrl,
    "/api/v1/reputation/submit-subscription-settlement",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    },
    accessToken
  );
}

// src/reputation/index.ts
var REPUTATION_VERSION = "0.2.0";
export {
  REPUTATION_VERSION,
  ReputationRegistry,
  SETTLEMENT_PROOF_DOMAIN_NAME,
  SETTLEMENT_PROOF_DOMAIN_VERSION,
  SETTLEMENT_PROOF_TYPES,
  deriveSettlementRef,
  deriveTaskRef,
  getSettlementDomain,
  signSettlementProof,
  submitSettlement,
  submitSubscriptionSettlement
};
//# sourceMappingURL=index.mjs.map