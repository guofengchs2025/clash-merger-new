export async function onRequestPost(context: { request: Request }) {
  try {
    const { url } = (await context.request.json()) as { url?: string };

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: '请提供订阅链接 URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return new Response(JSON.stringify({ error: '仅支持 HTTP/HTTPS 协议' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 防范内网 SSRF
      const hostname = parsedUrl.hostname;
      const isPrivateIP = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/.test(
        hostname
      );
      if (isPrivateIP) {
        return new Response(
          JSON.stringify({ error: '出于安全原因，禁止访问内网或本地地址' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      return new Response(JSON.stringify({ error: '无效的 URL 格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'ClashForAndroid/2.5.12',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `拉取失败: HTTP ${response.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: '订阅文件过大 (超过 5MB 限额)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const content = await response.text();
    if (content.length > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: '订阅文件过大 (超过 5MB 限额)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: '订阅内容为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscriptionUserinfo = response.headers.get('subscription-userinfo');

    return new Response(
      JSON.stringify({
        content,
        subscriptionUserinfo,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '拉取失败';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
