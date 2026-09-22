# @actora/sdk v0.15.3

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

### 各链完整合约地址（6 个核心合约）

4 条市场链（OxaChain / BSC / Ethereum / Base）均已部署全套 6 个合约，可直接用于链上铸造 / 订阅 / A2A。下表与 `KNOWN_CHAINS[chainId].contracts` 一一对应：

| 合约 | OxaChain (19505) | BSC (56) |
|------|------------------|----------|
| IdentityRegistry | `0xbf5F9db266c8c97E3334466C88597Eb758AfE212` | `0xeF96D883e1082E3e102d925c8190A13EEC1ffF33` |
| SubscriptionManager | `0x019AC9d945467478Dd371CDbD70cb2f325800E6B` | `0x6f18Aa693e5062Ef98bBA5A865F225f2e652DF6b` |
| A2AProtocolRegistry | `0x7F42a7dC4A0F3C107664C3750bE1B5B6fa6BEb86` | `0x842F0B9E85f5aBd9752B5ea20Cc888b94dBb5E16` |
| ReputationRegistry | `0x6a18C2664E1b42063860d864b6448b824d7B843F` | `0xBaDB0F3956252DE6e31aE749245E8bA6Fda288ee` |
| ConfigurationRegistry | `0x07280674ccc2898Fd038A9e3C22005CA83ffD2F8` | `0xd9B984cF591dc1C3663991e7D75c44C2bDE1a9BB` |
| MultiEndpointRegistry | `0xB361d04F49000013FC131D3C59C41c8486C64f8c` | `0x80Bc36634693d7935109f5cdbc95E64a9c1bdA6a` |

| 合约 | Ethereum (1) | Base (8453) |
|------|---------------|-------------|
| IdentityRegistry | `0xb38BC382aA438F8B4f0BFA902041330Bc14DD02e` | `0x37f3919D64d648ddF70747e159fd9A1c6890CA3b` |
| SubscriptionManager | `0x7b4002a416E9c0cA68d7dEDc6c734CFab4D396FE` | `0x0f129e8C31Dd7642cd7e852fBf682fCb75104b29` |
| A2AProtocolRegistry | `0x09f6C8f9AE6CEf12C4a078c91aeb2EcCb7CbD012` | `0x2172145F2A8f7A66019A4F4048Af46844243607E` |
| ReputationRegistry | `0x72C1236bc425b1A6129b76400aE7b26c1fbFAeFE` | `0x3f30d87BDFFa66f0e4664F1cE65a0e3a91FB4A9e` |
| ConfigurationRegistry | `0x2Bf6962301164A301e4fEC9036aB97edcBcE1bCa` | `0x5EF8c35738311B971A64de64487E1E304Ae53993` |
| MultiEndpointRegistry | `0xE93fbED3Df2a5D357856f2f2712B3c1Ebb8d026f` | `0xB8065829dBb450B8fC7375D910521EA641EC6Ee5` |

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
npm install @actora/sdk@0.17.0
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

// 原生币计划（OXA / BNB / ETH）
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

- 原生币计划：`price` 为该链原生代币的 wei（OXA / BNB / ETH）；
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
- **`derivePrivateKeyFromSignature(signature, address, params?)`** / **`deriveKeyPairFromWallet({ signMessage, address, … })`** —— 浏览器钱包密钥派生（personal_sign + HKDF-SHA256，见 §5.12）
- **`generateAesKey()`**；高级封装：`encryptPayload / decryptPayload / packAgentForPublish / publishAgent / unpackAgent`

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
> （EIP-1024）已废弃且仅 MetaMask 实现。浏览器端的可行路径是**从确定性签名派生一把独立的 payload 密钥**。

#### 派生规则（冻结契约）

```
signature  = personal_sign(message)                       // 65 字节，要求 RFC 6979 确定性
privateKey = HKDF-SHA256(IKM = signature,
                         salt = "actora/expert-enc",
                         info = "agent-payload-encryption/v1/<地址小写>")[retry:i]
publicKey  = 未压缩公钥（0x04 + 128 hex）→ 传给 publishAgent
```

- 账户私钥**永不离开钱包**；派生私钥只存在于内存，不落盘、不上传；解密时用同一钱包对同一文案再签一次即可重现；
- `message` / `salt` / `infoPrefix` / 发布地址**任一变化都会让已发布的 payload 永久解不开**——上线前冻结这四项，
  文案按**字节**冻结（不要本地化、不要改空格）；
- 越界（HKDF 输出非合法 secp256k1 标量）时按 `info + "/retry:<i>"` 重试，首次命中的方案即冻结方案。

#### 发布（浏览器）

```ts
import { deriveKeyPairFromWallet, publishAgent } from '@actora/sdk'

const { publicKey } = await deriveKeyPairFromWallet({
  signMessage: (message) => walletClient.signMessage({ account, message }),
  address: account.address,
  assertDeterministic: true,   // 发布路径建议开启：多签一次即可拦下非确定性钱包
})

const result = await publishAgent({ agent, publicKey, uploader })
// result.encryptedCid → 链上 tokenURI；result.eciesEncryptedKeyHex → 元数据属性
```

#### 运行 / 解密（浏览器）

```tsx
const { ctx, error } = useAgentRunner({
  agentId,
  encryptionKeyDerivation: { mode: 'personal-sign-hkdf' },   // 显式 opt-in
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

#### 前置条件与失败语义

| 项 | 说明 |
|---|---|
| 确定性签名 | 必须满足 RFC 6979（MetaMask / Ledger / Trezor 满足；部分 MPC / 托管钱包不满足）。非确定性钱包一旦发布，Agent 就再也解不开，故发布路径务必开 `assertDeterministic` |
| 域隔离 | 派生文案只在 Actora 使用：任何能让同一地址对**同一字符串**签名的场景都等价于拿到内容密钥；换地址即失效 |
| 错误码 | 钱包不提供任何密钥来源 → `WALLET_NOT_CONNECTED`（**不再**被包成 `DECRYPTION_FAILED`）；密钥不对/密文损坏 → `DECRYPTION_FAILED`，原始错误见 `error.cause` |
| 订阅者能否解密 | **不能**。payload 的 AES key 由**发布时的公钥**包裹，只有持有对应私钥的发布方解得开。订阅者侧要拿到明文 prompt/skills，需走托管对话，或由发布方经 MCP 下发 |

#### 隐私边界：托管对话读的是什么

托管对话（`ConversationClient`，`agentId` 模式）由 Conversation Service 组装上下文，其 **system prompt 取公开
metadata 的 `description`（回退 `name`）**，skills 取 `metadata_json.skills` —— **不会**读取加密 payload
（见 conversation-service `agent-context-loader`）。

`metadata_json` 的**来源**需要注意：它由网关索引器写入，基底是 **`tokenURI` 解析出的 JSON**（解析器
`parseTokenURIJSON()` 只认 `data:application/json;base64,<base64>`，`ipfs://` 与普通 https URL 一律返回 `null`），
再叠加**链上 `skills` 属性**。链上其他属性只有 `name` / `description` / `category` / `tags` 会作为**列**的兜底值。
可执行 skills 的公开约定如下：

| 发布方写什么 | 落到哪里 | 谁消费 |
|---|---|---|
| 链上属性 `skills` = JSON **`SkillDef[]`**（`[{ name, description, inputSchema, execution? }]`） | `metadata_json.attributes.skills` | 托管对话 → 可执行工具（`execution.type='mcp'` 会**真实调用**） |
| 链上属性 `skills` = JSON **`string[]`**（技能名列表） | `skills` 列（`tokenURI` JSON 里已有 `skills` 时不覆盖） | 市场展示 |
| `tokenURI` 为 base64 data URI JSON 且含 `skills` | `metadata_json.skills` | 托管对话（**优先于** `attributes.skills`，两者不合并） |

- 托管对话取值顺序：`metadata_json.skills` → `metadata_json.attributes.skills`；只有**带非空 `name` 的对象**才算技能
  定义，纯字符串数组会被跳过（不会再因 `inputSchema` 缺失而在建工具时抛错）；
- `execution` 缺失的技能**仍会进工具列表**，但调用固定返回 `{"error":"Skill \"x\" has no remote execution configured…"}`；
  `execution.type='mcp'` 真实发起 JSON-RPC `tools/call`（`endpoint` 缺省 `<gateway>/mcp`、`toolName` 缺省技能名，
  **不注入任何鉴权头** —— 需要鉴权请把凭证放进 endpoint URL）；
- 链上属性**无长度/条数限制**，但每条是一次 SSTORE ⇒ skills 序列化到数 KB 会显著抬高 gas；建议只公开托管对话真正
  需要的那几条（例如单个 MCP 入口），展示用的名字列表可另走 `string[]` 形态；
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
- **多链（0.17.0 起）**：托管对话的 `agentId` 模式已支持 OxaChain / BSC / Ethereum / Base 全链。调用方**不需要**
  声明链：网关从 `agents` 表列出该 `agentId` 存在的候选链（按 `oxachain → central → bsc → ethereum → base`
  排序），逐链判定调用方是否拥有 / 已订阅，取**第一条放行的链**，并把它一路下传到 Conversation Service
  （SSE 单轮与后台任务两条路径都下传，后台任务在 `chat_tasks.chain` 落库）。
  因此同 ID 跨链冲突（各链独立编号，实测 oxachain 与 bsc 都存在 id=2）不会被取错：只要你在其中一条链上有权，
  系统就会命中那条链。若显式传 `chain` 则只判该链。`GET /api/v1/agents/:id` 亦支持 `?chain=`；不带时按上述
  优先序跨链解析（历史行为：只命中 `oxachain` / `central`，BSC / Base 会 404 —— 已修复）。

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

### 其他

- `agentId` 是**链内 ID**：跨链不通用，切链后需重新铸造/订阅；
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
| `GET` | `/api/v1/agents` | 市场列表，支持 `?chain=oxachain\|bsc\|ethereum\|base`、分页 / 标签过滤 |
| `GET` | `/api/v1/agents/:id` | 详情。缺省**跨链解析**该 ID 所属链（`oxachain → central → bsc → ethereum → base` 优先序）；`?chain=` 可精确指定 |
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
  "subscriber": "0xWallet", "chain": "oxachain", "txHash": "0x..." }

// 2) 购买 token 加油包（超出日额度后自动消耗，先到期先用）
{ "method": "chain", "purpose": "token-pack", "packId": "<pack id>",
  "subscriber": "0xWallet", "chain": "oxachain", "txHash": "0x..." }

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
| 403 | 租户被 suspend / 能力未开通 | 查 `GET /tenant/me` 的 `status`；`PARALLEL_TASKS_DISABLED` 时降级为 `chat()` |
| 404 | 路径或资源不存在（含 Key 摘要不可读回） | 核对端点；Key 丢失只能轮换 |
| 429 | 触发限流 | 指数退避重试 |
| 503 | 链未开通 / 索引不可用 | 先调 `GET /api/v1/chain/health?chain=`，`pending` 表示该链未部署 |

### 8.8 B 端上线检查清单

1. `POST /api/v1/auth/verify`（`intent:'partner'`）建租户，**立即落库 `api_key`**；
2. `GET /api/v1/tenant/me` 确认档位 / 限流；未购档位则先配 BYOK（`POST /api/v1/tenant/keys`）跑通链路；
3. 需要平台 LLM → 购档位（`GET /tenant/plans` + `POST /api/v1/payments`，`purpose='tenant-plan'`）；
4. 需要链上 Agent → 选链（`GET /api/v1/chain/health` 探活）→ 订阅（`SubscriptionManager` / `SubscriptionPayments`）；
5. 服务端调用一律带 `X-Api-Key` + `X-End-User-Id`，并实现 401/402/429/503 的重试与降级；
6. 监控 `GET /api/v1/tenant/usage` 与 `GET /api/v1/billing/balance`，避免线上断供。

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

---

## 附录：可运行示例

见 [`examples/`](./examples/README.md)：

- `examples/mint-and-subscribe.mjs` —— 链上完整流程（选链 → 铸造 → 建计划 → 订阅 → 验证）
- `examples/conversation-bend.mjs` —— B 端托管对话（chat + stream，BYOK）
- `examples/central-agent-bend.mjs` —— 中心化市场（list / create / createPlan）
