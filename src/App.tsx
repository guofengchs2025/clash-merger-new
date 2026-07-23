import { Route, Switch } from 'wouter';
import { Toaster } from 'sonner';

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">⚡</div>
      <h1 className="text-3xl font-bold mb-2">Clash Merger (Cloudflare Native)</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        基于 Cloudflare Pages Native Functions 架构全新构建的纯前端 Clash 节点合并工具。
      </p>
      <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
        阶段 1：项目框架初始化成功
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route>
          <div className="min-h-screen flex items-center justify-center text-muted-foreground">
            404 - 页面未找到
          </div>
        </Route>
      </Switch>
      <Toaster richColors position="top-right" />
    </>
  );
}
