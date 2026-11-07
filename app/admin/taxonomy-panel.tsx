'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {EMPTY_TAGS,getChapterTags,GROUPS,TAXONOMY_ICONS,TAXONOMY_MATERIALS,type Category,type ChapterTags,type Group,type Material,type TaxonomyDocument,type TaxonomyView} from '@/lib/taxonomy-types';
import {categoryMaterial,MATERIAL_LABELS} from '@/lib/category-material';
import {api} from '../shared';
import './taxonomy.css';

const labels:Record<Group,string>={tasks:'场景',tools:'工具',levels:'难度'};
const ordered=(items:Category[])=>[...items].sort((a,b)=>a.order-b.order);
export function sameTags(a:ChapterTags=EMPTY_TAGS(),b:ChapterTags=EMPTY_TAGS()){
  return a.level===b.level&&(['tasks','tools'] as const).every(g=>a[g].length===b[g].length&&a[g].every(id=>b[g].includes(id)));
}
function tagList(doc:TaxonomyDocument,tags:ChapterTags){
  return [...doc.tasks.filter(x=>tags.tasks.includes(x.id)),...doc.tools.filter(x=>tags.tools.includes(x.id)),...doc.levels.filter(x=>tags.level===x.id)].map(x=>x.name).join('、')||'未分类';
}
export function ChapterTagFields({doc,tags,disabled,onChange}:{doc:TaxonomyDocument;tags:ChapterTags;disabled:boolean;onChange:(v:ChapterTags)=>void}){
  return <section className="box tax-tags" aria-label="章节分类"><h2>章节分类</h2>
    <p className="muted">标签随草稿保存。点击「发布更新」后，读者才会在对应入口找到本章。</p>
    {(['tasks','tools'] as const).map(g=><fieldset key={g} disabled={disabled}><legend>{labels[g]} <small>可多选</small></legend><div className="tax-choices">
      {ordered(doc[g]).map(x=><label key={x.id}><input type="checkbox" checked={tags[g].includes(x.id)} onChange={e=>onChange({...tags,[g]:e.target.checked?[...tags[g],x.id]:tags[g].filter(id=>id!==x.id)})}/>{x.name}</label>)}
      {!doc[g].length&&<span className="muted">尚未添加{labels[g]}</span>}
    </div></fieldset>)}
    <label className="field tax-level"><span>难度 <small>单选</small></span><select value={tags.level??''} disabled={disabled} onChange={e=>onChange({...tags,level:e.target.value||null})}><option value="">暂不指定</option>{ordered(doc.levels).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  </section>;
}

type AdminChapter={id:string;title:string;deleted_at?:string|null;[key:string]:any};
type Work=(fn:()=>Promise<void>,message?:string)=>Promise<void>;
type Form={kind:'create'|'edit';group:Group;revision:number;id:string;name:string;icon:string;description:string;material:Material|''};
type Props={view:TaxonomyView|null;chapters:AdminChapter[];busy:boolean;work:Work;refresh:()=>Promise<void>;onUpdate:(v:TaxonomyView)=>Promise<void>;confirm:(c:{title:string;message:string;action:()=>void})=>void};

export default function TaxonomyPanel({view,chapters,busy,work,refresh,onUpdate,confirm}:Props){
  const [group,setGroup]=useState<Group>('tasks');
  const [form,setForm]=useState<Form|null>(null);
  const nameInput=useRef<HTMLInputElement>(null);
  const doc=view?.taxonomy;
  async function mutate(method:string,payload:unknown,query=''){
    const result:TaxonomyView=await api('admin/taxonomy'+query,{method,...(payload?{body:JSON.stringify(payload)}:{})});
    await onUpdate(result);
  }
  function startForm(group:Group,x?:Category){
    if(!doc)return;
    setForm({group,kind:x?'edit':'create',revision:doc.revision,id:x?.id??'',name:x?.name??'',icon:x?.icon??'book',description:x?.description??'',material:x?.material??''});
    requestAnimationFrame(()=>nameInput.current?.focus());
  }
  const toolbar=<Button variant="outline" disabled={busy} onClick={()=>work(refresh,'')}>重新读取分类</Button>;
  if(!doc||view?.state!=='ready')return <section className="box tax-panel"><div className="section-heading"><h2>分类管理</h2>{toolbar}</div>
    {view?.state==='missing'?<><p>初始化后可以按场景、工具和难度编排教程。系统会保留已有章节，并创建七份未发布的基础教程草稿。</p>
      <Button disabled={busy} onClick={()=>work(()=>mutate('POST',{action:'initialize'}),'分类已就绪。')}>初始化分类</Button></>:<p role="status">{view?.message??'暂未读取到分类，请重新读取。'}</p>}
  </section>;
  const items=ordered(doc[group]);
  function includesCategory(tags:ChapterTags|undefined,id:string){return group==='levels'?tags?.level===id:!!tags?.[group].includes(id);}
  function refs(x:Category):string[]{
    if(view?.references?.[group]?.[x.id])return view.references[group][x.id];
    return [...new Set([doc!.chapterTags,doc!.publishedChapterTags].flatMap(map=>Object.entries(map).filter(([,tags])=>includesCategory(tags,x.id)).map(([id])=>id)))];
  }
  function move(index:number,direction:-1|1){
    const ids=items.map(x=>x.id);[ids[index],ids[index+direction]]=[ids[index+direction],ids[index]];
    void work(()=>mutate('PUT',{action:'reorder',group,ids,expectedRevision:doc!.revision}),'顺序已保存。');
  }
  const newer=form&&form.revision!==doc.revision;
  const currentItem=form&&doc[form.group].find(x=>x.id===form.id);
  function saveForm(){
    if(!form||newer)return;
    const {kind,group,id,name,description,icon,material,revision:expectedRevision}=form;
    void work(async()=>{
      if(kind==='create')await mutate('POST',{action:'create',group,item:{id,name,description,icon,...(material?{material}:{})},expectedRevision});
      else await mutate('PUT',{action:'edit',group,id,changes:{name,description,icon,material:material||null},expectedRevision});
      setForm(null);
    },'分类已保存。');
  }
  return <section className="tax-panel"><div className="section-heading"><div><h2>分类管理</h2><p className="muted">名称、顺序和材质保存后立即应用到网站；章节归类随正文发布。</p></div>{toolbar}</div>
    <label className="field tax-policy"><span>没有公开教程的分类</span><select disabled={busy||!!form} value={doc.emptyPolicy} onChange={e=>{const emptyPolicy=e.target.value;void work(()=>mutate('PUT',{action:'setEmptyPolicy',emptyPolicy,expectedRevision:doc.revision}),'展示方式已保存。');}}><option value="hide">隐藏</option><option value="comingSoon">显示为「即将上线」</option></select></label>
    <div className="section-heading"><div className="row-actions" role="group" aria-label="分类维度">{GROUPS.map(g=><Button key={g} disabled={busy||!!form} variant={group===g?'default':'outline'} aria-pressed={group===g} onClick={()=>setGroup(g)}>{labels[g]} · {doc[g].length}</Button>)}</div><Button disabled={busy||!!form} onClick={()=>startForm(group)}>新增{labels[group]}</Button></div>
    {form&&<form className="box tax-form" onSubmit={e=>{e.preventDefault();saveForm();}}><h3>{form.kind==='create'?'新增':'编辑'}{labels[form.group]}</h3>
      <label className="field"><span>显示名称</span><input ref={nameInput} required maxLength={40} disabled={busy} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label className="field"><span>固定标识（用于网址）</span><input required disabled={busy||form.kind==='edit'} pattern="[a-z][a-z0-9\-]{0,47}" title="以小写英文字母开头，可含小写字母、数字和连字符" maxLength={48} value={form.id} onChange={e=>setForm({...form,id:e.target.value})}/></label>
      <label className="field"><span>图标</span><select disabled={busy} value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})}>{Object.entries(TAXONOMY_ICONS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label className="field"><span>卡片材质</span><select disabled={busy} value={form.material} onChange={e=>setForm({...form,material:e.target.value as Material|''})}><option value="">自动（按分类顺序轮换）</option>{TAXONOMY_MATERIALS.map(material=><option key={material} value={material}>{MATERIAL_LABELS[material]}</option>)}</select><small className="muted">自动材质随排序变化；指定材质会保留。材质只用于卡片装饰，不影响正文。</small></label>
      <label className="field"><span>简介</span><textarea maxLength={200} disabled={busy} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      {newer&&<div role="status" className="box"><p>分类在编辑期间已有更新。本页输入已保留。</p>
        {currentItem&&<p>服务器当前值：{currentItem.name} · {TAXONOMY_ICONS[currentItem.icon]} · {currentItem.material?MATERIAL_LABELS[currentItem.material]:'自动材质'} · {currentItem.description||'暂无简介'}</p>}
        {!currentItem&&form.kind==='edit'&&<p>这项分类已被删除，无法继续保存。</p>}
        {((form.kind==='edit'&&currentItem)||(form.kind==='create'&&!currentItem))&&<Button type="button" variant="outline" onClick={()=>setForm({...form,revision:doc.revision})}>已核对，保留输入并使用新版分类</Button>}
      </div>}
      <div className="row-actions"><Button type="submit" disabled={busy||!!newer}>保存分类</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>setForm(null)}>取消编辑</Button></div>
    </form>}
    <div className="tax-items">{items.map((x,i)=>{const ids=refs(x),material=categoryMaterial(x);return <article className="chapter-row" key={x.id}><div className="grow"><h3>{x.name}</h3><small className="muted">{x.id}</small><span className="tax-material-label"><span className="tax-material-swatch" data-material={material} style={{backgroundImage:`url('/assets/style-preview/materials/${material}.svg')`}} aria-hidden="true"/>{x.material?MATERIAL_LABELS[x.material]:'自动 · '+MATERIAL_LABELS[material]}</span>{x.description&&<p>{x.description}</p>}
      {ids.length?<details><summary>{ids.length} 个章节引用 · 查看</summary><ul>{ids.map(id=>{const chapter=chapters.find(c=>c.id===id);const states=[includesCategory(getChapterTags(doc.chapterTags,id),x.id)&&'草稿',includesCategory(getChapterTags(doc.publishedChapterTags,id),x.id)&&'发布快照',chapter?.deleted_at&&'回收站'].filter(Boolean);
      return <li key={id}>{chapter?.title||id} <span className="muted">（{states.join('、')}）</span></li>;})}</ul><small className="muted">如需删除，请先移除以上引用。</small></details>:<small className="muted">尚无章节引用</small>}
      </div><div className="row-actions"><Button variant="outline" disabled={busy||!!form} onClick={()=>startForm(group,x)}>编辑<span className="sr-only">{x.name}</span></Button>
      <Button variant="ghost" aria-label={'上移'+x.name} disabled={busy||!!form||i===0} onClick={()=>move(i,-1)}>上移</Button><Button variant="ghost" aria-label={'下移'+x.name} disabled={busy||!!form||i===items.length-1} onClick={()=>move(i,1)}>下移</Button>
      <Button variant="ghost" disabled={busy||!!form||!!ids.length} aria-label={'删除'+x.name} onClick={()=>confirm({title:'删除「'+x.name+'」？',message:'没有章节引用此分类。删除后读者将无法再通过这个入口访问教程。',action:()=>work(()=>mutate('DELETE',null,'?'+new URLSearchParams({group,id:x.id,revision:String(doc.revision)})),'分类已删除。')})}>删除</Button></div></article>;})}</div>
    {!items.length&&<p className="empty">还没有{labels[group]}。点击「新增{labels[group]}」添加第一项。</p>}
  </section>;
}

export function Comparison({server,view}:{server:AdminChapter;view:TaxonomyView}){
  return <div><h3>服务器上的草稿</h3><p><strong>{server.title}</strong> · 顺序 {server.position} · 正文版本 {server.version}</p><p>{server.description}</p>
    {view.taxonomy&&<p>已保存的分类：{tagList(view.taxonomy,server.tags??EMPTY_TAGS())}</p>}
    <details><summary>查看服务器正文（HTML）</summary><textarea className="tax-raw" aria-label="服务器正文" value={server.body} readOnly/></details>
  </div>;
}
