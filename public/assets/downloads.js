(function(){
'use strict';
const encoder=new TextEncoder(),decoder=new TextDecoder();
// Combine our small ZIP assets without recompressing or changing image bytes.
function mergeZip(archives){
 const localParts=[],centralParts=[],seen=new Set();let offset=0,total=0,centralSize=0;
 for(const archive of archives){
  const bytes=archive.bytes instanceof Uint8Array?new Uint8Array(archive.bytes.buffer,archive.bytes.byteOffset,archive.bytes.byteLength):new Uint8Array(archive.bytes);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){if(view.getUint32(p,true)===0x06054b50&&p+22+view.getUint16(p+20,true)===bytes.length){end=p;break;}}
  if(end<0)throw new Error('下载包不完整，请重试');
  const count=view.getUint16(end+10,true);let pos=view.getUint32(end+16,true);
  if(count===65535||view.getUint16(end+4,true)||view.getUint16(end+6,true))throw new Error('不支持的下载包格式');
  for(let i=0;i<count;i++){
   if(pos+46>bytes.length||view.getUint32(pos,true)!==0x02014b50)throw new Error('下载包目录校验失败');
   const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true),size=view.getUint32(pos+20,true);
   const nameLen=view.getUint16(pos+28,true),extraLen=view.getUint16(pos+30,true),commentLen=view.getUint16(pos+32,true),oldOffset=view.getUint32(pos+42,true);
   if((flags&9)||![0,8].includes(method)||oldOffset+30>bytes.length||view.getUint32(oldOffset,true)!==0x04034b50)throw new Error('下载包文件格式不匹配');
   const oldName=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));
   const name=archive.rename?archive.rename(oldName):oldName;
   if(seen.has(name)||name.startsWith('/')||name.split('/').includes('..'))throw new Error('下载包文件路径无效');
   seen.add(name);
   const newName=encoder.encode(name),oldLocalNameLen=view.getUint16(oldOffset+26,true),localExtraLen=view.getUint16(oldOffset+28,true);
   const dataStart=oldOffset+30+oldLocalNameLen+localExtraLen;
   if(dataStart+size>bytes.length||pos+46+nameLen+extraLen+commentLen>bytes.length)throw new Error('下载包内容不完整');
   const local=bytes.slice(oldOffset,oldOffset+30),lv=new DataView(local.buffer);
   lv.setUint16(6,flags|2048,true);lv.setUint16(26,newName.length,true);
   const localExtra=bytes.subarray(oldOffset+30+oldLocalNameLen,dataStart),data=bytes.subarray(dataStart,dataStart+size);
   localParts.push(local,newName,localExtra,data);
   const central=bytes.slice(pos,pos+46),cv=new DataView(central.buffer);
   cv.setUint16(8,flags|2048,true);cv.setUint16(28,newName.length,true);cv.setUint32(42,offset,true);
   const tail=bytes.subarray(pos+46+nameLen,pos+46+nameLen+extraLen+commentLen);
   centralParts.push(central,newName,tail);
   offset+=30+newName.length+localExtraLen+size;centralSize+=46+newName.length+tail.length;total++;
   pos+=46+nameLen+extraLen+commentLen;
  }
 }
 if(total>=65535||offset+centralSize>=4294967295)throw new Error('下载包过大');
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);
 ev.setUint16(8,total,true);ev.setUint16(10,total,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
 return new Blob([...localParts,...centralParts,end],{type:'application/zip'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={mergeZip};
if(typeof document==='undefined')return;
if(location.protocol==='file:'){
 document.querySelectorAll('[data-download-package],.manual-downloads').forEach(e=>e.hidden=true);
 document.querySelectorAll('.offline-download-note').forEach(e=>e.hidden=false);
 return;
}
document.querySelectorAll('[data-download-package]').forEach(button=>button.addEventListener('click',async()=>{
 const kind=button.dataset.downloadPackage,original=button.textContent,status=document.querySelector('.download-status');
 const buttons=[...document.querySelectorAll('[data-download-package]')];buttons.forEach(b=>b.disabled=true);
 button.textContent='正在准备下载…';if(status)status.textContent='正在读取网页文件和原图，请保持页面打开。';
 try{
  const names=[`handbook-${kind}-core.zip`,'handbook-images.zip'];
  const buffers=await Promise.all(names.map(async name=>{const response=await fetch('assets/'+name,{cache:'no-cache'});if(!response.ok)throw new Error('文件暂时不可用，请稍后重试');return new Uint8Array(await response.arrayBuffer());}));
  const rename=kind==='html'?name=>name.replace(/^chatgpt-handbook\/screenshots\//,'chatgpt-handbook-html/assets/screenshots/'):undefined;
  const result=mergeZip([{bytes:buffers[0]},{bytes:buffers[1],rename}]);
  const url=URL.createObjectURL(result),link=document.createElement('a');link.href=url;link.download=`chatgpt-handbook-${kind}.zip`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  if(status)status.textContent=kind==='source'?'源码包已准备好。解压后按 README 修改正文或截图。':'网页版已准备好。解压后打开 index.html 即可阅读。';
 }catch(error){if(status)status.textContent='下载未完成：'+error.message+'。也可以使用下方的手动下载入口。';}
 finally{buttons.forEach(b=>b.disabled=false);button.textContent=original;}
}));
})();
