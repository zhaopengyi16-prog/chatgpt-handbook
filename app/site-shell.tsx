'use client';

import {useEffect,useRef,useState} from 'react';
import {Account} from './shared';
import {PixelIcon} from '@/components/miaomiao/icon';

const links=[
 {id:'home',name:'首页',href:'/',icon:'home'},
 {id:'learn',name:'教程',href:'/#all-chapters',icon:'rooms'},
 {id:'tools',name:'工具',href:'/#tools',icon:'tools'},
 {id:'forum',name:'论坛',href:'/community',icon:'forum'},
 {id:'updates',name:'更新',href:'/updates',icon:'updates'},
];
function locationTab() {
 const {pathname,hash}=window.location;
 if(pathname==='/community'||pathname.startsWith('/topics/'))return 'forum';
 if(pathname==='/updates')return 'updates';
 if(pathname.startsWith('/tools/')||(pathname==='/'&&hash==='#tools'))return 'tools';
 if(pathname.startsWith('/chapters/')||pathname.startsWith('/learn/')||(pathname==='/'&&hash&&hash!=='#main'))return 'learn';
 if(pathname.startsWith('/admin'))return 'account';
 return pathname==='/'?'home':'';
}
export function SiteHeader() {
 const [active,setActive]=useState('');
 const menu=useRef<HTMLDetailsElement>(null);
 const account=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const update=()=>setActive(locationTab());update();
  const escape=(e:KeyboardEvent)=>{if(e.key!=='Escape')return;for(const ref of [menu,account])if(ref.current?.open){ref.current.open=false;ref.current.querySelector('summary')?.focus();}};
  const outside=(e:PointerEvent)=>{for(const ref of [menu,account])if(ref.current?.open&&!ref.current.contains(e.target as Node))ref.current.open=false;};
  window.addEventListener('hashchange',update);window.addEventListener('popstate',update);window.addEventListener('pageshow',update);
  document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);
  return()=>{window.removeEventListener('hashchange',update);window.removeEventListener('popstate',update);window.removeEventListener('pageshow',update);document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};
 },[]);
 const navLink=(item:typeof links[number])=><a href={item.href} key={item.id} aria-current={active===item.id?'location':undefined}><PixelIcon name={item.icon}/><span>{item.name}</span></a>;
 const closeMenu=(e:React.MouseEvent)=>{if((e.target as HTMLElement).closest('a')&&menu.current)menu.current.open=false;};
 return <>
  <header className="mm-site-header">
   <a className="mm-site-brand" href="/" aria-label="AI 妙妙屋首页"><span className="mm-site-logo mm-material" data-material="grass" aria-hidden="true"><PixelIcon name="home"/></span><span><strong>AI 妙妙屋</strong><small>MIAOMIAO HOUSE</small></span></a>
   <nav className="mm-site-inventory" aria-label="主导航">{links.map(navLink)}</nav>
   <div className="mm-site-account"><Account/></div>
   <details className="mm-mobile-menu" ref={menu}><summary>菜单<span aria-hidden="true">＋</span></summary><nav aria-label="更多导航" onClick={closeMenu}>{links.map(navLink)}<a href="/contribute">共建与许可</a><div className="mm-menu-account"><Account/></div></nav></details>
  </header>
  <nav className="mm-site-bottom-nav" aria-label="手机主导航">
   {[links[0],links[1],links[3],links[2]].map(navLink)}
   <details className="mm-mobile-account" ref={account}><summary aria-current={active==='account'?'location':undefined}><PixelIcon name="person"/><span>我的</span></summary><div className="mm-account-menu"><p>账号与社区</p><Account/></div></details>
  </nav>
 </>;
}
