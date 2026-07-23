export interface RuleProviderItem {
  key: string;
  groupName: string;
  type: string;
  behavior: 'domain' | 'ipcidr' | 'classical';
  format: 'mrs' | 'yaml' | 'text';
  url: string;
  path: string;
  interval: number;
}

export const DEFAULT_PROVIDERS_LIST: RuleProviderItem[] = [
  {
    key: 'reject',
    groupName: '🛑 广告拦截',
    type: 'http',
    behavior: 'domain',
    format: 'mrs',
    url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ads-all.mrs',
    path: './ruleset/reject.mrs',
    interval: 86400,
  },
  {
    key: 'openai',
    groupName: '🤖 OpenAI',
    type: 'http',
    behavior: 'domain',
    format: 'mrs',
    url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.mrs',
    path: './ruleset/openai.mrs',
    interval: 86400,
  },
  {
    key: 'telegram',
    groupName: '📲 Telegram',
    type: 'http',
    behavior: 'domain',
    format: 'mrs',
    url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs',
    path: './ruleset/telegram.mrs',
    interval: 86400,
  },
  {
    key: 'youtube',
    groupName: '📹 油管视频',
    type: 'http',
    behavior: 'domain',
    format: 'mrs',
    url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs',
    path: './ruleset/youtube.mrs',
    interval: 86400,
  },
  {
    key: 'netflix',
    groupName: '🎥 奈飞视频',
    type: 'http',
    behavior: 'domain',
    format: 'mrs',
    url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs',
    path: './ruleset/netflix.mrs',
    interval: 86400,
  },
  {
    key: 'bilibili',
    groupName: '🎬 哔哩哔哩',
    type: 'http',
    behavior: 'domain',
    format: 'mrs',
    url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/bilibili.mrs',
    path: './ruleset/bilibili.mrs',
    interval: 86400,
  },
];

const LOCAL_STORAGE_KEY = 'clash_merger_custom_rule_providers_v1';

/** 从后端 API 或 localStorage 读取规则集定义列表 */
export async function loadRuleProviders(): Promise<{
  list: RuleProviderItem[];
  isCustom: boolean;
}> {
  try {
    const res = await fetch('/api/rule-providers', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.isCustom && data.data && Array.isArray(data.data.list)) {
        return { list: data.data.list, isCustom: true };
      }
    }
  } catch {
    // ignore
  }

  // 本地 fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { list: parsed, isCustom: true };
        }
      }
    } catch {
      // ignore
    }
  }

  return { list: DEFAULT_PROVIDERS_LIST, isCustom: false };
}

/** 保存自定义规则集到后端 KV 和本地 */
export async function saveRuleProviders(
  list: RuleProviderItem[]
): Promise<{ ok: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  }

  try {
    const res = await fetch('/api/rule-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || '保存到 KV 失败' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '网络错误' };
  }
}

/** 重置规则集定义 */
export async function resetRuleProviders(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  try {
    await fetch('/api/rule-providers', { method: 'DELETE' });
  } catch {
    // ignore
  }
}

/** 将 RuleProviderItem 转换成 Clash 配置文件需要的结构 */
export function buildRuleProvidersConfig(list: RuleProviderItem[]): {
  providers: Record<string, unknown>;
  rules: string[];
} {
  const providers: Record<string, unknown> = {};
  const rules: string[] = [];

  for (const item of list) {
    providers[item.key] = {
      type: item.type || 'http',
      behavior: item.behavior || 'domain',
      format: item.format || 'mrs',
      url: item.url,
      path: item.path || `./ruleset/${item.key}.${item.format || 'mrs'}`,
      interval: item.interval || 86400,
    };
    rules.push(`RULE-SET,${item.key},${item.groupName}`);
  }

  // 基础 GeoIP 与 漏网之鱼 规则
  rules.push('GEOIP,LAN,🎯 全球直连');
  rules.push('GEOIP,CN,🎯 全球直连');
  rules.push('MATCH,🐟 漏网之鱼');

  return { providers, rules };
}
