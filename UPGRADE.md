# @actora/sdk Upgrade Guide

## v0.20.5 → v0.20.6（2026-10-24，建议升级）

> 主题：**品牌与合约地址对齐**——支付引擎包名由已退役的 `@0xinfrax/payments` 迁到
> `@keelcodes/payments ^0.3.1`（公开 API 逐字节一致，仅包名 / 命名空间变更），并同步
> `ReputationRegistry` 的 canonical 部署。

- **依赖**：`@0xinfrax/payments ^0.3.0` → `@keelcodes/payments ^0.3.1`；`PAYMENT_VERSION = '0.3.1'`。
  调用 `X402Client` / `PaymentsClient` / `A2AClient` / `PeriodClient` 的代码无需修改。
- **合约地址**：`KNOWN_CHAINS` 中 BSC / Ethereum 的 `reputationRegistry` 改为官方 canonical
  `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`（与 Base 同址）；legacy 自研注册表仅剩 Sepolia。
  `ReputationRegistry` 适配器按 `getReputationSummary` 是否存在自动识别实现，业务侧无需改代码。
- **无 API 破坏**。若项目里仍直接安装 `@0xinfrax/payments`，请一并替换为 `@keelcodes/payments`。

## payments 引擎 0.3.0（破坏性变更：移除 fiat / MPP）

> 主题：**`@keelcodes/payments` 0.2.2 → 0.3.0 删除两条 rail**（该版本号沿用旧包名 `@0xinfrax/payments`）。
> - **fiat（Stripe）**：`SubscriptionPayments.pay({ method: 'fiat' })` 保留方法签名但运行时抛错；
>   Gateway 的 `POST /api/v1/fiat/checkout`、`POST /api/v1/fiat/webhook` 返回 `410`。
> - **MPP**：`MPPClient` 不再导出，`/api/v1/payments/mpp/*` 路由已删除。
> - `PAYMENT_VERSION` 同步升为 `'0.3.0'`；`ChainKey` 直接沿用引擎的 `string`（不再自维护联合类型）。
>
> 迁移：fiat 改用 `chain` / `x402`；MPP 的高频小额场景改用 x402 余额 / period 授权。

## v0.20.x → 下一版本（未发布，破坏性变更）

> 主题：**移除 `AgentWalletConfig`（agent 自主 MPC 钱包）**。
> 背景：MPC 钱包服务（Email 2-of-2 TSS）已全面下线，Gateway 侧 `/api/v1/billing/agent-wallets`
> 与 `agent-payers` 路由一并移除，SDK 不再提供对应客户端。

- 删除导出：`AgentWalletConfig` 及 `AgentWalletConfigOptions` / `AgentWalletStatus` /
  `AgentWalletListResult` 等相关类型。
- 迁移：删除对 `bindWallet` / `authorizePaymentSession` / `status` / `list` / `unbind` 的调用；
  A2A 自动代付改用 **Session Key** 路径（`rail: 'sessionKey'`），或由调用方自行预存 x402 台账。
- 影响面：已接入 `AgentWalletConfig` 的调用方（如 AItrader）需在升级前完成上述替换。

## v0.19.0 → v0.20.0（2026-09-25，可选升级）

> 主题：**payload 密钥派生 v3：WebAuthn PRF（`webauthn-prf-hkdf`）—— IKM 不再是签名**。
> v1/v2 的 IKM 都是签名，因此「公开 / 无时效 / 可复用」是必然代价；v3 把 IKM 换成 **WebAuthn PRF 扩展的
> 32 字节输出**，它由浏览器/认证器**按 RP ID 绑定**，无法在其他域名复现，也**不经过 EIP-1193**（无盲签提示）。
> **纯新增**：`default` mode 不变、v1/v2 行为逐字节不变，不升级也能继续用。

### 新增 1：`mode: 'webauthn-prf-hkdf'`（opt-in）

```ts
import { getPrfCapability, createPrfCredential, evaluatePrf, deriveKeyPairFromWallet } from '@actora/sdk'

const cap = await getPrfCapability()                 // 不弹窗；prf: 'unknown' 不等于失败
const cred = await createPrfCredential()             // residentKey + UV + PRF；credentialId 必须落盘

const { privateKey, publicKey } = await deriveKeyPairFromWallet({
  mode: 'webauthn-prf-hkdf',
  address: account.address,
  getPrfOutput: async () => (await evaluatePrf({ credentialId: cred.credentialId })).prfOutputHex,
})
```

HKDF 构造与 v1/v2 **逐字节一致**，只有两点不同：`infoPrefix` 为 `agent-payload-encryption/v3`，
IKM 是 32 字节 PRF 输出而非 65 字节签名。因此 `derivePrivateKeyFromSignature` 之外新增了通用入口
**`derivePrivateKeyFromIkm(ikmHex, address, params?)`**（v1/v2 的老入口行为不变，错误文案也不变）。

### 新增 2：零回退 —— PRF 不可用时**绝不**静默退化为签名派生

这是 v3 的核心安全语义。静默回退会让用户以为持有「passkey 绑定」的密钥，实际回到可复用签名，
比直接报错危险得多，所以一律抛 `PrfError`：

| `error.code` | 触发 |
|---|---|
| `PRF_UNSUPPORTED` | 浏览器/认证器无 PRF 扩展（**移动端钱包内置浏览器普遍如此**） |
| `PRF_CREDENTIAL_NOT_FOUND` | 凭据不在本设备（`InvalidStateError`） |
| `PRF_CANCELLED` | 用户取消 / 超时 / 凭据不存在（`NotAllowedError`） |
| `PRF_FAILED` | RP ID 不匹配（`SecurityError`）、输出长度异常等 |

**不要**把 `PrfError` 当成「可以退回 v2」的信号自动处理 —— 应把 v3 与 v2 的选择放在**发布前**
（按端侧能力决定），而不是运行时的 try/catch 降级。

### 新增 3：credential 绑定字段 `payload_key_credential`

v3 的密钥绑定 **(rpId, credentialId)**，而这两者**无法从钱包地址反推** ⇒ 必须随档案落盘，否则将来无从复现：

```ts
await registry.setPayloadKeyMode(agentId, 'webauthn-prf-hkdf')
await registry.setPayloadKeyCredential(agentId, {
  rpId: 'app.example.com', credentialId, prfSalt: DEFAULT_PRF_SALT, address: account.address,
})
readPayloadKeyCredential(await registry.getAttributes(agentId))   // 读回
PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE                                  // 'payload_key_credential'
```

### ⚠️ v3 的代价（选型必读）

- 密钥绑定 **(rpId, credential)**：**换域名、或丢失凭据 ⇒ 已发布载荷永久解不开**（`tokenURI` 铸后不可改）；
- 移动端钱包内置浏览器普遍无 WebAuthn/PRF，这类端侧请继续用 v2 或托管密钥；
- 跨设备 / 混合传输（QR）的 PRF 一致性存在公开缺陷史（如 WebKit bug 311099），故 v3 为 **opt-in**；
- v3 不需要也不使用 `assertDeterministic`（PRF 无计数器，构造上确定）。

### 升级动作

- `npm install @actora/sdk@0.20.0`；
- 若需要「非签名、来源绑定」：按 README v3 一节接入，并**同时**写 `payload_key_mode` + `payload_key_credential`；
- 若仍用 v1/v2：**无需任何改动**。

---

## v0.18.0 → v0.19.0（2026-09-25，建议升级）

> 主题：**密钥来源与发布护栏**。把「服务端生成密钥对」写成受支持的一等用法，补上三道**铸造前**护栏，
> 并提供跨实现的派生绑定字段；同时在文档里明确「签名派生路径的固有边界」（v1/v2 都适用），
> 并收回 0.18.0 README 里 v2「请求来源在钱包里可验证」的**过度声明**（该说法不成立）。
> **无 API 破坏**，但有一处**默认值变更**（见下）。

### ⚠️ 唯一的行为变更：`assertDeterministic` 默认开启

`deriveKeyPairFromWallet()` 的 `assertDeterministic` 由「默认关」改为**默认开**（多一次签名提示），
用于拦下非确定性钱包 —— 这类钱包发布的 Agent **将来必然解不开**，属静默数据损坏。
若你的发布流程必须只弹一次签名，显式传 `assertDeterministic: false`；运行侧不受影响。

### 新增 1：铸造前自检（推荐接入）

```ts
const { privateKey, publicKey } = await deriveKeyPairFromWallet({ … })

const result = await publishAgent({
  agent, publicKey, uploader,
  verifyWithPrivateKey: privateKey,   // 解不开就不上传、不铸造
})
```

`verifyWithPrivateKey` 会在**任何上传之前**用该私钥解开本次 ECIES 包裹的 AES key 并比对，
不通过直接抛错（`Pre-publish self-check failed: …`）。这也是发现 **v1/v2 mode 用错**的最省事手段 ——
`tokenURI` 铸造后不可改，用错 mode 等于永久解不开，而现象与「载荷损坏」完全一样。

另新增默认开启的 `selfCheck`（派生后 ECIES 往返自检，纯计算、无额外提示）。

### 新增 2：派生 mode 的标准绑定字段 `payload_key_mode`

```ts
await registry.setPayloadKeyMode(agentId, 'eip712-hkdf')      // 写入（走 setAttributes，读回合并）
readPayloadKeyMode(await registry.getAttributes(agentId))     // 读取 → 'eip712-hkdf' | 'personal-sign-hkdf' | undefined
isDerivationMode(value)                                       // 类型守卫
PAYLOAD_KEY_MODE_ATTRIBUTE                                    // 'payload_key_mode'
```

合约不校验该字段（它只是「宣称」值），但这是**跨实现的标准约定**：第三方 runner 据此判断该用 v1 还是 v2。
未知值 `readPayloadKeyMode()` 返回 `undefined`（**不要猜**）。

### 新增 3：文档化的「托管密钥」形态（服务化 Agent 推荐）

「密钥对由服务端生成、不经任何钱包签名」现在是**受支持的一等用法**（能力一直存在：
`publishAgent({ publicKey })` 的公钥本就是入参，`generateKeyPair()` 是公开 API），README §5.12
新增该节，含标准配置（`unpack` / `aesKeyHex`）、安全建议（KMS/HSM 存放、轮换、审计）与
**不可迁移性硬性提示**（`tokenURI` 铸后不可改 ⇒ 私钥丢失 = 载荷永久解不开）。

### 文档更正：签名路径的固有边界

README §5.12 现在明确写出：**只要 IKM 来自签名，「公开 / 无时效 / 可复用」就是必然代价**，
v1 与 v2 同样适用；加时间戳/nonce 会让密钥不可复原；在 typed data 里加「来源域名」字符串
**不构成密码学绑定**（字段公开可复现、钱包对离线 typed data 不做 origin 校验）。
同时已删除 0.18.0 README 中「v2 请求来源在钱包里可验证」这句错误表述。

### 升级动作

- `npm install @actora/sdk@0.19.0`；
- 发布流程加 `verifyWithPrivateKey`（有私钥可用时）并补写 `payload_key_mode` 属性；
- 若发布流程必须只弹一次签名 → 显式传 `assertDeterministic: false`；
- 用托管密钥的集成方：按 README「托管密钥」一节的**密钥备份与恢复**检查项自查一遍。

---

## v0.17.1 → v0.18.0（2026-09-25，建议升级）

> payload 密钥派生新增 **v2：EIP-712 模式（`eip712-hkdf`）**。把「被签的东西」从自由文本换成 EIP-712 typed data，
> **HKDF 构造与 IKM（签名 65 字节）逐字节不变**，只有「签名从哪来」变了。
> **无 API 破坏**：v1（`personal-sign-hkdf`）完整保留，默认行为不变，已发布载荷继续可解。

### 为什么要 v2

v1 的 `personal_sign` 有两个先天问题，且都无法在集成方一侧解决：

1. 钱包一律按**文本盲签**渲染 —— MetaMask / Rabby / OKX 提示「无法验证来源 / 请确认你完全理解内容并信任该站点」；
2. 文案**公开且固定、可无限复用** —— 任何钓鱼站让用户签同一串文本，即可派生出该用户的 payload 私钥、解开其加密载荷。
   改文案无用（仍是盲签），改常量等于换密钥（已发布载荷永久解不开）。

v2 用 EIP-712 typed data，钱包展示结构化、带 domain 的签名请求；同时 domain + `types` 把「同一载荷」限定为本 SDK 的固定结构。

### 变更点

- **`useAgentRunner` 的 `encryptionKeyDerivation.mode` 由字面量 `'personal-sign-hkdf'` 扩展为
  `'personal-sign-hkdf' | 'eip712-hkdf'`**，并新增 v2 专属可覆盖项 `domain?` / `types?` / `primaryType?`；
  v2 走 `walletClient.signTypedData`，派生缓存键已纳入 v2 字段。
- **`deriveKeyPairFromWallet()` 新增 `mode?` / `signTypedData?` / `typedData?`** —— 发布侧不再只能 `signMessage`；
  `mode: 'eip712-hkdf'` 时必须提供 `signTypedData`（缺失时报可操作错误）。
- **新增 `buildPayloadKeyTypedData(address, overrides?)`（根导出）** —— 构造 v2 typed data；
  `message.address` 与 HKDF `info` **同口径（小写）**，双保险。
- **新增常量 / 类型**：`DEFAULT_EIP712_DOMAIN` / `DEFAULT_EIP712_TYPES` / `DEFAULT_EIP712_PRIMARY_TYPE` /
  `DEFAULT_EIP712_PURPOSE` / `DEFAULT_EIP712_MESSAGE_VERSION` / `DEFAULT_DERIVATION_INFO_PREFIX_V2` /
  `DerivationMode` / `Eip712TypedData` / `Eip712Types` / `Eip712DerivationOverrides`。
- **`derivePrivateKeyFromSignature()` 新增可选 `params.mode`** —— 只用于选择默认 `infoPrefix`
  （`agent-payload-encryption/v1` 或 `/v2`）；不传时与 0.17.x 行为完全一致（测试有回归用例）。

### v2 默认值（冻结面 = `domain` / `types` / `primaryType` / `infoPrefix` / 发布地址）

```ts
domain      = { name: 'Actora Agent Payload', version: '2' }
types       = { PayloadKey: [
  { name: 'address', type: 'address' },   // 与 HKDF info 的地址同口径（小写）
  { name: 'purpose', type: 'string' },    // 'agent-payload-encryption'
  { name: 'version', type: 'uint256' },   // 2
] }
primaryType = 'PayloadKey'
message     = { address: <地址小写>, purpose: 'agent-payload-encryption', version: 2 }
infoPrefix  = 'agent-payload-encryption/v2'
```

> 刻意**不含时间戳 / nonce**：签名必须永远可复现，否则载荷不可复原。
> 任一冻结值变化 ⇒ 用该值发布的载荷**永久解不开**。

### 迁移动作

- `npm install @actora/sdk@0.18.0`。**既有 v1 集成零改动**：不写 `mode` 或写 `mode: 'personal-sign-hkdf'` 行为一致。
- **新档案推荐 v2**（发布侧与运行侧必须同为 v2）：
  ```ts
  const { publicKey } = await deriveKeyPairFromWallet({
    mode: 'eip712-hkdf',
    signTypedData: (typedData) => walletClient.signTypedData({ account, ...typedData }),
    address: account.address,
    assertDeterministic: true,
  })
  // 运行侧
  useAgentRunner({ agentId, encryptionKeyDerivation: { mode: 'eip712-hkdf' } })
  ```
- **已用 v1 发布的载荷继续用 v1 解**（`mode: 'personal-sign-hkdf'`）；本版本**不提供** v1→v2 自动迁移
  （`tokenURI` 铸造后不可改，重封装代价高）。同一条链上 v1 / v2 档案并存是受支持的形态。

---

## v0.17.0 → v0.17.1（2026-09-23，可选升级）

> 两处 DX 修复：解密入口放宽私钥格式；`UPGRADE.md` 随包发布（此前只在仓库里，`npm` 包内没有）。
> **无 API 破坏**（一处行为放宽，其余为包内容变化）。

### 变更点

- **`eciesDecrypt()` / `unpackAgent()` / `getPublicKey()` 的 `privateKey` 参数现在接受可选的 `0x` 前缀**
  —— 此前会把钱包 / `.env` 里直接复制出来的 `0x...` 私钥交给 noble 的 `hexToBytes`，
  抛出含义不清的 `hex string expected` 一类错误；现在两种写法等价。
- **私钥格式非法时报错改为可操作**：`Invalid private key: expected 32-byte hex (64 hex chars; "0x" prefix is optional)`
  （长度不足 / 超长 / 含非 hex 字符都会命中，不再静默透出底层库错误）。
- **`UPGRADE.md` 加入 npm 包 `files` 白名单** —— 此前文档里多处指引「见 sdk/UPGRADE.md」，
  但 `npm install` 后包内没有该文件，只能回仓库看。
- 顺带修正 `package-lock.json` 里残留的旧包名 `@agentxv2/sdk` → `@actora/sdk`。

### 迁移动作

- `npm install @actora/sdk@0.17.1`。**既有代码零改动**：裸 hex 私钥行为完全不变（已加回归测试）。

---

## v0.16.0 → v0.17.0（2026-09-23，可选升级）

> 新增链上属性写入助手：补写公开 `skills` 属性不再需要手写合约调用。**无 API 破坏**（纯附加）。
> 平台侧的「托管对话多链（BSC / Ethereum / Base）」是服务端修复，**不随 SDK 发版**，用旧 SDK 也会生效。

### 变更点

- **新增 `registry.setAttributes(agentId, patch)`** —— 读回现有链上属性 → 合并 → 整组写回
  （`IdentityRegistry.updateMetadata`），未提及的键保持原值。**推荐入口**。
- **新增 `registry.overwriteAttributes(agentId, attrs[])`** —— 整组覆盖；只在需要「删掉某个属性键」时用，
  必须自行带上全部原有属性，否则会把 `name` / `description` / `category` 等一起抹掉。
- **新增 `toAttributes(patch)`（根导出）** —— `{ key: value }` → 链上属性数组（字符串原样；
  数字 / 布尔 `String()`；数组 / 对象 `JSON.stringify`；`undefined` / `null` 跳过）。

### 迁移动作

- `npm install @actora/sdk@0.17.0`。既有代码零改动；自行实现「读回 → 合并 → 整组写回」的集成
  可直接换成 `setAttributes`，语义一致。
- 需要让托管对话把 Agent 的 `skills` 当**可执行工具**时，必须用链上**公开** `skills` 属性补写
  （托管对话不读加密 payload）；公开属性**无长度 / 条数硬限制**，但每条是一次 SSTORE，建议只放
  托管对话真正需要的那几条。生效链路：网关全量同步（`AGENTS_SYNC_INTERVAL_SEC`，默认 120s，或手动
  `POST /api/v1/agents-sync`）→ Conversation Service 上下文缓存 TTL（`CONTEXT_CACHE_TTL_SEC`，默认 300s）。
- `execution` 的三种类型与写法见 [README §5.12 隐私边界](README.md)。

---

## v0.15.3 → v0.16.0（2026-09-23，建议升级）

> 浏览器钱包（EIP-1193）在发布与运行两侧都可用了：解密密钥来源可注入，`personal_sign + HKDF-SHA256` 派生成为官方路径。
> **无 API 破坏**（纯附加 + 错误码语义修正）。

### 变更点

- **`AgentRunnerConfig` 新增可选 `unpack?` / `aesKeyHex?`** —— 由宿主决定内容密钥来源（网关下发 / 会话密钥 / HSM），`unpack` 支持异步。
  密钥来源优先级：`config.unpack` → `config.aesKeyHex` → `wallet.deriveEncryptionKey()` → `wallet.getPrivateKey()`。
- **`WalletSigner` 新增可选 `deriveEncryptionKey?()`** —— 不导出账户私钥即可提供 ECIES 解密密钥；原 `getPrivateKey?()` 语义不变（仅限自托管密钥材料）。
- **新增 `derivePrivateKeyFromSignature()` / `deriveKeyPairFromWallet()`（根导出）** —— `personal_sign` 签名 + HKDF-SHA256 派生 secp256k1 payload 密钥；
  可选 `assertDeterministic` 检测非确定性钱包（非 RFC 6979）。
- **`useAgentRunner` 新增 opt-in `encryptionKeyDerivation`**（`{ mode: 'personal-sign-hkdf', message?, salt?, infoPrefix?, maxAttempts? }`）——
  wagmi 浏览器钱包即可解密；同一地址 + 同一参数的派生结果在 hook 内缓存，不会反复弹签名。
- **错误语义修正**：解密失败时保留原始 `ActoraError.code`（`WALLET_NOT_CONNECTED` 不再被包成 `DECRYPTION_FAILED`）；
  `DECRYPTION_FAILED` 携带 `cause`（`ActoraError` 构造函数新增可选 `options.cause`）。
- **`useAgentRunner` 的 wagmi signer** 不再建议不存在的 `eth_private_key`（非 EIP-1193 标准方法），改为提示开启 `encryptionKeyDerivation`。

### 迁移动作

- `npm install @actora/sdk@0.16.0`。仅用 `getPrivateKey()` 的既有自托管集成**零改动**。
- 浏览器钱包集成：
  1. **发布侧**改用 `deriveKeyPairFromWallet({ signMessage, address, assertDeterministic: true })` 取 `publicKey`
     （`message` / `salt` / `infoPrefix` 必须冻结，否则已发布 payload 永久解不开）；
  2. **运行侧**给 `useAgentRunner` 传 `encryptionKeyDerivation: { mode: 'personal-sign-hkdf' }`，或自行实现 `WalletSigner.deriveEncryptionKey()`。
- 依赖 `error.code === 'DECRYPTION_FAILED'` 判断「钱包不支持解密」的代码，需改为判断 `WALLET_NOT_CONNECTED`（此前两者混在同一 code 内）。
- 详见 [README §5.12 浏览器钱包（EIP-1193）](README.md)。

---

## v0.11.11 → v0.11.12（2026-09-05，可选升级）

> `CentralAgentClient` 新增**鉴权发布/管理**方法：租户 `apiKey`（owner=`partner-<slug>`，平台为市场建 Agent）或注册用户 `accessToken`（owner=用户钱包）。**无 API 破坏**，纯附加。

### 变更点

- **`CentralAgentClientOptions` 新增可选 `apiKey`**（`X-Api-Key` 头；`accessToken` 继续走 `Authorization: Bearer`）。
- **`CentralAgentClient` 新增 6 个管理方法**（均需 apiKey 或 accessToken）：
  - `create({ name, description?, tags?, capabilities?, skills?, category? })` → `POST /api/v1/agents/central`（默认附一个月度计划）
  - `listMine()` → `GET /api/v1/agents/central/mine`（含订阅计划）
  - `update(agentId, { name?, description?, tags?, capabilities?, skills?, category?, isActive? })` → `PATCH`（仅更新提供字段）
  - `activate(agentId)` / `deactivate(agentId)` → 上架 / 下架（软删除，订阅访问随之失效）
  - `createPlan(agentId, { priceWei, period? })` / `deactivatePlan(agentId, planId)` → 增停订阅计划
- **新增类型**：`CreateCentralAgentInput`、`UpdateCentralAgentInput`、`CreateCentralPlanInput`、`CentralPlanRow`。

### 迁移动作

- `npm install @actora/sdk@0.11.12`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 需要程序化发布/管理中心化 Agent 的集成方使用新方法（示例见 [README · CentralAgentClient 用法](README.md)）；仅读与订阅的现有用法零改动。

---

## v0.11.10 → v0.11.11（2026-09-05，建议升级）

> 中心化 Agent（C-6，链下市场）只读客户端 `CentralAgentClient`：查询 / 订阅状态 / 我的订阅全部封装，第三方集成方（如 AItrader）无需手拼网关 URL。**无 API 破坏**，纯附加。

### 变更点

- **新增 `CentralAgentClient`**（根导出，公开只读，构造 `{ baseUrl }`）：
  - `list({ activeOnly?, category?, page?, pageSize? })` → 中心化 Agent 列表（固定 `source='central'`，与链上正 ID 天然隔离；负 ID 表示中心化 Agent）
  - `get(agentId)` → 单个详情，含 `subscriptionPlans`（`central_plans`，与链上同一响应结构，可直接喂 `SubscriptionPayments.pay`）
  - `checkSubscription(subscriber, agentId)` → 订阅状态（`resolveAccess` 链下优先，与 App 内订阅守卫同一判定）
  - `mySubscriptions(subscriber)` → 我的链下订阅（`fiat_subscriptions` / x402 通道）
- **配套 `@actora/mcp@0.1.3`**：新增 `actora_central_agent_list` / `actora_central_subscription_check` 两个读工具（工具总数 38→40），`McpClient` 新增 `centralAgents()` / `centralSubscriptionCheck()`。
- 发布中心化 Agent 仍需 JWT / 租户 Key 直调 `POST /api/v1/agents/central`（不在 SDK 客户端内封装，见下方示例）。

### 迁移动作

- `npm install @actora/sdk@0.11.11`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 需要读取/管理中心化 Agent 的集成方按 [README · CentralAgentClient 用法](README.md) 使用新客户端；现有链上用法零改动。

---

## v0.11.9 → v0.11.10（2026-09-05，建议升级）

> `SubscriptionPayments.pay` 新增可选 `priceWei`：中心化 Agent（负 ID）计划价格在链下（`central_plans`），x402 自动代付无需读链上合约价格即可按作者定价扣费。**无 API 破坏**，纯附加。

### 变更点

- **`PaySubscriptionInput` 新增可选 `priceWei: bigint`**：
  - 与 `period` 一起传入即可为中心化 Agent 支付周期订阅（day/week/month/year）；
  - 不传时行为不变（链上计划价格自动读取）。
- **`SubscriptionPeriod` 已支持 day/week/month/year**（中心化计划沿用同一周期集合）。

### 迁移动作

- `npm install @actora/sdk@0.11.10`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 无代码改动要求；中心化 Agent 订阅调用方传 `priceWei` + `period` 即可。

---

## v0.11.8 → v0.11.9（2026-08-28，建议升级）

> `AgentWalletConfig` 支持租户作用域鉴权（SK-1 下放）：`apiKey` 模式用租户 API Key 管理**自己名下 agent** 的 MPC 钱包，无需平台 ADMIN_KEY。**无 API 破坏**，纯附加。

### 变更点

- **`AgentWalletConfigOptions` 新增可选 `apiKey`**：
  - `{ baseUrl, apiKey }`：租户作用域，仅能 bind/unlock/status/list/delete **自有 agent**（`agents.owner = 租户钱包`），越权返回 403；
  - `{ baseUrl, adminKey }`：平台全量（原行为不变）；
  - 二者同时提供时优先 `adminKey`；都不提供时构造抛错。
- **Gateway 侧**：`/api/v1/admin/agent-payers` 鉴权升级为双轨（平台 ADMIN_KEY 或租户 API Key），配套服务端已部署生产。

### 迁移动作

- `npm install @actora/sdk@0.11.9`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 现有 `adminKey` 用法无需改动；租户自管 MPC 钱包改为传 `apiKey` 即可。

---

> A2A 委派 Session Key 自动扣费（AItrader REQ-1/2/3）：`ConversationClient` 新增 A2A 委派任务 / Session Key 自动代付 API。**无 API 破坏**，纯附加。

### 变更点

- **`ConversationClient` 新增 4 个方法**：
  - `getA2ATaskResult(taskId)` → `GET /api/v1/a2a/task-result/:id`，返回 `a2a_task_results` 行（含 `status`、`payment_payer/pay_to/amount_wei/ref/pending_since`、`payment_pay_options`）
  - `retryA2ATask(taskId)` → `POST /api/v1/a2a/tasks/:id/retry`，授权 Session Key 后重新激活 `awaiting_payment` 挂起任务（**不扣 ledger**，worker 重放时经 session-key 分支自动代付）；需以 `endUserId` = 任务的 `payment_payer`
  - `getSessionKeyInfo()` → 引擎能力信息（`{ enabled, chain, chainId, baseUrl }`），供端用户前端直达引擎公开 `nonce`/`createSession` 端点
  - `getBalance()` → x402 余额 + `sessionKey` 授权状态（REQ-3，同 `BillingClient` 端点但走 `ConversationClient`）
- **新增类型/常量**：`A2A_STATUS`（1 processing / 2 done / 3 error / 4 awaiting_payment）、`A2ADelegatedTaskResult`、`SessionKeyInfo`、`SessionKeyAuthStatus`、`BillingBalance`。
- 引擎未配置（或 escrow 启用）时能力优雅降级：`getSessionKeyInfo().enabled=false`、`getBalance().sessionKey={ enabled:false, authorized:false }`。

### 迁移动作

- `npm install @actora/sdk@0.11.8`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 无代码改动要求；需要 A2A Session Key 自动扣费（端用户授权代付）的调用方使用新增方法。

---

## v0.11.6 → v0.11.7（2026-08-18，建议升级）

> Agent 自主钱包 API：新增 `AgentWalletConfig`（绑定 agent 与 InfraX MPC 钱包 + 邮箱验证码解锁付款会话）+ 依赖升级 `@0xinfrax/payments@0.1.4`。**无 API 破坏**，纯附加（补 0.11.6 遗漏的 npm 发布）。

### 变更点

- **新增 `AgentWalletConfig`**（admin 鉴权，构造 `{ baseUrl, adminKey }`，`adminKey` = gateway `ADMIN_KEY`）：
  - `bindWallet({ agentId, email, walletAddress, chain? })` — 绑定 agent 与 MPC 钱包（agent_id 唯一，重复绑定覆盖）
  - `authorizePaymentSession({ agentId, email, code })` — 邮箱验证码解锁 MPC 会话（`/api/v1/admin/agent-payers/:agentId/unlock`）
  - `status(agentId)` / `list()` / `unbind(agentId)`
  - 用途：A2A 委派按次付费时，配置了自主钱包的 agent 由 gateway 服务端自动代付（agent-payer），无需用户钱包弹窗/预充值
- **依赖升级**：`@0xinfrax/payments@0.1.3 → 0.1.4`（escrow 透传 / ERC20 deposit / 402 结构化错误）；HTTP 契约与既有客户端签名不变。

### 迁移动作

- `npm install @actora/sdk@0.11.7`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 无代码改动要求；需要 agent 自主钱包（A2A 服务端代付）管理的调用方使用新增 `AgentWalletConfig`。

---

## v0.11.5 → v0.11.6（2026-08-16，建议升级）

> B 端余额预检（R19.7 companion）：新增 `BillingClient` + `GET /api/v1/billing/balance`。**无 API 破坏**，纯附加。

### 变更点

- **新增 `BillingClient`**：委派未订阅 agent（A2A 按次付费）前程序化预检 x402 余额，不再「先撞 403 再引导充值」。
  - 构造 `{ gatewayUrl, apiKey? | accessToken?, endUserId? }`（鉴权与 `ConversationClient` 一致：`X-Api-Key` 或 Bearer JWT）
  - `getBalance({ endUserId? } = {})` → `{ balance, balanceWei, currency: 'OXA', updatedAt, subject, payTo?, priceWei? }`
    - 默认查租户余额；传 `endUserId`（0x 钱包）返回该端用户余额（与 R19.7 端用户透传口径一致）
    - `balance` = OXA 高精度 decimal 字符串；`balanceWei` = 原始 wei（与 `priceWei` 精确比较）
    - **余额为 0 / 未充值：返回 `"0"`，不抛错**
    - `payTo` / `priceWei` 仅当 x402 开启时返回（充值引导用）

### 迁移动作

- `npm install @actora/sdk@0.11.6`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 无代码改动要求；需要余额预检的调用方使用新增 `BillingClient`（用法见 README「BillingClient」节）。

---

## v0.11.4 → v0.11.5（2026-08-12，建议升级）

> R19.3/R19.7 商业化闭环的 SDK 对齐版：新增 `TenantPlanPayments`（平台套餐购买）+ 服务端 A2A 按次付费。**无 API 破坏**，纯附加。

### 变更点

- **新增 `TenantPlanPayments`（R19.3）**：平台订阅套餐购买客户端，走统一支付入口 `purpose=tenant-plan`。构造 `{ gatewayUrl, chain?, accessToken? }`，`buy({ method, tenantPlanId, subscriber, txHash?|successUrl/cancelUrl })`：
  - `method: 'fiat'` → 返回 Stripe checkout `sessionUrl`（webhook 完成绑定）
  - `method: 'chain' | 'x402'` → **必须携带 `txHash`**（先发起链上支付再提交），绑定后返回 `{ tenantId, planId, planSlug, quotaDaily, txHash }`
- **服务端 A2A 按次付费（R19.7）**：未订阅 agent 时，gateway 按次扣 x402 余额（服务端 deduct + `a2a_pay_log` 审计幂等），**SDK 调用方零改动**——对话/调用自动触发，无需新增参数。
- **协议级套餐购买**：`PaymentsClient.create({ purpose: 'tenant-plan', tenantPlanId, ... })` 可直接传 `purpose` 元数据。

### 迁移动作

- `npm install @actora/sdk@0.11.5`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 无代码改动要求；需要购买平台套餐的调用方使用新增的 `TenantPlanPayments`（用法见 README「TenantPlanPayments」节）。

---

## v0.11.1 → v0.11.3（2026-08-10，建议升级）

> 跟随 `@0xinfrax/payments` `^0.1.3`（R17.6）。`SubscriptionPayments` + 协议客户端（MPP/A2A/Period/X402/Payments）**API 签名不变**，HTTP 契约不变，**无需改代码**，仅建议升级依赖。

### 为什么建议升级（尤其 ESM 调用方）

- **0.11.1 的 ESM 构建存在崩溃**：其 `dist/index.mjs` 从 `@0xinfrax/payments` 导入 `A2AClient`，而该导出在引擎 0.1.2 起已移除 → 使用 ESM 构建的调用方启动即报 `Named export 'A2AClient' not found`。
- **0.11.2 修复**：`A2AClient` 改为 SDK 本地实现（签名一致），ESM/CJS 均不再依赖该导出。
- **0.11.3（本次发布）**：引擎升至 `0.1.3`（模块内置恢复 a2a/period rails，Actora Gateway 已迁移为模块委托），`PAYMENT_VERSION` 对齐 `0.1.3`；`A2AClient` 继续本地实现。

### 迁移动作

- 锁精确版本者：`npm install @actora/sdk@0.11.3`。
- 使用 `^0.10.1` / `^0.11.x` 范围者：`npm install` 即可自动吸收。
- 若曾以 ESM 方式使用 0.11.1，请务必升到 ≥0.11.2（0.11.3 含修复）。
- `PAYMENT_VERSION` 常量由 `0.1.1` → `0.1.3`，仅当调用方断言该版本号时需要同步。

---

## v0.11.3 → v0.11.4（2026-08-11，建议升级）

> 服务端 B 端计费策略修订（R18）的 SDK 对齐版：**无 API 破坏**，纯附加 + 文档/类型同步。

### 变更点

- **服务端策略（2026-08-11 起已生效）**：B 端（partner）并行任务**不再强制 BYOK**——未传 `X-Llm-Api-Key` / `llmApiKey` / `tenantKeyId` 时自动走平台兜底 Key，平台按任务 `done` 事件 usage 精确计费（扣套餐每日配额）。原 `400 LLM_KEY_REQUIRED` 不再返回。旧版 SDK 调用方**零代码改动**（传 BYOK 的照常工作）。
- **类型补充**：`ConversationSSEEvent`（done 事件）新增可选字段 `llmSource?: 'byok' | 'platform'`——服务端计费来源标记，仅供观测/调试，客户端无需处理（计量由 Gateway 完成）。
- **文档同步**：README / UPGRADE 的「任务 LLM Key」对照已更新为「不强制；平台按 token 计费」。

### 迁移动作

- `npm install @actora/sdk@0.11.4`（或 `^0.11.x` 范围者 `npm install` 自动吸收）。
- 无代码改动要求；如使用 TS 且需要读取 done 事件的 `llmSource`，类型已就绪。

---

## 2026-08-08 — B 端集成 key 能力澄清（文档，无代码变更）

> 无需升级 SDK（npm 未发布新版本）。本说明只澄清**服务端行为**与**调用方最佳实践**，SDK API 完全不变。

### 一个 `actora_` key 即可，不需要两把 key

- **现状（2026-08-08 起）**：Gateway 对「会话 / 并行任务」的能力判定已统一为 **P9 能力位**（`effective = tenant.allow_parallel_tasks ?? plan.features.parallel_tasks ?? true`），对 B 端集成 key（`X-Api-Key: actora_...`）与注册用户 JWT（`Authorization: Bearer`）**一视同仁**。
- B 端集成 key 不再只限于对话（chat）——创建会话（`createSession`）、提交并行任务（`createTask`）、查询 / 列表 / 取消任务与注册用户**完全等价**（受同一套餐 / 租户能力位约束）。
- 不再存在 `403 PARTNER_TASKS_DISABLED`；能力位为 false 时统一返回 `403 { code: "PARALLEL_TASKS_DISABLED" }`，此时回退单轮 `chat()`。
- 仅两种场景仍需「用户身份」（设计如此，非限制遗漏）：**MCP 通道**的对话 / 任务工具（仅接受注册用户 `access_token`）与 **A2A 上链 / 发布 / 订阅**（用户自己钱包签名、自己付 gas）。

### 调用方请使用自己的 LLM Key 透传（BYOK）

任务 / 对话的 LLM 计费默认走平台兜底 key；平台推荐调用方**透传自己的 LLM key**，计费落在自己账户，三种方式：

| 方式 | SDK 用法 | 说明 |
|---|---|---|
| 无状态透传（最高优先级） | 构造 `ConversationClient({ llmApiKey, llmEndpoint, llmModel })` | 每个请求自动带 `X-Llm-Api-Key` / `X-Llm-Endpoint` / `X-Llm-Model`，key 不落盘 |
| 请求级透传 | `stream({ ..., tenantKeyId })`（v0.8.6 起） | 用已在平台 Settings 保存的租户自有 key，明文不出服务器 |
| HTTP 直接调用 | `X-Llm-Api-Key` 请求头 | 等价 SDK 的 `llmApiKey` |

> 未传任何 LLM key 时走平台兜底 key（DeepSeek / OpenAI 平台配额），受租户配额限制。
>
> ⚠️ ~~**B 端（partner）任务强制 BYOK**~~（2026-08-08 起，**2026-08-11 已废除**，见顶部 v0.11.4 说明）：partner 租户创建任务**不再强制**携带 LLM Key——未传时自动走平台兜底 Key 并按 token 计费，`400 LLM_KEY_REQUIRED` 不再返回；对话（chat）与 user 类租户不受影响。

### 端用户订阅转发（B 端代调，Gateway 2026-08-08）

B 端（partner 租户）请求带 `X-End-User-Id: 0x<钱包地址>`（或 body `endUserId`）时，网关改用该钱包做「拥有 / 订阅」授权检查，通过即放行对话 / 任务——实现「我的最终用户已订阅 → 我可代为对话」。不传或非 `0x` 地址时回退到租户自身授权；端用户记忆隔离不变。

> ⚠️ **`endUserId` 是可选字段，缺省**不会**被拒**（2026-08-08 澄清）：不传时授权主体回退为**租户自身钱包**——注册用户（kind=user）租户钱包即用户钱包，**天然可用**；partner 租户不传 `0x` 端用户钱包则**不代理**（退化为租户自身 `partner-*` 地址，非链地址无法命中链上订阅，链上授权失败时返回 `403 AGENT_ACCESS_DENIED`），但这与「缺 `endUserId` 被拒绝」语义不同——不存在「必须带 endUserId」的强制校验。非 `0x` 的 `endUserId` 仅作记忆隔离，不触发订阅转发。

### B 端 key 与用户 JWT 调用 sessions/tasks 的差异对照

两者在「会话 / 并行任务」能力判定上一致（统一 P9 能力位），其余维度差异如下：

| 维度 | B 端集成 key（`X-Api-Key: actora_...`，kind=partner） | 用户 JWT（`Authorization: Bearer`，kind=user） |
|---|---|---|
| 会话 / 并行任务（sessions/tasks） | ✅ 可用，受 P9 能力位约束（`403 PARALLEL_TASKS_DISABLED`） | ✅ 同左 |
| 授权主体（谁须「拥有 / 订阅」agent） | partner 租户自身；或 `X-End-User-Id: 0x<钱包>` 转发到端用户钱包 | 用户自己的钱包 |
| 任务 LLM Key | 不强制（2026-08-11 起）：可带 BYOK（`X-Llm-Api-Key` header / `llmApiKey` / `tenantKeyId`）；不带则走平台兜底 key，平台按 token 计费 | 不强制；未传时走平台兜底 key |
| 平台 MCP 对话 / 任务工具（`actora_gateway_*`） | ❌ 不可用（R14 拒绝 `actora_` key） | ✅ 可用（`access_token` 必填） |
| A2A 上链 / 发布 / 订阅 | ❌ 需用户钱包签名（平台不持私钥） | ✅ 用户钱包签名，用户自付 gas |
| 订阅状态查询（`GET /api/v1/chain/check-subscription`） | ✅ 可查任意钱包地址 | ✅ 同左 |

> 一句话总结：**`actora_` key 覆盖 REST 全部对话 + 并行任务（BYOK 可选，不带则平台按 token 计费），JWT 额外覆盖 MCP 对话/任务与链上操作**；调用方按自身场景选择，无需两把 key 并存。

### SDK 0.10.1 — per-request `endUserId`（已发布 npm，2026-08-08）

新增（non-breaking，`endUserId` 全程可选）：

- `ConversationChatParams.endUserId?` — `stream({ ..., endUserId })` 作为 `X-End-User-Id` header 发送（覆盖构造级）
- `ConversationCreateTaskParams.endUserId?` — `createTask({ ..., endUserId })`：请求体透传 + 仓库级加固统一以 `X-End-User-Id` header 发送（覆盖构造级；Gateway 优先 header、回退 body，老客户端 body 透传仍兼容）
- `createSession({ ..., endUserId })` 原本已支持（请求体透传）

```ts
// B 端代调：按最终用户订阅授权
const session = await client.createSession({ agentId: 42, endUserId: '0x<user-wallet>' })
const t = await client.createTask({ sessionId: session.id, agentId: 42, message: 'hi', endUserId: '0x<user-wallet>' })
```

### SDK 0.10.2 — createTask `endUserId` header 加固发版（已发布 npm，2026-08-08）

将 0.10.1 发布后的**仓库级加固**正式纳入 npm 版本（纯 patch，无行为变化，调用方零改动）：

- `createTask()` 的 per-request `endUserId` 与 `stream()` 机制完全一致——统一以 `X-End-User-Id` header 发送（覆盖构造级）。0.10.1 的已发布版本走请求体透传（Gateway 优先 header、回退 body），两版行为兼容
- 文档同步：`tenantKeyId` **严格按租户隔离**——Key 轮换 / 切换租户后必须用新 Key 重新调 `POST /api/v1/tenant/keys` 存 BYOK 并更新 `tenantKeyId`，沿用旧租户的 ID 会报 `400 Tenant API key not found or inactive`

### SDK 0.10.3 — exports 暴露 `./package.json`（已发布 npm，2026-08-08）

纯元数据 patch，无行为变化：

- `exports` 新增 `"./package.json": "./package.json"`——此前 `require('@actora/sdk/package.json')` 报 `ERR_PACKAGE_PATH_NOT_EXPORTED`（exports 模式下未列出的子路径全部禁止），现在可直接读取版本：`require('@actora/sdk/package.json').version`
- 对调用方无影响（正常 API 子路径不变）；仅为工具链 / 运维提供版本读取能力

---

## v0.9.6 → v0.10.0 (完整功能版)

### What's New

`0.10.0` is the **complete feature release** — it consolidates the entire 0.9.x line (Agent application categories / unified three-rail payments / sessions & parallel tasks / streaming tool_call fix / typed on-chain approval) into a stable baseline. Released via `npm version minor` (not a patch) to avoid version clutter.

| Feature | Description |
|---------|-------------|
| **Complete release baseline** | Same code as 0.9.6, but published as a minor release to signal the stable, feature-complete SDK baseline. Integrators should pin `@actora/sdk@0.10.0`. |
| **Typed `onchain_approval_required` event** | `ConversationSSEEvent.type` now includes `'onchain_approval_required'`, carrying `approval?: OnChainApprovalRequest { targetAgentId, taskType, inputData }`. Raised when the agent requests an **auditable on-chain A2A delegation** — the **user's own wallet** must submit `createTask` (the user pays the gas and becomes the on-chain client). The platform never pays gas and holds no signing key (`A2A_WORKER_PRIVATE_KEY` removed from the Gateway). |
| **User-wallet-signed on-chain rail** | v0.10.0 gas model: on-chain rail costs are never paid by the platform. When the user explicitly requests audit / settlement, the Conversation Service emits `onchain_approval_required`, the frontend opens a wallet modal, and the user's wallet signs `createTask`. Sub-tasks spawned by the a2a-worker run **off-chain inline** (local negative pseudo taskIds). |
| **No breaking changes** | Everything is additive. 0.9.x consumers can upgrade in place. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.10.0   # or: npm install @actora/sdk (latest = 0.10.0)
```

> The Gateway + Conversation Service must run the matching server release for the user-wallet-signed on-chain orchestration rail (2026-08-08).

---

## v0.9.4 → v0.9.5

### What's New

| Feature | Description |
|---------|-------------|
| **Fix: streaming tool_call parameter deltas dropped** | DeepSeek / OpenAI streaming `tool_calls` chunks only carry an `index` on argument-delta chunks (the first chunk carries the `id`). The SDK previously built `callId` as `tc.id ?? call_${tc.index}`, which stopped matching the `tool_call_start` id on later deltas — so **accumulated tool arguments were silently discarded** and tool calls failed with incomplete/malformed arguments. Both `GatewayProvider` and `OpenAIProvider` now maintain an `index → id` map, so argument deltas attach to the real call id and all parameters are preserved. |
| **No breaking changes** | Pure bug fix. `LLMProvider` stream event contract unchanged. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.9.5   # or: npm install @actora/sdk (latest = 0.9.5)
```

### Related: server-side orchestration layering

No SDK API change, but the Conversation Service now defaults multi-agent orchestration to the **off-chain rail** (`actora_delegate`, synchronous, zero cost) and only uses the **on-chain rail** (A2A task with `taskId` audit trail) when the user explicitly requests audit / settlement. See the SDK README → *Multi-Agent Orchestration Layering*.

---

## v0.9.3 → v0.9.4

### What's New

| Feature | Description |
|---------|-------------|
| **Agent application categories** | `AgentPayload` gains an optional `category` field typed as `AgentCategory` (one of `AGENT_CATEGORIES` — 13 enums: `operations` / `customer-service` / `sales` / `personal-assistant` / `coding` / `server-monitoring` / `airdrop` / `quant-trading` / `data-analysis` / `content` / `security` / `finance` / `other`). `publishAgent` writes it into the public metadata + on-chain attrs; `getAllAgents()` / `getAgentMetadata()` resolve `category` (tokenURI JSON first, on-chain attrs fallback). The Actora Studio UI now requires it; Marketplace filters by it. |
| **Payments engine 0.2.2** | `@0xinfrax/payments` `^0.2.0` now resolves to **0.2.2** (ownership metadata: `author` / `repository` / `homepage` on the npm package — no code / API change). |
| **No breaking changes** | Everything is additive. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.9.4   # or: npm install @actora/sdk (latest = 0.9.4)
```

The Gateway + Conversation Service must run the matching server release for `category` filtering and the off-chain orchestration tools (`actora_list_agents` / `actora_delegate`).

### Publish with a category

```ts
import { publishAgent, AGENT_CATEGORIES } from '@actora/sdk'

const result = await publishAgent({
  agent: {
    name: 'Airdrop Hunter',
    description: 'Monitors and reports new airdrop opportunities on-chain.',
    category: 'airdrop',                    // ← new: application category (AGENT_CATEGORIES value)
    // ... rest of the AgentPayload unchanged
  },
  publicKey,
  uploader,
})
```

### Related: server-side orchestration layering

No SDK API change, but the Conversation Service now defaults multi-agent orchestration to the **off-chain rail** (`actora_delegate`, synchronous, zero cost) and only uses the **on-chain rail** (A2A task with `taskId` audit trail) when the user explicitly requests audit / settlement. See the SDK README → *Multi-Agent Orchestration Layering*.

## v0.9.2 → v0.9.3

### What's New

| Feature | Description |
|---------|-------------|
| **Generic engine 0.2.0** | `@0xinfrax/payments` upgraded to `^0.2.0` — adds **MPP payment channels**, **stablecoin rails (EIP-3009 / Permit2)**, **period authorizations** (one-time N-period pre-authorization, no re-signing) and **a2a-pay** (two-phase paymentId). |
| **New protocol clients re-exported** | `MPPClient` (open/voucher/topUp/settle/close), `A2AClient` (create/settle), `PeriodClient` (charge/authorization), plus `X402Client` / `PaymentsClient`, are now exported from the SDK root for integrators who drive those rails directly. |
| **No breaking changes** | `SubscriptionPayments` API is unchanged (chain / fiat / x402 / hasAccess / fetchX402Info). The new exports are additive. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.9.3   # or: npm install @actora/sdk (latest = 0.9.3)
```

The Gateway you point at must run the matching payments release (MPP/period/a2a endpoints under `/api/v1/payments/mpp/*`, `/api/v1/payments/a2a/*`, `/api/v1/payments/period/*`).

### Drive the new rails

```ts
import { SubscriptionPayments, MPPClient, A2AClient, PeriodClient } from '@actora/sdk'

const base = { baseUrl: 'https://gw.example.com' }
const mpp = new MPPClient(base)          // payment channels
const a2a = new A2AClient(base)          // two-phase paymentId
const period = new PeriodClient(base)    // period authorizations
```

### Engine 0.2.1 — browser / bundler compatibility

`@0xinfrax/payments` `^0.2.0` resolves to **0.2.1** (a patch release). It removes every Node built-in module usage (`node:crypto` / `Buffer`) in favour of the **Web Crypto API** (`crypto.randomUUID` / `getRandomValues` / `crypto.subtle` HMAC / pure-base64 helpers) — the engine is now safe to bundle with webpack / Next.js. Previously, the SDK root re-export pulled `node:crypto` into the browser module graph and failed with `UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins`.

- **No SDK API change** — `SubscriptionPayments` and the re-exported protocol clients are unaffected.
- **One 0.2.x internal change**: `StripeAdapter.verifyWebhookSignature()` is now `async` (Web Crypto `subtle` is asynchronous). Direct `StripeAdapter` consumers need `await`; the Gateway's `handleWebhook` already does.
- `PAYMENT_VERSION` stays `'0.2.0'` — the engine API surface did not change between 0.2.0 and 0.2.1.

## v0.8.11 → v0.9.2

### What's New

| Feature | Description |
|---------|-------------|
| **Unified payments endpoint** | `SubscriptionPayments` now talks to the Gateway's unified endpoint `/api/v1/payments` for the **fiat** rail (checkout with auto-pricing), the **x402** rail (native-token period subscription) and the **access** check (`hasAccess()`). Under the hood it uses `PaymentsClient` from the new generic engine [`@0xinfrax/payments`](https://www.npmjs.com/package/@0xinfrax/payments) (`^0.1.0`, installed automatically as a dependency). |
| **One transport for every rail** | fiat / x402 / access all hit `/api/v1/payments/*`; `chain` still subscribes directly on the `SubscriptionManager` contract (no Gateway needed). `fetchX402Info()` now reads the unified `/api/v1/payments/info` rails-discovery payload. |
| **Decoupled payment engine** | `@0xinfrax/payments` is a zero-Actora-dependency module (chain / Stripe / x402 adapters, PaymentError codes, intent lifecycle, event queue) — the same engine the Gateway itself embeds. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.9.2   # or simply: npm install @actora/sdk (latest = 0.9.2)
```

The Gateway you point at must expose the unified endpoint (`/api/v1/payments`) — upgrade your Gateway to the matching release. The old `/api/v1/fiat/*`, `/api/v1/x402/*` and `/api/v1/chain/check-subscription` endpoints remain for backward compatibility.

### Use Multi-Rail Payments (unchanged API)

```ts
import { SubscriptionManager, SubscriptionPayments } from '@actora/sdk'

const sm = new SubscriptionManager({ contractAddress, publicClient, walletClient })
const payments = new SubscriptionPayments({
  gatewayUrl: 'https://gw.example.com', // required for fiat / x402 rails
  subscriptionManager: sm,              // required for chain rail & x402 auto-funding
  walletClient,
  chain: 'bsc',
})

// chain rail — on-chain escrow subscription
await payments.pay({ method: 'chain', planId: 1, agentId: 3 })

// fiat rail — returns a Stripe checkout URL (amount auto-priced from the plan)
const { sessionUrl } = await payments.pay({ method: 'fiat', planId: 1, agentId: 3, subscriber: '0xabc' })
window.location.assign(sessionUrl)

// x402 rail — auto-funds the native-token payment, then registers access
await payments.pay({ method: 'x402', planId: 1, agentId: 3, subscriber: '0xabc' })

// unified access check across all rails
const ok = await payments.hasAccess(3, '0xabc')
```

### Breaking Changes

None — `pay()`, `hasAccess()`, `fetchX402Info()` and all result types are unchanged. The only behavioral difference is that fiat / x402 / access requests are routed through `/api/v1/payments` (requires the upgraded Gateway).

## v0.8.9 → v0.9.0 (Browser Control)

### What's New

| Feature | Description |
|---------|-------------|
| **Browser Skill — more actions** | `executeBrowserAction()` gains `hover`, `press` (keyboard events), `select` (SELECT value / checkbox+radio checked), `back` / `forward` (history), `getInfo` (url/title/readyState/viewport/scrollY) |
| **Richer DOM snapshot** | `extractAccessibleDOM()` now annotates `name` / `role` / `aria-label`, form `value` (input/textarea/select), `checked` state for checkbox/radio, and `target` for anchors — the snapshot is actionable for the agent |
| **Async pacing helper** | new `sleep(ms)` export for agent loops that need delays between actions |
| **Better element matching** | `findElement` fallback also matches the `name` attribute, not just text/placeholder/aria-label |

### Upgrade Steps

```bash
npm install @actora/sdk@0.9.0
```

### Use the extended skills

```ts
import { executeBrowserAction, extractAccessibleDOM, sleep } from '@actora/sdk/skills'

executeBrowserAction({ type: 'hover', description: 'settings menu' })
executeBrowserAction({ type: 'select', selector: '#chain', value: 'bsc' })
executeBrowserAction({ type: 'press', value: 'Enter' })
executeBrowserAction({ type: 'getInfo' })   // → { url, title, viewport, ... }
await sleep(300)
```

No breaking changes — all additions are new action types / fields; existing calls behave as before.

## v0.8.10 → v0.8.11

### What's New

| Feature | Description |
|---------|-------------|
| **Multi-rail subscription payments** | New `SubscriptionPayments` class — a single entry point for subscribing across all Actora payment rails: `chain` (on-chain SubscriptionManager, native/ERC20 escrow), `fiat` (Stripe card checkout via the Gateway — no wallet needed), `x402` (native-token period payment verified by the Gateway). `pay({ method, planId, agentId, subscriber, ... })` dispatches to the right rail; `hasAccess()` runs the unified chain-OR-fiat/x402 access check; `fetchX402Info()` discovers the x402 price/pay-to wallet. |
| **Fiat checkout without hardcoded amounts** | `_payFiat()` no longer requires `amountCents` — the Gateway derives the USD amount from the on-chain plan price (`/api/v1/fiat/checkout` with `planId`, priced via `FIAT_TOKEN_USD_PRICE`). Explicit `amountCents` still wins when supplied (backward compatible). |
| **x402 auto-funding** | When no `txHash` is supplied, `pay({ method: 'x402', ... })` automatically sends the native-token payment from a configured `walletClient` (max of plan price / protocol price), then registers the subscription via the Gateway. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.8.11   # or simply: npm install @actora/sdk (latest = 0.8.11)
```

### Use Multi-Rail Payments

```ts
import { SubscriptionManager, SubscriptionPayments } from '@actora/sdk'

const sm = new SubscriptionManager({ contractAddress, publicClient, walletClient })
const payments = new SubscriptionPayments({
  gatewayUrl: 'https://gw.example.com', // required for fiat / x402 rails
  subscriptionManager: sm,              // required for chain rail & x402 auto-funding
  walletClient,
  chain: 'bsc',
})

// chain rail — on-chain escrow subscription
await payments.pay({ method: 'chain', planId: 1, agentId: 3 })

// fiat rail — returns a Stripe checkout URL (amount auto-priced from the plan)
const { sessionUrl } = await payments.pay({ method: 'fiat', planId: 1, agentId: 3, subscriber: '0xabc' })
window.location.assign(sessionUrl)

// x402 rail — auto-funds the native-token payment, then registers access
await payments.pay({ method: 'x402', planId: 1, agentId: 3, subscriber: '0xabc' })

// unified access check across all rails
const ok = await payments.hasAccess(3, '0xabc')
```

### Breaking Changes

None — all additions are new exports; `amountCents` became optional (it was previously required, but supplying it still works identically).

## v0.8.9 → v0.8.10

### What's New

| Feature | Description |
|---------|-------------|
| **Master-key crypto helpers** | `encryptWithKey()` / `decryptWithKey()` — AES-256-GCM with wire format `base64(IV[12] ‖ authTag[16] ‖ ciphertext)`, byte-for-byte compatible with the Gateway's legacy at-rest key encryption (`gateway/src/lib/crypto.ts`). Use them to read/write tenant key material stored encrypted with the Gateway master key. New code should prefer `aesEncrypt`/`aesDecrypt` unless data in this layout must be read. |
| **`parseTokenURIJSON` exported** | `import { parseTokenURIJSON } from '@actora/sdk'` — the fault-tolerant tokenURI parser is now public (previously internal to the Gateway indexer / SDK `AgentRegistry`). |
| **`createTask()` raw-string input** | `A2AProtocol.createTask(agentId, taskType, input)` now accepts `input: string \| Record<string, unknown>`. Pass pre-serialized JSON or plain text directly; objects are still JSON-stringified. Fully backward compatible. |
| **Subscription status mapping fix** | `SubscriptionManager.getSubscription()` now maps the on-chain enum (`0=Inactive, 1=Active, 2=Expired, 3=Cancelled`) to the typed `AgentSubscription['status']` correctly. The previous positional array `['active','expired','cancelled','pending']` mislabeled `Inactive` as `active`, `Active` as `expired`, `Expired` as `cancelled`, and `Cancelled` as `pending` — a wrong status on essentially every subscription. Now `pending` / `active` / `expired` / `cancelled` match the contract. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.8.10   # or simply: npm install @actora/sdk (latest = 0.8.10)
```

### Use Master-Key Crypto

```ts
import { encryptWithKey, decryptWithKey } from '@actora/sdk'

const ciphertext = encryptWithKey(plaintext, masterKeyHex)   // base64(IV ‖ tag ‖ ciphertext)
const plain = decryptWithKey(ciphertext, masterKeyHex)
```

### Breaking Changes

None — all additions are new exports; the `createTask` input type is a widening, and the subscription status fix only corrects values that were previously wrong.

## v0.8.8 → v0.8.9

### What's New

Docs sync only — README Installation now points at **v0.8.8** ("just install to use the sessions & parallel-tasks client"). Same code as 0.8.8.

### Upgrade Steps

```bash
npm install @actora/sdk@0.8.9   # or simply: npm install @actora/sdk (latest = 0.8.9)
```

No breaking changes.

## v0.8.7 → v0.8.8

### What's New

Docs sync only — README updated to v0.8.7 (sessions & parallel tasks section + version history). Same code as 0.8.7.

### Upgrade Steps

```bash
npm install @actora/sdk@0.8.8
```

No breaking changes.

## v0.8.6 → v0.8.7

### What's New

| Feature | Description |
|---------|-------------|
| **Parallel Tasks client** | `ConversationClient` gains session/task APIs: `createSession()`, `createTask()`, `getTask()`, `listTasks()`, `cancelTask()`, `getCapabilities()`. `createTask()` returns immediately with the task row (`status: queued`); execution runs in the background (DeerFlow Thread/Run model). |
| **Integrator capability gate (P9)** | `GET /api/v1/tenant/me` now returns `capabilities.parallel_tasks` + `parallel_tasks_override`. When the effective flag is false (plan feature or tenant override), `createTask()` is rejected with **HTTP 403** `{ error, code: "PARALLEL_TASKS_DISABLED" }` — surfaced as `ConversationTaskError` with `.status`/`.code`. Callers should degrade to single-turn `chat()`. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.8.7
```

### Use Parallel Tasks

```ts
import { ConversationClient, ConversationTaskError } from '@actora/sdk/conversation'

const client = new ConversationClient({ gatewayUrl: 'https://...', accessToken })

// (optional) check the integrator's capability first
const caps = await client.getCapabilities()
if (!caps.parallelTasks) {
  // tenant/plan disallows multi-task → fall back to single-turn client.chat(...)
}

const session = await client.createSession({ title: 'Audit' })
const task = await client.createTask({
  sessionId: session.id,
  agentId: 42,
  message: 'Analyze this contract',
  enableMemory: false,
})
// task.status === 'queued' — poll getTask() or stream SSE events

try {
  await client.cancelTask(task.id)
} catch (err) {
  if (err instanceof ConversationTaskError && err.code === 'PARALLEL_TASKS_DISABLED') {
    // tenant not allowed to run parallel tasks
  }
}
```

### Breaking Changes

None — all additions are new methods.

## v0.8.0 → v0.8.6

### What's New (0.8.1 → 0.8.6)

| Version | Feature | Description |
|---------|---------|-------------|
| **0.8.6** | **Stored BYOK (`tenantKeyId`)** | `ConversationChatParams` gains `tenantKeyId` — use a tenant-owned API key already saved & AES-encrypted on the Gateway (managed via Settings → Own LLM Keys, backed by `/tenant/keys`). The Gateway resolves the key server-side and injects it as `X-Llm-Api-Key` (priority over request-level headers) — the plaintext key never leaves the server. Complements the stateless `llmApiKey` override (request-level, highest priority). |
| **0.8.5** | Docs sync | Re-published with updated README (same code as 0.8.4). |
| **0.8.4** | Gateway JWT auth + abort + tool_result error | `ConversationClient` supports Gateway JWT auth (`accessToken` → `Authorization: Bearer`, alternative to `apiKey`) and external abort (`stream(params, { signal })`); `tool_result` event gains optional `error` field. |
| **0.8.3** | Install fix | `wagmi` promoted from optional to required peer dependency — directly usable via `npm install @actora/sdk@0.8.3` (no manual `wagmi` install). |
| **0.8.2** | Write-op signing fix | `createPlan()` / `subscribe()` / `releaseFunds()` / `cancel()` resolve the full viem `walletClient.account` instead of a bare address string — local/private-key signers now work (`eth_sendRawTransaction`). |
| **0.8.1** | Fault-tolerant tokenURI | `parseTokenURIJSON()` aligned with Gateway indexer: base64 trailing garbage cleanup, unterminated JSON repair, regex fallback, explicit `ipfs://` handling. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.8.6
```

### Use Stored BYOK (v0.8.6)

```ts
import { ConversationClient } from '@actora/sdk/conversation'

const client = new ConversationClient({
  gatewayUrl: 'https://gateway.example.com',
  apiKey: 'actora_...',
})

// Use a tenant-owned key already saved in Settings → Own LLM Keys
// (plaintext key never leaves the server — Gateway decrypts and injects it)
const result = await client.chat({
  agentId: 42,
  message: 'Analyze this contract',
  tenantKeyId: 'key-01HX...',   // NEW: stored BYOK
})

// Streaming with external abort (v0.8.4) + stored BYOK
const controller = new AbortController()
for await (const event of client.stream(
  { agentId: 42, message: 'hello', tenantKeyId: 'key-01HX...' },
  { signal: controller.signal }
)) {
  if (event.type === 'text') console.log(event.content)
}
```

**LLM key resolution order (current)**:

```
1. tenantKeyId (stored tenant-owned key, server-side) — priority over request headers
2. X-Llm-Api-Key + X-Llm-Endpoint + X-Llm-Model (request-level, stateless BYOK — highest priority)
3. tenant_llm_configs (tenant-persisted key, encrypted storage)
4. OPENAI_API_KEY env (Actora official key)
5. Actora Gateway fallback
```

### Breaking Changes

None. 0.8.1 → 0.8.6 are purely additive — existing calls behave as before.

---

## v0.7.5 → v0.8.0

### What's New

| Feature | Description |
|---------|-------------|
| **IdentityRegistry batch query** | `getAllAgents(options)` — batch pull with `fromId`/`toId`/`activeOnly`/`capabilities` filters; `totalAgents()` reads the contract directly (no more binary search); `getAgentMetadata(agentId)` returns structured `{ name, description, encryptedPayloadCid, eciesEncryptedKey, publicPayloadCid, capabilities, skills, isActive }`. |
| **SubscriptionManager writes** | `createPlan()` now returns `planId` parsed from the `PlanCreated` event; `subscribe()` returns `subscriptionId/expiresAt/subscriber` parsed from the `Subscribed` event (previously always `0`). |
| **Typed period enum** | `createPlan({ period })` now only accepts `'day' | 'week' | 'month' | 'year'` (runtime-validated). These are the only values the contract maps to real durations — passing `'monthly'` / `'quarterly'` / `'yearly'` silently created a 30-day plan on-chain. |
| **subscribeToEvents()** | `import { subscribeToEvents } from '@actora/sdk'` — viem-based event stream (`Transfer` / `AgentRegistered` / `PlanCreated` / `Subscribed`), returns an `unwatch()` function. Drop sync latency from 2-min polling to < 15s. |
| **createPlanAndSubscribe()** | One-shot `createPlan` + `subscribe` helper. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.8.0
```

### Breaking Changes

1. **`createPlan({ period })`** — TypeScript now rejects values outside `day|week|month|year`, and a runtime guard throws for anything else. If you previously passed `'monthly'`/`'quarterly'`/`'yearly'`, map them to `'month'`/`'month'`(quarterly is not expressible in 30-day units)/`'year'` — or better, fix the contract duration expectations.
2. **`subscribe()` return type** — now includes `subscriptionId`, `expiresAt`, `subscriber`, `agentId`. No field was removed.
3. Everything else is purely additive.

### Example

```ts
import { AgentRegistry, SubscriptionManager } from '@actora/sdk'

const registry = new AgentRegistry({ contractAddress, publicClient, walletClient })
const total = await registry.totalAgents()
const agents = await registry.getAllAgents({ activeOnly: true, capabilities: ['trading'] })

const sm = new SubscriptionManager({ contractAddress, publicClient, walletClient })
const { planId } = await sm.createPlan({ agentId: 1, price: 1n, period: 'month' })
const sub = await sm.subscribe(planId)
console.log(sub.subscriptionId, sub.expiresAt)
```

---

## v0.7.4 → v0.7.5

### What's New

| Feature | Description |
|---------|-------------|
| **AgentLoop respects provider model** | `AgentLoop` no longer forces `ctx.model ?? 'gpt-4o'` on every LLM call. Model priority is now `ctx.model` → `provider.model` → `gpt-4o`. Any provider configured with a non-default model (e.g. BYOK DeepSeek `deepseek-v4-pro`) now works inside the loop. |

**Why this matters**: previously a provider built with `model: 'deepseek-v4-pro'` still sent `gpt-4o` to the model API inside the loop (the loop's `request.model` always won), so non-OpenAI providers errored with `you passed gpt-4o`. This also silently broke the Conversation Service tenant DB model config.

### Upgrade Steps

```bash
npm install @actora/sdk@0.7.5
```

No breaking changes — explicit `ctx.model` still takes precedence; only the fallback behavior changed.

---

## v0.7.3 → v0.7.4

### What's New

| Feature | Description |
|---------|-------------|
| **BYOK model override** | `ConversationClient` adds `llmModel` — forwarded as `X-Llm-Model`. Combined with `llmApiKey` + `llmEndpoint`, callers now control key + endpoint + model per request (e.g. DeepSeek `deepseek-v4-pro`). |

### Upgrade Steps

```bash
npm install @actora/sdk@0.7.4
```

### Example

```ts
const client = new ConversationClient({
  gatewayUrl: 'https://gateway.example.com',
  apiKey: 'actora_...',
  llmApiKey: 'sk-deepseek-...',
  llmEndpoint: 'https://api.deepseek.com/v1',
  llmModel: 'deepseek-v4-pro',          // NEW
})

const result = await client.chat({ message: 'hello' })
```

No breaking changes — existing calls behave as before.

---

## v0.7.2 → v0.7.3

### What's New

| Feature | Description |
|---------|-------------|
| **Stateless BYOK (key + endpoint)** | `ConversationClient` adds `llmEndpoint` — forwarded as `X-Llm-Endpoint` alongside `X-Llm-Api-Key`. Callers now supply their own LLM key **and** endpoint (e.g. DeepSeek `https://api.deepseek.com/v1`) per request, with zero Actora-side configuration or key storage. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.7.3
```

### Use Your Own LLM Key + Endpoint (DeepSeek example)

```ts
const client = new ConversationClient({
  gatewayUrl: 'https://gateway.example.com',
  apiKey: 'actora_...',
  llmApiKey: 'sk-deepseek-...',
  llmEndpoint: 'https://api.deepseek.com/v1',   // NEW
})

const result = await client.chat({ message: 'hello' })
```

No breaking changes — existing calls behave as before.

---

## v0.7.1 → v0.7.2

### What's New

| Feature | Description |
|---------|-------------|
| **Clarification Interruption** | `ConversationSSEEvent` adds `clarification` + `question`; `chat()` returns `result.clarification` when the service interrupts an ambiguous request instead of running tools. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.7.2
```

### Handle Clarification

```ts
const result = await client.chat({ agentId: 42, message: 'help me' })
if (result.clarification) {
  // surface the question to the user, re-submit with clarified intent
  showPrompt(result.clarification)
} else {
  console.log(result.text)
}
```

No breaking changes — existing calls behave as before.

---

## v0.6.9 → v0.7.0

### What's New

| Feature | Description |
|---------|-------------|
| **ConversationClient** | `@actora/sdk/conversation` — remote Conversation Service client. SSE streaming via Gateway `POST /api/v1/agent/runs`; auto-sends `X-Api-Key`, `X-End-User-Id` (end-user memory isolation), `X-Llm-Api-Key` (BYOK). |
| **Direct MCP Skill Execution** | Gateway Agent-as-MCP `tools/call` executes the agent's skill directly (`execution.type`: `mcp` / `http`) instead of a second LLM pass. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.7.0
```

### 1. Use ConversationClient

```ts
import { ConversationClient } from '@actora/sdk/conversation'

const client = new ConversationClient({
  gatewayUrl: 'https://gateway.example.com',
  apiKey: 'actora_...',
  endUserId: 'user-123',   // optional: per-end-user memory isolation
})
const result = await client.chat({ agentId: 42, message: 'Hello' })
```

### Breaking Changes

None. v0.7.0 is purely additive (new `conversation` module + Gateway-side behavior change). All v0.6.9 APIs remain fully compatible.

---

## v0.6.8 → v0.6.9

### What's New

| Feature | Description |
|---------|-------------|
| **AgentLoop Memory** | Cross-session memory with `memory: { enabled: true }` config. Stores/recalls facts via MemoryProvider interface. |
| **Context Engineering** | Token budget management via `contextBudget` config. Auto-summarizes old conversation turns when exceeded. |
| **Observability** | TraceEmitter interface — structured trace events for tool_call, tool_result, session_complete. Noop fallback when disabled. |
| **Browser Control Skill** | `@actora/sdk/skills` — `executeBrowserAction()`, `extractAccessibleDOM()` for browser-based agent actions. |
| **New Sub-path Exports** | `@actora/sdk/memory`, `@actora/sdk/traces`, `@actora/sdk/skills` |
| **Conversation Service** | New independent microservice (`@actora/conversation`) for AgentLoop execution with pgvector memory |
| **Skills Marketplace** | Gateway endpoints for skill CRUD (public GET, JWT POST, admin review) |
| **Agent-as-MCP** | JSON-RPC 2.0 endpoint `POST /mcp/agent/:id` exports any Actora agent as an MCP server |

### Upgrade Steps

```bash
npm install @actora/sdk@0.6.9
```

### 1. Enable Memory in AgentLoop

```ts
const loop = new AgentLoop({
  ctx,
  llmProvider: provider,
  memory: {
    enabled: true,
    provider: new HttpMemoryProvider({ baseUrl: 'http://localhost:8100' }),
    storeOnSessionEnd: true,
  },
})
```

### 2. Enable Trace Observability

```ts
import { HttpTraceEmitter } from '@actora/sdk/traces'

const loop = new AgentLoop({
  ctx,
  llmProvider: provider,
  trace: {
    enabled: true,
    emitter: new HttpTraceEmitter({ endpoint: 'http://localhost:8100/traces' }),
  },
})
```

### 3. Context Budget (auto-compaction)

```ts
const loop = new AgentLoop({
  ctx,
  llmProvider: provider,
  contextBudget: 8000,  // auto-summarize when token budget exceeded
})
```

### Breaking Changes

None. All v0.6.8 APIs remain fully compatible.

### New API Routes (Gateway)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/agent/runs` | POST | SSE-streamed Agent conversation (proxied to Conversation Service) |
| `/api/v1/agent/skills` | GET/POST | Skills marketplace CRUD |
| `/mcp/agent/:agentId` | POST | JSON-RPC 2.0 agent-as-MCP export |
| `/api/v1/traces/sessions` | GET | List trace sessions |
| `/api/v1/traces/session/:sessionId` | GET | Session trace details |

---

## v0.6.7 → v0.6.8

### What's New

| Feature | Description |
|---------|-------------|
| **Platform Tools Fix** | Fixed broken import paths in `platform-tools/` after module split (definitions.ts, executor.ts, index.ts). All 8 entry points now build correctly (CJS + ESM + DTS). |
| **Frontend Modularization** | 3 God Components split into 14 focused files: AgentCardManager (5 files), AgentRegistration (4 files), RevenueDisplay (5 files). No SDK API changes. |

### Upgrade Steps

```bash
npm install @actora/sdk@0.6.8
```

### Breaking Changes

None. All v0.6.7 APIs remain fully compatible. This is a patch release with only internal build fixes.

### Technical Details

The platform-tools module was previously split into `platform-tools/definitions.ts` and `platform-tools/executor.ts` with a `platform-tools/index.ts` barrel. However, the sibling `platform-tools.ts` re-export file created a name collision with the directory, causing DTS generation to fail. The fix:

- `agent-loop/index.ts`: Import from `./platform-tools/index` instead of `./platform-tools`
- `agent-loop/platform-tools.ts`: Re-export `./platform-tools/index` explicitly  
- `platform-tools/definitions.ts`: Fixed import paths (added `../` prefix for correct depth)
- `platform-tools/executor.ts`: Fixed import paths + added missing `RunnableSkill` and `buildPlatformTools` imports

---

## v0.6.3 → v0.6.4

### What's New

| Feature | Description |
|---------|-------------|
| **IPFSUploader** | Upload to IPFS via Pinata REST API or custom endpoint. Supports JSON, files, and encrypted payload upload. |
| **publishAgent()** | One-shot pipeline: encrypt agent private payload → upload to IPFS → return CIDs ready for on-chain minting. |
| **IPFS Platform Tools** | AgentLoop tools: `actora_ipfs_upload`, `actora_ipfs_upload_encrypted`, `actora_ipfs_get_url` |
| **Sub-path Export** | `@actora/sdk/ipfs` — tree-shakeable IPFSUploader import |

### Upgrade Steps

```bash
npm install @actora/sdk@0.6.4
```

### 1. Replace manual IPFS upload with publishAgent()

**Before (v0.6.3):**

```ts
import { generateAesKey, encryptPayload, packAgentForPublish } from '@actora/sdk'

const aesKey = generateAesKey()
const encrypted = encryptPayload(privatePayload, aesKey)
const packResult = packAgentForPublish(agentPayload, publicKey, aesKey)
// Manually upload encrypted.data to IPFS (not provided by SDK)
// Manually upload agent metadata to IPFS (not provided by SDK)
```

**After (v0.6.4):**

```ts
import { IPFSUploader, publishAgent } from '@actora/sdk'

const uploader = new IPFSUploader({ pinataJwt: 'eyJ...' })

const result = await publishAgent({ agent, publicKey, uploader })
// result.encryptedCid, result.publicCid — ready for on-chain minting
```

### 2. Use IPFSUploader directly

```ts
import { IPFSUploader } from '@actora/sdk/ipfs'

const uploader = new IPFSUploader({
  pinataJwt: 'eyJ...',           // required for Pinata
  // customEndpoint: '...',      // alternative to Pinata
  gatewayUrl: 'https://ipfs.io', // default
})

// Upload JSON
const { cid, url } = await uploader.uploadJSON({ key: 'value' })

// Upload encrypted agent payload
const { cid } = await uploader.uploadEncryptedPayload(encryptedPayload, 'agent-name')
```

### 3. AgentLoop IPFS tools

The following tools are now available in AgentLoop:

| Tool Name | Description |
|-----------|-------------|
| `actora_ipfs_upload` | Upload JSON data to IPFS |
| `actora_ipfs_upload_encrypted` | Encrypt and upload agent payload |
| `actora_ipfs_get_url` | Build public gateway URL from CID |

### Breaking Changes

None. All v0.6.3 APIs remain fully compatible.

### Pinata Setup

1. Go to [pinata.cloud](https://pinata.cloud) → API Keys
2. Create a key with `pinFileToIPFS` and `pinJSONToIPFS` permissions
3. Copy the JWT token
4. Pass it to `IPFSUploader({ pinataJwt: '...' })`
