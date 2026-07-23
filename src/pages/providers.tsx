import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  loadRuleProviders,
  saveRuleProviders,
  resetRuleProviders,
  type RuleProviderItem,
} from '@/lib/providers/store';

export function ProvidersPage() {
  const [list, setList] = useState<RuleProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    const result = await loadRuleProviders();
    setList(result.list);
    setIsCustom(result.isCustom);
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleUpdateItem = (index: number, keyName: keyof RuleProviderItem, value: any) => {
    setList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [keyName]: value };
      return next;
    });
  };

  const handleAddItem = () => {
    const newItem: RuleProviderItem = {
      key: `custom_${Date.now().toString(36)}`,
      groupName: '🚀 节点选择',
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs',
      path: `./ruleset/custom_${Date.now().toString(36)}.mrs`,
      interval: 86400,
    };
    setList((prev) => [...prev, newItem]);
    toast.success('已添加新规则集配置项');
  };

  const handleDeleteItem = (index: number) => {
    if (list.length <= 1) {
      toast.error('至少保留一项规则集');
      return;
    }
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // 校验
    for (const item of list) {
      if (!item.key.trim()) {
        toast.error('规则集标识 Key 不能为空');
        return;
      }
      if (!item.url.trim()) {
        toast.error(`[${item.key}] 订阅 URL 不能为空`);
        return;
      }
    }

    setSaving(true);
    const r = await saveRuleProviders(list);
    setSaving(false);

    if (r.ok) {
      setIsCustom(true);
      toast.success('自定义 Rule Providers 已成功保存至云端 KV！');
    } else {
      toast.error(r.error || '保存到 KV 失败');
    }
  };

  const handleReset = async () => {
    if (!confirm('重置后将清除云端 KV 与本地保存的自定义规则集，确认恢复默认值吗？')) return;
    await resetRuleProviders();
    await fetchProviders();
    toast.success('已恢复系统默认规则集');
  };

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold">
              <span>⚡</span>
              <span>自定义 Rule Providers</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              自定义规则集供应商（如 MetaCubeX .mrs 订阅）。修改后保存可直接同步更新至 Cloudflare DATA_KV。
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant={isCustom ? 'default' : 'secondary'} className="text-xs">
              {isCustom ? '☁️ 云端/自定义' : '内置默认'}
            </Badge>
            {isCustom && (
              <Button variant="outline" size="sm" onClick={handleReset} className="cursor-pointer">
                重置为默认
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <Card className="p-12 text-center text-muted-foreground glass border-border/30">
            正在读取 Rule Providers 配置…
          </Card>
        ) : (
          <div className="space-y-4">
            {list.map((item, index) => (
              <Card key={index} className="p-4 sm:p-5 glass border-border/30 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      #{index + 1}
                    </span>
                    <Input
                      value={item.key}
                      onChange={(e) => handleUpdateItem(index, 'key', e.target.value)}
                      placeholder="规则标识 (如 openai)"
                      className="font-mono text-sm font-semibold h-8 bg-background/50 w-36"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">→ 指向分组:</span>
                    <Input
                      value={item.groupName}
                      onChange={(e) => handleUpdateItem(index, 'groupName', e.target.value)}
                      placeholder="如 🤖 OpenAI"
                      className="text-sm h-8 bg-background/50 w-36"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteItem(index)}
                    className="h-8 text-xs text-destructive hover:text-destructive cursor-pointer self-end sm:self-auto"
                  >
                    🗑️ 删除
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Behavior 行为</Label>
                    <Select
                      value={item.behavior}
                      onValueChange={(v) => handleUpdateItem(index, 'behavior', v)}
                    >
                      <SelectItem value="domain">domain (域名)</SelectItem>
                      <SelectItem value="ipcidr">ipcidr (IP 段)</SelectItem>
                      <SelectItem value="classical">classical (混合/经典)</SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Format 格式</Label>
                    <Select
                      value={item.format}
                      onValueChange={(v) => handleUpdateItem(index, 'format', v)}
                    >
                      <SelectItem value="mrs">mrs (Mihomo 二进制推荐)</SelectItem>
                      <SelectItem value="yaml">yaml (文本 YAML)</SelectItem>
                      <SelectItem value="text">text (纯文本列表)</SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">更新间隔 (秒)</Label>
                    <Input
                      type="number"
                      value={item.interval}
                      onChange={(e) =>
                        handleUpdateItem(index, 'interval', parseInt(e.target.value) || 86400)
                      }
                      className="h-9 bg-background/50 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs text-muted-foreground">规则集在线 URL 订阅链接</Label>
                  <Input
                    value={item.url}
                    onChange={(e) => {
                      handleUpdateItem(index, 'url', e.target.value);
                      handleUpdateItem(index, 'path', `./ruleset/${item.key}.${item.format || 'mrs'}`);
                    }}
                    placeholder="https://raw.githubusercontent.com/..."
                    className="font-mono text-xs bg-background/40"
                  />
                </div>
              </Card>
            ))}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleAddItem}
                className="flex-1 cursor-pointer border-dashed"
              >
                + 新增 Rule Provider 项
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 cursor-pointer"
              >
                {saving ? '保存到 KV 中…' : '☁️ 保存更改并同步至 Cloudflare KV'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
