import type { ProxyGroup, ProxyNode } from '@/types/clash';
import { detectRegion } from '@/lib/regions/store';
import { TEMPLATE_GROUPS_BASE } from './templates';

export function getRegionDistribution(proxies: ProxyNode[]): Record<string, number> {
  const dist: Record<string, number> = {};

  for (const proxy of proxies) {
    const matched = detectRegion(proxy.name);
    const regionName = matched ? `${matched.emoji} ${matched.name}` : '🌍 其他地区';
    dist[regionName] = (dist[regionName] || 0) + 1;
  }

  return dist;
}

export function buildTemplateGroups(proxies: ProxyNode[]): ProxyGroup[] {
  const allProxyNames = proxies.map((p) => p.name);

  // 节点分组按地区归类
  const regionProxiesMap = new Map<string, string[]>();

  for (const proxy of proxies) {
    const matched = detectRegion(proxy.name);
    const groupName = matched ? `${matched.emoji} ${matched.name}` : '🌍 其他地区';

    if (!regionProxiesMap.has(groupName)) {
      regionProxiesMap.set(groupName, []);
    }
    regionProxiesMap.get(groupName)!.push(proxy.name);
  }

  // 生成地区分组：为每个地区自动产生 select (主组) + url-test (自动选择) + fallback (故障转移)
  const regionGroups: ProxyGroup[] = [];
  const mainRegionGroupNames: string[] = [];

  for (const [name, proxyList] of regionProxiesMap.entries()) {
    if (proxyList.length > 0) {
      const urlTestName = `${name} - 自动选择`;
      const fallbackName = `${name} - 故障转移`;

      // 1) 自动选择组 (url-test)
      const urlTestGroup: ProxyGroup = {
        name: urlTestName,
        type: 'url-test',
        proxies: proxyList,
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        tolerance: 50,
      };

      // 2) 故障转移组 (fallback)
      const fallbackGroup: ProxyGroup = {
        name: fallbackName,
        type: 'fallback',
        proxies: proxyList,
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        timeout: 5000,
      };

      // 3) 手动选择主组 (select)，优先放自动选择和故障转移选项
      const mainSelectGroup: ProxyGroup = {
        name,
        type: 'select',
        proxies: [urlTestName, fallbackName, ...proxyList],
      };

      regionGroups.push(mainSelectGroup, urlTestGroup, fallbackGroup);
      mainRegionGroupNames.push(name);
    }
  }

  const activeRegionGroupNames = mainRegionGroupNames;

  // 基础策略组
  const baseGroups: ProxyGroup[] = TEMPLATE_GROUPS_BASE.map((tmpl) => {
    let groupProxies: string[];

    if (tmpl.name === '🚀 节点选择') {
      groupProxies = [
        '♻️ 自动选择',
        ...activeRegionGroupNames,
        ...allProxyNames,
        'DIRECT',
      ];
    } else if (tmpl.name === '♻️ 自动选择') {
      groupProxies = allProxyNames.length > 0 ? allProxyNames : ['DIRECT'];
    } else if (
      ([
        '🤖 OpenAI',
        '📲 Telegram',
        '🎬 哔哩哔哩',
        '📹 油管视频',
        '🎥 奈飞视频',
        '📺 国际媒体',
        '🐟 漏网之鱼',
      ] as string[]).includes(String(tmpl.name))
    ) {
      groupProxies = ['🚀 节点选择', ...activeRegionGroupNames, '🎯 全球直连'];
    } else if (tmpl.name === '🎯 全球直连') {
      groupProxies = ['DIRECT', '🚀 节点选择'];
    } else if (tmpl.name === '🛑 广告拦截') {
      groupProxies = ['REJECT', 'DIRECT', '🚀 节点选择'];
    } else {
      groupProxies = allProxyNames.length > 0 ? allProxyNames : ['DIRECT'];
    }

    return {
      name: tmpl.name,
      type: tmpl.type,
      ...tmpl,
      proxies: groupProxies,
    } as ProxyGroup;
  });

  return [...baseGroups, ...regionGroups];
}

export function buildPreserveGroups(
  proxies: ProxyNode[],
  sources: { sourceName: string; groups: ProxyGroup[] }[],
  proxyMapping: Map<string, string>
): ProxyGroup[] {
  const mergedGroupsMap = new Map<string, ProxyGroup>();
  const allProxyNames = proxies.map((p) => p.name);

  for (const source of sources) {
    for (const group of source.groups) {
      const mappedProxies = (group.proxies || [])
        .map((name: string) => proxyMapping.get(name) || name)
        .filter((name: string) => Boolean(name));

      if (mergedGroupsMap.has(group.name)) {
        const existing = mergedGroupsMap.get(group.name)!;
        const combined = Array.from(new Set([...existing.proxies, ...mappedProxies]));
        mergedGroupsMap.set(group.name, {
          ...existing,
          proxies: combined,
        });
      } else {
        mergedGroupsMap.set(group.name, {
          ...group,
          proxies: Array.from(new Set(mappedProxies)),
        });
      }
    }
  }

  // 保证有一个主选择组
  if (!mergedGroupsMap.has('PROXY') && !mergedGroupsMap.has('🚀 节点选择')) {
    mergedGroupsMap.set('🚀 节点选择', {
      name: '🚀 节点选择',
      type: 'select',
      proxies: allProxyNames.length > 0 ? allProxyNames : ['DIRECT'],
    });
  }

  return Array.from(mergedGroupsMap.values());
}
