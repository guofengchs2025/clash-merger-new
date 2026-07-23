import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';

const features = [
  {
    icon: '📁',
    title: '多源合并',
    description: '支持同时上传多个 YML 文件或粘贴订阅链接，一键智能合并',
  },
  {
    icon: '🧠',
    title: '智能分组',
    description: '自动识别节点所在地区，按地区归类生成标准代理分组',
  },
  {
    icon: '🌐',
    title: '本地可视化规则',
    description: '/regions 页面提供地区识别正则的可视化编辑，改动仅保存在你浏览器',
  },
  {
    icon: '🛡️',
    title: '节点去重',
    description: '智能检测重复节点（同服务器/端口/协议），保留最优配置',
  },
  {
    icon: '📋',
    title: '内置规则',
    description: '预设分流规则模板，覆盖 AI 服务、流媒体、Telegram 等常用场景',
  },
  {
    icon: '🔒',
    title: '隐私安全',
    description: '全浏览器端解析合并，结果仅留在本地。零服务器，零云端',
  },
];

export function HomePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-72 h-48 sm:h-72 bg-purple-500/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-20 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm text-primary mb-6 sm:mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              开源免费 · 纯前端合并
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              <span className="gradient-text">智能合并</span>
              <br className="sm:hidden" />
              <span className="text-foreground"> 你的 Clash 配置</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
              多个机场订阅、自建节点，一键合并为统一配置。
              <br className="hidden sm:block" />
              自动去重、智能分组、生成云端订阅链接。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link href="/merge">
                <Button size="lg" className="w-full sm:w-auto text-base px-6 sm:px-8 cursor-pointer">
                  🚀 开始合并
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="p-5 sm:p-6 glass border-border/30 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="text-2xl sm:text-3xl mb-3 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Security Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="text-center mb-8 sm:mb-10">
            <div className="text-3xl sm:text-4xl mb-3">🛡️</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">你的隐私，我们的底线</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              整个流程无服务器接触你的节点数据
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <Card className="p-5 sm:p-6 glass border-border/30">
              <div className="flex items-start gap-4">
                <div className="text-2xl shrink-0">🖥️</div>
                <div>
                  <h3 className="font-semibold mb-1">全部本地运算</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    YAML 解析、节点去重、分组合并、规则生成等核心逻辑<strong className="text-foreground">全部在你的浏览器中运行</strong>。
                    上传的本地文件不经过任何服务器。
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6 glass border-border/30">
              <div className="flex items-start gap-4">
                <div className="text-2xl shrink-0">🚫</div>
                <div>
                  <h3 className="font-semibold mb-1">零云端存储</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    合并后的 YAML 内容不会上传到任何服务器，
                    <strong className="text-foreground">留在你的浏览器内存里</strong>，
                    只通过本地下载按钮保存到磁盘。
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6 glass border-border/30">
              <div className="flex items-start gap-4">
                <div className="text-2xl shrink-0">🌐</div>
                <div>
                  <h3 className="font-semibold mb-1">远程订阅仅做转发</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    若你粘贴远程订阅链接，服务端仅作纯代理转发
                    （避开 CORS），<strong className="text-foreground">不存储任何内容</strong>。
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/30 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Clash Merger · 纯前端 Clash 配置合并工具</p>
        </footer>
      </main>
    </>
  );
}
