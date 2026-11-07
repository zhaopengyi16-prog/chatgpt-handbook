import sanitizeHtml from 'sanitize-html';
import {database} from './data';
import {categoryMaterial} from './category-material';
import {publicChapterHtml} from './legacy-images';
import {readReaderSnapshot} from './reader-snapshot';
import {getChapterTags, type Category, type ChapterTags, type Group, type TaxonomyDocument} from './taxonomy-types';

export type PublicCategory = Category & {count:number};
type PublicChapter = {id:string; title:string; description:string; ordinal:number; tags:ChapterTags};
export type PublicCatalog = Record<Group, PublicCategory[]> & {ready:boolean; chapters:PublicChapter[]};
export type Query = Record<string,string|string[]|undefined>;
export type Scope = {group:'tasks'|'tools'; id:string};
const groups = ['tasks','tools','levels'] as const;

// Old descriptions can contain pasted markup. Project through the v2a reader
// policy before taking plain text; card markup never receives a chapter body.
function excerpt(value:string, origin?:string) {
  if (!value.includes('<') && !value.includes('&')) return value;
  const text = sanitizeHtml(publicChapterHtml(value, origin), {allowedTags:[], allowedAttributes:{}});
  const entities:Record<string,string> = {amp:'&',lt:'<',gt:'>',quot:'"', '#39':"'"};
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_:string,key:string) => entities[key]).trim();
}

export async function readPublicCatalog(origin?:string):Promise<PublicCatalog> {
  const {list:rows,doc} = await readReaderSnapshot(true);
  const counts = {tasks:new Map<string,number>(),tools:new Map<string,number>(),levels:new Map<string,number>()};
  const chapters = rows.map((row,index) => {
    const id = String(row.id);
    const tags = getChapterTags(doc?.publishedChapterTags,id);
    for (const group of groups) {
      const ids = group === 'levels' ? (tags.level ? [tags.level] : []) : tags[group];
      for (const tag of new Set(ids)) counts[group].set(tag,(counts[group].get(tag) ?? 0)+1);
    }
    return {id, ordinal:index+1, title:String(row.title ?? ''), description:excerpt(String(row.description ?? ''), origin), tags};
  });
  function categories(group:Group):PublicCategory[] {
    // Resolve from the stored order before hiding empty categories. This is a
    // display-only projection; legacy JSON remains untouched in settings.
    return (doc?.[group] ?? []).map(c=>({...c,material:categoryMaterial(c),count:counts[group].get(c.id) ?? 0}))
      .filter(c=>c.count>0 || doc?.emptyPolicy==='comingSoon');
  }
  return {ready:!!doc, chapters, tasks:categories('tasks'),tools:categories('tools'),levels:categories('levels')};
}

export function categoryUrl(group:'tasks'|'tools', id:string) {
  return (group==='tasks' ? '/learn/' : '/tools/') + encodeURIComponent(id);
}

export function queryValues(query:Query,key:string):string[] {
  const raw = query[key];
  return [...new Set((Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).filter(Boolean))];
}

export function filterCatalog(catalog:PublicCatalog, query:Query, scope?:Scope) {
  const keys = {tasks:'task',tools:'tool',levels:'level'} as const;
  const selected = {tasks:queryValues(query,'task'),tools:queryValues(query,'tool'),levels:queryValues(query,'level')};
  const invalid = Object.keys(query).filter(k=>!Object.values<string>(keys).includes(k));
  for (const group of groups) {
    const values = selected[group];
    if (values.some(id=>!catalog[group].some(c=>c.id===id)) ||
        (group==='levels' && values.length>1) ||
        (scope?.group===group && values.some(id=>id!==scope.id))) invalid.push(keys[group]);
  }
  const active = Object.values(selected).some(v=>v.length>0) || invalid.length>0;
  const chapters = invalid.length ? [] : catalog.chapters.filter(({tags}) =>
    (!scope || tags[scope.group].includes(scope.id)) &&
    (!selected.tasks.length || selected.tasks.some(t=>tags.tasks.includes(t))) &&
    (!selected.tools.length || selected.tools.some(t=>tags.tools.includes(t))) &&
    (!selected.levels.length || tags.level===selected.levels[0]));
  return {chapters,invalid,active};
}

export function chapterLabels(doc:TaxonomyDocument, id:string, preview:boolean) {
  const tags = getChapterTags(preview ? doc.chapterTags : doc.publishedChapterTags,id);
  return {tasks:doc.tasks.filter(c=>tags.tasks.includes(c.id)),tools:doc.tools.filter(c=>tags.tools.includes(c.id)),
          level:doc.levels.find(c=>c.id===tags.level)};
}

export function recentPublicTopics() {
  return database().prepare(
    "SELECT id,title,category FROM topics WHERE hidden=0 AND moderation_status='approved' ORDER BY updated_at DESC,id LIMIT 3"
  ).all<{id:string;title:string;category:string}>().then(r=>r.results);
}
