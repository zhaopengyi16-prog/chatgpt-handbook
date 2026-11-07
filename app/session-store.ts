/** A presentation-only store, instantiated per mounted browser provider, never at module scope. */
export type SessionUser = {id:string; name:string; admin:boolean};
export type SessionSnapshot = {
  status:'loading'|'ready'|'error'; user:SessionUser|null; error:string; generation:number;
};
export const initialSessionSnapshot:SessionSnapshot = {status:'loading',user:null,error:'',generation:0};

/** Key identity-dependent UI by the verified page session, not just by its resource ID. */
export function sessionScopeKey(session:SessionSnapshot,scope:string):string|null {
  return session.status==='ready'?`${session.generation}:${scope}`:null;
}

/** Reads use the current generation even if /me fails; the resource API remains authoritative. */
export function sessionReadScopeKey(session:SessionSnapshot,scope:string):string|null {
  // Generation zero is the server/initial render, before the provider starts its first read.
  return session.generation>0?`${session.generation}:${scope}`:null;
}

export function createSessionStore(readUser:(signal:AbortSignal)=>Promise<SessionUser|null>) {
  let snapshot = initialSessionSnapshot;
  let page:string|null = null;
  let generation = 0;
  let controller:AbortController|null = null;
  let pending:Promise<void>|null = null;
  const listeners = new Set<()=>void>();
  function publish(value:SessionSnapshot) {snapshot=value;listeners.forEach(listener=>listener());}
  function refresh(force=false):Promise<void> {
    if(pending&&!force) return pending;
    controller?.abort();
    const current=++generation;
    const request=new AbortController();controller=request;
    publish({status:'loading',user:null,error:'',generation:current});
    const operation=Promise.resolve().then(()=>readUser(request.signal)).then(user=>{
      if(current===generation) publish({status:'ready',user,error:'',generation:current});
    }).catch(error=>{
      if(current===generation) publish({status:'error',user:null,error:error instanceof Error?error.message:'暂时无法确认登录状态。',generation:current});
    }).finally(()=>{if(current===generation){pending=null;controller=null;}});
    pending=operation;return operation;
  }
  return {
    getSnapshot:()=>snapshot,
    getServerSnapshot:()=>initialSessionSnapshot,
    subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
    visit(pathname:string){
      if(page===pathname) return pending??Promise.resolve();
      page=pathname;return refresh(true);
    },
    refresh,
    stop(){controller?.abort();controller=null;pending=null;page=null;generation++;publish({...initialSessionSnapshot,generation});},
  };
}

/** Ignore late list/detail responses after another filter request or unmount. */
export function createRequestGate() {
  let generation=0;
  let active:AbortController|null=null;
  return {
    begin(){
      active?.abort();const controller=new AbortController();active=controller;
      const current=++generation;
      return {signal:controller.signal,isCurrent:()=>current===generation&&!controller.signal.aborted};
    },
    cancel(){generation++;active?.abort();active=null;},
  };
}
