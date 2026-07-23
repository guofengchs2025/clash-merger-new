import type { ProxyGroup } from '@/types/clash';
import defaultProvidersData from '@/data/default-providers.json';
import { buildRuleProvidersConfig } from '@/lib/providers/store';

export const DEFAULT_DNS = {
  enable: true,
  ipv6: false,
  'default-nameserver': ['223.5.5.5', '119.29.29.29'],
  enhanced: {
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'fake-ip-filter': [
      '*.lan',
      '*.local',
      'localhost.ptlogin2.qq.com',
    ],
  },
  nameserver: [
    'https://dns.alidns.com/dns-query',
    'https://doh.pub/dns-query',
  ],
  fallback: [
    'https://doh.dns.sb/dns-query',
    'https://dns.cloudflare.com/dns-query',
  ],
  'fallback-filter': {
    geojson: true,
    'geojson-code': 'CN',
    ipcidr: ['240.0.0.0/4'],
  },
};

const builtDefaults = buildRuleProvidersConfig(defaultProvidersData as any);

/** 从 default-providers.json 派生的标准 Rule Providers */
export const DEFAULT_RULE_PROVIDERS = builtDefaults.providers;

/** 从 default-providers.json 派生的标准规则 */
export const TEMPLATE_RULESET_RULES = builtDefaults.rules;

export const TEMPLATE_GROUPS_BASE: Omit<ProxyGroup, 'proxies'>[] = [
  { name: '🚀 节点选择', type: 'select' },
  { name: '♻️ 自动选择', type: 'url-test', url: 'https://www.gstatic.com/generate_204', interval: 300, tolerance: 50 },
  { name: '🎯 全球直连', type: 'select' },
  { name: '🛑 广告拦截', type: 'select' },
  { name: '🤖 OpenAI', type: 'select' },
  { name: '📲 Telegram', type: 'select' },
  { name: '🎬 哔哩哔哩', type: 'select' },
  { name: '📹 油管视频', type: 'select' },
  { name: '🎥 奈飞视频', type: 'select' },
  { name: '📺 国际媒体', type: 'select' },
  { name: '🐟 漏网之鱼', type: 'select' },
];

/** 传统经典 Inline 规则 (逐条 DOMAIN 匹配) */
export const TEMPLATE_RULES_BASE: string[] = [
  'DOMAIN-KEYWORD,adguard,🛑 广告拦截',
  'DOMAIN-KEYWORD,adaway,🛑 广告拦截',
  'DOMAIN-SUFFIX,openai.com,🤖 OpenAI',
  'DOMAIN-SUFFIX,chatgpt.com,🤖 OpenAI',
  'DOMAIN-SUFFIX,oaistatic.com,🤖 OpenAI',
  'DOMAIN-SUFFIX,oaiusercontent.com,🤖 OpenAI',
  'DOMAIN-SUFFIX,anthropic.com,🤖 OpenAI',
  'DOMAIN-SUFFIX,claude.ai,🤖 OpenAI',
  'DOMAIN-SUFFIX,t.me,📲 Telegram',
  'DOMAIN-SUFFIX,tdesktop.com,📲 Telegram',
  'DOMAIN-SUFFIX,telegram.me,📲 Telegram',
  'DOMAIN-SUFFIX,telegram.org,📲 Telegram',
  'IP-CIDR,91.108.4.0/22,📲 Telegram,no-resolve',
  'IP-CIDR,91.108.56.0/22,📲 Telegram,no-resolve',
  'IP-CIDR,91.108.8.0/22,📲 Telegram,no-resolve',
  'IP-CIDR,91.108.12.0/22,📲 Telegram,no-resolve',
  'IP-CIDR,91.108.20.0/22,📲 Telegram,no-resolve',
  'IP-CIDR,149.154.160.0/20,📲 Telegram,no-resolve',
  'DOMAIN-SUFFIX,bilibili.com,🎬 哔哩哔哩',
  'DOMAIN-SUFFIX,biliapi.net,🎬 哔哩哔哩',
  'DOMAIN-SUFFIX,googlevideo.com,📹 油管视频',
  'DOMAIN-SUFFIX,youtube.com,📹 油管视频',
  'DOMAIN-SUFFIX,netflix.com,🎥 奈飞视频',
  'DOMAIN-SUFFIX,netflix.net,🎥 奈飞视频',
  'DOMAIN-SUFFIX,nflxext.com,🎥 奈飞视频',
  'DOMAIN-SUFFIX,nflxso.net,🎥 奈飞视频',
  'GEOIP,LAN,🎯 全球直连',
  'GEOIP,CN,🎯 全球直连',
  'MATCH,🐟 漏网之鱼',
];
