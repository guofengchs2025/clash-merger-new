import {
  buildClearCookie,
  buildSetCookie,
  generateSessionId,
  sha256Hex,
  signSessionCookie,
  verifySessionCookie,
} from '../../src/lib/auth/session';

interface Env {
  AUTH_KV?: any;
  AUTH_SECRET?: string;
  AUTH_PASSWORD_HASH?: string;
}

/** 从 Request 读取指定 Cookie 值 */
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

/** GET /api/auth — 查询登录状态 */
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

  const sessionId = await verifySessionCookie(cookieValue, secret);
  if (!sessionId) return new Response(JSON.stringify({ authenticated: false }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const kv = env.AUTH_KV;
  if (kv) {
    const val = await kv.get(`session:${sessionId}`);
    return new Response(JSON.stringify({ authenticated: val !== null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 无 KV 的本地 fallback
  return new Response(JSON.stringify({ authenticated: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/** POST /api/auth — 登录处理 */
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

    const storedHash = env.AUTH_PASSWORD_HASH;
    if (!storedHash) {
      return new Response(
        JSON.stringify({ error: '服务端未配置密码 AUTH_PASSWORD_HASH' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const inputHash = await sha256Hex(password);
    if (inputHash !== storedHash) {
      return new Response(JSON.stringify({ error: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sessionId = generateSessionId();
    const kv = env.AUTH_KV;
    if (kv) {
      await kv.put(`session:${sessionId}`, new Date().toISOString(), {
        expirationTtl: 60 * 60 * 24 * 30, // 30 天后自动失效
      });
    }

    const cookieValue = await signSessionCookie(sessionId, env.AUTH_SECRET);
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
export async function onRequestDelete(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const secret = env.AUTH_SECRET;
  const cookieValue = getCookie(request, 'clash_session');

  if (cookieValue && secret) {
    const sessionId = await verifySessionCookie(cookieValue, secret);
    if (sessionId && env.AUTH_KV) {
      await env.AUTH_KV.delete(`session:${sessionId}`);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookie(),
    },
  });
}
