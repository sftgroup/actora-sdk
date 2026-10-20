// ---------------------------------------------------------------------------
// @actora/sdk — Reputation
// ---------------------------------------------------------------------------
// ERC-8004 信誉注册表**双模式只读适配器**：
//   · legacy   —— 自研 erc8004-core ReputationRegistry（uint8 score / bytes32 标签 / getReputationSummary）
//   · standard —— 官方 canonical ERC-8004 ReputationRegistry（int128 value+decimals / string 标签 / getSummary）
//
// flavor 探测（与 AgentRegistry 同款）：试调 legacy 专有的 `getReputationSummary`；
//   成功 → 'legacy'；**确定 revert** → 'standard'；传输错误上抛且不缓存。
//
// 对外统一为「标准形参」：tag 为 string，value 为 int128(value) + valueDecimals。
// 注意：标准 `getSummary` 在 clients 为空时 revert（须显式传入客户地址）；legacy 空 clients=全部。
// ---------------------------------------------------------------------------

import type { PublicClient, Address } from 'viem'

const ZERO32 = `0x${'0'.repeat(64)}` as const

/**
 * 判断错误是否为「合约 revert」（函数不存在 / 调用被拒绝），而非网络 / 传输错误。
 * flavor 探测**只在确定 revert 时**才判定为 standard：否则一次 RPC 限流 / 超时会把
 * legacy 链误判为 standard，且被实例缓存。
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

/** 短字符串标签 → bytes32（右补零）；超过 32 字节抛错（无法编码为 legacy bytes32）。 */
function tagToBytes32(tag: string): `0x${string}` {
  if (!tag) return ZERO32
  const bytes = Buffer.from(tag, 'utf8')
  if (bytes.length > 32) throw new Error('reputation tag exceeds 32 bytes')
  return `0x${bytes.toString('hex').padEnd(64, '0')}`
}

/** bytes32 → 字符串（去掉右侧零填充）。 */
function bytes32ToString(v: `0x${string}`): string {
  const hex = v.slice(2)
  let end = hex.length
  while (end > 0 && hex.slice(end - 2, end) === '00') end -= 2
  const trimmed = hex.slice(0, end)
  return trimmed ? Buffer.from(trimmed, 'hex').toString('utf8') : ''
}

// ── Minimal ABI Fragments ──────────────────────────────────────────────────

const LEGACY_ABI = {
  getReputationSummary: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'bytes32' },
      { name: 'tag2', type: 'bytes32' },
    ] as const,
    name: 'getReputationSummary' as const,
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'averageScore', type: 'uint8' },
    ] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  readFeedback: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
      { name: 'index', type: 'uint64' },
    ] as const,
    name: 'readFeedback' as const,
    outputs: [
      { name: 'score', type: 'uint8' },
      { name: 'tag1', type: 'bytes32' },
      { name: 'tag2', type: 'bytes32' },
      { name: 'isRevoked', type: 'bool' },
    ] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
}

const STANDARD_ABI = {
  getSummary: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
    ] as const,
    name: 'getSummary' as const,
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryValueDecimals', type: 'uint8' },
    ] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  readFeedback: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
      { name: 'feedbackIndex', type: 'uint64' },
    ] as const,
    name: 'readFeedback' as const,
    outputs: [
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'isRevoked', type: 'bool' },
    ] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
}

const COMMON_ABI = {
  getClients: {
    inputs: [{ name: 'agentId', type: 'uint256' }] as const,
    name: 'getClients' as const,
    outputs: [{ name: '', type: 'address[]' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  getLastIndex: {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
    ] as const,
    name: 'getLastIndex' as const,
    outputs: [{ name: '', type: 'uint64' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
}

export interface ReputationConfig {
  contractAddress: Address
  publicClient: PublicClient
}

export type ReputationFlavor = 'legacy' | 'standard'

/** 归一化的信誉聚合结果（标准形参）。 */
export interface ReputationSummary {
  count: number
  value: bigint
  valueDecimals: number
}

/** 归一化的单条反馈（标准形参）。 */
export interface ReputationFeedback {
  value: bigint
  valueDecimals: number
  tag1: string
  tag2: string
  isRevoked: boolean
}

export class ReputationRegistry {
  private address: Address
  private publicClient: PublicClient
  /** 实现风格探测结果（缓存）：standard=canonical / legacy=历史实现。 */
  private flavor?: ReputationFlavor

  constructor(config: ReputationConfig) {
    this.address = config.contractAddress
    this.publicClient = config.publicClient
  }

  // ── Implementation flavor detection ─────────────────────────────────────

  /**
   * 尝试读取 legacy 视图 `getReputationSummary()`：
   *   - 成功 → 判定 `'legacy'`
   *   - 确定 revert → 判定 `'standard'`（canonical 无该视图，只有 `getSummary`）
   * 结果缓存在实例上，因此 legacy 链**不会**因探测产生额外调用。
   */
  private async legacyProbe(): Promise<boolean> {
    if (this.flavor === 'legacy') return true
    if (this.flavor === 'standard') return false
    try {
      await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.getReputationSummary],
        functionName: 'getReputationSummary',
        args: [0n, [], ZERO32, ZERO32],
      })
      this.flavor = 'legacy'
      return true
    } catch (err) {
      // 只有「确定 revert」才是 standard 的证据；传输错误不缓存、上抛重试。
      if (!isRevertError(err)) throw err
      this.flavor = 'standard'
      return false
    }
  }

  /** 实现风格（缓存）：`'standard'`=官方 canonical / `'legacy'`=历史实现。 */
  async getFlavor(): Promise<ReputationFlavor> {
    return (await this.legacyProbe()) ? 'legacy' : 'standard'
  }

  // ── 读：聚合 ─────────────────────────────────────────────────────────

  /**
   * 聚合读取（标准形参）。
   * @dev legacy：转调 `getReputationSummary`（uint8 均分）→ 归一化为 `valueDecimals=0`；
   *      standard：转调标准 `getSummary`。
   *      注意：standard 下 `clients` 为空会 revert（标准要求显式传入客户地址）。
   */
  async getSummary(agentId: number, clients: Address[] = [], tag1 = '', tag2 = ''): Promise<ReputationSummary> {
    if (await this.legacyProbe()) {
      const r = (await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.getReputationSummary],
        functionName: 'getReputationSummary',
        args: [BigInt(agentId), clients, tagToBytes32(tag1), tagToBytes32(tag2)],
      })) as readonly [bigint, number]
      return { count: Number(r[0]), value: BigInt(r[1]), valueDecimals: 0 }
    }
    const r = (await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_ABI.getSummary],
      functionName: 'getSummary',
      args: [BigInt(agentId), clients, tag1, tag2],
    })) as readonly [bigint, bigint, number]
    return { count: Number(r[0]), value: r[1], valueDecimals: Number(r[2]) }
  }

  /** legacy 兼容聚合（uint8 均分）。standard 下由 `getSummary` 归一到 0-100。 */
  async getReputationSummary(
    agentId: number,
    clients: Address[] = [],
    tag1 = '',
    tag2 = '',
  ): Promise<{ count: number; averageScore: number }> {
    if (await this.legacyProbe()) {
      const r = (await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.getReputationSummary],
        functionName: 'getReputationSummary',
        args: [BigInt(agentId), clients, tagToBytes32(tag1), tagToBytes32(tag2)],
      })) as readonly [bigint, number]
      return { count: Number(r[0]), averageScore: Number(r[1]) }
    }
    const { count, value, valueDecimals } = await this.getSummary(agentId, clients, tag1, tag2)
    return { count, averageScore: normalizeScore(value, valueDecimals) }
  }

  // ── 读：明细 / 枚举 ──────────────────────────────────────────────────

  /** 单条反馈（标准形参）。 */
  async readFeedback(agentId: number, clientAddress: Address, index: number): Promise<ReputationFeedback> {
    if (await this.legacyProbe()) {
      const r = (await this.publicClient.readContract({
        address: this.address,
        abi: [LEGACY_ABI.readFeedback],
        functionName: 'readFeedback',
        args: [BigInt(agentId), clientAddress, BigInt(index)],
      })) as readonly [number, `0x${string}`, `0x${string}`, boolean]
      return {
        value: BigInt(r[0]),
        valueDecimals: 0,
        tag1: bytes32ToString(r[1]),
        tag2: bytes32ToString(r[2]),
        isRevoked: r[3],
      }
    }
    const r = (await this.publicClient.readContract({
      address: this.address,
      abi: [STANDARD_ABI.readFeedback],
      functionName: 'readFeedback',
      args: [BigInt(agentId), clientAddress, BigInt(index)],
    })) as readonly [bigint, number, string, string, boolean]
    return {
      value: r[0],
      valueDecimals: Number(r[1]),
      tag1: r[2],
      tag2: r[3],
      isRevoked: r[4],
    }
  }

  /** 给出反馈的客户地址列表（两版同签名）。 */
  async getClients(agentId: number): Promise<Address[]> {
    const r = (await this.publicClient.readContract({
      address: this.address,
      abi: [COMMON_ABI.getClients],
      functionName: 'getClients',
      args: [BigInt(agentId)],
    })) as readonly Address[]
    return [...r]
  }

  /** 某客户在 agent 上的最后反馈索引（0 表示没有）。 */
  async getLastIndex(agentId: number, clientAddress: Address): Promise<number> {
    const r = (await this.publicClient.readContract({
      address: this.address,
      abi: [COMMON_ABI.getLastIndex],
      functionName: 'getLastIndex',
      args: [BigInt(agentId), clientAddress],
    })) as bigint
    return Number(r)
  }
}

/** int128 value + decimals → 0-100 的整数分值（夹取到边界）。 */
function normalizeScore(value: bigint, valueDecimals: number): number {
  let v = value
  if (valueDecimals > 0) {
    v = v / 10n ** BigInt(valueDecimals)
  }
  if (v <= 0n) return 0
  if (v >= 100n) return 100
  return Number(v)
}
