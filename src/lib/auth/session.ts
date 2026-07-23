/**
 * 纯无状态会话管理 — HMAC-SHA256 签名 Cookie (Stateless Cookie)
 * 零 KV 数据库依赖，毫秒级内存校验
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

/** 构造带有时间戳的 HMAC 签名 Cookie 值 = "<timestamp>.<hmacHex>" */
export async function signSessionCookie(secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const sig = await hmacSha256(timestamp, secret);
  return `${timestamp}.${sig}`;
}

/** 校验签名与过期状态；30 天有效期 */
export async function verifySessionCookie(
  cookieValue: string,
  secret: string,
  maxAgeMs = 1000 * 60 * 60 * 24 * 30 // 30 天
): Promise<boolean> {
  const idx = cookieValue.indexOf('.');
  if (idx < 0) return false;
  const timestampStr = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);
  if (!timestampStr || !sig) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // 检查是否过期
  if (Date.now() - timestamp > maxAgeMs) return false;

  const expected = await hmacSha256(timestampStr, secret);
  if (sig.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
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
