// ---------------------------------------------------------------------------
// @actora/sdk — Configuration
// ---------------------------------------------------------------------------
// Wraps ConfigurationRegistry contract for key-value settings.
// ---------------------------------------------------------------------------

import { stringToHex, hexToString } from 'viem'
import type { PublicClient, WalletClient, Address, Hash } from 'viem'

const CONFIG_ABI = {
  setConfig: {
    inputs: [{ name: 'key', type: 'string' }, { name: 'value', type: 'bytes' }] as const,
    name: 'setConfig' as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const,
    type: 'function' as const,
  },
  getConfig: {
    inputs: [{ name: 'key', type: 'string' }] as const,
    name: 'getConfig' as const,
    outputs: [{ name: '', type: 'bytes' }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
  getAllConfig: {
    inputs: [] as const,
    name: 'getAllConfig' as const,
    outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'key', type: 'string' }, { name: 'value', type: 'bytes' }] }] as const,
    stateMutability: 'view' as const,
    type: 'function' as const,
  },
} as const

// ── Known chain configs ────────────────────────────────────────────────────

// Moves these to a separate file when the list grows.

export interface ChainConfig {
  chainId: number
  contracts: {
    identityRegistry: Address
    subscriptionManager: Address
    a2aProtocolRegistry: Address
    reputationRegistry: Address
    configurationRegistry: Address
    multiEndpointRegistry: Address
  }
  ipfsGateways: string[]
  rpcUrl?: string
  /** 合约是否已部署（false = 预留条目，contracts 为占位地址，部署后填写并置 true）。 */
  deployed?: boolean
}

/**
 * 未部署的扩展合约占位地址。
 *
 * ConfigurationRegistry / MultiEndpointRegistry / AgentFactory 默认不再部署
 * （见 DeployCanonicalExtensions.s.sol 的 DEPLOY_CONFIG / DEPLOY_ENDPOINTS 开关），
 * 因此这里必须保持零地址——**不得**继续指向旧版（legacy）合约：旧合约仍在链上，
 * 读到的是陈旧数据，比直接报错更危险。
 * 调用方拿到零地址应视为「该能力未启用」，不要发起 RPC。
 */
const NOT_DEPLOYED: Address = '0x0000000000000000000000000000000000000000'

/**
 * 合约地址表（与 gateway/src/config.ts 的默认值保持一致）。
 *
 * ReputationRegistry 自 2026-10-24 起统一指向官方 canonical 部署
 * `0x8004BAa1…9b63`（三链同地址）；legacy 自研注册表仅剩 Sepolia 测试网。
 * `ReputationRegistry` 适配器会按 `getReputationSummary` 是否存在自动识别
 * legacy / standard 两种实现，故地址切换不需要业务侧改代码。
 */
export const KNOWN_CHAINS: Record<number, ChainConfig> = {
  // Sepolia Testnet
  // v3 (deployed 2026-07-13): platformFee=250bps(2.5%), ReentrancyGuard, audit fixes
  11155111: {
    chainId: 11155111,
    contracts: {
      identityRegistry: '0xe94ad380d3F8d08a7590eda0C84f354a93F96e5F',
      subscriptionManager: '0xC15fE80b9d800abb72121F353a6ae6d6E9077E63',
      a2aProtocolRegistry: '0x309C7447d89f3087A9924BB686d88df020F7e9cB',
      reputationRegistry: '0xeb6B410ea71b8d9dA0c96f6A91d35027CE143DC9',
      configurationRegistry: NOT_DEPLOYED,
      multiEndpointRegistry: NOT_DEPLOYED,
    },
    ipfsGateways: ['ipfs.io', 'gateway.pinata.cloud', 'dweb.link', 'cf-ipfs.com'],
  },

  // BNB Smart Chain (BSC) Mainnet
  // Chain ID 56, EIP-1559, gas token BNB
  // Agent 市场开通 2026-09-17（DeployBsc.s.sol）
  // 付费层 2026-10-24 换代（DeployCanonicalExtensions.s.sol，block 129441669）：
  //   SM / A2A 为新版（订阅即分账），身份层仍绑 legacy identity（未迁移 canonical）。
  // Explorer: https://bscscan.com
  56: {
    chainId: 56,
    contracts: {
      identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      subscriptionManager: '0x5a36150C5865B4dA16218724a1c5668561E4d981',
      a2aProtocolRegistry: '0x97cad48D250C00A394449A5E613773e82b20089D',
      reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
      configurationRegistry: NOT_DEPLOYED,
      multiEndpointRegistry: NOT_DEPLOYED,
    },
    ipfsGateways: ['ipfs.io', 'gateway.pinata.cloud', 'dweb.link', 'cf-ipfs.com'],
    rpcUrl: 'https://bsc-rpc.publicnode.com',
  },

  // ── Ethereum Mainnet — 已开通（付费层 2026-10-24 换代，block 26259798）──
  1: {
    chainId: 1,
    contracts: {
      identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      subscriptionManager: '0xF3D14ac4D51BC4B7354838af3137248476D540BD',
      a2aProtocolRegistry: '0x5a36150C5865B4dA16218724a1c5668561E4d981',
      reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
      configurationRegistry: NOT_DEPLOYED,
      multiEndpointRegistry: NOT_DEPLOYED,
    },
    ipfsGateways: ['ipfs.io', 'gateway.pinata.cloud', 'dweb.link', 'cf-ipfs.com'],
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
  },
  // ── Base — 已开通（付费层 2026-10-24 换代，block 53011518）──
  8453: {
    chainId: 8453,
    contracts: {
      identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      subscriptionManager: '0x41A42cDe1bd7AA39a9beB3745Ae08f50e8656B36',
      a2aProtocolRegistry: '0x88cce24854505e2d3DC8625a0Bf27Cca10f901C1',
      reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
      configurationRegistry: NOT_DEPLOYED,
      multiEndpointRegistry: NOT_DEPLOYED,
    },
    ipfsGateways: ['ipfs.io', 'gateway.pinata.cloud', 'dweb.link', 'cf-ipfs.com'],
    rpcUrl: 'https://base-rpc.publicnode.com',
  },
}

// ── Config Registry ────────────────────────────────────────────────────────

export interface ConfigRegistryOpts {
  contractAddress: Address
  publicClient: PublicClient
  walletClient: WalletClient
}

export class ConfigurationRegistry {
  private address: Address
  private publicClient: PublicClient
  private walletClient: WalletClient

  constructor(opts: ConfigRegistryOpts) {
    this.address = opts.contractAddress
    this.publicClient = opts.publicClient
    this.walletClient = opts.walletClient
  }

  private get account(): Promise<Address> {
    return this.walletClient.getAddresses().then(a => {
      if (!a[0]) throw new Error('Wallet not connected')
      return a[0]
    })
  }

  async set(key: string, value: string): Promise<Hash> {
    const acct = await this.account
    const { request } = await this.publicClient.simulateContract({
      account: acct,
      address: this.address,
      abi: [CONFIG_ABI.setConfig],
      functionName: 'setConfig',
      args: [key, stringToHex(value)],
    })
    return this.walletClient.writeContract(request)
  }

  async get(key: string): Promise<string> {
    const r = await this.publicClient.readContract({
      address: this.address,
      abi: [CONFIG_ABI.getConfig],
      functionName: 'getConfig',
      args: [key],
    })
    return hexToString(r as `0x${string}`)
  }

  async getAll(): Promise<Record<string, string>> {
    const r = await this.publicClient.readContract({
      address: this.address,
      abi: [CONFIG_ABI.getAllConfig],
      functionName: 'getAllConfig',
    })
    const map: Record<string, string> = {}
    for (const { key, value } of r as { key: string; value: string }[]) {
      map[key] = hexToString(value as `0x${string}`)
    }
    return map
  }
}
