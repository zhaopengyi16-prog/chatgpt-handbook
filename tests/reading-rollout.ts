import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import Chapter from '../app/chapters/[slug]/page';
import Contribute from '../app/contribute/page';
import Updates from '../app/updates/page';
import {ensureSeed} from '../lib/data';
import {setHeaders,sqlite} from './runtime-mock';

// Browser layout/keyboard checks supplement these SSR behavior assertions.
// This test uses its own in-memory DB, never the Site's live bindings.
setHeaders(new Headers({host:'handbook.test'}));
await ensureSeed();
const snapshot=()=>JSON.stringify(['chapters','settings','media'].map(table=>
  sqlite.prepare(`SELECT * FROM ${table} ORDER BY ${table==='settings'?'key':'id'}`).all()));
const original=snapshot();
let renders=0;
for(const id of ['getting-started','chatgpt','codex','desktop','practice','models','appendix']) {
  const html=renderToStaticMarkup(await Chapter({params:Promise.resolve({slug:id+'.html'}),searchParams:Promise.resolve({})}));
  assert(html.includes('id="main"') && html.includes('class="handbook-body"'));
  const directory=html.match(/<details class="reader-mobile-directory">([\s\S]*?)<\/details>/)?.[1];
  assert(directory,`${id}: a native collapsed directory is present`);
  assert(directory.includes('<summary>目录') && !directory.includes(' open=""'));
  assert(directory.includes('aria-label="本章小节"') && directory.includes('aria-label="全部章节"'));
  for(const chapter of ['getting-started','chatgpt','codex','desktop','practice','models','appendix'])
    assert(directory.includes(`/chapters/${chapter}.html`),`${id}: full chapter navigation`);
  assert(directory.includes(`aria-current="page"`));
  // Actual h2 anchors come from the public projection, not a second copy of the body.
  const body=html.match(/<div class="handbook-body">([\s\S]*?)<\/div><section class="discussion"/)?.[1];
  assert(body,`${id}: existing reader projection is rendered`);
  for(const heading of body.matchAll(/<h2[^>]*id="([^"]+)"/g))
    assert(directory.includes(`href="#${heading[1]}"`),`${id}: heading ${heading[1]} is accessible in mobile directory`);
  assert(!html.includes('/assets/screenshots/'));
  assert(!html.includes('hb-shot-placeholder'));
  assert(html.includes('class="reader-sidebar"') && html.includes('class="reader-outline"'));
  assert(html.includes('aria-label="章节翻页"'));
  assert.equal(snapshot(),original,'reading and new navigation never mutate chapters, settings or media');
  renders++;
}
const contribute=renderToStaticMarkup(Contribute());
assert(contribute.includes('许可与署名') && contribute.includes('/assets/LICENSE.txt'));
for(const oldDownload of ['handbook-images.zip','handbook-html-core.zip','handbook-source-core.zip','离线阅读','下载原稿截图'])
  assert(!contribute.includes(oldDownload));
assert(renderToStaticMarkup(Updates()).includes('更新记录'));
console.log(`Reading rollout checks passed (${renders} public chapters; native combined directory, unchanged reader data, no legacy images or downloads).`);
