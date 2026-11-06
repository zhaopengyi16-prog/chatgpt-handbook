import { env } from 'cloudflare:workers';
import seed from '../db/seed.json';
import { getChatGPTUser } from '../app/chatgpt-auth';
import {applyContentRevisions} from './content-revisions';
export function database(): D1Database {
  if (!env.DB) throw new Error('DATABASE_UNAVAILABLE');
  return env.DB;
}
export async function ensureSeed() {
  const db = database();
  if (await db.prepare("SELECT value FROM settings WHERE key = 'seed_v1'").first()) {await applyContentRevisions(db);return;}
  const now = new Date().toISOString();
  const guard = " WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'seed_v1')";
  await db.batch([
    ...seed.chapters.map(c => db.prepare('INSERT OR IGNORE INTO chapters (id,title,description,body,position,published_title,published_description,published_body,published_position,updated_at,published_at) SELECT ?,?,?,?,?,?,?,?,?,?,?' + guard).bind(c.id,c.title,c.description,c.body,c.position,c.title,c.description,c.body,c.position,now,now)),
    ...seed.media.map(m => db.prepare('INSERT OR IGNORE INTO media (id,name,url,caption,mime,created_at) SELECT ?,?,?,?,?,?' + guard).bind(m.id,m.name,m.url,m.caption,'image/png',now)),
    db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('seed_v1','1')"),
  ]);
  await applyContentRevisions(db);
}
export async function identity() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const db = database();
  let owner = await db.prepare("SELECT value FROM settings WHERE key='owner_user_id'").first<{value:string}>();
  const email = (env as unknown as {HANDBOOK_OWNER_EMAIL?:string}).HANDBOOK_OWNER_EMAIL;
  if (!owner && email && user.email.toLowerCase() === email.toLowerCase()) {
    await db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('owner_user_id',?)").bind(user.userId).run();
    owner = await db.prepare("SELECT value FROM settings WHERE key='owner_user_id'").first<{value:string}>();
  }
  return { id: user.userId, name: user.fullName || '读者', admin: owner?.value === user.userId };
}
export async function publicChapters() {
  await ensureSeed();
  return (await database().prepare('SELECT id,published_title AS title,published_description AS description,published_position AS position,published_at FROM chapters WHERE published_body IS NOT NULL AND deleted_at IS NULL ORDER BY published_position,id').all()).results;
}
