'use client';
import {createContext,useContext,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import {createSessionStore,type SessionUser} from './session-store';

type SessionStore=ReturnType<typeof createSessionStore>;
const SessionContext=createContext<SessionStore|null>(null);
async function readUser(signal:AbortSignal):Promise<SessionUser|null> {
  const response=await fetch('/api/me',{cache:'no-store',credentials:'same-origin',signal});
  if(!response.ok) throw new Error('暂时无法确认登录状态，请重试。');
  const data:unknown=await response.json();
  if(!data||typeof data!=='object'||!('user' in data)) throw new Error('登录状态响应无效，请重试。');
  const user=data.user;
  if(user===null) return null;
  if(typeof user!=='object'||!('id' in user)||typeof user.id!=='string'||!('name' in user)||typeof user.name!=='string'||!('admin' in user)||typeof user.admin!=='boolean')
    throw new Error('登录状态响应无效，请重试。');
  return {id:user.id,name:user.name,admin:user.admin};
}

export function SessionProvider({children}:{children:React.ReactNode}) {
  // A fresh store for each provider, including each server render. No shared identity cache.
  const [store]=useState(()=>createSessionStore(readUser));
  const pathname=usePathname();
  const lifetime=useRef(0);
  useEffect(()=>{void store.visit(pathname??window.location.pathname);},[store,pathname]);
  useEffect(()=>{
    const mounted=++lifetime.current;
    const restored=(event:PageTransitionEvent)=>{if(event.persisted) void store.refresh(true);};
    window.addEventListener('pageshow',restored);
    return ()=>{
      window.removeEventListener('pageshow',restored);
      // React's development effect replay reuses this provider. Keep its one in-flight read.
      queueMicrotask(()=>{if(lifetime.current===mounted)store.stop();});
    };
  },[store]);
  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>;
}

export function useSessionUser() {
  const store=useContext(SessionContext);
  if(!store) throw new Error('SessionProvider is required for account presentation.');
  const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
  return {...snapshot,refresh:()=>store.refresh()};
}

export function SessionNotice() {
  const session=useSessionUser();
  if(session.status==='ready') return null;
  return session.status==='error'
    ? <div className="session-status" role="status"><span>{session.error} 阅读不受影响。</span><button className="button" type="button" onClick={()=>void session.refresh()}>重试登录状态</button></div>
    : <p className="session-status" role="status">正在确认登录状态，确认后即可发言。</p>;
}
