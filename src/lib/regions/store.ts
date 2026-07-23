import defaultRegionsData from '@/data/regions.json';

export interface RegionJson {
  name: string;
  emoji: string;
  keywords: string;
  flags?: string;
}

export interface CompiledRegionRule {
  name: string;
  emoji: string;
  regex: RegExp;
}

const STORAGE_KEY = 'clash_merger_custom_regions_v1';

let cachedRules: CompiledRegionRule[] | null = null;

export function compileRegionRule(json: RegionJson): CompiledRegionRule {
  try {
    const flags = json.flags ?? 'i';
    const regex = new RegExp(json.keywords, flags);
    return { name: json.name, emoji: json.emoji, regex };
  } catch {
    return {
      name: json.name,
      emoji: json.emoji,
      regex: /(?!.*)/, // 编译失败则退化为永不匹配
    };
  }
}

export function getDataRegions(): RegionJson[] {
  if (typeof window === 'undefined') {
    return defaultRegionsData as RegionJson[];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRegionsData as RegionJson[];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as RegionJson[];
    }
  } catch {
    // ignore
  }
  return defaultRegionsData as RegionJson[];
}

export function getRegionTemplates(): CompiledRegionRule[] {
  if (!cachedRules) {
    const data = getDataRegions();
    cachedRules = data.map(compileRegionRule);
  }
  return cachedRules;
}

export function updateRegions(regions: RegionJson[]): void {
  for (const r of regions) {
    new RegExp(r.keywords, r.flags ?? 'i');
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
  }
  cachedRules = regions.map(compileRegionRule);
}

export function resetRegionsToDefaults(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  cachedRules = (defaultRegionsData as RegionJson[]).map(compileRegionRule);
}

export function isRegionsCustomized(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function detectRegion(name: string): CompiledRegionRule | null {
  const rules = getRegionTemplates();
  for (const rule of rules) {
    if (rule.regex.test(name)) {
      return rule;
    }
  }
  return null;
}
