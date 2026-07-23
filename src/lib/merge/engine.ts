import type { ClashConfig, MergeOptions, MergeResult, SourceInput } from '@/types/clash';
import { parseSource, serializeClashYaml } from './parser';
import { deduplicateProxies } from './dedup';
import { buildTemplateGroups, buildPreserveGroups, getRegionDistribution } from './groups';
import { mergeRules } from './rules';
import { DEFAULT_DNS, DEFAULT_RULE_PROVIDERS } from './templates';

export function mergeConfigs(
  sourceInputs: SourceInput[],
  options: MergeOptions
): MergeResult {
  const { strategy, generalSettings, customRuleProviders, customRules } = options;
  const ruleMode = generalSettings.ruleMode || 'rule-set';

  // 1. 解析所有来源
  const parsedSources = sourceInputs.map((input) =>
    parseSource(input.name, input.content, input.type, input.url)
  );

  // 2. 提取并去重代理
  const proxiesBySource = parsedSources.map((s) => ({
    sourceName: s.name,
    proxies: s.config.proxies,
  }));

  const { proxies, totalBefore, totalAfter, proxyMapping } = deduplicateProxies(proxiesBySource);

  // 3. 构建代理分组
  let proxyGroups;
  if (strategy === 'template') {
    proxyGroups = buildTemplateGroups(proxies);
  } else {
    const sourceGroups = parsedSources
      .filter((s) => s.config['proxy-groups'] && s.config['proxy-groups']!.length > 0)
      .map((s) => ({
        sourceName: s.name,
        groups: s.config['proxy-groups']!,
      }));
    proxyGroups = buildPreserveGroups(proxies, sourceGroups, proxyMapping);
  }

  // 4. 合并规则
  const validGroupNames = new Set([
    ...proxyGroups.map((g) => g.name),
    'DIRECT',
    'REJECT',
  ]);
  const sourceRules = parsedSources.map((s) => s.config.rules || []);
  let rules: string[];

  if (ruleMode === 'rule-set' && customRules && customRules.length > 0) {
    rules = [...customRules];
  } else {
    rules = mergeRules(strategy, sourceRules, validGroupNames, ruleMode);
  }

  // 5. 组装最终配置
  const mergedConfig: ClashConfig = {
    'mixed-port': generalSettings.mixedPort,
    'allow-lan': generalSettings.allowLan,
    mode: generalSettings.mode,
    'log-level': generalSettings.logLevel,
    'external-controller': '127.0.0.1:9090',
    dns: DEFAULT_DNS,
    proxies,
    'proxy-groups': proxyGroups,
    rules,
  };

  // 如果启用 Rule-Set 模式，注入 rule-providers 字段
  if (ruleMode === 'rule-set') {
    mergedConfig['rule-providers'] = customRuleProviders || DEFAULT_RULE_PROVIDERS;
  }

  // 6. 序列化为 YAML 字符串
  const yamlStr = serializeClashYaml(mergedConfig);

  // 7. 统计信息
  const regionDistribution = getRegionDistribution(proxies);

  return {
    yaml: yamlStr,
    stats: {
      totalProxies: totalBefore,
      dedupedProxies: totalAfter,
      groupCount: proxyGroups.length,
      ruleCount: rules.length,
      regionDistribution,
    },
  };
}
