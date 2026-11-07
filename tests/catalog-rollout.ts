import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CatalogView,LearningRoute} from '../app/catalog';
import type {PublicCatalog,PublicCategory} from '../lib/public-taxonomy';
import type {Material} from '../lib/taxonomy-types';

// Pure public-projection fixtures: no administrator state or runtime identity.
const category=(id:string,order:number,material?:Material):PublicCategory=>({id,name:'名称 '+id,icon:'cube',description:'说明 '+id,order,count:1,...(material?{material}:{})});
const catalog:PublicCatalog={ready:true,
  tasks:Array.from({length:9},(_,i)=>category('task-'+i,i)),
  tools:Array.from({length:8},(_,i)=>category('tool-'+i,i)),
  levels:Array.from({length:3},(_,i)=>category('difficulty-'+i,i)),
  chapters:[{id:'chapter-one',title:'公开章节',description:'公开说明',ordinal:1,tags:{tasks:['task-0'],tools:['tool-0'],level:'difficulty-0'}}],
};
const render=(value:PublicCatalog=catalog,query:Record<string,string>={},topics:any[]=[])=>renderToStaticMarkup(createElement(CatalogView,{catalog:value,query,topics}));
const page=render();
assert(page.includes('欢迎来到')&&page.includes('AI 妙妙屋'));
assert(page.includes('妙妙屋的房间')&&page.includes('工具专区')&&page.includes('论坛广场')&&page.includes('更新日志'));
assert(page.includes('id="all-chapters"')&&page.includes('id="rooms"')&&page.includes('id="tools"'));
// All categories remain available when there are more than the initial design's 7/6.
for(const task of catalog.tasks) assert(page.includes('href="/learn/'+task.id+'"'));
for(const tool of catalog.tools) assert(page.includes('href="/tools/'+tool.id+'"'));
assert.equal((page.match(/class="catalog-room-card"/g)||[]).length,9);
assert.equal((page.match(/class="catalog-tool-card"/g)||[]).length,8);
assert(!page.includes('示例话题')&&!page.includes('/assets/screenshots/'));
assert(page.includes('这里还没有讨论'));
for(const label of ['使用求助','经验分享','内容纠错','功能建议'])
  assert(page.includes('href="/community?category='+encodeURIComponent(label)+'"'));
assert(render(catalog,{},[{id:'topic-test',title:'真实公开讨论',category:'使用求助'}]).includes('href="/topics/topic-test">真实公开讨论</a>'));
const failure=renderToStaticMarkup(createElement(CatalogView,{catalog,query:{},topics:null}));
assert(failure.includes('暂时无法读取讨论。')&&!failure.includes('这里还没有讨论'));

// Rename and reorder come from the input projection, never a visual hard-coded list.
const renamed=structuredClone(catalog);renamed.tasks.reverse();renamed.tasks[0].name='后来新增的 Blender 房间';
const renamedPage=render(renamed);
assert(renamedPage.includes('后来新增的 Blender 房间'));
assert(renamedPage.indexOf('href="/learn/task-8"')<renamedPage.indexOf('href="/learn/task-0"'));

// Dynamic route cardinality: zero levels has only the scene navigation; one,
// three and more levels preserve source order around that scene step.
for(const count of [0,1,3,5]) {
  const value={...catalog,levels:Array.from({length:count},(_,i)=>category('custom-'+i,i))};
  const route=renderToStaticMarkup(createElement(LearningRoute,{catalog:value}));
  assert.equal((route.match(/<li>/g)||[]).length,count+1);
  assert.equal((route.match(/href="#rooms"/g)||[]).length,1);
  for(const level of value.levels) assert(route.includes('/?level='+level.id+'#all-chapters'));
  if(count>0) assert(route.indexOf('custom-0')<route.indexOf('href="#rooms"'));
  if(count>1) assert(route.indexOf('href="#rooms"')<route.indexOf('custom-1'));
  assert(!route.includes('基础教程')&&!route.includes('高级技巧'));
}

// Scope links preserve the other filter dimensions; a change of room/tool
// intentionally drops only the category dimension owned by that link.
const filtered=render(catalog,{task:'task-0',tool:'tool-0',level:'difficulty-0'});
assert(filtered.includes('href="/learn/task-1?tool=tool-0&amp;level=difficulty-0"'));
assert(filtered.includes('href="/tools/tool-1?task=task-0&amp;level=difficulty-0"'));
assert(filtered.includes('name="task" value="task-0"'));
const invalid=render(catalog,{tool:'unknown'});
assert(invalid.includes('这个筛选条件无效'));
assert(!invalid.includes('class="chapter-card"'));
const scope=renderToStaticMarkup(createElement(CatalogView,{catalog,query:{},scope:{group:'tasks',id:'task-0'},category:catalog.tasks[0],topics:null}));
assert(scope.includes('aria-label="面包屑"')&&scope.includes('本分类教程')&&scope.includes('公开章节'));
const emptyCategory={...catalog.tasks[1],count:0};
const soon=renderToStaticMarkup(createElement(CatalogView,{catalog:{...catalog,tasks:[emptyCategory]},query:{},scope:{group:'tasks',id:emptyCategory.id},category:emptyCategory,topics:null}));
assert(soon.includes('即将上线')&&!soon.includes('class="chapter-card"'));

// Invalid or not-yet-initialized taxonomy retains the original usable directory,
// without fabricating difficulty cards, category counts or a new initialization.
const original=render({...catalog,ready:false,tasks:[],tools:[],levels:[]});
assert(original.includes('学习目录')&&original.includes('1 个章节 · 持续更新'));
assert(original.includes('href="/chapters/chapter-one.html">开始阅读</a>'));
assert(!original.includes('筛选教程')&&!original.includes('你想做什么？'));
assert(!original.includes('class="catalog-room-card"'));
assert(original.includes('id="tools"'),'the global tools navigation has a destination before initialization');

// React escapes author-controlled metadata; no raw HTML enters cards.
const escaped=structuredClone(catalog);escaped.tasks[0].name='<script>alert(1)</script>';
escaped.tasks[0].description='<img src=x onerror=alert(1)>';
const safe=render(escaped);
assert(!safe.includes('<script>')&&!safe.includes('<img src="x"'));
assert(safe.includes('&lt;script&gt;')&&safe.includes('&lt;img'));
console.log('PASS: catalog rollout SSR; dynamic tasks/tools/difficulties, preserved filters, empty/error states, uninitialized directory and escaped metadata.');
