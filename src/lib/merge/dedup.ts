import type { ProxyNode } from '@/types/clash';

export function getProxyFingerprint(proxy: ProxyNode): string {
  const type = (proxy.type || '').toLowerCase();
  const server = (proxy.server || '').toLowerCase();
  const port = proxy.port || 0;
  return `${type}:${server}:${port}`;
}

export function deduplicateProxies(
  sources: { sourceName: string; proxies: ProxyNode[] }[],
  filterRegexPattern?: string
): {
  proxies: ProxyNode[];
  totalBefore: number;
  totalFiltered: number;
  totalAfter: number;
  proxyMapping: Map<string, string>; // originalName -> deduplicatedName
} {
  const seenFingerprints = new Map<string, ProxyNode>();
  const proxyMapping = new Map<string, string>();
  const nameCountMap = new Map<string, number>();

  let totalBefore = 0;
  let totalFiltered = 0;

  let filterRegex: RegExp | null = null;
  if (filterRegexPattern && filterRegexPattern.trim()) {
    try {
      filterRegex = new RegExp(filterRegexPattern.trim(), 'i');
    } catch {
      // 无效正则表达式则不触发过滤
    }
  }

  for (const source of sources) {
    totalBefore += source.proxies.length;

    for (const proxy of source.proxies) {
      // 1. 如果匹配过滤正则表达式，直接踢除
      if (filterRegex && filterRegex.test(proxy.name)) {
        totalFiltered++;
        continue;
      }

      const fp = getProxyFingerprint(proxy);

      if (seenFingerprints.has(fp)) {
        // 重复节点：使用首次出现的节点名做映射
        const existing = seenFingerprints.get(fp)!;
        proxyMapping.set(proxy.name, existing.name);
      } else {
        // 新节点：消除同名节点冲突
        let finalName = proxy.name;
        if (nameCountMap.has(finalName)) {
          const count = nameCountMap.get(finalName)! + 1;
          nameCountMap.set(finalName, count);
          finalName = `${finalName}-${count}`;
        } else {
          nameCountMap.set(finalName, 1);
        }

        const normalizedProxy: ProxyNode = {
          ...proxy,
          name: finalName,
        };

        seenFingerprints.set(fp, normalizedProxy);
        proxyMapping.set(proxy.name, finalName);
      }
    }
  }

  const proxies = Array.from(seenFingerprints.values());

  return {
    proxies,
    totalBefore,
    totalFiltered,
    totalAfter: proxies.length,
    proxyMapping,
  };
}
