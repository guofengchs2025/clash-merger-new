import type { MergeStrategy } from '@/types/clash';
import { TEMPLATE_RULES_BASE } from './templates';

export function mergeRules(
  strategy: MergeStrategy,
  sourceRulesList: string[][],
  validGroupNames: Set<string>
): string[] {
  if (strategy === 'template') {
    return [...TEMPLATE_RULES_BASE];
  }

  // Preserve 模式：合并多数据源规则并去重，过滤指向失效分组的规则
  const ruleSet = new Set<string>();

  for (const sourceRules of sourceRulesList) {
    for (const rule of sourceRules) {
      if (!rule || typeof rule !== 'string') continue;
      const parts = rule.split(',');
      if (parts.length >= 3) {
        const targetGroup = parts[2].trim();
        if (
          validGroupNames.has(targetGroup) ||
          targetGroup === 'DIRECT' ||
          targetGroup === 'REJECT'
        ) {
          ruleSet.add(rule.trim());
        }
      } else {
        ruleSet.add(rule.trim());
      }
    }
  }

  const mergedRules = Array.from(ruleSet);

  // 若最终无有效规则，添加通用兜底 MATCH
  if (mergedRules.length === 0) {
    mergedRules.push('MATCH,DIRECT');
  }

  return mergedRules;
}
