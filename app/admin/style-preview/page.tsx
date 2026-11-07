import type {Metadata} from 'next';
import {requireChatGPTUser} from '../../chatgpt-auth';
import {identity} from '@/lib/data';
import {Unavailable} from '../../shared';
import StyleDemo from './demo';
import '@/public/assets/style-preview/miaomiao-font/fonts.css';
import './preview.css';
import './sky.css';

export const dynamic = 'force-dynamic';
export const metadata:Metadata = {
  title:'AI 妙妙屋 · 管理员样式预览',
  robots:{index:false,follow:false},
};

export default async function StylePreview({searchParams}:{searchParams:Promise<{theme?:string|string[]}>}) {
  await requireChatGPTUser('/admin/style-preview');
  try {
    if (!(await identity())?.admin) {
      return <main id="main" className="wide"><h1>样式预览仅限站点所有者</h1><p>请使用创建本站的账号查看。</p><a className="button" href="/admin">返回后台</a></main>;
    }
  } catch { return <Unavailable/>; }
  const query = await searchParams;
  // This demonstration never reads or initializes handbook content or taxonomy.
  return <StyleDemo theme={query.theme === 'original' ? 'original' : 'pixel'}/>;
}
