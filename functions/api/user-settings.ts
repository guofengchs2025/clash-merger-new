import { verifySessionCookie } from '../../src/lib/auth/session';

interface Env {
  DATA_KV?: any;
  AUTH_SECRET?: string;
}

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

async function checkAuth(request: Request, secret?: string): Promise<boolean> {
  if (!secret) return false;
  const cookieValue = getCookie(request, 'clash_session');
  if (!cookieValue) return false;
  return await verifySessionCookie(cookieValue, secret);
}

const DEFAULT_SETTINGS = {
  strategy: 'template',
  ruleMode: 'rule-set',
  filterRegex: '测试|重置|官网|到期|流量|traffic|expire|remaining',
  mixedPort: 7890,
  allowLan: true,
  mode: 'rule',
  logLevel: 'info',
};

/** GET /api/user-settings — 读取用户合并偏好与过滤配置 (优先 KV) */
export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;
  const dataKv = env.DATA_KV;

  if (dataKv) {
    try {
      const stored = await dataKv.get('user_merge_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Response(
          JSON.stringify({ isCustom: true, settings: { ...DEFAULT_SETTINGS, ...parsed } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      // ignore
    }
  }

  return new Response(
    JSON.stringify({ isCustom: false, settings: DEFAULT_SETTINGS }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/** POST /api/user-settings — 保存用户合并偏好与过滤配置到 DATA_KV */
export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!(await checkAuth(request, env.AUTH_SECRET))) {
    return new Response(JSON.stringify({ error: '未授权或会话已失效' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dataKv = env.DATA_KV;
  if (!dataKv) {
    return new Response(
      JSON.stringify({ error: 'DATA_KV 未绑定' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: '请求数据格式无效' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await dataKv.put('user_merge_settings', JSON.stringify(body), {
      metadata: { updatedAt: Date.now() },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : '保存失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
