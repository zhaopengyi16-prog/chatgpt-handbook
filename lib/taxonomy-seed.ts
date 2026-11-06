import { cleanHtml } from './content';
import { renderBlocks } from './blocks';
import type { Category, ChapterTags, TaxonomyDocument } from './taxonomy-types';

type Option = readonly [string, string, string, string];
function options(rows:ReadonlyArray<Option>):Category[] {
  return rows.map(([id,name,icon,description],order)=>({id,name,icon,description,order}));
}
const tasks = options([
  ['ai-modeling','AI 建模','cube','用 AI 辅助 Blender 等三维工具，从参考图做出可检查和导出的模型。'],
  ['coding','写代码','code','从一小段程序开始，说明你想改什么，再验证结果。'],
  ['engineering','做工程','ruler','准备工具与项目环境，把工程任务拆成可验证的小步。'],
  ['files','改文件','file','整理、转换和批量修改文件，先预览，再核对。'],
  ['website','做网站','window','从页面结构开始，搭建并检查自己的网页。'],
  ['video','做视频','film','整理脚本与分镜，把素材变成一段成片。'],
  ['images','生图片','frame','说明用途与构图，生成、比较并导出图片。'],
]);
const tools = options([
  ['chatgpt-codex','ChatGPT 与 Codex','chat','对话、编程与桌面开发环境。'],
  ['claude','Claude','pencil','用 Claude 阅读、写作与编程。'],
  ['domestic-ai','国内 AI','globe','DeepSeek、Kimi、通义等国内 AI 工具。'],
  ['multi-open','多模型与开源工具','layers','接入其他模型及使用开源工具。'],
  ['agents','智能体','agent','创建和使用可以执行任务的智能体。'],
  ['workbuddy','WorkBuddy','desk','腾讯桌面智能体 WorkBuddy。'],
]);
const levels = options([
  ['basic','基础教程','book','从准备工作开始，完成第一次尝试。'],
  ['advanced','高级技巧','steps','在已有基础上改进工作方式。'],
]);
const titles:Record<string,[string,string,string,string]> = {
  'ai-modeling':['用 AI 辅助在 Blender 做第一个三维模型','准备参考图与尺寸','从基础几何体搭出外形','检查比例并导出模型'],
  coding:['让 AI 帮你改一小段代码','准备最小示例','说明预期改动','验证行为'],
  engineering:['从任务说明到工程检查','拆分任务','整理工作目录','记录验证结果'],
  files:['安全地批量修改文件','留好副本','预览变更','抽查并撤回'],
  website:['做出你的第一个网页','画出页面结构','搭建页面','检查手机效果'],
  video:['从脚本到一个短片','定义片段','准备分镜','检查成片'],
  images:['生成一张符合用途的图片','确定尺寸与用途','写提示并比较版本','导出检查'],
};
export const EXISTING_CHAPTERS = ['getting-started','chatgpt','codex','desktop','practice','models','appendix'];
export const starters = tasks.map(({id:task})=>{
  const [title,...headings] = titles[task], id = 'v2-starter-'+task;
  return {id,task,title,body:cleanHtml(renderBlocks(headings.map((title,i)=>({
    id:id+'-h'+(i+1), kind:'heading', level:2, anchor:'step-'+(i+1), title,
  }))))};
});
export function initialTaxonomy(rows:ReadonlyArray<[string,number,number,number]>):TaxonomyDocument {
  const doc:TaxonomyDocument = {schema:1,revision:1,emptyPolicy:'hide',...structuredClone({tasks,tools,levels}),
    chapterTags:{},publishedChapterTags:{},writeToken:crypto.randomUUID()};
  for(const [id,,published,deleted] of rows) {
    const tags:ChapterTags = {tasks:id==='desktop'?['coding','engineering']:[],
      tools:[id==='models'?'multi-open':'chatgpt-codex'],
      level:['practice','models'].includes(id)?'advanced':'basic'};
    doc.chapterTags[id]=tags;
    if(published&&!deleted) doc.publishedChapterTags[id]=structuredClone(tags);
  }
  for(const {id,task} of starters) doc.chapterTags[id]={tasks:[task],tools:[],level:'basic'};
  return doc;
}
