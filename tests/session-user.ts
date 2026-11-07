import assert from 'node:assert/strict';
import {createSessionStore,createRequestGate,sessionScopeKey,sessionReadScopeKey,type SessionUser,type SessionSnapshot} from '../app/session-store';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {SessionProvider} from '../app/session-user';
import {Account} from '../app/shared';
import Forum from '../app/community/forum';
import Topic,{TopicSessionBoundary} from '../app/community/topic';

function deferred<T>() {let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((ok,no)=>{resolve=ok;reject=no;});return {promise,resolve,reject};}
const tick=()=>Promise.resolve();
const owner={id:'owner',name:'作者',admin:true};
const reader={id:'reader',name:'读者',admin:false};
const pending:Array<ReturnType<typeof deferred<SessionUser|null>>> = [];
const signals:AbortSignal[]=[];
const store=createSessionStore(signal=>{signals.push(signal);const request=deferred<SessionUser|null>();pending.push(request);return request.promise;});
let changes=0;const unsubscribe=store.subscribe(()=>changes++);
assert.equal(pending.length,0,'subscription/SSR must not read browser identity');
assert.equal(store.getSnapshot().status,'loading');
assert.equal(store.getSnapshot().user,null);

// Account, forum and navigation all receive one page request/result.
const a=store.visit('/community'),b=store.visit('/community'),c=store.visit('/community');
assert.strictEqual(a,b);assert.strictEqual(b,c);await tick();assert.equal(pending.length,1);
pending[0].resolve(null);await a;
assert.equal(store.getSnapshot().status,'ready');assert.equal(store.getSnapshot().user,null);
await store.visit('/community');assert.equal(pending.length,1,'query/hash changes use the same pathname');

// A new page invalidates the previous identity immediately, including when refresh fails.
const next=store.visit('/topics/one');await tick();assert.equal(store.getSnapshot().status,'loading');
pending[1].reject(new Error('offline'));await next;
assert.equal(store.getSnapshot().status,'error');assert.equal(store.getSnapshot().error,'offline');
assert.equal(store.getSnapshot().user,null);
await store.visit('/topics/one');assert.equal(pending.length,2,'failed identity is not repeatedly requested by sibling consumers');
const retry=store.refresh(),sameRetry=store.refresh();assert.strictEqual(retry,sameRetry);await tick();assert.equal(pending.length,3);
pending[2].resolve(owner);await retry;assert.deepEqual(store.getSnapshot().user,owner);

// BFCache refresh clears stale ownership, and a later page generation beats late responses.
const restored=store.refresh(true);await tick();
assert.equal(store.getSnapshot().status,'loading');assert.equal(store.getSnapshot().user,null);
const changedPage=store.visit('/community');await tick();assert(signals[3].aborted);
pending[4].resolve(reader);await changedPage;
pending[3].resolve(owner);await restored;
assert.deepEqual(store.getSnapshot().user,reader,'late previous-page owner must never overwrite the current reader');

const isolated=createSessionStore(async()=>null);await isolated.visit('/community');
assert.equal(isolated.getSnapshot().user,null);assert.deepEqual(store.getSnapshot().user,reader,'stores cannot share identities across providers');
const stopped=store.refresh(true);await tick();store.stop();assert(signals[5].aborted);
pending[5].resolve(owner);await stopped;assert.equal(store.getSnapshot().status,'loading');assert.equal(store.getSnapshot().user,null);
unsubscribe();const before=changes;isolated.stop();assert.equal(changes,before);

// The same gate used by forum/detail requests ignores out-of-order filters and unmounts.
const gate=createRequestGate(),first=deferred<string>(),second=deferred<string>();
const committed:string[]=[];let loading=true;
const one=gate.begin();const responseOne=first.promise.then(value=>{if(one.isCurrent())committed.push(value);}).finally(()=>{if(one.isCurrent())loading=false;});
const two=gate.begin();assert(one.signal.aborted);const responseTwo=second.promise.then(value=>{if(two.isCurrent())committed.push(value);}).finally(()=>{if(two.isCurrent())loading=false;});
first.resolve('stale result');await responseOne;assert.equal(loading,true);assert.deepEqual(committed,[]);
second.resolve('latest result');await responseTwo;assert.equal(loading,false);assert.deepEqual(committed,['latest result']);
const afterUnmount=gate.begin();gate.cancel();assert(afterUnmount.signal.aborted);assert(!afterUnmount.isCurrent());

// The actual topic boundary never reuses another generation's detail/editor subtree.
// React discards body/can_edit/confirm/edit/replyEdit on key change. /me failure cannot block reads.
const identities:SessionSnapshot[]=[
 {status:'ready',generation:10,user:owner,error:''},
 {status:'loading',generation:11,user:null,error:''},
 {status:'ready',generation:11,user:reader,error:''},
 {status:'error',generation:12,user:null,error:'offline'},
 {status:'ready',generation:13,user:null,error:''},
];
const views=identities.map(session=>TopicSessionBoundary({id:'restricted-topic',session}));
assert.equal(views[0].key,'10:restricted-topic');
assert.equal(views[1].key,'11:restricted-topic');
assert.equal(views[2].key,'11:restricted-topic');
assert.equal(views[1].type,views[2].type,'identity resolution must not issue a second detail read in the same generation');
assert.notEqual(views[2].key,views[0].key,'owner content and ownership controls must remount for a reader');
assert.equal(views[3].key,'12:restricted-topic');
assert.equal(views[3].type,views[0].type,'failed /me still mounts the actual detail reader');
assert.equal(views[4].key,'13:restricted-topic');
assert.notEqual(views[4].key,views[2].key,'member detail and editors cannot carry over to a guest');
assert.equal(sessionScopeKey(identities[1],'new-topic'),null,'posting form is hidden before a refreshed identity resolves');
assert.equal(sessionScopeKey(identities[3],'edit-topic'),null,'failed /me never enables writes');
assert.equal(sessionReadScopeKey(identities[3],'public-topic'),'12:public-topic','public reading survives identity endpoint failure');
assert.equal(sessionReadScopeKey({status:'loading',generation:0,user:null,error:''},'public-topic'),null,'wait for first provider generation to avoid an extra initial detail read');
assert.notEqual(sessionScopeKey(identities[0],'new-topic'),sessionScopeKey(identities[2],'new-topic'));

// An owner's delayed hidden/pending detail cannot commit after the old keyed view unmounts.
const oldDetail=deferred<{body:string;can_edit:boolean}>(),detailGate=createRequestGate();
const oldRequest=detailGate.begin();let displayed:{body:string;can_edit:boolean}|null=null;
const oldResult=oldDetail.promise.then(value=>{if(oldRequest.isCurrent())displayed=value;});
detailGate.cancel();oldDetail.resolve({body:'administrator-only pending content',can_edit:true});await oldResult;
assert.equal(displayed,null);assert(oldRequest.signal.aborted);
const freshRequest=detailGate.begin();const freshValue={body:'public content',can_edit:false};
if(freshRequest.isCurrent())displayed=freshValue;
assert.deepEqual(displayed,freshValue);

// The actual initial markup must not pretend loading/error identity is a guest or show fake counts.
function markup(child:React.ReactNode){return renderToStaticMarkup(createElement(SessionProvider,{children:child}));}
const forum=markup(createElement(Forum));
assert(forum.includes('正在读取讨论…'));
assert(forum.includes('正在确认登录状态'));
assert(!forum.includes('个话题'));
assert(!forum.includes('还没有讨论'));
assert(!forum.includes('当前以游客身份提交'));
assert.match(forum,/<button[^>]*disabled=""[^>]*[^]*?发起讨论/);
const account=markup(createElement(Account));assert(account.includes('正在确认账号'));assert(!account.includes('signout-with-chatgpt'));
const topic=markup(createElement(Topic,{id:'test-topic'}));assert(topic.includes('正在读取讨论…'));assert(!topic.includes('条回复'));assert(!topic.includes('游客回复审核'));
console.log('PASS: shared session and forum loading; single request, retry, page generations, BFCache invalidation, owner/member/guest detail isolation, stale filters, unmount and real initial markup.');
