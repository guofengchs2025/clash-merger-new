import type { MergeStrategy, RuleMode } from '@/types/clash';

export interface UserMergeSettings {
  strategy: MergeStrategy;
  ruleMode: RuleMode;
  filterRegex: string;
  mixedPort: number;
  allowLan: boolean;
  mode: string;
  logLevel: string;
}

export const DEFAULT_USER_SETTINGS: UserMergeSettings = {
  strategy: 'template',
  ruleMode: 'rule-set',
  filterRegex: '测试|重置|官网|到期|流量|traffic|expire|remaining',
  mixedPort: 7890,
  allowLan: true,
  mode: 'rule',
  logLevel: 'info',
};

const LOCAL_STORAGE_KEY = 'clash_merger_user_settings_v1';

/** 从云端 KV 或本地读取合并偏好与过滤配置 */
export async function loadUserSettings(): Promise<UserMergeSettings> {
  try {
    const res = await fetch('/api/user-settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        const merged = { ...DEFAULT_USER_SETTINGS, ...data.settings };
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_USER_SETTINGS, ...parsed };
      }
    } catch {
      // ignore
    }
  }

  return DEFAULT_USER_SETTINGS;
}

/** 保存合并偏好与过滤配置到云端 KV 与本地 */
export async function saveUserSettings(settings: UserMergeSettings): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  }

  try {
    await fetch('/api/user-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch {
    // ignore
  }
}
