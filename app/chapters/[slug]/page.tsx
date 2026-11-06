import {readChapterForReader, readerOrigin} from '@/lib/reader-chapter';
import {headers} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {Unavailable} from '@/app/shared';
import {ArticleBody,ArticleHeader} from '@/app/article-content';
export const dynamic='force-dynamic';
export default async function Chapter({params,searchParams}:{params:Promise<{slug:string}>,searchParams:Promise<{preview?:string}>}){
 const {slug}=await params;const id=slug.replace(/\.html$/,'');const query=await searchParams;
 let list:any[],c:any,preview=false;
 try {
  ({list,chapter:c,preview}=await readChapterForReader({
   id,preview:query.preview==='1',origin:readerOrigin(await headers()),
  }));
 }catch{return <Unavailable/>;}
 if(!c&&id==='boundaries'&&list.some(x=>x.id==='appendix'))redirect('/chapters/appendix.html#before-sharing');
 if(!c)notFound();
 const html:string=c.html, headings=[...html.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>({id:m[1],title:m[2].replace(/<[^>]+>/g,'')}));
 const index=list.findIndex((x:any)=>x.id===id);
 return <>{preview&&<div className="review-note">草稿预览 · 仅管理员可见</div>}<div className="reader-layout"><aside className="reader-sidebar"><p className="side-caption">学习目录</p>{list.map((x:any,i:number)=><a className={'chapter-link '+(id===x.id?'active':'')} key={x.id} href={'/chapters/'+x.id+'.html'}><span>{String(i+1).padStart(2,'0')}</span>{x.title}</a>)}</aside><main id="main" className="article hb-article reader-article"><ArticleHeader title={c.title} description={c.description}/><ArticleBody html={html}/><section className="discussion" id="discussion"><h2>围绕这一章，一起讨论</h2><p>遇到了问题，或发现更好的做法？在这里分享。</p><a className="button" href={'/community?chapter='+id}>查看本章讨论</a></section><div className="chapter-pager">{list[index-1]&&<a href={'/chapters/'+list[index-1].id+'.html'}>上一章：{list[index-1].title}</a>}{list[index+1]&&<a href={'/chapters/'+list[index+1].id+'.html'}>下一章：{list[index+1].title}</a>}</div></main><aside className="reader-outline"><p className="side-caption">本章内容</p>{headings.map((h:any)=><a href={'#'+h.id} key={h.id}>{h.title}</a>)}<a href="#discussion">参与讨论</a></aside></div></>;
}
