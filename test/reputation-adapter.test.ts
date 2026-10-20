// ReputationRegistry — 双模式（legacy / canonical）只读适配器单测。
//   - flavor 探测：试调 legacy 专有的 `getReputationSummary`；成功=legacy，revert=standard；
//   - 对外统一标准形参：{ count, value, valueDecimals, tag1:string, tag2:string }；
//   - legacy：uint8 score / bytes32 标签 → 归一化；standard：int128 value+decimals / string 标签。
import { describe, it, expect, vi } from 'vitest'
import { ReputationRegistry } from '../src/reputation/reputation'

const ORACLE = '0x00000000000000000000000000000000000000a1'
const ZERO32 = `0x${'0'.repeat(64)}`
const b32 = (s: string) => `0x${Buffer.from(s, 'utf8').toString('hex').padEnd(64, '0')}`

/** legacy 风格 mock：有 getReputationSummary（uint8/bytes32）。 */
function makeLegacy() {
  const readContract = vi.fn(async (req: { functionName: string; args?: unknown[] }) => {
    switch (req.functionName) {
      case 'getReputationSummary': {
        const id = Number(req.args?.[0])
        // 探测调用（agentId=0）返回空；真实查询返回 3 条、均分 80
        return id === 0 ? [0n, 0] : [3n, 80]
      }
      case 'readFeedback':
        return [80, b32('research'), ZERO32, false]
      case 'getClients':
        return [ORACLE]
      case 'getLastIndex':
        return 2n
      default:
        throw new Error(`unexpected functionName: ${req.functionName}`)
    }
  })
  const registry = new ReputationRegistry({
    contractAddress: '0x0000000000000000000000000000000000000001',
    publicClient: { readContract } as never,
  })
  return { registry, readContract }
}

/** canonical（standard）风格 mock：无 getReputationSummary，只有 getSummary（int128/string）。 */
function makeStandard() {
  const readContract = vi.fn(async (req: { functionName: string; args?: unknown[] }) => {
    switch (req.functionName) {
      case 'getReputationSummary':
        throw new Error('execution reverted') // canonical 无该视图 → 触发 standard 判定
      case 'getSummary': {
        const clients = (req.args?.[1] as unknown[]) ?? []
        if (clients.length === 0) throw new Error('execution reverted: clientAddresses required')
        return [2n, 90n, 0]
      }
      case 'readFeedback':
        return [95n, 0, 'payment-settlement', '', false]
      case 'getClients':
        return [ORACLE]
      case 'getLastIndex':
        return 2n
      default:
        throw new Error(`unexpected functionName: ${req.functionName}`)
    }
  })
  const registry = new ReputationRegistry({
    contractAddress: '0x0000000000000000000000000000000000000001',
    publicClient: { readContract } as never,
  })
  return { registry, readContract }
}

describe('ReputationRegistry flavor 探测', () => {
  it('legacy 视图可用 → 判定 legacy', async () => {
    const { registry } = makeLegacy()
    expect(await registry.getFlavor()).toBe('legacy')
  })

  it('legacy 视图 revert → 判定 standard', async () => {
    const { registry } = makeStandard()
    expect(await registry.getFlavor()).toBe('standard')
  })

  it('传输错误（非 revert）不误判为 standard，而是上抛且不缓存', async () => {
    const readContract = vi.fn(async () => {
      throw new Error('HTTP request failed: 429 rate limit exceeded')
    })
    const registry = new ReputationRegistry({
      contractAddress: '0x0000000000000000000000000000000000000001',
      publicClient: { readContract } as never,
    })
    await expect(registry.getFlavor()).rejects.toThrow(/rate limit/)
    await expect(registry.getFlavor()).rejects.toThrow(/rate limit/)
  })
})

describe('ReputationRegistry — legacy 读取（归一化为标准形参）', () => {
  it('getSummary 归一化 uint8 均分 → (count, value, 0)', async () => {
    const { registry } = makeLegacy()
    expect(await registry.getSummary(1)).toEqual({ count: 3, value: 80n, valueDecimals: 0 })
  })

  it('getReputationSummary 保留 legacy 均分口径', async () => {
    const { registry } = makeLegacy()
    expect(await registry.getReputationSummary(1)).toEqual({ count: 3, averageScore: 80 })
  })

  it('readFeedback 把 bytes32 标签解码为字符串', async () => {
    const { registry } = makeLegacy()
    expect(await registry.readFeedback(1, ORACLE, 1)).toEqual({
      value: 80n,
      valueDecimals: 0,
      tag1: 'research',
      tag2: '',
      isRevoked: false,
    })
  })

  it('string 标签编码为 bytes32 后传给 legacy（右补零）', async () => {
    const { registry, readContract } = makeLegacy()
    await registry.getSummary(1, [], 'research', '')
    const call = readContract.mock.calls.find((c) => c[0].functionName === 'getReputationSummary' && Number(c[0].args?.[0]) === 1)
    expect(call?.[0].args?.[2]).toBe(b32('research'))
    expect(call?.[0].args?.[3]).toBe(ZERO32)
  })
})

describe('ReputationRegistry — canonical（standard）读取', () => {
  it('getSummary 直接转调标准面', async () => {
    const { registry } = makeStandard()
    expect(await registry.getSummary(0, [ORACLE], 'payment-settlement', '')).toEqual({
      count: 2,
      value: 90n,
      valueDecimals: 0,
    })
  })

  it('getReputationSummary 由标准面归一到 0-100 均分', async () => {
    const { registry } = makeStandard()
    expect(await registry.getReputationSummary(0, [ORACLE])).toEqual({ count: 2, averageScore: 90 })
  })

  it('readFeedback 保留 string 标签与 decimals', async () => {
    const { registry } = makeStandard()
    expect(await registry.readFeedback(0, ORACLE, 1)).toEqual({
      value: 95n,
      valueDecimals: 0,
      tag1: 'payment-settlement',
      tag2: '',
      isRevoked: false,
    })
  })

  it('standard 下 clients 为空 → 上抛（标准要求显式传入客户地址）', async () => {
    const { registry } = makeStandard()
    await expect(registry.getSummary(0, [])).rejects.toThrow(/revert/)
  })
})
