import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {categoryUrl, filterCatalog, queryValues, readPublicCatalog, recentPublicTopics,
  type PublicCatalog, type PublicCategory, type Query, type Scope} from '@/lib/public-taxonomy';
import {publicUpdates} from '@/lib/public-updates';
import {readerOrigin} from '@/lib/reader-chapter';
import {CATEGORIES} from '@/lib/content';
import {categoryMaterial} from '@/lib/category-material';
import type {Material} from '@/lib/taxonomy-types';
import HouseArt from '@/components/miaomiao/house';
import SkyClouds from '@/components/miaomiao/sky';
import {CategoryIcon} from '@/components/miaomiao/icon';
import {GroundBand} from '@/components/miaomiao/ground';
import {Unavailable} from './shared';

type Topics = Awaited<ReturnType<typeof recentPublicTopics>> | null;
const chapterHref=(id:string)=>'/chapters/'+encodeURIComponent(id)+'.html';
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
      {!catalog[group].length&&<p className="catalog-muted">这个维度的教程正在准备中。</p>}
    </fieldset>
    {!scope && queryValues(query,'task').filter(id=>catalog.tasks.some(c=>c.id===id)).map(id=><input key={id} type="hidden" name="task" value={id}/>)}
    <label className="catalog-level">难度<select name="level" defaultValue={queryValues(query,'level')[0] ?? ''}>
      <option value="">所有难度</option>{catalog.levels.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select></label>
    <div className="actions"><button type="submit" className="button primary">应用筛选</button><a className="catalog-text-link" href={base}>清除筛选</a></div>
  </form>;
}

function Directory({catalog,chapters,title,invalid,active,base,query}:{catalog:PublicCatalog;chapters:PublicCatalog['chapters'];title:string;invalid:string[];active:boolean;base:string;query:Query}) {
  return <section id="all-chapters" className="catalog-section" aria-labelledby="chapters-heading">
    <div className="section-heading"><h2 id="chapters-heading">{title}</h2>{!invalid.length&&<span>{chapters.length} 篇教程</span>}</div>
    {invalid.length ? <div className="empty"><p>这个筛选条件无效，或对应的分类已下线。</p>
      <a className="catalog-text-link" href={filtersLink(base,query,invalid)}>移除无效筛选</a></div> :
    !chapters.length ? <div className="empty"><p>{active?'没有符合条件的教程。':'还没有发布教程。'}</p>
      {active&&<a className="catalog-text-link" href={base}>清除筛选</a>}</div> :
    <div className="chapter-cards">{chapters.map(c=><a className="chapter-card" href={chapterHref(c.id)} key={c.id}>
      <span className="chapter-number">{String(c.ordinal).padStart(2,'0')}</span><div>
        <h3>{c.title}</h3>{c.description&&<p>{c.description}</p>}
        {catalog.ready&&<div className="catalog-card-tags">
          {catalog.tools.filter(t=>c.tags.tools.includes(t.id)).map(t=><span className="badge" key={t.id}>{t.name}</span>)}
          {c.tags.level&&<span className="badge">{catalog.levels.find(l=>l.id===c.tags.level)?.name}</span>}
        </div>}
      </div><span aria-hidden="true">↗</span></a>)}</div>}
  </section>;
}

function Hero({chapters,ready}:{chapters:PublicCatalog['chapters'];ready:boolean}) {
  return <><section className="catalog-sky mm-sky" aria-labelledby="welcome-title">
    <SkyClouds/>
    <div className="catalog-wrap catalog-hero">
      <div className="catalog-hero-copy"><p className="catalog-eyebrow">MIAOMIAO HOUSE · 一起把想法搭出来</p>
        <h1 id="welcome-title">{ready?<>欢迎来到<br/><span>AI 妙妙屋</span></>:<>把 AI 用在<br/>你想完成的事情上。</>}</h1>
        <p className="catalog-intro-copy">{ready?'从一个问题、一项任务开始，找到适合你的 AI 工具与方法。一起学习，也分享你的发现。':'一份持续更新的 ChatGPT 与 Codex 实践手册。按步骤学习，也把你的问题和发现留在这里。'}</p>
        <div className="actions catalog-hero-actions">{chapters[0]&&<a className="button primary" href={chapterHref(chapters[0].id)}>{ready?'从入门开始':'开始阅读'}</a>}<a className="button" href="/community">参与讨论</a></div>
        <div className="catalog-hero-tags" aria-label="社区特色"><span className="badge">开放教程</span><span className="badge">按步骤学习</span><span className="badge">共同成长</span></div>
      </div>
      <div className="catalog-house" aria-hidden="true"><HouseArt/><span>MIAOMIAO HOUSE</span></div>
    </div>
  </section><GroundBand/></>;
}

function RoomCard({category,query}:{category:PublicCategory;query:Query}) {
  return <a className="catalog-room-card" href={filtersLink(categoryUrl('tasks',category.id),query,['task'])}>
    <div className="catalog-material-strip mm-material" data-material={category.material ?? categoryMaterial(category)}>
      <CategoryIcon icon={category.icon}/><span className="catalog-strip-label">ROOM {String(category.order+1).padStart(2,'0')}</span>
    </div>
    <div className="catalog-room-copy"><h3>{category.name}</h3><p>{category.description}</p><div className="catalog-room-bottom"><span className="badge">{category.count?category.count+' 篇教程':'即将上线'}</span><span aria-hidden="true">↗</span></div></div>
  </a>;
}
function Rooms({catalog,query}:{catalog:PublicCatalog;query:Query}) {
  return <section id="rooms" className="catalog-section" aria-labelledby="rooms-heading">
    <div className="section-heading"><div><h2 id="rooms-heading">妙妙屋的房间</h2><p>你想做什么？选一个场景，开始探索。</p></div><a className="catalog-text-link" href="/#all-chapters">全部教程 ↓</a></div>
    <div className="catalog-room-grid">{catalog.tasks.map(category=><RoomCard key={category.id} category={category} query={query}/>)}
      <a className="catalog-room-card catalog-room-propose" href={'/community?'+new URLSearchParams({category:'功能建议'})}><span aria-hidden="true" className="catalog-plus">＋</span><h3>想学别的？</h3><p>到论坛说说你的想法，<br/>一起添一个新房间。</p></a>
    </div>
    {!catalog.tasks.length&&<p className="catalog-muted">场景教程正在准备中，可以先从全部章节开始。</p>}
  </section>;
}

// Public difficulty categories supply every difficulty step; the scene step is
// an actual navigation affordance, not a hard-coded difficulty category.
export function LearningRoute({catalog}:{catalog:PublicCatalog}) {
  const scene={id:'choose-scene',name:'选一个场景',description:'从手边的任务开始，找到合适的教程。',href:'#rooms',material:'stone' as Material,count:undefined as number|undefined};
  const levels=catalog.levels.map(level=>({id:'level-'+level.id,name:level.name,description:level.description,href:'/?'+new URLSearchParams({level:level.id})+'#all-chapters',material:level.material??categoryMaterial(level),count:level.count}));
  const steps=levels.length?[levels[0],scene,...levels.slice(1)]:[scene];
  return <section className="catalog-section" aria-labelledby="route-heading">
    <div className="section-heading"><div><h2 id="route-heading">学习路线</h2><p>不知道从哪开始？沿着这条路走。</p></div></div>
    <ol className="catalog-learning-route">{steps.map((step,index)=><li key={step.id}>
      <a className="catalog-route mm-material" data-material={step.material} href={step.href}>
        <div className="catalog-route-paper"><span className="catalog-route-level">LV.{index+1}</span><h3>{step.name}</h3><p>{step.description}</p>{step.count===0&&<span className="badge">即将上线</span>}</div>
      </a>
    </li>)}</ol>
  </section>;
}
function Tools({catalog,query}:{catalog:PublicCatalog;query:Query}) {
  return <section id="tools" className="catalog-section" aria-labelledby="tools-heading">
    <div className="section-heading"><div><h2 id="tools-heading">工具专区</h2><p>同一件事，换个工具怎么做。</p></div><span className="catalog-scroll-hint">左右滑动查看更多 →</span></div>
    {catalog.tools.length ? <div className="catalog-tools-scroll" role="region" aria-label="工具卡片，可横向滚动" tabIndex={0}><div className="catalog-tool-grid">
      {catalog.tools.map(tool=><a key={tool.id} className="catalog-tool-card" href={filtersLink(categoryUrl('tools',tool.id),query,['tool'])}>
        <div className="catalog-material-strip mm-material" data-material={tool.material??categoryMaterial(tool)}><CategoryIcon icon={tool.icon}/><span className="catalog-strip-label">TOOL</span></div>
        <div className="catalog-tool-copy"><h3>{tool.name}</h3><p>{tool.count?tool.count+' 篇教程':'即将上线'}</p></div>
      </a>)}
    </div></div> : <div className="empty"><p>工具教程正在准备中，可以先浏览全部章节。</p></div>}
  </section>;
}
const forumMaterials:Material[]=['grass','water','sand','gem'];
function News({topics}:{topics:Topics}) {
  return <>
    <section className="catalog-section catalog-forum box" aria-labelledby="forum-heading">
      <div className="section-heading"><div><h2 id="forum-heading">论坛广场</h2><p>提出具体问题，分享实践经验，一起完善教程。</p></div><a href="/community" className="button primary">参与讨论</a></div>
      <nav className="catalog-forum-purposes" aria-label="讨论用途">{CATEGORIES.map((category,index)=><a key={category} href={'/community?'+new URLSearchParams({category})}><span className="catalog-color-chip mm-material" data-material={forumMaterials[index%forumMaterials.length]} aria-hidden="true"/>{category}</a>)}</nav>
      {topics===null?<div className="empty"><p>暂时无法读取讨论。</p><a href="/community" className="catalog-text-link">到社区重试 →</a></div>:
      topics.length?<ul className="catalog-topics">{topics.map(topic=><li key={topic.id}><a href={'/topics/'+encodeURIComponent(topic.id)}>{topic.title}</a><span className="badge">{topic.category}</span></li>)}</ul>:
      <div className="empty catalog-forum-empty"><CategoryIcon icon="chat"/><h3>这里还没有讨论</h3><p>说说你遇到的问题，让经验从这里开始。</p><a className="button" href="/community">发起第一个讨论</a></div>}
      <p className="catalog-forum-note">游客也能提交问题，审核后公开。<a className="catalog-text-link" href="/community">查看全部讨论 →</a></p>
    </section>
    <section className="catalog-section catalog-updates box" aria-labelledby="updates-heading"><div className="section-heading"><h2 id="updates-heading">更新日志</h2><a href="/updates" className="catalog-text-link">全部更新 →</a></div><ul>{publicUpdates.slice(0,3).map(update=><li key={update.id}><a href={'/updates#'+update.id}>{update.title}</a><p>{update.description}</p></li>)}</ul></section>
  </>;
}

// No taxonomy initialization or automatic category writes on a public read.
// Keep the original chapter directory and links available before initialization.
function OriginalHome({chapters}:{chapters:PublicCatalog['chapters']}) {
  return <main className="catalog-home" id="main"><Hero chapters={chapters} ready={false}/><div className="catalog-wrap catalog-home-content">
    <section className="catalog-section" id="all-chapters" aria-labelledby="original-directory-title"><div className="section-heading"><h2 id="original-directory-title">学习目录</h2><span>{chapters.length} 个章节 · 持续更新</span></div>
      <div className="chapter-cards">{chapters.map(c=><a key={c.id} className="chapter-card" href={chapterHref(c.id)}><span className="chapter-number">{String(c.ordinal).padStart(2,'0')}</span><div><h3>{c.title}</h3><p>{c.description}</p></div><span aria-hidden="true">↗</span></a>)}</div>
      {!chapters.length&&<p className="empty-state">还没有发布章节。</p>}
    </section>
    <section id="tools" className="catalog-section box"><h2>从教程认识工具</h2><p>按章节学习 ChatGPT 与 Codex，再到社区分享你的问题和发现。</p><a className="catalog-text-link" href="#all-chapters">浏览学习目录 →</a></section>
  </div></main>;
}

export function CatalogView({catalog,query,scope,category,topics}:{catalog:PublicCatalog;query:Query;scope?:Scope;category?:PublicCategory;topics:Topics}) {
  const base=scope?categoryUrl(scope.group,scope.id):'/';
  if(!catalog.ready) return <OriginalHome chapters={catalog.chapters}/>;
  const {chapters,invalid,active}=filterCatalog(catalog,query,scope);
  const comingSoon=!!category&&category.count===0&&!active;
  if(scope) return <main className="wide learning-catalog catalog-scoped" id="main">
    <nav aria-label="面包屑" className="catalog-crumb"><a href="/">首页</a><span aria-hidden="true">›</span><a href={scope.group==='tasks'?'/#rooms':'/#tools'}>{scope.group==='tasks'?'学习场景':'按工具学习'}</a><span aria-hidden="true">›</span><span aria-current="page">{category?.name}</span></nav>
    <header className="catalog-category-header"><div className="catalog-material-strip mm-material" data-material={category?category.material??categoryMaterial(category):'stone'}><CategoryIcon icon={category?.icon??'book'}/><span className="catalog-strip-label">{scope.group==='tasks'?'ROOM':'TOOL'}</span></div><div><p className="home-label">{scope.group==='tasks'?'学习场景':'按工具学习'}</p><h1>{category?.name}</h1><p>{category?.description}</p></div></header>
    <div className="catalog-layout catalog-scope"><Filters catalog={catalog} query={query} scope={scope} base={base}/><div>
      {comingSoon?<section className="box"><h2>即将上线</h2><p>这个分类还没有公开教程。</p><a className="catalog-text-link" href="/#all-chapters">浏览全部章节 →</a></section>:
        <Directory catalog={catalog} chapters={chapters} title="本分类教程" invalid={invalid} active={active} base={base} query={query}/>}
    </div></div>
  </main>;
  return <main className="catalog-home learning-catalog" id="main"><Hero chapters={catalog.chapters} ready/>
    <div className="catalog-wrap catalog-home-content"><Rooms catalog={catalog} query={query}/><LearningRoute catalog={catalog}/><Tools catalog={catalog} query={query}/>
      <section className="catalog-section catalog-find" aria-label="按工具和难度筛选教程"><Filters catalog={catalog} query={query} base={base}/></section>
      <Directory catalog={catalog} chapters={chapters} title={active?'筛选结果':'全部章节'} invalid={invalid} active={active} base={base} query={query}/><News topics={topics}/>
    </div>
  </main>;
}

export async function renderCatalogPage(query:Query,scope?:Scope) {
  let catalog:PublicCatalog;
  try {catalog=await readPublicCatalog(readerOrigin(await headers()));}catch{return <Unavailable/>;}
  const category=scope?catalog[scope.group].find(c=>c.id===scope.id):undefined;
  if(scope&&catalog.ready&&!category) notFound();
  const topics=(!scope&&catalog.ready)?await recentPublicTopics().catch(()=>null):null;
  return <CatalogView catalog={catalog} query={query} scope={scope} category={category} topics={topics}/>;
}
