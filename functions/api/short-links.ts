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

/** 统一会话鉴权助手 */
async function checkAuth(request: Request, secret?: string): Promise<boolean> {
  if (!secret) return false;
  const cookieValue = getCookie(request, 'clash_session');
  if (!cookieValue) return false;
  return await verifySessionCookie(cookieValue, secret);
}

/** GET /api/short-links — 获取所有短链接列表 */
export async function onRequestGet(context: { request: Request; env: Env }) {
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
      JSON.stringify({ error: 'DATA_KV 未绑定，无法获取列表' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 列出所有 url: 开头的键
    const listResult = await dataKv.list({ prefix: 'url:' });
    const keys = listResult.keys || [];

    const urlObj = new URL(request.url);
    const baseUrl = urlObj.origin;

    const links = keys.map((k: any) => {
      const shortId = k.name.replace(/^url:/, '');
      const metadata = k.metadata || {};
      return {
        shortId,
        url: `${baseUrl}/s/${shortId}`,
        targetKey: metadata.targetKey || `data:${shortId}`,
        createdAt: metadata.createdAt || null,
        updatedAt: metadata.updatedAt || metadata.createdAt || null,
      };
    });

    // 按更新时间/创建时间倒序排列
    links.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));

    return new Response(JSON.stringify({ links }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : '获取短链接列表失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/** DELETE /api/short-links?id=<shortId> — 删除指定短链接 */
export async function onRequestDelete(context: { request: Request; env: Env }) {
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

  const urlObj = new URL(request.url);
  const shortId = urlObj.searchParams.get('id');

  if (!shortId) {
    return new Response(JSON.stringify({ error: '缺少 id 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const urlKey = `url:${shortId}`;
    const targetDataKey = (await dataKv.get(urlKey)) || `data:${shortId}`;

    // 同时删除索引 key 与存储数据的 key
    await Promise.all([
      dataKv.delete(urlKey),
      dataKv.delete(targetDataKey),
    ]);

    return new Response(JSON.stringify({ ok: true, deletedId: shortId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : '删除短链接失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
