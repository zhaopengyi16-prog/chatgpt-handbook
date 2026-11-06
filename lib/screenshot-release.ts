import {type Block,renderBlocks} from './blocks';
import {cleanHtml} from './content';
import {applyRelease} from './content-revisions';
import {firstChapter,firstChapterBlocks} from './chapter-one';
import {secondChapter,secondChapterBlocks} from './chapter-two';
import {thirdChapter,thirdChapterBlocks} from './chapter-three';
import {fourthChapter,fourthChapterBlocks} from './chapter-four';

// A separate immutable release keeps earlier migrations reproducible. The date
// records source review, not an invented screenshot capture date or app version.
const official=(name:string)=>'/assets/screenshots/official-20260911-'+name;
const openai='https://learn.chatgpt.com/docs/use-chatgpt';
const work='https://learn.chatgpt.com/docs/get-started-with-work';
const vscode='https://code.visualstudio.com/docs/sourcecontrol/overview';
const original='原稿截图复用；拍摄版本未标注，仅用于辨认对应入口。背景、账号与已安装项目是作者的个人设置。';
type Shot=Pick<Block,'src'|'title'|'text'|'caption'>;
export const screenshotUpdates:Record<string,Shot>={
 'start-interface-shot':{src:official('work-select.webp'),title:'截图 04 · 从输入框开始：Chat 与 Work',text:'先找到输入框，再确认当前是 Chat 还是 Work。此图只展示模式入口；侧栏、新建对话与附件位置请结合上文说明。',caption:'OpenAI 官方入门视频封面帧，展示 Chat / Work 选择。来源：'+work+'；核对于 2026-09-11。'},
 'gpt-mode-shot':{src:official('work-select.webp'),title:'截图 03 · Chat / Work 模式入口',text:'Chat / Work 决定任务的处理方式；输入框旁的模型或思考强度是另一个选项。具体选项以你的账号为准。',caption:'OpenAI 官方演示视频封面帧；图中按钮文字不代表所有账号都具有相同选项。来源：'+work+'；核对于 2026-09-11。'},
 'gpt-files-shot':{src:official('work-comparison.webp'),title:'截图 04 · 对话与文件预览',text:'左侧继续交代任务，右侧查看生成的表格文件。交付后打开文件检查内容，而不只看聊天里的完成提示。此图展示文件预览，不是上传窗口。',caption:'OpenAI 官方文档配图：ChatGPT Work 中的文件协作示例。来源：'+openai+'；核对于 2026-09-11。'},
 'gpt-work-shot':{src:official('plugins.webp'),title:'截图 09 · 插件目录与定时任务入口',text:'左侧 Plugins 打开插件目录，Scheduled 是定时任务入口。目录展示可选插件；安装与连接状态需要打开对应插件进一步查看。',caption:'OpenAI 官方文档配图。目录会随账号和可用插件变化。来源：'+openai+'；核对于 2026-09-11。'},
 'cod-extensions-shot':{src:'/assets/screenshots/original-image49.png',title:'截图 13 · 桌面端的插件与 Skills 入口',text:'左侧 Plugins 进入扩展页面，上方可切换 Plugins / Skills，Installed 显示已安装项目。安装完成后仍需检查外部服务是否已连接。',caption:original+' 对照文档：https://learn.chatgpt.com/docs/plugins；入口核对于 2026-09-11。'},
 'env-commit-shot':{src:official('vscode-staging.png'),title:'截图 05 · VS Code 中暂存与提交修改',text:'在源代码管理中查看 Changes，把确认过的文件加入 Staged Changes，再填写说明并提交。暂存不等于提交，提交也不等于推送到 GitHub。',caption:'VS Code 官方文档配图：暂存文件与提交入口。来源：'+vscode+'；核对于 2026-09-11，配图拍摄版本未标注。'},
 'env-clone-shot':{src:official('vscode-clone.png'),title:'截图 07 · VS Code 的克隆入口',text:'从源代码管理中选择 Clone Repository，再按提示填写仓库地址、选择本地目录并打开项目。此图展示入口，不代表仓库已经克隆完成。',caption:'VS Code 官方文档配图。来源：https://code.visualstudio.com/docs/sourcecontrol/repos-remotes；核对于 2026-09-11，配图拍摄版本未标注。'},
 'env-plugin-shot':{src:official('plugins.webp'),title:'截图 10 · 从插件目录选择需要的工具',text:'先在 Plugins 中找到任务需要的插件，再进入详情进行安装与连接。能在目录中看见插件，不代表已经获得外部账号访问权限。',caption:'OpenAI 官方文档配图；此图用于说明插件发现入口，不展示授权完成状态。来源：'+openai+'；核对于 2026-09-11。'},
 'env-skill-shot':{src:'/assets/screenshots/original-image45.png',title:'截图 11 · 查看已安装的 Skills',text:'在扩展页面切换到 Skills，查看 Installed 列表。安装后在新任务中明确说出要使用的 Skill，并检查是否实际被调用。',caption:original+' 对照文档：https://learn.chatgpt.com/docs/build-skills；入口核对于 2026-09-11。'},
};
export const fillScreenshotBlocks=(blocks:Block[])=>blocks.map(b=>b.kind==='screenshot'&&!b.src&&screenshotUpdates[b.id]?{...b,...screenshotUpdates[b.id]}:b);
export const screenshotReleases=[
 {chapter:firstChapter,blocks:firstChapterBlocks,version:3},
 {chapter:secondChapter,blocks:secondChapterBlocks,version:2},
 {chapter:thirdChapter,blocks:thirdChapterBlocks,version:3},
 {chapter:fourthChapter,blocks:fourthChapterBlocks,version:2},
].map(({chapter,blocks,version})=>({original:{...chapter,body:cleanHtml(chapter.body)},next:{...chapter,body:renderBlocks(fillScreenshotBlocks(blocks))},version}));
export async function applyScreenshotRevision(db:D1Database){
 for(const r of screenshotReleases)await applyRelease(db,'content_revision:'+r.original.id+':screenshots-20260911-1','content_backup:'+r.original.id+':screenshots-20260911-1',r.version,r.original,r.next);
}
