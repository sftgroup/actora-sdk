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
  DEFAULT_DERIVATION_INFO_PREFIX_V3: () => DEFAULT_DERIVATION_INFO_PREFIX_V3,
  DEFAULT_DERIVATION_MESSAGE: () => DEFAULT_DERIVATION_MESSAGE,
  DEFAULT_DERIVATION_SALT: () => DEFAULT_DERIVATION_SALT,
  DEFAULT_EIP712_DOMAIN: () => DEFAULT_EIP712_DOMAIN,
  DEFAULT_EIP712_MESSAGE_VERSION: () => DEFAULT_EIP712_MESSAGE_VERSION,
  DEFAULT_EIP712_PRIMARY_TYPE: () => DEFAULT_EIP712_PRIMARY_TYPE,
  DEFAULT_EIP712_PURPOSE: () => DEFAULT_EIP712_PURPOSE,
  DEFAULT_EIP712_TYPES: () => DEFAULT_EIP712_TYPES,
  DEFAULT_PRF_SALT: () => DEFAULT_PRF_SALT,
  PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE: () => PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE,
  PAYLOAD_KEY_MODE_ATTRIBUTE: () => PAYLOAD_KEY_MODE_ATTRIBUTE,
  PrfError: () => PrfError,
  aesDecrypt: () => aesDecrypt,
  aesEncrypt: () => aesEncrypt,
  buildPayloadKeyTypedData: () => buildPayloadKeyTypedData,
  bytesToHex: () => import_utils.bytesToHex,
  createPrfCredential: () => createPrfCredential,
  decryptPayload: () => decryptPayload,
  decryptWithKey: () => decryptWithKey,
  defaultInfoPrefixFor: () => defaultInfoPrefixFor,
  deriveKeyPairFromWallet: () => deriveKeyPairFromWallet,
  derivePrivateKeyFromIkm: () => derivePrivateKeyFromIkm,
  derivePrivateKeyFromSignature: () => derivePrivateKeyFromSignature,
  eciesDecrypt: () => eciesDecrypt,
  eciesEncrypt: () => eciesEncrypt,
  encryptPayload: () => encryptPayload,
  encryptWithKey: () => encryptWithKey,
  evaluatePrf: () => evaluatePrf,
  generateAesKey: () => generateAesKey,
  generateKeyPair: () => generateKeyPair,
  getPrfCapability: () => getPrfCapability,
  getPublicKey: () => getPublicKey,
  hexToBytes: () => import_utils.hexToBytes,
  isDerivationMode: () => isDerivationMode,
  packAgentForPublish: () => packAgentForPublish,
  prfSaltBytes: () => prfSaltBytes,
  publishAgent: () => publishAgent,
  randomBytes: () => randomBytes,
  readPayloadKeyCredential: () => readPayloadKeyCredential,
  readPayloadKeyMode: () => readPayloadKeyMode,
  serializePayloadKeyCredential: () => serializePayloadKeyCredential,
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
  if (config.verifyWithPrivateKey) {
    let unwrapped;
    try {
      unwrapped = eciesDecrypt(eciesEncryptedKeyHex, config.verifyWithPrivateKey);
    } catch (err) {
      throw new Error(
        `Pre-publish self-check failed: the supplied private key cannot unwrap the AES key (${err.message}). Check that it matches \`publicKey\` and that the publish and decrypt paths use the same derivation mode. Nothing was uploaded.`
      );
    }
    if (unwrapped !== key) {
      throw new Error(
        "Pre-publish self-check failed: the unwrapped AES key does not match the one used to encrypt the payload. Nothing was uploaded."
      );
    }
  }
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
var PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE = "payload_key_credential";
function serializePayloadKeyCredential(credential) {
  if (!credential || !credential.rpId) {
    throw new Error("rpId is required to bind a v3 credential (the credential is RP-ID scoped)");
  }
  if (!credential.credentialId) {
    throw new Error("credentialId is required to bind a v3 credential (otherwise the key is unrecoverable)");
  }
  return JSON.stringify({
    rpId: credential.rpId,
    credentialId: credential.credentialId,
    ...credential.prfSalt ? { prfSalt: credential.prfSalt } : {},
    ...credential.address ? { address: credential.address.toLowerCase() } : {},
    ...credential.infoPrefix ? { infoPrefix: credential.infoPrefix } : {}
  });
}
function readPayloadKeyCredential(attributes) {
  const raw = attributes[PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE];
  if (!raw) return void 0;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.rpId !== "string" || typeof parsed.credentialId !== "string") {
      return void 0;
    }
    return parsed;
  } catch {
    return void 0;
  }
}
var DEFAULT_DERIVATION_MAX_ATTEMPTS = 8;
var SELF_CHECK_PROBE = "6163746f72612d73656c662d636865636b";
function isDerivationMode(value) {
  return value === "personal-sign-hkdf" || value === "eip712-hkdf" || value === "webauthn-prf-hkdf";
}
var PAYLOAD_KEY_MODE_ATTRIBUTE = "payload_key_mode";
function readPayloadKeyMode(attributes) {
  const raw = attributes[PAYLOAD_KEY_MODE_ATTRIBUTE];
  return isDerivationMode(raw) ? raw : void 0;
}
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
  const ikm = (0, import_utils.hexToBytes)(hex);
  if (ikm.length < 32) {
    throw new Error(`${label} too short for key derivation (${ikm.length} bytes, need >= 32)`);
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
function derivePrivateKeyFromSignature(signature, address, params = {}) {
  return deriveFromIkmHex(signature, address, params, "Signature");
}
function derivePrivateKeyFromIkm(ikm, address, params = {}) {
  return deriveFromIkmHex(ikm, address, params, "IKM");
}
async function deriveKeyPairFromWallet(args) {
  const mode = args.mode ?? "personal-sign-hkdf";
  const sign = async () => {
    if (mode === "webauthn-prf-hkdf") {
      if (!args.getPrfOutput) {
        throw new Error(
          "mode: 'webauthn-prf-hkdf' requires a getPrfOutput function (e.g. () => evaluatePrf({ credentialId, rpId }).then(r => r.prfOutputHex)). It will NOT fall back to signMessage: a passkey-derived key cannot be reproduced from a signature."
        );
      }
      return args.getPrfOutput();
    }
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
  if (mode !== "webauthn-prf-hkdf" && (args.assertDeterministic ?? true)) {
    const second = await sign();
    if (second.toLowerCase() !== signature.toLowerCase()) {
      throw new Error(
        "Wallet returned different signatures for the same payload \u2014 it is not RFC 6979 deterministic, so a derived key cannot be reproduced and the agent would be permanently undecryptable. Use a deterministic wallet (MetaMask / Ledger / Trezor) or inject the key via WalletSigner.getPrivateKey() / AgentRunnerConfig.unpack."
      );
    }
  }
  const privateKey = derivePrivateKeyFromIkm(signature, args.address, args);
  const publicKey = getPublicKey(privateKey);
  if (args.selfCheck ?? true) {
    const probe = SELF_CHECK_PROBE;
    if (eciesDecrypt(eciesEncrypt(probe, publicKey), privateKey) !== probe) {
      throw new Error(
        "Self-check failed: the derived key pair cannot round-trip ECIES. Do not publish with this key \u2014 the agent would be undecryptable."
      );
    }
  }
  return { privateKey, publicKey };
}

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
async function getPrfCapability() {
  if (typeof window === "undefined" || typeof window.PublicKeyCredential === "undefined") {
    return {
      webAuthn: false,
      userVerifyingPlatformAuthenticator: false,
      prf: false,
      source: "unavailable"
    };
  }
  let uvpaa = "unknown";
  try {
    uvpaa = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
  }
  const withCapabilities = PublicKeyCredential;
  if (typeof withCapabilities.getClientCapabilities === "function") {
    try {
      const caps = await withCapabilities.getClientCapabilities();
      return {
        webAuthn: true,
        userVerifyingPlatformAuthenticator: uvpaa,
        prf: caps?.prf === true,
        source: "client-capabilities"
      };
    } catch {
    }
  }
  return {
    webAuthn: true,
    userVerifyingPlatformAuthenticator: uvpaa,
    prf: "unknown",
    source: "unavailable"
  };
}
function randomBytes2(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function toBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
async function createPrfCredential(options = {}) {
  if (typeof navigator === "undefined" || !navigator.credentials?.create) {
    throw unsupported("\u5F53\u524D\u73AF\u5883\u6CA1\u6709 WebAuthn\uFF08navigator.credentials.create \u4E0D\u5B58\u5728\uFF09");
  }
  const rpId = options.rpId ?? defaultRpId();
  const salt = options.salt ?? DEFAULT_PRF_SALT;
  let created;
  try {
    created = await navigator.credentials.create({
      publicKey: {
        rp: { id: rpId, name: options.rpName ?? "Actora" },
        user: {
          id: randomBytes2(16),
          name: options.userName ?? "actora-payload-key",
          displayName: options.displayName ?? options.userName ?? "Actora payload key"
        },
        challenge: randomBytes2(32),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        authenticatorSelection: {
          residentKey: "required",
          requireResidentKey: true,
          userVerification: "required"
        },
        // Asking for `eval` at registration returns the first output right away
        // (and is what enables the extension on the credential).
        extensions: {
          prf: { eval: { first: prfSaltBytes(salt) } }
        }
      }
    });
  } catch (error) {
    throw classify(error, "\u6CE8\u518C passkey", rpId);
  }
  if (!created) {
    throw new PrfError("PRF_FAILED", "\u6CE8\u518C passkey \u5931\u8D25\uFF1A\u6D4F\u89C8\u5668\u672A\u8FD4\u56DE\u51ED\u636E\u3002");
  }
  const credential = created;
  const ext = credential.getClientExtensionResults();
  const first = ext.prf?.results?.first;
  const prfEnabled = ext.prf?.enabled === true;
  if (!first && !prfEnabled) {
    throw unsupported(
      "\u8BE5\u8BA4\u8BC1\u5668\u672A\u542F\u7528 PRF\uFF1A\u6CE8\u518C\u65F6\u65E2\u672A\u8FD4\u56DE prf.enabled \u4E5F\u672A\u8FD4\u56DE PRF \u7ED3\u679C",
      ext.prf
    );
  }
  return {
    credentialId: toBase64Url(new Uint8Array(credential.rawId)),
    prfEnabled,
    prfOutputHex: first ? toHex(new Uint8Array(first)) : null,
    rpId,
    salt
  };
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AGENT_CATEGORIES,
  ActoraError,
  ActoraErrorCode,
  DEFAULT_DERIVATION_INFO_PREFIX,
  DEFAULT_DERIVATION_INFO_PREFIX_V2,
  DEFAULT_DERIVATION_INFO_PREFIX_V3,
  DEFAULT_DERIVATION_MESSAGE,
  DEFAULT_DERIVATION_SALT,
  DEFAULT_EIP712_DOMAIN,
  DEFAULT_EIP712_MESSAGE_VERSION,
  DEFAULT_EIP712_PRIMARY_TYPE,
  DEFAULT_EIP712_PURPOSE,
  DEFAULT_EIP712_TYPES,
  DEFAULT_PRF_SALT,
  PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE,
  PAYLOAD_KEY_MODE_ATTRIBUTE,
  PrfError,
  aesDecrypt,
  aesEncrypt,
  buildPayloadKeyTypedData,
  bytesToHex,
  createPrfCredential,
  decryptPayload,
  decryptWithKey,
  defaultInfoPrefixFor,
  deriveKeyPairFromWallet,
  derivePrivateKeyFromIkm,
  derivePrivateKeyFromSignature,
  eciesDecrypt,
  eciesEncrypt,
  encryptPayload,
  encryptWithKey,
  evaluatePrf,
  generateAesKey,
  generateKeyPair,
  getPrfCapability,
  getPublicKey,
  hexToBytes,
  isDerivationMode,
  packAgentForPublish,
  prfSaltBytes,
  publishAgent,
  randomBytes,
  readPayloadKeyCredential,
  readPayloadKeyMode,
  serializePayloadKeyCredential,
  unpackAgent
});
//# sourceMappingURL=index.js.map