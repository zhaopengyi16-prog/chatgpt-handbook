'use client';
import {useEffect,useState} from 'react';
export async function api(path:string,options:RequestInit={}) {
 const response=await fetch('/api/'+path,{...options,headers:{...(!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers},cache:'no-store'});
 const data:any=await response.json();if(!response.ok)throw new Error(data.error||'操作失败，请重试。');return data;
}
export function Account(){
 const [user,setUser]=useState<any>(null);
 useEffect(()=>{api('me').then(d=>setUser(d.user)).catch(()=>{});},[]);
 return user?<><a href={user.admin?'/admin':'/community'}>{user.admin?'管理后台':'我的社区'}</a><a className="account-link" href="/signout-with-chatgpt?return_to=/" target="_top">退出</a></>:<a href="/signin-with-chatgpt?return_to=%2Fcommunity" target="_top">登录</a>;
}
export function ReadingTools(){
 useEffect(()=>{
  const click=async(e:MouseEvent)=>{
   const t=e.target as HTMLElement;
   const b=t.closest('.copy');if(!b)return;
   const value=b.closest('.codebox')?.querySelector('code')?.textContent;
   if(!value)return;
   try{await navigator.clipboard.writeText(value);b.textContent='已复制';setTimeout(()=>{b.textContent='复制';},1600);}catch{b.textContent='请选中文字复制';}
  };
  let closed:HTMLDetailsElement[]=[];
  const before=()=>{closed=Array.from(document.querySelectorAll<HTMLDetailsElement>('details:not([open])'));closed.forEach(d=>d.open=true);};
  const after=()=>closed.forEach(d=>d.open=false);
  document.addEventListener('click',click);window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after);
  return()=>{document.removeEventListener('click',click);window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after);};
 },[]);return null;
}
export function Unavailable(){return <main id="main" className="wide"><h1>暂时无法读取内容</h1><p>你的内容不会因此丢失，请稍后刷新重试。</p><a className="button" href="/">重新加载</a></main>;}
