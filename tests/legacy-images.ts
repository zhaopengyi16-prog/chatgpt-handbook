import assert from 'node:assert/strict';
import {publicChapterHtml, addedLegacyImageReferences} from '../lib/legacy-images';
import {readChapterForReader} from '../lib/reader-chapter';
import {cleanHtml} from '../lib/content';
import {renderBlock} from '../lib/blocks';
import {sqlite,setHeaders} from './runtime-mock';

const root='https://handbook.test', old='/assets/screenshots/retired.png', fresh='/api/media/new';
const image=(src:string)=>'<img src="'+src+'" alt="示例">';
const snapshot=()=>({
 chapters:sqlite.prepare('SELECT * FROM chapters ORDER BY id').all(),
 media:sqlite.prepare('SELECT * FROM media ORDER BY id').all(),
});
type Call=(path:string,method?:string,body?:any,who?:any,expected?:number,origin?:string)=>Promise<any>;

export function checkLegacyProjection() {
 const clean=(input:string)=>publicChapterHtml(input,root);
 const before='<h2 id="intro">正文</h2><table><tbody><tr><td>不删表格</td></tr></tbody></table>';
 const after='<p>后续内容</p>';
 const current='<figure>'+image(fresh)+'<figcaption>保留新图</figcaption></figure>';
 const cut='<figure><a href="/zoom"><span>'+image(old+'?size=2#top')+'</span></a><figcaption>旧图注</figcaption></figure>';
 const placeholder='<div class="hint hb-shot-placeholder another"><b>旧占位</b></div>';
 const emptyFrame=renderBlock({id:'empty',kind:'screenshot',title:'截图待补充'});
 const mixed='<figure>'+image(fresh)+image(root+old)+'<figcaption>新旧图同框</figcaption></figure>';
 const wrapper='<a href="'+old+'"><span> '+image(old)+' </span></a>';
 const sample=before+cut+current+image(old)+placeholder+emptyFrame+wrapper+mixed+after;
 assert.equal(clean(sample),cleanHtml(before+current+after),'remove complete retired subtrees, keep adjacent text, tables and R2 figure');
 assert.equal(clean(clean(sample)),clean(sample),'repeat reads are stable');
 assert(cleanHtml(sample).includes(old),'the general sanitizer used for storage must preserve the original');
 const preserved=[
  '<pre><code>&lt;img src="/assets/screenshots/example.png"&gt;</code></pre>',
  image('/assets/screenshots-new/not-retired.png'),
  image('https://other.test/assets/screenshots/still-live.png'),
  '<div class="hb-shot-placeholder-note">不是占位</div>',
  '<a href="/help">如何看图</a>',
 ].join('');
 assert.equal(clean(preserved),cleanHtml(preserved),'keep code, foreign URLs, near-prefix paths, text links and nonmatching classes');
 assert.equal(clean(image(root+'/assets/screenshots/../screenshots/file.png?v=2#x')),'','normalize same-origin URLs including path segments');
 assert.equal(clean('<a href="/guide">保留正文'+image(old)+'</a>'),cleanHtml('<a href="/guide">保留正文</a>'));
 assert.equal(clean('<a href="/guide">'+image(old)+image(fresh)+'</a>'),cleanHtml('<a href="/guide">'+image(fresh)+'</a>'));
 assert(!clean(image(old)+'<script>alert(1)</script><img src="'+fresh+'" onerror="bad()">').includes('onerror'));
 assert.equal(addedLegacyImageReferences(image(old),image(root+old),root),false);
 assert.equal(addedLegacyImageReferences(image(old),image(old)+image(old),root),true);
 assert.equal(addedLegacyImageReferences(image(old),image('/assets/screenshots/another.png'),root),true);
 assert.equal(addedLegacyImageReferences(image(old),image(fresh),root),false);
}

export async function checkLegacyReaders(call:Call,owner:Record<string,string>,reader:Record<string,string>) {
 // The test database is initialized by the normal v14 seed and migrations. No live data.
 const original=snapshot();
 async function read(id:string,preview:boolean,user:Record<string,string>) {
  setHeaders(new Headers(user));
  return readChapterForReader({id,preview,origin:root});
 }
 for(const id of ['practice','models']) {
  const row=original.chapters.find(c=>c.id===id)!;
  assert.match(String(row.published_body),/\/assets\/screenshots\//);
  const pub=await read(id,false,{}), draft=await read(id,true,owner);
  assert.equal(pub.preview,false);assert.equal(draft.preview,true);
  for(const result of [pub,draft]) {
   assert(result.chapter);
   assert.match(result.chapter.html,/<h2\b/);
   assert(!result.chapter.html.includes('/assets/screenshots/'));
   assert(!result.chapter.html.includes('hb-shot-placeholder'));
  }
  const input={body:String(row.body)+'<p>本次尚未保存</p>'};
  const unsaved=await call('admin/reader-preview','POST',input,owner);
  assert.equal(unsaved.html,draft.chapter!.html+'<p>本次尚未保存</p>');
  assert(!pub.chapter!.html.includes('本次尚未保存'));
 }
 const input={body:image(old)+image(fresh)};
 await call('admin/reader-preview','POST',input,{},401);
 await call('admin/reader-preview','POST',input,reader,403);
 await call('admin/reader-preview','POST',input,owner,403,'https://other.test');
 assert.deepEqual(snapshot(),original,'reading public pages, saved drafts and unsaved previews must leave every chapter/media field unchanged');
}

// Called just before an existing migration test proves a historical release is pending.
// A read must not run that migration as a side effect of looking up this chapter.
export async function checkPendingReleaseRead(call:Call,owner:Record<string,string>) {
 const before=snapshot(), id='getting-started';
 await call('me','GET',null,owner); // Global account navigation hydrates on reader and preview routes.
 await call('media/missing-local-image','GET',null,{},404); // Retained R2 images request this route.
 for(const preview of [false,true]) {
  setHeaders(new Headers(preview?owner:{}));
  assert((await readChapterForReader({id,preview,origin:root})).chapter);
 }
 await call('admin/reader-preview','POST',{body:image(old)},owner);
 assert.deepEqual(snapshot(),before,'public and preview reads must not replay a pending historical revision');
}

export async function checkLegacyWrites(call:Call,owner:Record<string,string>,reader:Record<string,string>) {
 const id='legacy-test-only', row=()=>sqlite.prepare('SELECT * FROM chapters WHERE id=?').get(id);
 const payload={id,title:'旧图测试',description:'',body:image(old),position:88};
 await call('admin/chapters','POST',payload,owner,400);
 assert.equal(row(),undefined);
 // Emulate a saved historical draft with a different publication, without weakening the create endpoint.
 sqlite.prepare('INSERT INTO chapters (id,title,description,body,position,updated_at) VALUES (?,?,?,?,?,?)')
  .run(id,payload.title,'','<p>仅草稿</p>'+image(old),88,'2000-01-01');
 try {
  const read=async (preview:boolean,user:Record<string,string>)=>{
   setHeaders(new Headers(user));return readChapterForReader({id,preview,origin:root});
  };
  const before=snapshot();
  assert(!(await read(false,{})).chapter);
  assert(!(await read(true,{})).chapter);
  assert(!(await read(true,reader)).chapter);
  assert.equal((await read(true,owner)).chapter?.html,'<p>仅草稿</p>');
  assert.deepEqual(snapshot(),before,'even an unpublished admin preview preserves every stored field');
  const save=(action:string,body:string,status=200)=>call('admin/chapters/'+id,'PUT',{...row(),action,body},owner,status);
  const valid='<p>已发布</p>'+image(old), saved=(await save('save',valid)).item;
  assert.equal(saved.published_body,null);assert.equal(saved.body,cleanHtml(valid));
  await save('publish',valid);
  await save('save','<p>新的草稿</p>'+image(old));
  assert.equal((await read(true,reader)).chapter?.html,'<p>已发布</p>');
  assert.equal((await read(true,owner)).chapter?.html,'<p>新的草稿</p>');
  const prior=row()!;
  for(const action of ['save','publish']) {
   await save(action,String(prior.body)+image(old),400); // Same old URL, new occurrence.
   await save(action,image('/assets/screenshots/another.png'),400); // Same count, different retired URL.
  }
  await call('admin/chapters/'+id,'PUT',{...prior,version:Number(prior.version)-1,action:'save',body:image(fresh)},owner,409);
  assert.deepEqual(row(),prior,'failed writes must not change the draft, version or publication');
  await save('save','<p>已替换</p>'+image(fresh));
  await save('publish',valid,400); // Present in the old publication, absent from the current draft.
  await save('publish',String(row()!.body));
  assert.match((await read(false,{})).chapter!.html,/src="\/api\/media\/new"/);
 } finally { sqlite.prepare('DELETE FROM chapters WHERE id=?').run(id); }
 // Even a retired gallery record not in any chapter stays available to the author.
 sqlite.prepare("INSERT INTO media (id,name,url,caption,mime,created_at) VALUES ('retired-test','历史图',?,'原说明','image/png','2000-01-01')")
  .run('/assets/screenshots/unreferenced-test.png');
 try {
  const before=snapshot();
  await call('admin/media/retired-test','DELETE',null,owner,409);
  assert.deepEqual(snapshot(),before);
 } finally { sqlite.prepare("DELETE FROM media WHERE id='retired-test'").run(); }
}
