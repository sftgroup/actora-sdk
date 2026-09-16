#!/usr/bin/env node
/**
 * conversation-bend.mjs —— B 端托管对话示例（ConversationClient）
 *
 * 展示：chat 单轮对话 + stream 流式 SSE 事件遍历（BYOK 可选）
 *
 * 运行前提：
 *   1. 在 sdk 包目录内运行（node_modules 可用），且已执行过 `npm run build`
 *   2. 环境变量：
 *      - GATEWAY_URL     网关地址（默认 https://actora.codes）
 *      - ACTORA_API_KEY  租户 API Key（actora_...，必填；X-Api-Key）
 *      - AGENT_ID        目标 Agent ID（必填）
 *      - END_USER_ID     最终用户 ID（默认 demo-user-001，X-End-User-Id 记忆隔离；
 *                        传 0x<wallet> 会触发网关订阅代理鉴权）
 *      - LLM_API_KEY    （可选）BYOK：用自己的 LLM Key，不计入平台配额
 *      - LLM_ENDPOINT   （可选）如 https://api.deepseek.com/v1
 *      - LLM_MODEL      （可选）如 deepseek-chat
 *   3. 本脚本是纯 REST 客户端，不需要 viem / 钱包。
 *
 * 运行：node examples/conversation-bend.mjs
 */
import { ConversationClient } from '@actora/sdk'

const gatewayUrl = process.env.GATEWAY_URL ?? 'https://actora.codes'
const apiKey = process.env.ACTORA_API_KEY
const endUserId = process.env.END_USER_ID ?? 'demo-user-001'
const agentId = Number(process.env.AGENT_ID ?? 0)

if (!apiKey) {
  console.error('缺少环境变量 ACTORA_API_KEY（actora_...）')
  process.exit(1)
}
if (!agentId) {
  console.error('缺少环境变量 AGENT_ID')
  process.exit(1)
}

const conv = new ConversationClient({
  gatewayUrl,
  apiKey,
  endUserId,
  ...(process.env.LLM_API_KEY ? { llmApiKey: process.env.LLM_API_KEY } : {}),
  ...(process.env.LLM_ENDPOINT ? { llmEndpoint: process.env.LLM_ENDPOINT } : {}),
  ...(process.env.LLM_MODEL ? { llmModel: process.env.LLM_MODEL } : {}),
})
console.log(`网关：${gatewayUrl}  endUserId=${endUserId}  agentId=${agentId}`)

// ── 1. chat：单轮对话（内部即 stream 聚合） ──────────────────────────────
console.log('\n=== chat（单轮） ===')
const res = await conv.chat({ agentId, message: '你好，简单介绍一下你自己' })
console.log(res.text)
if (res.toolCalls?.length) {
  console.log('工具调用：', res.toolCalls.map((t) => t.name).join(', '))
}

// ── 2. stream：SSE 流式事件遍历 ──────────────────────────────────────────
console.log('\n=== stream（流式） ===')
let text = ''
for await (const ev of conv.stream({ agentId, message: '请分点输出你的能力清单' })) {
  switch (ev.type) {
    case 'text':
      process.stdout.write(ev.content ?? '')
      text += ev.content ?? ''
      break
    case 'tool_call':
      console.log(`\n[工具调用] ${ev.toolName}`, JSON.stringify(ev.toolArgs ?? {}))
      break
    case 'tool_result':
      console.log(`\n[工具结果] ${JSON.stringify(ev.toolResult ?? '').slice(0, 200)}`)
      break
    case 'clarification':
      console.log('\n[澄清请求]', ev.question)
      break
    case 'done':
      console.log('\n[done]', 'usage=', ev.usage, 'llmSource=', ev.llmSource)
      break
    case 'error':
      console.error('\n[错误]', ev.error)
      process.exitCode = 1
      break
    default:
      // thinking / onchain_approval_required 等事件
      console.log(`\n[${ev.type}]`, JSON.stringify(ev).slice(0, 200))
  }
}
if (!text) console.log('（无文本输出，请检查 AGENT_ID / 订阅状态）')
console.log('\n✅ 完成')
