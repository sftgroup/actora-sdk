// ---------------------------------------------------------------------------
// actora-protocol — Main Entry
// ---------------------------------------------------------------------------
// Actora: Decentralized AI Agent Platform SDK
//
//   Agent = Prompt + Skills[] + MCP
//
// Quick start:
//   import { AgentRunner } from 'actora-protocol'
//
//   const runner = new AgentRunner({ reader, wallet })
//   const ctx = await runner.useAgent(42)
//   // ctx.prompt → inject as LLM system prompt
//   // ctx.skills → inject as LLM tools
//
// Modules:
//   actora-protocol/core         — Types, AES-256-GCM + ECIES crypto
//   actora-protocol/registry     — Agent registration & discovery
//   actora-protocol/subscription  — Subscription purchase + Actora402 gate
//   actora-protocol/a2a          — Agent-to-Agent protocol
//   actora-protocol/react        — React hooks (useAgent, etc.)
// ---------------------------------------------------------------------------

export * from './core'
export * from './events'
export * from './agent'
export * from './agent-loop'
export * from './llm'
export * from './registry'
export * from './subscription'
export * from './payment'
export * from './a2a'
export * from './mcp'
export * from './reputation'
export * from './config'
export * from './endpoint'
export * from './ipfs'
export * from './memory'
export * from './traces'
export * from './skills'
export * from './conversation'
export * from './central'
export * from './proofs'
export * from './passport'
