/**
 * 会话管理 — HMAC-SHA256 签名 cookie
 * 基于标准 Web Crypto API (浏览器 / Edge / Cloudflare Workers 通用)
 */

/** 生成 SHA-256 哈希 hex 字符串 */
export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 用 HMAC-SHA256 计算签名 */
async function hmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 生成 32 字节随机 hex sessionId */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 签名 cookie 值 = sessionId + "." + hmacHex */
export async function signSessionCookie(
  sessionId: string,
  secret: string
): Promise<string> {
  const sig = await hmacSha256(sessionId, secret);
  return `${sessionId}.${sig}`;
}

/** 校验并取出 sessionId；返回 null 表示签名无效 */
export async function verifySessionCookie(
  cookieValue: string,
  secret: string
): Promise<string | null> {
  const idx = cookieValue.indexOf('.');
  if (idx < 0) return null;
  const sessionId = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);
  if (!sessionId || !sig) return null;
  const expected = await hmacSha256(sessionId, secret);
  
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 ? sessionId : null;
}

/** 构造 Set-Cookie 头 (HttpOnly, SameSite=Lax) */
export function buildSetCookie(value: string, maxAgeSec = 60 * 60 * 24 * 30): string {
  return [
    `clash_session=${value}`,
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
    'SameSite=Lax',
  ].join('; ');
}

/** 构造清空 cookie 的 Set-Cookie 头 */
export function buildClearCookie(): string {
  return ['clash_session=', 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'].join('; ');
}
