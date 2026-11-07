import {publicUpdates} from '@/lib/public-updates';

export default function Page(){
  return <main id="main" className="wide article mm-document-page"><header className="mm-document-heading"><p className="home-label">AI 妙妙屋 · 持续完善</p><h1>更新记录</h1><p>看看教程和社区最近有哪些变化。</p></header>
    <div className="mm-updates">{publicUpdates.map(item=><section className="mm-update-entry box" id={item.id} key={item.id}><h2>{item.title}</h2><p>{item.description}</p></section>)}</div>
  </main>;
}
