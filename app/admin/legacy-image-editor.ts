// Parse into a template: its descendants never become live images while we inspect
// original HTML, even if the rich-text editor is about to mount the result.
import {isLegacyImageUrl} from '@/lib/legacy-image-url';

export const retiredNotice = '旧截图已下线，请替换或删除';
export function retiredUrl(value:string|null|undefined) {
  return !!value && isLegacyImageUrl(value, typeof window==='undefined'?undefined:window.location.origin);
}
function fragment(html:string) {
  const t=document.createElement('template');t.innerHTML=html;return t;
}
function targets(root:Pick<ParentNode,'querySelectorAll'>) {
  return Array.from(root.querySelectorAll<HTMLElement>('img,.hb-shot-placeholder'))
    .filter(el=>!el.parentElement?.closest('.hb-shot-placeholder'));
}
function retired(el:HTMLElement) {
  return el.classList.contains('hb-shot-placeholder')||retiredUrl(el.getAttribute('src'));
}
export function containsRetiredReference(html:string) {
  return Array.from(fragment(html).content.querySelectorAll('img[src],a[href]'))
    .some(el=>retiredUrl(el.getAttribute(el.tagName==='IMG'?'src':'href')));
}
export function imageChoices(html:string) {
  return targets(fragment(html).content).map(el=>({
    name:el.getAttribute('alt')||el.closest('figure')?.querySelector('figcaption')?.textContent||'截图位置',
    retired:retired(el),
  }));
}

// This projection is strictly for the editing surface (never for reader HTML).
// One root per input block is retained, including a standalone retired image.
// originals stay private to this projection and can only be restored once per slot.
export function editProjection(html:string,oneRoot=false) {
  const t=fragment(html),originals=new Map<string,Node>();
  const found=targets(t.content);
  found.forEach((el,i)=>{
    if(!retired(el))return;
    const index=String(i),marker=document.createElement('span');
    marker.dataset.retiredSlot=index;marker.contentEditable='false';marker.className='badge';
    const mixed=el.closest('figure')?.querySelectorAll('img').length;
    marker.textContent=retiredNotice+(mixed&&mixed>1?'（同框有多张图，公开时整框隐藏；请分开处理）':'');
    originals.set(index,el.cloneNode(true));el.replaceWith(marker);
  });
  // Rich text can acquire sibling elements as it is edited. The canvas still
  // needs one focusable root per source block; this wrapper is display-only.
  if(oneRoot && (t.content.childElementCount!==1 || Array.from(t.content.childNodes).some(n=>n.nodeType===3&&n.textContent?.trim()))){
    const wrapper=t.content.ownerDocument.createElement('div');wrapper.appendChild(t.content);t.content.appendChild(wrapper);
  }
  return {html:t.innerHTML,originals};
}
export function originalFromSurface(surface:HTMLElement, originals:Map<string,Node>) {
  const t=document.createElement('template');t.content.append(...Array.from(surface.childNodes,n=>n.cloneNode(true)));
  const used=new Set<string>();
  t.content.querySelectorAll('[data-retired-slot]').forEach(marker=>{
    const key=marker.getAttribute('data-retired-slot')!,original=originals.get(key);
    if(original&&!used.has(key)){used.add(key);marker.replaceWith(original.cloneNode(true));}else{marker.remove();}
  });
  return t.innerHTML;
}

export function changeLegacyImage(html:string, index:number, media?:{url:string;caption:string}) {
  const t=fragment(html),old=targets(t.content)[index];
  if(!old || (media && retiredUrl(media.url)))return html;
  const link=old.closest('a'),figure=old.closest('figure');
  const singleLink=link && targets(link).length===1;
  const singleFigure=figure && targets(figure).length===1;
  if(media){
    const img=old.tagName==='IMG'?old:t.content.ownerDocument.createElement('img');
    img.setAttribute('src',media.url);img.setAttribute('alt',media.caption);img.removeAttribute('width');img.removeAttribute('height');
    if(img!==old)old.replaceWith(img);
    if(singleLink)link!.setAttribute('href',media.url);
    if(singleFigure){const cap=figure!.querySelector('figcaption');if(cap)cap.textContent=media.caption;}
  }else{
    old.remove();
    if(singleLink && !link!.textContent?.trim()&&!link!.querySelector('img'))link!.remove();
    if(singleFigure){
      // Remove a caption-only frame, but never sacrifice prose, a table or other images.
      const rest=figure!.cloneNode(true) as Element;
      rest.querySelectorAll('figcaption,.hb-shot-heading,.hb-shot-hint').forEach(el=>el.remove());
      if(!rest.textContent?.trim()&&!rest.querySelector('img,table,hr'))figure!.remove();
    }
  }
  return t.innerHTML;
}
