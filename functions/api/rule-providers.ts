import { verifySessionCookie } from '../../src/lib/auth/session';
import { DEFAULT_RULE_PROVIDERS, TEMPLATE_RULESET_RULES } from '../../src/lib/merge/templates';

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

/** GET /api/rule-providers — 读取自定义 Rule Providers (从 KV 或默认) */
export async function onRequestGet(context: { request: Request; env: Env }) {
  const { env } = context;
  const dataKv = env.DATA_KV;

  if (dataKv) {
    try {
      const stored = await dataKv.get('custom_rule_providers');
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Response(JSON.stringify({ isCustom: true, data: parsed }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // ignore
    }
  }

  // 默认规则集 fallback
  return new Response(
    JSON.stringify({
      isCustom: false,
      data: {
        providers: DEFAULT_RULE_PROVIDERS,
        rules: TEMPLATE_RULESET_RULES,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/** POST /api/rule-providers — 保存自定义 Rule Providers 到 DATA_KV */
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
      JSON.stringify({ error: 'DATA_KV 未绑定，无法保存到云端' }),
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

    await dataKv.put('custom_rule_providers', JSON.stringify(body), {
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

/** DELETE /api/rule-providers — 重置并清除 KV 中的自定义规则集 */
export async function onRequestDelete(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!(await checkAuth(request, env.AUTH_SECRET))) {
    return new Response(JSON.stringify({ error: '未授权或会话已失效' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dataKv = env.DATA_KV;
  if (dataKv) {
    await dataKv.delete('custom_rule_providers');
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
