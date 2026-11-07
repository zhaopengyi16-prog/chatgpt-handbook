'use client';
import {useState,useEffect,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {api} from '../shared';
import {useSessionUser,SessionNotice} from '../session-user';
import {createRequestGate,sessionScopeKey} from '../session-store';
const categories=['使用求助','经验分享','内容纠错','功能建议'];
export default function Forum(){
 const session=useSessionUser(),user=session.user,accountReady=session.status==='ready';
 const [items,setItems]=useState<any[]>([]),[chapters,setChapters]=useState<any[]>([]);
 const [q,setQ]=useState(''),[category,setCategory]=useState(''),[chapter,setChapter]=useState(''),[page,setPage]=useState(1),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[listError,setListError]=useState(''),[chapterError,setChapterError]=useState('');
 const [open,setOpen]=useState(false),[title,setTitle]=useState(''),[body,setBody]=useState(''),[name,setName]=useState(''),[postCategory,setPostCategory]=useState(categories[0]);
 const requestId=useRef(''),nameEdited=useRef(false),requests=useRef(createRequestGate());
 const [composerScope,setComposerScope]=useState<string|null>(null);
 const scope=sessionScopeKey(session,'new-topic'),currentScope=useRef(scope);currentScope.current=scope;
 const composerOpen=accountReady&&composerScope===scope&&open;
 const [receipt,setReceipt]=useState('');
 async function load(nextPage=1,search=q,cat=category,ch=chapter){
  const request=requests.current.begin();setLoading(true);setListError('');
  try{
   const params=new URLSearchParams({page:String(nextPage),q:search,category:cat,chapter:ch});
   const d=await api('topics?'+params,{signal:request.signal});
   if(request.isCurrent()){setItems(d.items);setTotal(d.total);setPage(nextPage);}
  }catch(e){if(request.isCurrent())setListError((e as Error).message);}
  finally{if(request.isCurrent())setLoading(false);}
 }
 useEffect(()=>{
  currentScope.current=scope;
  const params=new URLSearchParams(location.search),ch=params.get('chapter')||'',search=params.get('q')||'';
  const requestedCategory=params.get('category')||'',cat=categories.includes(requestedCategory)?requestedCategory:'';
  setChapter(ch);setCategory(cat);setQ(search);void load(1,search,cat,ch);
  const controller=new AbortController();
  api('chapters',{signal:controller.signal}).then(c=>{if(!controller.signal.aborted)setChapters(c.items);}).catch(e=>{if(!controller.signal.aborted)setChapterError(e.message);});
  return()=>{currentScope.current=null;controller.abort();requests.current.cancel();};
 },[]);
 useEffect(()=>{
  setComposerScope(scope);setOpen(false);setTitle('');setBody('');setName('');setPostCategory(categories[0]);setReceipt('');setError('');setBusy(false);requestId.current='';nameEdited.current=false;
 },[session.generation]);
 useEffect(()=>{if(accountReady){setComposerScope(scope);if(!nameEdited.current)setName(user?.name||'');}},[accountReady,user?.id,user?.name,scope]);
 async function submit(e:React.FormEvent){e.preventDefault();if(busy||!composerOpen)return;const submittedScope=scope;setBusy(true);setError('');setReceipt('');requestId.current ||= crypto.randomUUID();try{const d=await api('topics',{method:'POST',body:JSON.stringify({id:requestId.current,title,body,authorName:name,category:postCategory,chapterId:chapter||null})});if(submittedScope!==currentScope.current)return;if(d.pending){setReceipt('已提交，审核通过后公开。你可以继续浏览社区。');setOpen(false);setTitle('');setBody('');requestId.current='';}else location.href='/topics/'+d.id;}catch(e){if(submittedScope===currentScope.current)setError((e as Error).message);}finally{if(submittedScope===currentScope.current)setBusy(false);}}
 const selected=chapters.find(c=>c.id===chapter);
 return <main id="main" className="workspace mm-forum"><div className="topline"><div><p className="home-label">一起学习，一起解决</p><h1>{selected?selected.title+' · 讨论':'论坛广场'}</h1><p>提一个具体问题，分享一次实践，或让这份手册更准确。</p></div><Button disabled={!accountReady} aria-expanded={composerOpen} aria-controls="new-topic" onClick={()=>setOpen(!composerOpen)}>{composerOpen?'收起编辑':'发起讨论'}</Button></div>
 <SessionNotice/>
 {composerScope===scope&&error&&<div className="error-message" role="alert">{error}</div>}
 {composerScope===scope&&receipt&&<div className="submission-receipt" role="status">{receipt}</div>}
 {composerOpen&&<form id="new-topic" className="box forum-form" onSubmit={submit}><h2>发起讨论</h2>{accountReady&&!user&&<p className="participation-note">当前以游客身份提交，审核通过后公开。游客留言由管理员维护；如需自己编辑或删除，请先 <a href={'/signin-with-chatgpt?return_to='+encodeURIComponent('/community'+(chapter?'?chapter='+chapter:''))} target="_top">使用 ChatGPT 登录</a>。</p>}<label className="field"><span>标题</span><input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="用一句话说明你的问题或发现"/></label><div className="editor-top"><label className="field"><span>公开昵称</span><input required maxLength={40} value={name} onChange={e=>{nameEdited.current=true;setName(e.target.value);}}/></label><label className="field"><span>分类</span><select value={postCategory} onChange={e=>setPostCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div><label className="field"><span>内容</span><textarea required maxLength={20000} rows={7} value={body} onChange={e=>setBody(e.target.value)} placeholder="说明使用环境、操作步骤、实际结果，以及你想得到什么帮助。"/></label><p className="muted">{selected?'关联章节：'+selected.title:'这是一个独立讨论。'} 公开昵称和正文会对所有读者展示。</p><Button type="submit" disabled={busy||!accountReady}>{busy?'正在提交…':!accountReady?'等待确认登录状态':user?'发布讨论':'提交审核'}</Button></form>}
 <div className="forum-layout"><section aria-label="讨论列表"><form className="controls" onSubmit={e=>{e.preventDefault();void load();}}><input className="search" aria-label="搜索讨论" placeholder="搜索问题、关键词…" value={q} onChange={e=>setQ(e.target.value)}/><Button variant="outline" type="submit" disabled={loading}>搜索</Button></form><div className="controls"><select className="filter" aria-label="按分类筛选" value={category} onChange={e=>{setCategory(e.target.value);void load(1,q,e.target.value,chapter);}}><option value="">全部分类</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select className="filter" aria-label="按章节筛选" value={chapter} onChange={e=>{setChapter(e.target.value);void load(1,q,category,e.target.value);}}><option value="">全部章节</option>{chapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>{!loading&&!listError&&<span className="muted" aria-live="polite">{total} 个话题</span>}</div>
 {chapterError&&<p className="error-message" role="status">章节筛选暂时不可用：{chapterError}</p>}
 <div aria-busy={loading} className="forum-results">
 {loading?<p className="empty" role="status">正在读取讨论…</p>:listError?<div className="empty" role="alert"><h2>讨论暂时未能加载</h2><p>{listError}</p><Button variant="outline" onClick={()=>void load(page)}>重新读取讨论</Button></div>:items.length?items.map(t=><article className="topic-row" key={t.id}><div className="grow"><div className="topic-meta">{!!t.pinned&&<span className="badge">置顶</span>}<span>{t.category}</span>{!!t.locked&&<span>已锁定</span>}</div><a href={'/topics/'+t.id}><h3>{t.title}</h3></a><div className="topic-meta"><span>{t.author_name}</span>{t.author_kind==='guest'&&<span className="badge">游客</span>}<span>{new Date(t.updated_at).toLocaleDateString('zh-CN')}</span></div></div><span className="topic-reply-count">{t.reply_count} 回复</span></article>):<div className="empty"><h2>{q||category||chapter?'没有找到匹配的讨论':'还没有讨论'}</h2><p>可以换个关键词，或分享你的第一个问题。</p></div>}
 </div>
 <nav className="pagination" aria-label="讨论分页"><Button variant="outline" disabled={loading||!!listError||page===1} onClick={()=>void load(page-1)}>上一页</Button><span>第 {page} 页</span><Button variant="outline" disabled={loading||!!listError||page*20>=total} onClick={()=>void load(page+1)}>下一页</Button></nav></section><aside className="community-note"><h2>让交流更有帮助</h2><p>尽量写明具体步骤和实际结果。引用资料时附上出处，尊重不同经验。</p><p>阅读无需登录。游客可提交问题和回复，审核通过后公开；登录后可直接发布并管理自己的发言。</p><a href="/#all-chapters">返回教程目录</a>{user?.admin&&<a href="/admin">管理讨论</a>}</aside></div></main>;
}
