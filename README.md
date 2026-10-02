# @actora/sdk v0.20.1

**去中心化 AI Agent 平台 SDK** —— 链上铸造 / 订阅 / 支付（多链）+ 托管对话（REST/SSE）+ 多链中心化市场，面向 B 端（合作伙伴）接入。

```
Agent = Prompt + Skills + MCP
```

一个 Agent 就是一枚链上 NFT：`Prompt`（系统提示词）+ `Skills`（可执行工具）+ `MCP`（远程工具连接），加密存放在 IPFS，通过 `AgentRegistry` 铸造、`SubscriptionManager` 订阅、`ConversationClient` 托管对话。B 端只需一个 `actora_...` API Key 即可接入，无需自建钱包基础设施。

---

## 1. 支持的多链市场

| 链 | chainId | IdentityRegistry | SubscriptionManager | 原生代币 | RPC |
|----|---------|------------------|---------------------|----------|-----|
| BSC | 56 | `0xeF96D883e1082E3e102d925c8190A13EEC1ffF33` | `0x6f18Aa693e5062Ef98bBA5A865F225f2e652DF6b` | BNB | `https://bsc-rpc.publicnode.com` |
| Ethereum | 1 | `0xb38BC382aA438F8B4f0BFA902041330Bc14DD02e` | `0x7b4002a416E9c0cA68d7dEDc6c734CFab4D396FE` | ETH | `https://ethereum-rpc.publicnode.com` |
| Base | 8453 | `0x37f3919D64d648ddF70747e159fd9A1c6890CA3b` | `0x0f129e8C31Dd7642cd7e852fBf682fCb75104b29` | ETH | `https://base-rpc.publicnode.com` |
| Sepolia 测试网 | 11155111 | `0xe94ad380d3F8d08a7590eda0C84f354a93F96e5F` | `0xC15fE80b9d800abb72121F353a6ae6d6E9077E63` | ETH | 自备（Alchemy/Infura 等） |

> ⚠️ **地址来源**：上表全部取自 `KNOWN_CHAINS[chainId]`（`src/config/config.ts`）。**生产环境请优先从 `KNOWN_CHAINS[chainId].contracts.identityRegistry / subscriptionManager` 读取，避免硬编码**——合约地址可能随部署修正而更新。

### 各链完整合约地址（6 个核心合约）

3 条对外市场链（BSC / Ethereum / Base）均已部署全套 6 个合约，可直接用于链上铸造 / 订阅 / A2A。下表与 `KNOWN_CHAINS[chainId].contracts` 一一对应：

| 合约 | BSC (56) | Ethereum (1) | Base (8453) |
|------|----------|--------------|-------------|
| IdentityRegistry | `0xeF96D883e1082E3e102d925c8190A13EEC1ffF33` | `0xb38BC382aA438F8B4f0BFA902041330Bc14DD02e` | `0x37f3919D64d648ddF70747e159fd9A1c6890CA3b` |
| SubscriptionManager | `0x6f18Aa693e5062Ef98bBA5A865F225f2e652DF6b` | `0x7b4002a416E9c0cA68d7dEDc6c734CFab4D396FE` | `0x0f129e8C31Dd7642cd7e852fBf682fCb75104b29` |
| A2AProtocolRegistry | `0x842F0B9E85f5aBd9752B5ea20Cc888b94dBb5E16` | `0x09f6C8f9AE6CEf12C4a078c91aeb2EcCb7CbD012` | `0x2172145F2A8f7A66019A4F4048Af46844243607E` |
| ReputationRegistry | `0xBaDB0F3956252DE6e31aE749245E8bA6Fda288ee` | `0x72C1236bc425b1A6129b76400aE7b26c1fbFAeFE` | `0x3f30d87BDFFa66f0e4664F1cE65a0e3a91FB4A9e` |
| ConfigurationRegistry | `0xd9B984cF591dc1C3663991e7D75c44C2bDE1a9BB` | `0x2Bf6962301164A301e4fEC9036aB97edcBcE1bCa` | `0x5EF8c35738311B971A64de64487E1E304Ae53993` |
| MultiEndpointRegistry | `0x80Bc36634693d7935109f5cdbc95E64a9c1bdA6a` | `0xE93fbED3Df2a5D357856f2f2712B3c1Ebb8d026f` | `0xB8065829dBb450B8fC7375D910521EA641EC6Ee5` |

> 部署起始块（网关索引 `*_SYNC_FROM_BLOCK` 用）：BSC SM `122277574`、Ethereum SM `25992521`、Base SM `51401326`。
> 程序化访问请直接读 `KNOWN_CHAINS[chainId].contracts`（六个字段同名），避免复制粘贴出错。

### 白名单稳定币（USDT / USDC）

BSC / Ethereum / Base 三链的 `SubscriptionManager` 已登记 USDT / USDC 白名单，计划可用稳定币定价（`createPlan` 的 `payToken` 传下表地址）：

| 链 | 代币 | 地址 | 精度 |
|----|------|------|------|
| BSC | USDT | `0x55d398326f99059fF775485246999027B3197955` | 18 |
| BSC | USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | 18 |
| Ethereum | USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| Ethereum | USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| Base | USDT | `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2` | 6 |
| Base | USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |

**ERC20 计划要点**：

- `price` 用代币最小单位（**注意 BSC 上的 USDT/USDC 是 18 位，ETH/Base 上是 6 位**，不要统一按 1e6 换算）；
- 订阅方必须先 `approve(SubscriptionManager, price)`，再由 `subscribe(planId)` 完成订阅；SDK 的 `SubscriptionManager.subscribe` 会自动处理 approve（见 3.e）；
- ERC20 计划的订阅交易 **不要带原生币**（合约要求 `msg.value == 0`），原生币只用于付 gas；
- 非白名单 ERC20 会被合约 revert，新增币种需由合约 owner 调 `setTokenWhitelist(token, true)`。

```ts
import { parseUnits } from 'viem'

// Base 上用 USDC 定价：9.9 USDC / 月
const { planId } = await sub.createPlan({
  agentId,
  price: parseUnits('9.9', 6),                        // Base USDC 精度 6
  period: 'month',
  payToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
})
```

### 链选择指引

- **B 端优先 Base / Ethereum**：Gas 便宜或生态成熟，原生币即 ETH；
- **测试联调用 Sepolia**：无真实资金风险；
- **BSC 为对外默认链**：平台默认支付/验证链（`SubscriptionPayments` 的 `chain` 参数默认 `'bsc'`）；
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
npm install @actora/sdk@0.20.1
```

> 包内含 `examples/`（B 端可运行样例）与 `UPGRADE.md`（逐版本迁移指南），安装后可从
> `node_modules/@actora/sdk/` 查看。

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

### a. 开户：注册 partner 租户，拿到 API Key

B 端接入的第一步是**用钱包签名建一个 partner 租户**，网关会签发一把长期有效的租户 API Key（`actora_<hex>`）：

```bash
# 1) 取挑战
curl -X POST https://actora.codes/api/v1/auth/challenge \
  -H 'Content-Type: application/json' -d '{"address":"0xYourWallet"}'

# 2) 用钱包对 challenge 做 EIP-191 签名，再调 verify（intent=partner）
curl -X POST https://actora.codes/api/v1/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xYourWallet","signature":"0x...","intent":"partner"}'
# → { "token": "<jwt>", "tenant": {...}, "api_key": "actora_..." }   ← api_key 仅返回一次
```

- partner 租户初始**无套餐**：`quota_daily=0`、`rate_limit_rpm=5`、`max_concurrent=1`，**平台 LLM 不可用**；可先 BYOK，或购买平台档位（见 §8）。
- 一个钱包只对应一个租户；已有租户再传 `intent='partner'` **不会改变其 kind**。
- `api_key` 丢失只能轮换（`POST /api/v1/tenant/rotate-key`），**不能找回**。
- 拿到 Key 后即可跳过后面的链上部分（b–d），直接使用 e/f 的订阅支付与托管对话能力。

### b. 连接钱包（viem）

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

### c. 铸造 Agent（AgentRegistry）

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

### d. 创建订阅计划（SubscriptionManager）

```ts
import { SubscriptionManager } from '@actora/sdk'
import { parseEther, parseUnits } from 'viem' // 价格单位工具来自 viem

const sub = new SubscriptionManager({
  contractAddress: cfg.contracts.subscriptionManager,
  publicClient,
  walletClient,
})

// 原生币计划（BNB / ETH）
const { planId, txHash } = await sub.createPlan({
  agentId,
  price: parseEther('0.01'),          // 原生币 wei
  period: 'month',                     // 'day' | 'week' | 'month' | 'year'
  // trialDays: 3,                     // 0–30，默认 0
})

// 稳定币计划（USDT / USDC）—— payToken 传白名单地址，price 用代币最小单位
const usdcPlan = await sub.createPlan({
  agentId,
  price: parseUnits('9.9', 6),                              // Base USDC 精度 6
  period: 'month',
  payToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
})
```

### e. 订阅（SubscriptionManager.subscribe 或 SubscriptionPayments.pay）

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

### f. 与 Agent 对话（ConversationClient）

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

- 原生币计划：`price` 为该链原生代币的 wei（BNB / ETH）；
- ERC20 计划：`price` 为代币最小单位 —— **ETH/Base 的 USDT/USDC 是 6 位（1e6），BSC 的 USDT/USDC 是 18 位（1e18）**；
- 跨链比较价格时统一用 `getPlan(planId).price` + `plan.payToken` 判断计价币种；
- 中心化 Agent 的价格以 `priceWei` 字符串返回（见 `CentralPlan`），避免 JS 精度丢失。

### 合约地址获取（不要硬编码）

```ts
import { KNOWN_CHAINS } from '@actora/sdk'
const base = KNOWN_CHAINS[8453]
const registryAddr = base.contracts.identityRegistry
const subManagerAddr = base.contracts.subscriptionManager
```

### 托管对话：链由平台解析，调用方**不需要**声明（0.17.0 起）

链上模块（`AgentRegistry` / `SubscriptionManager`）是「哪条链的合约就读哪条链」，但**托管对话（`ConversationClient`,
`agentId` 模式）相反**：你只要给出 `agentId`，平台会自己判断该 Agent 在哪条链、以及你在哪条链上有权。

- 平台从 `agents` 表列出该 `agentId` 存在的**全部候选链**（按平台内部固定的链优先序：内部测试链 → 中心化 → BSC → Ethereum → Base
  排序），逐链判定你（`X-End-User-Id` 或租户钱包）**是否拥有 / 已订阅**，取**第一条放行的链**；
- 这条链会一路贯穿「访问判定 → 取 Agent 上下文 → 组装工具」，所以不会出现「按 A 链判权、按 B 链取到别人的同名 Agent」；
- **为什么必须这样**：各链**独立编号**，同一个数字 ID 可同时在多条链存在（实测 BSC 与 Ethereum 都有 `id=2`，
  且是**两个不同的 Agent**）。只看「优先序第一条」会取错，故按「你在哪条链有权」来锚定；
- 该判定发生在平台侧，**托管对话请求里不接受调用方指定链**（`chat` / `stream` / `createTask` 均无需、
  也无法传 `chain`）；只有只读的 `GET /api/v1/agents/:id?chain=` 可以显式指定链；
- 历史行为（`0.16.0` 及以前）：该路径只认内部测试链 / 中心化市场，Agent 发在 BSC / Ethereum / Base 时
  详情接口直接 **404**、或判权失败 **403** —— 已在 `0.17.0` 随平台侧修复。

> 实践建议：集成时**不要猜链、也不要声明链**，直接给出 `agentId` 调 `POST /api/v1/agent/runs` 或
> `POST /api/v1/sessions/:id/tasks` 即可；平台会按「你在哪条链有权」自动锚定。

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
| `getAttributes(agentId)` / `tokenURI(agentId)` | 读元数据键值对 / tokenURI |
| `overwriteAttributes(agentId, attrs[])` | **整组覆盖**链上属性（`updateMetadata`），返回 txHash |
| `setAttributes(agentId, patch)` | **增量**更新链上属性：读回现有 → 合并 → 整组写回，返回 txHash |
| `getAgentMetadata(agentId)` | 结构化元数据（name/capabilities/encryptedPayloadCid 等） |
| `getAllAgents(opts?)` | 批量扫描（`fromId`/`toId`/`activeOnly`/`capabilities`/`batchSize`），返回 `AgentSummary[]` |

```ts
const { agentId } = await registry.registerSimple('ipfs://QmX...')
const owners = await registry.getAgentsByOwner(account.address)
const meta = await registry.getAgentMetadata(agentId) // { name, description, capabilities, encryptedPayloadCid, ... }

// 存量 Agent 补写公开 skills（只改 skills，其余属性自动保留）
await registry.setAttributes(agentId, {
  skills: [{ name: 'consult', description: '向该专家发起咨询', inputSchema: { type: 'object' } }],
})
// 整组覆盖（只在需要「删掉某个属性键」时用；先读回原有属性，否则会被抹掉）
const current = await registry.getAttributes(agentId) // { name: '…', description: '…', … }
await registry.overwriteAttributes(agentId, [
  ...Object.entries(current).map(([key, value]) => ({ key, value })),
  { key: 'skills', value: '[]' },
])
```

> ⚠️ 生产合约的 `updateMetadata` 是**整组覆盖**语义（先清空全部属性键再写入传入数组），所以优先用
> `setAttributes()`（自动读回合并）；`overwriteAttributes()` 必须把原有 `name` / `description` /
> `category` / `pricing_type` / … 全部一起传，否则会被抹掉。辅助函数 `toAttributes(patch)` 可把
> `{ key: value }`（字符串 / 数字 / 布尔 / 数组 / 对象）规范化为链上属性数组。

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
  - `chain` 取值：`'oxachain' | 'sepolia' | 'bsc' | 'ethereum' | 'base'`（默认 `'bsc'`）
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
- **多链（0.17.0 起）**：`chat()` / `stream()` / `createTask()` **不需要传链**，也无法传链 —— 平台按
  「你在这条 `agentId` 的哪条链上有权」自动解析并全链路沿用（详见 §4「托管对话：链由平台解析」）。
  因此 **BSC / Ethereum / Base 上的 Agent 直接可用，不会再 404**。

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
| `BillingClient` | B 端余额预检（x402 台账，委托前判断余额是否够按次付费） | `{ gatewayUrl, apiKey?, accessToken?, endUserId? }` | `getBalance({ endUserId? })` → `{ balance, balanceWei, currency, subject, payTo?, priceWei? }`（`currency` 为该链原生币符号） |
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

- **`AgentRunner`**：加载 + 解密 Agent（订阅校验 → IPFS 拉取 → 解包 AES Key → AES-256-GCM 解包 prompt/skills）。构造 `new AgentRunner({ reader, wallet, ipfsFetcher?, ipfsGateways?, unpack?, aesKeyHex? })`，`reader` 实现 `OnChainReader`（getTokenURI/getAttributes/hasActiveSubscription），`wallet` 实现 `WalletSigner`（signMessage/getAddress/deriveEncryptionKey?/getPrivateKey?）。核心方法 `useAgent(agentId)` → `{ prompt, skills, mcp, subscriptionExpiry }`。密钥来源优先级：`config.unpack` → `config.aesKeyHex` → `wallet.deriveEncryptionKey()` → `wallet.getPrivateKey()`（**浏览器钱包见 §5.12**）。
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
- **`derivePrivateKeyFromSignature(signature, address, params?)`** / **`derivePrivateKeyFromIkm(ikmHex, address, params?)`** / **`deriveKeyPairFromWallet({ mode?, signMessage, signTypedData?, getPrfOutput?, address, … })`** —— 浏览器钱包密钥派生（v1 `personal_sign` / v2 EIP-712 / v3 WebAuthn PRF + HKDF-SHA256，见 §5.12）；配套 **`buildPayloadKeyTypedData(address, overrides?)`** 与 `DEFAULT_EIP712_DOMAIN` / `DEFAULT_EIP712_TYPES` / `DEFAULT_EIP712_PRIMARY_TYPE` / `DEFAULT_DERIVATION_INFO_PREFIX_V2` / `DEFAULT_DERIVATION_INFO_PREFIX_V3` / `DEFAULT_PRF_SALT`（v3 的 IKM 不再是签名，直接用 `derivePrivateKeyFromIkm` 喂 32 字节 PRF 输出）
- **`generateAesKey()`**；高级封装：`encryptPayload / decryptPayload / packAgentForPublish / publishAgent / unpackAgent`
- **发布绑定与自检**：`publishAgent({ ..., verifyWithPrivateKey })`（铸造前 dry-run 解包）；`PAYLOAD_KEY_MODE_ATTRIBUTE` / `readPayloadKeyMode(attrs)` / `isDerivationMode(v)` / `AgentRegistry.setPayloadKeyMode(agentId, mode)`；v3 另有 `PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE` / `serializePayloadKeyCredential()` / `readPayloadKeyCredential(attrs)` / `AgentRegistry.setPayloadKeyCredential(agentId, credential)`

```ts
import { generateKeyPair, aesEncrypt, aesDecrypt, eciesEncrypt, eciesDecrypt } from '@actora/sdk'
const { privateKey, publicKey } = generateKeyPair()
const enc = eciesEncrypt('my-aes-key-hex', publicKey)
const dec = eciesDecrypt(enc, privateKey) // 'my-aes-key-hex'
const c = aesEncrypt('hello', '00'.repeat(32))
aesDecrypt(c, '00'.repeat(32))            // 'hello'
```

### 5.12 浏览器钱包（EIP-1193）—— 发布与运行

> **结论先讲**：MetaMask / OKX / Rabby / Trust / Coinbase 等注入式钱包**无法导出账户私钥**，
> 所以 `AgentRunner.useAgent()` 不能靠账户私钥做 ECIES 解密；而 `eth_getEncryptionPublicKey`
> （EIP-1024）已废弃且仅 MetaMask 实现。浏览器端的可行路径有三条：**从确定性签名派生**（v1 `personal_sign` / v2 EIP-712）、
> **从 WebAuthn PRF 派生**（v3，非签名、来源绑定）、或**改用托管密钥**（服务端生成密钥对）。

#### 派生规则（冻结契约）

三种模式**只有「IKM 从哪来」不同**，HKDF 构造逐字节一致：

```
v1  mode: 'personal-sign-hkdf'        IKM = personal_sign 签名（65 字节 r‖s‖v，要求 RFC 6979 确定性）
v2  mode: 'eip712-hkdf'               IKM = eth_signTypedData_v4 签名（65 字节）
v3  mode: 'webauthn-prf-hkdf'         IKM = WebAuthn PRF 输出（32 字节，非签名）

三者共用：
privateKey = HKDF-SHA256(IKM,
                         salt = "actora/expert-enc",
                         info = "<infoPrefix>/<地址小写>")[retry:i]
publicKey  = 未压缩公钥（0x04 + 128 hex）→ 传给 publishAgent

infoPrefix = "agent-payload-encryption/v1"    // v1
           | "agent-payload-encryption/v2"    // v2
           | "agent-payload-encryption/v3"    // v3
```

- 账户私钥**永不离开钱包**；派生私钥只存在于内存，不落盘、不上传；解密时用同一来源重现同一 IKM 即可（v1/v2 再签一次，v3 再求一次 PRF）；
- **冻结面**：改动其中任一值，**已发布的 payload 永久解不开**——上线前冻结，文案按**字节**冻结（不要本地化、不要改空格）：
  - v1：`message` / `salt` / `infoPrefix` / 发布地址；
  - v2：`domain` / `types` / `primaryType` / `infoPrefix` / 发布地址（typed data 的 `message` 由地址派生，**不含时间戳 / nonce**，
    否则签名不可复现、密钥不可复原）；
  - v3：`prfSalt` / `salt` / `infoPrefix` / **`rpId`** / **`credentialId`** / 发布地址（`prfSalt` 即上表的 `salt`，经 PRF 扩展求值后作为 HKDF 的 salt 输入）；
- 越界（HKDF 输出非合法 secp256k1 标量）时按 `info + "/retry:<i>"` 重试，首次命中的方案即冻结方案；
- **v1 / v2 / v3 并存**：0.18.0 起新档案建议用 v2；0.20.0 起需要「非签名、来源绑定」时用 v3。已用旧 mode 发布的载荷继续用旧 mode 解（不提供自动迁移，
  因为 `tokenURI` 铸后不可改）。

#### 选型：四条路径怎么选（先定 Runner 跑在哪，再选密钥来源）

**第一问不是「哪个更安全」，而是「Runner 跑在哪」**：

- **Runner 在你的服务端**（服务化 Agent / 后端调用 / 自建执行）⇒ **用私钥托管，另外三条都不需要** ——
  密钥不下发浏览器，落地见下方「托管密钥」一节。**这是规避 v3 兼容性问题最彻底的一条路**。
- **Runner 在终端用户浏览器**（用户自持访问权、去中心化叙事）⇒ 服务端私钥下不到浏览器，
  只能在 v1 / v2 / v3 之间选。

| 维度 | v1 `personal-sign-hkdf` | v2 `eip712-hkdf` | v3 `webauthn-prf-hkdf` | **私钥托管** |
|---|---|---|---|---|
| IKM 来源 | `personal_sign` 签名 | `eth_signTypedData_v4` 签名 | WebAuthn PRF 输出（**非签名**） | **无**（服务端 `generateKeyPair()`） |
| 对浏览器/设备的依赖 | 注入式钱包 | 注入式钱包 + EIP-712 | **WebAuthn + PRF**（移动端钱包内置浏览器普遍没有） | **无**（解密在服务端） |
| 可复用签名攻击面 | 有 | 有 | **无** | **无**（根本没有签名） |
| 来源绑定 | 无 | 无（`domain` 只是域分隔符） | **有**（浏览器强制 RP ID） | 无 ⇒ 改为**服务端鉴权** |
| 是否有盲签/签名提示 | 文本盲签 | 结构化签名 | 无签名提示 | 无 |
| 要求确定性签名（RFC 6979） | 是 | 是 | 否 | 否 |
| 需额外落盘的信息 | — | — | `credentialId` + `rpId` | **私钥的备份与恢复** |
| 主要不可逆风险 | 钓鱼站可复现签名 ⇒ 派生私钥 | 同 v1 | 换域名 / 丢凭据 ⇒ **永久解不开** | **私钥丢失 ⇒ 永久解不开，且不可轮换** |
| v3 兼容性矩阵 | 不涉及 | 不涉及 | **需自行承担**（见 v3 一节） | **全部规避** |
| 默认值 | 否 | 否 | 否（opt-in） | 否（opt-in） |

> **一句话结论**：若 B 端的 Runner 能跑在服务端，**私钥托管可完全规避 WebAuthn/PRF 的兼容性问题**
> —— 移动端内置浏览器、跨设备、混合传输（QR）、域名迁移**全都不涉及**（密钥材料不进浏览器）。
> 但它的代价是**信任边界转移到运维侧**：私钥在 KMS/HSM、**不可轮换**、**丢失即永久解不开**，
> 且它提供的是**服务端鉴权**而非「客户端自持 + 域绑定」。若后者是硬需求，则只能走 v3。

#### v2：用 EIP-712 取代文本盲签（`mode: 'eip712-hkdf'`）

v1 的 `personal_sign` 有两个先天问题：钱包一律按**文本盲签**渲染（MetaMask / Rabby / OKX 提示「无法验证来源」），
且文案**公开固定、可无限复用**（任何钓鱼站让用户签同一串文本即可派生出该用户的 payload 私钥）。v2 把「被签的东西」
换成 EIP-712 typed data，**派生算法不变**，钱包会展示结构化、带 domain 的签名请求。

> ⚠️ **v2 只解决「呈现」，不解决「可复用」**：typed data 依然是公开常量、无时效、可无限重放，
> 上面那条攻击路径照旧成立（见「前置条件与失败语义」）。**换编码消不掉 IKM 是签名这个事实**；
> 要消掉它有两条路：**托管密钥**（见「托管密钥」一节）或 **WebAuthn PRF（v3，0.20.0 已交付**，见下节）。

默认值（SDK 内置，**刻意不含时间戳**）：

```ts
domain      = { name: 'Actora Agent Payload', version: '2' }
types       = { PayloadKey: [
  { name: 'address', type: 'address' },   // 与 HKDF info 的地址同口径（小写），双保险
  { name: 'purpose', type: 'string' },    // 'agent-payload-encryption'
  { name: 'version', type: 'uint256' },   // 2
] }
primaryType = 'PayloadKey'
message     = { address: <地址小写>, purpose: 'agent-payload-encryption', version: 2 }
```

发布侧（`deriveKeyPairFromWallet` 接受 typed data，不再是只有 `signMessage`）：

```ts
import { deriveKeyPairFromWallet } from '@actora/sdk'

const { privateKey, publicKey } = await deriveKeyPairFromWallet({
  mode: 'eip712-hkdf',
  signTypedData: (typedData) => walletClient.signTypedData({ account, ...typedData }),
  address: account.address,
  // assertDeterministic 自 0.19.0 起默认开启；如需关掉：assertDeterministic: false
})
// 铸造前自检：把 privateKey 传给 publishAgent({ ..., verifyWithPrivateKey: privateKey })
```

运行侧（默认值即上表；`domain` / `types` / `primaryType` 可覆盖，覆盖后同样进入冻结面）：

```tsx
const { ctx, error } = useAgentRunner({
  agentId,
  encryptionKeyDerivation: { mode: 'eip712-hkdf' },   // v2
  // encryptionKeyDerivation: { mode: 'personal-sign-hkdf' },  // v1：解已有载荷时用
})
```

#### v3：WebAuthn PRF —— 把 IKM 从「签名」换成「浏览器绑定的密钥材料」（`mode: 'webauthn-prf-hkdf'`，0.20.0+）

前两节的 IKM 都是**签名**，于是「公开 / 无时效 / 可复用」成为必然代价。v3 换掉 IKM 的来源：用 **WebAuthn PRF 扩展**
的确定性输出（32 字节）。PRF 由浏览器/认证器**强制绑定到 RP ID**（你的注册域），**不是签名**，因此：

| 维度 | v1 / v2（IKM = 签名） | v3（IKM = PRF 输出） |
|---|---|---|
| 是否可被重放 | ✅ 载荷是公开常量，钓鱼站让用户签同一份即可派生 | ❌ 浏览器拒绝在非注册域使用该凭据，拿不到同值 |
| 钱包提示 | 文本盲签 / typed data 签名 | **无签名提示**（不经过 EIP-1193） |
| 是否需要 `assertDeterministic` | 需要（非 RFC 6979 钱包不可复现） | **不需要**：PRF 无计数器，构造上确定 |
| 与钱包地址的关系 | 绑定发布地址（HKDF `info`） | 同样绑定地址；但密钥主体来自 PRF ⇒ **与钱包账户解耦** |
| 新增依赖面 | 无 | `rpId` / `credentialId`（**必须落盘**，无法从地址反推） |

发布侧（**先注册 passkey，再派生**）：

```ts
import {
  getPrfCapability, createPrfCredential, evaluatePrf,
  deriveKeyPairFromWallet, publishAgent, DEFAULT_PRF_SALT,
} from '@actora/sdk'

// ① 能力探测（不弹窗）。prf: 'unknown' 是真实答案 —— 旧浏览器无法在不弹窗的前提下回答，
//    它**不等于**失败；v3 真不可用时会在 ③ 抛出可操作错误。
const cap = await getPrfCapability()

// ② 注册 passkey（residentKey + userVerification + PRF 一并开启）
const cred = await createPrfCredential()      // rpId 默认 location.hostname
// cred.credentialId 是 base64url，**务必持久化**（见 ④）；丢了就再也派生不出同一把密钥

// ③ 派生：IKM = evaluatePrf 的 32 字节输出
const { privateKey, publicKey } = await deriveKeyPairFromWallet({
  mode: 'webauthn-prf-hkdf',
  address: account.address,
  getPrfOutput: async () => (await evaluatePrf({ credentialId: cred.credentialId })).prfOutputHex,
})
// v3 忽略 assertDeterministic（PRF 无计数器）；铸造前自检照旧
const result = await publishAgent({ agent, publicKey, uploader, verifyWithPrivateKey: privateKey })
```

运行侧与链上绑定（**把 `rpId` + `credentialId` 记到档案上**，否则将来无从复现）：

```tsx
const { ctx, error } = useAgentRunner({
  agentId,
  encryptionKeyDerivation: {
    mode: 'webauthn-prf-hkdf',
    credentialId,                 // 从链上属性读回
    rpId: 'app.example.com',      // 必须就是注册该 passkey 时的域
    // prfSalt: DEFAULT_PRF_SALT, // 默认值，改动即进入冻结面
  },
})
```

```ts
// 发布后落盘绑定（跨实现复现所需的最小信息）
await registry.setPayloadKeyMode(agentId, 'webauthn-prf-hkdf')
await registry.setPayloadKeyCredential(agentId, {
  rpId: 'app.example.com',
  credentialId,                   // base64url
  prfSalt: DEFAULT_PRF_SALT,      // 显式写入，便于第三方 runner 复现
  address: account.address,
})
// 读取：readPayloadKeyCredential(await registry.getAttributes(agentId))
//      （属性名常量 PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE = 'payload_key_credential'，JSON 字符串）
```

**零回退（有意设计）**：PRF 不可用时抛 `PrfError`，**绝不静默退化为 `signMessage`** ——
静默回退会让用户以为持有「passkey 绑定」的密钥，实际回到可复用签名，比直接报错危险得多。
错误码（`error.code`，`error instanceof PrfError`）：

| `PrfErrorCode` | 触发 | 处置 |
|---|---|---|
| `PRF_UNSUPPORTED` | 浏览器/认证器没有 PRF 扩展（移动端钱包内置浏览器**普遍如此**） | 改用 `mode: 'eip712-hkdf'`（v2）或托管密钥 |
| `PRF_CREDENTIAL_NOT_FOUND` | 凭据不在本设备（`InvalidStateError`） | 在注册设备或同一 passkey 同步服务上重试 |
| `PRF_CANCELLED` | 用户取消 / 超时 / 凭据不存在（`NotAllowedError`） | 重新发起；确认 RP ID 正确 |
| `PRF_FAILED` | RP ID 与当前来源不匹配（`SecurityError`）、输出长度异常、其他 | 检查 `rpId` 是否等于注册时的域 |

> ⚠️ **v3 的已知局限（务必在选型时权衡）**：
> ① **移动端钱包内置浏览器普遍不支持 WebAuthn/PRF** ⇒ 这类端侧请继续用 v2 或托管密钥；
> ② 密钥绑定 **(rpId, credential)** ⇒ **换域名、或丢失凭据**，已发布载荷**永久解不开**（`tokenURI` 铸后不可改），
>    故 `credentialId` + `rpId` 必须随档案落盘（`payload_key_credential` 属性）；
> ③ **跨设备 / 混合传输（QR）场景的 PRF 一致性存在公开缺陷史**（如 WebKit bug 311099：Safari 对安全密钥返回
>    未解密的 hmac-secret 输出）⇒ v3 因此设计为 **opt-in**，不改变任何默认值。
> ④ `getPrfCapability()` 在无 `getClientCapabilities()` 的浏览器返回 `prf: 'unknown'`，只能靠真实 ceremony 判定。

#### 发布（浏览器）

```ts
import { deriveKeyPairFromWallet, publishAgent } from '@actora/sdk'

// v1（沿用既有档案）
const { privateKey, publicKey } = await deriveKeyPairFromWallet({
  signMessage: (message) => walletClient.signMessage({ account, message }),
  address: account.address,
  // 0.19.0 起默认开启（多签一次即拦下非确定性钱包）；确认钱包确定性时可关掉
  // assertDeterministic: true,
})
// v2（新档案推荐）：见上一节 `mode: 'eip712-hkdf'`

// 铸造前自检：私钥解不开就不上传、不铸造（tokenURI 铸后不可改）
const result = await publishAgent({
  agent, publicKey, uploader,
  verifyWithPrivateKey: privateKey,
})
// result.encryptedCid → 链上 tokenURI；result.eciesEncryptedKeyHex → 元数据属性

// 铸造后记录派生 mode —— 跨实现的标准字段，第三方 runner 据此选解包方式
await registry.setPayloadKeyMode(agentId, 'personal-sign-hkdf')   // 或 'eip712-hkdf'；v3 用 'webauthn-prf-hkdf'（另需 setPayloadKeyCredential）
```

发布链路上有三道**铸造前**护栏，都会在「已经不可回退」之前拦住你：

| 护栏 | 何时触发 | 默认 |
|---|---|---|
| `assertDeterministic` | 钱包对同一载荷返回不同签名（非 RFC 6979）⇒ 将来必然解不开 | **开**（0.19.0+） |
| `selfCheck` | 派生出的密钥对无法 ECIES 往返（密钥本身有问题） | **开**（0.19.0+） |
| `verifyWithPrivateKey` | 传入的私钥解不开本次包裹的 AES key（**含 v1/v2 mode 用错**） | 传了才查 |

读取模式用 `readPayloadKeyMode(await registry.getAttributes(agentId))`（属性名常量 `PAYLOAD_KEY_MODE_ATTRIBUTE` = `payload_key_mode`；
未知值返回 `undefined`，不要猜 —— 「用错 mode」与「载荷损坏」现象完全一样）。

#### 运行 / 解密（浏览器）

```tsx
const { ctx, error } = useAgentRunner({
  agentId,
  encryptionKeyDerivation: { mode: 'personal-sign-hkdf' },   // 显式 opt-in（v1 / v2 / v3 三选一）
})
```

非 React 场景：自行实现 `WalletSigner.deriveEncryptionKey()`（返回派生私钥）；或由宿主完全接管密钥来源
（网关下发 / 会话密钥 / HSM 等），优先级最高的两种注入方式：

```ts
const runner = new AgentRunner({
  reader,
  wallet,                       // deriveEncryptionKey() / getPrivateKey() 二选一，见 WalletSigner
  // ① 完全自定义解包
  unpack: async (encryptedPayload, eciesEncryptedKey) => {
    const aesKeyHex = await myKeyService.resolve(agentId)
    return decryptPayload(encryptedPayload, aesKeyHex)
  },
})
// ② 或直接给已解出的 AES key（跳过 ECIES）
new AgentRunner({ reader, wallet, aesKeyHex: sessionAesKey })
```

密钥来源优先级：`config.unpack` → `config.aesKeyHex` → `wallet.deriveEncryptionKey()` → `wallet.getPrivateKey()`。

#### 托管密钥：不经钱包派生（服务端生成密钥对）—— 受支持的一等用法

**「密钥对由服务端生成、不经任何钱包签名」是受支持的发布形态**，不是 hack：`publishAgent({ publicKey })` 的公钥本来就是入参，
`generateKeyPair()` 也是公开 API。**服务化 Agent（咨询走自有后端）建议优先用这条路径** —— 它没有「可复用签名」问题
（根本没有签名），也不受钱包确定性、盲签提示、`personal_sign` 文案复用的影响。

> **它同时规避了 v3 的全部兼容性问题**：密钥材料不进浏览器 ⇒ 移动端钱包内置浏览器无 WebAuthn、跨设备 / 混合传输（QR）
> 的 PRF 一致性、域名迁移**全都不涉及**。代价见下方「安全建议」表（尤以**不可迁移 / 不可轮换**为重）与
> §5.12 开头的「选型」矩阵。

```ts
import { generateKeyPair, publishAgent, AgentRegistry } from '@actora/sdk'

// ① 服务端生成密钥对（私钥只留在你的 KMS / HSM，永不进浏览器）
const { privateKey, publicKey } = generateKeyPair()

// ② 用公钥发布；顺便做铸造前自检 —— 私钥能解开才算通过
const result = await publishAgent({
  agent, publicKey, uploader,
  verifyWithPrivateKey: privateKey,        // 0.19.0+：不通过就不上传、不铸造
})

// ③ 铸造并记录派生 mode（第三方 runner 据此选解包方式）
const { agentId } = await registry.register(result.encryptedCid, {
  eciesEncryptedKey: result.eciesEncryptedKeyHex,
})
await registry.setPayloadKeyMode(agentId, 'personal-sign-hkdf')   // 或 'eip712-hkdf'；v3 用 'webauthn-prf-hkdf'（另需 setPayloadKeyCredential）
```

运行侧（**只在这两类位置持有密钥**，不要下发到浏览器）：

```ts
// A. 后端解包后自行使用（推荐）：完全自定义解包
new AgentRunner({
  reader, wallet,
  unpack: async (encryptedPayload, eciesEncryptedKey) => {
    const aesKeyHex = await kms.unwrapAgentKey(agentId)   // 你的 KMS / HSM
    return decryptPayload(encryptedPayload, aesKeyHex)
  },
})
// B. 让 SDK 用托管私钥做 ECIES 解包（私钥需从安全存储短期取出）
new AgentRunner({ reader, wallet, aesKeyHex: await kms.getAgentAesKey(agentId) })
```

**安全建议**

| 项 | 建议 |
|---|---|
| 存放 | 私钥进 KMS / HSM / 云 KMS（`unpack` 路径下私钥**无需离开 KMS**）；绝不写进前端、CDN、仓库或日志；`.env` 只放引用 ID，不放密钥本体 |
| 轮换 | **每个档案一把密钥**（`generateKeyPair()` 每次调用都新生成），不要跨档案复用；单个档案的密钥**不能轮换** —— 见下一条 |
| 审计 | 记录「谁在何时用哪个 keyId 解包了哪个 agentId」；解包是敏感操作，建议限流 + 告警 |
| ⚠️ 不可迁移 | `tokenURI` / 链上属性**铸造后不可改**，而 payload 的 AES key 是用**发布时的公钥**包裹的 —— 所以**这把私钥丢了就是载荷永久解不开，且不能换**（不能像钱包派生那样「换个设备重新派生」）。请把「密钥备份与恢复」当成上线前的硬性检查项 |
| 与签名派生对比 | 托管密钥：无签名可复用、可服务端审计，但**中心化托管**（你的运维即信任边界）；签名派生：非托管、用户自持，但有上述固有边界。按业务选择，SDK 两条都支持 |

> **参考实现（Actora 平台自带）**：平台侧已按本节形态落地一条托管链路，可直接对照 —— 网关
> `POST /api/v1/agents/payload-keys` 为**每个 Agent 生成一把独立密钥对**（`keyId` + 公钥返回，
> 私钥用环境主密钥 `PAYLOAD_KEY_KEK` 经 AES-256-GCM 封装后落库，明文不回传、不上链），
> 前端用公钥 `eciesEncrypt(aesKey, publicKey)` 包裹后把 `eciesEncryptedKey` 与 `payload_key_id`
> 写进链上属性（**不需要第二笔交易** —— `agentId → keyId → 公钥` 的绑定随铸造元数据一并上链），
> 作者可随时 `POST /api/v1/agents/payload-keys/:keyId/export` **可重复导出**私钥（带 `export_count` /
> `last_exported_at` 审计）。落库表见 `gateway/db/migrations/039_agent_payload_keys.sql`。
> 注意：该链路用 `payload_key_mode = 'hosted'` 标注，**不属于** v1/v2/v3 三个 `DerivationMode`
> （`readPayloadKeyMode()` 对未知值返回 `undefined`，第三方 runner 见此值应改用「调用平台/导出私钥解包」而非派生）。

**读取闭环（用托管私钥把 Agent 跑起来）**：发布方（owner）在 `payload_key_mode === 'hosted'` 时按下面的路径取回私钥并解包：

```ts
import { unpackAgent, eciesDecrypt } from '@actora/sdk/core'
import { AgentRunner } from '@actora/sdk'

// 1) 链上取密文引用（eciesEncryptedKey 是用托管公钥包裹的 AES key）
const attrs = await reader.getAttributes(agentId)
//   → { encryptedPayloadCid, eciesEncryptedKey, payload_key_mode, payload_key_id }
const encryptedPayload = await ipfsFetcher.fetchEncryptedPayload(attrs.encryptedPayloadCid)

// 2) owner 向平台按 agentId 取回私钥（可重复导出 + 审计；需登录该 Agent 的钱包）
const res = await fetch(
  `${GATEWAY}/api/v1/agents/payload-keys/by-agent/${agentId}/export?chain=bsc`,
  { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
)
const { key } = await res.json()   // { privateKey, keyId, publicKey, exportCount, ... }

// 3a) 一步解包得到 { prompt, skills, mcp }
const privatePayload = unpackAgent(encryptedPayload, attrs.eciesEncryptedKey, key.privateKey)

// 3b) 或把 AES key 交给 Runner（私钥只在内存短暂存在，不落盘）
const runner = new AgentRunner({
  reader, wallet,
  aesKeyHex: eciesDecrypt(attrs.eciesEncryptedKey, key.privateKey),
})
```

> 网关不可用时，Studio 会**本地兜底**生成密钥对（`payload_key_mode = 'local'`，平台不托管）并在发布成功后
> 立即下载私钥；此时改用 `unpack` / `aesKeyHex` 传入该本地私钥即可（`by-agent` 导出对它是 404）。

#### 前置条件与失败语义

| 项 | 说明 |
|---|---|
| 确定性签名 | 必须满足 RFC 6979（MetaMask / Ledger / Trezor 满足；部分 MPC / 托管钱包不满足），v1 的 `personal_sign` 与 v2 的 `eth_signTypedData_v4` 同样适用。非确定性钱包一旦发布，Agent 就再也解不开（**静默数据损坏**），故 `deriveKeyPairFromWallet()` 自 0.19.0 起**默认开启** `assertDeterministic`（多一次签名提示）；确认签名为确定性时可显式关掉。**v3 不涉及签名，此约束不适用** |
| 域隔离 | 派生载荷只在 Actora 使用：任何能让同一地址对**同一载荷**签名的场景都等价于拿到内容密钥；换地址即失效。v1 是自由文本（任何站点都能复现该提示词）；**v2 的 EIP-712 `domain` + `types` 让钱包渲染结构化、带域分隔符的请求**，比盲签可辨；**v3 由浏览器按 RP ID 强制隔离**（换域即换密钥空间，无需依赖文案） |
| ⚠️ 签名路径的固有边界（v1 与 v2 同样适用） | **只要 IKM 来自签名，「公开 / 无时效 / 可复用」就是必然代价**：文案与 typed data 都是公开常量，钓鱼站让用户签同一份载荷即可派生出其 payload 私钥，配合公开的 `encryptedPayloadCid` 解开私有载荷。这不是 v1 的 bug，换编码消不掉 —— 加时间戳 / nonce 会**直接让密钥不可复原**（载荷永久解不开），所以「抗重放」与「可复原」在这条路径上互斥。**在 typed data 里加「来源域名」字符串也不构成密码学绑定**：字段值公开可复现、当前主流钱包对离线 typed data 不做 origin 校验（origin 仅用于 UI 展示）。真正做到来源绑定需要**非签名密钥来源**：**托管密钥**或 **WebAuthn PRF（v3）** |
| 密钥来源（除签名外） | ① **托管密钥**（服务端生成密钥对，见上一节）—— 无「可复用签名」问题，因为根本没有签名；② **WebAuthn PRF（v3）** —— 非签名、由浏览器按 RP ID 绑定，见 v3 一节；③ 签名派生（v1 / v2） |
| 错误码 | 钱包不提供任何密钥来源 → `WALLET_NOT_CONNECTED`（**不再**被包成 `DECRYPTION_FAILED`）；密钥不对/密文损坏 → `DECRYPTION_FAILED`，原始错误见 `error.cause`；v3 的 PRF 失败 → `PrfError`（`error.code` 见 v3 一节，**不回退**到签名派生） |
| 订阅者能否解密 | **不能**。payload 的 AES key 由**发布时的公钥**包裹，只有持有对应私钥的发布方解得开。订阅者侧要拿到明文 prompt/skills，需走托管对话，或由发布方经 MCP 下发 |

#### 隐私边界：托管对话读的是什么

托管对话（`ConversationClient`，`agentId` 模式）由 Conversation Service 组装上下文，其 **system prompt 取公开
metadata 的 `description`（回退 `name`）**，skills 取 `metadata_json.skills` —— **不会**读取加密 payload
（见 conversation-service `agent-context-loader`）。

`metadata_json` 的**来源**需要注意：它由网关索引器写入，基底是 **`tokenURI` 解析出的 JSON**（解析器
`parseTokenURIJSON()` 只认 `data:application/json;base64,<base64>`，`ipfs://` 与普通 https URL 一律返回 `null`），
再叠加**链上 `skills` 属性**。

#### 托管对话各字段的真实来源与优先级

| 托管对话要用的字段 | 来源（前者优先） | 说明 |
|---|---|---|
| system prompt | `description` → `name` | 索引侧：`tokenURI` JSON 的 `description` → **链上 `description` 属性兜底**；都空则用 `Agent <id>`。**只取这两者，不读链上 `prompt` 属性** |
| 工具列表（skills） | `metadata_json.skills` → `metadata_json.attributes.skills` | **first hit wins，两者不合并**。顶层 `skills` 来自 `tokenURI` JSON；`attributes.skills` 来自**链上 `skills` 属性**（`SkillDef[]` 形态） |
| 市场展示（`skills` 列） | `tokenURI` JSON 的 `skills` → 链上 `skills` 属性（`string[]` 形态） | 只喂列表页，**不参与**工具构建 |

> **`tokenURI` 指向密文（`ipfs://<encryptedCid>`）既不会报错、也不会 404**：`parseTokenURIJSON()` 只是解析不到
> ⇒ `metadata_json` 基底为空，此时 `name` / `description` / `skills` **全部回落到链上属性**。
> 所以「`tokenURI` 指密文 + 明文 metadata 走链上属性」是**被正式支持**的形态（Studio 发布流程正是如此）。
>
> 若想让 `tokenURI` 改指公开 CID：生产 `IdentityRegistry` 的对外方法只有
> `register` / `registerWithMetadata` / `updateMetadata` / `getCurrentAgentId` / `agentExists` / `getAgentOwner` /
> `getAgentsByOwner` / `getAgentMetadata` / `totalAgents` —— **没有 `updateTokenURI` / `setTokenURI`** ⇒
> `tokenURI` **只在铸造时写入、之后不可改**，要换只能**重新铸造（换新 agentId）**。
> 因此**不推荐**为了读 metadata 去重铸：把 `name` / `description` 当**链上属性**补写即可，
> 与 `skills` **同一笔 `updateMetadata`** 一起写（省 gas，也不用动 tokenURI）。

可执行 skills 的公开约定如下：

| 发布方写什么 | 落到哪里 | 谁消费 |
|---|---|---|
| 链上属性 `skills` = JSON **`SkillDef[]`**（`[{ name, description, inputSchema, execution? }]`） | `metadata_json.attributes.skills` | 托管对话 → 可执行工具（`execution.type='mcp'` / `'http'` 会**真实调用**） |
| 链上属性 `skills` = JSON **`string[]`**（技能名列表） | `skills` 列（`tokenURI` JSON 里已有 `skills` 时不覆盖） | 市场展示 |
| `tokenURI` 为 base64 data URI JSON 且含 `skills` | `metadata_json.skills` | 托管对话（**优先于** `attributes.skills`，两者不合并） |

- 托管对话取值顺序：`metadata_json.skills` → `metadata_json.attributes.skills`；只有**带非空 `name` 的对象**才算技能
  定义，纯字符串数组会被跳过（不会再因 `inputSchema` 缺失而在建工具时抛错）；
- ⚠️ **链上 `skills` 属性值必须是合法 JSON 数组，且整体必须是同一种形态**：要么全是**带非空 `name` 的对象**
  （`SkillDef[]`），要么全是**非空字符串**（`string[]`）。**混入一个字符串、或有一个对象缺 `name`，整组会被判为无效并
  静默丢弃**（不会报错，表现为「工具一个都不出现」）；
- 链上属性**无长度/条数限制**，但每条是一次 SSTORE ⇒ skills 序列化到数 KB 会显著抬高 gas；建议只公开托管对话真正
  需要的那几条（例如单个 MCP/HTTP 入口），展示用的名字列表可另走 `string[]` 形态；
- **存量 Agent 补写属性**：链上属性只能**整组覆盖**写入 —— 所有者调
  `IdentityRegistry.updateMetadata(agentId, [{ key, value }…])`（合约**没有** `setMetadata(agentId,key,bytes)` 单键方法；
  实现里会先 `delete _agentMetadataKeys[agentId]` 再写入传入数组），因此**必须把原有 `name` / `description` /
  `category` / `pricing_type` / … 全部一起重传**，只传 `skills` 会抹掉其余属性。`value` 为 `bytes`，写入时用
  `stringToHex(text)` 编码；
  **SDK 0.17.0+ 已封装**：`registry.setAttributes(agentId, { skills: [...] })` 自动读回现有属性、合并后整组写回
  （未提及的键保持原值）；需要删键时用 `registry.overwriteAttributes(agentId, attrs[])`（整组覆盖，须自行带上全部属性）。
  写入后等网关 fallback 全量同步（`AGENTS_SYNC_INTERVAL_SEC`，默认 120s；或直接 `POST /api/v1/agents-sync`），
  再等 Conversation Service 上下文缓存 TTL（`CONTEXT_CACHE_TTL_SEC`，默认 300s）过期。
  注意：网关**未监听** `MetadataUpdated` 事件（只监听 `AgentRegistered` / `Transfer`）⇒ 属性变更只能靠上述轮询或手动触发；
- **多链（0.17.0 起）**：托管对话的 `agentId` 模式已支持 BSC / Ethereum / Base 全链。调用方**不需要、
  也无法**声明链（详见 §4「托管对话：链由平台解析」）：网关从 `agents` 表列出该 `agentId` 存在的候选链
  （按平台内部固定的链优先序：内部测试链 → 中心化 → BSC → Ethereum → Base 排序），逐链判定调用方是否拥有 / 已订阅，取**第一条放行的链**，
  并把它一路下传到 Conversation Service（SSE 单轮与后台任务两条路径都下传，后台任务在 `chat_tasks.chain` 落库）。
  因此同 ID 跨链冲突（各链独立编号，实测 BSC 与 Ethereum 都存在 id=2）不会被取错：只要你在其中一条链上有权，
  系统就会命中那条链。只读的 `GET /api/v1/agents/:id` 支持 `?chain=` 精确指定；不带时按上述优先序跨链解析
  （历史行为：只命中内部测试链 / 中心化，BSC / Base 会 404 —— 已修复）。

#### `skills[].execution`：可选，托管对话支持的类型与调用约定

`execution` **是可选字段**。**不写不影响工具被列出**——工具列表只判断「是否为带非空 `name` 的对象」，
`execution` 完全不参与过滤；但调用时固定返回一个 **`error` 对象**（不抛异常），用于「先让工具出现在列表里」：

```json
{ "error": "Skill \"<name>\" has no remote execution configured. Add execution.type=\"mcp\" with an endpoint." }
```

> ⚠️ 三条路径支持的写法**不完全相同**：
> - **托管对话（`agentId` 模式）**：读链上公开属性，`execution.type` 支持 `mcp` / `http` / `a2a`（下表）；
> - **inline 注入**（`ConversationClient` 传 `prompt` + `skills`）：走 SDK 的 `ConversationSkillDef`，
>   同样已声明 `mcp` / `http` / `a2a`（有完整类型提示）；
> - **SDK 加密发布类型**（`Skill.execution`，写入加密 payload、由本地 `AgentRunner` 解密执行）：
>   只声明 `mcp` / `a2a`。注意 **`open` 不是 `execution.type` 的取值**，它是「未配置 `execution` 时本地执行器的默认模式」。

| `execution.type` | 字段 | 平台（托管对话）侧行为 |
|---|---|---|
| `mcp` | `endpoint?`（缺省 `<gateway>/mcp`）、`toolName?`（缺省技能名） | 真实发起 JSON-RPC 2.0：`POST <endpoint>`，body `{"jsonrpc":"2.0","id":<ts>,"method":"tools/call","params":{"name":"<toolName>","arguments":<入参>}}`，取 `result.content[0].text` |
| `http` | `endpoint`（**必填**） | 真实发起 `POST <endpoint>`，`Content-Type: application/json`，**body = 模型按 `inputSchema` 产出的入参 JSON 原样**，响应按 JSON 解析后作为工具结果 |
| `a2a` | `targetAgentId?`、`skillFilter?`、`promptOverride?` | **不发起 HTTP**：返回 `{ type: 'a2a_delegation', targetAgentId, skillFilter, promptOverride, callerInput }` 作为工具结果，由上层决定是否走 A2A |
| 其他 / 不写 `execution` | — | 进工具列表；调用返回上面的 `error` 对象 |

**`http` 类型的边界（当前实现实测）**：

- **没有入参映射、没有包装**：body 就是模型给出的工具参数。要让 body 对上你 endpoint 的形状，请把
  `inputSchema.properties` **直接写成你 endpoint 期望的字段**（例：`{ question, history }`）——模型会按 schema 产出参数；
- **不注入任何鉴权头**（只有 `Content-Type: application/json`）：无签名 / JWT / 共享密钥，平台**不代理**你的鉴权，
  多轮长期接口请自备限流（平台侧无额外白名单机制，也无需登记密钥）。若要鉴权，只能把凭证放进 `endpoint` URL，
  或改用 `execution.type='mcp'` 让你的 MCP server 自行校验调用者；
- **方法固定 `POST`**，无 `method` / `headers` / 重试 / 超时的配置项；
- **超时 30 秒**（硬编码 `AbortSignal.timeout(30_000)`，`mcp` 相同）；
- **失败语义**：HTTP 非 2xx ⇒ 抛 `HTTP skill "<name>" failed: HTTP <status>`；超时 / 网络错误 ⇒ 底层 fetch 抛错。
  错误作为工具结果回给模型，**不会中断整轮对话**；
- **响应约定**：无强制结构，返回的 JSON 原样交给模型。建议返回对象而非超长文本。

因此：

- 「密文存放于 IPFS、平台与 B 端都无法解密」成立，平台侧没有任何 Agent 内容解密实现；
- 但**不要把敏感内容写进 `description`**：它以明文入库，并会作为托管对话的 system prompt 被使用；
- 真 prompt/skills 要参与托管对话有三条路：① 公开链上 `skills` 属性（推荐，人格与细节仍留在私有载荷里）；
  ② inline 模式（调用方自备 `prompt`/`skills`）；③ 自托管 Runner（持派生密钥那一侧）；
- `ConversationClient.getSessionKeyInfo()` 是 A2A **代付**的会话密钥（EIP-712 授权派生，私钥不出端侧），**与内容解密无关**。

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

### B 端开户后为什么调不通平台 LLM？

partner 租户注册时**不带套餐**（`quota_daily=0`），平台模型列表为空。两条路：先配 BYOK（`POST /api/v1/tenant/keys`，不计额度），或购买平台档位（`GET /api/v1/tenant/plans` → `POST /api/v1/payments`，`purpose='tenant-plan'`）。详见 §3.a 与 §8。

### 一个租户如何服务多个终端用户？

服务端调用时带 `X-End-User-Id: 0x<用户钱包或业务 ID>`，网关会以该地址作为计费 / 订阅判定的 subject；若传 `0x` 钱包地址，还会额外做订阅代理鉴权（该钱包的订阅决定访问权）。见 §8.1 / §8.6。

### archive RPC 的坑

- `eth_call`（读合约）与事件订阅用 publicnode 免费 RPC 即可；
- `getTransactionReceipt`（历史交易收据 / archive 查询）在 publicnode 返回 **403**；
- 换用：BSC → `https://1rpc.io/bnb`；Base → `https://mainnet.base.org`。

### nonce 缓存 / 交易重试的坑

- viem `WalletClient` 默认本地缓存 nonce，**并发或失败重试**时可能复用已用 nonce 导致 `nonce too low`；
- 串行执行交易并等待 `waitForTransactionReceipt`；失败重试前调用 `publicClient.reset()` 或在 `sendTransaction`/`writeContract` 显式传 `nonce: await publicClient.getTransactionCount({ address })`。

### Agent 发在 BSC / Ethereum / Base，托管对话会 404 吗？需要我传链吗？

**不需要传链，也不会再 404**（`0.17.0` 起）。平台侧会列出该 `agentId` 存在的候选链，逐链判定你在哪条链上有权，
取第一条放行的链并全链路沿用（详见 §4「托管对话：链由平台解析」）。

注意两条**限制**与**易混点**：

- **托管对话请求里没有 `chain` 参数**（`chat` / `stream` / `createTask` 都一样）——链是平台解析的，不是调用方声明的。
  只有只读的 `GET /api/v1/agents/:id?chain=` 可以显式指定链；
- **链上操作仍然必须明确链**：`AgentRegistry` / `SubscriptionManager` / `A2AProtocol` 都是「哪条链的合约就读哪条链」，
  而 `agentId` 是**链内编号**（各链独立，实测 BSC 与 Ethereum 都有 `id=2` 且是不同 Agent）⇒ 换链 = 换 ID，需重新铸造 / 订阅。

### 托管对话里 Agent 的工具（skills）是空的？

托管对话**不读加密 payload**，技能集取自公开 metadata：`metadata_json.skills` → `metadata_json.attributes.skills`
（见 §5.12「隐私边界」）。链上**没写公开 `skills` 属性**时，工具列表必然为空 —— 这是发布方动作，不是调用方的 bug。

发布方用 `registry.setAttributes(agentId, { skills: [...] })` 补写（SDK `0.17.0+`，见 §5.1），随后等网关同步
（`AGENTS_SYNC_INTERVAL_SEC` 默认 120s，或手动 `POST /api/v1/agents-sync`）+ Conversation Service 上下文缓存
TTL（`CONTEXT_CACHE_TTL_SEC` 默认 300s）过期。

两个最常见的「工具不出现」原因：

- 链上 `skills` 属性值**不是合法 JSON 数组**，或**混了形态**（既有对象又有字符串 / 有对象缺 `name`）⇒ 整组被静默丢弃；
- 写成了 `string[]`（技能名列表）——那只会进市场展示的 `skills` 列，**不会**变成可执行工具。

### 托管对话的 system prompt（人格）从哪儿取？需要把 tokenURI 改成公开 CID 吗？

**不需要动 tokenURI。** system prompt 由索引器按 `description` → `name` 组装（见 §5.12「各字段的真实来源与优先级」）：

- `tokenURI` 解析出的 JSON 里的 `description` 优先，**链上 `description` 属性兜底**；
- 都为空时退到 `name`（再空则 `Agent <id>`）；**不会读链上 `prompt` 属性**（想公开人格就写 `description`）。

`tokenURI` 指向密文（`ipfs://<encryptedCid>`）是**受支持**的形态，不会报错。且生产 `IdentityRegistry`
**没有 `updateTokenURI` / `setTokenURI`** ⇒ `tokenURI` 铸造后不可改，换内容只能重新铸造（换新 `agentId`）。
因此推荐做法：**不要重铸**，直接把 `name` / `description` / `skills` 一起用 `setAttributes` 写成链上公开属性——
与 `skills` 同一笔 `updateMetadata`，省 gas。

### 其他

- `agentId` 是**链内 ID**：各链独立编号（同一个数字在多条链可能是**不同的 Agent**）⇒ **链上操作**（铸造 / 订阅 / 退款 / A2A）
  必须明确链，换链 = 换 ID，需重新铸造 / 订阅；
  **托管对话是例外**：`agentId` 模式不用声明链，平台按「你在哪条链有权」自动解析（§4）；
- `SubscriptionPayments.hasAccess` 需要 `gatewayUrl`；`method: 'chain'` 需要 config 里的 `subscriptionManager`；
- 中心化 Agent 的计划价格是 `priceWei` 字符串，传给 `pay({ priceWei })` 时保持字符串避免精度丢失；
- `AgentRunner.useAgent` 需要一条**可用的解密密钥来源**：`config.unpack` / `config.aesKeyHex` / `wallet.deriveEncryptionKey()` / `wallet.getPrivateKey()`。
  **EIP-1193 注入式钱包无法导出账户私钥**，因此浏览器里必须用派生密钥路径（`useAgentRunner` 的 `encryptionKeyDerivation` opt-in，或自行实现 `deriveEncryptionKey`）——详见 §5.12；
- 密钥来源全部缺失时抛 `WALLET_NOT_CONNECTED`；密钥不匹配时抛 `DECRYPTION_FAILED`，原始错误保留在 `error.cause` 中。

---

## 8. 网关 REST API 参考（B 端接入面）

SDK 是网关 REST API 的封装；需要自行实现 HTTP 客户端（Go / Java / Python 等）时，按本节对接即可。
网关地址：`https://actora.codes`（生产）。平台侧运维视角的完整端点清单见仓库根目录 `DEPLOYMENT.md` §13。

### 8.1 鉴权头

| 头 | 取值 | 适用 |
|----|------|------|
| `X-Api-Key` | `actora_<32hex>` | **B 端主用**（租户级）。服务端存 SHA-256 摘要，旧租户回退明文校验 |
| `Authorization` | `Bearer <jwt>` | 钱包签名登录（`POST /api/v1/auth/verify`）签发的 JWT，与 `X-Api-Key` 二选一 |
| `X-End-User-Id` | `0x...` 或业务用户 ID | **代终端用户调用**：计费 / 订阅判定以该地址为 subject；`0x` 地址还会触发订阅代理鉴权 |
| `X-Admin-Key` | `<ADMIN_KEY>` | 仅平台运维（`/api/v1/admin/*`），B 端不需要 |

> `X-Api-Key` 缺失时请求会回落到 JWT 校验；两者都无 → 401。
> MCP 端点（`/mcp`、`/mcp/agent/:id`）**只接受注册用户 JWT**，不接受 API Key，B 端需自行代理。

BYOK（自带模型 Key）另用三个头逐请求覆盖：`X-LLM-Api-Key` / `X-LLM-Endpoint` / `X-LLM-Model`（`ConversationClient` 的 `llmApiKey` / `llmEndpoint` / `llmModel` 即写这三个头），此类调用 `llmSource='byok'`，**不计平台额度**。

### 8.2 认证与租户

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/auth/challenge?address=0x...` | 取登录挑战（nonce + 时间戳，5 分钟有效） |
| `POST` | `/api/v1/auth/verify` | 提交签名换 JWT；带 `intent:'partner'` 时注册 B 端租户并**一次性**返回 `api_key` |
| `GET` | `/api/v1/auth/api-key` | 取回明文 Key（**仅旧租户可用**；摘要化后的 Key 只在签发/轮换时返回） |
| `GET` | `/api/v1/tenant/me` | 档位、`quota_daily` / `quota_used`、`rate_limit_rpm` / `max_concurrent` / `parallel_tasks`、`usage_today` |
| `GET` | `/api/v1/tenant/usage?days=30` | 用量汇总（按 `key_source=platform\|byok`）+ 日粒度 timeline（`days` 1–365） |
| `GET` | `/api/v1/tenant/plans` | 可购买平台档位（含 `price_wei`，由 `price_monthly` USD 折算） |
| `POST` | `/api/v1/tenant/rotate-key` | 轮换 Key，旧 Key 立即失效，新 Key 仅返回一次 |
| `GET`/`POST`/`DELETE` | `/api/v1/tenant/keys[/:keyId]` | BYOK Key 增删查（`api_key` 密文入库） |
| `POST` | `/api/v1/tenant/keys/:keyId/validate` | BYOK Key 探活（请求 `<endpoint>/models`） |
| `GET` | `/api/v1/models` | 可用模型：`platform`（按档位过滤，需平台 Key 存在）+ `tenant_owned`（BYOK） |

### 8.3 市场与订阅

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/agents` | 市场列表，支持 `?chain=bsc\|ethereum\|base`、分页 / 标签过滤 |
| `GET` | `/api/v1/agents/:id` | 详情。缺省**跨链解析**该 ID 所属链（平台内部链优先序：内部测试链 → 中心化 → BSC → Ethereum → Base）；`?chain=` 可精确指定 |
| `GET` | `/api/v1/agents/check-subscription` | 校验订阅态（`subscriber` + `agentId`，可选 `chain`） |
| `GET` | `/api/v1/chain/health?chain=bsc` | 链索引健康（`status: ok \| degraded \| pending`） |
| `GET` | `/api/v1/chain/plans/:planId` · `/chain/total` · `/chain/agents` | 实时链上读（SDK 直读合约） |
| `GET` | `/api/v1/agents/central` | 中心化 Agent 管理（需鉴权；`CentralAgentClient` 对应） |

### 8.4 支付与计费

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/payments` | **统一下单**。`purpose` = `agent-subscription`（默认）/ `tenant-plan` / `token-pack` / `a2a`；`method` = `chain` / `fiat` / `x402` / `mpp` |
| `POST` | `/api/v1/payments/verify` | 校验链上交易并记账（`{ txHash, chain }`） |
| `GET` | `/api/v1/payments/access` | 跨轨道访问检查（链上订阅 / x402 台账 / fiat 订阅） |
| `GET` | `/api/v1/payments/info` · `/quote` | x402 发现信息（`priceWei` / `payTo` / `network`）与报价 |
| `POST` | `/api/v1/payments/a2a` · `/a2a/settle` | A2A 按次付费两段式（create → settle） |
| `POST` | `/api/v1/payments/period/authorize` · `/charge` · `GET /period/authorization` | 周期授权扣款（P4） |
| `POST` | `/api/v1/payments/mpp/open` · `/voucher` · `/topup` · `/settle` · `/close` · `GET /mpp/session` | MPP 通道（按量结算） |
| `GET` | `/api/v1/billing/balance` | 余额 / token 包余量 / Session Key 授权态（`BillingClient.getBalance`） |
| `GET` | `/api/v1/billing/token-packs` | 加油包列表（5M/$9.9、20M/$29.9、100M/$99.9，30 天有效） |
| `GET`/`POST` | `/api/v1/billing/agent-wallets` | agent 自主 MPC 钱包绑定 / 解锁 / 解绑（A2A 自动代付） |
| `GET` | `/api/v1/x402/info` · `/balance` · `/paywall` | x402 支付发现与台账（公开 / 租户） |

**`purpose` 与关键字段**：

```jsonc
// 1) 购买平台档位（partner 开通平台 LLM）
POST /api/v1/payments
{ "method": "chain", "purpose": "tenant-plan", "tenantPlanId": "<plans.id>",
  "subscriber": "0xWallet", "chain": "bsc", "txHash": "0x..." }

// 2) 购买 token 加油包（超出日额度后自动消耗，先到期先用）
{ "method": "chain", "purpose": "token-pack", "packId": "<pack id>",
  "subscriber": "0xWallet", "chain": "bsc", "txHash": "0x..." }

// 3) 订阅链上 Agent（原生币 / ERC20）
{ "method": "chain", "purpose": "agent-subscription",
  "agentId": 1, "planId": 2, "subscriber": "0xWallet", "chain": "base", "txHash": "0x..." }
```

### 8.5 托管对话与任务

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/agent/runs` | 执行 Agent（SSE 流式返回；`ConversationClient.chat/stream` 对应） |
| `POST` | `/api/v1/chat/completions` | 平台 / BYOK LLM 直连对话（计费入口，OpenAI 兼容请求体） |
| `POST` | `/api/v1/sessions` · `GET /api/v1/sessions/:id` | 会话管理 |
| `POST` | `/api/v1/tasks` · `GET /api/v1/tasks/:id` · `POST /api/v1/tasks/:id/cancel` | 异步任务（`parallel_tasks` 关闭时返回 403 `PARALLEL_TASKS_DISABLED`） |
| `POST` | `/api/v1/a2a/tasks/:id/resume` · `/retry` · `GET /a2a/task-result/:taskId` | A2A 委派任务续跑 / 重试 / 取结果 |
| `GET` | `/api/v1/a2a/session-key/info` | Session Key 授权状态（`balanceReturnEnabled` 等） |
| `POST` | `/api/v1/a2a/session-key/create` · `/revoke` | 创建 / 撤销 Session Key（自动代付） |

**链不用你传**：`POST /api/v1/agent/runs` 与 `POST /api/v1/sessions/:id/tasks` 都**不接受**调用方指定链，
平台自行按上文的多链解析判定（列出该 `agentId` 的候选链 → 取你在其中**有权的那条**），并把该链下传给执行侧
取 Agent 上下文；后台任务会把判权链落库（`chat_tasks.chain`）以保证后台执行时刻用同一条链。
只读的 `GET /api/v1/agents/:id` 支持 `?chain=` 显式指定链（用于展示 / 调试）。

### 8.6 计费与配额语义

- **两条 Key 来源**：`platform`（平台 LLM，按 `quota_daily` 扣 token，超出后消耗 token 包）/ `byok`（自带 Key，不计费）；用量日志按 `key_source` 分组。
- **额度耗尽**：返回 **402**（`QUOTA_EXHAUSTED`），Session Key 自动代付任务会被挂起为 `awaiting_payment`，24 小时内充值即可续跑。
- **限流**：默认 partner `5 rpm` / 并发 `1`；购买档位后按档位生效。超限返回 **429**。
- **`X-End-User-Id`**：同一把租户 API Key 可服务多个终端用户，计费与订阅判定按该地址归属，是 B 端「一次接入多用户」的标准做法。

### 8.7 常见错误码

| 状态 | 含义 | 处理建议 |
|------|------|----------|
| 401 | Key / JWT 缺失或失效 | 检查 `X-Api-Key`；若被轮换需换新 Key |
| 402 | 额度耗尽 / 订阅过期 | 购档位或加油包；x402 任务等待充值 |
| 403 | 租户被 suspend / 能力未开通；或**对目标 Agent 无归属 / 无有效订阅**（`AGENT_ACCESS_DENIED`） | 查 `GET /tenant/me` 的 `status`；`PARALLEL_TASKS_DISABLED` 时降级为 `chat()`；`AGENT_ACCESS_DENIED` 则确认该钱包在 Agent **所在链**上确实拥有 / 已订阅（多链下无需自己判断是哪条链，平台会逐链判定） |
| 404 | 路径或资源不存在（含 Key 摘要不可读回）；`GET /agents/:id` 时表示**该 ID 在你指定的链上不存在**（`?chain=` 指定时），或不带 `chain` 时**所有候选链都没有该 ID** | 核对端点；Key 丢失只能轮换；Agent 详情可先不带 `?chain=` 让平台跨链解析 |
| 429 | 触发限流 | 指数退避重试 |
| 503 | 链未开通 / 索引不可用 | 先调 `GET /api/v1/chain/health?chain=`，`pending` 表示该链未部署 |

### 8.8 B 端上线检查清单

1. `POST /api/v1/auth/verify`（`intent:'partner'`）建租户，**立即落库 `api_key`**；
2. `GET /api/v1/tenant/me` 确认档位 / 限流；未购档位则先配 BYOK（`POST /api/v1/tenant/keys`）跑通链路；
3. 需要平台 LLM → 购档位（`GET /tenant/plans` + `POST /api/v1/payments`，`purpose='tenant-plan'`）；
4. 需要链上 Agent → 选链（`GET /api/v1/chain/health` 探活）→ 订阅（`SubscriptionManager` / `SubscriptionPayments`）；
5. 服务端调用一律带 `X-Api-Key` + `X-End-User-Id`，并实现 401/402/429/503 的重试与降级；
6. 监控 `GET /api/v1/tenant/usage` 与 `GET /api/v1/billing/balance`，避免线上断供；
7. 托管对话**不要传链**（也没有该参数）：传 `agentId` 即可，BSC / Ethereum / Base 的 Agent 由平台自动解析
   （§4）；若收到 403 `AGENT_ACCESS_DENIED`，先确认该钱包在 Agent 所在链上确实拥有 / 已订阅；
8. 若需 Agent 的可执行工具生效，确认发布方已用 `registry.setAttributes(agentId, { skills: [...] })`
   补写公开 `skills` 属性（§5.12 / FAQ），否则技能集恒为空。

---

## 9. 版本记录

| 版本 | 要点 |
|------|------|
| 0.12.0+ | **BSC 多链**：`KNOWN_CHAINS` 增加 chainId 56（BSC 主网，Agent 市场开通），链上模块全链通用 |
| 0.13.0 | **ETH / Base 预留**：`KNOWN_CHAINS` 增加 1 / 8453 占位条目（合约未部署） |
| 0.14.0 | **ETH 开通**：Ethereum 主网合约部署（SubscriptionManager block 25992521） |
| 0.15.0 | **Base 开通**：Base 主网合约部署（SubscriptionManager block 51401326） |
| 0.15.1 | **Base 地址修正**：按 `broadcast/DeployBase.s.sol/8453/run-latest.json` 的 contractName 映射修正 Base 合约地址（SubscriptionManager 修正为 `0x0f129e...`） |
| 0.15.2 | **B 端接入文档/样例**：README 彻底重写（多链市场、接入全流程、模块参考、FAQ）；`examples/` 随包发布（`mint-and-subscribe` / `conversation-bend` / `central-agent-bend`） |
| 0.15.3 | **USDT/USDC 计价**：BSC/ETH/Base 三链 `SubscriptionManager` 登记 USDT/USDC 白名单；README 补稳定币地址表、精度差异（BSC 18 / ETH·Base 6）与 ERC20 订阅要点；`mint-and-subscribe` 支持 `PAY_TOKEN=usdt/usdc` |
| 0.16.0 | **浏览器钱包（EIP-1193）发布/运行打通**：`derivePrivateKeyFromSignature` / `deriveKeyPairFromWallet`（personal_sign + HKDF-SHA256）、`useAgentRunner` 的 `encryptionKeyDerivation` opt-in、`AgentRunnerConfig.unpack?/aesKeyHex?` 与 `WalletSigner.deriveEncryptionKey?()` 密钥注入；错误语义修正（`WALLET_NOT_CONNECTED` 不再降级为 `DECRYPTION_FAILED`，`DECRYPTION_FAILED` 携带 `cause`）；README 新增 §5.12 与托管链路隐私边界说明 |
| 0.17.0 | **链上属性写入助手**：`registry.setAttributes()`（读回合并后整组写回，补写公开 `skills` 不必手写合约调用）/ `overwriteAttributes()` / `toAttributes()`；配套**托管对话多链修复**（`agentId` 模式的 BSC / Ethereum / Base 404 与 403，见 §5.12） |
| 0.17.1 | **DX 修复**：`eciesDecrypt()` / `unpackAgent()` / `getPublicKey()` 的 `privateKey` 接受可选 `0x` 前缀（此前抛底层库的模糊错误），非法格式时报 `Invalid private key: expected 32-byte hex…`；`UPGRADE.md` 加入 npm 包 `files`（此前包内缺失）；修正 `package-lock.json` 残留旧包名 `@agentxv2/sdk`。**无 API 破坏** |
| 0.18.0 | **payload 密钥派生 v2（EIP-712）**：`encryptionKeyDerivation: { mode: 'eip712-hkdf' }` 与 `deriveKeyPairFromWallet({ mode, signTypedData })`，把「被签的东西」从自由文本换成 EIP-712 typed data（`buildPayloadKeyTypedData` + `DEFAULT_EIP712_*`），HKDF 构造与 IKM 不变、`infoPrefix` 版本化为 `agent-payload-encryption/v2`；**v1（`personal-sign-hkdf`）保留且行为不变**，旧档案继续可解 |
| 0.19.0 | **密钥来源与发布护栏**：① 托管密钥（服务端生成密钥对）写成**受支持的一等用法**（含安全建议 / 不可迁移性）；② `deriveKeyPairFromWallet()` 默认开启 `assertDeterministic`（可关）并新增默认开启的 `selfCheck`；③ `publishAgent({ verifyWithPrivateKey })` **铸造前** dry-run 解包校验（含 v1/v2 mode 用错）；④ 新增跨实现的派生绑定字段 `payload_key_mode`（`PAYLOAD_KEY_MODE_ATTRIBUTE` / `readPayloadKeyMode()` / `isDerivationMode()` / `AgentRegistry.setPayloadKeyMode()`）；⑤ README 明确「签名路径固有边界」并收回 v2「来源可验证」的过度声明。**若发布流程依赖单次签名提示，请显式传 `assertDeterministic: false`** |
| 0.20.0 | **payload 密钥派生 v3（WebAuthn PRF，非签名）**：新增 `mode: 'webauthn-prf-hkdf'`，IKM 改为 WebAuthn PRF 扩展输出（32 字节，由浏览器按 RP ID 绑定），HKDF 构造与 v1/v2 逐字节一致、`infoPrefix` 版本化为 `agent-payload-encryption/v3`；配套 `getPrfCapability()`（不弹窗探测）/ `createPrfCredential()` / `evaluatePrf()` / `PrfError`（`PRF_UNSUPPORTED` 等 4 码，**不支持时报可操作错误、绝不静默回退到签名派生**）；派生入口新增 `derivePrivateKeyFromIkm()` 与 `DEFAULT_PRF_SALT` / `DEFAULT_DERIVATION_INFO_PREFIX_V3`；新增 credential 绑定字段 `payload_key_credential`（`PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE` / `serializePayloadKeyCredential()` / `readPayloadKeyCredential()` / `AgentRegistry.setPayloadKeyCredential()`）。**v1/v2 保留且行为不变**，默认值不变、v3 为 opt-in |
| 0.20.1 | **纯文档**：§5.12 新增「选型：四条路径怎么选」矩阵（v1 / v2 / v3 / 私钥托管并列对照），并明确「Runner 跑在服务端 ⇒ 私钥托管可完全规避 WebAuthn/PRF 的兼容性问题」及其代价（信任边界转移、不可轮换、丢失即永久解不开、提供的是服务端鉴权而非客户端自持 + 域绑定）。**无代码 / API / 行为变更** |

---

## 附录：可运行示例

见 [`examples/`](./examples/README.md)：

- `examples/mint-and-subscribe.mjs` —— 链上完整流程（选链 → 铸造 → 建计划 → 订阅 → 验证）
- `examples/conversation-bend.mjs` —— B 端托管对话（chat + stream，BYOK）
- `examples/central-agent-bend.mjs` —— 中心化市场（list / create / createPlan）
