// These isolated adapters verify application behavior, not Sites' ingress trust boundary.
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {GET} from '../app/api/[...path]/route';
import {PROBE_ACTIONS, PROBE_SENTINELS, probeD1Export, probePbkdf2, runPlatformProbe} from '../lib/platform-probe';
import {env, setHeaders, sqlite} from './runtime-mock';

const origin='https://handbook.test';
const owner={'oai-authenticated-user-id':'private-owner-id', 'oai-authenticated-user-email':'owner@handbook.test'};
const member={'oai-authenticated-user-id':'private-member-id', 'oai-authenticated-user-email':'member-private@example.test'};
const privateValues=['private-owner-id','private-member-id','owner@handbook.test','member-private@example.test','198.51.100.42','PRIVATE_COOKIE_SENTINEL','PRIVATE_DRAFT_SENTINEL','PRIVATE_DATABASE_SENTINEL'];
const stamp='2026-11-09T00:00:00.000Z';
sqlite.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('owner_user_id',owner['oai-authenticated-user-id']);
sqlite.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('keep_private','PRIVATE_DATABASE_SENTINEL');
sqlite.prepare(`INSERT INTO chapters(id,title,description,body,position,version,updated_at)
 VALUES (?,?,?,?,?,?,?)`).run('practice','历史第五章','保留作者稿','PRIVATE_DRAFT_SENTINEL',5,23,stamp);
sqlite.prepare(`INSERT INTO media(id,name,url,caption,object_key,mime,created_at)
 VALUES (?,?,?,?,?,?,?)`).run('kept-image','旧截图','/assets/screenshots/old.png','保留','private-object','image/png',stamp);
// No seed or release marker: accidental ensureSeed()/identity bootstrap must be caught.
const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>String(row.name));
const snapshot=()=>Object.fromEntries(tables.map(name=>[name,sqlite.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()]));

const db:any=env.DB;
const originalPrepare=db.prepare;
const originalBatch=db.batch;
const originalPut=env.BUCKET.put;
const originalDelete=env.BUCKET.delete;
let forbiddenWrites=0;
function rejectWrite():never {forbiddenWrites++;throw new Error('Probe attempted a forbidden write');}
function readonlyStatement(statement:any):any {
 return {...statement,bind:(...args:any[])=>readonlyStatement(statement.bind(...args)),run:rejectWrite,runSync:rejectWrite};
}
db.prepare=(sql:string)=>{
 assert(/^(?:\s*SELECT\b|\s*PRAGMA\s+(?:page_count|page_size)\s*;?\s*$)/i.test(sql),'only SELECT and the two read-only PRAGMAs are allowed');
 return readonlyStatement(originalPrepare(sql));
};
db.batch=rejectWrite;
env.BUCKET.put=rejectWrite;
env.BUCKET.delete=rejectWrite;
let requests=0;

type CallOptions={method?:string;path?:string;who?:HeadersInit;origin?:string|null;raw?:string;contentType?:string|null;action?:string;expected?:number};
async function call(options:CallOptions={}) {
 const {method='GET',path='admin/platform-probe',who=owner,origin:requestOrigin=origin,expected=200}=options;
 const headers=new Headers(who);
 if(!['GET','HEAD'].includes(method)&&requestOrigin!==null)headers.set('origin',requestOrigin);
 let body:string|undefined;
 if(options.raw!==undefined||options.action!==undefined) {
  body=options.raw??JSON.stringify({action:options.action});
  if(options.contentType!==null) headers.set('content-type',options.contentType??'application/json');
 }
 const request=new Request(origin+'/api/'+path,{method,headers,...(body===undefined?{}:{body})});
 setHeaders(headers);
 const before=snapshot();
 // vinext decodes each captured segment before passing catch-all route params.
 const decodedParts=new URL(request.url).pathname.slice('/api/'.length).split('/').map(part=>decodeURIComponent(part));
 const response=await GET(request,{params:Promise.resolve({path:decodedParts})});
 const content=await response.text();
 requests++;
 assert.equal(response.status,expected,method+' '+path+': '+content);
 assert.deepEqual(snapshot(),before,'all database fields must be unchanged');
 assert.equal(forbiddenWrites,0,'no DB batch/run or R2 write may be attempted');
 assert.equal(response.headers.get('set-cookie'),null,'probe never establishes/touches a session or guest cookie');
 assert.match(response.headers.get('cache-control')??'',/no-store/);
 for(const value of privateValues)assert(!content.includes(value),'response must not contain private input: '+value);
 const parsed=response.headers.get('content-type')?.includes('application/json')?JSON.parse(content):null;
 if(expected===200&&method==='POST')assert.equal(parsed?.probe,'platform-probe-v1');
 return {response,content,data:parsed?.probe==='platform-probe-v1'?parsed.result:parsed};
}

async function checkPanelRequests(html:string) {
 const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1];
 assert(script,'inline script is available for a browser-free transport check');
 for(const scenario of ['stripped','rejected','login-page','network-error'] as const) {
  const handlers=new Map<string,()=>Promise<void>>();
  const nodes=new Map<string,any>();
  for(const id of ['output','status','boundary',...PROBE_ACTIONS])nodes.set(id,{textContent:'',disabled:false,dataset:{action:id},addEventListener(_event:string,handler:()=>Promise<void>){handlers.set(id,handler);}});
  const requests:{url:string;options:any}[]=[];
  runInNewContext(script,{
   document:{getElementById:(id:string)=>nodes.get(id),querySelectorAll:(selector:string)=>selector==='[data-action]'?PROBE_ACTIONS.map(id=>nodes.get(id)):[nodes.get('boundary'),...PROBE_ACTIONS.map(id=>nodes.get(id))]},
   performance:{now:()=>10},
   fetch:async(url:string,options:any)=>{
    requests.push({url,options});
    assert.equal(url,'/api/admin/platform-probe');assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    assert.equal(nodes.get('boundary').disabled,true,'all controls are disabled during requests');
    assert.deepEqual(JSON.parse(options.body),{action:'headers'});
    if(scenario==='network-error')throw new Error('PRIVATE_DATABASE_SENTINEL');
    if(scenario==='login-page')return new Response('<html>login</html>',{headers:{'content-type':'text/html'}});
    if(requests.length>2||(scenario==='rejected'&&requests.length===2))return Response.json({error:'not owner'},{status:requests.length>2?401:403});
    return Response.json({probe:'platform-probe-v1',result:{kind:'headers',identityHeaders:{observations:Object.keys(PROBE_SENTINELS).map(header=>({header,present:true,sentinelPresent:false}))}}});
   },
  });
  await handlers.get('boundary')!();
  const output=JSON.parse(nodes.get('output').textContent)[0];
  assert(!nodes.get('output').textContent.includes('PRIVATE_DATABASE_SENTINEL'));
  assert.equal(nodes.get('boundary').disabled,false);
  if(scenario==='login-page'||scenario==='network-error') {
   assert.equal(requests.length,1);assert.equal(output.verdict,'unverified');assert.equal(output.baseline.recognized,false);
  } else {
   assert.equal(requests.length,4);
   assert.deepEqual(requests.map(row=>row.options.credentials),['same-origin','same-origin','omit','omit']);
   assert.deepEqual(Object.keys(requests[0].options.headers),['Content-Type']);
   assert.deepEqual({...requests[1].options.headers},{'Content-Type':'application/json',...PROBE_SENTINELS});
   assert.deepEqual({...requests[3].options.headers},{'Content-Type':'application/json',...PROBE_SENTINELS});
   assert.equal(output.testedHeadersNotForwarded,scenario==='stripped');
   assert.equal(output.verdict,'requires-review','even passing sentinel observations require platform review');
   assert.equal(output.anonymousBaseline.recognized,false);
   assert.equal(output.anonymousSentinel.recognized,false);
  }
 }
}

try {
 // No cryptography/export work may run until the existing Origin and owner gates pass.
 const gateSubtle=crypto.subtle;
 const gateSavedDerive=Object.getOwnPropertyDescriptor(gateSubtle,'deriveBits');
 let expensiveCalls=0;
 Object.defineProperty(gateSubtle,'deriveBits',{configurable:true,value:async()=>{expensiveCalls++;return new ArrayBuffer(32);}});
 db.dump=async()=>{expensiveCalls++;throw new Error('unexpected dump');};
 try {
  for(const who of [{},member]) {
   const expected=Object.keys(who).length?403:401;
   await call({who,expected});
   for(const action of PROBE_ACTIONS) await call({method:'POST',action,who,expected});
  }
  await call({who:{...member,'oai-authenticated-user-email':owner['oai-authenticated-user-email']},expected:403});
  await call({who:PROBE_SENTINELS,expected:403});
  await call({method:'POST',action:'pbkdf2-600000',origin:'https://evil.test',expected:403});
  await call({method:'POST',action:'pbkdf2-600000',origin:null,expected:403});
  const page=await call();
  assert.match(page.response.headers.get('content-type')??'',/text\/html/);
  assert.match(page.response.headers.get('content-security-policy')??'',/default-src 'none'/);
  assert.match(page.response.headers.get('content-security-policy')??'',/frame-ancestors 'none'/);
  assert(!/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i.test(page.content),'panel is self-contained');
  assert(!/\beval\s*\(/.test(page.content));
  assert(page.content.includes('textContent'),'results are inserted as text');
  await checkPanelRequests(page.content);
  for(const method of ['PUT','DELETE','PATCH','HEAD','OPTIONS'])await call({method,expected:405});
  for(const method of ['GET','POST','PUT','DELETE','HEAD','OPTIONS'])await call({method,path:'admin/platform-probe/extra',expected:404});
  // A decoded separator inside a segment must not miss the namespace guard and
  // fall through to ensureSeed(). Rejections are intentionally before identity.
  const malformedProbePaths=[
   'admin/platform-probe%2Fextra', 'admin/platform-probe%3Fdebug',
   'admin/platform-probe%23debug', 'admin/platform-probe%5Cextra',
   'admin/platform-probe%252Fextra', 'admin%2Fplatform-probe',
   'admin%5Cplatform-probe', 'admin/platform-probe-extra',
  ];
  for(const path of malformedProbePaths)for(const who of [owner,{}])for(const method of ['GET','POST']) {
   await call({path,who,method,...(method==='POST'?{action:'pbkdf2-600000'}:{}),expected:404});
  }
  await call({path:'admin/platform-probe?debug=1',expected:400});
  for(const raw of ['{}','[]','null','{','{"action":"unknown"}','{"action":"headers","iterations":600000}','{"action":"headers","sql":"DROP TABLE settings"}','{"action":"headers","headers":{}}'])await call({method:'POST',raw,expected:400});
  await call({method:'POST',raw:'x'.repeat(1025),expected:413});
  await call({method:'POST',action:'headers',contentType:'text/plain',expected:415});
  await call({method:'POST',action:'headers',contentType:null,expected:415});
  sqlite.prepare("DELETE FROM settings WHERE key='owner_user_id'").run();
  for(const method of ['GET','POST','DELETE'])await call({method,expected:403});
  assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='owner_user_id'").get(),undefined,'matching owner email must not bootstrap owner');
  sqlite.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('owner_user_id','');
  await call({expected:403});
  sqlite.prepare("UPDATE settings SET value=? WHERE key='owner_user_id'").run(owner['oai-authenticated-user-id']);
  assert.equal(expensiveCalls,0,'rejects and GET never perform KDF/export');
 } finally {
  if(gateSavedDerive)Object.defineProperty(gateSubtle,'deriveBits',gateSavedDerive);else delete (gateSubtle as any).deriveBits;
  delete db.dump;
 }

 const observed=await call({method:'POST',action:'headers',who:{...owner,'cf-connecting-ip':'198.51.100.42',cookie:'PRIVATE_COOKIE_SENTINEL'}});
 assert.equal(observed.data.kind,'headers');
 assert.deepEqual(observed.data.ip,{candidatePresent:true,sourceHeader:'cf-connecting-ip',trust:'unverified',trustedAvailable:null});
 assert.equal(observed.data.identityHeaders.verdict,'unverified');
 assert(observed.data.identityHeaders.observations.every((row:any)=>typeof row.present==='boolean'&&row.sentinelPresent===false));
 const missingIp=await call({method:'POST',action:'headers'});
 assert.deepEqual(missingIp.data.ip,{candidatePresent:false,sourceHeader:null,trust:'unavailable',trustedAvailable:false});
 const allSentinels=await runPlatformProbe(db,new Request(origin,{headers:PROBE_SENTINELS}),'headers');
 assert((allSentinels as any).identityHeaders.observations.every((row:any)=>row.sentinelPresent===true));
 assert.equal((allSentinels as any).identityHeaders.verdict,'unverified','client-controlled sentinels cannot attest to platform behavior');

 // Exercise real Node WebCrypto only as a local behavior check; it is NOT Sites evidence.
 for(const iterations of [600000,100000] as const) {
  const result=await call({method:'POST',action:'pbkdf2-'+iterations});
  assert.equal(result.data.status,'supported');
  assert.equal(result.data.iterations,iterations);
  assert.equal(result.data.timingReliable,false);
  assert.equal(result.data.durationMs,null);
  assert.equal(result.data.errorCode,null);
 }
 const subtle=crypto.subtle;
 const savedDerive=Object.getOwnPropertyDescriptor(subtle,'deriveBits');
 const savedClock=Object.getOwnPropertyDescriptor(performance,'now');
 try {
  Object.defineProperty(performance,'now',{configurable:true,value:()=>42});
  Object.defineProperty(subtle,'deriveBits',{configurable:true,value:async(algorithm:any,_key:unknown,length:number)=>{
   assert.equal(algorithm.name,'PBKDF2');assert.equal(algorithm.hash,'SHA-256');assert.equal(algorithm.salt.byteLength,32);assert.equal(length,256);
   if(algorithm.iterations===600000)throw new DOMException('PRIVATE_DATABASE_SENTINEL 198.51.100.42','NotSupportedError');
   return new Uint8Array(32).fill(99).buffer;
  }});
  const unsupported=await call({method:'POST',action:'pbkdf2-600000'});
  assert.equal(unsupported.data.status,'error');assert.equal(unsupported.data.errorCode,'NotSupportedError');
  const fallback=await call({method:'POST',action:'pbkdf2-100000'});
  assert.equal(fallback.data.status,'supported');assert.equal(fallback.data.rawTimerDeltaMs,0);assert.equal(fallback.data.timingReliable,false);assert.equal(fallback.data.durationMs,null);
  Object.defineProperty(subtle,'deriveBits',{configurable:true,value:async()=>{throw new Error('PRIVATE_DATABASE_SENTINEL');}});
  for(const iterations of [600000,100000] as const) {
   const result=await probePbkdf2(iterations);
   assert.equal(result.status,'error');assert.equal(result.errorCode,'CryptoError');
   assert(!JSON.stringify(result).includes('PRIVATE_DATABASE_SENTINEL'));
  }
 } finally {
  if(savedDerive)Object.defineProperty(subtle,'deriveBits',savedDerive);else delete (subtle as any).deriveBits;
  if(savedClock)Object.defineProperty(performance,'now',savedClock);else delete (performance as any).now;
 }

 const unavailable=await call({method:'POST',action:'d1-export'});
 assert.equal(unavailable.data.status,'unavailable');assert.equal(unavailable.data.backupPathReady,false);
 function exportFixture(options:{pageCount?:unknown;pageSize?:unknown;prepareError?:boolean;dump?:()=>Promise<unknown>}={}) {
  let dumps=0;
  return {binding:{prepare(sql:string){
   assert(/^PRAGMA (?:page_count|page_size)\s*;?$/i.test(sql));
   if(options.prepareError)throw new Error('PRIVATE_DATABASE_SENTINEL');
   return {async first(){return sql.includes('page_count')?{page_count:options.pageCount??1}:{page_size:options.pageSize??4096};}};
  },async dump(){dumps++;return options.dump?options.dump():sqliteBuffer();}} as unknown as D1Database,dumpCount:()=>dumps};
 }
 function sqliteBuffer(size=4096) {
  const buffer=new Uint8Array(size);buffer.set(new TextEncoder().encode('SQLite format 3\0'));
  buffer.set(new TextEncoder().encode('PRIVATE_DATABASE_SENTINEL'),64);return buffer.buffer;
 }
 const beforeExports=snapshot();
 for(const options of [{pageCount:0},{pageCount:-1},{pageCount:1.5},{pageCount:'1'},{pageCount:Number.MAX_SAFE_INTEGER},{pageSize:0},{pageSize:NaN},{pageCount:2049},{prepareError:true}]) {
  const fixture=exportFixture(options);
  const result=await probeD1Export(fixture.binding);
  assert(['unverified','skipped','error'].includes(result.status));assert.equal(fixture.dumpCount(),0);
  assert.equal(result.backupPathReady,false);
 }
 for(const dump of [async()=>{throw new Error('PRIVATE_DATABASE_SENTINEL');},async()=>new Uint8Array(4096),async()=>new ArrayBuffer(8),async()=>new ArrayBuffer(4096),async()=>sqliteBuffer(8*1024*1024+1)]) {
  const fixture=exportFixture({dump});const result=await probeD1Export(fixture.binding);
  assert.notEqual(result.status,'native-dump-succeeded');assert.equal(fixture.dumpCount(),1);
  assert.equal(result.backupPathReady,false);assert(!JSON.stringify(result).includes('PRIVATE_DATABASE_SENTINEL'));
 }
 const successFixture=exportFixture();
 const succeeded=await probeD1Export(successFixture.binding);
 assert.equal(succeeded.status,'native-dump-succeeded');assert.equal(succeeded.exportedBytes,4096);assert.equal(successFixture.dumpCount(),1);
 assert.equal(succeeded.backupPathReady,false);assert.equal(succeeded.integrityVerified,false);assert.equal(succeeded.restoreVerified,false);
 assert(!JSON.stringify(succeeded).includes('PRIVATE_DATABASE_SENTINEL'));
 db.dump=async()=>sqliteBuffer();
 const routedDump=await call({method:'POST',action:'d1-export'});
 assert.equal(routedDump.data.status,'native-dump-succeeded');delete db.dump;
 assert.deepEqual(snapshot(),beforeExports);
 assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='seed_v1'").get(),undefined);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM chapters').get()!.n,1,'probe never seeds chapters or revision updates');
 assert.equal(forbiddenWrites,0);
 console.log(`PASS: platform probe (${requests} HTTP responses); owner-only gates, zero writes, redaction, fixed KDF tests, frozen timers and bounded D1 diagnostics. Sites ingress/KDF/export remain unverified.`);
} finally {
 db.prepare=originalPrepare;db.batch=originalBatch;delete db.dump;
 env.BUCKET.put=originalPut;env.BUCKET.delete=originalDelete;
}
