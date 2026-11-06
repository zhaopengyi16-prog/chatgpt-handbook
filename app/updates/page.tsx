import {publicUpdates} from '@/lib/public-updates';

export default function Page(){
  return <main id="main" className="wide article"><p className="home-label">持续完善</p><h1>更新记录</h1>
    {publicUpdates.map(item=><section id={item.id} key={item.id}><h2>{item.title}</h2><p>{item.description}</p></section>)}
  </main>;
}
