/** 证明包（与网关 services/execution-proof.ts 的 ExecutionProofBundle 对齐）。 */
interface ExecutionProofBundle {
    tag: 'signed-manifest-v1';
    requestHash: string;
    manifestHash: string;
    manifest: Record<string, unknown>;
    signature: string;
    signer: string;
}
type ExecutionProofVerifyReason = 'bad-tag' | 'bad-manifest' | 'request-hash-mismatch' | 'manifest-hash-mismatch' | 'expired' | 'bad-signature' | 'signer-mismatch';
interface ExecutionProofVerifyResult {
    valid: boolean;
    signer: string | null;
    manifestHash: string | null;
    reason?: ExecutionProofVerifyReason;
}
/** 校验执行证明（POST /api/v1/proofs/verify）。 */
declare function verifyExecutionProof(baseUrl: string, proof: ExecutionProofBundle, accessToken?: string): Promise<ExecutionProofVerifyResult>;

export { type ExecutionProofBundle, type ExecutionProofVerifyReason, type ExecutionProofVerifyResult, verifyExecutionProof };
