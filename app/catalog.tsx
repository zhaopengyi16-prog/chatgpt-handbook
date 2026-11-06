import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {categoryUrl, filterCatalog, queryValues, readPublicCatalog, recentPublicTopics,
  type PublicCatalog, type Query, type Scope} from '@/lib/public-taxonomy';
import {publicUpdates} from '@/lib/public-updates';
import {readerOrigin} from '@/lib/reader-chapter';
import type {Category} from '@/lib/taxonomy-types';
import {Unavailable} from './shared';

type Topics = Awaited<ReturnType<typeof recentPublicTopics>> | null;

const symbols:Record<string,string> = {
  cube:'M3 7 12 2 21 7 21 17 12 22 3 17ZM3 7l9 5 9-5m-9 5v10', code:'m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 18',
  ruler:'M3 3v18h18Zm4 8v6h6m-6-9-2 2m6 2-2 2m6 2-2 2', file:'M5 2h10l4 4v16H5Zm10 0v5h4M8 12h8m-8 4h6',
  window:'M2 4h20v16H2Zm0 5h20M5 6.5h1m2 0h1', film:'M2 5h20v15H2Zm4 0v15m12-15v15M2 10h4m-4 5h4m12-5h4m-4 5h4',
  frame:'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6m4 1 4-5 3 3 2-2 2 4', chat:'M3 4h18v13H10l-6 4v-4H3ZM7 9h10m-10 4h6',
  pencil:'m4 16 12-12 4 4L8 20l-5 1Zm10-10 4 4', globe:'M2 12h20m-10-10c-7 6-7 14 0 20 7-6 7-14 0-20Zm0 0a10 10 0 1 0 .1 0',
  layers:'M2 8 12 3l10 5-10 5Zm0 5 10 5 10-5M2 17l10 5 10-5', agent:'M4 7h16v13H4ZM12 7V3m-4 9h1m6 0h1m-8 4h8',
  desk:'M2 4h20v13H2Zm10 13v4m-5 0h10', book:'M2 4q6-2 10 2 4-4 10-2v15q-6-2-10 2-4-4-10-2Zm10 2v15',
  steps:'M2 20h6v-6h6V8h8M15 3h7v7',
};
function CategoryIcon({icon}:{icon:string}) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" strokeLinecap="round"><path d={symbols[icon] ?? symbols.book}/></svg>;
}
function filtersLink(base:string, query:Query, omit:string[]) {
  const search=new URLSearchParams();
  for(const key of ['task','tool','level']) if(!omit.includes(key))
    for(const value of queryValues(query,key)) search.append(key,value);
  return base+(search.size?'?'+search.toString():'');
}

function Filters({catalog,query,scope,base}:{catalog:PublicCatalog;query:Query;scope?:Scope;base:string}) {
  const group=scope?.group==='tools'?'tasks':'tools';
  const key=group==='tasks'?'task':'tool';
  return <form className="box catalog-filters" method="get" action={base}>
    <h2>筛选教程</h2>
    <fieldset><legend>{group==='tasks'?'想做什么':'使用工具'} <small>可多选</small></legend>
      <div className="catalog-choice-list">{catalog[group].map(c=><label key={c.id}>
        <input type="checkbox" name={key} value={c.id} defaultChecked={queryValues(query,key).includes(c.id)}/>{c.name}
      </label>)}</div>
    </fieldset>
    {!scope && queryValues(query,'task').filter(id=>catalog.tasks.some(c=>c.id===id)).map(id=><input key={id} type="hidden" name="task" value={id}/>)}
    <label className="catalog-level">难度<select name="level" defaultValue={queryValues(query,'level')[0] ?? ''}>
      <option value="">所有难度</option>{catalog.levels.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select></label>
    <div className="actions"><button type="submit" className="button primary">应用筛选</button><a className="catalog-text-link" href={base}>清除筛选</a></div>
  </form>;
}

function Directory({catalog,chapters,title,invalid,active,base,query}:{catalog:PublicCatalog;chapters:PublicCatalog['chapters'];title:string;invalid:string[];active:boolean;base:string;query:Query}) {
  return <section id="all-chapters" aria-labelledby="chapters-heading">
    <div className="section-heading"><h2 id="chapters-heading">{title}</h2>{!invalid.length&&<span>{chapters.length} 篇教程</span>}</div>
    {invalid.length ? <div className="empty"><p>这个筛选条件无效，或对应的分类已下线。</p>
      <a className="catalog-text-link" href={filtersLink(base,query,invalid)}>移除无效筛选</a></div> :
    !chapters.length ? <div className="empty"><p>{active?'没有符合条件的教程。':'还没有发布教程。'}</p>
      {active&&<a className="catalog-text-link" href={base}>清除筛选</a>}</div> :
    <div className="chapter-cards">{chapters.map(c=><a className="chapter-card" href={'/chapters/'+encodeURIComponent(c.id)+'.html'} key={c.id}>
      <span className="chapter-number">{String(c.ordinal).padStart(2,'0')}</span><div>
        <h3>{c.title}</h3>{c.description&&<p>{c.description}</p>}
        {catalog.ready&&<div className="catalog-card-tags">
          {catalog.tools.filter(t=>c.tags.tools.includes(t.id)).map(t=><span className="badge" key={t.id}>{t.name}</span>)}
          {c.tags.level&&<span>{catalog.levels.find(l=>l.id===c.tags.level)?.name}</span>}
        </div>}
      </div><span aria-hidden="true">↗</span></a>)}</div>}
  </section>;
}
function News({topics}:{topics:Topics}) {
  return <div className="home-bottom catalog-news">
    <section className="box"><h2>最近讨论</h2>
      {topics?.length ? <ul>{topics.map(t=><li key={t.id}><a href={'/topics/'+encodeURIComponent(t.id)}>{t.title}</a></li>)}</ul>
      : <p>{topics?'还没有公开讨论。你可以先提出一个问题。':'暂时无法读取讨论。'}</p>}
      <a href="/community" className="catalog-text-link">前往讨论社区 →</a></section>
    <section className="box"><h2>最近更新</h2><ul>{publicUpdates.slice(0,2).map(u=><li key={u.id}>
      <a href={'/updates#'+u.id}>{u.title}</a><p>{u.description}</p></li>)}</ul><a href="/updates" className="catalog-text-link">全部更新 →</a></section>
  </div>;
}

// Keep the pre-taxonomy reader experience until the owner has initialized a valid catalog.
function OriginalHome({chapters}:{chapters:PublicCatalog['chapters']}) {
  const chapterHref=(id:string)=>'/chapters/'+encodeURIComponent(id)+'.html';
  return <main className="wide" id="main">
    <section className="intro"><p className="home-label">从入门，到真实工作</p>
      <h1>把 AI 用在<br/>你想完成的事情上。</h1>
      <p>一份持续更新的 ChatGPT 与 Codex 实践手册。<br/>按步骤学习，也把你的问题和发现留在这里。</p>
      <div className="actions">{chapters[0]&&<a className="button primary" href={chapterHref(chapters[0].id)}>开始阅读</a>}
        <a className="button" href="/community">参与讨论</a></div>
    </section>
    <div id="all-chapters" className="section-heading"><h2>学习目录</h2><span>{chapters.length} 个章节 · 持续更新</span></div>
    <div className="chapter-cards">{chapters.map(c=><a key={c.id} className="chapter-card" href={chapterHref(c.id)}>
      <span className="chapter-number">{String(c.ordinal).padStart(2,'0')}</span>
      <div><h3>{c.title}</h3><p>{c.description}</p></div><span aria-hidden="true">↗</span>
    </a>)}</div>
    {!chapters.length&&<p className="empty-state">还没有发布章节。</p>}
  </main>;
}

function CatalogView({catalog,query,scope,category,topics}:{catalog:PublicCatalog;query:Query;scope?:Scope;category?:Category & {count:number};topics:Topics}) {
  const base=scope?categoryUrl(scope.group,scope.id):'/';
  if(!catalog.ready) return <OriginalHome chapters={catalog.chapters}/>;
  const {chapters,invalid,active} = filterCatalog(catalog,query,scope);
  const comingSoon = !!category && category.count===0 && !active;
  return <main className="wide learning-catalog" id="main">
    {scope&&<nav aria-label="面包屑" className="catalog-crumb"><a href="/">首页</a><span aria-hidden="true">›</span><span>{scope.group==='tasks'?'学习场景':'按工具学习'}</span></nav>}
    <header className="intro catalog-intro">
      <p className="home-label">{scope?(scope.group==='tasks'?'学习场景':'按工具学习'):'AI 学习手册 · 开放教程'}</p>
      <h1>{category?.name ?? '你想做什么？'}</h1>
      <p>{category?.description ?? '从手边的任务开始，找到合适的工具和教程。'}</p>
    </header>
    <div className={'catalog-layout'+(scope?' catalog-scope':'')}>
      {scope&&<Filters catalog={catalog} query={query} scope={scope} base={base}/>}<div>
      {!scope ? <section aria-labelledby="scenes-heading"><div className="section-heading"><h2 id="scenes-heading">按场景学习</h2><a className="catalog-text-link" href="/#all-chapters">全部章节 ↓</a></div>
        {catalog.tasks.length ? <div className="catalog-scenes">{catalog.tasks.map(task=><a key={task.id} className="box catalog-scene"
          href={filtersLink(categoryUrl('tasks',task.id),query,['task'])}>
          <span className="catalog-scene-top"><span className="catalog-icon"><CategoryIcon icon={task.icon}/></span><span>{task.count?task.count+' 篇教程':'即将上线'}</span></span>
          <h3>{task.name}</h3><p>{task.description}</p></a>)}</div> : <p>场景教程正在准备中，可以先从全部章节开始。</p>}
        {catalog.tools.length>0&&<nav className="catalog-tool-index" aria-label="按工具浏览"><span>按工具浏览</span>{catalog.tools.map(t=><a key={t.id} href={filtersLink(categoryUrl('tools',t.id),query,['tool'])}>{t.name} ↗</a>)}</nav>}
      </section> :
      comingSoon ? <section className="box"><h2>即将上线</h2><p>这个分类还没有公开教程。</p><a className="catalog-text-link" href="/#all-chapters">浏览全部章节 →</a></section> :
      <Directory catalog={catalog} chapters={chapters} title="本分类教程" invalid={invalid} active={active} base={base} query={query}/>}
    </div>{!scope&&<Filters catalog={catalog} query={query} base={base}/>}</div>
    {!scope&&<><Directory catalog={catalog} chapters={chapters} title={active?'筛选结果':'全部章节'} invalid={invalid} active={active} base={base} query={query}/><News topics={topics}/></>}
  </main>;
}

export async function renderCatalogPage(query:Query,scope?:Scope) {
  let catalog:PublicCatalog;
  try {catalog=await readPublicCatalog(readerOrigin(await headers()));}catch{return <Unavailable/>;}
  const category=scope?catalog[scope.group].find(c=>c.id===scope.id):undefined;
  if(scope&&catalog.ready&&!category) notFound();
  const topics=(!scope&&catalog.ready) ? await recentPublicTopics().catch(()=>null) : null;
  return <CatalogView catalog={catalog} query={query} scope={scope} category={category} topics={topics}/>;
}
