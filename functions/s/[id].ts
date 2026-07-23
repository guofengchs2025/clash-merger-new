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
    return new Response('DATA_KV 未绑定，无法下载', { status: 503 });
  }

  const [fileKey, yaml] = await Promise.all([
    dataKv.get(`url:${id}`),
    dataKv.get('current'),
  ]);

  const targetKey = fileKey ?? 'current';
  const finalYaml = targetKey === 'current' ? yaml : (await dataKv.get(targetKey)) ?? yaml;

  if (!finalYaml) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(finalYaml, {
    status: 200,
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Content-Disposition': `attachment; filename="clash-${id}.yaml"`,
      'Cache-Control': 'no-store',
    },
  });
}
