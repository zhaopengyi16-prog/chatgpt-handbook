import {readChapterForReader, readerOrigin} from '@/lib/reader-chapter';
import {headers} from 'next/headers';
import {categoryUrl} from '@/lib/public-taxonomy';
import {notFound,redirect} from 'next/navigation';
import {Unavailable} from '@/app/shared';
import {ArticleBody,ArticleHeader} from '@/app/article-content';
export const dynamic='force-dynamic';
export default async function Chapter({params,searchParams}:{params:Promise<{slug:string}>,searchParams:Promise<{preview?:string}>}){
 const {slug}=await params;const id=slug.replace(/\.html$/,'');const query=await searchParams;
 let list:any[],c:any,preview=false,labels:Awaited<ReturnType<typeof readChapterForReader>>['labels'];
 try {
  ({list,chapter:c,preview,labels}=await readChapterForReader({
   id,preview:query.preview==='1',origin:readerOrigin(await headers()),
  }));
 }catch{return <Unavailable/>;}
 if(!c&&id==='boundaries'&&list.some(x=>x.id==='appendix'))redirect('/chapters/appendix.html#before-sharing');
 if(!c)notFound();
 const html:string=c.html, headings=[...html.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>({id:m[1],title:m[2].replace(/<[^>]+>/g,'')}));
 const index=list.findIndex((x:any)=>x.id===id);
 const chapterLinks=list.map((x:any,i:number)=><a className={'chapter-link '+(id===x.id?'active':'')} aria-current={id===x.id?'page':undefined} key={x.id} href={'/chapters/'+x.id+'.html'}><span>{String(i+1).padStart(2,'0')}</span>{x.title}</a>);
 const sectionLinks=<>{headings.map((h:any)=><a href={'#'+h.id} key={h.id}>{h.title}</a>)}<a href="#discussion">参与讨论</a></>;
 return <>{preview&&<div className="review-note">草稿预览 · 仅管理员可见</div>}<div className="reader-layout">
  <details className="reader-mobile-directory"><summary>目录<span>本章小节与全部章节</span></summary><div className="reader-directory-body">
   <nav aria-label="本章小节"><h2>本章内容</h2>{sectionLinks}</nav>
   <nav aria-label="全部章节"><h2>学习目录</h2>{chapterLinks}</nav>
  </div></details>
  <aside className="reader-sidebar"><nav aria-label="学习目录"><p className="side-caption">学习目录</p>{chapterLinks}</nav></aside><main id="main" className="article hb-article reader-article">{labels&&<nav aria-label="面包屑" className="catalog-crumb">
    <a href="/">首页</a><span aria-hidden="true">›</span>
    {labels.tasks.length ? (preview ? <span>{labels.tasks[0].name}</span> : <a href={categoryUrl('tasks',labels.tasks[0].id)}>{labels.tasks[0].name}</a>) : <a href="/#all-chapters">全部章节</a>}
    <span aria-hidden="true">›</span><span aria-current="page">{c.title}</span>
  </nav>}<ArticleHeader title={c.title} description={c.description}/>{labels&&(labels.tasks.length>0 || labels.tools.length>0 || labels.level)&&<div className="catalog-chapter-tags" aria-label="章节分类">
    {labels.tasks.map(t=><span key={'task-'+t.id} className="badge">{preview?t.name:<a href={categoryUrl('tasks',t.id)}>{t.name}</a>}</span>)}
    {labels.tools.map(t=><span key={'tool-'+t.id} className="badge">{preview?t.name:<a href={categoryUrl('tools',t.id)}>{t.name}</a>}</span>)}
    {labels.level&&<span className="badge">{labels.level.name}</span>}
  </div>}<ArticleBody html={html}/><section className="discussion" id="discussion"><h2>围绕这一章，一起讨论</h2><p>遇到了问题，或发现更好的做法？在这里分享。</p><a className="button" href={'/community?chapter='+id}>查看本章讨论</a></section><nav className="chapter-pager" aria-label="章节翻页">{list[index-1]&&<a href={'/chapters/'+list[index-1].id+'.html'}>上一章：{list[index-1].title}</a>}{list[index+1]&&<a href={'/chapters/'+list[index+1].id+'.html'}>下一章：{list[index+1].title}</a>}</nav></main><aside className="reader-outline"><nav aria-label="本章小节"><p className="side-caption">本章内容</p>{sectionLinks}</nav></aside></div></>;
}
