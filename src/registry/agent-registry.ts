// ---------------------------------------------------------------------------
// @actora/sdk — Agent Registry
// ---------------------------------------------------------------------------
// Wraps IdentityRegistry contract interactions (on-chain agent CRUD).
//
// Design:
//   - Takes a viem PublicClient + WalletClient (chain-agnostic).
//   - No wagmi dependency — works with any wallet provider that implements
//     the WalletClient interface.
//   - Methods match the existing ERC8004 IdentityRegistry ABI.
// ---------------------------------------------------------------------------

import { encodeAbiParameters, parseAbiParameters, stringToHex, hexToString, parseAbiItem } from 'viem'
import type { PublicClient, WalletClient, Address, Hash } from 'viem'
import type { OnChainAgentMetadata } from '../core/types'
import { PAYLOAD_KEY_MODE_ATTRIBUTE, PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE, isDerivationMode, serializePayloadKeyCredential } from '../core/crypto'
import type { DerivationMode, PayloadKeyCredential } from '../core/crypto'
import { ZERO_ADDRESS } from '../subscription/subscription'

/**
 * 判断错误是否为「合约 revert」（函数不存在 / 调用被拒绝），而非网络 / 传输错误。
 *
 * flavor 探测**只在确定 revert 时**才判定为 canonical：否则一次 RPC 限流 / 超时会把
 * legacy 链误判为 standard（改用日志派生 → 读到 0 个 agent），且被实例缓存。
 * 传输类错误向上抛出（不缓存），交由调用方重试 / 暴露。
 */
function isRevertError(err: unknown): boolean {
  let cur: unknown = err
  for (let i = 0; i < 6 && cur; i++) {
    const e = cur as { name?: string; message?: string; cause?: unknown }
    if (typeof e.name === 'string' && /revert/i.test(e.name)) return true
    if (typeof e.message === 'string' && /revert/i.test(e.message)) return true
    cur = e.cause
  }
  return false
}

// ── Minimal ABI Fragments ──────────────────────────────────────────────────

const IDENTITY_REGISTRY_ABI = {
  // Register
  register: {
    inputs: [] as const,
    name: 'register' as const,
    outputs: [{ name: 'agentId', type: 'uint256' }] as const,
    stateMutability: 'payable' as const,
    type: 'function' as const,
  },
  registerWithTokenURI: {
    inputs: [{ name: 'tokenURI', type: 'string' }] as const,
    name: 'register' as const,
    outputs: [{ name: 'agentId', type: 'uint256' }] as const,
    stateMutability: 'payable' as const,
    type: 'function' as const,
  },
  registerWithMetadata: {
    inputs: [
      { name: 'tokenURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple[]',
        components: [
          { name: 'key', type: 'string' },
          { name: 'value', type: 'bytes' },
        ],
      },
    ] as const,
    name: 'registerWithMetadata' as const,
    outputs: [{ name: 'agentId', type: 'uint256' }] as const,
    stateMutability: 'payable' as const,
    type: 'function' as const,
  },
  updateMetadata: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      {
        name: 'metadata',
        type: 'tuple[]',
        components: [
          { name: 'key', type: 'string' },
          { name: 'value', type: 'bytes' },
        ],
      },
    ] as const,
    name: 'updateMetadata' as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const,
    type: 'function' as const,
  },
  // Queries
  getAgentsByOwner: {
    inputs: [{ name: 'owner', type: 'address' }] as const,
    name: 'getAgentsByOwner' as const,
    outputs: [{ name: '', type: 'uint256[]' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  getCurrentAgentId: {
    inputs: [] as const,
    name: 'getCurrentAgentId' as const,
    outputs: [{ name: '', type: 'uint256' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  agentExists: {
    inputs: [{ name: 'agentId', type: 'uint256' }] as const,
    name: 'agentExists' as const,
    outputs: [{ name: '', type: 'bool' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  tokenURI: {
    inputs: [{ name: 'tokenId', type: 'uint256' }] as const,
    name: 'tokenURI' as const,
    outputs: [{ name: '', type: 'string' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  getAgentMetadata: {
    inputs: [{ name: 'agentId', type: 'uint256' }] as const,
    name: 'getAgentMetadata' as const,
    outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'key', type: 'string' }, { name: 'value', type: 'bytes' }] }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  totalAgents: {
    inputs: [] as const,
    name: 'totalAgents' as const,
    outputs: [{ name: '', type: 'uint256' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  getAgentOwner: {
    inputs: [{ name: 'agentId', type: 'uint256' }] as const,
    name: 'getAgentOwner' as const,
    outputs: [{ name: '', type: 'address' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
} as const

// ── Canonical ERC-8004 standard ABI（setAgentURI 系列）────────────────────────
// 来源：erc-8004/erc-8004-contracts 的 IdentityRegistryUpgradeable（CC0，逐字复用）。
// 与上面的历史 `IDENTITY_REGISTRY_ABI`（旧一代 / 早期 draft）并存，用于支持标准合约：
//   写：setAgentURI / setMetadata / setAgentWallet / unsetAgentWallet
//   读：getMetadata / getAgentWallet / isAuthorizedOrOwner / getVersion / ownerOf
// 注意：标准合约的 `register*` 非 payable、无注册费；历史 `registerWithMetadata` /
//       `updateMetadata` 在标准合约上不存在（调用会 revert）。
export const STANDARD_IDENTITY_ABI = {
  setAgentURI: {
    inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'newURI', type: 'string' }] as const,
    name: 'setAgentURI' as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const,
    type: 'function' as const,
  },
  setMetadata: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'metadataKey', type: 'string' },
      { name: 'metadataValue', type: 'bytes' },
    ] as const,
    name: 'setMetadata' as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const,
    type: 'function' as const,
  },
  getMetadata: {
    inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'metadataKey', type: 'string' }] as const,
    name: 'getMetadata' as const,
    outputs: [{ name: '', type: 'bytes' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  setAgentWallet: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newWallet', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ] as const,
    name: 'setAgentWallet' as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const,
    type: 'function' as const,
  },
  getAgentWallet: {
    inputs: [{ name: 'agentId', type: 'uint256' }] as const,
    name: 'getAgentWallet' as const,
    outputs: [{ name: '', type: 'address' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  unsetAgentWallet: {
    inputs: [{ name: 'agentId', type: 'uint256' }] as const,
    name: 'unsetAgentWallet' as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const,
    type: 'function' as const,
  },
  isAuthorizedOrOwner: {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'agentId', type: 'uint256' }] as const,
    name: 'isAuthorizedOrOwner' as const,
    outputs: [{ name: '', type: 'bool' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  ownerOf: {
    inputs: [{ name: 'tokenId', type: 'uint256' }] as const,
    name: 'ownerOf' as const,
    outputs: [{ name: '', type: 'address' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  getVersion: {
    inputs: [] as const,
    name: 'getVersion' as const,
    outputs: [{ name: '', type: 'string' }] as const,
    stateMutability: 'pure' as const,
    type: 'function' as const,
  },
} as const

// ── Registry Config ────────────────────────────────────────────────────────

// ── 事件与派生读取（canonical 标准没有全量视图，靠日志 / ERC-721 派生）────────

/** ERC-721 Transfer —— 两个实现都有；用于按 owner 枚举、增量同步。 */
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
)
/** canonical ERC-8004 `Registered` —— 无计数器视图时用于派生最大 agentId。 */
const REGISTERED_EVENT = parseAbiItem(
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)'
)

/**
 * canonical 标准注册表没有“一次性返回全部属性”的视图，只能按 key 逐个
 * `getMetadata`。这里是应用已知的属性键集合（与发布 / 索引流程保持一致）。
 */
const KNOWN_ATTRIBUTE_KEYS = [
  'name', 'description', 'category', 'tags', 'capabilities', 'skills',
  'encryptedPayloadCid', 'eciesEncryptedKey', 'publicPayloadCid',
  'payload_key_id', PAYLOAD_KEY_MODE_ATTRIBUTE, PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE,
] as const

export interface AgentRegistryConfig {
  /** IdentityRegistry contract address */
  contractAddress: Address
  /** viem PublicClient for read calls */
  publicClient: PublicClient
  /** viem WalletClient for write calls */
  walletClient: WalletClient
  /**
   * 日志派生读取的起始区块（canonical 标准没有 `totalAgents`/`getAgentsByOwner`
   * 视图，需从 `Registered`/`Transfer` 日志派生）。默认 0。
   */
  fromBlock?: number
}

// ── Structured Metadata Types ───────────────────────────────────────────────

/** Public, human-readable subset of on-chain agent metadata. */
export interface AgentSummaryMetadata {
  name: string
  description: string
  capabilities: string[]
  skills: string[]
  /** Application category / use case (AGENT_CATEGORIES value; undefined = other). */
  category?: string
  /** Marketplace-visible availability; tokenURI JSON may override the default true. */
  isActive: boolean
}

/** Lightweight agent record returned by getAllAgents(). */
export interface AgentSummary {
  agentId: number
  owner: string
  tokenURI: string
  metadata: AgentSummaryMetadata
  /** Unix timestamp (seconds); 0 when the tokenURI metadata has no createdAt. */
  createdAt: number
}

export interface GetAllAgentsOptions {
  /** First agent ID to scan (default: 0 for canonical standard, 1 for legacy). */
  fromId?: number
  /** Last agent ID to scan (default: the max agent ID on chain). */
  toId?: number
  /** Only return agents whose metadata.isActive === true (default: false). */
  activeOnly?: boolean
  /** Only return agents whose capabilities include ALL of these (AND). */
  capabilities?: string[]
  /** RPC batching size (default: 10). */
  batchSize?: number
}

/** Full structured metadata for one agent (on-chain keys + tokenURI JSON). */
export interface StructuredAgentMetadata {
  name: string
  description: string
  encryptedPayloadCid: string
  eciesEncryptedKey: string
  publicPayloadCid: string
  capabilities: string[]
  skills: string[]
  /** Application category / use case (AGENT_CATEGORIES value; '' = other). */
  category?: string
  isActive: boolean
}

// ── tokenURI parsing helpers ────────────────────────────────────────────────

/** Decode base64 in both Node and browser environments. */
function decodeBase64(b64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8')
  }
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Parse base64 data-URI tokenURI → JSON metadata (null if not parseable).
 * Tolerant of contract bugs: trims trailing garbage after base64 padding,
 * repairs unterminated JSON (unclosed quotes/braces), and falls back to a
 * regex extraction of the name field.
 */
export function parseTokenURIJSON(tokenURI: string): Record<string, unknown> | null {
  if (!tokenURI || tokenURI.startsWith('ipfs://')) return null
  const match = tokenURI.match(/^data:application\/json;base64,(.+)$/i)
  if (!match) return null

  // Clean up malformed base64: trim everything after the last "==" padding.
  let b64 = match[1]!
  const lastDoubleEq = b64.lastIndexOf('==')
  if (lastDoubleEq > 0 && lastDoubleEq < b64.length - 2) {
    b64 = b64.substring(0, lastDoubleEq + 2)
  }

  try {
    const decoded = decodeBase64(b64)
    // Try strict JSON parse first.
    try {
      return JSON.parse(decoded)
    } catch {
      // Unterminated JSON (contract bug): append missing closing quotes/braces.
      let fixed = decoded
      const quoteCount = (fixed.match(/"/g) || []).length
      if (quoteCount % 2 !== 0) fixed += '"'
      const openBraces = (fixed.match(/\{/g) || []).length
      const closeBraces = (fixed.match(/\}/g) || []).length
      for (let i = closeBraces; i < openBraces; i++) fixed += '}'
      try { return JSON.parse(fixed) } catch { /* fall through */ }
    }
    // Regex fallback: extract the name field at least.
    const nameM = decoded.match(/"name"\s*:\s*"([^"]*)/)
    if (nameM) return { name: nameM[1] }
    return null
  } catch {
    return null
  }
}

/** Extract createdAt (unix seconds) from tokenURI JSON metadata. */
function parseCreatedAt(parsed: Record<string, unknown> | null): number {
  const v = parsed?.created_at ?? parsed?.createdAt
  if (typeof v === 'number') return Math.floor(v)
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return Math.floor(t / 1000)
  }
  return 0
}

/** 宽松解码 `bytes` 属性：UTF-8 文本；含非法字节（如二进制密钥）则回退为原始 hex。 */
function decodeBytesLenient(value: `0x${string}`): string {
  if (!value || value === '0x') return ''
  try {
    const text = hexToString(value)
    return text.includes('\uFFFD') ? value : text
  } catch {
    return value
  }
}

// ── Agent Registry ─────────────────────────────────────────────────────────

/** 单条链上属性；`value` 为明文文本，写入合约时编码为 bytes。 */
export interface MetadataAttribute {
  key: string
  value: string
}

/**
 * 把 `{ key: value }` 规范化为链上属性数组：
 *   - 字符串原样；
 *   - 数字 / 布尔 → String()；
 *   - 数组 / 对象 → JSON.stringify（`skills` 等属性的链上约定是「UTF-8 文本 + JSON」）。
 * `undefined` / `null` 的键会被跳过。
 */
export function toAttributes(patch: Record<string, unknown>): MetadataAttribute[] {
  return Object.entries(patch)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, v]) => ({
      key,
      value:
        typeof v === 'string'
          ? v
          : typeof v === 'number' || typeof v === 'boolean'
            ? String(v)
            : JSON.stringify(v),
    }))
}

export class AgentRegistry {
  private address: Address
  private publicClient: PublicClient
  private walletClient: WalletClient
  /** 日志派生读取的起始区块。 */
  private fromBlock: bigint
  /** 实现风格探测结果（缓存）：standard=canonical / legacy=历史实现。 */
  private flavor?: 'legacy' | 'standard'
  /** `maxAgentId()` 的短时缓存（避免每次列表都重扫日志）。 */
  private maxIdCache?: { value: number; at: number }

  constructor(config: AgentRegistryConfig) {
    this.address = config.contractAddress
    this.publicClient = config.publicClient
    this.walletClient = config.walletClient
    this.fromBlock = BigInt(config.fromBlock ?? 0)
  }

  // ── Implementation flavor detection ─────────────────────────────────────

  /**
   * 尝试读取 legacy 视图 `totalAgents()`：
   *   - 成功 → 判定 `'legacy'` 并返回计数值（= 单调最大 agentId）
   *   - revert → 判定 `'standard'`（canonical 无该视图）并返回 `null`
   * 结果缓存在实例上，因此 legacy 链**不会**因探测产生额外调用。
   */
  private async legacyCounter(): Promise<number | null> {
    if (this.flavor === 'standard') return null
    try {
      const n = Number(await this.publicClient.readContract({
        address: this.address,
        abi: [IDENTITY_REGISTRY_ABI.totalAgents],
        functionName: 'totalAgents',
      }))
      this.flavor = 'legacy'
      return n
    } catch (err) {
      // 只有「确定 revert」才是 canonical 的证据；传输错误不缓存、上抛重试。
      if (!isRevertError(err)) throw err
      this.flavor = 'standard'
      return null
    }
  }

  /**
   * 注册表实现风格（缓存）：
   *   - `'standard'`：canonical ERC-8004（无 `totalAgents` 等旧视图，用日志/`ownerOf` 派生）
   *   - `'legacy'`  ：历史一代 / 早期 draft（读取走旧视图）
   */
  async getFlavor(): Promise<'legacy' | 'standard'> {
    return (await this.legacyCounter()) === null ? 'standard' : 'legacy'
  }

  private getRegisteredLogs() {
    return this.publicClient.getLogs({ address: this.address, event: REGISTERED_EVENT, fromBlock: this.fromBlock })
  }

  private getTransferLogs() {
    return this.publicClient.getLogs({ address: this.address, event: TRANSFER_EVENT, fromBlock: this.fromBlock })
  }

  /** 由 `Registered` 日志派生最大 agentId；无日志返回 -1。 */
  private async deriveMaxFromLogs(): Promise<number> {
    const logs = await this.getRegisteredLogs()
    return logs.reduce(
      (max, l) => Math.max(max, Number((l.args as { agentId: bigint }).agentId)),
      -1
    )
  }

  /**
   * 当前最大 agentId；无 agent 时返回 `-1`。
   *   - legacy  ：`totalAgents()`（= 单调最大 ID）
   *   - standard：由 `Registered` 日志派生（标准合约没有计数器视图）
   * 结果短时缓存（15s）。
   */
  async maxAgentId(): Promise<number> {
    if (this.maxIdCache && Date.now() - this.maxIdCache.at < 15_000) return this.maxIdCache.value

    const n = await this.legacyCounter()
    const value = n !== null ? (n > 0 ? n : -1) : await this.deriveMaxFromLogs()
    this.maxIdCache = { value, at: Date.now() }
    return value
  }

  // ── Write: Register Agent ───────────────────────────────────────────────

  /**
   * Register a new Agent NFT on-chain.
   *
   * @param tokenURI    IPFS URI of the public metadata (ipfs://...)
   * @param metadata    Key-value metadata (encryptedPayloadCid, eciesEncryptedKey, etc.)
   * @param valueWei    Optional: native currency to send with registration
   * @returns           { agentId: number, txHash: Hash }
   */
  async register(
    tokenURI: string,
    metadata: { key: string; value: string }[],
    valueWei?: bigint
  ): Promise<{ agentId: number; txHash: Hash }> {
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('Wallet not connected')

    const encodedMetadata = metadata.map(m => ({
      key: m.key,
      value: stringToHex(m.value),
    }))

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [IDENTITY_REGISTRY_ABI.registerWithMetadata],
      functionName: 'registerWithMetadata',
      args: [tokenURI, encodedMetadata],
      value: valueWei,
    })

    const hash = await this.walletClient.writeContract(request)
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    // Parse agentId from Transfer event (ERC-721)
    const agentId = this._parseAgentIdFromReceipt(receipt)
    return { agentId, txHash: hash }
  }

  // ── Write: Update Attributes ────────────────────────────────────────────

  /**
   * 整组覆盖写入链上属性（合约 `updateMetadata`）。
   *
   * ⚠️ 合约实现会先清空该 agent 的**全部属性键**（`delete _agentMetadataKeys`），
   * 再写入传入数组 ⇒ **只传部分键会抹掉其余属性**（如 name/description/category/…）。
   * 增量场景请用 `setAttributes()`。
   */
  async overwriteAttributes(agentId: number, attributes: MetadataAttribute[]): Promise<Hash> {
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('Wallet not connected')

    const encoded = attributes.map(a => ({ key: a.key, value: stringToHex(a.value) }))

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [IDENTITY_REGISTRY_ABI.updateMetadata],
      functionName: 'updateMetadata',
      args: [BigInt(agentId), encoded],
    })

    const hash = await this.walletClient.writeContract(request)
    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  /**
   * 增量更新链上属性：读回现有属性 → 合并 patch → 整组写回。
   * 未在 `patch` 中出现的键保持原值（规避合约「整组覆盖」的破坏性语义）。
   *
   * 例（公开托管对话可读的技能集）：
   *   await registry.setAttributes(agentId, { skills: [{ name, description, inputSchema,
   *     execution: { type: 'mcp', endpoint, toolName } }] })
   */
  async setAttributes(agentId: number, patch: Record<string, unknown>): Promise<Hash> {
    const current = await this.getAttributes(agentId)
    const merged = { ...current }
    for (const { key, value } of toAttributes(patch)) merged[key] = value
    return this.overwriteAttributes(
      agentId,
      Object.entries(merged).map(([key, value]) => ({ key, value }))
    )
  }

  /**
   * 记录该档案的 payload 派生 mode（链上属性 `payload_key_mode`）。
   *
   * 仅记录「宣称」值，合约不做校验，但这是跨实现的**标准字段**：
   * 第三方 runner 据此判断该用 v1 还是 v2 派生，否则「用错 mode」与
   * 「载荷损坏」在现象上完全一样。
   *
   *   await registry.setPayloadKeyMode(agentId, 'eip712-hkdf')
   *
   * 读取：`readPayloadKeyMode(await registry.getAttributes(agentId))`
   */
  async setPayloadKeyMode(agentId: number, mode: DerivationMode): Promise<Hash> {
    if (!isDerivationMode(mode)) {
      throw new Error(`Unknown derivation mode: ${String(mode)}`)
    }
    return this.setAttributes(agentId, { [PAYLOAD_KEY_MODE_ATTRIBUTE]: mode })
  }

  /**
   * 记录 v3（`webauthn-prf-hkdf`）解密所必需的两项绑定：WebAuthn RP ID 与
   * credentialId（PRF 盐可省，默认冻结值）。
   *
   * v3 的密钥绑定在 (rpId, credential) 上，**无法从地址反推凭据** —— 不写这两个
   * 字段，即使本人拿着正确的 passkey 也找不回派生密钥（表现与"载荷损坏"一样）。
   *
   *   await registry.setPayloadKeyCredential(agentId, {
   *     rpId: 'app.example.com',
   *     credentialId,                       // createPrfCredential() 的返回值
   *     address: account.address,
   *   })
   *
   * 读取：`readPayloadKeyCredential(await registry.getAttributes(agentId))`
   */
  async setPayloadKeyCredential(
    agentId: number,
    credential: PayloadKeyCredential
  ): Promise<Hash> {
    return this.setAttributes(agentId, {
      [PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE]: serializePayloadKeyCredential(credential),
    })
  }

  /**
   * Simple register — just a tokenURI, no extra metadata.
   */
  async registerSimple(tokenURI: string, valueWei?: bigint): Promise<{ agentId: number; txHash: Hash }> {
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('Wallet not connected')

    const abi = tokenURI
      ? [IDENTITY_REGISTRY_ABI.registerWithTokenURI]
      : [IDENTITY_REGISTRY_ABI.register]

    const args = tokenURI ? [tokenURI] : []

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: abi as any,
      functionName: 'register',
      args: args as any,
      value: valueWei,
    })

    const hash = await this.walletClient.writeContract(request)
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
    const agentId = this._parseAgentIdFromReceipt(receipt)
    return { agentId, txHash: hash }
  }

  // ── Canonical ERC-8004 standard: setAgentURI 系列 ────────────────────────
  // 仅当目标链部署的是 canonical 标准注册表时可用（历史 / 早期 draft 注册表没有这些方法）。

  /** 更新 agent 的 URI（canonical `setAgentURI`）。owner / approved 方可调用。 */
  async setAgentURI(agentId: number, newURI: string): Promise<Hash> {
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('Wallet not connected')

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.setAgentURI],
      functionName: 'setAgentURI',
      args: [BigInt(agentId), newURI],
    })

    const hash = await this.walletClient.writeContract(request)
    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  /** 写入/更新单个链上属性（canonical `setMetadata`；非破坏性——不影响其他键）。 */
  async setMetadata(agentId: number, key: string, value: string): Promise<Hash> {
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('Wallet not connected')

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.setMetadata],
      functionName: 'setMetadata',
      args: [BigInt(agentId), key, stringToHex(value)],
    })

    const hash = await this.walletClient.writeContract(request)
    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  /**
   * 绑定 agent 的验证钱包（canonical `setAgentWallet`）。
   * `signature` 为 newWallet 对 EIP-712 `AgentWalletSet(agentId,newWallet,owner,deadline)`
   * 的签名（EOA 走 ECDSA / 智能合约钱包走 ERC-1271）；`deadline` 为 Unix 秒且不得超过
   * 当前时间 5 分钟。owner 转让时合约会自动清除绑定。
   */
  async setAgentWallet(
    agentId: number,
    newWallet: Address,
    deadline: number,
    signature: `0x${string}`
  ): Promise<Hash> {
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('Wallet not connected')

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.setAgentWallet],
      functionName: 'setAgentWallet',
      args: [BigInt(agentId), newWallet, BigInt(deadline), signature],
    })

    const hash = await this.walletClient.writeContract(request)
    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  /** 清除 agent 的验证钱包绑定（canonical `unsetAgentWallet`）。 */
  async unsetAgentWallet(agentId: number): Promise<Hash> {
    const [account] = await this.walletClient.getAddresses()
    if (!account) throw new Error('Wallet not connected')

    const { request } = await this.publicClient.simulateContract({
      account,
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.unsetAgentWallet],
      functionName: 'unsetAgentWallet',
      args: [BigInt(agentId)],
    })

    const hash = await this.walletClient.writeContract(request)
    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  /** 读取单个链上属性（canonical `getMetadata`）；UTF-8 解码，非法字节回退原始 hex。 */
  async getMetadata(agentId: number, key: string): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.getMetadata],
      functionName: 'getMetadata',
      args: [BigInt(agentId), key],
    })
    return decodeBytesLenient(result as `0x${string}`)
  }

  /** 读取 agent 的验证钱包（canonical `getAgentWallet`；未绑定返回 0x0）。 */
  async getAgentWallet(agentId: number): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.getAgentWallet],
      functionName: 'getAgentWallet',
      args: [BigInt(agentId)],
    })
    return result as Address
  }

  /** spender 是否为 agent 的 owner 或被授权方（canonical `isAuthorizedOrOwner`）。 */
  async isAuthorizedOrOwner(spender: Address, agentId: number): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.isAuthorizedOrOwner],
      functionName: 'isAuthorizedOrOwner',
      args: [spender, BigInt(agentId)],
    })
    return result as boolean
  }

  /** agent 的 owner（ERC-721 `ownerOf`；不存在则 revert）。 */
  async ownerOf(agentId: number): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.ownerOf],
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    })
    return result as Address
  }

  /** 注册表实现版本（canonical `getVersion`，标准实现返回 "2.0.0"）。 */
  async getVersion(): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_IDENTITY_ABI.getVersion],
      functionName: 'getVersion',
    })
    return result as string
  }

  // ── Read: Query ──────────────────────────────────────────────────────────

  /**
   * Get all agent IDs owned by an address.
   * legacy ：直接读 `getAgentsByOwner`；
   * standard：标准注册表没有该视图 → 由 `Transfer` 日志推导每个 token 的最新持有者。
   */
  async getAgentsByOwner(owner: Address): Promise<number[]> {
    if (this.flavor !== 'standard') {
      try {
        const result = await this.publicClient.readContract({
          address: this.address,
          abi: [IDENTITY_REGISTRY_ABI.getAgentsByOwner],
          functionName: 'getAgentsByOwner',
          args: [owner],
        })
        this.flavor = 'legacy'
        return (result as bigint[]).map(Number)
      } catch (err) {
        if (!isRevertError(err)) throw err
        this.flavor = 'standard'
      }
    }

    const logs = await this.getTransferLogs()
    const latest = new Map<number, string>()
    for (const l of logs) {
      const args = l.args as { to: string; tokenId: bigint }
      latest.set(Number(args.tokenId), args.to)
    }
    const target = owner.toLowerCase()
    return [...latest.entries()]
      .filter(([, to]) => to.toLowerCase() === target && to.toLowerCase() !== ZERO_ADDRESS)
      .map(([id]) => id)
      .sort((a, b) => a - b)
  }

  /** Get the current agent counter（legacy `getCurrentAgentId`；standard 0-based → maxId+1）。 */
  async getCurrentAgentId(): Promise<number> {
    if (this.flavor !== 'standard') {
      try {
        const result = await this.publicClient.readContract({
          address: this.address,
          abi: [IDENTITY_REGISTRY_ABI.getCurrentAgentId],
          functionName: 'getCurrentAgentId',
        })
        this.flavor = 'legacy'
        return Number(result as bigint)
      } catch (err) {
        if (!isRevertError(err)) throw err
        this.flavor = 'standard'
      }
    }
    return this.totalAgents()
  }

  /** Check if an agent exists（legacy `agentExists`；standard 用 `ownerOf` 试探）。 */
  async agentExists(agentId: number): Promise<boolean> {
    if (this.flavor !== 'standard') {
      try {
        const result = await this.publicClient.readContract({
          address: this.address,
          abi: [IDENTITY_REGISTRY_ABI.agentExists],
          functionName: 'agentExists',
          args: [BigInt(agentId)],
        })
        this.flavor = 'legacy'
        return result as boolean
      } catch (err) {
        if (!isRevertError(err)) throw err
        this.flavor = 'standard'
      }
    }
    try {
      await this.ownerOf(agentId)
      return true
    } catch {
      return false
    }
  }

  /** Get the tokenURI for an agent. */
  async tokenURI(agentId: number): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [IDENTITY_REGISTRY_ABI.tokenURI],
      functionName: 'tokenURI',
      args: [BigInt(agentId)],
    })
    return result as string
  }

  /** Get all metadata attributes for an agent as key-value pairs. */
  async getAttributes(agentId: number): Promise<Record<string, string>> {
    if ((await this.getFlavor()) === 'standard') {
      // 标准注册表没有“一次性返回全部属性”的视图 → 按已知键逐个 getMetadata
      const attrs: Record<string, string> = {}
      await Promise.all(
        KNOWN_ATTRIBUTE_KEYS.map(async (key) => {
          try {
            const v = await this.getMetadata(agentId, key)
            if (v && v !== '0x') attrs[key] = v
          } catch {
            // 键不存在 / 读取失败 → 忽略该键
          }
        })
      )
      return attrs
    }

    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [IDENTITY_REGISTRY_ABI.getAgentMetadata],
      functionName: 'getAgentMetadata',
      args: [BigInt(agentId)],
    })
    const attrs: Record<string, string> = {}
    for (const item of result as { key: string; value: string }[]) {
      attrs[item.key] = decodeBytesLenient(item.value as `0x${string}`)
    }
    return attrs
  }

  /** Total number of registered agents（standard 0-based → maxId+1；legacy 计数器）。 */
  async totalAgents(): Promise<number> {
    if ((await this.getFlavor()) === 'standard') {
      const max = await this.maxAgentId()
      return max < 0 ? 0 : max + 1
    }
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: [IDENTITY_REGISTRY_ABI.totalAgents],
      functionName: 'totalAgents',
    })
    return Number(result as bigint)
  }

  /**
   * Structured metadata for one agent.
   * Combines on-chain attributes (encryptedPayloadCid / eciesEncryptedKey /
   * publicPayloadCid) with the tokenURI JSON (name/description/capabilities/skills).
   * `isActive` defaults to on-chain existence, overridable via tokenURI JSON.
   */
  async getAgentMetadata(agentId: number): Promise<StructuredAgentMetadata> {
    const attrs = await this.getAttributes(agentId)
    const parsed = parseTokenURIJSON(await this.tokenURI(agentId))

    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])
    const caps = arr(parsed?.capabilities)
    const skills = arr(parsed?.skills)

    return {
      name: str(parsed?.name) || str(attrs.name) || `Agent ${agentId}`,
      description: str(parsed?.description) || str(attrs.description),
      encryptedPayloadCid: str(attrs.encryptedPayloadCid),
      eciesEncryptedKey: str(attrs.eciesEncryptedKey),
      publicPayloadCid: str(attrs.publicPayloadCid),
      capabilities: caps.length ? caps : arr(attrs.capabilities),
      skills: skills.length ? skills : arr(attrs.skills),
      category: str(parsed?.category) || str(attrs.category) || undefined,
      isActive:
        typeof parsed?.isActive === 'boolean'
          ? parsed.isActive
          : typeof parsed?.is_active === 'boolean'
            ? parsed.is_active
            : await this.agentExists(agentId),
    }
  }

  /**
   * Batch-read all agents in a contiguous ID range with optional filters.
   * Replaces the manual binary-search + per-ID ownerOf loop used by chain-sync.
   */
  async getAllAgents(options: GetAllAgentsOptions = {}): Promise<AgentSummary[]> {
    const flavor = await this.getFlavor()
    const { batchSize = 10, activeOnly = false, capabilities } = options
    // standard 为 0-based ID（首个 agentId=0），legacy 为 1-based
    const fromId = options.fromId ?? (flavor === 'standard' ? 0 : 1)
    const toId = options.toId ?? (await this.maxAgentId())
    if (toId < fromId || toId < 0) return []

    const agents: AgentSummary[] = []
    for (let start = fromId; start <= toId; start += batchSize) {
      const end = Math.min(start + batchSize - 1, toId)
      const ids: number[] = []
      for (let id = start; id <= end; id++) ids.push(id)

      const results = await Promise.all(
        ids.map(async (agentId) => {
          try {
            const [owner, tokenURI] = await Promise.all([
              // legacy 用 `getAgentOwner`（与历史版本完全一致）；canonical 无该视图，用 ERC-721
              // `ownerOf`（不存在时 revert → 外层 catch 返回 null）。两者均为 ERC-721，仅在
              // NFT 转移后语义不同（getAgentOwner=注册者，ownerOf=当前持有人）。
              flavor === 'legacy'
                ? this.publicClient.readContract({
                    address: this.address,
                    abi: [IDENTITY_REGISTRY_ABI.getAgentOwner],
                    functionName: 'getAgentOwner',
                    args: [BigInt(agentId)],
                  })
                : this.publicClient.readContract({
                    address: this.address,
                    abi: [STANDARD_IDENTITY_ABI.ownerOf],
                    functionName: 'ownerOf',
                    args: [BigInt(agentId)],
                  }),
              this.tokenURI(agentId),
            ])
            if (!owner || owner === ZERO_ADDRESS || !tokenURI) return null

            const parsed = parseTokenURIJSON(tokenURI)
            const metadata: AgentSummaryMetadata = {
              name: (parsed?.name as string) || `Agent ${agentId}`,
              description: (parsed?.description as string) || '',
              capabilities: Array.isArray(parsed?.capabilities) ? parsed.capabilities.map(String) : [],
              skills: Array.isArray(parsed?.skills) ? parsed.skills.map(String) : [],
              category: typeof parsed?.category === 'string' && parsed.category ? parsed.category : undefined,
              isActive:
                typeof parsed?.isActive === 'boolean'
                  ? parsed.isActive
                  : typeof parsed?.is_active === 'boolean'
                    ? parsed.is_active
                    : true,
            }

            if (activeOnly && !metadata.isActive) return null
            if (capabilities?.length && !capabilities.every((c) => metadata.capabilities.includes(c))) return null

            return { agentId, owner: owner as string, tokenURI, metadata, createdAt: parseCreatedAt(parsed) }
          } catch {
            return null
          }
        })
      )

      for (const r of results) {
        if (r) agents.push(r)
      }
    }
    return agents
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Extract tokenId from the Transfer event in the receipt. */
  private _parseAgentIdFromReceipt(receipt: { logs: { topics: string[]; data: string }[] }): number {
    for (const log of receipt.logs) {
      // ERC-721 Transfer event: keccak("Transfer(address,address,uint256)")
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      if (log.topics[0] === transferTopic && log.topics.length >= 4) {
        return Number(BigInt(log.topics[3]!))
      }
    }
    throw new Error('Could not parse agentId from Transfer event in receipt')
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────

/** Extract IPFS CID from an ipfs:// URI. */
export function cidFromURI(uri: string): string {
  return uri.replace(/^ipfs:\/\//, '')
}
