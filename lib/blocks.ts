// The database stores readable HTML. These modules round-trip through that HTML,
// so the editor and reader always use the same markup and styles.
export const blockLabels = {heading:'小节标题',text:'正文',note:'提示卡片',steps:'操作步骤',prompt:'提示词 / 代码',table:'对照表格',screenshot:'截图位置',list:'检查清单',link:'参考链接',divider:'分隔线',legacy:'原有排版'};
export type BlockKind = keyof typeof blockLabels;
export type Block = {id:string;kind:BlockKind;title?:string;text?:string;level?:number;anchor?:string;items?:{title:string;text:string}[];headers?:string[];rows?:string[][];src?:string;caption?:string;href?:string;html?:string};
export const escapeHtml = (value:unknown) => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function safeUrl(value:string='') {return /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i.test(value.trim())?value.trim():'';}
export function newBlock(kind:BlockKind):Block {
 const id=crypto.randomUUID();
 return {id,kind,title:kind==='heading'?'新的小节':kind==='screenshot'?'操作截图':kind==='note'?'记住这一点':kind==='prompt'?'复制后试一试':'',text:kind==='screenshot'?'这里将展示关键操作。你可以先按正文完成练习。':kind==='text'?'在这里写下你想分享的内容。':'',level:2,anchor:'section-'+id,items:[{title:'第一步',text:'说明要做什么，以及怎样判断做对了。'}],headers:['项目','说明'],rows:[['示例','填写内容']],src:'',caption:'',href:''};
}
export function renderBlock(b:Block) {
 if(b.kind==='legacy')return b.html||'';
 const e=escapeHtml, attrs=`data-content-block="${b.kind}" data-block-id="${e(b.id)}"`;
 const title=`<strong class="hb-title">${e(b.title)}</strong>`, text=`<p class="hb-text">${e(b.text)}</p>`;
 switch(b.kind){
 case 'heading': {const tag=b.level===3?'h3':'h2';return `<${tag} ${attrs} id="${e(b.anchor||'section-'+b.id)}" class="hb-block hb-heading">${e(b.title)}</${tag}>`;}
 case 'text':return `<p ${attrs} class="hb-block hb-text">${e(b.text)}</p>`;
 case 'note':return `<aside ${attrs} class="hb-block hb-note">${title}${text}</aside>`;
 case 'steps':return `<ol ${attrs} class="hb-block hb-steps">${(b.items||[]).map(i=>`<li><strong class="hb-title">${e(i.title)}</strong><p class="hb-text">${e(i.text)}</p></li>`).join('')}</ol>`;
 case 'prompt':return `<div ${attrs} class="hb-block codebox"><div class="codebar"><span class="hb-title">${e(b.title)}</span><button type="button" class="copy">复制</button></div><pre><code>${e(b.text)}</code></pre></div>`;
 case 'table':return `<div ${attrs} class="hb-block table-scroll"><table><thead><tr>${(b.headers||[]).map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${(b.rows||[]).map(r=>`<tr>${(b.headers||[]).map((_,i)=>`<td>${e(r[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 case 'screenshot': {const src=safeUrl(b.src);return `<figure ${attrs} class="hb-block shot hb-screenshot"><div class="hb-shot-heading">${title}</div>${src?`<img src="${e(src)}" alt="${e(b.caption||b.title)}" loading="lazy" />`: '<div class="hb-shot-placeholder"><span class="hb-shot-mark" aria-hidden="true">＋</span><span>截图待补充</span></div>'}<p class="hb-text hb-shot-hint">${e(b.text)}</p><figcaption>${e(b.caption)}</figcaption></figure>`;}
 case 'list':return `<ul ${attrs} class="hb-block hb-checklist">${(b.items||[]).map(i=>`<li>${e(i.text)}</li>`).join('')}</ul>`;
 case 'link':return `<div ${attrs} class="hb-block hb-reference"><a href="${e(safeUrl(b.href))}" target="_blank" rel="noopener noreferrer" class="hb-title">${e(b.title||b.href)}</a>${text}</div>`;
 case 'divider':return `<hr ${attrs} class="hb-block hb-divider" />`;
 }
}
export const renderBlocks=(blocks:Block[])=>blocks.map(renderBlock).join('\n');
export function parseBlocks(html:string,parser:DOMParser|HTMLTemplateElement):Block[] {
 let root:DocumentFragment|HTMLElement;
 if('content' in parser){parser.innerHTML=html;root=parser.content;}
 else{root=parser.parseFromString(html,'text/html').body;}
 const seen=new Set<string>();
 return Array.from(root.childNodes).filter(n=>n.nodeType===1||(n.nodeType===3&&n.textContent?.trim())).map(node=>{
  const el=node.nodeType===1?node as HTMLElement:null, marked=el?.getAttribute('data-content-block');
  const kind=marked&&Object.hasOwn(blockLabels,marked)?marked as BlockKind:'legacy';
  let id=el?.getAttribute('data-block-id')||crypto.randomUUID();if(seen.has(id))id=crypto.randomUUID();seen.add(id);
  const get=(selector:string)=>el?.querySelector(selector)?.textContent||'';
  const b:Block={id,kind};
  // Do not collapse a mixed historical figure to one source, or drop embedded media
  // from another structured block when the author edits a neighbouring paragraph.
  const media=el ? el.querySelectorAll('img,.hb-shot-placeholder').length+Number(el.matches('img,.hb-shot-placeholder')) : 0;
  if(kind==='legacy'||(kind==='screenshot'?media>1:media>0))return {...b,kind:'legacy',html:el?.outerHTML||`<p>${escapeHtml(node.textContent)}</p>`};
  if(kind==='heading')return {...b,title:el!.textContent||'',level:el!.tagName==='H3'?3:2,anchor:el!.id};
  if(kind==='text')return {...b,text:el!.textContent||''};
  if(kind==='note'||kind==='link')return {...b,title:get('.hb-title'),text:get('.hb-text'),...(kind==='link'?{href:el!.querySelector('a')?.getAttribute('href')||''}:{})};
  if(kind==='prompt')return {...b,title:get('.hb-title'),text:get('code')};
  if(kind==='steps'||kind==='list')return {...b,items:Array.from(el!.children).map(li=>({title:li.querySelector('.hb-title')?.textContent||'',text:kind==='steps'?li.querySelector('.hb-text')?.textContent||'':li.textContent||''}))};
  if(kind==='table')return {...b,headers:Array.from(el!.querySelectorAll('thead th')).map(n=>n.textContent||''),rows:Array.from(el!.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.querySelectorAll('td')).map(n=>n.textContent||''))};
  if(kind==='screenshot'){
   const shot={...b,title:get('.hb-title'),text:get('.hb-text'),src:el!.querySelector('img')?.getAttribute('src')||'',caption:get('figcaption')};
   // A nested link, extra paragraph, author-provided attributes, or different
   // markup must survive edits elsewhere. Only use fields when the DOM round-trips.
   const canonical=el!.ownerDocument.createElement('template');canonical.innerHTML=renderBlock(shot);
   return canonical.content.firstElementChild?.isEqualNode(el) ? shot : {...b,kind:'legacy',html:el!.outerHTML};
  }
  return b;
 });
}
