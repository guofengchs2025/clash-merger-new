import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { Link, useLocation } from 'wouter';

export function Navbar() {
  const { state, signOut } = useAuth();
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg cursor-pointer">
          <span className="text-xl">⚡</span>
          <span className="gradient-text">Clash Merger</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className={`text-sm transition-colors hover:text-foreground ${
              location === '/' ? 'text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            首页
          </Link>
          <Link
            href="/merge"
            className={`text-sm transition-colors hover:text-foreground ${
              location === '/merge' ? 'text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            合并配置
          </Link>
          <Link
            href="/regions"
            className={`text-sm transition-colors hover:text-foreground ${
              location === '/regions' ? 'text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            地区规则
          </Link>
          <Link
            href="/providers"
            className={`text-sm transition-colors hover:text-foreground ${
              location === '/providers' ? 'text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            规则集配置
          </Link>
          <Link
            href="/links"
            className={`text-sm transition-colors hover:text-foreground ${
              location === '/links' ? 'text-foreground font-semibold' : 'text-muted-foreground'
            }`}
          >
            🔗 链接管理
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {state === 'authenticated' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              🔒 退出
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
