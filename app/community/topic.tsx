'use client';
import {useState,useEffect,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {api} from '../shared';
import {Confirm} from '../confirm';
import {useSessionUser,SessionNotice} from '../session-user';
import {createRequestGate,sessionReadScopeKey,type SessionSnapshot} from '../session-store';
const categories=['使用求助','经验分享','内容纠错','功能建议'];
export default function Topic({id}:{id:string}){
 const session=useSessionUser();
 return <TopicSessionBoundary id={id} session={session}/>;
}
export function TopicSessionBoundary({id,session}:{id:string;session:SessionSnapshot}){
 const scope=sessionReadScopeKey(session,id);
 // Refresh unmounts old content/editors. A fresh read still works when /me is pending or fails;
 // the detail API enforces visibility, while the view separately disables unverified writes.
 if(scope===null)return <main id="main" className="workspace mm-topic"><a href="/community" className="button">返回论坛广场</a><SessionNotice/>{session.status==='loading'&&<p className="empty" role="status">正在读取讨论…</p>}</main>;
 return <TopicView key={scope} id={id}/>;
}
function TopicView({id}:{id:string}){
 const session=useSessionUser(),user=session.user,accountReady=session.status==='ready';
 const [topic,setTopic]=useState<any>(null),[replies,setReplies]=useState<any[]>([]),[error,setError]=useState(''),[loadError,setLoadError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[body,setBody]=useState(''),[name,setName]=useState(''),[page,setPage]=useState(1),[total,setTotal]=useState(0),[edit,setEdit]=useState<any>(null),[replyEdit,setReplyEdit]=useState<any>(null),[confirm,setConfirm]=useState<any>(null);
 const requestId=useRef(''),nameEdited=useRef(false),requests=useRef(createRequestGate()),activePage=useRef({id,active:false});
 const [receipt,setReceipt]=useState('');
 async function load(p=page){
  if(!activePage.current.active||activePage.current.id!==id)return;
  const request=requests.current.begin();setLoading(true);setLoadError('');
  try{const d=await api('topics/'+id+'?page='+p,{signal:request.signal});if(request.isCurrent()){setTopic(d.item);setReplies(d.replies);setTotal(d.total);setPage(p);}}
  catch(e){if(request.isCurrent())setLoadError((e as Error).message);}
  finally{if(request.isCurrent())setLoading(false);}
 }
 useEffect(()=>{activePage.current={id,active:true};setTopic(null);setEdit(null);setReplyEdit(null);setConfirm(null);setBody('');setReceipt('');setError('');requestId.current='';void load(1);return()=>{activePage.current.active=false;requests.current.cancel();};},[id]);
 useEffect(()=>{if(accountReady&&!nameEdited.current)setName(user?.name||'');},[accountReady,user?.id,user?.name]);
 async function work(fn:()=>Promise<void>){if(busy||!accountReady)return;setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function reply(e:React.FormEvent){e.preventDefault();if(busy||!accountReady)return;requestId.current ||= crypto.randomUUID();work(async()=>{setReceipt('');const result=await api('replies',{method:'POST',body:JSON.stringify({id:requestId.current,topicId:id,body,authorName:name})});setBody('');requestId.current='';if(result.pending)setReceipt('回复已提交，审核通过后公开。');else await load(Math.ceil((total+1)/30));});}
 function deleteTopic(){setConfirm({title:'删除此讨论？',message:'该讨论和全部回复会被永久删除。',action:()=>work(async()=>{await api('topics/'+id,{method:'DELETE'});location.href='/community';})});}
 return <main id="main" className="workspace mm-topic"><a href="/community" className="button">返回论坛广场</a><SessionNotice/>{error&&<div className="error-message" role="alert">{error}</div>}{loading&&<p className="empty" role="status">正在读取讨论…</p>}{!loading&&loadError&&<div className="empty" role="alert"><h1>讨论暂时未能加载</h1><p>{loadError}</p><Button variant="outline" onClick={()=>void load(page)}>重新读取讨论</Button></div>}{topic&&!loading&&!loadError&&<>
 <header className="topic-header"><p className="topic-meta"><span className="badge">{topic.category}</span>{!!topic.pinned&&<span>置顶</span>}{!!topic.locked&&<span>已锁定</span>}{!!topic.hidden&&<span>已隐藏</span>}{topic.moderation_status==='pending'&&<span>待审核 · 尚未公开</span>}</p><h1>{topic.title}</h1><p className="topic-meta">{topic.author_name}{topic.author_kind==='guest'&&<span className="badge">游客</span>} · {new Date(topic.created_at).toLocaleString('zh-CN')}</p>{topic.chapter_id&&<a className="muted" href={'/chapters/'+topic.chapter_id+'.html'}>阅读关联章节</a>}</header>
 {edit?<form onSubmit={e=>{e.preventDefault();work(async()=>{await api('topics/'+id,{method:'PUT',body:JSON.stringify(edit)});setEdit(null);await load();});}}><label className="field"><span>标题</span><input required maxLength={160} value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/></label><label className="field"><span>分类</span><select value={edit.category} onChange={e=>setEdit({...edit,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="field"><span>正文</span><textarea required rows={8} maxLength={20000} value={edit.body} onChange={e=>setEdit({...edit,body:e.target.value})}/></label><div className="controls"><Button disabled={busy||!accountReady}>保存修改</Button><Button type="button" variant="ghost" onClick={()=>setEdit(null)}>取消</Button></div></form>:<div className="post-body">{topic.body}</div>}
 {accountReady&&topic.can_edit&&!edit&&<div className="controls"><Button variant="outline" disabled={busy||!accountReady||!!topic.locked&&!user?.admin} onClick={()=>setEdit({...topic})}>编辑帖子</Button><Button variant="ghost" disabled={busy||!accountReady} onClick={deleteTopic}>删除</Button>{user?.admin&&<a className="muted" href="/admin">进入讨论管理</a>}</div>}
 <div className="section-heading"><h2>{total} 条回复</h2></div>{replies.map(r=><article className="reply" key={r.id}><div className="reply-head"><strong>{r.author_name}</strong>{r.author_kind==='guest'&&<span className="badge">游客</span>}<span className="muted">{new Date(r.created_at).toLocaleString('zh-CN')}</span></div>{replyEdit?.id===r.id?<form onSubmit={e=>{e.preventDefault();work(async()=>{await api('replies/'+r.id,{method:'PUT',body:JSON.stringify(replyEdit)});setReplyEdit(null);await load();});}}><label className="field"><span>修改回复</span><textarea required maxLength={10000} value={replyEdit.body} onChange={e=>setReplyEdit({...replyEdit,body:e.target.value})}/></label><div className="controls"><Button disabled={busy||!accountReady}>保存</Button><Button type="button" variant="ghost" onClick={()=>setReplyEdit(null)}>取消</Button></div></form>:<p className="post-body">{r.body}</p>}{accountReady&&r.can_edit&&replyEdit?.id!==r.id&&<div className="row-actions"><Button variant="ghost" disabled={busy||!accountReady||!!topic.locked&&!user?.admin} onClick={()=>setReplyEdit({...r})}>编辑</Button><Button variant="ghost" disabled={busy||!accountReady} onClick={()=>setConfirm({title:'删除回复？',message:'此操作无法恢复。',action:()=>work(async()=>{await api('replies/'+r.id,{method:'DELETE'});await load();})})}>删除</Button></div>}</article>)}
 {total>30&&<div className="pagination"><Button variant="outline" disabled={busy||loading||page<=1} onClick={()=>void load(page-1)}>上一页</Button><span>{page}</span><Button variant="outline" disabled={busy||loading||page*30>=total} onClick={()=>void load(page+1)}>下一页</Button></div>}
 {receipt&&<div className="submission-receipt" role="status">{receipt}</div>}
 {topic.locked||topic.hidden||topic.moderation_status!=='approved'?<p className="empty">此讨论暂不接受新回复。</p>:<form className="box forum-form" onSubmit={reply}><h2>参与讨论</h2>{accountReady&&!user&&<p className="participation-note">游客回复审核通过后公开，由管理员维护。希望自己编辑或删除发言，可以先 <a href={'/signin-with-chatgpt?return_to='+encodeURIComponent('/topics/'+id)} target="_top">使用 ChatGPT 登录</a>。</p>}<label className="field"><span>公开昵称</span><input required maxLength={40} value={name} onChange={e=>{nameEdited.current=true;setName(e.target.value);}}/></label><label className="field"><span>你的回复</span><textarea required maxLength={10000} rows={5} value={body} onChange={e=>setBody(e.target.value)} placeholder="分享你的思路或实践结果…"/></label><Button disabled={busy||!accountReady}>{busy?'正在提交…':!accountReady?'等待确认登录状态':user?'发布回复':'提交审核'}</Button></form>}</>}<Confirm value={confirm} onClose={()=>setConfirm(null)}/></main>;
}
