import { env } from 'cloudflare:workers';
import { database, ensureSeed, identity, publicChapters } from '@/lib/data';
import { guestIdentity, guestCookie, allowGuestSubmission } from '@/lib/guests';
import { cleanHtml, CATEGORIES } from '@/lib/content';
import { addedLegacyImageReferences, publicChapterHtml } from '@/lib/legacy-images';
import { isLegacyImageUrl } from '@/lib/legacy-image-url';
import { adminTaxonomy, mutateTaxonomy, readTaxonomy, TaxonomyError } from '@/lib/taxonomy';
import { TAXONOMY_KEY } from '@/lib/taxonomy-types';
import { adminChaptersWithTags, saveChapterWithTags } from '@/lib/chapter-taxonomy-write';
export const dynamic = 'force-dynamic';
class HttpError extends Error { constructor(public status:number, message:string) { super(message); } }
function fail(status:number,message:string): never { throw new HttpError(status,message); }
function assertLegacyReferencesNotAdded(previous:string, next:string, origin:string) {
 if(addedLegacyImageReferences(previous,next,origin)) fail(400,'旧截图已下线，不能新增引用。请上传新图或从图库选择可用图片。');
}
function text(v:unknown,max:number,optional=false) { if(typeof v!=='string'||v.length>max||(!optional&&!v.trim())) fail(400,'请检查必填内容和长度。'); return v.trim(); }
function identifier(v:unknown) { const s=text(v,80); if(!/^[a-z0-9-]+$/.test(s)) fail(400,'编号只能包含小写字母、数字和短横线。'); return s; }
function number(v:unknown,min=0,max=10000) { if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max) fail(400,'数值不正确。'); return v; }
function json(data:unknown,status=200) { return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
async function bounded(req:Request,limit:number) {
 const reader=req.body?.getReader();if(!reader)return new Uint8Array();
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail(413,'上传内容过大，请缩小后重试。');}chunks.push(value);}
 const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}return out;
}
async function handle(req:Request, parts:string[]) {
 try {
  const db=database(), method=req.method, url=new URL(req.url), adminPath=parts[0]==='admin';
  if(!['GET','HEAD'].includes(method) && req.headers.get('origin')!==url.origin) fail(403,'请求来源不正确，请从网站页面重新操作。');
  const readerPreview = adminPath && parts[1]==='reader-preview' && parts.length===2 && method==='POST';
  // Reader hydration and retained R2 images must not replay historical content releases.
  // These read paths still pass all existing identity and permission checks.
  const readerIdentity = parts.length===1 && parts[0]==='me' && method==='GET';
  const readerMedia = parts.length===2 && parts[0]==='media' && method==='GET';
  // The taxonomy initializer checks the existing v14 baseline; never replay old releases here.
  const taxonomyPath = adminPath && parts[1]==='taxonomy';
  if(!readerPreview && !readerIdentity && !readerMedia && !taxonomyPath) await ensureSeed();
  const user=await identity();
  if(adminPath && !user?.admin) fail(user?403:401,'请使用站点所有者账号登录后台。');
  const guestPost = !user && !adminPath && method==='POST' && parts.length===1 && ['topics','replies'].includes(parts[0]);
  if(!['GET','HEAD'].includes(method) && !user && !guestPost) fail(401,'请先登录再操作。');
  const guest = guestPost ? await guestIdentity(req) : null;
  if(guestPost && !guest) fail(401,'请刷新页面并允许本站 Cookie 后再提交游客留言。');
  const authorId = user?.id || guest;
  const pending = !user;
  const now=new Date().toISOString();
  let body:any={};
  if(!['GET','HEAD','DELETE'].includes(method) && !req.headers.get('content-type')?.includes('multipart/form-data')) {
    const raw=new TextDecoder().decode(await bounded(req,650000)); if(raw.length>600000) fail(413,'内容过长，请拆分为多个章节。');
    try { body=JSON.parse(raw); } catch { fail(400,'请求内容无效。'); }
    if(!body || typeof body!=='object' || Array.isArray(body)) fail(400,'请求内容无效。');
  }
  if(parts[0]==='me' && method==='GET') {
    const response=json({user});
    if(!user) { const cookie=await guestCookie(req); if(cookie) response.headers.set('Set-Cookie',cookie); }
    return response;
  }
  if(parts[0]==='chapters' && parts.length===1 && method==='GET') return json({items:await publicChapters()});
  if(taxonomyPath && parts.length===2) {
    if(method==='GET') return json(adminTaxonomy(await readTaxonomy(db)));
    if(method==='POST' || method==='PUT') return json(await mutateTaxonomy(db,method,body));
    if(method==='DELETE') {
      const params=url.searchParams;
      if(req.body || [...params.keys()].length!==3 || !['group','id','revision'].every(k=>params.has(k))) fail(400,'删除分类只接受 group、id、revision 三个查询参数。');
      const revision=params.get('revision')!;
      if(!/^[1-9][0-9]*$/.test(revision) || !Number.isSafeInteger(Number(revision))) fail(400,'分类版本无效。');
      return json(await mutateTaxonomy(db,'DELETE',{group:params.get('group'),id:params.get('id'),expectedRevision:Number(revision)}));
    }
    fail(405,'分类接口不支持此方法。');
  }
  if(readerPreview) return json({html:publicChapterHtml(text(body.body,500000,true),url.origin)});
  if(adminPath && parts[1]==='chapters') {
    const id=parts[2];
    if(method==='GET') return json({items:await adminChaptersWithTags(db)});
    if(method==='POST' && !id) {
      const newId=identifier(body.id);
      if(await db.prepare('SELECT id FROM chapters WHERE id=?').bind(newId).first()) fail(409,'编号已存在，请换一个编号。');
      const html=cleanHtml(text(body.body||'<p>开始编写正文。</p>',500000));
      assertLegacyReferencesNotAdded('',html,url.origin);
      await db.prepare('INSERT INTO chapters (id,title,description,body,position,updated_at) VALUES (?,?,?,?,?,?)').bind(newId,text(body.title,120),text(body.description||'',500,true),html,number(body.position||9,1),now).run();
      return json({id:newId},201);
    }
    const row:any=await db.prepare('SELECT * FROM chapters WHERE id=?').bind(id||'').first();
    if(!row) fail(404,'章节不存在。');
    if(method==='PUT') {
      const action=body.action||'save', version=number(body.version,1,10000000);
      let result;
      if(action==='save'||action==='publish') {
        const title=text(body.title,120), description=text(body.description||'',500,true), html=cleanHtml(text(body.body,500000)), position=number(body.position,1);
        if(row.version!==version||row.deleted_at!==null) fail(409,'该章节已在另一窗口更新，请保留本页内容，刷新列表后重新打开。');
        assertLegacyReferencesNotAdded(row.body,html,url.origin);
        result=await saveChapterWithTags(db,{id,version,publish:action==='publish',title,description,html,position,now,tags:body.tags,expectedRevision:body.expectedRevision});
      } else if(action==='unpublish') {
        result=await db.prepare('UPDATE chapters SET published_body=NULL,published_at=NULL,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(now,id,version).run();
      } else if(action==='restore') {
        result=await db.prepare('UPDATE chapters SET deleted_at=NULL,published_body=NULL,published_at=NULL,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(now,id,version).run();
      } else fail(400,'操作无效。');
      if(!result.meta.changes) fail(409,'该章节已在另一窗口更新，请保留本页内容，刷新列表后重新打开。');
      return json({item:(await adminChaptersWithTags(db,id))[0]});
    }
    if(method==='DELETE') {
      const expected=Number(url.searchParams.get('version'));
      if(!Number.isInteger(expected)) fail(400,'缺少版本号。');
      const result=await db.prepare('UPDATE chapters SET deleted_at=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(now,now,id,expected).run();
      if(!result.meta.changes) fail(409,'章节已更新，请刷新后重试。');
      return json({ok:true});
    }
  }
  if(adminPath && parts[1]==='media') {
    const id=parts[2];
    if(method==='GET') return json({items:(await db.prepare('SELECT * FROM media ORDER BY created_at DESC,id').all()).results});
    if(method==='POST') {
      if(!env.BUCKET) fail(503,'图片存储暂时不可用。');
      const bytesForm=await bounded(req,10*1024*1024+65536);
      const form=await new Response(bytesForm,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData(), file=form.get('file');
      if(!(file instanceof File)||file.size===0||file.size>10*1024*1024) fail(400,'请选择不超过 10 MB 的 PNG、JPEG、WebP 或 GIF 图片。');
      const bytes=await file.arrayBuffer(), a=new Uint8Array(bytes);
      const type=a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71?'image/png':a[0]===255&&a[1]===216&&a[2]===255?'image/jpeg':String.fromCharCode(...a.slice(0,6)).startsWith('GIF8')?'image/gif':String.fromCharCode(...a.slice(0,4))==='RIFF'&&String.fromCharCode(...a.slice(8,12))==='WEBP'?'image/webp':null;
      if(!type) fail(400,'图片格式无效，不支持 SVG 或可执行文件。');
      const mid=crypto.randomUUID(), key='images/'+mid, mediaUrl='/api/media/'+mid;
      await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});
      try { await db.prepare('INSERT INTO media (id,name,url,caption,object_key,mime,created_at) VALUES (?,?,?,?,?,?,?)').bind(mid,file.name.slice(0,200),mediaUrl,text(String(form.get('caption')||file.name),300),key,type,now).run(); }
      catch(e) { await env.BUCKET.delete(key); throw e; }
      return json({item:await db.prepare('SELECT * FROM media WHERE id=?').bind(mid).first()},201);
    }
    const item:any=await db.prepare('SELECT * FROM media WHERE id=?').bind(id||'').first();
    if(!item) fail(404,'图片不存在。');
    if(method==='PUT') { await db.prepare('UPDATE media SET caption=? WHERE id=?').bind(text(body.caption,300),id).run(); return json({ok:true}); }
    if(method==='DELETE') {
      if(isLegacyImageUrl(item.url,url.origin)) fail(409,'旧截图已下线，保留图库记录，不能删除。');
      const used=await db.prepare('SELECT title FROM chapters WHERE instr(body,?)>0 OR instr(COALESCE(published_body,\'\'),?)>0 LIMIT 1').bind(item.url,item.url).first<{title:string}>();
      if(used) fail(409,'图片仍被「'+used.title+'」引用，请先在正文中移除或替换并发布。');
      if(item.object_key) { if(!env.BUCKET) fail(503,'图片存储暂时不可用。'); await env.BUCKET.delete(item.object_key); }
      await db.prepare('DELETE FROM media WHERE id=?').bind(id).run(); return json({ok:true});
    }
  }
  if(parts[0]==='media' && parts[1] && method==='GET') {
    const item:any=await db.prepare('SELECT * FROM media WHERE id=?').bind(parts[1]).first();
    if(!item?.object_key||!env.BUCKET) fail(404,'图片不存在。');
    const object=await env.BUCKET.get(item.object_key); if(!object) fail(404,'图片不存在。');
    return new Response(object.body,{headers:{'Content-Type':item.mime,'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'}});
  }
  if(adminPath && parts[1]==='export' && method==='GET') {
    const contentBackups=(await db.prepare("SELECT key,value FROM settings WHERE key LIKE 'content_backup:%' ORDER BY key").all()).results.map((r:any)=>({key:r.key,chapter:JSON.parse(r.value)}));
    const setting=await db.prepare('SELECT value FROM settings WHERE key=?').bind(TAXONOMY_KEY).first<{value:string}>();
    let taxonomyBackup:unknown=null;
    if(setting) { try { taxonomyBackup=JSON.parse(setting.value); } catch { taxonomyBackup=setting.value; } }
    const data={format:'handbook-backup-v1',exportedAt:now,[TAXONOMY_KEY]:taxonomyBackup,contentBackups,chapters:(await db.prepare('SELECT * FROM chapters').all()).results,media:(await db.prepare('SELECT * FROM media').all()).results,topics:(await db.prepare('SELECT * FROM topics').all()).results,replies:(await db.prepare('SELECT * FROM replies').all()).results};
    return new Response(JSON.stringify(data,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="handbook-backup.json"','Cache-Control':'no-store'}});
  }
  if(adminPath && parts[1]==='review') {
    if(method==='GET' && parts.length===2) {
      const page=Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||1)));
      const items=(await db.prepare("SELECT 'topic' AS kind,id,title,body,author_name,created_at,version,NULL AS topic_id,0 AS parent_hidden FROM topics WHERE moderation_status='pending' UNION ALL SELECT 'reply' AS kind,r.id,t.title,r.body,r.author_name,r.created_at,r.version,r.topic_id,t.hidden AS parent_hidden FROM replies r JOIN topics t ON t.id=r.topic_id WHERE r.moderation_status='pending' ORDER BY created_at,id LIMIT 20 OFFSET ?").bind((page-1)*20).all()).results;
      const count=await db.prepare("SELECT (SELECT COUNT(*) FROM topics WHERE moderation_status='pending')+(SELECT COUNT(*) FROM replies WHERE moderation_status='pending') AS n").first<{n:number}>();
      return json({items,total:count?.n||0,page});
    }
    const kind=parts[2], id=identifier(parts[3]);
    if(!['topic','reply'].includes(kind)) fail(404,'审核内容不存在。');
    const table=kind==='topic'?'topics':'replies';
    const row:any=await db.prepare('SELECT * FROM '+table+' WHERE id=?').bind(id).first();
    if(!row) fail(404,'内容已被删除，请刷新审核列表。');
    if(method==='PUT' && body.action==='approve') {
      if(row.moderation_status==='approved') return json({ok:true});
      const version=number(body.version,1,10000000);
      if(kind==='reply') {
        const parent:any=await db.prepare('SELECT hidden,moderation_status FROM topics WHERE id=?').bind(row.topic_id).first();
        if(!parent || parent.hidden || parent.moderation_status!=='approved') fail(409,'请先恢复或审核通过关联讨论，再公开这条回复。');
      }
      const result=await db.prepare("UPDATE "+table+" SET moderation_status='approved',updated_at=?,version=version+1 WHERE id=? AND version=? AND moderation_status='pending'").bind(now,id,version).run();
      if(!result.meta.changes) fail(409,'内容已更新，请刷新审核列表。');
      if(kind==='reply') await db.prepare('UPDATE topics SET updated_at=? WHERE id=?').bind(now,row.topic_id).run();
      return json({ok:true});
    }
    if(method==='DELETE') {
      const version=number(Number(url.searchParams.get('version')),1,10000000);
      const result=await db.prepare("DELETE FROM "+table+" WHERE id=? AND version=? AND moderation_status='pending'").bind(id,version).run();
      if(!result.meta.changes) fail(409,'内容状态已变化，请刷新审核列表。');
      return json({ok:true});
    }
    fail(400,'审核操作无效。');
  }
  const topicPath=parts[0]==='topics'||(adminPath&&parts[1]==='topics');
  if(topicPath) {
    const id=parts[adminPath?2:1];
    if(method==='GET'&&!id) {
      const q=(url.searchParams.get('q')||'').slice(0,200), category=url.searchParams.get('category')||'', chapter=url.searchParams.get('chapter')||'';
      const page=Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||1)));
      const where=["t.moderation_status='approved'"], values:any[]=[];
      if(!adminPath) where.push('t.hidden=0');
      if(q){where.push('(t.title LIKE ? OR t.body LIKE ?)');values.push('%'+q+'%','%'+q+'%');}
      if(category){where.push('t.category=?');values.push(category);}
      if(chapter){where.push('t.chapter_id=?');values.push(chapter);}
      const clause=where.join(' AND ');
      const items=(await db.prepare("SELECT t.*, (SELECT COUNT(*) FROM replies r WHERE r.topic_id=t.id AND r.moderation_status='approved') AS reply_count FROM topics t WHERE "+clause+' ORDER BY t.pinned DESC,t.updated_at DESC LIMIT 20 OFFSET ?').bind(...values,(page-1)*20).all()).results;
      const total=await db.prepare('SELECT COUNT(*) AS n FROM topics t WHERE '+clause).bind(...values).first<{n:number}>();
      return json({items:items.map((x:any)=>({...x,author_id:undefined,can_edit:!!user&&(user.admin||user.id===x.author_id)})),total:total?.n||0,page});
    }
    if(method==='POST'&&!id) {
      const title=text(body.title,160), message=text(body.body,20000), authorName=text(body.authorName,40), category=text(body.category,40), topicId=identifier(body.id);
      if(!CATEGORIES.includes(category)) fail(400,'请选择有效分类。');
      const previous:any=await db.prepare('SELECT author_id,moderation_status FROM topics WHERE id=?').bind(topicId).first();
      if(previous){if(previous.author_id!==authorId) fail(409,'帖子编号冲突，请重试。');return json({id:topicId,pending:previous.moderation_status==='pending'});}
      let chapterId=null;
      if(body.chapterId) { chapterId=identifier(body.chapterId); if(!await db.prepare('SELECT id FROM chapters WHERE id=? AND published_body IS NOT NULL AND deleted_at IS NULL').bind(chapterId).first()) fail(400,'关联章节不可用。'); }
      if(pending) { if(!await allowGuestSubmission(guest!)) fail(429,'游客提交较频繁，请稍后再试。'); }
      else {
        const recent=await db.prepare('SELECT COUNT(*) AS n FROM topics WHERE author_id=? AND created_at>?').bind(authorId,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();
        if((recent?.n||0)>=20) fail(429,'发帖较频繁，请稍后再试。');
      }
      await db.prepare('INSERT INTO topics (id,title,body,category,chapter_id,author_id,author_name,author_kind,moderation_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(topicId,title,message,category,chapterId,authorId,authorName,pending?'guest':'member',pending?'pending':'approved',now,now).run();
      return json({id:topicId,pending},201);
    }
    const topic:any=await db.prepare('SELECT * FROM topics WHERE id=?').bind(id||'').first();
    if(!topic || (topic.moderation_status!=='approved'&&!user?.admin) || (topic.hidden&&!user?.admin&&topic.author_id!==user?.id)) fail(404,'讨论不存在或尚未公开。');
    const canEdit=!!user&&(user.admin||topic.author_id===user.id);
    if(method==='GET') {
      const page=Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||1)));
      const replies=(await db.prepare("SELECT * FROM replies WHERE topic_id=? AND moderation_status='approved' ORDER BY created_at,id LIMIT 30 OFFSET ?").bind(id,(page-1)*30).all()).results;
      const count=await db.prepare("SELECT COUNT(*) AS n FROM replies WHERE topic_id=? AND moderation_status='approved'").bind(id).first<{n:number}>();
      return json({item:{...topic,author_id:undefined,can_edit:canEdit},replies:replies.map((r:any)=>({...r,author_id:undefined,can_edit:!!user&&(user.admin||r.author_id===user.id)})),total:count?.n||0,page});
    }
    if(method==='PUT') {
      if(!canEdit) fail(403,'只能编辑自己的帖子。');
      const version=number(body.version,1,10000000);
      let result;
      if(body.moderate) {
        if(!user?.admin) fail(403,'此操作仅限管理员。');
        result=await db.prepare('UPDATE topics SET pinned=?,locked=?,hidden=?,version=version+1 WHERE id=? AND version=?').bind(number(body.pinned,0,1),number(body.locked,0,1),number(body.hidden,0,1),id,version).run();
      } else {
        if(topic.locked&&!user?.admin) fail(403,'讨论已锁定。');
        const category=text(body.category,40);if(!CATEGORIES.includes(category)) fail(400,'分类无效。');
        result=await db.prepare('UPDATE topics SET title=?,body=?,category=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(text(body.title,160),text(body.body,20000),category,now,id,version).run();
      }
      if(!result.meta.changes) fail(409,'帖子已更新，请刷新后重试。'); return json({ok:true});
    }
    if(method==='DELETE') {
      if(!canEdit) fail(403,'只能删除自己的帖子。');
      await db.batch([db.prepare('DELETE FROM replies WHERE topic_id=?').bind(id),db.prepare('DELETE FROM topics WHERE id=?').bind(id)]);
      return json({ok:true});
    }
  }
  if(parts[0]==='replies') {
    if(method==='POST' && parts.length===1) {
      const topicId=identifier(body.topicId), replyId=identifier(body.id), message=text(body.body,10000), authorName=text(body.authorName,40);
      const previous:any=await db.prepare('SELECT author_id,moderation_status FROM replies WHERE id=?').bind(replyId).first();
      if(previous){if(previous.author_id!==authorId) fail(409,'回复编号冲突。');return json({ok:true,pending:previous.moderation_status==='pending'});}
      const topic:any=await db.prepare('SELECT * FROM topics WHERE id=?').bind(topicId).first();
      if(!topic||topic.hidden||topic.moderation_status!=='approved') fail(404,'讨论不存在或尚未公开。');
      if(topic.locked) fail(403,'讨论已锁定，暂不接受回复。');
      if(pending) { if(!await allowGuestSubmission(guest!)) fail(429,'游客提交较频繁，请稍后再试。'); }
      else {
        const recent=await db.prepare('SELECT COUNT(*) AS n FROM replies WHERE author_id=? AND created_at>?').bind(authorId,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();
        if((recent?.n||0)>=60) fail(429,'回复较频繁，请稍后再试。');
      }
      const insert=db.prepare('INSERT INTO replies (id,topic_id,body,author_id,author_name,author_kind,moderation_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(replyId,topicId,message,authorId,authorName,pending?'guest':'member',pending?'pending':'approved',now,now);
      if(pending) await insert.run();
      else await db.batch([insert,db.prepare('UPDATE topics SET updated_at=? WHERE id=?').bind(now,topicId)]);
      return json({ok:true,pending},201);
    }
    const reply:any=await db.prepare('SELECT r.*,t.locked,t.hidden FROM replies r JOIN topics t ON r.topic_id=t.id WHERE r.id=?').bind(parts[1]||'').first();
    if(!reply) fail(404,'回复不存在。');
    if(!user?.admin&&reply.author_id!==user?.id) fail(403,'只能修改自己的回复。');
    if(method==='PUT') {
      if((reply.locked||reply.hidden)&&!user?.admin) fail(403,'该讨论已锁定或隐藏。');
      const result=await db.prepare('UPDATE replies SET body=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(text(body.body,10000),now,parts[1],number(body.version,1,10000000)).run();
      if(!result.meta.changes) fail(409,'回复已更新，请刷新后重试。'); return json({ok:true});
    }
    if(method==='DELETE'){await db.prepare('DELETE FROM replies WHERE id=?').bind(parts[1]).run();return json({ok:true});}
  }
  fail(404,'接口不存在。');
 } catch(e) {
   if(e instanceof TaxonomyError || e instanceof HttpError) return json({error:e.message},e.status);
   console.error('HANDBOOK_API_FAILURE',e instanceof Error?e.name:'Unknown');
   return json({error:'暂时无法完成操作，请保留输入并稍后重试。'},503);
 }
}
async function route(req:Request,context:{params:Promise<{path:string[]}>}) {return handle(req,(await context.params).path);}
export {route as GET,route as POST,route as PUT,route as DELETE};
