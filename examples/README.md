# examples —— @actora/sdk 可运行示例

三个 `.mjs`（纯 JS ESM）脚本，覆盖 B 端典型接入场景。**不参与 tsc 编译**（`tsconfig.json` 只 include `src/**/*`），不影响 `npm run build`。

## 公共前提

1. 在 sdk 包目录内运行（需要 `node_modules` 可用）；
2. 已执行过 `npm run build`（示例通过包自引用 `import ... from '@actora/sdk'` 解析到 `dist/`，未构建会报 `Cannot find package`）；
3. 链上示例（`mint-and-subscribe.mjs`）还需要 `viem`（SDK 的 devDependencies，仓库内已装）。

## 1. mint-and-subscribe.mjs —— 链上完整流程

读 `KNOWN_CHAINS` 选链（默认 Base）→ viem 客户端 → `AgentRegistry.registerSimple` 铸造 → `SubscriptionManager.createPlan` 建计划 → `subscribe` 订阅 → `hasActiveSubscription` 验证。

```bash
export PRIVATE_KEY=0x...            # 必填：铸造/订阅钱包私钥
export CHAIN_ID=8453                # 可选：默认 8453（Base）；19505/56/1/8453/11155111
node examples/mint-and-subscribe.mjs
```

注意事项：
- 钱包需持有该链原生代币（订阅费 + Gas）；
- RPC / 合约地址自动从 `KNOWN_CHAINS` 读取，生产勿硬编码；
- Sepolia（11155111）在 `KNOWN_CHAINS` 中没有 `rpcUrl`，需自行补充或改用其他链；
- 生产环境 `registerSimple` 应传 `ipfs://` 元数据 URI（示例演示传空串）。

## 2. conversation-bend.mjs —— B 端托管对话

纯 REST 客户端（无需 viem / 钱包）。`chat` 单轮 + `stream` 流式 SSE 事件遍历，支持 BYOK。

```bash
export GATEWAY_URL=https://actora.codes   # 可选，默认同上
export ACTORA_API_KEY=actora_...          # 必填：租户 API Key（X-Api-Key）
export AGENT_ID=42                        # 必填：目标 Agent ID
export END_USER_ID=demo-user-001          # 可选：最终用户 ID（传 0x<wallet> 触发订阅代理鉴权）
export LLM_API_KEY=sk-...                 # 可选：BYOK，用自己的 LLM Key
export LLM_ENDPOINT=https://api.deepseek.com/v1   # 可选
export LLM_MODEL=deepseek-chat            # 可选
node examples/conversation-bend.mjs
```

## 3. central-agent-bend.mjs —— 中心化市场 B 端

`list`（公开只读）+ `create` / `createPlan` / `listMine`（鉴权管理）。

```bash
export GATEWAY_URL=https://actora.codes   # 可选，默认同上
export ACTORA_API_KEY=actora_...          # 发布管理需要；仅查询可不设
node examples/central-agent-bend.mjs
```

## 环境变量汇总

| 变量 | 适用脚本 | 必填 | 说明 |
|------|----------|------|------|
| `PRIVATE_KEY` | mint-and-subscribe | ✅ | 钱包私钥（0x 前缀可选） |
| `CHAIN_ID` | mint-and-subscribe | - | 默认 8453 |
| `GATEWAY_URL` | conversation / central | - | 默认 `https://actora.codes` |
| `ACTORA_API_KEY` | conversation / central | conversation ✅ | 租户 API Key（`actora_...`） |
| `AGENT_ID` | conversation | ✅ | 目标 Agent ID |
| `END_USER_ID` | conversation | - | 默认 `demo-user-001` |
| `LLM_API_KEY` / `LLM_ENDPOINT` / `LLM_MODEL` | conversation | - | BYOK |
