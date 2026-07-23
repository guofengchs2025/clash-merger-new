import { verifySessionCookie } from '../../src/lib/auth/session';

interface Env {
  DATA_KV?: any;
  AUTH_SECRET?: string;
}

function generateShortId(length = 6): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += chars[b % chars.length];
  return out;
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

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    // 鉴权
    if (!env.AUTH_SECRET) {
      return new Response(JSON.stringify({ error: '服务端未配置 AUTH_SECRET' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cookieValue = getCookie(request, 'clash_session');
    if (!cookieValue) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const valid = await verifySessionCookie(cookieValue, env.AUTH_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: '会话已失效，请重新登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dataKv = env.DATA_KV;
    if (!dataKv) {
      return new Response(
        JSON.stringify({ error: 'DATA_KV 未配置，无法保存到云端' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await request.json()) as { yaml?: string };
    if (!body.yaml || typeof body.yaml !== 'string') {
      return new Response(JSON.stringify({ error: 'yaml 内容缺失' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (body.yaml.length > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: '内容超过 5MB 限制' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const shortId = generateShortId(6);
    await dataKv.put('current', body.yaml, {
      metadata: { savedAt: Date.now() },
    });
    await dataKv.put(`url:${shortId}`, 'current', {
      metadata: { createdAt: Date.now() },
      expirationTtl: 60 * 60 * 24 * 7, // 短 URL 7 天后自动清理
    });

    const urlObj = new URL(request.url);
    const baseUrl = urlObj.origin;

    return new Response(
      JSON.stringify({
        ok: true,
        shortId,
        url: `${baseUrl}/s/${shortId}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : '保存失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
