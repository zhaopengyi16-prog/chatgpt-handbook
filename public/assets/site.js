(()=>{'use strict';
const config=window.HANDBOOK_COMMUNITY||{};
const sidebar=document.querySelector('.sidebar');
const toggle=document.querySelector('.menu-toggle');
const toast=document.querySelector('.toast');
let toastTimer;
function closeMenu(){sidebar?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');}
toggle?.addEventListener('click',()=>{const open=sidebar.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('click',e=>{if(sidebar&&!sidebar.contains(e.target)&&!toggle?.contains(e.target))closeMenu();if(e.target.closest('.subnav a'))closeMenu();});
async function copyText(value){
 if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(value);return true;}catch{}}
 const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();let success=false;try{success=document.execCommand('copy');}catch{}field.remove();return success;
}
document.addEventListener('click',async e=>{const button=e.target.closest('.copy');if(!button)return;const code=button.closest('.codebox').querySelector('code');const ok=await copyText(code.textContent);button.textContent=ok?'已复制':'请手动复制';if(!ok){const range=document.createRange();range.selectNodeContents(code);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}toast.textContent=ok?'提示词已复制':'已选中文字，可手动复制';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.textContent='';button.textContent='复制';},2400);});
const headings=[...document.querySelectorAll('.article h2[id]')];
const outline=[...document.querySelectorAll('.outline a[href^="#"]')];
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{const current=entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(current){outline.forEach(a=>a.classList.toggle('current',a.hash==='#'+current.target.id));}},{rootMargin:'-90px 0px -60% 0px',threshold:0});headings.forEach(h=>observer.observe(h));}
let printClosed=[];window.addEventListener('beforeprint',()=>{printClosed=[...document.querySelectorAll('details:not([open])')];printClosed.forEach(d=>d.open=true);});window.addEventListener('afterprint',()=>{printClosed.forEach(d=>d.open=false);});
// A stable chapter id, rather than a title or hash route, keeps comments attached after edits.
const loadButton=document.querySelector('[data-load-discussion]');
loadButton?.addEventListener('click',()=>{
 if(!config.enabled||!config.repo||!config.repoId||!config.categoryId)return;
 const host=document.querySelector('.giscus');
 if(!host||host.dataset.requested==='true')return;
 if(location.protocol==='file:'){document.querySelector('.discussion-status').textContent='本地文件不能登录讨论。请在在线网站打开，或前往 GitHub 讨论区。';return;}
 host.dataset.requested='true';loadButton.disabled=true;loadButton.textContent='正在加载讨论';
 const script=document.createElement('script');script.src='https://giscus.app/client.js';script.async=true;script.crossOrigin='anonymous';
 const attrs={'data-repo':config.repo,'data-repo-id':config.repoId,'data-category':config.category,'data-category-id':config.categoryId,'data-mapping':'specific','data-term':'handbook:v3:'+document.body.dataset.chapter,'data-strict':'1','data-reactions-enabled':'1','data-emit-metadata':'0','data-input-position':'top','data-theme':'light','data-lang':'zh-CN','data-loading':'lazy'};
 Object.entries(attrs).forEach(([k,v])=>script.setAttribute(k,v));
 let timeout=setTimeout(()=>{document.querySelector('.discussion-status').textContent='讨论加载较慢，可使用下方 GitHub 入口继续。';},15000);
 script.onload=()=>{loadButton.hidden=true;document.querySelector('.discussion-status').textContent='评论由 GitHub 提供。若未能显示，可通过下方入口参与。';clearTimeout(timeout);};
 script.onerror=()=>{clearTimeout(timeout);script.remove();delete host.dataset.requested;loadButton.disabled=false;loadButton.textContent='重新加载讨论';document.querySelector('.discussion-status').textContent='暂时无法加载评论，请重试或在 GitHub 中打开。';};
 host.append(script);
});
})();
