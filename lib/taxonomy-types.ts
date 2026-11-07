// Safe to import in the client. Storage, initialization and validation live on the server.
export const TAXONOMY_KEY = 'taxonomy_v1';
export const GROUPS = ['tasks', 'tools', 'levels'] as const;
export type Group = typeof GROUPS[number];
export type EmptyPolicy = 'hide' | 'comingSoon';
export const TAXONOMY_MATERIALS = ['grass','dirt','stone','water','sand','wood','ember','gem','snow'] as const;
export type Material = typeof TAXONOMY_MATERIALS[number];
export type Category = {id:string; name:string; icon:string; description:string; order:number; material?:Material};
export type ChapterTags = {tasks:string[]; tools:string[]; level:string|null};
export const EMPTY_TAGS = ():ChapterTags => ({tasks:[],tools:[],level:null});
// The pre-existing chapter slug format permits names such as "constructor".
export function getChapterTags(map:Record<string,ChapterTags>|undefined,id:string):ChapterTags {
  return map && Object.hasOwn(map,id) ? map[id] : EMPTY_TAGS();
}
export type TaxonomyDocument = Record<Group, Category[]> & {
  schema:1; revision:number; emptyPolicy:EmptyPolicy;
  chapterTags:Record<string,ChapterTags>; publishedChapterTags:Record<string,ChapterTags>;
  retiredIds?:Partial<Record<Group,string[]>>; writeToken?:string;
};
export type TaxonomyView = {
  state:'ready'|'missing'|'invalid'; taxonomy:TaxonomyDocument|null; message?:string;
  references?:Record<Group,Record<string,string[]>>;
};
export const TAXONOMY_ICONS:Record<string,string> = {
  cube:'立方体', code:'代码', ruler:'直角尺', file:'文档', window:'窗口',
  film:'胶片', frame:'画框', chat:'对话', pencil:'书写', globe:'网络',
  layers:'层叠', agent:'智能体', desk:'桌面', book:'书本', steps:'进阶',
};
