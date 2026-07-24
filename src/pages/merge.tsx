import { useState, useCallback } from 'react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { parseClashYaml } from '@/lib/merge/parser';
import { mergeConfigs } from '@/lib/merge/engine';
import { getRegionDistribution } from '@/lib/merge/groups';
import { loadRuleProviders, buildRuleProvidersConfig } from '@/lib/providers/store';
import type { MergeStrategy, MergeResult, SourceInput, RuleMode } from '@/types/clash';

interface ParsedSourceInfo {
  name: string;
  type: 'file' | 'url';
  content: string;
  url?: string;
  proxyCount: number;
  regionDistribution: Record<string, number>;
}

interface ShortLinkItem {
  shortId: string;
  url: string;
  updatedAt: number | null;
}

export function MergePage() {
  const [step, setStep] = useState(1);
  const [sources, setSources] = useState<ParsedSourceInfo[]>([]);
  const [strategy, setStrategy] = useState<MergeStrategy>('template');
  const [ruleMode, setRuleMode] = useState<RuleMode>('rule-set');
  const [filterRegex, setFilterRegex] = useState('测试|重置|官网|到期|流量|traffic|expire|remaining');
  const [mixedPort, setMixedPort] = useState(7890);
  const [allowLan, setAllowLan] = useState(true);
  const [mode, setMode] = useState('rule');
  const [logLevel, setLogLevel] = useState('info');
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [subUrl, setSubUrl] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [configName, setConfigName] = useState('');
  
  // 云端保存 & 覆盖已有短链接
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [existingLinks, setExistingLinks] = useState<ShortLinkItem[]>([]);
  const [selectedOverwriteId, setSelectedOverwriteId] = useState<string>('');
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudShortId, setCloudShortId] = useState('');

  const handleFiles = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.yml') && !file.name.endsWith('.yaml')) {
        toast.error(`${file.name} 不是 YAML 文件`);
        continue;
      }
      try {
        const content = await file.text();
        const config = parseClashYaml(content);
        const regionDist = getRegionDistribution(config.proxies);
        setSources((prev) => [
          ...prev,
          {
            name: file.name,
            type: 'file',
            content,
            proxyCount: config.proxies.length,
            regionDistribution: regionDist,
          },
        ]);
        toast.success(`${file.name} 解析成功: ${config.proxies.length} 个节点`);
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : '解析失败'}`);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFetchUrl = async () => {
    if (!subUrl.trim()) return;
    setFetchingUrl(true);
    try {
      const res = await fetch('/api/fetch-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: subUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      const config = parseClashYaml(data.content);
      const regionDist = getRegionDistribution(config.proxies);
      const urlName = new URL(subUrl).hostname;

      setSources((prev) => [
        ...prev,
        {
          name: urlName,
          type: 'url',
          content: data.content,
          url: subUrl,
          proxyCount: config.proxies.length,
          regionDistribution: regionDist,
        },
      ]);
      toast.success(`${urlName}: ${config.proxies.length} 个节点`);
      setSubUrl('');
    } catch {
      toast.error('拉取失败');
    } finally {
      setFetchingUrl(false);
    }
  };

  const removeSource = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    try {
      const sourceInputs: SourceInput[] = sources.map((s) => ({
        name: s.name,
        type: s.type,
        content: s.content,
        url: s.url,
      }));

      let customRuleProviders: Record<string, unknown> | undefined;
      let customRules: string[] | undefined;

      if (ruleMode === 'rule-set') {
        const { list } = await loadRuleProviders();
        const built = buildRuleProvidersConfig(list);
        customRuleProviders = built.providers;
        customRules = built.rules;
      }

      const result = mergeConfigs(sourceInputs, {
        strategy,
        generalSettings: { mixedPort, allowLan, mode, logLevel, ruleMode, filterRegex },
        customRuleProviders,
        customRules,
      });

      setMergeResult(result);
      setStep(3);
      setCloudUrl('');
      setCloudShortId('');
      toast.success('合并成功！');
      fetchExistingLinks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '合并失败');
    }
  };

  const fetchExistingLinks = async () => {
    try {
      const res = await fetch('/api/short-links', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.links)) {
        setExistingLinks(data.links);
        if (data.links.length > 0) {
          setSelectedOverwriteId(data.links[0].shortId);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!mergeResult) return;
    const blob = new Blob([mergeResult.yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configName || 'merged-config'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToCloud = async () => {
    if (!mergeResult) return;
    setSavingToCloud(true);
    try {
      const payload: { yaml: string; targetShortId?: string } = {
        yaml: mergeResult.yaml,
      };
      if (saveMode === 'overwrite' && selectedOverwriteId) {
        payload.targetShortId = selectedOverwriteId;
      }

      const res = await fetch('/api/upload-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '保存失败');
        return;
      }
      setCloudUrl(data.url);
      setCloudShortId(data.shortId);
      if (data.isOverwrite) {
        toast.success(`短链接 ${data.shortId} 已更新，URL 保持不变！`);
      } else {
        toast.success('全新短链接创建成功！');
      }
      fetchExistingLinks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '网络错误');
    } finally {
      setSavingToCloud(false);
    }
  };

  const copyCloudUrl = () => {
    if (!cloudUrl) return;
    navigator.clipboard.writeText(cloudUrl);
    toast.success('短链接已复制到剪贴板');
  };

  const totalProxies = sources.reduce((sum, s) => sum + s.proxyCount, 0);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8 sm:mb-10 gap-0">
          {[
            { num: 1, label: '添加来源' },
            { num: 2, label: '设置策略' },
            { num: 3, label: '预览结果' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => {
                  if (s.num <= step) setStep(s.num);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  step === s.num
                    ? 'bg-primary text-primary-foreground'
                    : step > s.num
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs border border-current/30">
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < 2 && (
                <div
                  className={`w-8 sm:w-16 h-px mx-1 sm:mx-2 ${
                    step > s.num ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: 添加来源 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">添加配置来源</h2>
              <p className="text-sm text-muted-foreground">
                上传 Clash YML 文件或粘贴订阅链接
              </p>
            </div>

            <Card
              className={`border-2 border-dashed transition-all duration-200 ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 hover:border-primary/30'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="p-8 sm:p-12 text-center">
                <div className="text-3xl sm:text-4xl mb-3">📁</div>
                <p className="text-sm sm:text-base font-medium mb-2">
                  拖拽 YML 文件到此处
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  支持 .yml 和 .yaml 格式
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = '.yml,.yaml';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) handleFiles(files);
                    };
                    input.click();
                  }}
                  className="cursor-pointer"
                >
                  选择文件
                </Button>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 glass border-border/30">
              <Label className="text-sm font-medium mb-2 block">
                🔗 订阅链接
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="粘贴 Clash 订阅链接..."
                  value={subUrl}
                  onChange={(e) => setSubUrl(e.target.value)}
                  className="bg-background/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFetchUrl();
                  }}
                />
                <Button
                  onClick={handleFetchUrl}
                  disabled={fetchingUrl || !subUrl.trim()}
                  className="shrink-0 cursor-pointer"
                >
                  {fetchingUrl ? '拉取中...' : '拉取'}
                </Button>
              </div>
            </Card>

            {sources.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    已添加来源 ({sources.length})
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    共 {totalProxies} 个节点
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sources.map((source, i) => (
                    <Card
                      key={i}
                      className="p-4 glass border-border/30 group hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">
                            {source.type === 'file' ? '📄' : '🔗'}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {source.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSource(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors text-sm opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {source.proxyCount} 节点
                        </Badge>
                        {Object.entries(source.regionDistribution)
                          .slice(0, 3)
                          .map(([region, count]) => (
                            <Badge
                              key={region}
                              variant="outline"
                              className="text-xs"
                            >
                              {region} {count}
                            </Badge>
                          ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={sources.length === 0}
                size="lg"
                className="cursor-pointer"
              >
                下一步: 选择策略 →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 策略与过滤设置 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">合并策略与过滤</h2>
              <p className="text-sm text-muted-foreground">
                选择代理分组生成方式、剔除无用节点及路由规则格式
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                className={`p-5 sm:p-6 cursor-pointer transition-all duration-200 ${
                  strategy === 'template'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'glass border-border/30 hover:border-primary/20'
                }`}
                onClick={() => setStrategy('template')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">🧠</div>
                  <div>
                    <h3 className="font-semibold">方案 A: 智能模板分组</h3>
                    <Badge variant="secondary" className="text-xs mt-1">
                      推荐
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  自动按地区归类节点（🇭🇰 香港 / 🇺🇸 美国 / 🇯🇵 日本...），
                  为每个地区自动产生手动/自动选择/故障转移三组。
                </p>
              </Card>

              <Card
                className={`p-5 sm:p-6 cursor-pointer transition-all duration-200 ${
                  strategy === 'preserve'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'glass border-border/30 hover:border-primary/20'
                }`}
                onClick={() => setStrategy('preserve')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">📂</div>
                  <h3 className="font-semibold">方案 B: 保留原始分组</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  保留各来源文件的原有分组结构，合并同名分组。
                  适合已有成熟配置、不想改动分组结构的用户。
                </p>
              </Card>
            </div>

            <Separator className="my-4" />

            {/* 🪠 节点正则过滤配置卡片 */}
            <Card className="p-5 sm:p-6 glass border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <span>🪠</span>
                    <span>节点关键字正则过滤 (Node Filtering)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    名字匹配该正则表达式的节点将被自动过滤剔除（例如：测试|重置|官网|流量）
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Input
                  value={filterRegex}
                  onChange={(e) => setFilterRegex(e.target.value)}
                  placeholder="如: 测试|重置|官网|到期"
                  className="font-mono text-sm bg-background/50"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  提示：支持 JavaScript RegExp 正则表达（如 <code className="font-mono text-primary">测试|重置</code> 表示名字中包含“测试”或“重置”的节点会被自动清理；留空则不触发过滤）。
                </p>
              </div>
            </Card>

            {/* 规则格式模式选择 */}
            <Card className="p-5 sm:p-6 glass border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">路由规则模式 (Rule Mode)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    支持读取用户在云端 KV 自定义的规则集配置
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label
                  onClick={() => setRuleMode('rule-set')}
                  className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                    ruleMode === 'rule-set'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/40 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="ruleMode"
                    checked={ruleMode === 'rule-set'}
                    onChange={() => setRuleMode('rule-set')}
                    className="accent-primary mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      <span>⚡ Rule Providers 模式</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">推荐</Badge>
                    </div>
                    <div className="text-xs opacity-70 mt-1 leading-relaxed">
                      自动加载云端 KV / 本地存储的自定义规则集（可以在 /providers 页面自由管理编辑）。
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setRuleMode('inline')}
                  className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                    ruleMode === 'inline'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/40 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="ruleMode"
                    checked={ruleMode === 'inline'}
                    onChange={() => setRuleMode('inline')}
                    className="accent-primary mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">📜 经典 Inline 模式</div>
                    <div className="text-xs opacity-70 mt-1 leading-relaxed">
                      直接写明逐条 <code className="font-mono">DOMAIN-SUFFIX</code> / <code className="font-mono">IP-CIDR</code> 规则，兼容传统老版 Clash。
                    </div>
                  </div>
                </label>
              </div>
            </Card>

            <Card className="p-5 sm:p-6 glass border-border/30">
              <h3 className="font-semibold mb-4">通用设置</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Mixed Port</Label>
                  <Input
                    type="number"
                    value={mixedPort}
                    onChange={(e) => setMixedPort(parseInt(e.target.value) || 7890)}
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">运行模式</Label>
                  <Select value={mode} onValueChange={(v) => v && setMode(v)}>
                    <SelectItem value="rule">Rule (规则模式)</SelectItem>
                    <SelectItem value="global">Global (全局代理)</SelectItem>
                    <SelectItem value="direct">Direct (直连)</SelectItem>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">日志级别</Label>
                  <Select value={logLevel} onValueChange={(v) => v && setLogLevel(v)}>
                    <SelectItem value="silent">Silent</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <Label className="text-sm">Allow LAN</Label>
                  <Switch
                    checked={allowLan}
                    onCheckedChange={setAllowLan}
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="cursor-pointer"
              >
                ← 返回
              </Button>
              <Button
                onClick={handleMerge}
                size="lg"
                className="cursor-pointer"
              >
                🔄 执行合并
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 预览结果 & 云端保存/覆盖 */}
        {step === 3 && mergeResult && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">合并结果</h2>
              <p className="text-sm text-muted-foreground">
                预览合并后的配置，下载或保存到云端短链接
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: '原始节点', value: mergeResult.stats.totalProxies, icon: '📊' },
                { label: '过滤踢除', value: mergeResult.stats.filteredProxies, icon: '🪠' },
                { label: '去重保留', value: mergeResult.stats.dedupedProxies, icon: '✨' },
                { label: '代理分组', value: mergeResult.stats.groupCount, icon: '📂' },
                { label: '路由规则', value: mergeResult.stats.ruleCount, icon: '📋' },
              ].map((stat) => (
                <Card key={stat.label} className="p-3 sm:p-4 glass border-border/30 text-center">
                  <div className="text-xl sm:text-2xl mb-1">{stat.icon}</div>
                  <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </Card>
              ))}
            </div>

            <Card className="glass border-border/30">
              <Tabs defaultValue="distribution" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-auto p-0">
                  <TabsTrigger
                    value="distribution"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 text-sm"
                  >
                    📊 地区分布
                  </TabsTrigger>
                  <TabsTrigger
                    value="yaml"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3 text-sm"
                  >
                    📝 YAML 预览
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="distribution" className="p-4 sm:p-5">
                  <div className="space-y-2">
                    {Object.entries(mergeResult.stats.regionDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([region, count]) => {
                        const total = mergeResult.stats.dedupedProxies || 1;
                        const percent = Math.round((count / total) * 100);
                        return (
                          <div key={region} className="flex items-center gap-3">
                            <span className="text-sm w-28 sm:w-32 shrink-0 truncate">{region}</span>
                            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(percent, 3)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-16 text-right shrink-0">
                              {count} ({percent}%)
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </TabsContent>

                <TabsContent value="yaml" className="p-0">
                  <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono overflow-x-auto max-h-96 leading-relaxed">
                    {mergeResult.yaml}
                  </pre>
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="p-4 sm:p-5 glass border-border/30">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm">配置名称（本地下载文件名）</Label>
                  <Input
                    placeholder="例如: my-merged-config"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="shrink-0 cursor-pointer"
                >
                  📥 下载本地文件
                </Button>
              </div>
            </Card>

            <Card className="p-5 glass border-border/30 space-y-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span>☁️</span>
                  <span>保存并生成/更新短链接</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  选择新建全新的短链接，或勾选已有短链接进行覆盖更新（保持 URL 链接不变）。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setSaveMode('new')}
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                    saveMode === 'new'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/40 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="saveMode"
                    checked={saveMode === 'new'}
                    onChange={() => setSaveMode('new')}
                    className="accent-primary"
                  />
                  <div>
                    <div className="font-medium text-sm">✨ 新建短链接</div>
                    <div className="text-xs opacity-70">生成随机 6 位 ID 的全新分享链接</div>
                  </div>
                </label>

                <label
                  onClick={() => {
                    if (existingLinks.length === 0) {
                      toast.error('当前云端暂无可覆盖的短链接');
                      return;
                    }
                    setSaveMode('overwrite');
                  }}
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                    saveMode === 'overwrite'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/40 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="saveMode"
                    checked={saveMode === 'overwrite'}
                    onChange={() => setSaveMode('overwrite')}
                    disabled={existingLinks.length === 0}
                    className="accent-primary"
                  />
                  <div>
                    <div className="font-medium text-sm">🔄 覆盖现有短链接</div>
                    <div className="text-xs opacity-70">
                      {existingLinks.length > 0
                        ? `选定已有的短链接进行覆盖 (共 ${existingLinks.length} 条)`
                        : '云端无已有短链接'}
                    </div>
                  </div>
                </label>
              </div>

              {saveMode === 'overwrite' && existingLinks.length > 0 && (
                <div className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-2">
                  <Label className="text-xs font-semibold">选择要覆盖的短链接 ID：</Label>
                  <Select
                    value={selectedOverwriteId}
                    onValueChange={(v) => setSelectedOverwriteId(v)}
                  >
                    {existingLinks.map((item) => (
                      <SelectItem key={item.shortId} value={item.shortId}>
                        id: {item.shortId} ({item.url})
                      </SelectItem>
                    ))}
                  </Select>
                  <p className="text-[11px] font-mono text-emerald-400 pt-1">
                    提示：覆盖后原链接字符串保持不变，任何已订阅该 URL 的设备将获取到最新 YAML 配置。
                  </p>
                </div>
              )}

              <Button
                onClick={handleSaveToCloud}
                disabled={savingToCloud}
                className="w-full cursor-pointer"
              >
                {savingToCloud
                  ? '提交保存中…'
                  : saveMode === 'overwrite'
                  ? `🔄 确认覆盖短链接 (${selectedOverwriteId})`
                  : '☁️ 确认生成新短链接'}
              </Button>

              {cloudUrl && (
                <div className="space-y-2 pt-3 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      {saveMode === 'overwrite' ? '已更新的原短链接 URL' : '生成的短链接 URL'}
                    </Label>
                    <Badge variant="outline" className="text-xs font-mono">
                      id: {cloudShortId}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={cloudUrl}
                      className="bg-background/40 font-mono text-xs text-primary"
                    />
                    <Button
                      onClick={copyCloudUrl}
                      variant="outline"
                      className="shrink-0 cursor-pointer"
                    >
                      📋 复制
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="cursor-pointer"
              >
                ← 返回修改策略
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
