import seed from '../db/seed.json';
import {Block,renderBlocks} from './blocks';
import {fifthChapter} from './chapter-five';
import {cleanHtml} from './content';

export const FIFTH_CHAPTER_REVISION='content_revision:chapter-five-restructure:20260911-1';
export const fifthChapterBackupKey=(id:string)=>'content_backup:'+id+':20260911-5';

export const sharingBlocks:Block[]=[
 {id:'before-sharing',kind:'heading',level:2,anchor:'before-sharing',title:'7.9  公开分享与提问前的检查'},
 {id:'sharing-intro',kind:'text',text:'把资料准备、工具授权和结果检查放到实际操作中。本节保留原“安全边界”章节中的通用检查，适用于分享教程、截图、代码或在社区提问。'},
 {id:'sharing-checks',kind:'table',headers:['检查项','怎样处理'],rows:[
 ['资料归属','确认自己有权使用和公开。公开可读的资料也要核对引用、转载与许可要求。'],
 ['示例脱敏','替换客户名称、联系方式、非公开金额或参数，保留理解问题所需的结构。个人文件里也可能混有第三方资料。'],
 ['截图与附件','检查侧栏、文件路径、通知、账号、日志与链接；只保留讲解需要的内容。'],
 ['账号与密钥','通过服务支持的登录或配置入口授权，不把密码、令牌或密钥写入示例、截图和仓库。'],
 ['实际接收方','区分当前工作空间、第三方插件和模型供应商；本地客户端或本地网关不等于离线处理。'],
 ['操作范围','规则文件说明意图，实际访问范围由权限控制；.gitignore 用于 Git 忽略规则，不会阻止工具读取文件。'],
 ['结果证据','报告中的事实需可核对；代码查看差异并执行适用检查；硬件功能按实际设备验证。明确区分完成项、建议和未验证项。'],
 ['公开提问','提供任务、入口与版本、复现步骤、准确报错和已尝试的方法，使用最小示例，不直接上传整个私有项目。']]},
 {id:'sharing-example-prompt',kind:'prompt',title:'将现有材料整理成公开示例',text:'请将这份材料改写为公开教学示例。保留解释问题所需的结构，把客户名称、联系方式、非公开参数和项目路径替换为示例信息。\n不要改动影响问题复现的逻辑；需要替换的数据请说明其用途。区分已验证结果与演示性内容，列出仍需我确认的公开范围。'},
 {id:'sharing-workflow-link',kind:'link',title:'第五章：在实际工作中检查结果',href:'/chapters/practice.html#bootstrap-improve',text:'结合工程初始化案例，核对真实变化和未验证项。'},
 {id:'sharing-old-discussion',kind:'link',title:'查看原“安全边界”章节的讨论',href:'/community?chapter=boundaries',text:'原有讨论继续保留；新的问题也可以在对应操作章节中提出。'},
];

// Change visible section labels only: preserve code examples, image bytes, IDs
// and anchors in chapters whose full rewrite has not yet been requested.
function renumberHeadings(body:string,from:number,to:number){
 return body.replace(/(<h[23]\b[^>]*>)(\d+)(\.\d)/g,(all,start,n,end)=>Number(n)===from?start+to+end:all);
}
const oldModels=seed.chapters.find(c=>c.id==='models')!;
const oldAppendix=seed.chapters.find(c=>c.id==='appendix')!;
export const renumberedModels={...oldModels,position:6,body:renumberHeadings(oldModels.body,7,6).replace('从 7.4 节开始','从 6.4 节开始')};
export const supplementedAppendix={...oldAppendix,position:7,body:renumberHeadings(oldAppendix.body,8,7).replace('按第七章逐层定位','按第六章逐层定位')+'\n'+renderBlocks(sharingBlocks)};

const releases=[
 {...fifthChapter,position:5,retired:false},
 {...renumberedModels,retired:false},
 {...supplementedAppendix,retired:false},
 {...seed.chapters.find(c=>c.id==='boundaries')!,position:8,retired:true},
];

// All four changes share one transaction: never publish renumbered content
// with a half-moved directory. A unique claim guards every write against a
// concurrent initialization. Full draft + published comparisons protect edits.
export async function applyFifthChapterRevision(db:D1Database){
 if(await db.prepare('SELECT value FROM settings WHERE key=?').bind(FIFTH_CHAPTER_REVISION).first())return;
 const rows:any[]=[];
 const columns=['id','version','title','description','body','position','published_title','published_description','published_body','published_position'];
 const matches=releases.map(next=>{
  const original=seed.chapters.find(c=>c.id===next.id)!;
  return [original.id,1,original.title,original.description,original.body,original.position,original.title,original.description,original.body,original.position];
 });
 for(const values of matches){
  const row:any=await db.prepare('SELECT * FROM chapters WHERE id=?').bind(values[0]).first();
  if(!row||row.deleted_at||columns.some((key,i)=>row[key]!==values[i]))return;
  rows.push(row);
 }
 const now=new Date().toISOString(),claim=now+':'+crypto.randomUUID();
 const match=columns.map(key=>key+'=?').join(' AND ')+' AND deleted_at IS NULL';
 const owned='EXISTS (SELECT 1 FROM settings WHERE key=? AND value=?)';
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO settings (key,value) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key=?) AND '+matches.map(()=>`EXISTS (SELECT 1 FROM chapters WHERE ${match})`).join(' AND ')).bind(FIFTH_CHAPTER_REVISION,claim,FIFTH_CHAPTER_REVISION,...matches.flat()),
  ...releases.flatMap((next,i)=>{
   const html=next.retired?next.body:cleanHtml(next.body);
   return [
    db.prepare('INSERT OR IGNORE INTO settings (key,value) SELECT ?,? WHERE '+owned).bind(fifthChapterBackupKey(next.id),JSON.stringify(rows[i]),FIFTH_CHAPTER_REVISION,claim),
    db.prepare('UPDATE chapters SET title=?,description=?,body=?,position=?,published_title=?,published_description=?,published_body=?,published_position=?,updated_at=?,published_at=?,deleted_at=?,version=version+1 WHERE id=? AND '+owned).bind(next.title,next.description,html,next.position,next.title,next.description,html,next.position,now,next.retired?rows[i].published_at:now,next.retired?now:null,next.id,FIFTH_CHAPTER_REVISION,claim),
   ];
  }),
 ]);
}
