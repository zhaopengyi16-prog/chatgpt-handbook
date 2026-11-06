import { database } from './data';

const COOKIE = '__Host-handbook-guest';
const LIFETIME = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');

async function signingKey() {
  const db = database();
  let row = await db.prepare("SELECT value FROM settings WHERE key='guest_signing_key'").first<{value:string}>();
  if (!row) {
    const value = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
    await db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('guest_signing_key',?)").bind(value).run();
    row = await db.prepare("SELECT value FROM settings WHERE key='guest_signing_key'").first<{value:string}>();
  }
  return crypto.subtle.importKey('raw', encoder.encode(row!.value), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}

// This cookie only identifies anonymous submissions. It never grants account or edit permissions.
export async function guestIdentity(req: Request): Promise<string|null> {
  const cookie = (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if (!cookie || cookie.length > 160) return null;
  const [id, issued, signature, extra] = cookie.split('.');
  if (extra || !/^[a-f0-9-]{36}$/.test(id) || !/^\d{10}$/.test(issued) || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
  const age = Date.now()/1000 - Number(issued);
  if (age < -60 || age > LIFETIME) return null;
  const bytes = Uint8Array.from(signature.match(/../g)!, x => parseInt(x,16));
  const valid = await crypto.subtle.verify('HMAC', await signingKey(), bytes, encoder.encode(id+'.'+issued));
  return valid ? 'guest:'+id : null;
}

export async function guestCookie(req: Request): Promise<string|null> {
  if (await guestIdentity(req)) return null;
  const value = crypto.randomUUID()+'.'+Math.floor(Date.now()/1000);
  const signature = hex(await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(value)));
  return `${COOKIE}=${value}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${LIFETIME}`;
}

export async function allowGuestSubmission(id: string): Promise<boolean> {
  const db = database(), hour = Math.floor(Date.now()/3600000), expires = (hour+1)*3600000;
  await db.prepare('DELETE FROM guest_limits WHERE expires_at<=?').bind(Date.now()).run();
  // Atomic counters remain effective across concurrent requests. A shared ceiling also
  // bounds submissions when browsers discard cookies; no IP addresses are collected.
  for (const [key, limit] of [[`browser:${id}:${hour}`,5],[`site:${hour}`,60]] as const) {
    const result = await db.prepare('INSERT INTO guest_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(key,expires,limit).first();
    if (!result) return false;
  }
  return true;
}
