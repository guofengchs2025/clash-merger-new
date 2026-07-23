import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  state: AuthState;
  signIn: (password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth', { method: 'GET', cache: 'no-store' });
      const data = await res.json();
      setState(data.authenticated ? 'authenticated' : 'unauthenticated');
    } catch {
      setState('unauthenticated');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(async (password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setState('authenticated');
        return { ok: true };
      }
      return { ok: false, error: data.error ?? '密码错误' };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : '网络错误' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } finally {
      setState('unauthenticated');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ state, signIn, signOut }}>
      {children}
      {state === 'unauthenticated' && <LoginModal signIn={signIn} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

function LoginModal({
  signIn,
}: {
  signIn: (p: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    const r = await signIn(password);
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error ?? '登录失败');
      setPassword('');
    } else {
      toast.success('已解锁站点');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-xl border border-border/40 bg-card p-6 shadow-2xl space-y-4"
      >
        <div className="text-center space-y-1">
          <div className="text-4xl">🔒</div>
          <h2 className="text-xl font-bold">需要访问锁屏密码</h2>
          <p className="text-sm text-muted-foreground">
            输入密码以解锁 Clash Merger
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-sm">
            密码
          </Label>
          <Input
            id="login-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-background/60"
            disabled={submitting}
          />
        </div>

        <Button
          type="submit"
          disabled={submitting || !password.trim()}
          className="w-full cursor-pointer"
        >
          {submitting ? '验证中…' : '🔓 解锁'}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed pt-2">
          基于 Web Crypto 在边缘节点安全校验 SHA-256 哈希
        </p>
      </form>
    </div>
  );
}
