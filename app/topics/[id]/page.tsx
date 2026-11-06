import Topic from '@/app/community/topic';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){return <Topic id={(await params).id}/>;}
