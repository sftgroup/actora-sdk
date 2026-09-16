#!/usr/bin/env node
/**
 * central-agent-bend.mjs —— 中心化市场 B 端示例（CentralAgentClient）
 *
 * 展示：list（公开只读）+ create / createPlan（鉴权管理，需 apiKey）
 *
 * 运行前提：
 *   1. 在 sdk 包目录内运行（node_modules 可用），且已执行过 `npm run build`
 *   2. 环境变量：
 *      - GATEWAY_URL     网关地址（默认 https://actora.codes）
 *      - ACTORA_API_KEY  租户 API Key（actora_...；发布 create/createPlan 需要）
 *   3. list / get / checkSubscription / mySubscriptions 是网关公开只读端点，
 *      不带 apiKey 也能查询；create / listMine / update / createPlan 等需鉴权。
 *
 * 运行：node examples/central-agent-bend.mjs
 */
import { CentralAgentClient } from '@actora/sdk'

const baseUrl = process.env.GATEWAY_URL ?? 'https://actora.codes'
const apiKey = process.env.ACTORA_API_KEY

const central = new CentralAgentClient({ baseUrl, apiKey })
console.log(`网关：${baseUrl}  apiKey=${apiKey ? '已设置' : '未设置'}`)

// ── 1. 公开只读：列表 ────────────────────────────────────────────────────
console.log('\n=== list（公开） ===')
const { agents, total, page } = await central.list({ activeOnly: true, page: 1, pageSize: 5 })
console.log(`共 ${total} 个中心化 Agent（当前页 ${page}，返回 ${agents.length} 条）`)
for (const a of agents.slice(0, 3)) {
  console.log(`  #${a.id} ${a.name}  category=${a.category || '-'}  plans=${a.subscriptionPlans?.length ?? 0}`)
}

// ── 2. 鉴权管理：发布 + 添加计划 ─────────────────────────────────────────
if (!apiKey) {
  console.log('\n（未设置 ACTORA_API_KEY，跳过 create / createPlan 等管理操作）')
  process.exit(0)
}

console.log('\n=== create（发布中心化 Agent，需 apiKey） ===')
const { agent } = await central.create({
  name: `示例助手-${Date.now()}`,
  description: '由 examples/central-agent-bend.mjs 创建',
  capabilities: ['demo'],
  tags: ['demo'],
  category: 'tool',
})
console.log(`  agentId=${agent.id}  name=${agent.name}`)

console.log('\n=== createPlan（添加订阅计划，priceWei 为十进制字符串） ===')
const { plan } = await central.createPlan(agent.id, {
  priceWei: '10000000000000000', // 0.01 原生代币 wei
  period: 'month',
})
console.log(`  planId=${plan.id}  priceWei=${plan.priceWei}  period=${plan.period}  active=${plan.active}`)

console.log('\n=== listMine（名下中心化 Agent） ===')
const { agents: mine } = await central.listMine()
console.log(`  共 ${mine.length} 个：${mine.map((a) => `#${a.id}`).join(', ') || '（无）'}`)

console.log('\n✅ 完成')
