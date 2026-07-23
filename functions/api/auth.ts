import {
  buildClearCookie,
  buildSetCookie,
  sha256Hex,
  signSessionCookie,
  verifySessionCookie,
} from '../../src/lib/auth/session';

interface Env {
  AUTH_SECRET?: string;
  AUTH_PASSWORD?: string; // 明文密码 (推荐)
  AUTH_PASSWORD_HASH?: string; // SHA-256 哈希密码
}

/** 从 Request 读取 Cookie 值 */
function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const c of cookies) {
    const [k, v] = c.trim().split('=');
    if (k === name) return v;
  }
  return null;
}

/** GET /api/auth — 校验登录状态 (纯内存无状态校验) */
export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const secret = env.AUTH_SECRET;
  if (!secret) return new Response(JSON.stringify({ authenticated: false }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const cookieValue = getCookie(request, 'clash_session');
  if (!cookieValue) return new Response(JSON.stringify({ authenticated: false }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const valid = await verifySessionCookie(cookieValue, secret);
  return new Response(JSON.stringify({ authenticated: valid }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/** POST /api/auth — 登录校验 */
export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    const { password } = (await request.json()) as { password?: string };
    if (!password || typeof password !== 'string') {
      return new Response(JSON.stringify({ error: '请输入密码' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!env.AUTH_SECRET) {
      return new Response(
        JSON.stringify({ error: '服务端未配置 AUTH_SECRET，禁止登录' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const storedPlain = env.AUTH_PASSWORD;
    const storedHash = env.AUTH_PASSWORD_HASH;

    if (!storedPlain && !storedHash) {
      return new Response(
        JSON.stringify({ error: '服务端未配置密码 AUTH_PASSWORD 或 AUTH_PASSWORD_HASH' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let isValid = false;
    if (storedPlain) {
      isValid = password === storedPlain;
    } else if (storedHash) {
      const inputHash = await sha256Hex(password);
      isValid = inputHash === storedHash;
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 签署无状态 Cookie
    const cookieValue = await signSessionCookie(env.AUTH_SECRET);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSetCookie(cookieValue),
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : '登录失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/** DELETE /api/auth — 退出登录 */
export async function onRequestDelete() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookie(),
    },
  });
}
