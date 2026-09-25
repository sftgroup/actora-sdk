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

// src/core/index.ts
var core_exports = {};
__export(core_exports, {
  AGENT_CATEGORIES: () => AGENT_CATEGORIES,
  ActoraError: () => ActoraError,
  ActoraErrorCode: () => ActoraErrorCode,
  DEFAULT_DERIVATION_INFO_PREFIX: () => DEFAULT_DERIVATION_INFO_PREFIX,
  DEFAULT_DERIVATION_INFO_PREFIX_V2: () => DEFAULT_DERIVATION_INFO_PREFIX_V2,
  DEFAULT_DERIVATION_MESSAGE: () => DEFAULT_DERIVATION_MESSAGE,
  DEFAULT_DERIVATION_SALT: () => DEFAULT_DERIVATION_SALT,
  DEFAULT_EIP712_DOMAIN: () => DEFAULT_EIP712_DOMAIN,
  DEFAULT_EIP712_MESSAGE_VERSION: () => DEFAULT_EIP712_MESSAGE_VERSION,
  DEFAULT_EIP712_PRIMARY_TYPE: () => DEFAULT_EIP712_PRIMARY_TYPE,
  DEFAULT_EIP712_PURPOSE: () => DEFAULT_EIP712_PURPOSE,
  DEFAULT_EIP712_TYPES: () => DEFAULT_EIP712_TYPES,
  aesDecrypt: () => aesDecrypt,
  aesEncrypt: () => aesEncrypt,
  buildPayloadKeyTypedData: () => buildPayloadKeyTypedData,
  bytesToHex: () => import_utils.bytesToHex,
  decryptPayload: () => decryptPayload,
  decryptWithKey: () => decryptWithKey,
  defaultInfoPrefixFor: () => defaultInfoPrefixFor,
  deriveKeyPairFromWallet: () => deriveKeyPairFromWallet,
  derivePrivateKeyFromSignature: () => derivePrivateKeyFromSignature,
  eciesDecrypt: () => eciesDecrypt,
  eciesEncrypt: () => eciesEncrypt,
  encryptPayload: () => encryptPayload,
  encryptWithKey: () => encryptWithKey,
  generateAesKey: () => generateAesKey,
  generateKeyPair: () => generateKeyPair,
  getPublicKey: () => getPublicKey,
  hexToBytes: () => import_utils.hexToBytes,
  packAgentForPublish: () => packAgentForPublish,
  publishAgent: () => publishAgent,
  randomBytes: () => randomBytes,
  unpackAgent: () => unpackAgent
});
module.exports = __toCommonJS(core_exports);

// src/core/types.ts
var AGENT_CATEGORIES = [
  "operations",
  // 运营
  "customer-service",
  // 客服
  "sales",
  // 销售
  "personal-assistant",
  // 个人助理
  "coding",
  // 写代码 / 开发
  "server-monitoring",
  // 服务器监控
  "airdrop",
  // 空投
  "quant-trading",
  // 量化策略
  "data-analysis",
  // 数据分析
  "content",
  // 内容创作
  "security",
  // 安全
  "finance",
  // 金融
  "other"
  // 其他 / 未分类
];
var ActoraErrorCode = /* @__PURE__ */ ((ActoraErrorCode2) => {
  ActoraErrorCode2["NOT_SUBSCRIBED"] = "NOT_SUBSCRIBED";
  ActoraErrorCode2["SUBSCRIPTION_EXPIRED"] = "SUBSCRIPTION_EXPIRED";
  ActoraErrorCode2["DECRYPTION_FAILED"] = "DECRYPTION_FAILED";
  ActoraErrorCode2["IPFS_FETCH_FAILED"] = "IPFS_FETCH_FAILED";
  ActoraErrorCode2["AGENT_NOT_FOUND"] = "AGENT_NOT_FOUND";
  ActoraErrorCode2["INVALID_SCHEMA"] = "INVALID_SCHEMA";
  ActoraErrorCode2["TX_FAILED"] = "TX_FAILED";
  ActoraErrorCode2["WALLET_NOT_CONNECTED"] = "WALLET_NOT_CONNECTED";
  return ActoraErrorCode2;
})(ActoraErrorCode || {});
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

// src/core/crypto.ts
var import_aes = require("@noble/ciphers/aes.js");
var import_secp256k1 = require("@noble/curves/secp256k1.js");
var import_sha2 = require("@noble/hashes/sha2.js");
var import_hkdf = require("@noble/hashes/hkdf.js");
var import_hmac = require("@noble/hashes/hmac.js");
var import_utils = require("@noble/ciphers/utils.js");
function randomBytes(length) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    return buf;
  }
  const nodeCrypto = require("crypto");
  return new Uint8Array(nodeCrypto.randomBytes(length));
}
var AES_KEY_SIZE = 32;
var IV_SIZE = 12;
var TAG_SIZE = 16;
function toBase64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function fromBase64(b64) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function aesEncrypt(plaintext, keyHex) {
  const key = (0, import_utils.hexToBytes)(keyHex);
  const iv = randomBytes(IV_SIZE);
  const plainBytes = new TextEncoder().encode(plaintext);
  const cipher = (0, import_aes.gcm)(key, iv);
  const encrypted = cipher.encrypt(plainBytes);
  const ciphertext = encrypted.subarray(0, -TAG_SIZE);
  const authTag = encrypted.subarray(-TAG_SIZE);
  const combined = new Uint8Array(IV_SIZE + ciphertext.length + TAG_SIZE);
  combined.set(iv, 0);
  combined.set(ciphertext, IV_SIZE);
  combined.set(authTag, IV_SIZE + ciphertext.length);
  return toBase64(combined);
}
function aesDecrypt(encryptedBase64, keyHex) {
  const key = (0, import_utils.hexToBytes)(keyHex);
  const combined = fromBase64(encryptedBase64);
  const iv = combined.subarray(0, IV_SIZE);
  const ciphertext = combined.subarray(IV_SIZE, -TAG_SIZE);
  const authTag = combined.subarray(-TAG_SIZE);
  const cipher = (0, import_aes.gcm)(key, iv);
  const ciphertextWithTag = new Uint8Array(ciphertext.length + TAG_SIZE);
  ciphertextWithTag.set(ciphertext, 0);
  ciphertextWithTag.set(authTag, ciphertext.length);
  const decrypted = cipher.decrypt(ciphertextWithTag);
  return new TextDecoder().decode(decrypted);
}
function encryptWithKey(plaintext, keyHex) {
  const key = (0, import_utils.hexToBytes)(keyHex);
  const iv = randomBytes(IV_SIZE);
  const plainBytes = new TextEncoder().encode(plaintext);
  const cipher = (0, import_aes.gcm)(key, iv);
  const encrypted = cipher.encrypt(plainBytes);
  const ciphertext = encrypted.subarray(0, -TAG_SIZE);
  const authTag = encrypted.subarray(-TAG_SIZE);
  const combined = new Uint8Array(IV_SIZE + TAG_SIZE + ciphertext.length);
  combined.set(iv, 0);
  combined.set(authTag, IV_SIZE);
  combined.set(ciphertext, IV_SIZE + TAG_SIZE);
  return toBase64(combined);
}
function decryptWithKey(encryptedBase64, keyHex) {
  const key = (0, import_utils.hexToBytes)(keyHex);
  const combined = fromBase64(encryptedBase64);
  const iv = combined.subarray(0, IV_SIZE);
  const authTag = combined.subarray(IV_SIZE, IV_SIZE + TAG_SIZE);
  const ciphertext = combined.subarray(IV_SIZE + TAG_SIZE);
  const cipher = (0, import_aes.gcm)(key, iv);
  const ciphertextWithTag = new Uint8Array(ciphertext.length + TAG_SIZE);
  ciphertextWithTag.set(ciphertext, 0);
  ciphertextWithTag.set(authTag, ciphertext.length);
  const decrypted = cipher.decrypt(ciphertextWithTag);
  return new TextDecoder().decode(decrypted);
}
function generateAesKey() {
  return (0, import_utils.bytesToHex)(randomBytes(AES_KEY_SIZE));
}
function eciesEncode(ephemeralPub, iv, ciphertext, mac) {
  const out = new Uint8Array(33 + 16 + ciphertext.length + 32);
  out.set(ephemeralPub, 0);
  out.set(iv, 33);
  out.set(ciphertext, 33 + 16);
  out.set(mac, 33 + 16 + ciphertext.length);
  return (0, import_utils.bytesToHex)(out);
}
function eciesDecode(dataHex) {
  const d = (0, import_utils.hexToBytes)(dataHex);
  return {
    ephemeralPub: d.subarray(0, 33),
    iv: d.subarray(33, 49),
    ciphertext: d.subarray(49, -32),
    mac: d.subarray(-32)
  };
}
function aesCtrEncrypt(key, ctrBytes, data) {
  const blockSize = 16;
  const cipher = (0, import_aes.gcm)(key, ctrBytes);
  const result = new Uint8Array(data.length);
  const counter = new Uint8Array(blockSize);
  counter.set(ctrBytes);
  for (let i = 0; i < data.length; i += blockSize) {
    const keystream = (0, import_aes.gcm)(key, counter).encrypt(new Uint8Array(blockSize));
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
  const ephPub = import_secp256k1.secp256k1.getPublicKey(ephPriv, true);
  let recipientPub;
  if (publicKey.startsWith("04") && publicKey.length === 130) {
    recipientPub = (0, import_utils.hexToBytes)(publicKey);
  } else if (publicKey.startsWith("02") || publicKey.startsWith("03")) {
    recipientPub = (0, import_utils.hexToBytes)(publicKey);
  } else {
    throw new Error("Invalid public key format: expected hex with 02/03/04 prefix");
  }
  const shared = import_secp256k1.secp256k1.getSharedSecret(ephPriv, recipientPub);
  const sharedX = shared.subarray(1, 33);
  const sharedKey = (0, import_sha2.sha256)(sharedX);
  const hkdfOut = (0, import_hkdf.hkdf)(import_sha2.sha256, sharedKey, void 0, void 0, 64);
  const encKey = hkdfOut.subarray(0, 32);
  const macKey = hkdfOut.subarray(32, 64);
  const iv = randomBytes(16);
  const plaintext = (0, import_utils.hexToBytes)(dataHex);
  const ciphertext = aesCtrEncrypt(encKey, iv, plaintext);
  const macInput = new Uint8Array(33 + 16 + ciphertext.length);
  macInput.set(ephPub, 0);
  macInput.set(iv, 33);
  macInput.set(ciphertext, 33 + 16);
  const mac = (0, import_hmac.hmac)(import_sha2.sha256, macKey, macInput);
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
  const privBytes = (0, import_utils.hexToBytes)(normalizePrivateKey(privateKey));
  const shared = import_secp256k1.secp256k1.getSharedSecret(privBytes, ephemeralPub);
  const sharedX = shared.subarray(1, 33);
  const sharedKey = (0, import_sha2.sha256)(sharedX);
  const hkdfOut = (0, import_hkdf.hkdf)(import_sha2.sha256, sharedKey, void 0, void 0, 64);
  const encKey = hkdfOut.subarray(0, 32);
  const macKey = hkdfOut.subarray(32, 64);
  const macInput = new Uint8Array(33 + 16 + ciphertext.length);
  macInput.set(ephemeralPub, 0);
  macInput.set(iv, 33);
  macInput.set(ciphertext, 33 + 16);
  const expectedMac = (0, import_hmac.hmac)(import_sha2.sha256, macKey, macInput);
  if (!constantTimeEqual(mac, expectedMac)) {
    throw new Error("ECIES decryption failed: MAC mismatch");
  }
  const plaintext = aesCtrEncrypt(encKey, iv, ciphertext);
  return (0, import_utils.bytesToHex)(plaintext);
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function encryptPayload(payload, keyHex) {
  const key = keyHex ?? generateAesKey();
  return {
    encrypted: true,
    algorithm: "AES-256-GCM",
    data: aesEncrypt(JSON.stringify(payload), key)
  };
}
function decryptPayload(encrypted, keyHex) {
  if (encrypted.algorithm !== "AES-256-GCM") {
    throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
  }
  return JSON.parse(aesDecrypt(encrypted.data, keyHex));
}
function packAgentForPublish(agent, publicKey, aesKeyHex) {
  const key = aesKeyHex ?? generateAesKey();
  const eciesEncryptedKeyHex = eciesEncrypt(key, publicKey);
  return {
    encryptedCid: "",
    // filled after IPFS upload
    publicCid: "",
    // filled after IPFS upload
    aesKeyHex: key,
    eciesEncryptedKeyHex
  };
}
async function publishAgent(config) {
  const { agent, publicKey, uploader, aesKeyHex, agentName } = config;
  if (!uploader.isConfigured()) {
    throw new Error("IPFSUploader is not configured \u2014 set pinataJwt or customEndpoint");
  }
  const key = aesKeyHex ?? generateAesKey();
  const eciesEncryptedKeyHex = eciesEncrypt(key, publicKey);
  const privatePayload = {
    prompt: agent.prompt,
    skills: agent.skills,
    mcp: agent.mcp
  };
  const encryptedPayload = encryptPayload(privatePayload, key);
  const [encrypted, publicMeta] = await Promise.all([
    uploader.uploadEncryptedPayload(encryptedPayload, agentName),
    uploader.uploadJSON({
      name: agent.name,
      description: agent.description,
      version: agent.version,
      tags: agent.tags,
      capabilities: agent.capabilities,
      category: agent.category,
      eciesKey: eciesEncryptedKeyHex
    })
  ]);
  const pack = {
    encryptedCid: encrypted.cid,
    publicCid: publicMeta.cid,
    aesKeyHex: key,
    eciesEncryptedKeyHex
  };
  return {
    aesKeyHex: key,
    eciesEncryptedKeyHex,
    encryptedCid: encrypted.cid,
    encryptedUrl: encrypted.url,
    publicCid: publicMeta.cid,
    publicUrl: publicMeta.url,
    pack,
    uploads: { encrypted, public: publicMeta }
  };
}
function unpackAgent(encryptedPayload, eciesEncryptedKey, privateKey) {
  const aesKeyHex = eciesDecrypt(eciesEncryptedKey, privateKey);
  return decryptPayload(encryptedPayload, aesKeyHex);
}
function generateKeyPair() {
  const priv = randomBytes(32);
  const pub = import_secp256k1.secp256k1.getPublicKey(priv, false);
  return { privateKey: (0, import_utils.bytesToHex)(priv), publicKey: (0, import_utils.bytesToHex)(pub) };
}
function getPublicKey(privateKey) {
  return (0, import_utils.bytesToHex)(import_secp256k1.secp256k1.getPublicKey((0, import_utils.hexToBytes)(normalizePrivateKey(privateKey)), false));
}
var DEFAULT_DERIVATION_MESSAGE = "Actora: derive agent payload encryption key (v1). This signature authorizes no transaction and no payment.";
var DEFAULT_DERIVATION_SALT = "actora/expert-enc";
var DEFAULT_DERIVATION_INFO_PREFIX = "agent-payload-encryption/v1";
var DEFAULT_DERIVATION_INFO_PREFIX_V2 = "agent-payload-encryption/v2";
function defaultInfoPrefixFor(mode) {
  return mode === "eip712-hkdf" ? DEFAULT_DERIVATION_INFO_PREFIX_V2 : DEFAULT_DERIVATION_INFO_PREFIX;
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
var DEFAULT_DERIVATION_MAX_ATTEMPTS = 8;
function utf8(text) {
  return new TextEncoder().encode(text);
}
function bytesToBigInt(bytes) {
  let out = 0n;
  for (const b of bytes) out = out << 8n | BigInt(b);
  return out;
}
function derivePrivateKeyFromSignature(signature, address, params = {}) {
  const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
  const ikm = (0, import_utils.hexToBytes)(hex);
  if (ikm.length < 32) {
    throw new Error(`Signature too short for key derivation (${ikm.length} bytes, need >= 32)`);
  }
  if (!address) throw new Error("Address is required for key derivation (bound into HKDF info)");
  const salt = utf8(params.salt ?? DEFAULT_DERIVATION_SALT);
  const infoBase = `${params.infoPrefix ?? defaultInfoPrefixFor(params.mode ?? "personal-sign-hkdf")}/${address.toLowerCase()}`;
  const maxAttempts = Math.max(1, params.maxAttempts ?? DEFAULT_DERIVATION_MAX_ATTEMPTS);
  const n = import_secp256k1.secp256k1.CURVE.n;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const info = utf8(attempt === 0 ? infoBase : `${infoBase}/retry:${attempt}`);
    const candidate = (0, import_hkdf.hkdf)(import_sha2.sha256, ikm, salt, info, 32);
    const scalar = bytesToBigInt(candidate);
    if (scalar > 0n && scalar < n) return (0, import_utils.bytesToHex)(candidate);
  }
  throw new Error(`HKDF produced no valid secp256k1 scalar in ${maxAttempts} attempts`);
}
async function deriveKeyPairFromWallet(args) {
  const mode = args.mode ?? "personal-sign-hkdf";
  const sign = async () => {
    if (mode === "eip712-hkdf") {
      if (!args.signTypedData) {
        throw new Error(
          "mode: 'eip712-hkdf' requires a signTypedData function (viem WalletClient.signTypedData / eth_signTypedData_v4)"
        );
      }
      return args.signTypedData(buildPayloadKeyTypedData(args.address, args.typedData));
    }
    return args.signMessage(args.message ?? DEFAULT_DERIVATION_MESSAGE);
  };
  const signature = await sign();
  if (args.assertDeterministic) {
    const second = await sign();
    if (second.toLowerCase() !== signature.toLowerCase()) {
      throw new Error(
        "Wallet returned different signatures for the same payload \u2014 it is not RFC 6979 deterministic, so a derived key cannot be reproduced and the agent would be permanently undecryptable. Use a deterministic wallet (MetaMask / Ledger / Trezor) or inject the key via WalletSigner.getPrivateKey() / AgentRunnerConfig.unpack."
      );
    }
  }
  const privateKey = derivePrivateKeyFromSignature(signature, args.address, args);
  return { privateKey, publicKey: getPublicKey(privateKey) };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AGENT_CATEGORIES,
  ActoraError,
  ActoraErrorCode,
  DEFAULT_DERIVATION_INFO_PREFIX,
  DEFAULT_DERIVATION_INFO_PREFIX_V2,
  DEFAULT_DERIVATION_MESSAGE,
  DEFAULT_DERIVATION_SALT,
  DEFAULT_EIP712_DOMAIN,
  DEFAULT_EIP712_MESSAGE_VERSION,
  DEFAULT_EIP712_PRIMARY_TYPE,
  DEFAULT_EIP712_PURPOSE,
  DEFAULT_EIP712_TYPES,
  aesDecrypt,
  aesEncrypt,
  buildPayloadKeyTypedData,
  bytesToHex,
  decryptPayload,
  decryptWithKey,
  defaultInfoPrefixFor,
  deriveKeyPairFromWallet,
  derivePrivateKeyFromSignature,
  eciesDecrypt,
  eciesEncrypt,
  encryptPayload,
  encryptWithKey,
  generateAesKey,
  generateKeyPair,
  getPublicKey,
  hexToBytes,
  packAgentForPublish,
  publishAgent,
  randomBytes,
  unpackAgent
});
//# sourceMappingURL=index.js.map