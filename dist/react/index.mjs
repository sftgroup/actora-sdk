var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/react/useAgentRunner.ts
import { useState, useEffect, useRef } from "react";
import { usePublicClient, useWalletClient } from "wagmi";

// src/core/crypto.ts
import { gcm } from "@noble/ciphers/aes.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { hmac } from "@noble/hashes/hmac.js";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
function randomBytes(length) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    return buf;
  }
  const nodeCrypto = __require("crypto");
  return new Uint8Array(nodeCrypto.randomBytes(length));
}
var AES_KEY_SIZE = 32;
var IV_SIZE = 12;
var TAG_SIZE = 16;
function fromBase64(b64) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function aesDecrypt(encryptedBase64, keyHex) {
  const key = hexToBytes(keyHex);
  const combined = fromBase64(encryptedBase64);
  const iv = combined.subarray(0, IV_SIZE);
  const ciphertext = combined.subarray(IV_SIZE, -TAG_SIZE);
  const authTag = combined.subarray(-TAG_SIZE);
  const cipher = gcm(key, iv);
  const ciphertextWithTag = new Uint8Array(ciphertext.length + TAG_SIZE);
  ciphertextWithTag.set(ciphertext, 0);
  ciphertextWithTag.set(authTag, ciphertext.length);
  const decrypted = cipher.decrypt(ciphertextWithTag);
  return new TextDecoder().decode(decrypted);
}
function generateAesKey() {
  return bytesToHex(randomBytes(AES_KEY_SIZE));
}
function eciesEncode(ephemeralPub, iv, ciphertext, mac) {
  const out = new Uint8Array(33 + 16 + ciphertext.length + 32);
  out.set(ephemeralPub, 0);
  out.set(iv, 33);
  out.set(ciphertext, 33 + 16);
  out.set(mac, 33 + 16 + ciphertext.length);
  return bytesToHex(out);
}
function eciesDecode(dataHex) {
  const d = hexToBytes(dataHex);
  return {
    ephemeralPub: d.subarray(0, 33),
    iv: d.subarray(33, 49),
    ciphertext: d.subarray(49, -32),
    mac: d.subarray(-32)
  };
}
function aesCtrEncrypt(key, ctrBytes, data) {
  const blockSize = 16;
  const cipher = gcm(key, ctrBytes);
  const result = new Uint8Array(data.length);
  const counter = new Uint8Array(blockSize);
  counter.set(ctrBytes);
  for (let i = 0; i < data.length; i += blockSize) {
    const keystream = gcm(key, counter).encrypt(new Uint8Array(blockSize));
    for (let j = 0; j < blockSize && i + j < data.length; j++) {
      result[i + j] = keystream[j] ^ data[i + j];
    }
    for (let j = blockSize - 1; j >= 0; j--) {
      const val = counter[j];
      if (val !== void 0) {
        counter[j] = val + 1 & 255;
        if (counter[j] !== 0) break;
      }
    }
  }
  return result;
}
function eciesEncrypt(dataHex, publicKey) {
  const ephPriv = randomBytes(32);
  const ephPub = secp256k1.getPublicKey(ephPriv, true);
  let recipientPub;
  if (publicKey.startsWith("04") && publicKey.length === 130) {
    recipientPub = hexToBytes(publicKey);
  } else if (publicKey.startsWith("02") || publicKey.startsWith("03")) {
    recipientPub = hexToBytes(publicKey);
  } else {
    throw new Error("Invalid public key format: expected hex with 02/03/04 prefix");
  }
  const shared = secp256k1.getSharedSecret(ephPriv, recipientPub);
  const sharedX = shared.subarray(1, 33);
  const sharedKey = sha256(sharedX);
  const hkdfOut = hkdf(sha256, sharedKey, void 0, void 0, 64);
  const encKey = hkdfOut.subarray(0, 32);
  const macKey = hkdfOut.subarray(32, 64);
  const iv = randomBytes(16);
  const plaintext = hexToBytes(dataHex);
  const ciphertext = aesCtrEncrypt(encKey, iv, plaintext);
  const macInput = new Uint8Array(33 + 16 + ciphertext.length);
  macInput.set(ephPub, 0);
  macInput.set(iv, 33);
  macInput.set(ciphertext, 33 + 16);
  const mac = hmac(sha256, macKey, macInput);
  return eciesEncode(ephPub, iv, ciphertext, mac);
}
function normalizePrivateKey(privateKey) {
  const hex = typeof privateKey === "string" && privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  if (typeof hex !== "string" || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'Invalid private key: expected 32-byte hex (64 hex chars; "0x" prefix is optional)'
    );
  }
  return hex;
}
function eciesDecrypt(dataHex, privateKey) {
  const { ephemeralPub, iv, ciphertext, mac } = eciesDecode(dataHex);
  const privBytes = hexToBytes(normalizePrivateKey(privateKey));
  const shared = secp256k1.getSharedSecret(privBytes, ephemeralPub);
  const sharedX = shared.subarray(1, 33);
  const sharedKey = sha256(sharedX);
  const hkdfOut = hkdf(sha256, sharedKey, void 0, void 0, 64);
  const encKey = hkdfOut.subarray(0, 32);
  const macKey = hkdfOut.subarray(32, 64);
  const macInput = new Uint8Array(33 + 16 + ciphertext.length);
  macInput.set(ephemeralPub, 0);
  macInput.set(iv, 33);
  macInput.set(ciphertext, 33 + 16);
  const expectedMac = hmac(sha256, macKey, macInput);
  if (!constantTimeEqual(mac, expectedMac)) {
    throw new Error("ECIES decryption failed: MAC mismatch");
  }
  const plaintext = aesCtrEncrypt(encKey, iv, ciphertext);
  return bytesToHex(plaintext);
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function decryptPayload(encrypted, keyHex) {
  if (encrypted.algorithm !== "AES-256-GCM") {
    throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
  }
  return JSON.parse(aesDecrypt(encrypted.data, keyHex));
}
function unpackAgent(encryptedPayload, eciesEncryptedKey, privateKey) {
  const aesKeyHex = eciesDecrypt(eciesEncryptedKey, privateKey);
  return decryptPayload(encryptedPayload, aesKeyHex);
}
var DEFAULT_DERIVATION_MESSAGE = "Actora: derive agent payload encryption key (v1). This signature authorizes no transaction and no payment.";
var DEFAULT_DERIVATION_SALT = "actora/expert-enc";
var DEFAULT_DERIVATION_INFO_PREFIX = "agent-payload-encryption/v1";
var DEFAULT_DERIVATION_INFO_PREFIX_V2 = "agent-payload-encryption/v2";
var DEFAULT_DERIVATION_INFO_PREFIX_V3 = "agent-payload-encryption/v3";
function defaultInfoPrefixFor(mode) {
  if (mode === "eip712-hkdf") return DEFAULT_DERIVATION_INFO_PREFIX_V2;
  if (mode === "webauthn-prf-hkdf") return DEFAULT_DERIVATION_INFO_PREFIX_V3;
  return DEFAULT_DERIVATION_INFO_PREFIX;
}
var DEFAULT_EIP712_DOMAIN = {
  name: "Actora Agent Payload",
  version: "2"
};
var DEFAULT_EIP712_TYPES = {
  PayloadKey: [
    { name: "address", type: "address" },
    { name: "purpose", type: "string" },
    { name: "version", type: "uint256" }
  ]
};
var DEFAULT_EIP712_PRIMARY_TYPE = "PayloadKey";
var DEFAULT_EIP712_PURPOSE = "agent-payload-encryption";
var DEFAULT_EIP712_MESSAGE_VERSION = 2;
function buildPayloadKeyTypedData(address, overrides = {}) {
  if (!address) {
    throw new Error("Address is required for key derivation (bound into the EIP-712 message)");
  }
  const source = overrides.types ?? DEFAULT_EIP712_TYPES;
  const types = {};
  for (const [key, entries] of Object.entries(source)) {
    types[key] = entries.map((entry) => ({ name: entry.name, type: entry.type }));
  }
  return {
    domain: { ...DEFAULT_EIP712_DOMAIN, ...overrides.domain },
    types,
    primaryType: overrides.primaryType ?? DEFAULT_EIP712_PRIMARY_TYPE,
    message: {
      address: address.toLowerCase(),
      purpose: DEFAULT_EIP712_PURPOSE,
      version: DEFAULT_EIP712_MESSAGE_VERSION,
      ...overrides.message
    }
  };
}
var DEFAULT_PRF_SALT = "actora/expert-enc";
function prfSaltBytes(salt = DEFAULT_PRF_SALT) {
  return utf8(salt);
}
var DEFAULT_DERIVATION_MAX_ATTEMPTS = 8;
function utf8(text) {
  return new TextEncoder().encode(text);
}
function bytesToBigInt(bytes) {
  let out = 0n;
  for (const b of bytes) out = out << 8n | BigInt(b);
  return out;
}
function deriveFromIkmHex(ikmHex, address, params, label) {
  const hex = ikmHex.startsWith("0x") ? ikmHex.slice(2) : ikmHex;
  const ikm = hexToBytes(hex);
  if (ikm.length < 32) {
    throw new Error(`${label} too short for key derivation (${ikm.length} bytes, need >= 32)`);
  }
  if (!address) throw new Error("Address is required for key derivation (bound into HKDF info)");
  const salt = utf8(params.salt ?? DEFAULT_DERIVATION_SALT);
  const infoBase = `${params.infoPrefix ?? defaultInfoPrefixFor(params.mode ?? "personal-sign-hkdf")}/${address.toLowerCase()}`;
  const maxAttempts = Math.max(1, params.maxAttempts ?? DEFAULT_DERIVATION_MAX_ATTEMPTS);
  const n = secp256k1.CURVE.n;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const info = utf8(attempt === 0 ? infoBase : `${infoBase}/retry:${attempt}`);
    const candidate = hkdf(sha256, ikm, salt, info, 32);
    const scalar = bytesToBigInt(candidate);
    if (scalar > 0n && scalar < n) return bytesToHex(candidate);
  }
  throw new Error(`HKDF produced no valid secp256k1 scalar in ${maxAttempts} attempts`);
}
function derivePrivateKeyFromIkm(ikm, address, params = {}) {
  return deriveFromIkmHex(ikm, address, params, "IKM");
}

// src/registry/ipfs-fetcher.ts
var IPFSFetcher = class {
  gateway;
  fallbackGateways;
  timeoutMs;
  cache = /* @__PURE__ */ new Map();
  maxCache;
  pending = /* @__PURE__ */ new Map();
  failed = /* @__PURE__ */ new Set();
  constructor(config = {}) {
    this.gateway = config.gateway ?? "ipfs.io";
    this.fallbackGateways = config.fallbackGateways ?? [
      "gateway.pinata.cloud",
      "dweb.link",
      "cf-ipfs.com"
    ];
    this.timeoutMs = config.timeoutMs ?? 1e4;
    this.maxCache = config.maxCache ?? 200;
  }
  // ── Public API ──────────────────────────────────────────────────────────
  /** Fetch JSON from a single IPFS CID. */
  async fetchJSON(cid) {
    const cached = this.cache.get(cid);
    if (cached) return cached.data;
    if (this.failed.has(cid)) throw new Error(`CID ${cid} previously failed`);
    const pending = this.pending.get(cid);
    if (pending) return pending;
    const promise = this._doFetch(cid);
    this.pending.set(cid, promise);
    try {
      const data = await promise;
      this._cacheSet(cid, data);
      return data;
    } catch (e) {
      this.failed.add(cid);
      throw e;
    } finally {
      this.pending.delete(cid);
    }
  }
  /** Fetch encrypted agent payload (validates algorithm). */
  async fetchEncryptedPayload(cid) {
    const raw = await this.fetchJSON(cid);
    if (!raw.encrypted || raw.algorithm !== "AES-256-GCM" || typeof raw.data !== "string") {
      throw new Error(`Invalid EncryptedPayload at CID ${cid}`);
    }
    return raw;
  }
  /** Batch fetch multiple CIDs with concurrency control. */
  async fetchBatch(cids, concurrency = 5) {
    const results = /* @__PURE__ */ new Map();
    const unique = [...new Set(cids)].filter((c) => this.isValidCID(c));
    for (let i = 0; i < unique.length; i += concurrency) {
      const batch = unique.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        batch.map((cid) => this.fetchJSON(cid))
      );
      settled.forEach((r, j) => {
        if (r.status === "fulfilled") results.set(batch[j], r.value);
      });
      if (i + concurrency < unique.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    return results;
  }
  /** Check if a string looks like a valid IPFS CID. */
  isValidCID(cid) {
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[a-z2-7]{58,}|[A-Za-z0-9+/]{46,})$/.test(cid);
  }
  /** Clear cache (optionally for a specific CID). */
  clearCache(cid) {
    if (cid) {
      this.cache.delete(cid);
    } else {
      this.cache.clear();
    }
    this.failed.clear();
  }
  /** Number of cached entries. */
  get cacheSize() {
    return this.cache.size;
  }
  // ── Internal ─────────────────────────────────────────────────────────────
  async _doFetch(cid) {
    if (!this.isValidCID(cid)) throw new Error(`Invalid CID: ${cid}`);
    try {
      return await this._fetchFrom(cid, this.gateway, this.timeoutMs);
    } catch {
    }
    for (const gw of this.fallbackGateways) {
      try {
        return await this._fetchFrom(cid, gw, this.timeoutMs);
      } catch {
      }
    }
    throw new Error(`All IPFS gateways failed for CID ${cid}`);
  }
  async _fetchFrom(cid, gateway, timeoutMs) {
    const url = `https://${gateway}/ipfs/${cid}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
  _cacheSet(cid, data) {
    this.cache.set(cid, { data, timestamp: Date.now() });
    if (this.cache.size > this.maxCache) {
      const oldest = [...this.cache.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
  }
};
var defaultIPFSFetcher = new IPFSFetcher();

// src/core/types.ts
var ActoraError = class extends Error {
  code;
  /** If NOT_SUBSCRIBED, carry enough info for wallet/X402 auto-payment */
  paymentInfo;
  constructor(code, message, options) {
    super(message, options);
    this.code = code;
    this.name = "ActoraError";
  }
};

// src/agent/agent-runner.ts
var AgentRunner = class {
  reader;
  wallet;
  ipfs;
  unpackOverride;
  aesKeyHex;
  constructor(config) {
    this.reader = config.reader;
    this.wallet = config.wallet;
    this.unpackOverride = config.unpack;
    this.aesKeyHex = config.aesKeyHex;
    this.ipfs = config.ipfsFetcher ?? new IPFSFetcher({
      fallbackGateways: config.ipfsGateways ?? [
        "gateway.pinata.cloud",
        "dweb.link",
        "cf-ipfs.com"
      ]
    });
  }
  // ── Primary API: useAgent ────────────────────────────────────────────────
  /**
   * Load and decrypt an Agent, returning a run context ready to inject
   * into any LLM conversation.
   *
   * Steps:
   *   1. Verify on-chain subscription (frontend check)
   *   2. Fetch metadata → get encryptedPayloadCid + eciesEncryptedKey
   *   3. IPFS fetch encrypted payload
   *   4. Unpack the AES key (config.unpack / config.aesKeyHex /
   *      wallet.deriveEncryptionKey() / wallet.getPrivateKey())
   *   5. AES-256-GCM decrypt payload → { prompt, skills, mcp }
   *   6. Build RunnableSkill wrappers (Open: local stub, Closed: MCP remote)
   */
  async useAgent(agentId) {
    const address = await this.wallet.getAddress();
    const isActive = await this.reader.hasActiveSubscription(address, agentId);
    if (!isActive) {
      const err = new ActoraError(
        "NOT_SUBSCRIBED" /* NOT_SUBSCRIBED */,
        `No active subscription for Agent #${agentId}. Check error.paymentInfo for auto-subscribe via wallet/X402.`
      );
      err.paymentInfo = {
        agentId
      };
      throw err;
    }
    const attrs = await this.reader.getAttributes(agentId);
    const encryptedPayloadCid = attrs.encryptedPayloadCid;
    const eciesEncryptedKey = attrs.eciesEncryptedKey;
    if (!encryptedPayloadCid || !eciesEncryptedKey) {
      throw new ActoraError(
        "AGENT_NOT_FOUND" /* AGENT_NOT_FOUND */,
        `Agent #${agentId} metadata incomplete \u2014 missing encryptedPayloadCid or eciesEncryptedKey`
      );
    }
    let encryptedPayload;
    try {
      encryptedPayload = await this.ipfs.fetchEncryptedPayload(encryptedPayloadCid);
    } catch (e) {
      throw new ActoraError(
        "IPFS_FETCH_FAILED" /* IPFS_FETCH_FAILED */,
        `Failed to fetch encrypted payload for agent #${agentId}: ${e}`
      );
    }
    let privatePayload;
    try {
      privatePayload = await this._unpack(encryptedPayload, eciesEncryptedKey);
    } catch (e) {
      if (e instanceof ActoraError) throw e;
      throw new ActoraError(
        "DECRYPTION_FAILED" /* DECRYPTION_FAILED */,
        `Failed to decrypt agent #${agentId}: ${e}`,
        { cause: e }
      );
    }
    const skills = privatePayload.skills.map((s) => this._wrapSkill(s));
    return {
      agentId,
      prompt: privatePayload.prompt,
      skills,
      mcp: {
        type: privatePayload.mcp.type,
        url: privatePayload.mcp.url,
        toolFilter: privatePayload.mcp.toolFilter
      },
      subscriptionExpiry: 0
    };
  }
  // ── Publishing ───────────────────────────────────────────────────────────
  /**
   * Pack an AgentPayload for publishing (encryption only, no IPFS upload).
   * Caller is responsible for IPFS upload and on-chain registration.
   */
  packForPublish(payload, publicKey) {
    const key = generateAesKey();
    return {
      encryptedCid: "",
      publicCid: "",
      aesKeyHex: key,
      eciesEncryptedKeyHex: eciesEncrypt(key, publicKey)
    };
  }
  // ── Internals ────────────────────────────────────────────────────────────
  /** Wrap a SkillDef into a RunnableSkill with execute(). */
  _wrapSkill(skill) {
    let mode = "open";
    let executeFn;
    if (skill.execution) {
      if (skill.execution.type === "mcp") {
        mode = "mcp";
        const endpoint = skill.execution.endpoint ?? "";
        const toolName = skill.execution.toolName ?? skill.name;
        executeFn = async (input) => {
          return this._executeMCPTool(endpoint, toolName, input);
        };
      } else if (skill.execution.type === "a2a") {
        mode = "a2a";
        executeFn = async (input) => {
          return this._executeA2ASkill(skill, input);
        };
      } else {
        throw new ActoraError(
          "INVALID_SCHEMA" /* INVALID_SCHEMA */,
          `Unknown execution type "${skill.execution.type}" for skill "${skill.name}"`
        );
      }
    } else {
      executeFn = async () => {
        throw new ActoraError(
          "INVALID_SCHEMA" /* INVALID_SCHEMA */,
          `Open skill "${skill.name}" has no local executor. Implement execute() or switch to execution.type = "mcp" or "a2a".`
        );
      };
    }
    return {
      name: skill.name,
      description: skill.description,
      inputSchema: skill.inputSchema,
      outputSchema: skill.outputSchema,
      mode,
      execute: executeFn,
      /** If A2A, carry delegation metadata so the LLM can see it */
      a2aTargetAgentId: skill.execution?.type === "a2a" ? skill.execution.targetAgentId : void 0
    };
  }
  /** Call a tool on the publisher's MCP server (Closed skill). */
  async _executeMCPTool(endpoint, toolName, params) {
    const address = await this.wallet.getAddress();
    const timestamp = Math.floor(Date.now() / 1e3);
    const message = `actora:mcp:${toolName}:${timestamp}`;
    const signature = await this.wallet.signMessage(message);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Subscriber-Address": address,
        "X-Signature": signature,
        "X-Timestamp": String(timestamp)
      },
      body: JSON.stringify({
        method: "tools/call",
        params: {
          name: toolName,
          arguments: params
        }
      })
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 403) {
        throw new ActoraError(
          "SUBSCRIPTION_EXPIRED" /* SUBSCRIPTION_EXPIRED */,
          `MCP server rejected request: subscription may have expired. ${text}`
        );
      }
      throw new ActoraError(
        "TX_FAILED" /* TX_FAILED */,
        `MCP tool "${toolName}" failed (HTTP ${res.status}): ${text}`
      );
    }
    const data = await res.json();
    const content = data.content?.[0];
    if (content?.type === "text" && content.text) {
      try {
        return JSON.parse(content.text);
      } catch {
        return content.text;
      }
    }
    return data;
  }
  /**
   * Execute an A2A skill — delegate to another Actora Agent.
   *
   * Standard Interface:
   *   Input:  { task, ...taskSpecificParams }
   *   Output: { agentId, prompt, skills[] }
   *
   * The caller (LLM) receives the sub-Agent's prompt + skill list.
   * The LLM then decides how to use the sub-Agent — typically by
   * injecting the sub-Agent's system prompt and calling its skills.
   */
  async _executeA2ASkill(skill, input) {
    const exec = skill.execution;
    if (!exec || exec.type !== "a2a") {
      throw new ActoraError(
        "INVALID_SCHEMA" /* INVALID_SCHEMA */,
        `Skill "${skill.name}" is not an A2A delegation skill`
      );
    }
    const targetAgentId = exec.targetAgentId;
    let subContext;
    try {
      subContext = await this.useAgent(targetAgentId);
    } catch (e) {
      throw new ActoraError(
        "AGENT_NOT_FOUND" /* AGENT_NOT_FOUND */,
        `A2A delegation failed: cannot load Agent #${targetAgentId}. ${e}`
      );
    }
    if (exec.skillFilter && exec.skillFilter.length > 0) {
      const filterSet = new Set(exec.skillFilter);
      subContext = {
        ...subContext,
        skills: subContext.skills.filter((s) => filterSet.has(s.name))
      };
    }
    if (exec.promptOverride) {
      subContext = { ...subContext, prompt: exec.promptOverride };
    }
    return {
      agentId: targetAgentId,
      prompt: subContext.prompt,
      skills: subContext.skills.map((s) => ({
        name: s.name,
        description: s.description,
        inputSchema: s.inputSchema
      })),
      // Pass the caller's input to the sub-agent's context
      callerInput: input
    };
  }
  /**
   * Decrypt the private payload using the first available key source:
   *   1. `config.unpack` — host-controlled key source
   *   2. `config.aesKeyHex` — already-resolved AES key (no ECIES)
   *   3. `wallet.deriveEncryptionKey()` — browser wallet (personal_sign + HKDF)
   *   4. `wallet.getPrivateKey()` — self-custodied key material
   */
  async _unpack(encryptedPayload, eciesEncryptedKey) {
    if (this.unpackOverride) {
      return await this.unpackOverride(encryptedPayload, eciesEncryptedKey);
    }
    if (this.aesKeyHex) {
      return decryptPayload(encryptedPayload, this.aesKeyHex);
    }
    const privKey = await this._resolvePrivateKey();
    return unpackAgent(encryptedPayload, eciesEncryptedKey, privKey);
  }
  async _resolvePrivateKey() {
    if (this.wallet.deriveEncryptionKey) return this.wallet.deriveEncryptionKey();
    if (this.wallet.getPrivateKey) return this.wallet.getPrivateKey();
    throw new ActoraError(
      "WALLET_NOT_CONNECTED" /* WALLET_NOT_CONNECTED */,
      "No payload decryption key available. EIP-1193 browser wallets cannot export the account private key \u2014 implement WalletSigner.deriveEncryptionKey() (see deriveKeyPairFromWallet), or pass AgentRunnerConfig.aesKeyHex / .unpack."
    );
  }
};

// src/config/config.ts
var KNOWN_CHAINS = {
  // Sepolia Testnet
  // v3 (deployed 2026-07-13): platformFee=250bps(2.5%), ReentrancyGuard, audit fixes
  11155111: {
    chainId: 11155111,
    contracts: {
      identityRegistry: "0xe94ad380d3F8d08a7590eda0C84f354a93F96e5F",
      subscriptionManager: "0xC15fE80b9d800abb72121F353a6ae6d6E9077E63",
      a2aProtocolRegistry: "0x309C7447d89f3087A9924BB686d88df020F7e9cB",
      reputationRegistry: "0xeb6B410ea71b8d9dA0c96f6A91d35027CE143DC9",
      configurationRegistry: "0x68DcE00e4C9077c94BC68016cD14B09557faEA6c",
      multiEndpointRegistry: "0xEB5e866f186d4B73F97aa0d70B86f2C6e2e21Cb7"
    },
    ipfsGateways: ["ipfs.io", "gateway.pinata.cloud", "dweb.link", "cf-ipfs.com"]
  },
  // BNB Smart Chain (BSC) Mainnet
  // Chain ID 56, EIP-1559, gas token BNB
  // Agent 市场开通 2026-09-17（DeployBsc.s.sol，部署者 0x8017925F7eEcA3713F03983113788321891F7D1f）
  // Explorer: https://bscscan.com
  56: {
    chainId: 56,
    contracts: {
      identityRegistry: "0xeF96D883e1082E3e102d925c8190A13EEC1ffF33",
      subscriptionManager: "0x6f18Aa693e5062Ef98bBA5A865F225f2e652DF6b",
      a2aProtocolRegistry: "0x842F0B9E85f5aBd9752B5ea20Cc888b94dBb5E16",
      reputationRegistry: "0xBaDB0F3956252DE6e31aE749245E8bA6Fda288ee",
      configurationRegistry: "0xd9B984cF591dc1C3663991e7D75c44C2bDE1a9BB",
      multiEndpointRegistry: "0x80Bc36634693d7935109f5cdbc95E64a9c1bdA6a"
    },
    ipfsGateways: ["ipfs.io", "gateway.pinata.cloud", "dweb.link", "cf-ipfs.com"],
    rpcUrl: "https://bsc-rpc.publicnode.com"
  },
  // ── Ethereum Mainnet — 已开通（2026-09-17 部署 DeployEthereum.s.sol，SM block 25992521）──
  1: {
    chainId: 1,
    contracts: {
      identityRegistry: "0xb38BC382aA438F8B4f0BFA902041330Bc14DD02e",
      subscriptionManager: "0x7b4002a416E9c0cA68d7dEDc6c734CFab4D396FE",
      a2aProtocolRegistry: "0x09f6C8f9AE6CEf12C4a078c91aeb2EcCb7CbD012",
      reputationRegistry: "0x72C1236bc425b1A6129b76400aE7b26c1fbFAeFE",
      configurationRegistry: "0x2Bf6962301164A301e4fEC9036aB97edcBcE1bCa",
      multiEndpointRegistry: "0xE93fbED3Df2a5D357856f2f2712B3c1Ebb8d026f"
    },
    ipfsGateways: ["ipfs.io", "gateway.pinata.cloud", "dweb.link", "cf-ipfs.com"],
    rpcUrl: "https://ethereum-rpc.publicnode.com"
  },
  // ── Base — 已开通（2026-09-17 部署 DeployBase.s.sol，SM block 51401326）──
  // 注：地址以 broadcast/DeployBase.s.sol/8453/run-latest.json 的 contractName 映射为准
  // （2026-09-17 曾误按交易顺序分配地址，实际 SM=0x0f129e... 已修正）
  8453: {
    chainId: 8453,
    contracts: {
      identityRegistry: "0x37f3919D64d648ddF70747e159fd9A1c6890CA3b",
      subscriptionManager: "0x0f129e8C31Dd7642cd7e852fBf682fCb75104b29",
      a2aProtocolRegistry: "0x2172145F2A8f7A66019A4F4048Af46844243607E",
      reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
      configurationRegistry: "0x5EF8c35738311B971A64de64487E1E304Ae53993",
      multiEndpointRegistry: "0xB8065829dBb450B8fC7375D910521EA641EC6Ee5"
    },
    ipfsGateways: ["ipfs.io", "gateway.pinata.cloud", "dweb.link", "cf-ipfs.com"],
    rpcUrl: "https://base-rpc.publicnode.com"
  }
};

// src/core/webauthn-prf.ts
var PrfError = class extends Error {
  code;
  constructor(code, message, options) {
    super(message);
    this.name = "PrfError";
    this.code = code;
    if (options?.cause !== void 0) this.cause = options.cause;
  }
};
function randomBytes2(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function fromBase64Url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - padded.length % 4) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function defaultRpId() {
  return location.hostname;
}
function unsupported(message, cause) {
  return new PrfError(
    "PRF_UNSUPPORTED",
    `${message} \u2014 PRF \u4E0D\u53EF\u7528\u65F6\u4E0D\u4F1A\u56DE\u9000\u5230\u7B7E\u540D\u6D3E\u751F\uFF08\u90A3\u4F1A\u4F7F\u7528\u6237\u4EE5\u4E3A\u5B89\u5168\u3001\u5B9E\u9645\u56DE\u5230\u53EF\u590D\u7528\u7684\u7B7E\u540D\u5BC6\u94A5\uFF09\u3002\u8BF7\u6539\u7528 mode: 'eip712-hkdf'\uFF08v2\uFF09\u6216\u6258\u7BA1\u5BC6\u94A5\uFF08\u670D\u52A1\u7AEF\u751F\u6210\u5BC6\u94A5\u5BF9\uFF09\u3002`,
    { cause }
  );
}
function classify(error, context, rpId) {
  const cause = error;
  const name = cause?.name ?? "";
  if (name === "NotAllowedError") {
    return new PrfError(
      "PRF_CANCELLED",
      `${context}\u88AB\u53D6\u6D88\u6216\u8D85\u65F6\uFF08NotAllowedError\uFF09\u3002\u82E5\u8BBE\u5907\u4E0A\u4E0D\u5B58\u5728\u8BE5\u51ED\u636E\uFF0C\u6D4F\u89C8\u5668\u4E5F\u4F1A\u62A5\u8FD9\u4E2A\u9519 \u2014\u2014 \u8BF7\u786E\u8BA4\u51ED\u636E\u7684 RP ID \u662F "${rpId}"\uFF0C\u6216\u6539\u7528\u540C\u4E00 passkey \u540C\u6B65\u670D\u52A1\uFF08iCloud \u94A5\u5319\u4E32 / Google \u5BC6\u7801\u7BA1\u7406\u5DE5\u5177\uFF09\u3002`,
      { cause }
    );
  }
  if (name === "InvalidStateError") {
    return new PrfError(
      "PRF_CREDENTIAL_NOT_FOUND",
      `${context}\u65F6\u8BE5\u51ED\u636E\u4E0D\u5728\u672C\u8BBE\u5907\uFF08InvalidStateError\uFF09\u3002\u8BF7\u5728\u6CE8\u518C\u5B83\u7684\u8BBE\u5907\u6216\u540C\u4E00\u540C\u6B65\u670D\u52A1\u4E0A\u91CD\u8BD5\u3002`,
      { cause }
    );
  }
  if (name === "SecurityError") {
    return new PrfError(
      "PRF_FAILED",
      `${context}\u88AB\u6D4F\u89C8\u5668\u62D2\u7EDD\uFF08SecurityError\uFF09\uFF1ARP ID "${rpId}" \u4E0E\u5F53\u524D\u9875\u9762\u6765\u6E90\u4E0D\u5339\u914D\u3002\u51ED\u636E\u6309 RP ID \u9694\u79BB\uFF0C\u6362\u57DF\u540D\u5373\u6362\u5BC6\u94A5\u7A7A\u95F4\u3002`,
      { cause }
    );
  }
  return new PrfError("PRF_FAILED", `${context}\u5931\u8D25\uFF1A${cause?.message ?? String(error)}`, { cause });
}
async function evaluatePrf(options) {
  if (typeof navigator === "undefined" || !navigator.credentials?.get) {
    throw unsupported("\u5F53\u524D\u73AF\u5883\u6CA1\u6709 WebAuthn\uFF08navigator.credentials.get \u4E0D\u5B58\u5728\uFF09");
  }
  const rpId = options.rpId ?? defaultRpId();
  const salt = options.salt ?? DEFAULT_PRF_SALT;
  let assertion;
  try {
    assertion = await navigator.credentials.get({
      publicKey: {
        rpId,
        challenge: randomBytes2(32),
        allowCredentials: options.allowDiscoverable ? [] : [{ type: "public-key", id: fromBase64Url(options.credentialId) }],
        userVerification: "required",
        extensions: {
          prf: { eval: { first: prfSaltBytes(salt) } }
        }
      }
    });
  } catch (error) {
    throw classify(error, "\u6C42\u503C PRF", rpId);
  }
  if (!assertion) {
    throw new PrfError("PRF_FAILED", "\u6C42\u503C PRF \u5931\u8D25\uFF1A\u6D4F\u89C8\u5668\u672A\u8FD4\u56DE\u65AD\u8A00\u7ED3\u679C\u3002");
  }
  const ext = assertion.getClientExtensionResults();
  const first = ext.prf?.results?.first;
  if (!first) {
    throw unsupported(
      `\u8BE5\u6D4F\u89C8\u5668/\u8BA4\u8BC1\u5668\u672A\u8FD4\u56DE PRF \u7ED3\u679C\uFF08prf=${JSON.stringify(ext.prf ?? null)}\uFF09\u3002\u79FB\u52A8\u7AEF\u94B1\u5305\u5185\u7F6E\u6D4F\u89C8\u5668\u666E\u904D\u4E0D\u652F\u6301 WebAuthn\uFF0C\u5C5E\u5DF2\u77E5\u60C5\u51B5`,
      ext.prf
    );
  }
  const output = new Uint8Array(first);
  if (output.length !== 32) {
    throw new PrfError(
      "PRF_FAILED",
      `PRF \u8F93\u51FA\u957F\u5EA6\u5F02\u5E38\uFF08${output.length} \u5B57\u8282\uFF0C\u671F\u671B 32\uFF09\u3002\u4E0D\u540C\u5B9E\u73B0\u957F\u5EA6\u4E0D\u4E00\u81F4\u4F1A\u8BA9\u6D3E\u751F\u5BC6\u94A5\u4E0D\u53EF\u590D\u73B0\uFF0C\u62D2\u7EDD\u4F7F\u7528\u3002`
    );
  }
  return { prfOutputHex: toHex(output), rpId, salt };
}

// src/react/useAgentRunner.ts
var IDENTITY_REGISTRY_ABI = [
  // getAgentMetadata returns MetadataEntry[] with key+value strings
  {
    name: "getAgentMetadata",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "key", type: "string" },
          { name: "value", type: "bytes" }
        ]
      }
    ]
  }
];
var SUBSCRIPTION_MANAGER_ABI = [
  {
    name: "hasActiveSubscription",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "subscriber", type: "address" },
      { name: "agentId", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
];
var ViemOnChainReader = class {
  constructor(publicClient, chainConfig) {
    this.publicClient = publicClient;
    this.chainConfig = chainConfig;
  }
  publicClient;
  chainConfig;
  async getTokenURI(_agentId) {
    return "";
  }
  async getAttributes(agentId) {
    if (!this.publicClient) throw new Error("Public client not available");
    const entries = await this.publicClient.readContract({
      address: this.chainConfig.contracts.identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "getAgentMetadata",
      args: [BigInt(agentId)]
    });
    const attrs = {};
    for (const entry of entries) {
      const hexStr = entry.value;
      if (hexStr && hexStr !== "0x") {
        attrs[entry.key] = hexToStringUTF8(hexStr);
      } else {
        attrs[entry.key] = "";
      }
    }
    return attrs;
  }
  async hasActiveSubscription(address, agentId) {
    if (!this.publicClient) return false;
    try {
      return await this.publicClient.readContract({
        address: this.chainConfig.contracts.subscriptionManager,
        abi: SUBSCRIPTION_MANAGER_ABI,
        functionName: "hasActiveSubscription",
        args: [address, BigInt(agentId)]
      });
    } catch {
      return false;
    }
  }
};
function hexToStringUTF8(hex) {
  if (!hex.startsWith("0x")) return hex;
  const hexClean = hex.slice(2);
  if (hexClean.length === 0) return "";
  try {
    const bytes = new Uint8Array(hexClean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexClean.substring(i * 2, i * 2 + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return hex;
  }
}
function useAgentRunner(config) {
  const { agentId, chainConfig: chainConfigOverride, ipfsGateways, encryptionKeyDerivation } = config;
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [ctx, setCtx] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const runnerRef = useRef(null);
  const mountedRef = useRef(true);
  const derivedKeyRef = useRef(null);
  const derivationCacheKey = encryptionKeyDerivation ? [
    encryptionKeyDerivation.mode,
    encryptionKeyDerivation.message ?? DEFAULT_DERIVATION_MESSAGE,
    encryptionKeyDerivation.salt ?? "",
    encryptionKeyDerivation.infoPrefix ?? "",
    encryptionKeyDerivation.domain ? JSON.stringify(encryptionKeyDerivation.domain) : "",
    encryptionKeyDerivation.primaryType ?? "",
    encryptionKeyDerivation.types ? JSON.stringify(encryptionKeyDerivation.types) : "",
    encryptionKeyDerivation.credentialId ?? "",
    encryptionKeyDerivation.rpId ?? "",
    encryptionKeyDerivation.prfSalt ?? ""
  ].join("|") : "";
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (!publicClient || !walletClient) {
      setError(new Error("Wallet not connected"));
      return;
    }
    const chainConfig = chainConfigOverride ?? (publicClient.chain?.id ? KNOWN_CHAINS[publicClient.chain.id] : void 0);
    if (!chainConfig) {
      setError(new Error(`Chain ${publicClient.chain?.id} not supported`));
      return;
    }
    const reader = new ViemOnChainReader(publicClient, chainConfig);
    const signer = {
      async signMessage(message) {
        if (!walletClient.account) throw new Error("Wallet not connected");
        return walletClient.signMessage({ account: walletClient.account, message });
      },
      async getAddress() {
        if (!walletClient.account) throw new Error("Wallet not connected");
        return walletClient.account.address;
      },
      ...encryptionKeyDerivation ? {
        async deriveEncryptionKey() {
          if (!walletClient.account) throw new Error("Wallet not connected");
          const address = walletClient.account.address.toLowerCase();
          const cacheKey = `${address}|${derivationCacheKey}`;
          if (derivedKeyRef.current?.cacheKey === cacheKey) {
            return derivedKeyRef.current.privateKey;
          }
          let secret;
          if (encryptionKeyDerivation.mode === "webauthn-prf-hkdf") {
            const credentialId = encryptionKeyDerivation.credentialId;
            if (!credentialId) {
              throw new Error(
                'mode: "webauthn-prf-hkdf" requires `credentialId`. Read it from the on-chain attribute (`readPayloadKeyCredential(await reader.getAttributes(agentId))`, key "payload_key_credential") or pass it explicitly. It cannot be recovered from the wallet address \u2014 without it the v3 payload key is not reproducible.'
              );
            }
            const { prfOutputHex } = await evaluatePrf({
              credentialId,
              rpId: encryptionKeyDerivation.rpId,
              salt: encryptionKeyDerivation.prfSalt
            });
            secret = prfOutputHex;
          } else if (encryptionKeyDerivation.mode === "eip712-hkdf") {
            const typedData = buildPayloadKeyTypedData(address, {
              domain: encryptionKeyDerivation.domain,
              types: encryptionKeyDerivation.types,
              primaryType: encryptionKeyDerivation.primaryType
            });
            secret = await walletClient.signTypedData({
              account: walletClient.account,
              domain: typedData.domain,
              types: typedData.types,
              primaryType: typedData.primaryType,
              message: typedData.message
            });
          } else {
            const message = encryptionKeyDerivation.message ?? DEFAULT_DERIVATION_MESSAGE;
            secret = await walletClient.signMessage({
              account: walletClient.account,
              message
            });
          }
          const privateKey = derivePrivateKeyFromIkm(
            secret,
            address,
            encryptionKeyDerivation
          );
          derivedKeyRef.current = { cacheKey, privateKey };
          return privateKey;
        }
      } : {},
      async getPrivateKey() {
        throw new Error(
          'EIP-1193 wallets cannot export the account private key. Pass `encryptionKeyDerivation: { mode: "personal-sign-hkdf" | "eip712-hkdf" | "webauthn-prf-hkdf" }` to useAgentRunner to derive a separate payload key from a deterministic signature (v1/v2) or a passkey PRF (v3).'
        );
      }
    };
    const ipfsFetcher = new IPFSFetcher({
      fallbackGateways: ipfsGateways ?? chainConfig.ipfsGateways ?? [
        "gateway.pinata.cloud",
        "dweb.link",
        "cf-ipfs.com"
      ]
    });
    runnerRef.current = new AgentRunner({
      reader,
      wallet: signer,
      ipfsFetcher
    });
    setIsLoading(true);
    setError(null);
    runnerRef.current.useAgent(agentId).then((result) => {
      if (mountedRef.current) {
        setCtx(result);
        setIsLoading(false);
      }
    }).catch((err) => {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, [agentId, publicClient?.chain?.id, publicClient, walletClient, refetchKey, derivationCacheKey]);
  const refetch = () => setRefetchKey((k) => k + 1);
  return { ctx, isLoading, error, refetch };
}
export {
  useAgentRunner
};
//# sourceMappingURL=index.mjs.map