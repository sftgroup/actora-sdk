// AgentRegistry — 链上属性写入助手单测（skills 公开约定的写入侧）。
// 覆盖：toAttributes 编码规则、overwriteAttributes 整组覆盖、setAttributes 读回+合并
// （保证不会因合约的 delete-then-write 语义抹掉未提及的属性）。
import { describe, it, expect, vi } from 'vitest'
import { AgentRegistry, toAttributes } from '../src/registry/agent-registry'

interface SimulateArgs {
  functionName: string
  args: [bigint, { key: string; value: string }[]]
}

function makeRegistry(current: Record<string, string> = {}) {
  const readContract = vi.fn(async (_req: { functionName: string; args: bigint[] }) =>
    Object.entries(current).map(([key, value]) => ({
      key,
      value: `0x${Buffer.from(value, 'utf8').toString('hex')}`,
    }))
  )
  const simulateContract = vi.fn(async (_req: SimulateArgs) => ({ request: { __sim: true } }))
  const writeContract = vi.fn(async (_req: unknown) => '0xtx')
  const waitForTransactionReceipt = vi.fn(async (_req: { hash: string }) => ({ status: 'success' }))

  const registry = new AgentRegistry({
    contractAddress: '0x0000000000000000000000000000000000000001',
    publicClient: { readContract, simulateContract, waitForTransactionReceipt } as never,
    walletClient: {
      getAddresses: vi.fn(async () => ['0xowner']),
      writeContract,
    } as never,
  })

  return { registry, readContract, simulateContract, writeContract }
}

/** 取 simulateContract 的入参并解码成明文属性对象。 */
function argsOf(simulateContract: ReturnType<typeof makeRegistry>['simulateContract']) {
  const req = simulateContract.mock.calls[0][0]
  const decoded: Record<string, string> = {}
  for (const { key, value } of req.args[1]) {
    decoded[key] = Buffer.from(value.slice(2), 'hex').toString('utf8')
  }
  return { agentId: req.args[0], functionName: req.functionName, attrs: decoded }
}

describe('toAttributes', () => {
  it('字符串原样、对象/数组 JSON 序列化、数字与布尔转字符串', () => {
    const skills = [{ name: 'consult', description: 'd', inputSchema: { type: 'object' } }]
    expect(
      toAttributes({ name: 'A', price_wei: 100, active: true, tags: ['x', 'y'], skills })
    ).toEqual([
      { key: 'name', value: 'A' },
      { key: 'price_wei', value: '100' },
      { key: 'active', value: 'true' },
      { key: 'tags', value: '["x","y"]' },
      { key: 'skills', value: JSON.stringify(skills) },
    ])
  })

  it('undefined / null 的键被跳过', () => {
    expect(toAttributes({ a: 'x', b: undefined, c: null })).toEqual([{ key: 'a', value: 'x' }])
  })
})

describe('AgentRegistry.overwriteAttributes', () => {
  it('整组覆盖：只写入传入的属性（updateMetadata）', async () => {
    const { registry, simulateContract } = makeRegistry({ name: 'old', description: 'old' })

    await registry.overwriteAttributes(7, [{ key: 'skills', value: '[]' }])

    expect(argsOf(simulateContract)).toEqual({
      agentId: 7n,
      functionName: 'updateMetadata',
      attrs: { skills: '[]' },
    })
  })
})

describe('AgentRegistry.setAttributes', () => {
  it('读回现有属性后合并，未提及的键保持原值', async () => {
    const { registry, readContract, simulateContract } = makeRegistry({
      name: 'MyAgent',
      description: 'desc',
      category: 'research',
      encryptedPayloadCid: 'bafy1',
    })

    await registry.setAttributes(7, {
      skills: [{ name: 'consult', inputSchema: { type: 'object' } }],
    })

    // 首次读回会先做一次 flavor 探测（legacy `totalAgents`），真正的属性读取是
    // `getAgentMetadata`；这里只断言属性读取发生了一次。
    expect(readContract.mock.calls.filter((c) => c[0].functionName === 'getAgentMetadata')).toHaveLength(1)
    expect(argsOf(simulateContract).attrs).toEqual({
      name: 'MyAgent',
      description: 'desc',
      category: 'research',
      encryptedPayloadCid: 'bafy1',
      skills: '[{"name":"consult","inputSchema":{"type":"object"}}]',
    })
  })

  it('同名键被覆盖（已存在的 skills 换成新值）', async () => {
    const { registry, simulateContract } = makeRegistry({ skills: '["old"]', name: 'A' })

    await registry.setAttributes(7, { skills: ['new'] })

    expect(argsOf(simulateContract).attrs).toEqual({ skills: '["new"]', name: 'A' })
  })

  it('返回 txHash 并等待回执', async () => {
    const { registry, writeContract } = makeRegistry({ name: 'A' })

    expect(await registry.setAttributes(7, { x: 'y' })).toBe('0xtx')
    expect(writeContract).toHaveBeenCalledTimes(1)
  })
})

// ── canonical ERC-8004 标准（setAgentURI 系列）────────────────────────────────

describe('AgentRegistry — canonical standard (setAgentURI 系列)', () => {
  function makeStdRegistry() {
    const readContract = vi.fn(async (req: { functionName: string }) => {
      switch (req.functionName) {
        case 'getMetadata':
          return '0x68656c6c6f' // "hello"
        case 'getAgentWallet':
        case 'ownerOf':
          return '0x00000000000000000000000000000000000000a1'
        case 'isAuthorizedOrOwner':
          return true
        case 'getVersion':
          return '2.0.0'
        default:
          return null
      }
    })
    const simulateContract = vi.fn(async (_req: unknown) => ({ request: { __sim: true } }))
    const writeContract = vi.fn(async (_req: unknown) => '0xtx')

    const registry = new AgentRegistry({
      contractAddress: '0x0000000000000000000000000000000000000001',
      publicClient: {
        readContract,
        simulateContract,
        waitForTransactionReceipt: vi.fn(async () => ({ status: 'success' })),
      } as never,
      walletClient: {
        getAddresses: vi.fn(async () => ['0xowner']),
        writeContract,
      } as never,
    })

    return { registry, readContract, simulateContract, writeContract }
  }

  it('setAgentURI 以 (agentId, newURI) 调用标准方法', async () => {
    const { registry, simulateContract } = makeStdRegistry()

    expect(await registry.setAgentURI(0, 'ipfs://new')).toBe('0xtx')
    expect(simulateContract.mock.calls[0][0]).toMatchObject({
      functionName: 'setAgentURI',
      args: [0n, 'ipfs://new'],
    })
  })

  it('setMetadata 以 (agentId, key, stringToHex(value)) 调用，值按 UTF-8 编码', async () => {
    const { registry, simulateContract } = makeStdRegistry()

    await registry.setMetadata(3, 'skills', '[{"name":"x"}]')

    const req = simulateContract.mock.calls[0][0] as { functionName: string; args: [bigint, string, string] }
    expect(req.functionName).toBe('setMetadata')
    expect(req.args[0]).toBe(3n)
    expect(req.args[1]).toBe('skills')
    expect(Buffer.from(req.args[2].slice(2), 'hex').toString('utf8')).toBe('[{"name":"x"}]')
  })

  it('setAgentWallet / unsetAgentWallet 走标准 ABI', async () => {
    const { registry, simulateContract } = makeStdRegistry()

    await registry.setAgentWallet(1, '0x00000000000000000000000000000000000000b2', 1_800_000_000, '0xdead')
    expect(simulateContract.mock.calls[0][0]).toMatchObject({
      functionName: 'setAgentWallet',
      args: [1n, '0x00000000000000000000000000000000000000b2', 1_800_000_000n, '0xdead'],
    })

    await registry.unsetAgentWallet(1)
    expect(simulateContract.mock.calls[1][0]).toMatchObject({ functionName: 'unsetAgentWallet', args: [1n] })
  })

  it('getMetadata 把 bytes 解码为 UTF-8 文本', async () => {
    const { registry, readContract } = makeStdRegistry()

    expect(await registry.getMetadata(1, 'name')).toBe('hello')
    expect(readContract.mock.calls[0][0]).toMatchObject({ functionName: 'getMetadata', args: [1n, 'name'] })
  })

  it('getAgentWallet / isAuthorizedOrOwner / getVersion 返回标准读取结果', async () => {
    const { registry } = makeStdRegistry()

    expect(await registry.getAgentWallet(2)).toBe('0x00000000000000000000000000000000000000a1')
    expect(await registry.isAuthorizedOrOwner('0xowner', 2)).toBe(true)
    expect(await registry.getVersion()).toBe('2.0.0')
  })
})
