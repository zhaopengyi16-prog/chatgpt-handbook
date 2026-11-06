import {publicChapters} from '@/lib/data';
import {Unavailable} from './shared';
export const dynamic='force-dynamic';
export default async function Home(){
 let chapters:any[];try{chapters=await publicChapters();}catch{return <Unavailable/>;}
 return <main className="wide" id="main"><section className="intro"><p className="home-label">从入门，到真实工作</p><h1>把 AI 用在<br/>你想完成的事情上。</h1><p>一份持续更新的 ChatGPT 与 Codex 实践手册。<br/>按步骤学习，也把你的问题和发现留在这里。</p><div className="actions">{chapters[0]&&<a className="button primary" href={'/chapters/'+chapters[0].id+'.html'}>开始阅读</a>}<a className="button" href="/community">参与讨论</a></div></section><div className="section-heading"><h2>学习目录</h2><span>{chapters.length} 个章节 · 持续更新</span></div><div className="chapter-cards">{chapters.map((c:any,i:number)=><a className="chapter-card" href={'/chapters/'+c.id+'.html'} key={c.id}><span className="chapter-number">{String(i+1).padStart(2,'0')}</span><div><h3>{c.title}</h3><p>{c.description}</p></div><span aria-hidden="true">↗</span></a>)}</div>{!chapters.length&&<p className="empty-state">还没有发布章节。</p>}</main>;
}
