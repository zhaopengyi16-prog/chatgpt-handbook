// A separate database proves this read-only preview cannot seed or change handbook data.
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import StylePreview from '../app/admin/style-preview/page';
import {env,setHeaders,sqlite} from './runtime-mock';

const owner={'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@handbook.test'};
const member={'oai-authenticated-user-id':'reader-id','oai-authenticated-user-email':'reader@example.test'};
const spoofedOwnerEmail={'oai-authenticated-user-id':'another-id','oai-authenticated-user-email':'owner@handbook.test'};
const time='2026-11-07T01:02:03.000Z';
const privateDraft='<p>PRIVATE_DRAFT_SENTINEL</p><figure><img src="/assets/screenshots/old.png"></figure>';

// The owner has already been configured, matching an existing Sites installation.
// Deliberately leave seed_v1 and taxonomy_v1 absent: rendering must not initialize either.
sqlite.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run('owner_user_id','owner-id');
sqlite.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run('author_preference','{"keep":"unchanged"}');
const insertChapter=sqlite.prepare(`INSERT INTO chapters
  (id,title,description,body,position,published_title,published_description,published_body,published_position,version,updated_at,published_at,deleted_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
insertChapter.run('published-fixture','正在编辑的标题','草稿摘要',privateDraft,3,'公开标题','公开摘要','<p>PUBLIC_BODY_SENTINEL</p>',1,17,time,'2026-10-01T00:00:00.000Z',null);
insertChapter.run('draft-fixture','未发布标题','未发布摘要',privateDraft,4,null,null,null,null,9,time,null,null);
insertChapter.run('deleted-fixture','已删除标题','已删除摘要',privateDraft,5,'旧公开标题','旧公开摘要','<p>DELETED_BODY_SENTINEL</p>',5,4,time,time,time);
const insertMedia=sqlite.prepare('INSERT INTO media (id,name,url,caption,object_key,mime,created_at) VALUES (?,?,?,?,?,?,?)');
insertMedia.run('legacy-image','历史截图','/assets/screenshots/old.png','保持原记录',null,'image/png',time);
insertMedia.run('uploaded-image','后台上传','/api/media/uploaded-image','保留 R2 引用','uploads/example.png','image/png',time);

const snapshot=()=>({
  chapters:sqlite.prepare('SELECT * FROM chapters ORDER BY id').all(),
  media:sqlite.prepare('SELECT * FROM media ORDER BY id').all(),
  settings:sqlite.prepare('SELECT * FROM settings ORDER BY key').all(),
  topics:sqlite.prepare('SELECT * FROM topics ORDER BY id').all(),
  replies:sqlite.prepare('SELECT * FROM replies ORDER BY id').all(),
  guestLimits:sqlite.prepare('SELECT * FROM guest_limits ORDER BY key').all(),
});
function browserAs(who:HeadersInit={}) { const h=new Headers(who);h.set('host','handbook.test');setHeaders(h); }
const page=(query:{theme?:string|string[]}={})=>StylePreview({searchParams:Promise.resolve(query)});
let renders=0;
async function renderUnchanged(who:HeadersInit,query:{theme?:string|string[]}={}) {
  browserAs(who);
  const before=snapshot();
  try {
    const html=renderToStaticMarkup(await page(query));
    renders++;
    assert(!html.includes('PRIVATE_DRAFT_SENTINEL')&&!html.includes('PUBLIC_BODY_SENTINEL')&&!html.includes('DELETED_BODY_SENTINEL'), 'preview must use its own fixture, never live chapter contents');
    assert(!html.includes('/assets/screenshots/'), 'preview must not expose legacy image URLs');
    return html;
  } finally {
    assert.deepEqual(snapshot(),before,'preview must preserve every chapter field, media record and setting, and must not seed data');
  }
}
function hasDemo(html:string,theme:'original'|'pixel') {
  assert(html.includes(`data-theme="${theme}"`),'authorized reader sees the requested fixture theme');
  assert(html.includes('<table')&&html.includes('<pre')&&html.includes('<form'),'demo includes article and form components');
  assert(html.includes('id="main"'),'skip-to-content destination remains available');
}

// Authentication happens on the server before any sample content is returned.
await assert.rejects(()=>renderUnchanged({}),{message:'REDIRECT:/signin-with-chatgpt?return_to=%2Fadmin%2Fstyle-preview'});
for (const who of [member,spoofedOwnerEmail]) {
  const html=await renderUnchanged(who);
  assert(!html.includes('data-theme=')&&!html.includes('<table')&&!html.includes('<form'),'non-owner must not receive preview components');
  assert(html.includes('样式预览仅限站点所有者'));
}

// Both missing taxonomy and corrupt taxonomy still allow a self-contained admin preview.
// Check two malformed states, preserving the exact values rather than repairing them.
for(const taxonomy of [undefined,'not valid JSON','{"schema":99,"revision":1}']) {
  if(taxonomy!==undefined) sqlite.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('taxonomy_v1',taxonomy);
  for (const theme of ['original','pixel'] as const) hasDemo(await renderUnchanged(owner,{theme}),theme);
}
for(const query of [{},{theme:'unknown'},{theme:['original','pixel']}]) hasDemo(await renderUnchanged(owner,query),'pixel');

// A failed authorization lookup must fail closed, never render the sample.
const prepare=env.DB.prepare;
env.DB.prepare=()=>{throw new Error('simulated identity lookup failure');};
try {
  const html=await renderUnchanged(owner);
  assert(html.includes('暂时无法读取内容'));
  assert(!html.includes('data-theme=')&&!html.includes('<table')&&!html.includes('<form'));
} finally { env.DB.prepare=prepare; }

assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='seed_v1'").get(),undefined,'preview cannot initialize the handbook');
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM chapters WHERE id LIKE 'v2-starter-%'").get()!.count,0,'preview cannot initialize starter drafts');
console.log(`Style preview checks passed (${renders} rendered responses; guest/member/admin access, theme selection, taxonomy isolation, fail-closed errors and unchanged data).`);
