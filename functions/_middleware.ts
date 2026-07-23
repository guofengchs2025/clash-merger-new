// Cloudflare Pages Native Functions 全局中间件骨架
export async function onRequest(context: any) {
  return await context.next();
}
