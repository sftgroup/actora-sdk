import type { PlatformToolDef, PlatformToolContext } from "./definitions"
import { buildPlatformTools } from "./definitions"
import type { RunnableSkill } from "../../agent/agent-runner"

// ── Tool Executor ───────────────────────────────────────────────────────────

export async function executePlatformTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: PlatformToolContext
): Promise<unknown> {
  try {
    switch (toolName) {
      // ── Identity ──────────────────────────────────
      case 'actora_identity_register': {
        const { tokenURI, encryptedPayloadCid, eciesEncryptedKey } = args as any
        // 安全：绝不把明文 AES 密钥（`aesKeyHex`）写入链上元数据。链上元数据公开
        // 且无法删除，一旦上链即等同泄露、不可回收；需要授权读取时应写
        // `eciesEncryptedKey`（用所有者公钥 ECIES 包裹后的密文）。
        // 历史版本曾把传入的 aesKeyHex 原样上链，已在此移除；即使调用方仍传入
        // 该参数也会被忽略。
        const metadata = [
          { key: 'encryptedPayloadCid', value: encryptedPayloadCid },
          { key: 'eciesEncryptedKey', value: eciesEncryptedKey },
        ]
        return ctx.agentRegistry.register(tokenURI, metadata)
      }
      case 'actora_identity_get':
        return {
          tokenURI: await ctx.agentRegistry.tokenURI(args.agentId as number),
          attributes: await ctx.agentRegistry.getAttributes(args.agentId as number),
          exists: await ctx.agentRegistry.agentExists(args.agentId as number),
        }
      case 'actora_identity_list':
        return ctx.agentRegistry.getAgentsByOwner((args.ownerAddress ?? ctx.userAddress) as `0x${string}`)
      case 'actora_identity_exists':
        return ctx.agentRegistry.agentExists(args.agentId as number)
      case 'actora_identity_total_count':
        return { totalAgents: await ctx.agentRegistry.getCurrentAgentId() }

      // ── Subscription ──────────────────────────────
      case 'actora_subscription_plans':
        return ctx.subscriptionManager.getPlan(args.planId as number)
      case 'actora_subscription_check':
        return ctx.subscriptionManager.hasActiveSubscription(
          (args.subscriberAddress ?? ctx.userAddress) as `0x${string}`,
          args.agentId as number
        )
      case 'actora_subscription_detail':
        return ctx.subscriptionManager.getSubscriptionDetail(args.subscriptionId as number)
      case 'actora_subscription_my_list':
        return ctx.subscriptionManager.getUserSubscriptions(ctx.userAddress as `0x${string}`)
      case 'actora_subscription_subscribe': {
        const valueWei = args.valueWei ? BigInt(args.valueWei as string) : undefined
        return ctx.subscriptionManager.subscribe(args.planId as number, { valueWei })
      }
      case 'actora_subscription_cancel':
        return ctx.subscriptionManager.cancel(args.subscriptionId as number)
      case 'actora_subscription_release':
        // ERC8004SubscriptionManager settles payments at subscribe/renew time;
        // there is no escrow to release.
        throw new Error('release is not supported: ERC8004SubscriptionManager has no escrow')
      case 'actora_subscription_fee':
        return { platformFeeBps: await ctx.subscriptionManager.getPlatformFeeBps() }

      // ── A2A ───────────────────────────────────────
      case 'actora_a2a_create_task':
        return ctx.a2a.createTask(
          args.targetAgentId as number,
          args.taskType as string,
          typeof args.inputData === 'string' ? JSON.parse(args.inputData as string) : args.inputData as Record<string, unknown>
        )
      case 'actora_a2a_get_task':
        return ctx.a2a.getTask(args.taskId as number)
      case 'actora_a2a_complete_task':
        return ctx.a2a.completeTask(args.taskId as number, args.outputData as string)
      case 'actora_a2a_my_tasks':
        return ctx.a2a.getUserTasks(ctx.userAddress as `0x${string}`)
      case 'actora_a2a_agent_card':
        return ctx.a2a.getAgentCard(args.agentId as number)

      // ── Reputation ─────────────────────────────────
      case 'actora_reputation_rate':
        // 信誉适配器为只读桥；写入须直接对底层注册表调用 giveFeedback（legacy/canonical 签名不同）
        throw new Error('reputation writes are not supported by the read adapter')
      case 'actora_reputation_get': {
        if (!ctx.reputationRegistry) throw new Error('ReputationRegistry not configured')
        const agentId = args.agentId as number
        let clients = (args.clients as `0x${string}`[]) ?? []
        // canonical 的 getSummary 在 clients 为空时直接 revert（legacy 空数组=全部），
        // 未显式指定时回退为该 agent 的反馈方列表。
        if (clients.length === 0) clients = await ctx.reputationRegistry.getClients(agentId)
        // 仍为空 = 尚无任何反馈：直接返回零值，避免 canonical revert。
        if (clients.length === 0) return { count: 0, averageScore: 0 }
        return ctx.reputationRegistry.getReputationSummary(
          agentId,
          clients,
          (args.tag1 as string) ?? '',
          (args.tag2 as string) ?? ''
        )
      }
      case 'actora_reputation_reviews': {
        if (!ctx.reputationRegistry) throw new Error('ReputationRegistry not configured')
        const agentId = args.agentId as number
        const clients = await ctx.reputationRegistry.getClients(agentId)
        const reviews: unknown[] = []
        for (const client of clients) {
          const lastIndex = await ctx.reputationRegistry.getLastIndex(agentId, client)
          for (let i = 1; i <= lastIndex; i++) {
            const fb = await ctx.reputationRegistry.readFeedback(agentId, client, i)
            reviews.push({ reviewer: client, ...fb })
          }
        }
        return reviews
      }

      // ── Configuration ──────────────────────────────
      case 'actora_config_get':
        if (!ctx.configurationRegistry) throw new Error('ConfigurationRegistry not configured')
        return ctx.configurationRegistry.getConfig(args.agentId as number, args.configKey as string)
      case 'actora_config_list':
        if (!ctx.configurationRegistry) throw new Error('ConfigurationRegistry not configured')
        return ctx.configurationRegistry.getAgentConfigs(args.agentId as number)
      case 'actora_config_set':
        if (!ctx.configurationRegistry) throw new Error('ConfigurationRegistry not configured')
        return ctx.configurationRegistry.setConfig(
          args.agentId as number, args.key as string,
          args.value as string, (args.dataType as string) ?? 'string'
        )

      // ── MultiEndpoint ──────────────────────────────
      case 'actora_endpoint_list':
        if (!ctx.multiEndpointRegistry) throw new Error('MultiEndpointRegistry not configured')
        return ctx.multiEndpointRegistry.getAgentEndpoints(args.agentId as number)
      case 'actora_endpoint_active':
        if (!ctx.multiEndpointRegistry) throw new Error('MultiEndpointRegistry not configured')
        return ctx.multiEndpointRegistry.getActiveAgentEndpoints(args.agentId as number)
      case 'actora_endpoint_best_mcp':
        if (!ctx.multiEndpointRegistry) throw new Error('MultiEndpointRegistry not configured')
        return { mcpUrl: await ctx.multiEndpointRegistry.getBestMCPUrl(args.agentId as number) }

      // ── Gateway ────────────────────────────────────
      case 'actora_gateway_chat': {
        if (!ctx.gatewayUrl || !ctx.gatewayToken) throw new Error('Gateway not configured')
        const body: Record<string, unknown> = {
          model: args.model ?? 'gpt-4o',
          messages: args.messages,
          stream: false,
          key_source: args.keySource ?? 'platform',
        }
        if (args.temperature !== undefined) body.temperature = args.temperature
        if (args.max_tokens) body.max_tokens = args.max_tokens
        if (args.tenantKeyId) body.tenant_key_id = args.tenantKeyId

        const res = await fetch(`${ctx.gatewayUrl}/api/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.gatewayToken}`,
          },
          body: JSON.stringify(body),
        })
        return res.json()
      }
      case 'actora_gateway_tenant_me': {
        if (!ctx.gatewayUrl || !ctx.gatewayToken) throw new Error('Gateway not configured')
        const res = await fetch(`${ctx.gatewayUrl}/api/v1/tenant/me`, {
          headers: { 'Authorization': `Bearer ${ctx.gatewayToken}` },
        })
        return res.json()
      }
      case 'actora_gateway_tenant_usage': {
        if (!ctx.gatewayUrl || !ctx.gatewayToken) throw new Error('Gateway not configured')
        const res = await fetch(`${ctx.gatewayUrl}/api/v1/tenant/usage?days=${args.days ?? 30}`, {
          headers: { 'Authorization': `Bearer ${ctx.gatewayToken}` },
        })
        return res.json()
      }
      case 'actora_gateway_tenant_keys': {
        if (!ctx.gatewayUrl || !ctx.gatewayToken) throw new Error('Gateway not configured')
        const res = await fetch(`${ctx.gatewayUrl}/api/v1/tenant/keys`, {
          headers: { 'Authorization': `Bearer ${ctx.gatewayToken}` },
        })
        return res.json()
      }
      case 'actora_gateway_models': {
        if (!ctx.gatewayUrl || !ctx.gatewayToken) throw new Error('Gateway not configured')
        const res = await fetch(`${ctx.gatewayUrl}/api/v1/models`, {
          headers: { 'Authorization': `Bearer ${ctx.gatewayToken}` },
        })
        return res.json()
      }

      // ── IPFS ───────────────────────────────────────
      case 'actora_ipfs_upload': {
        if (!ctx.ipfsUploader) throw new Error('IPFSUploader not configured')
        const data = typeof args.data === 'string' ? JSON.parse(args.data as string) : args.data
        const result = await ctx.ipfsUploader.uploadJSON(data, { name: args.name as string })
        return { cid: result.cid, url: result.url }
      }
      case 'actora_ipfs_upload_encrypted': {
        if (!ctx.ipfsUploader) throw new Error('IPFSUploader not configured')
        const { generateAesKey, encryptPayload } = await import('../../core/crypto')
        const privatePayload = {
          prompt: args.prompt as string,
          skills: args.skillsJson ? JSON.parse(args.skillsJson as string) : [],
          mcp: args.mcpJson ? JSON.parse(args.mcpJson as string) : {},
        }
        const key = generateAesKey()
        const encrypted = encryptPayload(privatePayload, key)
        const result = await ctx.ipfsUploader.uploadEncryptedPayload(encrypted, args.agentName as string)
        return { cid: result.cid, url: result.url, aesKeyHex: key }
      }
      case 'actora_ipfs_get_url': {
        const gateway = (args.gateway as string) ?? 'https://ipfs.io'
        return { url: `${gateway}/ipfs/${args.cid}` }
      }

      default:
        throw new Error(`Unknown platform tool: ${toolName}`)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: message, tool: toolName }
  }
}

// ── Agent Loop Integration ──────────────────────────────────────────────────

/**
 * Merge platform tools into an AgentLoop's skill list.
 * When AgentLoop calls execute(toolName, args), the platform executor handles it.
 */
export function wrapPlatformToolsAsSkills(
  ctx: PlatformToolContext,
  modules?: ('identity' | 'subscription' | 'a2a' | 'reputation' | 'configuration' | 'endpoint' | 'gateway' | 'ipfs')[]
): RunnableSkill[] {
  const toolDefs = buildPlatformTools(modules)

  return toolDefs.map(def => ({
    name: def.function.name,
    description: def.function.description,
    inputSchema: def.function.parameters as Record<string, unknown>,
    mode: 'open' as const,
    execute: async (input: Record<string, unknown>) => {
      return executePlatformTool(def.function.name, input, ctx)
    },
  }))
}
