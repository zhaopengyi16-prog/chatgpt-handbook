import type { Metadata } from 'next';
import './globals.css';
import './catalog.css';
import '@/public/assets/style-preview/miaomiao-font/fonts.css';
import './miaomiao.css';
import './miaomiao-reading.css';
import {ReadingTools} from './shared';
import {SessionProvider} from './session-user';
import {SiteHeader} from './site-shell';
export const metadata: Metadata = {title:{default:'AI 妙妙屋 · 一起学会使用 AI',template:'%s · AI 妙妙屋'},description:'从想做的事情出发，学习 AI 工具与实用方法，分享问题、经验和发现。'};
export default function Layout({children}:{children:React.ReactNode}) {
 return <html lang="zh-CN"><body className="miaomiao-site"><SessionProvider><a className="skip" href="#main">跳到正文</a><SiteHeader/>{children}<footer className="mm-site-footer"><div className="mm-footer-grass mm-material" data-material="grass" aria-hidden="true"/><div className="mm-footer-dirt mm-material" data-material="dirt" aria-hidden="true"/><div className="mm-footer-stone mm-material" data-material="stone"><div className="mm-footer-inner"><div><strong>AI 妙妙屋</strong><p>从一个小问题开始，一起把 AI 用起来。</p></div><nav aria-label="页脚导航"><a href="/updates">更新日志</a><a href="/contribute">共建与许可</a><a href="/admin">内容管理</a></nav><small>MIAOMIAO HOUSE · 持续生长的 AI 学习社区</small></div></div></footer><ReadingTools/></SessionProvider></body></html>;
}
