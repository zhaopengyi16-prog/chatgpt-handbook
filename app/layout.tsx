import type { Metadata } from 'next';
import './globals.css';
import './catalog.css';
import { Account, ReadingTools } from './shared';
import { Toaster } from '@/components/ui/sonner';
export const metadata: Metadata = {title:'ChatGPT 使用手册 · 开放教程',description:'阅读 ChatGPT 与 Codex 实践教程，分享问题、经验和改进建议。'};
export default function Layout({children}:{children:React.ReactNode}) {
 return <html lang="zh-CN"><body><a className="skip" href="#main">跳到正文</a><header className="header"><a className="brand" href="/"><span className="brand-mark">AI</span><span>ChatGPT 使用手册</span></a><nav aria-label="主导航"><a href="/">教程</a><a href="/community">讨论社区</a><a href="/updates">更新</a><Account/></nav></header>{children}<footer className="footer"><span>ChatGPT 使用手册 · 开放教程</span><span><a href="/contribute">共建与许可</a> · <a href="/admin">内容管理</a></span></footer><ReadingTools/><Toaster/></body></html>;
}
