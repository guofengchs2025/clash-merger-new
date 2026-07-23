import { Route, Switch } from 'wouter';
import { Toaster } from 'sonner';
import { AuthProvider } from './components/auth-provider';
import { HomePage } from './pages/home';
import { MergePage } from './pages/merge';
import { RegionsPage } from './pages/regions';
import { LinksPage } from './pages/links';

export default function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/merge" component={MergePage} />
        <Route path="/regions" component={RegionsPage} />
        <Route path="/links" component={LinksPage} />
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
