// AgentRegistry — canonical ERC-8004 读取回退单测。
// canonical 标准注册表没有 `totalAgents` / `getAgentsByOwner` / `getCurrentAgentId` /
// `agentExists` 等历史视图，读取需：
//   - flavor 探测：legacy 视图 revert → 判定 standard；
//   - owner 走 ERC-721 `ownerOf`；
//   - 属性按已知键逐个 `getMetadata`；
//   - 最大 agentId / 按 owner 枚举由 `Registered` / `Transfer` 日志派生；
//   - ID 为 0-based。
import { describe, it, expect, vi } from 'vitest'
import { AgentRegistry } from '../src/registry/agent-registry'

const ZERO = '0x0000000000000000000000000000000000000000'
const OWNER_A = '0x00000000000000000000000000000000000000a1'
const OWNER_B = '0x00000000000000000000000000000000000000b2'

const b64 = (o: unknown) => `data:application/json;base64,${Buffer.from(JSON.stringify(o)).toString('base64')}`
const hex = (s: string) => `0x${Buffer.from(s, 'utf8').toString('hex')}`

interface RegistryMockOptions {
  metadata?: Record<string, string>
  owners?: Record<number, string | undefined>
  tokenURIs?: Record<number, string>
  registered?: { agentId: bigint; agentURI: string; owner: string }[]
  transfers?: { from: string; to: string; tokenId: bigint }[]
  fromBlock?: number
}

/** 构造一个 canonical（standard）风格的 AgentRegistry mock：旧视图一律 revert。 */
function makeCanonicalRegistry(opts: RegistryMockOptions = {}) {
  const {
    metadata = {},
    owners = {},
    tokenURIs = {},
    registered = [],
    transfers = [],
    fromBlock,
  } = opts

  const readContract = vi.fn(async (req: { functionName: string; args?: unknown[] }) => {
    switch (req.functionName) {
      // canonical 没有这些历史视图 → revert
      case 'totalAgents':
      case 'getAgentsByOwner':
      case 'getCurrentAgentId':
      case 'agentExists':
      case 'getAgentMetadata':
        throw new Error('execution reverted')
      case 'getMetadata': {
        const key = String(req.args?.[1])
        if (!(key in metadata)) return '0x'
        return hex(metadata[key]!)
      }
      case 'ownerOf': {
        const id = Number(req.args?.[0])
        const o = owners[id]
        if (!o) throw new Error('ERC721: invalid token ID')
        return o
      }
      case 'tokenURI': {
        const id = Number(req.args?.[0])
        return tokenURIs[id] ?? ''
      }
      default:
        throw new Error(`unexpected functionName: ${req.functionName}`)
    }
  })

  const getLogs = vi.fn(async (req: { event: { name: string } }) =>
    req.event.name === 'Registered'
      ? registered.map((a) => ({ args: a }))
      : transfers.map((t) => ({ args: t }))
  )

  const registry = new AgentRegistry({
    contractAddress: '0x0000000000000000000000000000000000000001',
    publicClient: {
      readContract,
      getLogs,
      simulateContract: vi.fn(async () => ({ request: { __sim: true } })),
      waitForTransactionReceipt: vi.fn(async () => ({ status: 'success' })),
    } as never,
    walletClient: { getAddresses: vi.fn(async () => ['0xowner']), writeContract: vi.fn() } as never,
    fromBlock,
  })

  return { registry, readContract, getLogs }
}

describe('AgentRegistry flavor 探测', () => {
  it('legacy 视图 revert → 判定 standard', async () => {
    const { registry } = makeCanonicalRegistry()
    expect(await registry.getFlavor()).toBe('standard')
  })

  it('legacy 视图可用 → 判定 legacy', async () => {
    const readContract = vi.fn(async () => 3n)
    const registry = new AgentRegistry({
      contractAddress: '0x0000000000000000000000000000000000000001',
      publicClient: {
        readContract,
        getLogs: vi.fn(async () => []),
        simulateContract: vi.fn(),
        waitForTransactionReceipt: vi.fn(),
      } as never,
      walletClient: { getAddresses: vi.fn(async () => ['0xowner']), writeContract: vi.fn() } as never,
    })
    expect(await registry.getFlavor()).toBe('legacy')
  })

  it('传输错误（非 revert）不误判为 standard，而是上抛且不缓存', async () => {
    const readContract = vi.fn(async () => {
      throw new Error('HTTP request failed: 429 rate limit exceeded')
    })
    const registry = new AgentRegistry({
      contractAddress: '0x0000000000000000000000000000000000000001',
      publicClient: {
        readContract,
        getLogs: vi.fn(async () => []),
        simulateContract: vi.fn(),
        waitForTransactionReceipt: vi.fn(),
      } as never,
      walletClient: { getAddresses: vi.fn(async () => ['0xowner']), writeContract: vi.fn() } as never,
    })

    // 两次调用都应上抛（说明没有把 transient 误缓存为 'standard'）
    await expect(registry.getFlavor()).rejects.toThrow(/rate limit/)
    await expect(registry.getFlavor()).rejects.toThrow(/rate limit/)
  })
})

describe('AgentRegistry — canonical standard 读取', () => {
  it('getAttributes 按已知键逐个 getMetadata，缺失键忽略', async () => {
    const { registry } = makeCanonicalRegistry({
      metadata: { name: 'MyAgent', category: 'research', skills: '["consult"]' },
    })

    expect(await registry.getAttributes(7)).toEqual({
      name: 'MyAgent',
      category: 'research',
      skills: '["consult"]',
    })
  })

  it('agentExists 走 ownerOf：存在 true / 不存在 false', async () => {
    const { registry } = makeCanonicalRegistry({ owners: { 0: OWNER_A } })

    expect(await registry.agentExists(0)).toBe(true)
    expect(await registry.agentExists(99)).toBe(false)
  })

  it('totalAgents / getCurrentAgentId 由 Registered 日志派生（0-based → maxId+1）', async () => {
    const { registry } = makeCanonicalRegistry({
      registered: [
        { agentId: 0n, agentURI: 'ipfs://a', owner: OWNER_A },
        { agentId: 1n, agentURI: 'ipfs://b', owner: OWNER_A },
        { agentId: 2n, agentURI: 'ipfs://c', owner: OWNER_B },
      ],
    })

    expect(await registry.maxAgentId()).toBe(2)
    expect(await registry.totalAgents()).toBe(3)
    expect(await registry.getCurrentAgentId()).toBe(3)
  })

  it('无任何 agent 时 totalAgents 为 0、maxAgentId 为 -1', async () => {
    const { registry } = makeCanonicalRegistry()
    expect(await registry.maxAgentId()).toBe(-1)
    expect(await registry.totalAgents()).toBe(0)
  })

  it('getAgentsByOwner 由 Transfer 日志派生最新持有者（含转出/销毁）', async () => {
    const { registry } = makeCanonicalRegistry({
      transfers: [
        { from: ZERO, to: OWNER_A, tokenId: 0n }, // A mint
        { from: ZERO, to: OWNER_A, tokenId: 1n }, // A mint
        { from: OWNER_A, to: OWNER_B, tokenId: 1n }, // 1 转给 B
        { from: OWNER_A, to: ZERO, tokenId: 0n }, // 0 销毁
      ],
    })

    expect(await registry.getAgentsByOwner(OWNER_A)).toEqual([])
    expect(await registry.getAgentsByOwner(OWNER_B)).toEqual([1])
  })
})

describe('AgentRegistry.getAllAgents — canonical 0-based', () => {
  it('默认从 0 扫描，用 ownerOf/ tokenURI 组装', async () => {
    const { registry } = makeCanonicalRegistry({
      registered: [
        { agentId: 0n, agentURI: 'ipfs://a', owner: OWNER_A },
        { agentId: 1n, agentURI: 'ipfs://b', owner: OWNER_B },
      ],
      owners: { 0: OWNER_A, 1: OWNER_B },
      tokenURIs: {
        0: b64({ name: 'Agent Zero', capabilities: ['chat'] }),
        1: b64({ name: 'Agent One' }),
      },
    })

    const agents = await registry.getAllAgents()
    expect(agents.map((a) => a.agentId)).toEqual([0, 1])
    expect(agents[0]).toMatchObject({ owner: OWNER_A, metadata: { name: 'Agent Zero', capabilities: ['chat'] } })
    expect(agents[1]).toMatchObject({ owner: OWNER_B, metadata: { name: 'Agent One' } })
  })
})

describe('AgentRegistry.fromBlock', () => {
  it('传给 getLogs 作为扫描起点', async () => {
    const { registry, getLogs } = makeCanonicalRegistry({
      fromBlock: 251_204,
      registered: [{ agentId: 0n, agentURI: 'ipfs://a', owner: OWNER_A }],
    })

    await registry.maxAgentId()
    expect(getLogs.mock.calls[0][0]).toMatchObject({ fromBlock: 251_204n })
  })
})

describe('AgentRegistry.getAllAgents — legacy 保持历史行为', () => {
  function makeLegacyRegistry(owners: Record<number, string> = { 1: OWNER_A, 2: OWNER_B }) {
    const readContract = vi.fn(async (req: { functionName: string; args?: unknown[] }) => {
      switch (req.functionName) {
        case 'totalAgents':
        case 'getCurrentAgentId':
          return 2n
        case 'getAgentOwner': {
          const id = Number(req.args?.[0])
          return owners[id] ?? ZERO
        }
        case 'getAgentsByOwner':
          return Object.keys(owners).map(Number)
        case 'agentExists':
          return Number(req.args?.[0]) in owners
        case 'getAgentMetadata':
          return []
        case 'tokenURI':
          return b64({ name: `Agent ${String(req.args?.[0])}` })
        default:
          throw new Error(`unexpected functionName: ${req.functionName}`)
      }
    })
    const getLogs = vi.fn(async () => [])
    const registry = new AgentRegistry({
      contractAddress: '0x0000000000000000000000000000000000000001',
      publicClient: {
        readContract,
        getLogs,
        simulateContract: vi.fn(),
        waitForTransactionReceipt: vi.fn(),
      } as never,
      walletClient: { getAddresses: vi.fn(async () => ['0xowner']), writeContract: vi.fn() } as never,
    })
    return { registry, readContract, getLogs }
  }

  it('从 1 扫到 totalAgents，owner 走 getAgentOwner（不读日志、不用 ownerOf）', async () => {
    const { registry, readContract, getLogs } = makeLegacyRegistry()

    const agents = await registry.getAllAgents()
    expect(agents.map((a) => a.agentId)).toEqual([1, 2])
    expect(agents[0].owner).toBe(OWNER_A)
    expect(agents[1].owner).toBe(OWNER_B)

    const calls = readContract.mock.calls.map((c) => c[0].functionName)
    expect(calls).toContain('getAgentOwner')
    expect(calls).not.toContain('ownerOf')
    expect(getLogs).not.toHaveBeenCalled()
  })

  it('NFT 转移后 owner 反映注册者（legacy 语义：getAgentOwner）', async () => {
    // 模拟一个「ownerOf 已是新持有人、但 getAgentOwner 仍是注册者」的 legacy 场景：
    // 通过 getAgentOwner 返回注册者，验证 SDK 不误用 ownerOf。
    const { registry, readContract } = makeLegacyRegistry({ 1: OWNER_A })
    const agents = await registry.getAllAgents()
    expect(agents[0].owner).toBe(OWNER_A)
    expect(readContract.mock.calls.map((c) => c[0].functionName)).not.toContain('ownerOf')
  })
})
