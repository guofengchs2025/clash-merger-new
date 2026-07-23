import { useEffect, useState, useMemo } from 'react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RegionCard } from '@/components/region-card';
import {
  getDataRegions,
  getRegionTemplates,
  isRegionsCustomized,
  updateRegions,
  resetRegionsToDefaults,
  detectRegion,
  type RegionJson,
} from '@/lib/regions/store';

export function RegionsPage() {
  const [regions, setRegions] = useState<RegionJson[] | null>(null);
  const [customized, setCustomized] = useState(false);
  const [testInput, setTestInput] = useState('');

  // 客户端挂载后再读 store（避免 SSR 期间访问 localStorage）
  useEffect(() => {
    setRegions([...getDataRegions()]);
    setCustomized(isRegionsCustomized());
  }, []);

  const persist = (next: RegionJson[]) => {
    setRegions(next);
    setCustomized(true);
    try {
      updateRegions(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleUpdate = (idx: number, next: RegionJson) => {
    if (!regions) return;
    const arr = regions.slice();
    arr[idx] = next;
    persist(arr);
  };

  const handleAdd = () => {
    if (!regions) return;
    const next: RegionJson = {
      name: '新地区',
      emoji: '🌐',
      keywords: '(?:新关键词)',
      flags: 'i',
    };
    persist([...regions, next]);
    toast.success('已新增占位地区，请填入关键字');
  };

  const handleDelete = (idx: number) => {
    if (!regions) return;
    if (regions.length <= 1) {
      toast.error('至少保留一个地区');
      return;
    }
    const arr = regions.slice();
    arr.splice(idx, 1);
    persist(arr);
  };

  const handleReset = () => {
    if (!confirm('重置后将丢失所有自定义，确定恢复默认规则吗？')) return;
    resetRegionsToDefaults();
    setRegions([...getDataRegions()]);
    setCustomized(false);
    toast.success('已恢复默认');
  };

  // 实时 regex 测试
  const matched = useMemo(() => {
    if (!testInput.trim()) return null;
    return detectRegion(testInput);
  }, [testInput]);

  if (regions === null) {
    return (
      <>
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <Card className="p-8 glass border-border/30 text-center text-muted-foreground">
            加载中…
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">地区规则</h1>
            <p className="text-sm text-muted-foreground mt-1">
              调整每条地区的识别正则。改动仅保存在你本地浏览器（localStorage），不影响其他用户。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={customized ? 'default' : 'secondary'}
              className="text-xs"
            >
              {customized ? '已定制' : '默认值'}
            </Badge>
            {customized && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="cursor-pointer"
              >
                重置为默认
              </Button>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {regions.map((r, i) => (
            <RegionCard
              key={`${r.emoji}-${r.name}-${i}`}
              region={r}
              onChange={(next) => handleUpdate(i, next)}
              onDelete={() => handleDelete(i)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleAdd}
          className="w-full cursor-pointer border-dashed"
        >
          + 新增地区
        </Button>

        {/* Live tester */}
        <Card className="p-5 glass border-border/30 space-y-3">
          <div>
            <h2 className="font-semibold text-base">实时测试</h2>
            <p className="text-xs text-muted-foreground mt-1">
              输入代理名（节点名），看哪条规则会匹配它。
            </p>
          </div>
          <Input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="例如：日本01、Hong Kong 02、🇺🇸 USA Seattle..."
            className="bg-background/50"
          />
          {testInput.trim() && (
            <div className="text-sm">
              {matched ? (
                <div className="p-3 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-2">
                  <span className="text-2xl">{matched.emoji}</span>
                  <div>
                    <div className="font-semibold">{matched.name}</div>
                    <code className="text-xs font-mono text-muted-foreground">
                      /{matched.regex.source}/{matched.regex.flags}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-muted text-muted-foreground text-sm">
                  未匹配任何地区 → 归到 🌍 其他地区
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center pt-4">
          · 编辑即时保存到 localStorage ·
          重置即恢复 <code className="font-mono">src/data/regions.json</code> 的内置默认 ·
          所有更改仅对当前浏览器生效 ·
        </p>
      </main>
    </>
  );
}
