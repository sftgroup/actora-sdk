# @actora/sdk v0.15.2

**去中心化 AI Agent 平台 SDK** —— 链上铸造 / 订阅 / 支付（多链）+ 托管对话（REST/SSE）+ 多链中心化市场，面向 B 端（合作伙伴）接入。

```
Agent = Prompt + Skills + MCP
```

一个 Agent 就是一枚链上 NFT：`Prompt`（系统提示词）+ `Skills`（可执行工具）+ `MCP`（远程工具连接），加密存放在 IPFS，通过 `AgentRegistry` 铸造、`SubscriptionManager` 订阅、`ConversationClient` 托管对话。B 端只需一个 `actora_...` API Key 即可接入，无需自建钱包基础设施。

---

## 1. 支持的多链市场

| 链 | chainId | IdentityRegistry | SubscriptionManager | 原生代币 | RPC |
|----|---------|------------------|---------------------|----------|-----|
| OxaChain L1 | 19505 | `0xbf5F9db266c8c97E3334466C88597Eb758AfE212` | `0x019AC9d945467478Dd371CDbD70cb2f325800E6B` | OXA | `https://rpc-oxa.0xainet.top` |
| BSC | 56 | `0xeF96D883e1082E3e102d925c8190A13EEC1ffF33` | `0x6f18Aa693e5062Ef98bBA5A865F225f2e652DF6b` | BNB | `https://bsc-rpc.publicnode.com` |
| Ethereum | 1 | `0xb38BC382aA438F8B4f0BFA902041330Bc14DD02e` | `0x7b4002a416E9c0cA68d7dEDc6c734CFab4D396FE` | ETH | `https://ethereum-rpc.publicnode.com` |
| Base | 8453 | `0x37f3919D64d648ddF70747e159fd9A1c6890CA3b` | `0x0f129e8C31Dd7642cd7e852fBf682fCb75104b29` | ETH | `https://base-rpc.publicnode.com` |
| Sepolia 测试网 | 11155111 | `0xe94ad380d3F8d08a7590eda0C84f354a93F96e5F` | `0xC15fE80b9d800abb72121F353a6ae6d6E9077E63` | ETH | 自备（Alchemy/Infura 等） |

> ⚠️ **地址来源**：上表全部取自 `KNOWN_CHAINS[chainId]`（`src/config/config.ts`）。**生产环境请优先从 `KNOWN_CHAINS[chainId].contracts.identityRegistry / subscriptionManager` 读取，避免硬编码**——合约地址可能随部署修正而更新。

### 链选择指引

- **B 端优先 Base / Ethereum**：Gas 便宜或生态成熟，原生币即 ETH；
- **测试联调用 Sepolia**：无真实资金风险；
- **OxaChain L1 为主链**：平台默认支付/验证链（`SubscriptionPayments` 的 `chain` 参数默认 `'oxachain'`）；
- 每链的 `SubscriptionManager` 独立托管各自链上的订阅计划与资金，**订阅与铸造必须在同一链上完成**（`agentId` 是链内 ID）。

### RPC 注意事项

- `eth_call` / 事件监听：publicnode 即可（上面 BSC/ETH/Base 的 RPC）；
- `getTransactionReceipt`（archive 查询）在 publicnode 会 **403**，需换带 archive 的 RPC：
  - BSC：`https://1rpc.io/bnb`
  - Base：`https://mainnet.base.org`

---

## 2. 安装

```bash
npm install @actora/sdk
# 或锁定版本
npm install @actora/sdk@0.15.2
```

> 包内含 `examples/`（B 端可运行样例），安装后可从 `node_modules/@actora/sdk/examples/` 查看。

### Peer Dependencies（均为 optional）

| 包 | 版本 | 用途 |
|----|------|------|
| `react` | ^18 或 ^19 | React hooks（`@actora/sdk/react`） |
| `wagmi` | ^2.0 | React hooks 内部 |
| `@tanstack/react-query` | ^5.0 | React hooks 内部 |

> **`viem`（^2.0）不是 peer dependency**：仅链上模块（`AgentRegistry` / `SubscriptionManager` / `A2AProtocol` 等）需要 viem 的 `PublicClient` / `WalletClient`，使用时请自行安装；纯 REST 客户端（`ConversationClient` / `CentralAgentClient` / `BillingClient` 等）完全不需要。仓库内可运行示例见 `examples/`（viem 已在 devDependencies 中）。

---

## 3. 快速开始 —— B 端典型接入流程

完整可运行脚本见 `examples/mint-and-subscribe.mjs`。下面按步骤说明。

### a. 连接钱包（viem）

```ts
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { KNOWN_CHAINS } from '@actora/sdk'

const chainId = 8453 // Base —— 用 KNOWN_CHAINS 选链
const cfg = KNOWN_CHAINS[chainId]
const chain = {
  id: cfg.chainId,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
}

const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`) // 服务端私钥；浏览器用 window.ethereum 注入
const publicClient = createPublicClient({ chain, transport: http(cfg.rpcUrl) })
const walletClient = createWalletClient({ account, chain, transport: http(cfg.rpcUrl) })
```

### b. 铸造 Agent（AgentRegistry）

```ts
import { AgentRegistry } from '@actora/sdk'

const registry = new AgentRegistry({
  contractAddress: cfg.contracts.identityRegistry,
  publicClient,
  walletClient,
})

// 简单铸造：仅 tokenURI
const { agentId, txHash } = await registry.registerSimple('ipfs://Qm...')

// 完整铸造：tokenURI + 链上元数据（加密载荷 CID / ECIES 公钥等）
const { agentId } = await registry.register('ipfs://Qm...', [
  { key: 'encryptedPayloadCid', value: encryptedCid },
  { key: 'eciesEncryptedKey', value: eciesEncryptedKeyHex },
])
```

### c. 创建订阅计划（SubscriptionManager）

```ts
import { SubscriptionManager } from '@actora/sdk'
import { parseEther } from 'viem' // 价格单位工具来自 viem

const sub = new SubscriptionManager({
  contractAddress: cfg.contracts.subscriptionManager,
  publicClient,
  walletClient,
})

const { planId, txHash } = await sub.createPlan({
  agentId,
  price: parseEther('0.01'),          // 原生币 wei；ERC20 计划则填代币最小单位
  period: 'month',                     // 'day' | 'week' | 'month' | 'year'
  // payToken: '0x...',                // 默认 address(0) = 原生币
  // trialDays: 3,                     // 0–30，默认 0
})
```

### d. 订阅（SubscriptionManager.subscribe 或 SubscriptionPayments.pay）

链上原生币订阅（自动按 plan.price 支付；ERC20 计划自动 approve）：

```ts
const result = await sub.subscribe(planId)
// → { subscriptionId, txHash, subscriber, agentId, expiresAt }
```

统一支付入口（三条支付轨道，B 端常用）：

```ts
import { SubscriptionPayments } from '@actora/sdk'

// 轨道 1：chain —— 走链上 SubscriptionManager
const payments = new SubscriptionPayments({
  subscriptionManager: sub,
  chain: 'base',                       // 验证链
})
const res = await payments.pay({ method: 'chain', planId, agentId })
// → { method: 'chain', subscriptionId, txHash }

// 轨道 2：fiat —— Stripe 卡支付，无需钱包（需 gatewayUrl）
const payments2 = new SubscriptionPayments({ gatewayUrl: 'https://actora.codes' })
const { sessionUrl } = await payments2.pay({
  method: 'fiat',
  planId,
  agentId,
  subscriber: '0x...',                // 买家钱包
  successUrl: 'https://your-app.com/success',
  cancelUrl: 'https://your-app.com/cancel',
})

// 轨道 3：x402 —— 原生币按期支付（自动代付需 walletClient + subscriptionManager 读价格；
// 也可自己先发送原生币到平台 payTo 后传 txHash）
const payments3 = new SubscriptionPayments({
  gatewayUrl: 'https://actora.codes',
  subscriptionManager: sub,          // 读取计划价格（priceWei）
  walletClient,                      // 自动把原生币转到平台 payTo 钱包
  chain: 'base',
})
const res3 = await payments3.pay({ method: 'x402', planId, agentId, subscriber: '0x...', period: 'month' })
// → { method: 'x402', subscriptionId, txHash, creditedWei }
```

### e. 与 Agent 对话（ConversationClient）

B 端只需 **tenant API Key（`actora_...`）**，无需钱包：

```ts
import { ConversationClient } from '@actora/sdk'

const conv = new ConversationClient({
  gatewayUrl: 'https://actora.codes',
  apiKey: 'actora_your_tenant_key',    // X-Api-Key；与 accessToken(JWT) 二选一
  endUserId: 'user-123',               // X-End-User-Id：租户内最终用户的记忆隔离维度
  // llmApiKey: 'sk-...',              // BYOK：用自己的 LLM Key，不计入平台配额
  // llmEndpoint: 'https://api.deepseek.com/v1',
  // llmModel: 'deepseek-chat',
})

// 单轮对话（内部就是 stream 聚合）
const res = await conv.chat({ agentId, message: '帮我分析这份合约' })
console.log(res.text)

// 流式（SSE，逐事件）
for await (const ev of conv.stream({ agentId, message: '实时输出' })) {
  if (ev.type === 'text') process.stdout.write(ev.content ?? '')
  if (ev.type === 'done') console.log('\n[done]', ev.usage)
}
```

**鉴权 / 隔离语义**：
- `X-Api-Key: actora_...` —— 租户级鉴权（注册后签发）；
- `Authorization: Bearer <jwt>` —— 钱包签名登录的 JWT，与 apiKey 二选一；
- `X-End-User-Id` —— 租户内**按最终用户隔离记忆**；若传 `0x<wallet>`，网关会额外做**订阅代理鉴权**（该钱包的订阅/所有权决定访问权）；
- BYOK：`llmApiKey` / `llmEndpoint` / `llmModel` 三个头，运行时用自己的 Key（`llmSource: 'byok'` 不计费）。

---

## 4. 多链指南

### 如何切链

所有链上模块（`AgentRegistry` / `SubscriptionManager` / `A2AProtocol`）都接收 `{ contractAddress, publicClient, walletClient }`——**换链 = 换一组配置**：

```ts
function makeChainClients(chainId: number) {
  const cfg = KNOWN_CHAINS[chainId]
  if (!cfg) throw new Error(`unsupported chain ${chainId}`)
  const publicClient = createPublicClient({ chain: chainById(chainId), transport: http(cfg.rpcUrl) })
  const walletClient = createWalletClient({ account, chain: chainById(chainId), transport: http(cfg.rpcUrl) })
  return { cfg, publicClient, walletClient }
}
```

### 价格单位

- 原生币计划：`price` 为该链原生代币的 wei（OXA / BNB / ETH）；
- ERC20 计划：`price` 为代币最小单位（如 USDT 的 1e6 分之一）；
- 跨链比较价格时统一用 `getPlan(planId).price` + `plan.payToken` 判断计价币种；
- 中心化 Agent 的价格以 `priceWei` 字符串返回（见 `CentralPlan`），避免 JS 精度丢失。

### 合约地址获取（不要硬编码）

```ts
import { KNOWN_CHAINS } from '@actora/sdk'
const base = KNOWN_CHAINS[8453]
const registryAddr = base.contracts.identityRegistry
const subManagerAddr = base.contracts.subscriptionManager
```

---

## 5. 模块参考

### 5.1 AgentRegistry —— 链上铸造 / 查询

- **用途**：封装 IdentityRegistry 合约，Agent NFT 的铸造与只读查询。
- **构造**：`new AgentRegistry({ contractAddress, publicClient, walletClient })`
- **关键方法**：

| 方法 | 说明 |
|------|------|
| `register(tokenURI, metadata[], valueWei?)` | 铸造 + 链上元数据（key/value 对），返回 `{ agentId, txHash }` |
| `registerSimple(tokenURI?, valueWei?)` | 仅 tokenURI 铸造，返回 `{ agentId, txHash }` |
| `getAgentsByOwner(owner)` | 某地址拥有的全部 agentId |
| `getCurrentAgentId()` / `totalAgents()` | 当前计数 / 总铸造数 |
| `agentExists(agentId)` | 是否存在 |
| `tokenURI(agentId)` / `getAttributes(agentId)` | 读 tokenURI / 元数据键值对 |
| `getAgentMetadata(agentId)` | 结构化元数据（name/capabilities/encryptedPayloadCid 等） |
| `getAllAgents(opts?)` | 批量扫描（`fromId`/`toId`/`activeOnly`/`capabilities`/`batchSize`），返回 `AgentSummary[]` |

```ts
const { agentId } = await registry.registerSimple('ipfs://QmX...')
const owners = await registry.getAgentsByOwner(account.address)
const meta = await registry.getAgentMetadata(agentId) // { name, description, capabilities, encryptedPayloadCid, ... }
```

### 5.2 SubscriptionManager —— 链上计划 / 订阅 / 退款

- **用途**：封装 SubscriptionManager v2（托管 escrow、平台费、多币种）。
- **构造**：`new SubscriptionManager({ contractAddress, publicClient, walletClient })`
- **关键方法**：`getPlatformFeeBps()`、`isTokenWhitelisted(token)`、`getPlan(planId)`、`createPlan(CreatePlanParams)`、`createPlanAndSubscribe(params)`、`subscribe(planId, opts?)`、`releaseFunds(subscriptionId)`、`cancel(subscriptionId)`、`hasActiveSubscription(subscriber, agentId)`、`getSubscription(subscriber, agentId)`、`getSubscriptionDetail(subscriptionId)`、`getUserSubscriptions(user)`
- **`CreatePlanParams`**：`{ agentId, price: bigint, period: 'day'|'week'|'month'|'year', payToken? = ZERO_ADDRESS, trialDays? = 0 }`（trialDays 0–30）
- 常量：`ZERO_ADDRESS`（= 原生币）、`SUBSCRIPTION_PERIODS`

```ts
const { planId } = await sub.createPlan({ agentId, price: parseEther('0.005'), period: 'week' })
const ok = await sub.hasActiveSubscription(buyer, agentId)  // 网关/服务端鉴权常用
const detail = await sub.getSubscriptionDetail(subscriptionId)
// status: 0=Inactive 1=Active 2=Expired 3=Cancelled（SDK 返回 pending/active/expired/cancelled）
```

### 5.3 SubscriptionPayments —— 统一支付（chain / fiat / x402）

- **用途**：三条支付轨道统一入口。`chain` = 链上 SubscriptionManager；`fiat` = Stripe 卡；`x402` = 原生币按期支付（走网关统一端点）。
- **构造**：`new SubscriptionPayments({ gatewayUrl?, accessToken?, subscriptionManager?, walletClient?, chain? })`
  - `chain` 取值：`'oxachain' | 'sepolia' | 'bsc' | 'ethereum' | 'base'`（默认 `'oxachain'`）
- **关键方法**：`pay(PaySubscriptionInput)`、`hasAccess(agentId, subscriber)`（跨轨道访问检查）、`fetchX402Info()`（x402 发现：price/payTo/network）
- **`PaySubscriptionInput` 字段**（以源码为准）：`planId, agentId, method, subscriber?, valueWei?, approveTokenFirst?, amountCents?, currency?, successUrl?, cancelUrl?, txHash?, priceWei?, period?`
  - `priceWei`：中心化 Agent（无链上计划）时直接指定价格；
  - `amountCents` 省略时网关按链上计划自动计价。

```ts
const payments = new SubscriptionPayments({ gatewayUrl: 'https://actora.codes', chain: 'base' })
const hasAccess = await payments.hasAccess(agentId, '0x...') // true / false
const info = await payments.fetchX402Info()                  // { enabled, priceWei, payTo, network, chain }
```

### 5.4 ConversationClient —— 托管对话（REST/SSE）

- **用途**：托管对话服务客户端（`POST /api/v1/agent/runs`，SSE 流式），支持会话、并行任务、A2A 委派、余额查询。
- **构造**：`new ConversationClient({ gatewayUrl, apiKey?, accessToken?, endUserId?, llmApiKey?, llmEndpoint?, llmModel?, timeoutMs? })`
- **关键方法**：
  - 对话：`chat(params)` → `{ text, toolCalls, clarification?, usage? }`；`stream(params, { signal? })` → SSE 事件（`text | tool_call | tool_result | thinking | done | error | clarification | onchain_approval_required`）
  - 会话/任务：`createSession(params)`、`createTask(params)`（立即返回 `status: 'queued'`，后台执行）、`getTask(taskId)`、`listTasks(sessionId)`、`cancelTask(taskId)`、`getCapabilities()`（`parallelTasks` 开关，关闭时 `createTask` 返回 403 `PARALLEL_TASKS_DISABLED`，应降级为 `chat()`）
  - A2A/计费：`getA2ATaskResult(taskId)`、`retryA2ATask(taskId)`、`getSessionKeyInfo()`、`getBalance()`
- 参数中的 `endUserId` 传 `0x<wallet>` 会触发网关订阅代理鉴权。

```ts
const conv = new ConversationClient({ gatewayUrl, apiKey: 'actora_...', endUserId: '0x...' })
const session = await conv.createSession({ agentId })
const task = await conv.createTask({ sessionId: session.id, agentId, message: '批量处理' })
while (true) {
  const t = await conv.getTask(task.id)
  if (t.status === 'done' || t.status === 'error') break
  await new Promise((r) => setTimeout(r, 1000))
}
```

### 5.5 CentralAgentClient —— 中心化市场（C-6）

- **用途**：中心化 Agent（`source='central'`，负 ID，不上链）的公开查询 + 鉴权管理。订阅计划存在网关 DB（`central_plans`），付费复用 x402 通道（`SubscriptionPayments.pay({ priceWei, period })`）。
- **构造**：`new CentralAgentClient({ baseUrl, accessToken?, apiKey? })`
- **关键方法**：`list(filters?)`、`get(agentId)`、`checkSubscription(subscriber, agentId)`、`mySubscriptions(subscriber)`、`create(input)`、`listMine()`、`update(agentId, input)`、`activate(agentId)` / `deactivate(agentId)`、`createPlan(agentId, input)`、`deactivatePlan(agentId, planId)`
- **`CreateCentralAgentInput`**：`{ name, description?, tags?, capabilities?, skills?, category? }`
- **`CreateCentralPlanInput`**：`{ priceWei: string, period?: 'day'|'week'|'month'|'year' }`（priceWei 为十进制字符串）

```ts
const central = new CentralAgentClient({ baseUrl: 'https://actora.codes', apiKey: 'actora_...' })
const { agents, total } = await central.list({ activeOnly: true, page: 1, pageSize: 20 })
const { agent } = await central.create({ name: '行情分析助手', description: '...', capabilities: ['market-data'] })
const { plan } = await central.createPlan(agent.id, { priceWei: '10000000000000000', period: 'month' })
```

### 5.6 BillingClient / TenantPlanPayments / AgentWalletConfig / A2AClient / PeriodClient

| 类 | 用途 | 构造 | 关键方法 |
|----|------|------|----------|
| `BillingClient` | B 端余额预检（x402 台账，委托前判断余额是否够按次付费） | `{ gatewayUrl, apiKey?, accessToken?, endUserId? }` | `getBalance({ endUserId? })` → `{ balance, balanceWei, currency: 'OXA', subject, payTo?, priceWei? }` |
| `TenantPlanPayments` | 购买平台订阅档位（`purpose='tenant-plan'`，绑定租户配额） | `{ gatewayUrl, accessToken?, chain? }` | `buy({ tenantPlanId, subscriber, method, txHash?, successUrl?, cancelUrl? })` |
| `AgentWalletConfig` | agent 自主 MPC 钱包管理（A2A 按次付费自动代付） | `{ baseUrl, adminKey? \| apiKey? }` | `bindWallet(...)`、`authorizePaymentSession(...)`、`status(agentId)`、`list()`、`unbind(agentId)` |
| `A2AClient` | a2a-pay 支付意图两段式（create → pay → settle） | `{ baseUrl, accessToken? }`（`ClientOptions`） | `create({ payer, amountWei, payee?, chain?, metadata? })`、`settle({ paymentId, txHash, chain? })` |
| `PeriodClient` | 周期授权（P4）：按周期扣款/读状态 | `{ baseUrl, accessToken? }`（`ClientOptions`） | `charge(authorizationId)`、`authorization(authorizationId)` |

```ts
// BillingClient —— 委托前预检
const billing = new BillingClient({ gatewayUrl, apiKey: 'actora_...' })
const { balanceWei, priceWei } = await billing.getBalance()
if (priceWei && BigInt(balanceWei) < BigInt(priceWei)) {
  // 提示充值：向 balance.payTo 转原生币
}
```

### 5.7 A2AProtocol —— 链上 A2A（Agent Card / Task）

- **用途**：封装 A2AProtocolRegistry：Agent Card（能力声明）、Skill 注册、Task 生命周期。
- **构造**：`new A2AProtocol({ contractAddress, publicClient, walletClient })`
- **关键方法**：`createAgentCard(agentId, card)`、`getAgentCard(agentId)`、`createTask(agentId, taskType, input)`、`completeTask(taskId, output, status?)`、`getTask(taskId)`、`getUserTasks(user)`、`getAgentTasks(agentId)`
- 相关：`ConversationClient.getA2ATaskResult / retryA2ATask`（网关侧 A2A 委派结果）；`A2AClient`（a2a-pay 支付）。

### 5.8 IPFSUploader —— IPFS 上传

- **用途**：Pinata（JWT）/ 自定义端点上传 JSON / 文件 / 加密载荷。
- **构造**：`new IPFSUploader({ pinataJwt?, customEndpoint?, customApiKey?, gatewayUrl?, timeoutMs?, pinataGroupId?, namePrefix? })`
- **关键方法**：`uploadJSON(data, metadata?)`、`uploadFile(content, fileName?, mimeType?)`、`uploadEncryptedPayload(payload, agentName?)`、`uploadString(content, name?)`、`getUrl(cid)`、`isConfigured()`
- 上传结果 `{ cid, url, raw }`。

```ts
const uploader = new IPFSUploader({ pinataJwt: process.env.PINATA_JWT })
const { cid, url } = await uploader.uploadJSON({ name: 'my-agent', capabilities: ['web'] })
```

### 5.9 MCPConnector —— MCP 远程工具

- **用途**：最小 MCP 客户端（HTTP/SSE），用于 Closed Skill 的远程执行。
- **构造**：`new MCPConnector({ url, transport?, authHeader?, timeoutMs?, subscriberAddress?, signature?, timestamp? })`（或 `MCPConnector.fromAgent(mcp, opts?)`）
- **关键方法**：`listTools()` → `MCPTool[]`、`callTool(name, args?)` → `MCPCallResult`、`listResources()`、`readResource(uri)`

```ts
const mcp = new MCPConnector({ url: 'https://mcp.example.com', authHeader: 'Bearer xxx' })
const tools = await mcp.listTools()
const out = await mcp.callTool('fetch_price', { symbol: 'ETH' })
```

### 5.10 AgentRunner + AgentLoop —— 本地运行 Agent

- **`AgentRunner`**：加载 + 解密 Agent（订阅校验 → IPFS 拉取 → ECIES 解包 AES Key → AES-256-GCM 解包 prompt/skills）。构造 `new AgentRunner({ reader, wallet, ipfsFetcher?, ipfsGateways? })`，`reader` 实现 `OnChainReader`（getTokenURI/getAttributes/hasActiveSubscription），`wallet` 实现 `WalletSigner`（signMessage/getAddress/getPrivateKey?）。核心方法 `useAgent(agentId)` → `{ prompt, skills, mcp, subscriptionExpiry }`。
- **`AgentLoop`**：ReAct 风格循环（Think → Tool Call → Execute → …）。构造 `new AgentLoop({ ctx, llmProvider, maxIterations?, timeoutMs?, memory?, trace?, contextBudget?, onTextDelta?, onToolCall?, onToolResult?, onThinking?, onComplete?, onError? })`，`llmProvider` 实现 `LLMProvider.chatStream(request, signal?)`。核心方法 `run(userMessage, history?)` → `AgentLoopResult`、`abort()`。

```ts
const runner = new AgentRunner({ reader, wallet })   // reader/wallet 由 viem/wagmi 实现
const ctx = await runner.useAgent(agentId)           // 需当前钱包已订阅该 agent
const loop = new AgentLoop({
  ctx,
  llmProvider,                                       // 任意 OpenAI 兼容 provider
  maxIterations: 5,
  onTextDelta: (d) => process.stdout.write(d),
})
const { finalText } = await loop.run('帮我做这件事')
```

> B 端通常不需要自建 Runner/Loop——托管对话（`ConversationClient`）已覆盖；Runner/Loop 适合自托管、完全掌控加密与执行的场景。

### 5.11 加密核心（crypto）

- **`aesEncrypt(plaintext, keyHex)` / `aesDecrypt(encryptedBase64, keyHex)`** —— AES-256-GCM（线格式 `base64(IV[12]||ct||tag[16])`）
- **`eciesEncrypt(dataHex, publicKey)` / `eciesDecrypt(dataHex, privateKey)`** —— ECIES（secp256k1，与 eciesjs 兼容）
- **`generateKeyPair()`** → `{ privateKey, publicKey }`；**`getPublicKey(privateKey)`**
- **`generateAesKey()`**；高级封装：`encryptPayload / decryptPayload / packAgentForPublish / publishAgent / unpackAgent`

```ts
import { generateKeyPair, aesEncrypt, aesDecrypt, eciesEncrypt, eciesDecrypt } from '@actora/sdk'
const { privateKey, publicKey } = generateKeyPair()
const enc = eciesEncrypt('my-aes-key-hex', publicKey)
const dec = eciesDecrypt(enc, privateKey) // 'my-aes-key-hex'
const c = aesEncrypt('hello', '00'.repeat(32))
aesDecrypt(c, '00'.repeat(32))            // 'hello'
```

---

## 6. 中心化（Central）vs 链上（On-chain）市场对比

| 维度 | 链上（On-chain） | 中心化（Central） |
|------|------------------|-------------------|
| Agent 载体 | 链上 NFT（`AgentRegistry` 铸造，正 ID） | 网关 DB 记录（`source='central'`，负 ID） |
| 订阅计划 | `SubscriptionManager.createPlan`（链上合约） | `CentralAgentClient.createPlan`（`central_plans` 表） |
| 付费 | `subscribe`（原生币/ERC20，托管 escrow） | `SubscriptionPayments.pay({ method: 'x402', priceWei })` 或 fiat |
| 鉴权判定 | 链上 `hasActiveSubscription` | 网关 `checkSubscription`（`fiat_subscriptions`） |
| 适用场景 | 需要公开可验证、用户自持钱包、跨平台互操作 | 平台自己建 Agent、快速上架、无需用户钱包的 B 端 |

**流程差异**：链上 Agent 的用户必须「铸造者/订阅者」都有钱包且在同一链；中心化 Agent 的订阅方无需钱包（fiat 卡付），B 端拿到 `planId` + `priceWei` 直接调统一支付即可。

---

## 7. B 端常见问题（FAQ）

### 鉴权方式对照表

| 场景 | 头 | 适用客户端 |
|------|-----|-----------|
| 租户 API Key（推荐 B 端） | `X-Api-Key: actora_...` | `ConversationClient` / `BillingClient` / `CentralAgentClient`（发布管理） |
| 钱包签名 JWT | `Authorization: Bearer <jwt>` | 同上（`accessToken` 字段） |
| 平台管理员 | `X-Admin-Key: <ADMIN_KEY>` | `AgentWalletConfig`（平台全量作用域） |
| 钱包/私钥（链上交易） | 无头，viem `WalletClient` 签名 | `AgentRegistry` / `SubscriptionManager` / `A2AProtocol` |

> `ConversationClient` 必须二选一提供 `apiKey` 或 `accessToken`，否则构造后请求即抛错。

### archive RPC 的坑

- `eth_call`（读合约）与事件订阅用 publicnode 免费 RPC 即可；
- `getTransactionReceipt`（历史交易收据 / archive 查询）在 publicnode 返回 **403**；
- 换用：BSC → `https://1rpc.io/bnb`；Base → `https://mainnet.base.org`。

### nonce 缓存 / 交易重试的坑

- viem `WalletClient` 默认本地缓存 nonce，**并发或失败重试**时可能复用已用 nonce 导致 `nonce too low`；
- 串行执行交易并等待 `waitForTransactionReceipt`；失败重试前调用 `publicClient.reset()` 或在 `sendTransaction`/`writeContract` 显式传 `nonce: await publicClient.getTransactionCount({ address })`。

### 其他

- `agentId` 是**链内 ID**：跨链不通用，切链后需重新铸造/订阅；
- `SubscriptionPayments.hasAccess` 需要 `gatewayUrl`；`method: 'chain'` 需要 config 里的 `subscriptionManager`；
- 中心化 Agent 的计划价格是 `priceWei` 字符串，传给 `pay({ priceWei })` 时保持字符串避免精度丢失；
- `AgentRunner.useAgent` 需要钱包支持 `getPrivateKey()`（ECIES 解密用），浏览器环境可用 wagmi 封装。

---

## 8. 版本记录

| 版本 | 要点 |
|------|------|
| 0.12.0+ | **BSC 多链**：`KNOWN_CHAINS` 增加 chainId 56（BSC 主网，Agent 市场开通），链上模块全链通用 |
| 0.13.0 | **ETH / Base 预留**：`KNOWN_CHAINS` 增加 1 / 8453 占位条目（合约未部署） |
| 0.14.0 | **ETH 开通**：Ethereum 主网合约部署（SubscriptionManager block 25992521） |
| 0.15.0 | **Base 开通**：Base 主网合约部署（SubscriptionManager block 51401326） |
| 0.15.1 | **Base 地址修正**：按 `broadcast/DeployBase.s.sol/8453/run-latest.json` 的 contractName 映射修正 Base 合约地址（SubscriptionManager 修正为 `0x0f129e...`） |
| 0.15.2 | **B 端接入文档/样例**：README 彻底重写（多链市场、接入全流程、模块参考、FAQ）；`examples/` 随包发布（`mint-and-subscribe` / `conversation-bend` / `central-agent-bend`） |

---

## 附录：可运行示例

见 [`examples/`](./examples/README.md)：

- `examples/mint-and-subscribe.mjs` —— 链上完整流程（选链 → 铸造 → 建计划 → 订阅 → 验证）
- `examples/conversation-bend.mjs` —— B 端托管对话（chat + stream，BYOK）
- `examples/central-agent-bend.mjs` —— 中心化市场（list / create / createPlan）
