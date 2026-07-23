import { Route, Switch } from 'wouter';
import { Toaster } from 'sonner';
import { AuthProvider } from './components/auth-provider';
import { Navbar } from './components/navbar';

function Home() {
  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">⚡</div>
        <h1 className="text-3xl font-bold mb-2">Clash Merger (Cloudflare Native)</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          全站解锁成功！当前已通过 Cloudflare Native Pages Function (`functions/api/auth.ts`) 完成 HMAC 签名验证。
        </p>
        <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
          阶段 2：登录鉴权与 Pages Function 验证成功
        </div>
      </div>
    </>
  );
}

function MergePlaceholder() {
  return (
    <>
      <Navbar />
      <div className="p-8 text-center text-muted-foreground">
        合并器功能（准备阶段 3 迁移）
      </div>
    </>
  );
}

function RegionsPlaceholder() {
  return (
    <>
      <Navbar />
      <div className="p-8 text-center text-muted-foreground">
        地区规则功能（准备阶段 3 迁移）
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/merge" component={MergePlaceholder} />
        <Route path="/regions" component={RegionsPlaceholder} />
        <Route>
          <div className="min-h-screen flex items-center justify-center text-muted-foreground">
            404 - 页面未找到
          </div>
        </Route>
      </Switch>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
