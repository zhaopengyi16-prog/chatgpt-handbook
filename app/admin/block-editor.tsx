'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Block,BlockKind,blockLabels,newBlock,parseBlocks,renderBlock,renderBlocks,safeUrl} from '@/lib/blocks';
import {ArticleHeader,ArticleBody} from '../article-content';
import {api} from '../shared';
import {toast} from 'sonner';
import {changeLegacyImage,containsRetiredReference,editProjection,imageChoices,originalFromSurface,retiredNotice,retiredUrl} from './legacy-image-editor';

function Field({label,value,onChange,multiline=false}:{label:string;value?:string;onChange:(v:string)=>void;multiline?:boolean}){
 return <label className="field"><span>{label}</span>{multiline?<textarea value={value||''} onChange={e=>onChange(e.target.value)}/>:<input value={value||''} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function LegacyEditor({block,onChange}:{block:Block;onChange:(html:string)=>void}){
 const ref=useRef<HTMLDivElement>(null),range=useRef<Range|null>(null);
 const projection=useMemo(()=>editProjection(block.html||''),[block.html]);
 useEffect(()=>{
   const node=ref.current;if(!node||node.innerHTML===projection.html)return;
   node.innerHTML=projection.html;range.current=null;
 },[projection]);
 function changed(){if(ref.current)onChange(originalFromSurface(ref.current,projection.originals));}
 function remember(){const s=window.getSelection();if(s?.rangeCount&&ref.current?.contains(s.anchorNode))range.current=s.getRangeAt(0).cloneRange();}
 function command(name:string,value?:string){ref.current?.focus();if(range.current&&ref.current?.contains(range.current.commonAncestorContainer)){const s=window.getSelection();s?.removeAllRanges();s?.addRange(range.current);}document.execCommand(name,false,value);remember();}
 return <><p className="muted">原有排版已保留。可直接修改下方文字；新增卡片、步骤和截图请使用上方「添加模块」。</p><div className="row-actions">{[['加粗','bold'],['斜体','italic'],['列表','insertUnorderedList'],['小节','formatBlock','h2'],['段落','formatBlock','p']].map(([label,cmd,value])=><Button key={label} variant="outline" onMouseDown={e=>e.preventDefault()} onClick={()=>command(cmd,value)}>{label}</Button>)}</div><div ref={ref} className="article hb-article legacy-edit" contentEditable suppressContentEditableWarning role="textbox" aria-label="原有模块正文" aria-multiline="true" onKeyUp={remember} onMouseUp={remember} onInput={changed} onDrop={e=>e.preventDefault()} onClick={e=>{if((e.target as HTMLElement).closest('a,button'))e.preventDefault();}} onPaste={e=>{e.preventDefault();command('insertText',e.clipboardData.getData('text/plain'));}}/></>;
}
export default function BlockEditor({html,title,description,media,onChange,onMediaAdded,onUploading,disabled=false}:{disabled?:boolean;html:string;title:string;description:string;media:Record<string,any>[];onChange:(html:string)=>void;onMediaAdded:(m:any)=>void;onUploading:(busy:boolean)=>void}){
 const [blocks,setBlocks]=useState<Block[]>([]),[selected,setSelected]=useState(''),[mode,setMode]=useState<'edit'|'read'>('edit'),[kind,setKind]=useState<BlockKind>('text'),[query,setQuery]=useState(''),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[legacyImage,setLegacyImage]=useState(0);
 const [undo,setUndo]=useState<Block[][]>([]),[redo,setRedo]=useState<Block[][]>([]);
 const current=useRef<Block[]>([]),input=useRef<HTMLInputElement>(null),canvas=useRef<HTMLDivElement>(null),inspector=useRef<HTMLElement>(null),lastEdit=useRef({id:'',at:0});
 useEffect(()=>{const initial=parseBlocks(html,document.createElement('template'));current.current=initial;setBlocks(initial);setSelected(initial[0]?.id||'');},[]);
 const index=blocks.findIndex(b=>b.id===selected), block=blocks[index];
 const [preview,setPreview]=useState<{body:string;html?:string;error?:string}|null>(null);
 useEffect(()=>{
   if(mode!=='read')return;
   const controller=new AbortController();setPreview(null);
   api('admin/reader-preview',{method:'POST',body:JSON.stringify({body:html}),signal:controller.signal})
     .then(result=>{if(!controller.signal.aborted)setPreview({body:html,html:result.html});})
     .catch(err=>{if(!controller.signal.aborted)setPreview({body:html,error:err.message||'预览失败，请重试。'});});
   return ()=>controller.abort();
 },[mode,html]);
 const editCache=useRef(new WeakMap<Block,string>());
 const editHtml=useMemo(()=>blocks.map(b=>{
   const cached=editCache.current.get(b);if(cached!==undefined)return cached;
   const markup=editProjection(renderBlock(b),true).html;editCache.current.set(b,markup);return markup;
 }).join('\n'),[blocks]);
 function commit(next:Block[],group=false){const now=Date.now();if(!group||lastEdit.current.id!==selected||now-lastEdit.current.at>700){setUndo(h=>[...h.slice(-39),current.current]);}lastEdit.current={id:group?selected:'',at:now};setRedo([]);current.current=next;setBlocks(next);onChange(renderBlocks(next));}
 function update(patch:Partial<Block>){commit(current.current.map(b=>b.id===selected?{...b,...patch}:b),true);}
 function select(id:string){setSelected(id);setLegacyImage(0);lastEdit.current={id:'',at:0};}
 function add(){const b=newBlock(kind),next=[...current.current],i=next.findIndex(x=>x.id===selected);next.splice(i<0?next.length:i+1,0,b);commit(next);select(b.id);toast.success('模块已添加，可在编辑栏填写内容。');}
 function move(delta:number){const next=[...current.current];if(index+delta<0||index+delta>=next.length)return;[next[index],next[index+delta]]=[next[index+delta],next[index]];commit(next);}
 function history(direction:'undo'|'redo'){const source=direction==='undo'?undo:redo;if(!source.length)return;const next=source.at(-1)!;if(direction==='undo'){setUndo(source.slice(0,-1));setRedo(r=>[...r,current.current]);}else{setRedo(source.slice(0,-1));setUndo(u=>[...u,current.current]);}current.current=next;setBlocks(next);if(!next.some(b=>b.id===selected))select(next[0]?.id||'');onChange(renderBlocks(next));lastEdit.current={id:'',at:0};}
 useEffect(()=>{const elements=canvas.current?.querySelector('.handbook-body')?.children;if(elements)Array.from(elements).forEach((el,i)=>{const chosen=mode==='edit'&&blocks[i]?.id===selected;el.classList.toggle('hb-selected',chosen);if(mode==='edit'){el.setAttribute('tabindex','0');el.setAttribute('aria-label',`${i+1}. ${blockLabels[blocks[i]?.kind||'legacy']}，选择编辑`);}else{el.removeAttribute('tabindex');el.removeAttribute('aria-label');}});},[blocks,selected,mode]);
 function pick(target:HTMLElement){const parent=canvas.current?.querySelector('.handbook-body');if(!parent)return false;let el:HTMLElement|null=target;while(el&&el.parentElement!==parent)el=el.parentElement;if(!el)return false;const i=Array.from(parent.children).indexOf(el);if(blocks[i]){select(blocks[i].id);const slot=target.closest('[data-retired-slot]');if(slot&&blocks[i].kind==='legacy')setLegacyImage(Number(slot.getAttribute('data-retired-slot')));return true;}return false;}
 function applyImage(targetId:string,m:{url:string;caption:string},imageIndex=0){
  if(!safeUrl(m.url)||retiredUrl(m.url)){setError('旧截图已下线，不能插入。请选择已上传的新图。');return;}
  const next=current.current.map(b=>b.id!==targetId?b:b.kind==='legacy'
   ?{...b,html:changeLegacyImage(b.html||'',imageIndex,m)}:{...b,src:m.url,caption:b.caption||m.caption});
  commit(next);setError('');toast.success('图片已放入选中的位置，请保存草稿。');
 }
 function removeSelectedImage(){
  if(block?.kind!=='legacy')return;
  const html=changeLegacyImage(block.html||'',selectedImage);
  if(html.trim()){commit(current.current.map(b=>b.id===selected?{...b,html}:b));setLegacyImage(0);}
  else{const next=current.current.filter(b=>b.id!==selected);commit(next);select(next[Math.min(index,next.length-1)]?.id||'');}
  toast.success('已移除选中的图片，可用「撤销」恢复。');
 }
 async function upload(file?:File){if(!file||!block)return;const targetId=block.id,imageIndex=selectedImage;setUploading(true);onUploading(true);setError('');try{const form=new FormData();form.set('file',file);form.set('caption',file.name);const d=await api('admin/media',{method:'POST',body:form});onMediaAdded(d.item);applyImage(targetId,d.item,imageIndex);}catch(e){setError(e instanceof Error?e.message:'上传失败，请重试。');}finally{setUploading(false);onUploading(false);if(input.current)input.current.value='';}}
 const oldImages=useMemo(()=>block?.kind==='legacy'?imageChoices(block.html||''):[],[block]);
 const selectedImage=Math.min(legacyImage,Math.max(0,oldImages.length-1));
 const hasRetired=!!block&&(block.kind==='screenshot'?(!block.src||retiredUrl(block.src)):
   oldImages.some(image=>image.retired)||retiredUrl(block.href));
 const hasRetiredReference=useMemo(()=>!!block&&(block.kind==='legacy'?containsRetiredReference(block.html||''):
    retiredUrl(block.src)||retiredUrl(block.href)),[block]);
 const allowedMedia=useMemo(()=>media.filter(m=>!retiredUrl(m.url)),[media]);
 const editableImage=block?.kind==='screenshot'||oldImages.length>0;
 return <section className="block-editor" aria-label="模块编辑器" inert={disabled||uploading||undefined}>
 <div className="block-editor-tools"><div><strong>正文排版</strong><p className="muted">选择阅读区里的模块，在编辑栏填写内容。添加模块后会自动沿用整站样式。</p></div><div className="row-actions"><Button variant={mode==='edit'?'default':'outline'} onClick={()=>setMode('edit')}>编辑模块</Button><Button variant={mode==='read'?'default':'outline'} onClick={()=>setMode('read')}>即时阅读预览</Button></div></div>
 {mode==='edit'&&<div className="block-add controls"><label className="field"><span className="sr-only">模块类型</span><select value={kind} onChange={e=>setKind(e.target.value as BlockKind)}>{Object.entries(blockLabels).filter(([k])=>k!=='legacy').map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label><Button onClick={add}>添加模块</Button><span className="muted">插入在选中模块之后</span><Button variant="outline" disabled={!undo.length} onClick={()=>history('undo')}>撤销</Button><Button variant="outline" disabled={!redo.length} onClick={()=>history('redo')}>重做</Button></div>}
 <div className={'block-editor-layout '+(mode==='read'?'reading-only':'')}>
 <div className="editor-paper" ref={canvas} onClick={e=>{if(mode==='edit'&&pick(e.target as HTMLElement)){e.preventDefault();e.stopPropagation();}}} onKeyDown={e=>{if(mode==='edit'&&(e.key==='Enter'||e.key===' ')&&pick(e.target as HTMLElement)){e.preventDefault();inspector.current?.focus();}}}>
 <article className="article hb-article"><ArticleHeader title={title} description={description}/>{mode==='edit'?<ArticleBody html={editHtml}/>:preview?.body!==html?<p role="status">正在读取读者预览…</p>:preview.error?<p role="alert" className="error-message">{preview.error}</p>:<ArticleBody html={preview.html||''}/>}{!blocks.length&&<p className="empty">正文还没有模块。添加一个标题、正文或截图位置开始编写。</p>}</article></div>
 {mode==='edit'&&<aside className="block-inspector" ref={inspector} tabIndex={-1} aria-label="选中模块的编辑栏">
 <label className="field"><span>选中模块 · {blocks.length} 个</span><select value={selected} onChange={e=>select(e.target.value)}>{!blocks.length&&<option value="">暂无模块</option>}{blocks.map((b,i)=><option key={b.id} value={b.id}>{i+1}. {blockLabels[b.kind]}{b.title?' · '+b.title.slice(0,24):''}</option>)}</select></label>
 {block&&<>{hasRetired&&<p className="muted" role="status">{retiredNotice}</p>}<div className="row-actions"><Button variant="outline" disabled={index===0} onClick={()=>move(-1)}>上移</Button><Button variant="outline" disabled={index===blocks.length-1} onClick={()=>move(1)}>下移</Button><Button variant="outline" disabled={hasRetiredReference} title={hasRetiredReference?'替换旧截图后即可复制模块':undefined} onClick={()=>{const id=crypto.randomUUID(),copy={...structuredClone(block),id,...(block.kind==='heading'?{anchor:'section-'+id}:{})};const next=[...current.current];next.splice(index+1,0,copy);commit(next);select(id);}}>复制模块</Button><Button variant="ghost" onClick={()=>{const next=current.current.filter(b=>b.id!==selected);commit(next);select(next[Math.min(index,next.length-1)]?.id||'');toast.success('模块已删除，可用「撤销」恢复。');}}>删除</Button></div>
 {['heading','note','prompt','screenshot','link'].includes(block.kind)&&<Field label={block.kind==='screenshot'?'截图标题':'标题'} value={block.title} onChange={title=>update({title})}/>}
 {block.kind==='heading'&&<label className="field"><span>标题层级</span><select value={block.level||2} onChange={e=>update({level:Number(e.target.value)})}><option value={2}>小节标题（进入本章目录）</option><option value={3}>次级标题</option></select></label>}
 {['text','note','prompt','screenshot','link'].includes(block.kind)&&<Field multiline label={block.kind==='screenshot'?'截图说明 / 应展示什么':block.kind==='prompt'?'可复制内容':'内容'} value={block.text} onChange={text=>update({text})}/>}
 {block.kind==='link'&&<><Field label="链接地址" value={block.href} onChange={href=>{if(retiredUrl(href)){toast.error('旧截图已下线，不能用作新链接。');return;}update({href});}}/>{block.href&&!safeUrl(block.href)&&<p className="error-message">请填写 https://、http:// 或 / 开头的地址。</p>}</>}
 {(block.kind==='steps'||block.kind==='list')&&<><p className="muted">顺序会自动编号，增删后无需手动调整。</p>{block.items?.map((item,i)=><div className="block-item-fields" key={i}><strong>第 {i+1} 项</strong>{block.kind==='steps'&&<Field label="步骤名称" value={item.title} onChange={title=>update({items:block.items!.map((v,n)=>n===i?{...v,title}:v)})}/>}<Field multiline label={block.kind==='steps'?'操作说明':'检查内容'} value={item.text} onChange={text=>update({items:block.items!.map((v,n)=>n===i?{...v,text}:v)})}/><div className="row-actions"><Button variant="outline" disabled={i===0} onClick={()=>{const items=[...block.items!];[items[i-1],items[i]]=[items[i],items[i-1]];update({items});}}>上移此项</Button><Button variant="ghost" onClick={()=>update({items:block.items!.filter((_,n)=>n!==i)})}>删除此项</Button></div></div>)}<Button variant="outline" onClick={()=>update({items:[...(block.items||[]),{title:'新的步骤',text:''}]})}>添加一项</Button></>}
 {block.kind==='table'&&<><p className="muted">逐格填写；阅读区会自动排成表格。</p><div className="table-fields">{block.headers?.map((h,i)=><div className="table-column" key={i}><Field label={`第 ${i+1} 列名称`} value={h} onChange={value=>update({headers:block.headers!.map((v,n)=>n===i?value:v)})}/><Button variant="ghost" disabled={block.headers!.length<=1} onClick={()=>update({headers:block.headers!.filter((_,n)=>n!==i),rows:block.rows!.map(r=>r.filter((_,n)=>n!==i))})}>删除此列</Button></div>)}<Button variant="outline" disabled={(block.headers?.length||0)>=8} onClick={()=>update({headers:[...block.headers!,'新列'],rows:block.rows!.map(r=>[...r,''])})}>添加列</Button>{block.rows?.map((r,i)=><div className="block-item-fields" key={i}><strong>第 {i+1} 行</strong>{block.headers?.map((h,j)=><Field key={j} label={h||`第 ${j+1} 列`} value={r[j]} onChange={value=>update({rows:block.rows!.map((row,n)=>n===i?row.map((v,k)=>k===j?value:v):row)})}/>)}<Button variant="ghost" onClick={()=>update({rows:block.rows!.filter((_,n)=>n!==i)})}>删除此行</Button></div>)}<Button variant="outline" onClick={()=>update({rows:[...block.rows!,block.headers!.map(()=>'')]})}>添加行</Button></div></>}
 {block.kind==='legacy'&&<LegacyEditor key={block.id} block={block} onChange={html=>update({html})}/>}
 {editableImage&&<><div className="inspector-divider"/><h3>替换这张截图</h3>{oldImages.length>0&&<label className="field"><span>选择原有图片</span><select value={selectedImage} onChange={e=>setLegacyImage(Number(e.target.value))}>{oldImages.map((img,i)=><option value={i} key={i}>{i+1}. {img.name}{img.retired?' · 已下线':''}</option>)}</select></label>}{block.kind==='screenshot'&&<Field label="图注（同时用于图片替代文字）" value={block.caption} onChange={caption=>update({caption})}/>}<Button disabled={uploading} onClick={()=>input.current?.click()}>{uploading?'正在上传…':'上传并放入此位置'}</Button>{oldImages.length>0&&<Button variant="ghost" onClick={removeSelectedImage}>移除选中的图片</Button>}{block.kind==='screenshot'&&block.src&&<Button variant="ghost" onClick={()=>update({src:''})}>移除图片，保留位置</Button>}<p className="muted">PNG、JPEG、WebP、GIF，单张不超过 10 MB。上传后仍需保存草稿或发布。</p>{error&&<p className="error-message" role="alert">{error}</p>}<details className="block-library"><summary>从图库选择</summary><label className="field"><span>查找图片</span><input value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="block-library-grid">{allowedMedia.filter(m=>(m.name+' '+m.caption).toLowerCase().includes(query.toLowerCase())).map(m=><button type="button" key={m.id} disabled={uploading} onClick={()=>applyImage(block.id,m as any,selectedImage)} title={m.caption||m.name}><img src={m.url} alt={m.caption||m.name} loading="lazy"/><span>{m.caption||m.name}</span></button>)}</div></details></>}
 {block.kind==='divider'&&<p className="muted">分隔线使用整站统一的浅灰样式。</p>}</>}
 </aside>}
 </div><input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>upload(e.target.files?.[0])}/>
 </section>;
}
