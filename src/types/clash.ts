/**
 * Clash 节点和配置相关类型定义
 */

export interface ProxyNode {
  name: string;
  type: string;
  server: string;
  port: number;
  [key: string]: unknown;
}

export interface ProxyGroup {
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance';
  proxies: string[];
  url?: string;
  interval?: number;
  tolerance?: number;
  strategy?: string;
  [key: string]: unknown;
}

export interface ClashConfig {
  'mixed-port'?: number;
  'allow-lan'?: boolean;
  mode?: string;
  'log-level'?: string;
  'external-controller'?: string;
  dns?: Record<string, unknown>;
  'rule-providers'?: Record<string, unknown>;
  proxies: ProxyNode[];
  'proxy-groups': ProxyGroup[];
  rules: string[];
  [key: string]: unknown;
}

export type MergeStrategy = 'template' | 'preserve';
export type RuleMode = 'rule-set' | 'inline';

export interface GeneralSettings {
  mixedPort: number;
  allowLan: boolean;
  mode: string;
  logLevel: string;
  ruleMode: RuleMode;
}

export interface MergeOptions {
  strategy: MergeStrategy;
  generalSettings: GeneralSettings;
}

export interface MergeStats {
  totalProxies: number;
  dedupedProxies: number;
  groupCount: number;
  ruleCount: number;
  regionDistribution: Record<string, number>;
}

export interface MergeResult {
  yaml: string;
  stats: MergeStats;
}

export interface SourceInput {
  name: string;
  type: 'file' | 'url';
  content: string;
  url?: string;
}
