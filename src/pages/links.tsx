import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ShortLinkItem {
  shortId: string;
  url: string;
  targetKey: string;
  createdAt: number | null;
  updatedAt: number | null;
}

export function LinksPage() {
  const [links, setLinks] = useState<ShortLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/short-links', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '获取短链接列表失败');
        setLinks([]);
      } else {
        setLinks(data.links || []);
      }
    } catch {
      toast.error('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleDelete = async (shortId: string) => {
    if (!confirm(`确定删除短链接 ${shortId} 吗？对应的内容将无法继续访问。`)) return;
    setDeletingId(shortId);
    try {
      const res = await fetch(`/api/short-links?id=${shortId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`短链接 ${shortId} 已删除`);
        setLinks((prev) => prev.filter((l) => l.shortId !== shortId));
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setDeletingId(null);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('链接已复制到剪贴板');
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return '未知时间';
    return new Date(ts).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <span>🔗</span>
              <span>短链接管理</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              查看并管理当前 Cloudflare DATA_KV 中存储的所有配置文件短链接。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLinks}
            disabled={loading}
            className="cursor-pointer self-start sm:self-auto"
          >
            {loading ? '刷新中…' : '🔄 刷新列表'}
          </Button>
        </div>

        {loading ? (
          <Card className="p-12 text-center text-muted-foreground glass border-border/30">
            正在从 DATA_KV 获取短链接列表…
          </Card>
        ) : links.length === 0 ? (
          <Card className="p-12 text-center glass border-border/30 space-y-3">
            <div className="text-4xl">📭</div>
            <h3 className="font-semibold text-lg">暂无有效的短链接</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              在合并配置页面点击“保存并生成短 URL”，即可将配置文件存储在云端并在此处进行管理。
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {links.map((link) => (
              <Card
                key={link.shortId}
                className="p-4 sm:p-5 glass border-border/30 hover:border-primary/30 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-sm px-2.5 py-1">
                      {link.shortId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      更新于: {formatDate(link.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyUrl(link.url)}
                      className="h-8 text-xs cursor-pointer"
                    >
                      📋 复制链接
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(link.shortId)}
                      disabled={deletingId === link.shortId}
                      className="h-8 text-xs cursor-pointer"
                    >
                      {deletingId === link.shortId ? '删除中…' : '🗑️ 删除'}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={link.url}
                    className="bg-background/40 font-mono text-xs text-muted-foreground"
                  />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-3 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 shrink-0 font-medium"
                  >
                    ↗ 下载测试
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
