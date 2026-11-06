import { database, identity, listPublishedChapters, publicChapters } from './data';
import { publicChapterHtml } from './legacy-images';

// The reader uses the current site's origin, including when served on a custom domain.
export function readerOrigin(headers: {get(name: string): string | null}): string | undefined {
  const host = headers.get('host');
  if (!host || /[\s/@\\?#,]/.test(host)) return;
  const protocol = headers.get('x-forwarded-proto')?.split(',')[0].trim()
    || (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https');
  if (protocol !== 'https' && protocol !== 'http') return;
  try { return new URL(protocol + '://' + host).origin; } catch { return; }
}

type ReaderRow = {id:string; title:string; description:string; body:string};
export async function readChapterForReader(input: {id:string; preview:boolean; origin?:string}) {
  const db = database();
  let list = await listPublishedChapters();
  // Preserve first-visit setup on a completely new site only. Reading an existing
  // chapter or preview must not replay historical releases, even if a marker is missing.
  if (!input.preview && !list.length && !await db.prepare(
    "SELECT 1 FROM settings WHERE key='seed_v1' UNION ALL SELECT 1 FROM chapters LIMIT 1"
  ).first()) list = await publicChapters();
  const preview = input.preview && !!(await identity())?.admin;
  const row = await db.prepare(preview
    ? 'SELECT id,title,description,body FROM chapters WHERE id=?'
    : 'SELECT id,published_title AS title,published_description AS description,published_body AS body FROM chapters WHERE id=? AND deleted_at IS NULL AND published_body IS NOT NULL'
  ).bind(input.id).first<ReaderRow>();
  const chapter = row
    ? { id:row.id, title:row.title, description:row.description, html:publicChapterHtml(row.body,input.origin) }
    : null;
  return {list,chapter,preview};
}
