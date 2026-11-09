import { PROBE_SENTINELS } from './platform-probe';

// Temporary, owner-gated by route.ts. No app layout, session refresh or external assets.
export function platformProbePage(): Response {
 const nonce=crypto.randomUUID().replaceAll('-','');
 const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>平台只读诊断 · AI 妙妙屋</title>
<style nonce="${nonce}">
*{box-sizing:border-box}body{margin:0;background:#f4efe2;color:#1f2a1c;font:16px/1.8 system-ui,sans-serif}main{max-width:880px;margin:auto;padding:28px 20px}h1{font-size:26px}section{background:#fffdf6;border:3px solid #1f2a1c;box-shadow:4px 4px 0 #1f2a1c;padding:20px;margin:26px 0}button,a{min-height:44px}button{font:inherit;background:#f2c94c;color:#1f2a1c;border:2px solid #1f2a1c;padding:8px 14px;margin:4px;cursor:pointer}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid #1f2a1c;outline-offset:4px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 ui-monospace,monospace}a{color:#25491b;display:inline-block;padding:6px 0}.note{border-left:4px solid #8b5a2b;padding-left:14px}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body><main><a href="#results">跳到诊断结果</a><h1>平台只读诊断</h1>
<p>此入口仅供当前站点所有者临时核验平台能力，不创建账号、不保存设置，也不导出数据库内容到浏览器。</p>
<p class="note">看到请求头不等于证明可信。结果中的“未验证”不能作为开放注册的依据。完成核验后须经 PR 删除此临时入口。</p>
<section><h2>1. 请求头与入口边界</h2><p>记录头是否存在，绝不显示 IP 或身份原文。边界测试依次发送正常登录、登录加非所有者哨兵、无凭据、无凭据加哨兵四个请求。</p>
<button type="button" data-action="headers">查看脱敏头信息</button><button type="button" id="boundary">运行四步外部头测试</button>
<p>测试只覆盖当前代码使用的四个身份头，不代表所有同前缀头。这里不会伪造所有者身份。</p></section>
<section><h2>2. PBKDF2-SHA256</h2><p>每次只运行一档、使用临时随机输入。服务端时钟可能冻结；下方浏览器往返耗时包括网络、鉴权、D1 和计算，不是 PBKDF2 的 CPU 耗时。</p>
<button type="button" data-action="pbkdf2-600000">测试 600,000 次</button><button type="button" data-action="pbkdf2-100000">测试 100,000 次</button></section>
<section><h2>3. D1 原生导出能力</h2><p>只读检查估算大小后，尝试原生 dump，并仅报告文件头/大小验证结果。超过 8 MiB 或无法取得估算时跳过。成功也不代表已具备私有落盘和恢复验证。</p>
<button type="button" data-action="d1-export">检查原生导出</button></section>
<section id="results" tabindex="-1"><h2>诊断结果</h2><p id="status" role="status" aria-live="polite">尚未运行。</p><pre id="output">没有测量结果。</pre></section>
<a href="/admin">返回后台</a></main>
<script nonce="${nonce}">
'use strict';
const endpoint='/api/admin/platform-probe';
const sentinels=${JSON.stringify(PROBE_SENTINELS)};
const output=document.getElementById('output');
const status=document.getElementById('status');
const records=[];
async function requestProbe(action,credentials='same-origin',spoof=false){
 const started=performance.now();
 try{
  const response=await fetch(endpoint,{method:'POST',credentials,redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json',...(spoof?sentinels:{})},body:JSON.stringify({action})});
  const payload=response.headers.get('content-type')?.includes('application/json')?await response.json():null;
  const recognized=response.ok&&payload?.probe==='platform-probe-v1';
  return {action,credentials,sentinelsSent:spoof,httpStatus:response.status,recognized,roundTripMs:Math.round((performance.now()-started)*100)/100,roundTripIncludes:'网络、鉴权、D1、计算及读取响应',...(recognized?{result:payload.result}:{result:null,notice:'未取得有效诊断结果；拒绝、重定向或登录页不能证明头已被剥离。'})};
 }catch{
  return {action,credentials,sentinelsSent:spoof,httpStatus:null,recognized:false,roundTripMs:Math.round((performance.now()-started)*100)/100,notice:'请求失败或被重定向，结论未知；不自动重试，也不自动降低迭代次数。'};
 }
}
async function run(task){
 document.querySelectorAll('button').forEach(button=>button.disabled=true);
 status.textContent='诊断中，请勿重复提交。';
 try{records.push(await task());output.textContent=JSON.stringify(records,null,2);status.textContent='本次请求结束。请按运行说明核对证据，未验证项仍需核实。';}
 catch{status.textContent='未完成诊断，结论未知。';}
 finally{document.querySelectorAll('button').forEach(button=>button.disabled=false);}
}
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>run(()=>requestProbe(button.dataset.action))));
document.getElementById('boundary').addEventListener('click',()=>run(async()=>{
 const baseline=await requestProbe('headers');
 if(!baseline.recognized)return {kind:'boundary',baseline,verdict:'unverified',notice:'所有者基线失败，停止本轮。'};
 const authenticatedSentinel=await requestProbe('headers','same-origin',true);
 const anonymousBaseline=await requestProbe('headers','omit');
 const anonymousSentinel=await requestProbe('headers','omit',true);
 const observed=authenticatedSentinel.result?.identityHeaders?.observations;
 const testedHeadersNotForwarded=authenticatedSentinel.recognized&&Array.isArray(observed)&&observed.length===Object.keys(sentinels).length&&observed.every(row=>row.sentinelPresent===false);
 return {kind:'boundary',baseline,authenticatedSentinel,anonymousBaseline,anonymousSentinel,testedHeadersNotForwarded,verdict:'requires-review',notice:'true 仅支持本轮四个哨兵未转发（被剥离或覆盖）；不是全部 oai-* 头、访客 IP 或任意部署的信任证明。匿名状态须结合实际入口响应审核，不能单凭 401/403 判断。'};
}));
</script></body></html>`;
 return new Response(html,{headers:{
  'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
 }});
}
