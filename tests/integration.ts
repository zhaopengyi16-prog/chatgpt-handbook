import {screenshotReleases,screenshotUpdates,fillScreenshotBlocks,applyScreenshotRevision} from '../lib/screenshot-release';
import assert from 'node:assert/strict';
import {publicChapterHtml} from '../lib/legacy-images';
import {checkLegacyProjection,checkLegacyReaders,checkLegacyWrites,checkPendingReleaseRead} from './legacy-images';
import {fifthChapter,fifthChapterBlocks} from '../lib/chapter-five';
import {FIFTH_CHAPTER_REVISION,fifthChapterBackupKey,applyFifthChapterRevision,renumberedModels,supplementedAppendix} from '../lib/chapter-five-release';
import {GET,POST,PUT,DELETE} from '../app/api/[...path]/route';
import {setHeaders,sqlite} from './runtime-mock';
import {cleanHtml} from '../lib/content';
import {sampleChapter,sampleBlocks} from '../lib/sample-chapter';
import {renderBlocks,renderBlock,safeUrl} from '../lib/blocks';
import {firstChapter,firstChapterBlocks} from '../lib/chapter-one';
import {FIRST_CHAPTER_BACKUP,FIRST_CHAPTER_REVISION,ONBOARDING_BACKUP,ONBOARDING_REVISION,SECOND_CHAPTER_BACKUP,SECOND_CHAPTER_REVISION,applyFirstChapterRevision,applySecondChapterRevision} from '../lib/content-revisions';
import {secondChapter,secondChapterBlocks} from '../lib/chapter-two';
import {thirdChapter,thirdChapterBlocks} from '../lib/chapter-three';
import {THIRD_CHAPTER_BACKUP,THIRD_CHAPTER_REVISION,applyThirdChapterRevision} from '../lib/content-revisions';
import {fourthChapter,fourthChapterBlocks} from '../lib/chapter-four';
import {thirdChapter as previousThirdChapter} from '../lib/content-history/chapter-three-v1';
import {FOURTH_CHAPTER_BACKUP,FOURTH_CHAPTER_REVISION,THIRD_SUPPLEMENT_BACKUP,THIRD_SUPPLEMENT_REVISION,applyFourthChapterRevision} from '../lib/content-revisions';
import {database} from '../lib/data';
import seed from '../db/seed.json';
import {firstChapter as previousFirstChapter} from '../lib/content-history/chapter-one-v1';
const root='https://handbook.test';
const owner={'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@handbook.test'};
const reader={'oai-authenticated-user-id':'reader-id','oai-authenticated-user-email':'reader@example.test'};
const other={'oai-authenticated-user-id':'other-id','oai-authenticated-user-email':'other@example.test'};
let checks=0;
let responseCookie='';
async function call(path:string,method='GET',body:any=null,who:any={},expected=200,origin=root){
 const headers=new Headers(who);if(method!=='GET')headers.set('origin',origin);
 if(body&&!(body instanceof FormData))headers.set('content-type','application/json');
 const req=new Request(root+'/api/'+path,{method,headers,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});setHeaders(headers);
 const fn:any={GET,POST,PUT,DELETE}[method],response=await fn(req,{params:Promise.resolve({path:path.split('?')[0].split('/')})});
 responseCookie=response.headers.get('set-cookie')||'';
 const content=await response.text();assert.equal(response.status,expected,method+' '+path+': '+content);checks++;
 if(response.headers.get('content-type')?.includes('application/json'))return JSON.parse(content);return content;
}
assert(!cleanHtml('<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">x</a>').includes('onerror'));
assert(!cleanHtml('<a href="java&#x73;cript:alert(1)">x</a>').includes('javascript'));
assert(cleanHtml('<figure><img src="/api/media/abc" alt="图"><figcaption>说明</figcaption></figure>').includes('figcaption'));
const initial=await call('chapters');assert.equal(initial.items.length,7);
assert.deepEqual(initial.items.map((c:any)=>c.id),['getting-started','chatgpt','codex','desktop','practice','models','appendix']);
assert.deepEqual(initial.items.map((c:any)=>c.position),[1,2,3,4,5,6,7]);
const liveFifth=sqlite.prepare("SELECT * FROM chapters WHERE id='practice'").get()!;
assert.equal(liveFifth.title,fifthChapter.title);assert.equal(liveFifth.body,cleanHtml(fifthChapter.body));
assert.equal(liveFifth.published_body,liveFifth.body);assert.equal(liveFifth.version,2);
const shots=fifthChapterBlocks.filter(b=>b.kind==='screenshot');
assert.equal(shots.length,10);
const publishedFifth=publicChapterHtml(String(liveFifth.published_body),root);
assert(!publishedFifth.includes('/assets/screenshots/'));
for(const shot of shots) {
 assert(shot.src && String(liveFifth.body).includes(shot.src),'retain each original in the editor');
 assert(!publishedFifth.includes('data-block-id="'+shot.id+'"'),'remove each retired figure, including its caption');
}
assert(publishedFifth.includes('id="s-903"') && publishedFifth.includes('id="s-1001"'),'chapter headings survive');
assert(!fifthChapterBlocks.some(b=>b.kind==='legacy'));assert(!String(liveFifth.body).includes('截图待补充'));
assert.equal(fifthChapterBlocks.filter(b=>b.kind==='heading'&&b.level===2).length,6);
assert.equal(new Set(fifthChapterBlocks.map(b=>b.id)).size,fifthChapterBlocks.length);
for(const anchor of ['s-903','s-907','s-978','s-979','s-980','s-1001'])assert(String(liveFifth.body).includes('id="'+anchor+'"'));
for(const id of ['practice','models','appendix','boundaries']){
 const backup=JSON.parse(String(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(fifthChapterBackupKey(id))!.value));
 const original=seed.chapters.find(c=>c.id===id)!;assert.equal(backup.body,original.body);assert.equal(backup.position,original.position);
}
assert(sqlite.prepare("SELECT deleted_at FROM chapters WHERE id='boundaries'").get()!.deleted_at);
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='models'").get()!.body,cleanHtml(renumberedModels.body));
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='appendix'").get()!.body,cleanHtml(supplementedAppendix.body));
assert(!/<h[23][^>]*>7\./.test(renumberedModels.body));assert(!/<h[23][^>]*>8\./.test(supplementedAppendix.body));
assert(supplementedAppendix.body.includes('id="before-sharing"'));
assert.equal(initial.items.find((c:any)=>c.id==='getting-started').title,firstChapter.title);
const liveFirst=sqlite.prepare("SELECT * FROM chapters WHERE id='getting-started'").get()!;
assert.equal(liveFirst.body,cleanHtml(screenshotReleases[0].next.body));assert.equal(liveFirst.body,liveFirst.published_body);assert.equal(liveFirst.version,4);
assert.equal((String(liveFirst.body).match(/data-content-block=/g)||[]).length,firstChapterBlocks.length);
assert.equal((String(liveFirst.body).match(/截图待补充/g)||[]).length,4);
assert(!String(liveFirst.body).includes('原稿截图'));assert(String(liveFirst.body).includes('<img'));
assert(!String(liveFirst.body).includes('例会记录'));assert(!String(liveFirst.body).includes('行动清单'));
assert.equal(firstChapterBlocks.filter(b=>b.kind==='heading'&&b.level===2).length,4);
for(const anchor of ['register','install-windows','install-macos','first-signin','open-first-chat','working-folder'])assert(String(liveFirst.body).includes('id="'+anchor+'"'));
const firstBackup=sqlite.prepare('SELECT value FROM settings WHERE key=?').get(FIRST_CHAPTER_BACKUP)!;
assert.equal(JSON.parse(String(firstBackup.value)).body,seed.chapters.find(c=>c.id==='getting-started')!.body);
const onboardingBackup=sqlite.prepare('SELECT value FROM settings WHERE key=?').get(ONBOARDING_BACKUP)!;
assert.equal(JSON.parse(String(onboardingBackup.value)).body,cleanHtml(previousFirstChapter.body));
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chapters WHERE id IN ('practice','boundaries','models','appendix') AND version<>2").get()!.n,0);
const liveSecond=sqlite.prepare("SELECT * FROM chapters WHERE id='chatgpt'").get()!;
assert.equal(liveSecond.title,secondChapter.title);
assert.equal(liveSecond.body,cleanHtml(screenshotReleases[1].next.body));assert.equal(liveSecond.published_body,liveSecond.body);assert.equal(liveSecond.version,3);
assert.equal(liveSecond.position,2);assert.equal(liveSecond.published_position,2);
assert.equal((String(liveSecond.body).match(/data-content-block=/g)||[]).length,secondChapterBlocks.length);
assert.equal((String(liveSecond.body).match(/截图待补充/g)||[]).length,8);
assert(String(liveSecond.body).includes('<img'));assert(!secondChapterBlocks.some(b=>b.kind==='legacy'));
assert.equal(secondChapterBlocks.filter(b=>b.kind==='heading'&&b.level===2).length,6);
assert.equal(new Set(secondChapterBlocks.map(b=>b.id)).size,secondChapterBlocks.length);
assert.equal(JSON.parse(String(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(SECOND_CHAPTER_BACKUP)!.value)).body,seed.chapters.find(c=>c.id==='chatgpt')!.body);
const liveThird=sqlite.prepare("SELECT * FROM chapters WHERE id='codex'").get()!;
assert.equal(liveThird.title,thirdChapter.title);
assert.equal(liveThird.body,cleanHtml(screenshotReleases[2].next.body));assert.equal(liveThird.published_body,liveThird.body);assert.equal(liveThird.version,4);
assert.equal(liveThird.position,3);assert.equal(liveThird.published_position,3);
assert.equal((String(liveThird.body).match(/data-content-block=/g)||[]).length,thirdChapterBlocks.length);
assert.equal((String(liveThird.body).match(/data-content-block="screenshot"/g)||[]).length,14);
assert(String(liveThird.body).includes('<img'));assert(!thirdChapterBlocks.some(b=>b.kind==='legacy'));
assert.equal(thirdChapterBlocks.filter(b=>b.kind==='heading'&&b.level===2).length,6);
assert.equal(new Set(thirdChapterBlocks.map(b=>b.id)).size,thirdChapterBlocks.length);
assert.equal(JSON.parse(String(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(THIRD_CHAPTER_BACKUP)!.value)).body,seed.chapters.find(c=>c.id==='codex')!.body);
const liveFourth=sqlite.prepare("SELECT * FROM chapters WHERE id='desktop'").get()!;
assert.equal(liveFourth.title,fourthChapter.title);
assert.equal(liveFourth.body,cleanHtml(screenshotReleases[3].next.body));assert.equal(liveFourth.body,liveFourth.published_body);
assert.equal(liveFourth.version,3);assert.equal(liveFourth.position,4);assert.equal(liveFourth.published_position,4);
assert.equal(fourthChapterBlocks.filter(b=>b.kind==='heading'&&b.level===2).length,8);
assert.equal(fourthChapterBlocks.filter(b=>b.kind==='screenshot').length,14);
assert(!fourthChapterBlocks.some(b=>b.kind==='legacy'||b.src));
assert.equal((String(liveFourth.body).match(/data-content-block=/g)||[]).length,fourthChapterBlocks.length);
assert.equal(new Set(fourthChapterBlocks.map(b=>b.id)).size,fourthChapterBlocks.length);
for(const b of thirdChapterBlocks.filter(b=>b.kind==='link'&&b.href?.startsWith('/chapters/desktop.html#'))){
 assert(fourthChapterBlocks.some(h=>h.kind==='heading'&&h.anchor===b.href!.split('#')[1]));
}
assert.equal(JSON.parse(String(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(FOURTH_CHAPTER_BACKUP)!.value)).body,seed.chapters.find(c=>c.id==='desktop')!.body);
assert.equal(JSON.parse(String(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(THIRD_SUPPLEMENT_BACKUP)!.value)).body,cleanHtml(previousThirdChapter.body));
await call('chapters');assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='getting-started'").get()!.version,4);

// Each retired release block is filtered on read; original data and unaffected modules survive.
assert.equal(Object.keys(screenshotUpdates).length,9);
for(const [id,shot] of Object.entries(screenshotUpdates)) {
 const block=renderBlock({id,kind:'screenshot',...shot});
 assert(shot.src && cleanHtml(block).includes(shot.src));
 assert.equal(publicChapterHtml(block,root),'',id+' must not leave an empty frame or caption');
}
checkLegacyProjection();
for(const r of screenshotReleases){
 const row=sqlite.prepare('SELECT * FROM chapters WHERE id=?').get(r.original.id)!;
 assert.equal(row.body,cleanHtml(r.next.body));
 const backup=JSON.parse(String(sqlite.prepare('SELECT value FROM settings WHERE key=?').get('content_backup:'+r.original.id+':screenshots-20260911-1')!.value));
 assert.equal(backup.body,r.original.body);
}
assert.equal(fillScreenshotBlocks([{id:'env-skill-shot',kind:'screenshot',src:'/api/media/owner',caption:'我的图'}])[0].src,'/api/media/owner');
const imageReleaseState=JSON.stringify(sqlite.prepare('SELECT id,body,version FROM chapters ORDER BY id').all());
await applyScreenshotRevision(database());
assert.equal(JSON.stringify(sqlite.prepare('SELECT id,body,version FROM chapters ORDER BY id').all()),imageReleaseState);

await call('admin/chapters','GET',null,{},401);
await call('admin/chapters','GET',null,reader,403);
await call('admin/chapters','POST',{},owner,403,'https://evil.test');
assert.equal((await call('me','GET',null,owner)).user.admin,true);
await checkLegacyReaders(call,owner,reader);
await checkLegacyWrites(call,owner,reader);
const spoofed={'oai-authenticated-user-id':'other-id','oai-authenticated-user-email':'owner@handbook.test'};
assert.equal((await call('me','GET',null,spoofed)).user.admin,false);
const chapters=(await call('admin/chapters','GET',null,owner)).items;
assert.equal(chapters.length,8);assert.equal((await call('admin/media','GET',null,owner)).items.length,73);
// New modules must survive the actual save/publish sanitizer and remain drafts
// until an owner publishes them. Old chapters must never be rewritten by a template.
const originalChapter=chapters[0];
const cleanSample=cleanHtml(sampleChapter.body);
assert.equal((cleanSample.match(/data-content-block=/g)||[]).length,sampleBlocks.length);
assert.equal((cleanSample.match(/截图待补充/g)||[]).length,3);
assert(cleanSample.includes('<thead>')&&cleanSample.includes('<tbody>')&&cleanSample.includes('class="copy"'));
assert(cleanSample.includes('id="prepare"')&&cleanSample.includes('data-block-id="first-task-shot-input"'));
assert(!cleanSample.includes('<img'));
assert.equal(cleanHtml(cleanSample),cleanSample);
assert.equal(safeUrl('javascript:alert(1)'), '');
assert.equal(safeUrl('//external.example/image.png'), '');
const hostile=renderBlock({id:'quote" onmouseover="alert(1)',kind:'note',title:'<img src=x onerror=alert(1)>',text:'<script>bad()</script>'});
assert(!hostile.includes('<script>')&&!hostile.includes('<img'));
await call('admin/chapters','POST',sampleChapter,reader,403);
await call('admin/chapters','POST',sampleChapter,owner,201);
let sample=(await call('admin/chapters','GET',null,owner)).items.find((x:any)=>x.id===sampleChapter.id);
assert.equal(sample.body,cleanSample);assert.equal(sample.published_body,null);
assert.equal((await call('chapters')).items.length,7);
const changed=renderBlocks(sampleBlocks.map(b=>b.id==='first-task-shot-input'?{...b,src:'/api/media/example-image',caption:'新截图 & 新图注'}:b));
sample=(await call('admin/chapters/'+sample.id,'PUT',{...sample,body:changed,action:'save'},owner)).item;
assert(sample.body.includes('src="/api/media/example-image"'));assert(sample.body.includes('新截图 &amp; 新图注'));
assert.equal((sample.body.match(/截图待补充/g)||[]).length,2);assert.equal(sample.published_body,null);
sample=(await call('admin/chapters/'+sample.id,'PUT',{...sample,action:'publish'},owner)).item;
assert.equal(sample.body,sample.published_body);assert.equal((await call('chapters')).items.length,8);
sample=(await call('admin/chapters/'+sample.id,'PUT',{...sample,body:cleanSample,action:'save'},owner)).item;
assert(!sample.body.includes('<img'));assert(sample.published_body.includes('/api/media/example-image'));
await call('admin/chapters/'+sample.id,'PUT',{...sample,version:1,action:'save'},owner,409);
await call('admin/chapters/'+sample.id+'?version='+sample.version,'DELETE',null,owner);
const unchanged=(await call('admin/chapters','GET',null,owner)).items.find((x:any)=>x.id===originalChapter.id);
assert.equal(unchanged.body,originalChapter.body);assert.equal(unchanged.version,originalChapter.version);
// Remove only the isolated test fixture, keeping the legacy test counts meaningful.
sqlite.prepare('DELETE FROM chapters WHERE id=?').run(sampleChapter.id);
await call('admin/chapters','POST',{id:'test-chapter',title:'测试章节',description:'简介',body:'<p>草稿</p>',position:9},owner,201);
assert.equal((await call('chapters')).items.length,7);
let c=(await call('admin/chapters','GET',null,owner)).items.find((x:any)=>x.id==='test-chapter');
c=(await call('admin/chapters/test-chapter','PUT',{...c,action:'publish',body:'<p>发布</p><script>alert(1)</script>'},owner)).item;
assert.equal((await call('chapters')).items.length,8);assert(!c.body.includes('script'));
await call('admin/chapters/test-chapter','PUT',{...c,version:1,action:'save'},owner,409);
c=(await call('admin/chapters/test-chapter','PUT',{...c,action:'save',body:'<p>新草稿</p>'},owner)).item;
assert.notEqual(c.body,c.published_body);
const form=new FormData();form.set('file',new File([new Uint8Array([137,80,78,71,13,10,26,10,0])],'test.png',{type:'image/png'}));form.set('caption','测试图片');
const media=(await call('admin/media','POST',form,owner,201)).item;
await call('media/'+media.id);
c=(await call('admin/chapters/test-chapter','PUT',{...c,action:'save',body:'<p>图片</p><img src="'+media.url+'">'},owner)).item;
await call('admin/media/'+media.id,'DELETE',null,owner,409);
c=(await call('admin/chapters/test-chapter','PUT',{...c,action:'publish',body:'<p>已移除图片</p>'},owner)).item;
await call('admin/media/'+media.id,'DELETE',null,owner);
await call('media/'+media.id,'GET',null,{},404);
await call('admin/chapters/test-chapter?version='+c.version,'DELETE',null,owner);
assert.equal((await call('chapters')).items.length,7);
c=(await call('admin/chapters/test-chapter','PUT',{action:'restore',version:c.version+1},owner)).item;
assert.equal(c.deleted_at,null);assert.equal(c.published_body,null);
await call('topics','POST',{id:'test-topic',title:'问题',body:'正文',authorName:'读者',category:'使用求助'}, {},401);
await call('topics','POST',{id:'test-topic',title:'问题',body:'正文',authorName:'读者',category:'使用求助',chapterId:'chatgpt'},reader,201);
assert.equal((await call('topics?chapter=chatgpt')).total,1);
let t=(await call('topics/test-topic','GET',null,reader)).item;
assert.equal(t.can_edit,true);assert.equal(t.author_id,undefined);
await call('topics/test-topic','PUT',{...t,title:'别人修改'},other,403);
await call('replies','POST',{id:'test-reply',topicId:t.id,body:'回答',authorName:'另一位读者'},other,201);
let detail=await call('topics/test-topic','GET',null,other);assert.equal(detail.total,1);
await call('replies/test-reply','PUT',{body:'修改回答',version:1},other);
await call('replies/test-reply','PUT',{body:'越权修改',version:2},reader,403);
await call('admin/topics/test-topic','PUT',{...t,moderate:true,pinned:1,locked:1,hidden:0},owner);
await call('replies','POST',{id:'locked-reply',topicId:t.id,body:'回答',authorName:'读者'},reader,403);
t=(await call('topics/test-topic','GET',null,owner)).item;
await call('admin/topics/test-topic','PUT',{...t,moderate:true,hidden:1},owner);
assert.equal((await call('topics')).total,0);await call('topics/test-topic','GET',null,{},404);
await call('admin/export','GET',null,reader,403);
const backup=await call('admin/export','GET',null,owner);assert.equal(backup.format,'handbook-backup-v1');
await call('admin/topics/test-topic','DELETE',null,owner);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM replies').get()?.n,0);
await call('chapters');assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM chapters').get()?.n,9);
// Guest submissions use the actual API, signed cookies, and a real in-memory SQLite database.
async function newGuest(){
 const me=await call('me');assert.equal(me.user,null);
 assert(responseCookie.includes('HttpOnly'));assert(responseCookie.includes('Secure'));assert(responseCookie.includes('SameSite=Lax'));
 return {cookie:responseCookie.split(';')[0]};
}
const guest=await newGuest(), stranger=await newGuest();
const submission={id:'guest-topic',title:'游客独有待审标题',body:'审核前不能出现在搜索和公开页面',category:'经验分享',authorName:'游客小李',chapterId:'chatgpt',author_id:'owner-id',author_kind:'member',moderation_status:'approved',pinned:1,admin:true};
await call('topics','POST',submission,guest,403,'https://evil.test');
await call('topics','POST',submission,{cookie:guest.cookie.slice(0,-1)+(guest.cookie.endsWith('0')?'1':'0')},401);
await call('topics/extra','POST',submission,guest,401);
assert.equal((await call('topics','POST',submission,guest,201)).pending,true);
assert.equal((await call('topics','POST',submission,guest)).pending,true);
await call('topics','POST',submission,stranger,409);
const stored=sqlite.prepare("SELECT * FROM topics WHERE id='guest-topic'").get()!;
assert.equal(stored.author_kind,'guest');assert.equal(stored.moderation_status,'pending');assert.equal(stored.pinned,0);assert.notEqual(stored.author_id,'owner-id');
await call('topics/guest-topic','GET',null,guest,404);
await call('topics/guest-topic','GET',null,reader,404);
assert.equal((await call('topics?q='+encodeURIComponent(submission.title))).total,0);
assert.equal((await call('topics?chapter=chatgpt')).total,0);
assert.equal((await call('admin/topics','GET',null,owner)).total,0);
await call('admin/review','GET',null,guest,401);
await call('admin/review','GET',null,reader,403);
assert.equal((await call('admin/review','GET',null,owner)).total,1);
await call('admin/review/topic/guest-topic','PUT',{action:'approve',version:1},reader,403);
await call('topics/guest-topic','PUT',{...submission,version:1},guest,401);
await call('topics/guest-topic','DELETE',null,guest,401);
await call('replies','POST',{id:'reply-on-pending',topicId:'guest-topic',body:'不应出现',authorName:'读者'},reader,404);
await call('admin/review/topic/guest-topic','PUT',{action:'approve',version:2},owner,409);
await call('admin/topics/guest-topic','PUT',{moderate:true,pinned:0,locked:0,hidden:0,version:1},owner);
await call('topics/guest-topic','GET',null,guest,404); // Unhiding cannot approve a pending topic.
await call('admin/review/topic/guest-topic','PUT',{action:'approve',version:1},owner,409);
await call('admin/review/topic/guest-topic','PUT',{action:'approve',version:2},owner);
await call('admin/review/topic/guest-topic','PUT',{action:'approve',version:2},owner); // Approval retry is safe.
assert.equal((await call('topics?q='+encodeURIComponent(submission.title))).total,1);
const publicTopic=(await call('topics/guest-topic')).item;
assert.equal(publicTopic.can_edit,false);assert.equal(publicTopic.author_kind,'guest');assert.equal(publicTopic.author_id,undefined);
assert.equal((await call('admin/review','GET',null,owner)).total,0);
await call('admin/review/topic/guest-topic?version=3','DELETE',null,owner,409); // Stale rejection cannot delete published content.
const replyInput={id:'guest-reply',topicId:'guest-topic',body:'游客待审回复',authorName:'游客小李',moderation_status:'approved'};
assert.equal((await call('replies','POST',replyInput,guest,201)).pending,true);
assert.equal((await call('replies','POST',replyInput,guest)).pending,true);
await call('replies','POST',replyInput,stranger,409);
let visible=await call('topics/guest-topic');assert.equal(visible.total,0);assert.equal(visible.replies.length,0);assert.equal(visible.item.updated_at,publicTopic.updated_at);
assert.equal((await call('topics')).items[0].reply_count,0);
await call('replies/guest-reply','PUT',{body:'未经审核修改',version:1},guest,401);
await call('replies/guest-reply','PUT',{body:'越权',version:1},reader,403);
let queue=await call('admin/review','GET',null,owner);assert.equal(queue.items[0].kind,'reply');assert.equal(queue.items[0].topic_id,'guest-topic');assert.equal(queue.items[0].author_id,undefined);
await call('admin/topics/guest-topic','PUT',{moderate:true,pinned:0,locked:0,hidden:1,version:3},owner);
await call('admin/review/reply/guest-reply','PUT',{action:'approve',version:1},owner,409);
await call('admin/topics/guest-topic','PUT',{moderate:true,pinned:0,locked:0,hidden:0,version:4},owner);
await call('admin/review/reply/guest-reply','PUT',{action:'approve',version:1},owner);
visible=await call('topics/guest-topic');assert.equal(visible.total,1);assert.equal(visible.replies[0].author_kind,'guest');assert.equal(visible.replies[0].can_edit,false);
assert.equal((await call('topics')).items[0].reply_count,1);
assert.equal((await call('topics/guest-topic','GET',null,owner)).replies[0].can_edit,true);
await call('replies','POST',{...replyInput,id:'rejected-reply'},guest,201);
await call('admin/review/reply/rejected-reply?version=2','DELETE',null,owner,409);
await call('admin/review/reply/rejected-reply?version=1','DELETE',null,owner);
assert.equal((await call('topics/guest-topic')).total,1);
await call('topics','POST',{...submission,id:'rejected-topic'},guest,201);
await call('admin/review/topic/rejected-topic?version=1','DELETE',null,owner);
await call('topics/rejected-topic','GET',null,owner,404);
const limited=await newGuest();
for(let i=0;i<5;i++)await call('replies','POST',{...replyInput,id:'limited-'+i},limited,201);
await call('replies','POST',{...replyInput,id:'limited-6'},limited,429);
assert.equal((await call('admin/review','GET',null,owner)).total,5);
const extra=await newGuest();
sqlite.prepare("UPDATE guest_limits SET count=60 WHERE key LIKE 'site:%'").run();
await call('topics','POST',{...submission,id:'global-limited'},extra,429);
assert.equal((await call('topics')).total,1);
assert.equal((await call('topics','POST',{...submission,id:'member-still-publishes'},reader,201)).pending,false);
assert.equal((await call('topics')).total,2);
await call('admin/topics/guest-topic','DELETE',null,owner);
assert.equal((await call('admin/review','GET',null,owner)).total,0);
const finalBackup=await call('admin/export','GET',null,owner);
assert(!JSON.stringify(finalBackup).includes('guest_signing_key'));
assert.equal(finalBackup.contentBackups.length,14);assert.equal(finalBackup.contentBackups.find((b:any)=>b.key===FIRST_CHAPTER_BACKUP).chapter.title,'入门必看');
assert.equal(finalBackup.contentBackups.find((b:any)=>b.key===SECOND_CHAPTER_BACKUP).chapter.title,'GPT 使用指南');
assert.equal(finalBackup.contentBackups.find((b:any)=>b.key===THIRD_CHAPTER_BACKUP).chapter.title,'Codex 使用指南');
// Fourth chapter: actual owner save/publish preserves modular edits and release guards.
let editedFourth=(await call('admin/chapters','GET',null,owner)).items.find((c:any)=>c.id==='desktop');
const fourthDraft=renderBlocks(fourthChapterBlocks.map(b=>b.id==='env-tools-shot'?{...b,src:'/api/media/owner-environment-screen',caption:'我的环境截图'}:b));
editedFourth=(await call('admin/chapters/desktop','PUT',{...editedFourth,body:fourthDraft,action:'save'},owner)).item;
await call('chapters');
assert.equal(editedFourth.published_body,cleanHtml(screenshotReleases[3].next.body));
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='desktop'").get()!.body,cleanHtml(fourthDraft));
editedFourth=(await call('admin/chapters/desktop','PUT',{...editedFourth,action:'publish'},owner)).item;
assert.equal(editedFourth.body,editedFourth.published_body);
await applyFourthChapterRevision(database());
assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='desktop'").get()!.version,editedFourth.version);
sqlite.prepare('DELETE FROM settings WHERE key=?').run(FOURTH_CHAPTER_REVISION);
sqlite.prepare("UPDATE chapters SET version=1 WHERE id='desktop'").run();
await applyFourthChapterRevision(database());
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='desktop'").get()!.body,cleanHtml(fourthDraft));
// This content release must preserve module edits and draft/published separation.
let editedThird=(await call('admin/chapters','GET',null,owner)).items.find((c:any)=>c.id==='codex');
const thirdDraft=renderBlocks(thirdChapterBlocks.map(b=>b.id==='cod-interface-shot'?{...b,src:'/api/media/owner-codex-screen',caption:'所有者补充的桌面截图'}:b));
editedThird=(await call('admin/chapters/codex','PUT',{...editedThird,body:thirdDraft,action:'save'},owner)).item;
await call('chapters');
assert.equal(editedThird.published_body,cleanHtml(screenshotReleases[2].next.body));
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='codex'").get()!.body,cleanHtml(thirdDraft));
editedThird=(await call('admin/chapters/codex','PUT',{...editedThird,action:'publish'},owner)).item;
assert.equal(editedThird.published_body,editedThird.body);
await applyThirdChapterRevision(database());
assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='codex'").get()!.version,editedThird.version);
sqlite.prepare('DELETE FROM settings WHERE key=?').run(THIRD_CHAPTER_REVISION);
sqlite.prepare("UPDATE chapters SET version=1 WHERE id='codex'").run();
await applyThirdChapterRevision(database());
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='codex'").get()!.body,cleanHtml(thirdDraft));
sqlite.prepare('DELETE FROM settings WHERE key=?').run(THIRD_SUPPLEMENT_REVISION);
sqlite.prepare("UPDATE chapters SET version=2 WHERE id='codex'").run();
await applyThirdChapterRevision(database());
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='codex'").get()!.body,cleanHtml(thirdDraft));
// The new chapter must support owner editing without a later read resetting it.
let editedSecond=(await call('admin/chapters','GET',null,owner)).items.find((c:any)=>c.id==='chatgpt');
const secondDraft=renderBlocks(secondChapterBlocks.map(b=>b.id==='gpt-interface-shot'?{...b,src:'/api/media/owner-screen',caption:'所有者补充的界面图'}:b));
editedSecond=(await call('admin/chapters/chatgpt','PUT',{...editedSecond,body:secondDraft,action:'save'},owner)).item;
await call('chapters');
assert.equal(editedSecond.published_body,cleanHtml(screenshotReleases[1].next.body));
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='chatgpt'").get()!.body,cleanHtml(secondDraft));
editedSecond=(await call('admin/chapters/chatgpt','PUT',{...editedSecond,action:'publish'},owner)).item;
assert.equal(editedSecond.published_body,editedSecond.body);
await applySecondChapterRevision(database());
assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='chatgpt'").get()!.version,editedSecond.version);
// An unexpected owner draft must remain intact even without the release marker.
sqlite.prepare('DELETE FROM settings WHERE key=?').run(SECOND_CHAPTER_REVISION);
sqlite.prepare("UPDATE chapters SET version=1 WHERE id='chatgpt'").run();
await applySecondChapterRevision(database());
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='chatgpt'").get()!.body,cleanHtml(secondDraft));
// Owner edits after the content release remain authoritative across later reads.
let editedFirst=(await call('admin/chapters','GET',null,owner)).items.find((c:any)=>c.id==='getting-started');
editedFirst=(await call('admin/chapters/getting-started','PUT',{...editedFirst,body:'<p>所有者后续修改</p>',action:'save'},owner)).item;
await call('chapters');
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='getting-started'").get()!.body,'<p>所有者后续修改</p>');
assert.equal(editedFirst.published_body,cleanHtml(screenshotReleases[0].next.body));
// Even without the marker, an unexpected draft/version must not be overwritten.
sqlite.prepare('DELETE FROM settings WHERE key IN (?,?)').run(FIRST_CHAPTER_REVISION,ONBOARDING_REVISION);
await applyFirstChapterRevision(database());
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='getting-started'").get()!.body,'<p>所有者后续修改</p>');
sqlite.prepare("UPDATE chapters SET version=1 WHERE id='getting-started'").run();
await applyFirstChapterRevision(database());
assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='getting-started'").get()!.body,'<p>所有者后续修改</p>');
// Upgrade the exact already-deployed v2 chapter, without requiring the v1 release
// to run again. This is the current production path for this content correction.
sqlite.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run(FIRST_CHAPTER_REVISION,'already-applied');
const priorHtml=cleanHtml(previousFirstChapter.body);
sqlite.prepare("UPDATE chapters SET title=?,description=?,body=?,published_title=?,published_description=?,published_body=?,version=2 WHERE id='getting-started'").run(previousFirstChapter.title,previousFirstChapter.description,priorHtml,previousFirstChapter.title,previousFirstChapter.description,priorHtml);
await checkPendingReleaseRead(call,owner);
await applyFirstChapterRevision(database());
const upgraded=sqlite.prepare("SELECT * FROM chapters WHERE id='getting-started'").get()!;
assert.equal(upgraded.version,3);assert.equal(upgraded.body,cleanHtml(firstChapter.body));assert.equal(upgraded.published_body,upgraded.body);
await applyFirstChapterRevision(database());
assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='getting-started'").get()!.version,3);
// A real owner can replace/remove/reorder chapter-five screenshots and publish
// using the same modules. Later initialization must not reset that work.
let editedFifth=(await call('admin/chapters','GET',null,owner)).items.find((c:any)=>c.id==='practice');
const fifthDraft=renderBlocks(fifthChapterBlocks.filter(b=>b.id!=='practice-shot-50').map(b=>b.id==='practice-shot-45'?{...b,src:'/api/media/owner-skill-screen',caption:'我的技能截图'}:b));
editedFifth=(await call('admin/chapters/practice','PUT',{...editedFifth,body:fifthDraft,action:'save'},owner)).item;
assert.equal(editedFifth.published_body,cleanHtml(fifthChapter.body));
await call('chapters');assert.equal(sqlite.prepare("SELECT body FROM chapters WHERE id='practice'").get()!.body,cleanHtml(fifthDraft));
editedFifth=(await call('admin/chapters/practice','PUT',{...editedFifth,action:'publish'},owner)).item;
assert.equal(editedFifth.published_body,cleanHtml(fifthDraft));
await applyFifthChapterRevision(database());assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='practice'").get()!.version,editedFifth.version);

// Isolate the pre-upgrade state to exercise all-or-nothing migration guards.
const releaseIds=['practice','models','appendix','boundaries'];
function resetFifthRelease(){
 sqlite.prepare('DELETE FROM settings WHERE key=?').run(FIFTH_CHAPTER_REVISION);
 for(const id of releaseIds){
  const c=seed.chapters.find(c=>c.id===id)!;
  sqlite.prepare('DELETE FROM settings WHERE key=?').run(fifthChapterBackupKey(id));
  sqlite.prepare('UPDATE chapters SET title=?,description=?,body=?,position=?,published_title=?,published_description=?,published_body=?,published_position=?,version=1,deleted_at=NULL WHERE id=?').run(c.title,c.description,c.body,c.position,c.title,c.description,c.body,c.position,id);
 }
}
resetFifthRelease();
sqlite.prepare("UPDATE chapters SET body='<p>所有者未发布的附录修改</p>' WHERE id='appendix'").run();
await applyFifthChapterRevision(database());
assert.equal(sqlite.prepare("SELECT position FROM chapters WHERE id='practice'").get()!.position,6);
assert.equal(sqlite.prepare("SELECT deleted_at FROM chapters WHERE id='boundaries'").get()!.deleted_at,null);
assert.equal(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(FIFTH_CHAPTER_REVISION),undefined);
// A concurrent owner edit between the read and the batch must veto all writes.
resetFifthRelease();const db=database();
const racingDb={prepare:db.prepare.bind(db),batch:async(stmts:any[])=>{
 sqlite.prepare("UPDATE chapters SET position=12 WHERE id='models'").run();
 return db.batch(stmts);
}} as unknown as D1Database;
await applyFifthChapterRevision(racingDb);
assert.equal(sqlite.prepare("SELECT position FROM chapters WHERE id='models'").get()!.position,12);
assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='practice'").get()!.version,1);
assert.equal(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(FIFTH_CHAPTER_REVISION),undefined);
// One failed update rolls the marker, backups and all chapter changes back.
resetFifthRelease();sqlite.exec("CREATE TRIGGER fail_appendix_release BEFORE UPDATE ON chapters WHEN NEW.id='appendix' BEGIN SELECT RAISE(ABORT,'test release failure'); END");
await assert.rejects(()=>applyFifthChapterRevision(db),/test release failure/);
sqlite.exec('DROP TRIGGER fail_appendix_release');
assert.equal(sqlite.prepare("SELECT version FROM chapters WHERE id='practice'").get()!.version,1);
assert.equal(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(FIFTH_CHAPTER_REVISION),undefined);
assert.equal(sqlite.prepare('SELECT value FROM settings WHERE key=?').get(fifthChapterBackupKey('practice')),undefined);
// Two initializers must apply the transaction only once, preserving discussion.
await call('topics','POST',{id:'practice-move-topic',title:'Skill 问题',body:'检查章节移动后的讨论',authorName:'读者',category:'使用求助',chapterId:'practice'},reader,201);
resetFifthRelease();
// D1 serializes transactions; the in-memory single-connection adapter needs
// the same queue while allowing both initializers to read before either batch.
let batches=Promise.resolve();
const concurrentDb={prepare:db.prepare.bind(db),batch:(stmts:any[])=>{
 const result=batches.then(()=>db.batch(stmts));batches=result.then(()=>{});return result;
}} as unknown as D1Database;
await Promise.all([applyFifthChapterRevision(concurrentDb),applyFifthChapterRevision(concurrentDb)]);
for(const id of releaseIds)assert.equal(sqlite.prepare('SELECT version FROM chapters WHERE id=?').get(id)!.version,2);
assert.equal((await call('topics?chapter=practice')).items.find((t:any)=>t.id==='practice-move-topic').chapter_id,'practice');
console.log('PASS: '+checks+' API checks; owner/member/guest permissions, pending visibility, moderation, signed cookies, rate limits, atomic content migration, chapters/media, legacy-image projection, preview isolation and write guards.');
