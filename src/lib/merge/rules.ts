import type { MergeStrategy, RuleMode } from '@/types/clash';
import { TEMPLATE_RULES_BASE, TEMPLATE_RULESET_RULES } from './templates';

export function mergeRules(
  strategy: MergeStrategy,
  sourceRulesList: string[][],
  validGroupNames: Set<string>,
  ruleMode: RuleMode = 'rule-set'
): string[] {
  if (strategy === 'template') {
    return ruleMode === 'rule-set' ? [...TEMPLATE_RULESET_RULES] : [...TEMPLATE_RULES_BASE];
  }

  // Preserve 模式：合并多数据源规则并去重
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

  if (mergedRules.length === 0) {
    mergedRules.push('MATCH,DIRECT');
  }

  return mergedRules;
}
