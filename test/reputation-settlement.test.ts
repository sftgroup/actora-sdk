// 结算键推导单测：taskRef 聚合、settlementRef 去重。
//   - taskRef = keccak256(utf8(jobId))
//   - milestone：keccak256(`${jobId}:${index}`) —— 同 job 不同阶段互不覆盖
//   - erc8183：bytes32(uint256(jobId)) —— 保持 Erc8183Verifier 既有约定
import { describe, it, expect } from 'vitest'
import { keccak256, pad, stringToHex, toHex } from 'viem'
import { deriveSettlementRef, deriveTaskRef } from '../src/reputation/settlement'

const keccak = (s: string) => keccak256(stringToHex(s))

describe('deriveTaskRef', () => {
  it('按 jobId 聚合：同一 job 的多个里程碑得到相同 taskRef', () => {
    expect(deriveTaskRef('job-42')).toBe(keccak('job-42'))
    expect(deriveTaskRef('job-42')).toBe(deriveTaskRef('job-42'))
    expect(deriveTaskRef('job-42')).not.toBe(deriveTaskRef('job-43'))
  })
})

describe('deriveSettlementRef', () => {
  it('milestone：同 job 不同 index 生成不同 settlementRef', () => {
    const first = deriveSettlementRef('milestone', 'job-42', 0)
    const second = deriveSettlementRef('milestone', 'job-42', 1)

    expect(first).toBe(keccak('job-42:0'))
    expect(second).toBe(keccak('job-42:1'))
    expect(first).not.toBe(second)
  })

  it('erc8183：保持 bytes32(uint256(jobId)) 约定', () => {
    expect(deriveSettlementRef('erc8183', '42')).toBe(pad(toHex(42n), { size: 32 }))
  })

  it('x402 / sessionKey：直接对幂等键取哈希', () => {
    expect(deriveSettlementRef('x402', '0xdeadbeef')).toBe(keccak('0xdeadbeef'))
    expect(deriveSettlementRef('sessionKey', '7:month')).toBe(keccak('7:month'))
  })
})
