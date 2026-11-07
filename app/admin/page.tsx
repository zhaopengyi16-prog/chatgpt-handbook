import {requireChatGPTUser} from '../chatgpt-auth';
import {identity,ensureSeed} from '@/lib/data';
import Admin from './panel';
import {Unavailable} from '../shared';
import {Toaster} from '@/components/ui/sonner';
export const dynamic='force-dynamic';
export default async function Page(){
 await requireChatGPTUser('/admin');
 try{await ensureSeed();const user=await identity();if(!user?.admin)return <main id="main" className="wide"><h1>此处仅限站点所有者</h1><p>当前账号没有编辑权限。请切换到创建本站时使用的 ChatGPT 账号。</p><a className="button" href="/signout-with-chatgpt?return_to=%2Fadmin" target="_top">切换账号</a></main>;}catch{return <Unavailable/>;}
 return <><Admin/><Toaster position="top-right"/></>;
}
