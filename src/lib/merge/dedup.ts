import type { ProxyNode } from '@/types/clash';

export function getProxyFingerprint(proxy: ProxyNode): string {
  const type = (proxy.type || '').toLowerCase();
  const server = (proxy.server || '').toLowerCase();
  const port = proxy.port || 0;
  return `${type}:${server}:${port}`;
}

export function deduplicateProxies(
  sources: { sourceName: string; proxies: ProxyNode[] }[]
): {
  proxies: ProxyNode[];
  totalBefore: number;
  totalAfter: number;
  proxyMapping: Map<string, string>; // originalName -> deduplicatedName
} {
  const seenFingerprints = new Map<string, ProxyNode>();
  const proxyMapping = new Map<string, string>();
  const nameCountMap = new Map<string, number>();

  let totalBefore = 0;

  for (const source of sources) {
    totalBefore += source.proxies.length;

    for (const proxy of source.proxies) {
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
    totalAfter: proxies.length,
    proxyMapping,
  };
}
