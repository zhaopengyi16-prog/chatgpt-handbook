import Topic from '@/app/community/topic';
import '@/app/forum.css';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){return <Topic id={(await params).id}/>;}
