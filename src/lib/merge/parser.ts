import yaml from 'js-yaml';
import type { ClashConfig, ProxyNode } from '@/types/clash';

export function parseClashYaml(content: string): ClashConfig {
  if (!content || typeof content !== 'string') {
    throw new Error('YAML 内容为空');
  }

  let doc: unknown;
  try {
    doc = yaml.load(content);
  } catch (err) {
    throw new Error(`YAML 解析错误: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('无效的 Clash 配置文件结构');
  }

  const obj = doc as Record<string, unknown>;

  if (!Array.isArray(obj.proxies)) {
    obj.proxies = [];
  }

  const proxies: ProxyNode[] = (obj.proxies as unknown[]).filter((p): p is ProxyNode => {
    if (!p || typeof p !== 'object') return false;
    const item = p as Record<string, unknown>;
    return (
      typeof item.name === 'string' &&
      typeof item.type === 'string' &&
      typeof item.server === 'string'
    );
  });

  return {
    ...obj,
    proxies,
    'proxy-groups': Array.isArray(obj['proxy-groups']) ? (obj['proxy-groups'] as any[]) : [],
    rules: Array.isArray(obj.rules) ? (obj.rules as string[]) : [],
  };
}

export function serializeClashYaml(config: ClashConfig): string {
  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

export function parseSource(
  name: string,
  content: string,
  type: 'file' | 'url',
  url?: string
) {
  const config = parseClashYaml(content);
  return {
    name,
    type,
    content,
    url,
    config,
  };
}
