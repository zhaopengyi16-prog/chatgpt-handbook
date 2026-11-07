// Separate in-memory database: the v14 / 2a regression suite remains an independent baseline.
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {GET,POST,PUT,DELETE} from '../app/api/[...path]/route';
import Home from '../app/page';
import TaskPage from '../app/learn/[task]/page';
import ToolPage from '../app/tools/[tool]/page';
import ChapterPage from '../app/chapters/[slug]/page';
import {database} from '../lib/data';
import {FIFTH_CHAPTER_REVISION} from '../lib/chapter-five-release';
import {decodeTaxonomy,initializeTaxonomy,serializeTaxonomy} from '../lib/taxonomy';
import {saveChapterWithTags} from '../lib/chapter-taxonomy-write';
import {readPublicCatalog,filterCatalog} from '../lib/public-taxonomy';
import {categoryMaterial} from '../lib/category-material';
import {setHeaders,sqlite} from './runtime-mock';

const root='https://handbook.test', admin='admin/taxonomy', key='taxonomy_v1';
const owner={'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@handbook.test'};
const member={'oai-authenticated-user-id':'reader-id','oai-authenticated-user-email':'reader@example.test'};
const taskIds=['ai-modeling','coding','engineering','files','website','video','images'];
const oldIds=['getting-started','chatgpt','codex','desktop','practice','models','appendix'];
const starterIds=taskIds.map(id=>'v2-starter-'+id);
const actions={GET,POST,PUT,DELETE};
let checks=0;
async function api(path:string,method:keyof typeof actions='GET',data:unknown=null,who:HeadersInit=owner,origin=root) {
  const headers=new Headers(who); headers.set('host','handbook.test');
  if(method!=='GET') headers.set('origin',origin);
  if(data!==null) headers.set('content-type','application/json');
  setHeaders(headers);
  const req=new Request(root+'/api/'+path,{method,headers,...(data===null?{}:{body:JSON.stringify(data)})});
  const res=await actions[method](req,{params:Promise.resolve({path:path.split('?')[0].split('/')})});
  return {status:res.status,body:await res.json() as any};
}
type Result=ReturnType<typeof api>;
async function expect(request:Result,status=200) {
  const res=await request;
  assert.equal(res.status,status,JSON.stringify(res.body?.error ?? res.status));checks++;return res.body;
}
const raw=()=>sqlite.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value as string|undefined;
const doc=()=>JSON.parse(raw()!);
const rows=()=>sqlite.prepare('SELECT * FROM chapters ORDER BY id').all();
const row=(id:string)=>sqlite.prepare('SELECT * FROM chapters WHERE id=?').get(id)!;
const init=()=>api(admin,'POST',{action:'initialize'});
const revision=()=>doc().revision as number;
const edits=(action:string,fields:Record<string,unknown>)=>({action,expectedRevision:revision(),...fields});
const create=(item:Record<string,unknown>,group='tasks')=>api(admin,'POST',edits('create',{group,item}));
const category={id:'field-notes',name:'读笔记',icon:'window',description:'阅读并整理。'};
const del=(id:string,group='tasks')=>api(admin+'?'+new URLSearchParams({group,id,revision:String(revision())}),'DELETE');
const update=(action:string,fields:Record<string,unknown>)=>api(admin,'PUT',edits(action,fields));
const adminChapter=async(id:string)=>(await expect(api('admin/chapters'))).items.find((c:any)=>c.id===id);
const change=(id:string,body:Record<string,unknown>)=>api('admin/chapters/'+id,'PUT',body);
const pageProps=(query:Record<string,string|string[]>={})=>({searchParams:Promise.resolve(query)});
const taskPage=(task:string,query:Record<string,string|string[]>={})=>TaskPage({params:Promise.resolve({task}),...pageProps(query)});
const toolPage=(tool:string,query:Record<string,string|string[]>={})=>ToolPage({params:Promise.resolve({tool}),...pageProps(query)});
const chapterPage=(id:string,preview=false)=>ChapterPage({params:Promise.resolve({slug:id+'.html'}),searchParams:Promise.resolve(preview?{preview:'1'}:{})});
const html=async(page:Promise<React.ReactNode>)=>renderToStaticMarkup(await page);
const browserAs=(who:HeadersInit={})=>{const h=new Headers(who);h.set('host','handbook.test');setHeaders(h);};

// Before the owner enables categories, public readers should see the v15 entry points.
async function expectOriginalHome() {
  browserAs();
  const page=await html(Home(pageProps()));
  assert(page.includes('把 AI 用在') && page.includes('你想完成的事情上。'));
  assert(page.includes('学习目录') && page.includes('7 个章节 · 持续更新'));
  assert(page.includes('href="/chapters/getting-started.html">开始阅读</a>'));
  assert(page.includes('href="/community">参与讨论</a>'));
  assert(page.includes('id="all-chapters"'));
  assert.deepEqual(Array.from(page.matchAll(/class="chapter-card" href="([^"]+)"/g),m=>m[1]),
    oldIds.map(id=>'/chapters/'+id+'.html'));
  assert(!page.includes('你想做什么？') && !page.includes('筛选教程'));
  assert(!(await html(chapterPage('desktop'))).includes('aria-label="面包屑"'));
}

// Missing/corrupt settings fail closed. Reads, invalid methods, blocked identities and errors never seed.
const initial=await expect(api('chapters','GET',null,{}));
assert.deepEqual(initial.items.map((x:any)=>x.id),oldIds);
await expect(api('me')); // claim the synthetic owner on the isolated test site
const before=rows();
assert.equal((await expect(api(admin))).state,'missing');
assert.equal((await readPublicCatalog(root)).ready,false);
await expectOriginalHome();
for(const [who,status] of [[{},401],[member,403]] as const) {
  for(const method of ['GET','POST','PUT','DELETE'] as const)
    await expect(api(admin,method,['POST','PUT'].includes(method)?{action:'initialize'}:null,who),status);
}
await expect(api(admin,'POST',{action:'initialize'},owner,'https://another.test'),403);
await expect(api(admin+'/extra','POST',{action:'initialize'}),404);
assert.equal(raw(),undefined);
for(const invalid of ['not json',JSON.stringify({schema:99,revision:1})]){
  sqlite.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run(key,invalid);
  assert.equal((await expect(api(admin))).state,'invalid');
  const fallback=await readPublicCatalog(root);
  assert.equal(fallback.ready,false);assert.deepEqual(fallback.chapters.map(c=>c.id),oldIds);
  await expectOriginalHome();
  await expect(init(),409);assert.equal(raw(),invalid);assert.deepEqual(rows(),before);
  sqlite.prepare('DELETE FROM settings WHERE key=?').run(key);
}

// A legacy eight-chapter database must first complete its existing v14 release; never replay it here.
const releaseValue=sqlite.prepare('SELECT value FROM settings WHERE key=?').get(FIFTH_CHAPTER_REVISION)!.value;
sqlite.prepare('DELETE FROM settings WHERE key=?').run(FIFTH_CHAPTER_REVISION);
await expect(init(),409);assert.equal(raw(),undefined);assert.deepEqual(rows(),before);
assert.equal(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(FIFTH_CHAPTER_REVISION),undefined);
sqlite.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run(FIFTH_CHAPTER_REVISION,releaseValue);

// Even a soft-deleted ID belongs to its author. All seven inserts must succeed or none may commit.
sqlite.prepare('INSERT INTO chapters(id,title,description,body,position,updated_at,deleted_at) VALUES (?,?,?,?,?,?,?)')
  .run(starterIds[0],'reserved test','', '<p>original</p>',30,'old','old');
const collision=rows();await expect(init(),409);
assert.deepEqual(rows(),collision);assert.equal(raw(),undefined);
sqlite.prepare('DELETE FROM chapters WHERE id=?').run(starterIds[0]);
const db=database();
sqlite.exec("CREATE TRIGGER interrupt_seed BEFORE INSERT ON chapters WHEN NEW.id='v2-starter-video' BEGIN SELECT RAISE(ABORT,'fixture: interruption'); END");
await assert.rejects(()=>initializeTaxonomy(db),/fixture: interruption/);sqlite.exec('DROP TRIGGER interrupt_seed');
assert.equal(raw(),undefined);assert.deepEqual(rows(),before);

// Interleave a real author change between preflight and transaction; do not write stale mappings.
const concurrentDb={prepare:db.prepare.bind(db),batch:async(stmts:D1PreparedStatement[])=>{
  sqlite.prepare("UPDATE chapters SET version=version+1 WHERE id='desktop'").run();return db.batch(stmts);
}} as unknown as D1Database;
await assert.rejects(()=>initializeTaxonomy(concurrentDb),(e:any)=>e.status===409);
assert.equal(raw(),undefined);assert.equal(rows().length,before.length);
sqlite.prepare("UPDATE chapters SET version=version-1 WHERE id='desktop'").run();assert.deepEqual(rows(),before);
const [first,second]=await Promise.all([expect(init()),expect(init())]);
assert.equal(first.state,'ready');assert.equal(second.state,'ready');
const seeded=doc(),seedBytes=raw(),seedRows=rows();assert.equal(seeded.revision,1);
assert.deepEqual(seedRows.filter(r=>!starterIds.includes(String(r.id))),before);
assert.equal(seedRows.length,before.length+7);
// A foreign mapped chapter is corrupt data, never an instruction to create it or overwrite the setting.
const broken={...seeded,chapterTags:{...seeded.chapterTags,'nonexistent-chapter':{tasks:[],tools:[],level:null}}};
sqlite.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(broken),key);
assert.equal((await expect(api(admin))).state,'invalid');assert.equal((await readPublicCatalog(root)).ready,false);
await expect(init(),409);assert.equal(raw(),JSON.stringify(broken));assert.deepEqual(rows(),seedRows);
sqlite.prepare('UPDATE settings SET value=? WHERE key=?').run(seedBytes!,key);
await expect(init());assert.equal(raw(),seedBytes);assert.deepEqual(rows(),seedRows);
assert.deepEqual(seeded.tasks.map((x:any)=>x.id),taskIds);
assert.deepEqual(seeded.tools.map((x:any)=>x.id),['chatgpt-codex','claude','domestic-ai','multi-open','agents','workbuddy']);
assert.deepEqual(seeded.levels.map((x:any)=>x.id),['basic','advanced']);assert.equal(seeded.emptyPolicy,'hide');
for(const id of oldIds){
  const expected={tasks:id==='desktop'?['coding','engineering']:[],tools:[id==='models'?'multi-open':'chatgpt-codex'],level:['practice','models'].includes(id)?'advanced':'basic'};
  assert.deepEqual(seeded.chapterTags[id],expected);assert.deepEqual(seeded.publishedChapterTags[id],expected);
}
for(const [i,id] of starterIds.entries()){
  const c=row(id);assert.equal(c.deleted_at,null);
  assert(Number(c.position)>Math.max(...before.map(x=>Number(x.position))));
  assert.equal(Object.entries(c).filter(([k])=>k.startsWith('published_')).every(([,v])=>v===null),true);
  assert.deepEqual(seeded.chapterTags[id],{tasks:[taskIds[i]],tools:[],level:'basic'});
  assert(!Object.hasOwn(seeded.publishedChapterTags,id));
  assert.equal((String(c.body).match(/<h2\b/g)||[]).length,3);
  assert.equal((String(c.body).match(/data-content-block="heading"/g)||[]).length,3);
  assert(!/<(?:img|p|pre|figure)\b/.test(String(c.body)));
}
assert.match(String(row(starterIds[0]).title),/Blender/);

// The v18-compatible document remains schema 1; presentation defaults never write settings.
// Keep this expected list independent of the implementation's whitelist.
const materialGroups=['tasks','tools','levels'] as const;
const expectedMaterials=['grass','dirt','stone','water','sand','wood','ember','gem','snow'] as const;
const knownChapterIds=new Set(seedRows.map(c=>String(c.id)));
const readSnapshot=()=>({
  chapters:rows(),
  settings:sqlite.prepare('SELECT * FROM settings ORDER BY key').all(),
  media:sqlite.prepare('SELECT * FROM media ORDER BY id').all(),
});
const oldReadBefore=readSnapshot();
const oldDecoded=decodeTaxonomy(seedBytes!,knownChapterIds);
assert(oldDecoded.state==='ready');
assert.deepEqual(JSON.parse(serializeTaxonomy(oldDecoded.doc)),seeded);
const oldView=await expect(api(admin));assert.equal(oldView.state,'ready');
for(const group of materialGroups) for(const c of oldView.taxonomy[group])
  assert(!Object.hasOwn(c,'material'),'reading old categories must not backfill a material');
for(let order=0;order<27;order++) {
  const automatic=Object.freeze({order});
  assert.equal(categoryMaterial(automatic),expectedMaterials[order%9]);
  assert(!Object.hasOwn(automatic,'material'));
  assert.equal(categoryMaterial({...automatic,material:'snow'}),'snow');
}
// Hiding the first category must not move the second category to the first material.
assert.equal(categoryMaterial({order:1}),'dirt');
const automaticCatalog=await readPublicCatalog(root);
assert.equal(automaticCatalog.ready,true);
assert.deepEqual(automaticCatalog.tasks.map(c=>[c.id,c.material]),[['coding','dirt'],['engineering','stone']],
  'automatic materials use stored order before empty categories are hidden');
assert.deepEqual(readSnapshot(),oldReadBefore);

for(const material of expectedMaterials) {
  const candidate=structuredClone(seeded);candidate.tasks[0].material=material;
  const source=JSON.stringify(candidate),parsed=decodeTaxonomy(source,knownChapterIds);
  assert(parsed.state==='ready','stored material should be accepted: '+material);
  assert.equal(parsed.doc.tasks[0].material,material);
  assert.equal(parsed.doc.schema,1);assert.equal(parsed.doc.writeToken,seeded.writeToken);
  assert.equal(parsed.raw,source);
  assert.deepEqual(JSON.parse(serializeTaxonomy(parsed.doc)),candidate);
}
for(const material of [null,'lava','Grass',' grass','grass ',42,true,[],{}]) {
  const invalid=structuredClone(seeded);invalid.tasks[0].material=material;
  assert.equal(decodeTaxonomy(JSON.stringify(invalid),knownChapterIds).state,'invalid');
  assert.throws(()=>serializeTaxonomy(invalid),(e:any)=>e.status===400);
}
// Null is invalid stored data, not a request to reset to an automatic default.
const nullMaterial=structuredClone(seeded);nullMaterial.tools[0].material=null;
sqlite.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(nullMaterial,null,2),key);
try {
  const invalidReadBefore=readSnapshot();
  assert.equal((await expect(api(admin))).state,'invalid');
  assert.equal((await readPublicCatalog(root)).ready,false);
  await expect(init(),409);
  assert.deepEqual(readSnapshot(),invalidReadBefore,'invalid material reads/init must not repair or reset data');
} finally {sqlite.prepare('UPDATE settings SET value=? WHERE key=?').run(seedBytes!,key);}

// Existing annotated data from a compatible version must survive old editor paths.
// All nine values span the three groups; other categories deliberately stay unannotated.
const future=structuredClone(seeded);
const materialFixtures=expectedMaterials.map((material,index)=>({
  group:index<7?'tasks':index===7?'tools':'levels',
  id:index<7?taskIds[index]:index===7?'chatgpt-codex':'basic',material,
}));
for(const fixture of materialFixtures)
  future[fixture.group].find((c:any)=>c.id===fixture.id).material=fixture.material;
function assertFutureMaterials(value:any=doc()) {
  assert.equal(value.schema,1);
  for(const fixture of materialFixtures)
    assert.equal(value[fixture.group].find((c:any)=>c.id===fixture.id)?.material,fixture.material,
      'existing material must survive: '+fixture.group+'/'+fixture.id);
  for(const group of materialGroups) for(const c of value[group]) {
    if(!materialFixtures.some(f=>f.group===group&&f.id===c.id))
      assert(!Object.hasOwn(c,'material'),'unannotated categories must remain unannotated');
  }
}
const formattedFuture=JSON.stringify(future,null,2);
sqlite.prepare('UPDATE settings SET value=? WHERE key=?').run(formattedFuture,key);
const futureReadBefore=readSnapshot();
const futureView=await expect(api(admin));assert.equal(futureView.state,'ready');assertFutureMaterials(futureView.taxonomy);
await expect(api('admin/chapters'));
assert.equal((await readPublicCatalog(root)).ready,true);
browserAs();
await html(Home(pageProps()));await html(taskPage('coding'));await html(toolPage('chatgpt-codex'));await html(chapterPage('desktop'));
assertFutureMaterials((await expect(api('admin/export'))).taxonomy_v1);
assert.equal(raw(),formattedFuture,'readers must preserve the exact formatted settings bytes');
assert.equal(doc().writeToken,future.writeToken);assert.equal(doc().revision,future.revision);
assert.deepEqual(readSnapshot(),futureReadBefore,'reads preserve every chapter/media/settings field');

// A material edit is a navigation setting, never a chapter/content write.
const beforeMaterialChapters=rows(),beforeMaterialMedia=readSnapshot().media,initialEmptyPolicy=doc().emptyPolicy;
for(const [index,material] of expectedMaterials.entries()) {
  const group=materialGroups[index%3],id='material-'+material;
  const previous=doc();
  await expect(create({...category,id,name:'材质 '+material,material},group));
  let current=doc();
  assert.equal(current.schema,1);assert.equal(current.revision,previous.revision+1);
  assert.notEqual(current.writeToken,previous.writeToken);
  assert.equal(current[group].find((c:any)=>c.id===id).material,material);
  assert.equal(current.emptyPolicy,initialEmptyPolicy);
  await expect(update('edit',{group,id,changes:{description:'普通说明编辑不清除指定材质'}}));
  assert.equal(doc()[group].find((c:any)=>c.id===id).material,material);
  const nextMaterial=expectedMaterials[(index+1)%9];
  await expect(update('edit',{group,id,changes:{material:nextMaterial}}));
  assert.equal(doc()[group].find((c:any)=>c.id===id).material,nextMaterial);
  const exported=await expect(api('admin/export'));
  assert.equal(exported.taxonomy_v1[group].find((c:any)=>c.id===id).material,nextMaterial);
  await expect(update('edit',{group,id,changes:{material:null}}));
  current=doc();const automatic=current[group].find((c:any)=>c.id===id);
  assert(!Object.hasOwn(automatic,'material'),'automatic choice omits the stored field; it is never null');
  assert.equal(categoryMaterial(automatic),expectedMaterials[automatic.order%9]);
  await expect(update('edit',{group,id,changes:{description:'自动材质也保持省略'}}));
  assert(!Object.hasOwn(doc()[group].find((c:any)=>c.id===id),'material'));
  await expect(del(id,group));
}
assert.deepEqual(rows(),beforeMaterialChapters);assert.deepEqual(readSnapshot().media,beforeMaterialMedia);
assert.equal(doc().emptyPolicy,initialEmptyPolicy);assertFutureMaterials();
const beforeMaterialWrites=readSnapshot();
const invalidMaterials=['lava','Grass',' grass','grass ','#fff','url(https://evil.test/image)','<script>',42,true,[],{}];
for(const material of [null,...invalidMaterials]) {
  await expect(create({...category,id:'blocked-material',material}),400);
  assert.deepEqual(readSnapshot(),beforeMaterialWrites);
}
for(const material of invalidMaterials) {
  await expect(update('edit',{group:'tasks',id:'coding',changes:{material}}),400);
  assert.deepEqual(readSnapshot(),beforeMaterialWrites);
}
// Permission/origin guards still run before material input reaches validation.
for(const [who,status] of [[{},401],[member,403]] as const) {
  await expect(api(admin,'GET',null,who),status);
  await expect(api(admin,'POST',edits('create',{group:'tasks',item:{...category,material:'grass'}}),who),status);
  await expect(api(admin,'PUT',edits('edit',{group:'tasks',id:'coding',changes:{material:'grass'}}),who),status);
}
await expect(api(admin,'PUT',edits('edit',{group:'tasks',id:'coding',changes:{material:'grass'}}),owner,'https://another.test'),403);
assert.deepEqual(readSnapshot(),beforeMaterialWrites);
const codingDescription=doc().tasks.find((c:any)=>c.id==='coding').description;
const beforeCategoryWrite=doc();
await expect(update('edit',{group:'tasks',id:'coding',changes:{description:'兼容读取后仍可修改普通说明。'}}));
assert.equal(doc().tasks.find((c:any)=>c.id==='coding').description,'兼容读取后仍可修改普通说明。');
assert.equal(revision(),beforeCategoryWrite.revision+1);
assert.notEqual(doc().writeToken,beforeCategoryWrite.writeToken,'a successful category mutation rotates the existing CAS token');
assertFutureMaterials();
await expect(update('edit',{group:'tasks',id:'coding',changes:{description:codingDescription}}));
assertFutureMaterials();

// Two material editors share the same revision: one succeeds, one receives 409.
{
  const previous=doc(),chaptersBefore=rows();
  const competing=await Promise.all(['snow','wood'].map(material=>api(admin,'PUT',{
    action:'edit',group:'tasks',id:'coding',changes:{material},expectedRevision:previous.revision,
  })));
  assert.deepEqual(competing.map(result=>result.status).sort(),[200,409]);
  assert.equal(doc().tasks.find((c:any)=>c.id==='coding').material,competing[0].status===200?'snow':'wood');
  assert.equal(revision(),previous.revision+1);assert.notEqual(doc().writeToken,previous.writeToken);
  assert.deepEqual(rows(),chaptersBefore);
  assert.deepEqual(doc().chapterTags,previous.chapterTags);
  assert.deepEqual(doc().publishedChapterTags,previous.publishedChapterTags);
  await expect(update('edit',{group:'tasks',id:'coding',changes:{material:'dirt'}}));
  assertFutureMaterials();
}

// Race a navigation material edit with an actual chapter publish. The shared
// revision allows exactly one complete operation, never a half-published body.
{
  const chapter=await adminChapter('desktop'),previous=doc(),chapterBefore=row('desktop');
  const results=await Promise.all([
    api(admin,'PUT',{action:'edit',group:'tasks',id:'coding',changes:{material:'snow'},expectedRevision:previous.revision}),
    change('desktop',{...chapter,action:'publish',title:'material race publication',body:'<p>material race body</p>'}),
  ]);
  assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
  assert.equal(revision(),previous.revision+1);
  const current=row('desktop');
  if(results[0].status===200){
    assert.deepEqual(current,chapterBefore,'losing publish must not change a single chapter field');
    assert.equal(doc().tasks.find((c:any)=>c.id==='coding').material,'snow');
    assert.deepEqual(doc().chapterTags,previous.chapterTags);
    assert.deepEqual(doc().publishedChapterTags,previous.publishedChapterTags);
    await expect(update('edit',{group:'tasks',id:'coding',changes:{material:'dirt'}}));
  }else{
    assert.equal(current.title,'material race publication');assert.equal(current.published_title,current.title);
    assert.equal(current.body,'<p>material race body</p>');assert.equal(current.published_body,current.body);
    assert.equal(current.version,Number(chapterBefore.version)+1);
    assert.equal(doc().tasks.find((c:any)=>c.id==='coding').material,'dirt');
    assert.deepEqual(doc().publishedChapterTags.desktop,chapter.tags);
    const latest=await adminChapter('desktop');
    await expect(change('desktop',{...latest,action:'publish',title:chapter.title,description:chapter.description,body:chapter.body,position:chapter.position}));
  }
  assertFutureMaterials();
}

// Exercise real server page components as both identities, including direct guesses, public projection and query filters.
const draftTitles=starterIds.map(id=>String(row(id).title));
function publicOnly(text:string){
  for(const sensitive of [...starterIds,...draftTitles,'publishedChapterTags','"/assets/screenshots/','chapterTags']) assert(!text.includes(sensitive),'public projection leaked '+sensitive);
}
for(const who of [{},member]){
  const list=await expect(api('chapters?preview=1','GET',null,who));publicOnly(JSON.stringify(list));
  assert.deepEqual(list.items.map((c:any)=>c.id),oldIds);
  const catalog=await readPublicCatalog(root);publicOnly(JSON.stringify(catalog));
  assert.deepEqual(catalog.chapters.map(c=>c.id),oldIds);
  assert.deepEqual(catalog.tasks.map(c=>[c.id,c.count]),[['coding',1],['engineering',1]]);
  assert.deepEqual(catalog.tools.map(c=>[c.id,c.count]),[['chatgpt-codex',6],['multi-open',1]]);
  assert.deepEqual(catalog.levels.map(c=>[c.id,c.count]),[['basic',5],['advanced',2]]);
  browserAs(who);
  publicOnly(await html(Home(pageProps())));publicOnly(await html(taskPage('coding')));publicOnly(await html(toolPage('chatgpt-codex')));
  for(const id of starterIds){
    await expect(api('chapters/'+id+'?preview=1','GET',null,who),404);
    await assert.rejects(()=>chapterPage(id),/NOT_FOUND/);
    await assert.rejects(()=>chapterPage(id,true),/NOT_FOUND/);
  }
  for(const id of oldIds){const live=await html(chapterPage(id));assert(live.includes(String(row(id).published_title)));publicOnly(live);}
  await assert.rejects(()=>chapterPage('boundaries'),/REDIRECT:\/chapters\/appendix.html#before-sharing/);
  for(const id of ['website','unknown-category']) await assert.rejects(()=>taskPage(id),/NOT_FOUND/);
  await assert.rejects(()=>toolPage('claude'),/NOT_FOUND/);
}
// Latest discussions on the new home page must obey moderation even if a private post is newer.
for(const [topic,moderation,hidden,time] of [['old-public','approved',0,'2098'],['new-public','approved',0,'2099'],['pending-only','pending',0,'2100'],['hidden-only','approved',1,'2101']] as const) {
  sqlite.prepare('INSERT INTO topics(id,title,body,category,author_id,author_name,created_at,updated_at,moderation_status,hidden) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(topic,topic,'fixture','使用求助','test-reader','reader',time,time,moderation,hidden);
}
const home=await html(Home(pageProps()));assert(!home.includes('pending-only')&&!home.includes('hidden-only'));
assert(home.includes('你想做什么？') && home.includes('/learn/coding') && home.includes('/learn/engineering'));
assert(!home.includes('开始阅读</a>'));
assert(home.includes('old-public')&&home.indexOf('new-public')>=0&&home.indexOf('new-public')<home.indexOf('old-public'));
browserAs(owner);
assert((await html(chapterPage(starterIds[0],true))).includes(draftTitles[0]));
const desktopPage=await html(chapterPage('desktop')), crumbs=desktopPage.match(/<nav[^>]*aria-label="面包屑"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert(crumbs?.includes('href="/learn/coding"')&&!crumbs.includes('/learn/engineering'));
assert(desktopPage.includes('href="/learn/engineering"')&&desktopPage.includes('href="/tools/chatgpt-codex"'));
const advancedPage=await html(chapterPage('practice'));
assert(advancedPage.includes('高级技巧')&&advancedPage.includes('href="/#all-chapters"'));
const catalog=await readPublicCatalog(root);
assert.deepEqual(filterCatalog(catalog,{task:['coding','engineering']}).chapters.map(c=>c.id),['desktop']);
assert.deepEqual(filterCatalog(catalog,{tool:['multi-open','chatgpt-codex'],level:'advanced'}).chapters.map(c=>c.id),['practice','models']);
assert.deepEqual(filterCatalog(catalog,{tool:'multi-open'},{group:'tasks',id:'coding'}).chapters,[]);
assert.deepEqual(filterCatalog(catalog,{tool:'missing'}).chapters,[]);
assert(filterCatalog(catalog,{tool:'missing'}).invalid.length);
assert(filterCatalog(catalog,{level:['basic','advanced']}).invalid.length);

// Retired figure captions must not surface in excerpts on ANY of the three new public pages.
const previousDescription=row('desktop').published_description!;
sqlite.prepare("UPDATE chapters SET published_description=? WHERE id='desktop'")
  .run('excerpt before <figure><a href="/assets/screenshots/excerpt.png"><img src="/assets/screenshots/excerpt.png"></a><figcaption>secret-old-caption</figcaption></figure> excerpt after');
browserAs();
for(const result of await Promise.all([html(Home(pageProps())),html(taskPage('coding')),html(toolPage('chatgpt-codex'))])){
  assert(!result.includes('secret-old-caption'));assert(!result.includes('/assets/screenshots/'));assert(result.includes('excerpt before'));
}
sqlite.prepare("UPDATE chapters SET published_description=? WHERE id='desktop'").run(previousDescription);
await expect(update('setEmptyPolicy',{emptyPolicy:'comingSoon'}));
assertFutureMaterials();
const noContent=await html(taskPage('website'));assert(noContent.includes('即将上线'));publicOnly(noContent);
assert.equal((await readPublicCatalog(root)).tasks.find(c=>c.id==='website')?.count,0);
await expect(update('setEmptyPolicy',{emptyPolicy:'hide'}));
assertFutureMaterials();

// Fill the UTF-8 byte budget with a valid fixture; the over-budget edit must return 413 without mutation.
const beforeLimits=raw()!,nearLimit=doc();
nearLimit.retiredIds={tasks:[]};
const retiredTasks=nearLimit.retiredIds.tasks as string[];
let bytes=Buffer.byteLength(JSON.stringify(nearLimit));
while(bytes<128*1024-96){const id='former-long-category-'+retiredTasks.length;bytes+=Buffer.byteLength(JSON.stringify(id))+(retiredTasks.length?1:0);retiredTasks.push(id);}
const boundedRaw=JSON.stringify(nearLimit);assert(Buffer.byteLength(boundedRaw)<=128*1024);
sqlite.prepare('UPDATE settings SET value=? WHERE key=?').run(boundedRaw,key);
await expect(create({...category,description:'图'.repeat(200)}),413);assert.equal(raw(),boundedRaw);
sqlite.prepare('UPDATE settings SET value=? WHERE key=?').run(beforeLimits,key);

// Phase 4's optional topic references also protect deleting task and tool categories.
for(const [group,id,refTags] of [['tasks','forum-scene',{task:'forum-scene',tools:[]}],['tools','forum-tool',{task:null,tools:['forum-tool']}]] as const){
  await expect(create({...category,id},group));
  sqlite.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('topic_tags_v1:topic-42',JSON.stringify(refTags));
  const saved=raw();const blocked=await expect(del(id,group),409);
  assert.match(blocked.error,/topic-42/);assert.equal(raw(),saved);
  sqlite.prepare("DELETE FROM settings WHERE key='topic_tags_v1:topic-42'").run();
  await expect(del(id,group));
}

const beforeErrors=raw();
for(const fields of [{id:'../escape'},{id:'constructor'},{icon:'https://evil.test/icon.svg'},{description:'a'.repeat(201)},{name:' '},{id:'bad-order',order:-1},{leak:'surprise'}]) {
  await expect(create({...category,...fields}),400);
}
await expect(api(admin,'POST',{...edits('create',{group:'tasks',item:category}),chapterTags:{desktop:{}}}),400);
await expect(update('edit',{group:'tasks',id:'coding',changes:{id:'changed-id'}}),400);
await expect(update('reorder',{group:'tasks',ids:taskIds.slice(1)}),400);
await expect(update('reorder',{group:'tasks',ids:taskIds.map(()=>taskIds[0])}),400);
await expect(update('setEmptyPolicy',{emptyPolicy:'expose'}),400);
await expect(del('coding'),409);assert.equal(raw(),beforeErrors);
await expect(create(category));const versionAfterCreate=revision();
assert(!Object.hasOwn(doc().tasks.find((c:any)=>c.id===category.id),'material'),'creating an automatic category does not store a material');
await expect(create({...category,name:'changed'}),409);
await expect(create({...category,id:'another',name:' '+category.name+' '}),409);
assert.equal(revision(),versionAfterCreate);
const raceEdits=['新名称 A','新名称 B'].map(name=>api(admin,'PUT',{action:'edit',group:'tasks',id:category.id,changes:{name},expectedRevision:versionAfterCreate}));
const renamed=await Promise.all(raceEdits);assert.deepEqual(renamed.map(r=>r.status).sort(),[200,409]);
assert.equal(doc().tasks.find((x:any)=>x.id===category.id).name,renamed[0].status===200?'新名称 A':'新名称 B');
const reversed=doc().tasks.map((x:any)=>x.id).reverse();
await expect(update('reorder',{group:'tasks',ids:reversed}));
assert.deepEqual(doc().tasks.map((x:any)=>x.id),reversed);
assert.deepEqual(doc().tasks.map((x:any)=>x.order),reversed.map((_:string,i:number)=>i));
assertFutureMaterials();
for(const group of materialGroups) for(const c of (await readPublicCatalog(root))[group]) {
  const stored=doc()[group].find((item:any)=>item.id===c.id);
  assert.equal(c.material,stored.material??expectedMaterials[stored.order%9]);
}
await expect(del(category.id));await expect(create(category),409);

// A draft-only classification and changed text must remain private until an explicit publish.
const id='desktop', original=await adminChapter(id);
const tagsA={tasks:['website'],tools:['claude'],level:'advanced'};
const tagsB={tasks:['video'],tools:['multi-open'],level:'basic'};
const originalPublic=structuredClone(doc().publishedChapterTags[id]);
const snapshot=()=>({settings:raw(),chapter:row(id)});
let unchanged=snapshot();
for(const invalidTags of [{...tagsA,tools:['website']},{...tagsA,level:['basic']},{...tagsA,level:'absent'},{...tagsA,extra:true}]){
  await expect(change(id,{...original,action:'publish',tags:invalidTags}),400);assert.deepEqual(snapshot(),unchanged);
}
await expect(change(id,{...original,action:'publish',tags:tagsA,expectedRevision:undefined}),400);
const beforeTaggedSave=doc();
let saved=(await expect(change(id,{...original,action:'save',title:'private title',body:'<p>private working text</p>',tags:{...tagsA,tasks:['website','website']}}))).item;
assert.equal(revision(),beforeTaggedSave.revision+1);
assert.notEqual(doc().writeToken,beforeTaggedSave.writeToken,'a successful chapter/tag save rotates the existing CAS token');
assertFutureMaterials();
assert.deepEqual(saved.tags,tagsA);assert.deepEqual(doc().chapterTags[id],tagsA);
assert.deepEqual(doc().publishedChapterTags[id],originalPublic);assert.deepEqual((await readPublicCatalog(root)).chapters.find(c=>c.id===id)?.tags,originalPublic);
browserAs(member);const reader=await html(chapterPage(id,true));assert(!reader.includes('private working text'));
browserAs(owner);assert((await html(chapterPage(id,true))).includes('private working text'));
await expect(del('website'),409); // draft ref
const ref='published-only';
await expect(create({...category,id:ref,name:'用于核对发布快照'}));
saved=await adminChapter(id);
// Legacy v14 callers know neither tags nor taxonomy revision. Preserve draft tags when publishing.
const legacy={action:'publish',version:saved.version,title:saved.title,description:saved.description,position:saved.position,body:saved.body};
saved=(await expect(change(id,legacy))).item;
assertFutureMaterials();
assert.deepEqual(doc().publishedChapterTags[id],tagsA);
assert.deepEqual((await readPublicCatalog(root)).chapters.find(c=>c.id===id)?.tags,tagsA);
const tempTags={...tagsA,tasks:[ref]};
saved=(await expect(change(id,{...saved,tags:tempTags,action:'publish'}))).item;
assertFutureMaterials();
saved=(await expect(change(id,{...saved,tags:tagsB,action:'save'}))).item;
assertFutureMaterials();
await expect(del(ref),409); // only present in the published snapshot, not any draft

// Both optimistic locks matter. A valid chapter version cannot compensate for stale taxonomy and vice versa.
unchanged=snapshot();
await expect(change(id,{...saved,action:'publish',tags:tagsB,expectedRevision:saved.expectedRevision-1}),409);
assert.deepEqual(snapshot(),unchanged);
assertFutureMaterials();
await expect(change(id,{...saved,action:'publish',tags:tagsB,version:saved.version-1}),409);
assert.deepEqual(snapshot(),unchanged);
assertFutureMaterials();
sqlite.exec("CREATE TRIGGER interrupt_publish BEFORE UPDATE ON chapters WHEN NEW.id='desktop' BEGIN SELECT RAISE(ABORT,'fixture: chapter failure'); END");
try {
  await assert.rejects(()=>saveChapterWithTags(db,{id,version:saved.version,publish:true,title:'should rollback',description:'',
    html:'<p>interrupted</p>',position:saved.position,now:'test',tags:tagsB,expectedRevision:saved.expectedRevision}),/fixture: chapter failure/);
  assert.deepEqual(snapshot(),unchanged);
  assertFutureMaterials();
} finally {sqlite.exec('DROP TRIGGER interrupt_publish');}

const candidates=[{title:'Winner A',body:'<p>A body</p>',tags:tagsA},{title:'Winner B',body:'<p>B body</p>',tags:tagsB}];
const contested=await Promise.all(candidates.map(input=>change(id,{...saved,...input,action:'publish'})));
assert.deepEqual(contested.map(result=>result.status).sort(),[200,409]);
const winner=candidates[contested.findIndex(r=>r.status===200)],live=row(id);
assert.equal(live.version,saved.version+1);assert.equal(revision(),saved.expectedRevision+1);
assert.equal(live.body,winner.body);assert.equal(live.title,winner.title);
assert.equal(live.published_body,winner.body);assert.equal(live.published_title,winner.title);
assert.deepEqual(doc().chapterTags[id],winner.tags);assert.deepEqual(doc().publishedChapterTags[id],winner.tags);
assertFutureMaterials();
await expect(del(ref)); // published ref was removed by winning publish

// An unpublish/delete/restore must remove the chapter from counts and lists. Restore alone is not publish.
saved=await adminChapter(id);
saved=(await expect(change(id,{action:'unpublish',version:saved.version}))).item;
const publicIds=async()=>(await readPublicCatalog(root)).chapters.map(c=>c.id);
assert(!(await publicIds()).includes(id));browserAs(member);await assert.rejects(()=>chapterPage(id,true),/NOT_FOUND/);
saved=(await expect(change(id,{...saved,action:'publish'}))).item;
assert((await publicIds()).includes(id));
await expect(api('admin/chapters/'+id+'?version='+saved.version,'DELETE'));
assert(!(await publicIds()).includes(id));browserAs(member);await assert.rejects(()=>chapterPage(id),/NOT_FOUND/);
saved=(await expect(change(id,{action:'restore',version:saved.version+1}))).item;
assert(!(await publicIds()).includes(id));
assertFutureMaterials();
await expect(change(id,{...saved,action:'publish'}));assert((await publicIds()).includes(id));
assertFutureMaterials();

// Soft-deleted rows retain their draft category reference; init never resurrects edited/deleted starters.
await expect(create({...category,id:'private-task',name:'已删除章节独有的分类'}));
const starter=await adminChapter(starterIds[3]);
const edited=(await expect(change(starter.id,{...starter,title:'author-edited starter',tags:{tasks:['private-task'],tools:[],level:null},action:'save'}))).item;
await expect(api('admin/chapters/'+starter.id+'?version='+edited.version,'DELETE'));
await expect(del('private-task'),409);
const checkpoint={chapters:rows(),setting:raw()};await expect(init());
assert.deepEqual({chapters:rows(),setting:raw()},checkpoint);
sqlite.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('private:test-only','must not appear in exports');
const backup=await expect(api('admin/export'));
assert.deepEqual(backup.taxonomy_v1,doc());assert(!JSON.stringify(backup).includes('must not appear in exports'));
assertFutureMaterials(backup.taxonomy_v1);
// Also initialize a customized v14 site: absent, unpublished, deleted and author-created IDs
// can differ from the stock seven. Classify by ID and publication status, never by position.
sqlite.prepare('DELETE FROM settings WHERE key=?').run(key);
for(const starterId of starterIds)sqlite.prepare('DELETE FROM chapters WHERE id=?').run(starterId);
sqlite.prepare("DELETE FROM chapters WHERE id='codex'").run();
sqlite.prepare("UPDATE chapters SET published_body=NULL WHERE id='models'").run();
sqlite.prepare("UPDATE chapters SET deleted_at='old' WHERE id='appendix'").run();
sqlite.prepare("INSERT INTO chapters(id,title,description,body,position,published_title,published_body,published_position,updated_at) VALUES ('constructor','历史作者章节','','<p>正文</p>',21,'历史作者章节','<p>正文</p>',21,'old')").run();
const customized=rows();await expect(init());
assert.deepEqual(rows().filter(c=>!starterIds.includes(String(c.id))),customized);
assert(!Object.hasOwn(doc().chapterTags,'codex'));
for(const id of ['models','appendix']){
  assert(Object.hasOwn(doc().chapterTags,id));assert(!Object.hasOwn(doc().publishedChapterTags,id));
}
assert(!Object.hasOwn(doc().chapterTags,'constructor'));
const untagged=(await readPublicCatalog(root)).chapters.find(c=>c.id==='constructor');
assert.deepEqual(untagged?.tags,{tasks:[],tools:[],level:null});assert((await html(chapterPage('constructor'))).includes('历史作者章节'));
const inherited=await adminChapter('constructor');await expect(change('constructor',{...inherited,action:'publish',tags:tagsA}));
assert.deepEqual(doc().publishedChapterTags.constructor,tagsA);

console.log('PASS: taxonomy integration ('+checks+' HTTP expectations); initialization and rollback, visibility on rendered pages and APIs, filters and counts, validation, CAS and atomic publish, legacy editors, restore and export.');
