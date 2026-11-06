import {requireChatGPTUser} from '../../chatgpt-auth';
import {identity} from '@/lib/data';
import {sampleChapter} from '@/lib/sample-chapter';
import {ArticleBody,ArticleHeader} from '../../article-content';
import {publicChapterHtml} from '@/lib/legacy-images';
import {readerOrigin} from '@/lib/reader-chapter';
import {headers} from 'next/headers';
import {Unavailable} from '../../shared';
export const dynamic='force-dynamic';
export default async function Sample(){
 await requireChatGPTUser('/admin/sample');
 try{if(!(await identity())?.admin)return <main id="main" className="wide"><h1>样稿仅限站点所有者查看</h1><a className="button" href="/admin">返回后台</a></main>;}catch{return <Unavailable/>;}
 return <main className="sample-page" id="main"><div className="sample-preview-note box"><span className="badge">初始排版样稿 · 仅你可见</span><p>这是上一轮用于确认编辑排版的初始样稿。正式第一章已经有独立正文，请从网站目录查看，并在后台编辑正式章节。</p><a className="button" href="/chapters/getting-started.html">查看正式第一章</a> <a className="button" href="/admin">打开编辑后台</a></div><article className="article hb-article"><ArticleHeader title={sampleChapter.title} description={sampleChapter.description}/><ArticleBody html={publicChapterHtml(sampleChapter.body,readerOrigin(await headers()))}/></article></main>;
}
