interface Env {
  DATA_KV?: any;
}

export async function onRequestGet(context: {
  request: Request;
  params: { id?: string };
  env: Env;
}) {
  const { params, env } = context;
  const id = params.id;

  if (!id || !/^[a-z0-9]{4,16}$/.test(id)) {
    return new Response('Not Found', { status: 404 });
  }

  const dataKv = env.DATA_KV;
  if (!dataKv) {
    return new Response('DATA_KV 未绑定，无法下载文件', { status: 503 });
  }

  // 1. 查询 url: 索引
  const targetKey = await dataKv.get(`url:${id}`);
  let yaml: string | null = null;

  if (targetKey) {
    yaml = await dataKv.get(targetKey);
  }

  // 2. Fallback: 尝试 data:id 或 current
  if (!yaml) {
    yaml = await dataKv.get(`data:${id}`);
  }
  if (!yaml && id === 'current') {
    yaml = await dataKv.get('current');
  }

  if (!yaml) {
    return new Response('短链接对应的内容不存在或已过期', { status: 404 });
  }

  return new Response(yaml, {
    status: 200,
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Content-Disposition': `attachment; filename="clash-${id}.yaml"`,
      'Cache-Control': 'no-store',
    },
  });
}
