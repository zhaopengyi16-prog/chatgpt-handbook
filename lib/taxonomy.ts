import { FIFTH_CHAPTER_REVISION } from './chapter-five-release';
import { EXISTING_CHAPTERS, initialTaxonomy, starters } from './taxonomy-seed';
import { GROUPS, TAXONOMY_ICONS, TAXONOMY_KEY, TAXONOMY_MATERIALS } from './taxonomy-types';
import type { Category, ChapterTags, Group, Material, TaxonomyDocument, TaxonomyView } from './taxonomy-types';

export class TaxonomyError extends Error {
  constructor(public readonly status:number, message:string) { super(message); }
}
function fail(status:number, message:string):never { throw new TaxonomyError(status,message); }
function object(value:unknown):Record<string,unknown> {
  if (!value || typeof value!=='object' || Array.isArray(value)) fail(400,'应提交一个对象。');
  return value as Record<string,unknown>;
}
function only(obj:Record<string,unknown>, fields:readonly string[]) {
  if(Object.keys(obj).some(key=>!fields.includes(key))) fail(400,'包含不允许的字段。');
}
function uint(value:unknown):value is number { return typeof value==='number' && Number.isSafeInteger(value) && value>=0; }
function groupOf(value:unknown):Group {
  if(!GROUPS.some(g=>g===value)) fail(400,'分类维度无效。');
  return value as Group;
}
function safeKey(key:string) { return key!=='prototype' && !Object.hasOwn(Object.prototype,key); }
function categoryId(id:unknown):string {
  if(typeof id!=='string' || !/^[a-z][a-z0-9-]{0,47}$/.test(id) || !safeKey(id)) fail(400,'分类 ID 格式无效或为保留字。');
  return id;
}
function label(v:unknown, min:number, max:number):string {
  if(typeof v!=='string') fail(400,'名称和说明须为纯文本。');
  const s=v.trim(), length=Array.from(s).length;
  if(length<min || length>max) fail(400,'名称须为 1–40 字，说明不得超过 200 字。');
  return s;
}
function category(value:unknown):Category {
  const o=object(value);
  only(o,['id','name','description','order','icon','material']);
  if(!uint(o.order)) fail(400,'顺序必须是非负整数。');
  if(typeof o.icon!=='string' || !Object.hasOwn(TAXONOMY_ICONS,o.icon)) fail(400,'请选择内置图标。');
  const hasMaterial=Object.hasOwn(o,'material');
  if(hasMaterial && !TAXONOMY_MATERIALS.some(material=>material===o.material)) fail(400,'请选择内置材质。');
  // Retain an existing material during legacy edits; never add a default on read.
  return {id:categoryId(o.id),name:label(o.name,1,40),icon:o.icon,description:label(o.description,0,200),order:o.order,
    ...(hasMaterial?{material:o.material as Material}:{})};
}
export function normalizeTags(value:unknown, doc:TaxonomyDocument):ChapterTags {
  const o=object(value);
  only(o,['tasks','tools','level']);
  function ids(group:'tasks'|'tools') {
    const list=o[group], allowed=new Set(doc[group].map(c=>c.id));
    if(!Array.isArray(list) || list.some(id=>typeof id!=='string' || !allowed.has(id))) fail(400,'含未知或维度错误的标签。');
    return [...new Set<string>(list)];
  }
  if(o.level!==null && (typeof o.level!=='string'||!doc.levels.some(c=>c.id===o.level))) fail(400,'难度须为现有的单个难度或空值。');
  return {tasks:ids('tasks'), tools:ids('tools'),level:o.level};
}
const MAX_BYTES=128*1024;
function checkSize(raw:string) {
  if(new TextEncoder().encode(raw).byteLength>MAX_BYTES) fail(413,'分类数据超过 128 KiB；请联系维护者分键保存。');
}
function validateDoc(value:unknown):TaxonomyDocument {
  const o=object(value);
  only(o,['schema','revision','emptyPolicy',...GROUPS,'chapterTags','publishedChapterTags','retiredIds','writeToken']);
  if(o.schema!==1 || !uint(o.revision) || o.revision<1) fail(400,'分类版本未知或损坏。');
  if(o.emptyPolicy!=='hide' && o.emptyPolicy!=='comingSoon') fail(400,'空分类策略无效。');
  if(o.writeToken!==undefined && (typeof o.writeToken!=='string'||!o.writeToken.length||o.writeToken.length>100)) fail(400,'写入标记无效。');
  const retired=o.retiredIds===undefined?{}:object(o.retiredIds);
  only(retired,GROUPS);
  for(const g of GROUPS) {
    const items=o[g];
    if(!Array.isArray(items) || items.length>64) fail(400,'每个维度最多 64 个分类。');
    const ids=new Set<string>(), names=new Set<string>();
    for(const [index,item] of items.entries()) {
      const c=category(item);
      if(c.order!==index || c.name!==item.name || c.description!==item.description || ids.has(c.id) || names.has(c.name))
        fail(400,'分类顺序、名称或 ID 不一致。');
      ids.add(c.id); names.add(c.name);
    }
    if(retired[g]!==undefined) {
      const list=retired[g];
      if(!Array.isArray(list)) fail(400,'已退役 ID 列表无效。');
      for(const id of list) {
        categoryId(id);
        if(ids.has(id)) fail(400,'已退役 ID 与在用分类冲突或重复。');
        ids.add(id);
      }
    }
  }
  const doc=value as TaxonomyDocument;
  for(const map of [object(o.chapterTags),object(o.publishedChapterTags)]) {
    for(const [id,tags] of Object.entries(map)) {
      if(!/^[a-z0-9-]{1,80}$/.test(id)) fail(400,'章节 ID 无效。');
      const clean=normalizeTags(tags,doc), source=tags as ChapterTags;
      if(clean.tasks.length!==source.tasks.length || clean.tools.length!==source.tools.length) fail(400,'已存标签重复。');
    }
  }
  return doc;
}
export function serializeTaxonomy(doc:TaxonomyDocument):string {
  const raw=JSON.stringify(validateDoc(doc)); checkSize(raw); return raw;
}
export function nextTaxonomy(doc:TaxonomyDocument):TaxonomyDocument {
  return {...structuredClone(doc),revision:doc.revision+1,writeToken:crypto.randomUUID()};
}

type Ready={state:'ready';doc:TaxonomyDocument;raw:string};
type State=Ready|{state:'missing'|'invalid';message:string};
function parseRaw(raw:string|null):State {
  if(raw===null) return {state:'missing',message:'分类尚未初始化，可由管理员创建分类和七份草稿。'};
  try {
    checkSize(raw);
    return {state:'ready',doc:validateDoc(JSON.parse(raw)),raw};
  } catch(e) {
    if(!(e instanceof SyntaxError || e instanceof TaxonomyError)) throw e;
    const reason=e instanceof TaxonomyError?e.message:'不是有效的 JSON。';
    return {state:'invalid',message:'现有分类配置无法读取：'+reason+' 请检查备份；数据未被覆盖。'};
  }
}
const missingChapterState={state:'invalid',message:'分类配置引用了不存在的章节，请检查备份；数据未被覆盖。'} as const;
function mappedIds(doc:TaxonomyDocument) {
  return [...new Set([...Object.keys(doc.chapterTags),...Object.keys(doc.publishedChapterTags)])];
}
// For callers that read the chapter snapshot and settings together in a D1 batch.
export function decodeTaxonomy(raw:string|null, chapterIds:ReadonlySet<string>):State {
  const state=parseRaw(raw);
  return state.state==='ready' && mappedIds(state.doc).some(id=>!chapterIds.has(id)) ? missingChapterState : state;
}
export async function readTaxonomy(db:D1Database):Promise<State> {
  const row=await db.prepare('SELECT value FROM settings WHERE key=?').bind(TAXONOMY_KEY).first<{value:string}>();
  const state=parseRaw(row?.value??null);
  if(state.state!=='ready') return state;
  const ids=mappedIds(state.doc);
  // One bound JSON array keeps this below D1's parameter limit as the collection grows.
  const missing=ids.length && await db.prepare('SELECT j.value FROM json_each(?) j LEFT JOIN chapters c ON c.id=j.value WHERE c.id IS NULL LIMIT 1').bind(JSON.stringify(ids)).first();
  return missing ? missingChapterState : state;
}
function references(doc:TaxonomyDocument):NonNullable<TaxonomyView['references']> {
  const out:NonNullable<TaxonomyView['references']>={tasks:{},tools:{},levels:{}};
  for(const map of [doc.chapterTags,doc.publishedChapterTags]) for(const [chapter,tags] of Object.entries(map)) {
    const values={tasks:tags.tasks,tools:tags.tools,levels:tags.level?[tags.level]:[]};
    for(const group of GROUPS) for(const id of values[group]) {
      const hits=out[group][id]??=[]; if(!hits.includes(chapter)) hits.push(chapter);
    }
  }
  return out;
}
export function adminTaxonomy(state:State):TaxonomyView {
  if(state.state!=='ready') return {state:state.state,taxonomy:null,message:state.message};
  const {writeToken,...taxonomy}=state.doc;
  return {state:'ready',taxonomy,references:references(taxonomy)};
}
function placeholders(items:readonly unknown[]) { return items.map(()=>'?').join(','); }
// Build and compare the same deterministic summary inside the transaction. No original
// chapter is ever updated; publication/deletion changes must not seed stale snapshots.
const baselineSql=`SELECT json_group_array(json_array(id,version,pub,del)) FROM
  (SELECT id,version,(published_body IS NOT NULL) pub,(deleted_at IS NOT NULL) del
   FROM chapters WHERE id IN (${placeholders(EXISTING_CHAPTERS)}) ORDER BY id)`;
export async function initializeTaxonomy(db:D1Database):Promise<TaxonomyView> {
  const state=await readTaxonomy(db);
  if(state.state==='ready') return adminTaxonomy(state);
  if(state.state==='invalid') fail(409,state.message);
  const row=await db.prepare('SELECT ('+baselineSql+') AS signature').bind(...EXISTING_CHAPTERS).first<{signature:string}>();
  if(!row) fail(409,'无法读取已有章节，请重试。');
  const doc=initialTaxonomy(JSON.parse(row.signature)), raw=serializeTaxonomy(doc);
  const ids=starters.map(s=>s.id), stamp=new Date().toISOString();
  const claim=db.prepare(`INSERT INTO settings (key,value) SELECT ?,?
    WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key=?)
    AND EXISTS (SELECT 1 FROM settings WHERE key='seed_v1')
    AND EXISTS (SELECT 1 FROM settings WHERE key=?)
    AND NOT EXISTS (SELECT 1 FROM chapters WHERE id IN (${placeholders(ids)}))
    AND (${baselineSql})=?`).bind(TAXONOMY_KEY,raw,TAXONOMY_KEY,FIFTH_CHAPTER_REVISION,...ids,...EXISTING_CHAPTERS,row.signature);
  const insert=`INSERT INTO chapters(id,title,description,body,position,updated_at)
    SELECT ?,?,'',?,COALESCE((SELECT MAX(position) FROM chapters),0)+1,?
    WHERE EXISTS (SELECT 1 FROM settings WHERE key=? AND value=?)
    AND NOT EXISTS (SELECT 1 FROM chapters WHERE id=?)`;
  const result=await db.batch([claim,...starters.map(s=>db.prepare(insert).bind(s.id,s.title,s.body,stamp,TAXONOMY_KEY,raw,s.id))]);
  if(result[0].meta.changes) return adminTaxonomy({state:'ready',doc,raw});
  const winner=await readTaxonomy(db);
  if(winner.state==='ready') return adminTaxonomy(winner);
  if(winner.state==='invalid') fail(409,winner.message);
  const collisions=await db.prepare(`SELECT id FROM chapters WHERE id IN (${placeholders(ids)}) ORDER BY id`).bind(...ids).all<{id:string}>();
  if(collisions.results.length) fail(409,'草稿 ID 已被占用（含回收站）：'+collisions.results.map(r=>r.id).join('、'));
  const baseline=await db.prepare("SELECT COUNT(*) AS n FROM settings WHERE key IN ('seed_v1',?)").bind(FIFTH_CHAPTER_REVISION).first<{n:number}>();
  if(baseline?.n!==2) fail(409,'v14 七章基线尚未准备好，请确认已有章节重排完成；分类和草稿均未写入。');
  fail(409,'已有章节刚有变动，请重读后再初始化。');
}

export async function mutateTaxonomy(db:D1Database, method:'POST'|'PUT'|'DELETE', value:unknown):Promise<TaxonomyView> {
  const o=object(value), action=method==='DELETE'?'delete':o.action;
  if(method==='POST' && action==='initialize') { only(o,['action']); return initializeTaxonomy(db); }
  const fields=method==='DELETE'?['group','id','expectedRevision']:
    method==='POST' && action==='create'?['action','group','item','expectedRevision']:
    method==='PUT' && action==='edit'?['action','group','id','changes','expectedRevision']:
    method==='PUT' && action==='reorder'?['action','group','ids','expectedRevision']:
    method==='PUT' && action==='setEmptyPolicy'?['action','emptyPolicy','expectedRevision']:null;
  if(!fields) fail(400,'不支持的分类操作。');
  only(o,fields);
  if(!uint(o.expectedRevision)||o.expectedRevision<1) fail(400,'请提交有效的分类版本。');
  const state=await readTaxonomy(db);
  if(state.state!=='ready') fail(409,state.message);
  if(state.doc.revision!==o.expectedRevision) fail(409,'分类已经更新，请重读后对照你的修改。');
  const doc=nextTaxonomy(state.doc);
  let forumQuery='', forumId='';
  if(action==='setEmptyPolicy') {
    if(o.emptyPolicy!=='hide' && o.emptyPolicy!=='comingSoon') fail(400,'未知的空分类策略。');
    doc.emptyPolicy=o.emptyPolicy;
  } else {
    const group=groupOf(o.group), items=doc[group];
    if(action==='create') {
      const input=object(o.item);
      only(input,['id','name','description','order','icon','material']);
      const c=category({order:items.length,...input});
      if(items.some(x=>x.id===c.id || x.name===c.name) || doc.retiredIds?.[group]?.includes(c.id)) fail(409,'分类 ID 已使用或名称重复。');
      if(items.length>=64) fail(400,'每个维度最多 64 个分类。');
      items.splice(Math.min(c.order,items.length),0,c);
    } else if(action==='reorder') {
      const order=o.ids;
      if(!Array.isArray(order) || order.length!==items.length || new Set(order).size!==items.length || order.some(id=>!items.some(c=>c.id===id))) fail(400,'排序须包含本组所有 ID，且不能重复。');
      doc[group]=order.map(id=>items.find(c=>c.id===id)!);
    } else {
      const id=categoryId(o.id), index=items.findIndex(c=>c.id===id);
      if(index<0) fail(404,'没有这个分类。');
      if(action==='edit') {
        const changes=object(o.changes);
        only(changes,['name','icon','description','material']);
        if(!Object.keys(changes).length) fail(400,'至少指定一项修改。');
        // Omission preserves a stored choice; null is only an edit command to
        // restore automatic presentation, never a stored material value.
        const merged:Record<string,unknown>={...items[index],...changes};
        if(changes.material===null) delete merged.material;
        const c=category(merged);
        if(items.some(x=>x.id!==id && x.name===c.name)) fail(409,'分类名称已使用。');
        items[index]=c;
      } else {
        const used=references(doc)[group][id];
        if(used?.length) fail(409,'以下章节仍在引用此分类：'+used.join('、'));
        if(group!=='levels') {
          // Check the same predicate in the conditional UPDATE: a concurrent forum
          // write cannot slip in after a separate reference check.
          const contains=group==='tasks'?"json_extract(t.value,'$.task')=?":"EXISTS(SELECT 1 FROM json_each(t.value,'$.tools') j WHERE j.value=?)";
          forumQuery=`SELECT t.key FROM settings t WHERE t.key GLOB 'topic_tags_v1:*' AND CASE WHEN json_valid(t.value) THEN ${contains} ELSE 0 END`;
          forumId=id;
        }
        items.splice(index,1);
        ((doc.retiredIds??={})[group]??=[]).push(id);
      }
    }
    doc[group].forEach((c,i)=>{c.order=i;});
  }
  const raw=serializeTaxonomy(doc);
  const write=await db.prepare('UPDATE settings SET value=? WHERE key=? AND value=?'+(forumQuery?' AND NOT EXISTS ('+forumQuery+')':''))
    .bind(raw,TAXONOMY_KEY,state.raw,...(forumQuery?[forumId]:[])).run();
  if(!write.meta.changes) {
    if(forumQuery) {
      const hits=await db.prepare(forumQuery).bind(forumId).all<{key:string}>();
      if(hits.results.length) fail(409,'以下讨论仍在引用此分类：'+hits.results.map(x=>x.key.slice('topic_tags_v1:'.length)).join('、'));
    }
    fail(409,'分类已经更新，请重读后对照你的修改。');
  }
  return adminTaxonomy({state:'ready',doc,raw});
}
