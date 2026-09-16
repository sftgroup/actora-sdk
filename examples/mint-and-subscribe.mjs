#!/usr/bin/env node
/**
 * mint-and-subscribe.mjs —— 链上完整接入流程示例（B 端）
 *
 * 流程：读 KNOWN_CHAINS 选链（默认 Base）→ viem 客户端
 *       → AgentRegistry.registerSimple 铸造 → SubscriptionManager.createPlan
 *       → subscribe 订阅 → hasActiveSubscription 验证
 *
 * 运行前提：
 *   1. 在 sdk 包目录内运行（node_modules 可用），且已执行过 `npm run build`
 *      （示例通过包自引用导入 '@actora/sdk'，解析到 dist/）
 *   2. 环境变量：
 *      - PRIVATE_KEY  铸造/订阅钱包私钥（必填，0x 前缀可选）
 *      - CHAIN_ID     目标链 chainId，默认 8453（Base）。
 *                     可用：19505（OxaChain L1）/ 56（BSC）/ 1（Ethereum）/ 8453（Base）/ 11155111（Sepolia）
 *   3. 链的 RPC / 合约地址自动从 KNOWN_CHAINS 读取（生产勿硬编码）。
 *      Sepolia 在 KNOWN_CHAINS 中无 rpcUrl，需在 config.ts 补充或改用其他链。
 *   4. 钱包需持有该链原生代币（支付 0.001 订阅费 + Gas）。
 *
 * 运行：node examples/mint-and-subscribe.mjs
 */
import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { AgentRegistry, SubscriptionManager, KNOWN_CHAINS } from '@actora/sdk'

// ── 配置 ──────────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.PRIVATE_KEY
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 8453)

const CHAIN_META = {
  19505: { name: 'OxaChain L1', symbol: 'OXA' },
  56: { name: 'BNB Smart Chain', symbol: 'BNB' },
  1: { name: 'Ethereum', symbol: 'ETH' },
  8453: { name: 'Base', symbol: 'ETH' },
  11155111: { name: 'Sepolia', symbol: 'ETH' },
}

async function main() {
  if (!PRIVATE_KEY) throw new Error('缺少环境变量 PRIVATE_KEY（钱包私钥）')

  const cfg = KNOWN_CHAINS[CHAIN_ID]
  const meta = CHAIN_META[CHAIN_ID]
  if (!cfg || !meta) throw new Error(`不支持的链 CHAIN_ID=${CHAIN_ID}，可用：${Object.keys(CHAIN_META).join(', ')}`)
  if (!cfg.rpcUrl) throw new Error(`KNOWN_CHAINS[${CHAIN_ID}] 未配置 rpcUrl，请补充后重试`)

  console.log(`\n目标链：${meta.name}（chainId=${CHAIN_ID}）`)
  console.log(`RPC：${cfg.rpcUrl}`)
  console.log(`IdentityRegistry：${cfg.contracts.identityRegistry}`)
  console.log(`SubscriptionManager：${cfg.contracts.subscriptionManager}`)

  // ── 1. viem 客户端（私钥本地签名） ───────────────────────────────────
  const chain = {
    id: cfg.chainId,
    name: meta.name,
    nativeCurrency: { name: meta.name, symbol: meta.symbol, decimals: 18 },
  }
  const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`)
  const publicClient = createPublicClient({ chain, transport: http(cfg.rpcUrl) })
  const walletClient = createWalletClient({ account, chain, transport: http(cfg.rpcUrl) })

  const registry = new AgentRegistry({
    contractAddress: cfg.contracts.identityRegistry,
    publicClient,
    walletClient,
  })
  const sub = new SubscriptionManager({
    contractAddress: cfg.contracts.subscriptionManager,
    publicClient,
    walletClient,
  })

  // ── 2. 铸造 Agent ─────────────────────────────────────────────────────
  console.log('\n[1/4] 铸造 Agent（registerSimple）')
  const { agentId, txHash: mintTx } = await registry.registerSimple('') // 演示用空 tokenURI；生产传 ipfs:// 元数据
  console.log(`  agentId=${agentId}`)
  console.log(`  txHash=${mintTx}`)

  // ── 3. 创建订阅计划 ──────────────────────────────────────────────────
  console.log('\n[2/4] 创建订阅计划（period=month, price=0.001 ' + meta.symbol + '）')
  const { planId, txHash: planTx } = await sub.createPlan({
    agentId,
    price: parseEther('0.001'),
    period: 'month', // 'day' | 'week' | 'month' | 'year'
  })
  console.log(`  planId=${planId}`)
  console.log(`  txHash=${planTx}`)

  // ── 4. 订阅 ──────────────────────────────────────────────────────────
  console.log(`\n[3/4] 订阅（钱包 ${account.address}）`)
  const { subscriptionId, expiresAt } = await sub.subscribe(planId)
  console.log(`  subscriptionId=${subscriptionId}`)
  console.log(`  expiresAt=${new Date(expiresAt * 1000).toISOString()}`)

  // ── 5. 验证 ──────────────────────────────────────────────────────────
  console.log('\n[4/4] 验证 hasActiveSubscription')
  const active = await sub.hasActiveSubscription(account.address, agentId)
  console.log(`  hasActiveSubscription(${account.address}, ${agentId}) = ${active}`)
  if (!active) throw new Error('验证失败：订阅未生效')

  console.log('\n✅ 完整流程成功（铸造 → 建计划 → 订阅 → 验证）')
}

main().catch((err) => {
  console.error('\n❌ 失败：', err.message ?? err)
  process.exit(1)
})
