import {identity} from './data';
import {readReaderSnapshot} from './reader-snapshot';
import {chapterLabels} from './public-taxonomy';
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

export async function readChapterForReader(input: {id:string; preview:boolean; origin?:string}) {
  const preview = input.preview && !!(await identity())?.admin;
  const {list,doc,row} = await readReaderSnapshot(!input.preview,{id:input.id,authorizedPreview:preview});
  const labels = row && doc ? chapterLabels(doc,input.id,preview) : null;
  const chapter = row
    ? { id:row.id, title:row.title, description:row.description, html:publicChapterHtml(row.body,input.origin) }
    : null;
  return {list,chapter,preview,labels};
}
