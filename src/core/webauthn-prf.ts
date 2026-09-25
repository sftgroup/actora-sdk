// ---------------------------------------------------------------------------
// @actora/sdk — WebAuthn PRF (passkey) helpers for `webauthn-prf-hkdf` (v3)
// ---------------------------------------------------------------------------
// The PRF extension turns a passkey into a stable 32-byte secret that the
// browser binds to the RP ID (your registrable domain). Unlike a signature it
// is:
//   • not replayable — a phishing site on another origin cannot obtain it,
//     because the browser refuses to use a credential outside its RP ID;
//   • not a signature — no "blind signing" prompt, no EIP-1193 at all.
//
// Only the *secret source* changes: the HKDF construction is identical to
// v1/v2 (`derivePrivateKeyFromIkm`).
//
// NO FALLBACK BY DESIGN. When PRF is unavailable this module throws an
// actionable error and never silently degrades to signature derivation — a
// silent fallback would leave the user believing they hold a passkey-bound key
// while actually being back on a publicly replayable one.
//
// KNOWN LIMITATIONS (documented, not hidden):
//   • Mobile wallets' in-app browsers generally lack WebAuthn/PRF ⇒ keep another
//     mode for those. Use `getPrfCapability()` before choosing v3.
//   • The key is bound to (rpId, credential). Changing the domain, or losing the
//     credential, makes published payloads undecryptable — record both on-chain
//     via `PayloadKeyCredential` / `PAYLOAD_KEY_CREDENTIAL_ATTRIBUTE`.
//   • Cross-device (hybrid/QR) PRF output has had provider-level inconsistencies
//     (e.g. WebKit bug 311099 for security keys). v3 is therefore opt-in.
// ---------------------------------------------------------------------------

import { DEFAULT_PRF_SALT, prfSaltBytes } from './crypto'

// ── Errors ─────────────────────────────────────────────────────────────────

export type PrfErrorCode =
  /** Browser/authenticator does not implement the PRF extension. */
  | 'PRF_UNSUPPORTED'
  /** The credential is not available here (other device / other provider). */
  | 'PRF_CREDENTIAL_NOT_FOUND'
  /** User dismissed the prompt, or it timed out. */
  | 'PRF_CANCELLED'
  /** Anything else (RP ID mismatch, authenticator failure, …). */
  | 'PRF_FAILED'

/** Typed error so callers can branch without string matching. */
export class PrfError extends Error {
  readonly code: PrfErrorCode
  constructor(code: PrfErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'PrfError'
    this.code = code
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

// ── Capability probing (no prompt) ─────────────────────────────────────────

export interface PrfCapability {
  /** WebAuthn usable at all (secure context + API present). */
  webAuthn: boolean
  /** Platform authenticator present (Touch ID / Windows Hello / Android). */
  userVerifyingPlatformAuthenticator: boolean | 'unknown'
  /** PRF support: only `true`/`false` when the browser can answer without a prompt. */
  prf: boolean | 'unknown'
  /** Where `prf` came from. */
  source: 'client-capabilities' | 'unavailable'
}

/**
 * Best-effort PRF capability probe that never prompts.
 *
 * `prf: 'unknown'` is a real answer: without
 * `PublicKeyCredential.getClientCapabilities()` (Chrome 133+) support can only be
 * determined by attempting a ceremony. Treat `'unknown'` as "may work" — v3
 * still fails loudly if it does not.
 */
export async function getPrfCapability(): Promise<PrfCapability> {
  if (typeof window === 'undefined' || typeof window.PublicKeyCredential === 'undefined') {
    return {
      webAuthn: false,
      userVerifyingPlatformAuthenticator: false,
      prf: false,
      source: 'unavailable',
    }
  }

  let uvpaa: boolean | 'unknown' = 'unknown'
  try {
    uvpaa = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    /* leave as unknown */
  }

  const withCapabilities = PublicKeyCredential as typeof PublicKeyCredential & {
    getClientCapabilities?: () => Promise<Record<string, boolean>>
  }
  if (typeof withCapabilities.getClientCapabilities === 'function') {
    try {
      const caps = await withCapabilities.getClientCapabilities()
      return {
        webAuthn: true,
        userVerifyingPlatformAuthenticator: uvpaa,
        prf: caps?.prf === true,
        source: 'client-capabilities',
      }
    } catch {
      /* fall through to unknown */
    }
  }

  return {
    webAuthn: true,
    userVerifyingPlatformAuthenticator: uvpaa,
    prf: 'unknown',
    source: 'unavailable',
  }
}

// ── Ceremonies ─────────────────────────────────────────────────────────────

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Default RP ID: the current site's registrable domain (browser-enforced). */
function defaultRpId(): string {
  return location.hostname
}

function unsupported(message: string, cause?: unknown): PrfError {
  return new PrfError(
    'PRF_UNSUPPORTED',
    `${message} — PRF 不可用时不会回退到签名派生（那会使用户以为安全、实际回到可复用的签名密钥）。` +
      '请改用 mode: \'eip712-hkdf\'（v2）或托管密钥（服务端生成密钥对）。',
    { cause }
  )
}

/** `NotAllowedError` means cancelled/timeout — not "unsupported". */
function classify(error: unknown, context: string, rpId: string): PrfError {
  const cause = error as { name?: string; message?: string }
  const name = cause?.name ?? ''
  if (name === 'NotAllowedError') {
    return new PrfError(
      'PRF_CANCELLED',
      `${context}被取消或超时（NotAllowedError）。若设备上不存在该凭据，浏览器也会报这个错 —— ` +
        `请确认凭据的 RP ID 是 "${rpId}"，或改用同一 passkey 同步服务（iCloud 钥匙串 / Google 密码管理工具）。`,
      { cause }
    )
  }
  if (name === 'InvalidStateError') {
    return new PrfError(
      'PRF_CREDENTIAL_NOT_FOUND',
      `${context}时该凭据不在本设备（InvalidStateError）。请在注册它的设备或同一同步服务上重试。`,
      { cause }
    )
  }
  if (name === 'SecurityError') {
    return new PrfError(
      'PRF_FAILED',
      `${context}被浏览器拒绝（SecurityError）：RP ID "${rpId}" 与当前页面来源不匹配。` +
        '凭据按 RP ID 隔离，换域名即换密钥空间。',
      { cause }
    )
  }
  return new PrfError('PRF_FAILED', `${context}失败：${cause?.message ?? String(error)}`, { cause })
}

export interface CreatePrfCredentialOptions {
  /** RP ID; defaults to `location.hostname`. Must be the domain you will keep serving from. */
  rpId?: string
  rpName?: string
  userName?: string
  displayName?: string
  /** PRF evaluation salt; defaults to the frozen `DEFAULT_PRF_SALT`. */
  salt?: string
}

export interface PrfCredential {
  /** Base64url credential ID — persist this (see `PayloadKeyCredential`). */
  credentialId: string
  /** `prf.enabled` reported by the authenticator at registration. */
  prfEnabled: boolean
  /** Present when the authenticator returned the PRF result during registration. */
  prfOutputHex: string | null
  rpId: string
  salt: string
}

/**
 * Register a discoverable (resident) passkey with the PRF extension enabled.
 *
 * `residentKey: 'required'` + `userVerification: 'required'` so the credential
 * can be found again (and synced) without a user-name hint, which is what makes
 * decryption later possible without extra app state.
 */
export async function createPrfCredential(
  options: CreatePrfCredentialOptions = {}
): Promise<PrfCredential> {
  if (typeof navigator === 'undefined' || !navigator.credentials?.create) {
    throw unsupported('当前环境没有 WebAuthn（navigator.credentials.create 不存在）')
  }
  const rpId = options.rpId ?? defaultRpId()
  const salt = options.salt ?? DEFAULT_PRF_SALT

  let created: Credential | null
  try {
    created = await navigator.credentials.create({
      publicKey: {
        rp: { id: rpId, name: options.rpName ?? 'Actora' },
        user: {
          id: randomBytes(16) as BufferSource,
          name: options.userName ?? 'actora-payload-key',
          displayName: options.displayName ?? options.userName ?? 'Actora payload key',
        },
        challenge: randomBytes(32) as BufferSource,
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          residentKey: 'required',
          requireResidentKey: true,
          userVerification: 'required',
        },
        // Asking for `eval` at registration returns the first output right away
        // (and is what enables the extension on the credential).
        extensions: {
          prf: { eval: { first: prfSaltBytes(salt) as BufferSource } },
        } as AuthenticationExtensionsClientInputs,
      },
    })
  } catch (error) {
    throw classify(error, '注册 passkey', rpId)
  }

  if (!created) {
    throw new PrfError('PRF_FAILED', '注册 passkey 失败：浏览器未返回凭据。')
  }
  const credential = created as PublicKeyCredential

  const ext = credential.getClientExtensionResults() as {
    prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } }
  }
  const first = ext.prf?.results?.first
  const prfEnabled = ext.prf?.enabled === true

  if (!first && !prfEnabled) {
    throw unsupported(
      '该认证器未启用 PRF：注册时既未返回 prf.enabled 也未返回 PRF 结果',
      ext.prf
    )
  }

  return {
    credentialId: toBase64Url(new Uint8Array(credential.rawId)),
    prfEnabled,
    prfOutputHex: first ? toHex(new Uint8Array(first)) : null,
    rpId,
    salt,
  }
}

export interface EvaluatePrfOptions {
  /** Base64url credential ID from `createPrfCredential` (or the on-chain binding). */
  credentialId: string
  /** RP ID; defaults to `location.hostname`. Must match the credential's. */
  rpId?: string
  /** PRF evaluation salt; defaults to the frozen `DEFAULT_PRF_SALT`. */
  salt?: string
  /** Omit `allowCredentials` and let the browser pick a discoverable credential. */
  allowDiscoverable?: boolean
}

/**
 * Evaluate the PRF for an existing credential and return its 32-byte output as
 * hex. This is the v3 IKM — stable for the same (credential, salt), and
 * impossible to obtain from another origin.
 */
export async function evaluatePrf(options: EvaluatePrfOptions): Promise<{ prfOutputHex: string; rpId: string; salt: string }> {
  if (typeof navigator === 'undefined' || !navigator.credentials?.get) {
    throw unsupported('当前环境没有 WebAuthn（navigator.credentials.get 不存在）')
  }
  const rpId = options.rpId ?? defaultRpId()
  const salt = options.salt ?? DEFAULT_PRF_SALT

  let assertion: Credential | null
  try {
    assertion = await navigator.credentials.get({
      publicKey: {
        rpId,
        challenge: randomBytes(32) as BufferSource,
        allowCredentials: options.allowDiscoverable
          ? []
          : [{ type: 'public-key', id: fromBase64Url(options.credentialId) as BufferSource }],
        userVerification: 'required',
        extensions: {
          prf: { eval: { first: prfSaltBytes(salt) as BufferSource } },
        } as AuthenticationExtensionsClientInputs,
      },
    })
  } catch (error) {
    throw classify(error, '求值 PRF', rpId)
  }

  if (!assertion) {
    throw new PrfError('PRF_FAILED', '求值 PRF 失败：浏览器未返回断言结果。')
  }

  const ext = (assertion as PublicKeyCredential).getClientExtensionResults() as {
    prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } }
  }
  const first = ext.prf?.results?.first

  if (!first) {
    // The single most important branch in this file: fail loudly instead of
    // signing something reproducible.
    throw unsupported(
      `该浏览器/认证器未返回 PRF 结果（prf=${JSON.stringify(ext.prf ?? null)}）。` +
        '移动端钱包内置浏览器普遍不支持 WebAuthn，属已知情况',
      ext.prf
    )
  }

  const output = new Uint8Array(first)
  if (output.length !== 32) {
    throw new PrfError(
      'PRF_FAILED',
      `PRF 输出长度异常（${output.length} 字节，期望 32）。不同实现长度不一致会让派生密钥不可复现，拒绝使用。`
    )
  }

  return { prfOutputHex: toHex(output), rpId, salt }
}
