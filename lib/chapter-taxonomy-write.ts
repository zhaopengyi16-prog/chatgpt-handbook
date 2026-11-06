// Keep the chapter version and its draft/published tag snapshots in one D1 transaction.
import { nextTaxonomy, normalizeTags, readTaxonomy, serializeTaxonomy, TaxonomyError } from './taxonomy';
import { getChapterTags, TAXONOMY_KEY } from './taxonomy-types';

type ChapterInput = {
  id: string; version: number; publish: boolean; title: string; description: string;
  html: string; position: number; now: string; tags?: unknown; expectedRevision?: unknown;
};

const activeVersion = 'id=? AND version=? AND deleted_at IS NULL';
const conflict = () => new TaxonomyError(409, '章节或分类已在另一窗口更新，请保留输入，重新读取后再保存。');

function chapterUpdate(db: D1Database, input: ChapterInput, guard: string, guardArgs: string[]) {
  const {id, version, publish, title, description, html, position, now} = input;
  const fields = [title, description, html, position];
  const published = publish ? ',published_title=?,published_description=?,published_body=?,published_position=?,published_at=?' : '';
  return db.prepare(
    'UPDATE chapters SET title=?,description=?,body=?,position=?' + published +
    ',updated_at=?,version=version+1 WHERE ' + activeVersion + ' AND ' + guard
  ).bind(...fields, ...(publish ? [...fields, now] : []), now, id, version, ...guardArgs);
}

export async function saveChapterWithTags(db: D1Database, input: ChapterInput) {
  const current = await readTaxonomy(db);
  const hasTags = input.tags !== undefined, hasRevision = input.expectedRevision !== undefined;
  if ((hasTags && !hasRevision) || (hasRevision && (!Number.isSafeInteger(input.expectedRevision) || Number(input.expectedRevision) < 1))) {
    throw new TaxonomyError(400, '保存标签时需要有效的分类版本。');
  }
  if (current.state !== 'ready') {
    if (current.state === 'invalid') throw new TaxonomyError(409, current.message);
    if (hasTags || hasRevision) throw conflict();
    // An old editor may have opened before the first initialization. If initialization
    // wins the race, do not let an unguarded publish create an unsnapshotted chapter.
    return chapterUpdate(db, input, 'NOT EXISTS (SELECT 1 FROM settings WHERE key=?)', [TAXONOMY_KEY]).run();
  }

  if (hasRevision && input.expectedRevision !== current.doc.revision) throw conflict();
  const tags = hasTags ? normalizeTags(input.tags, current.doc) : getChapterTags(current.doc.chapterTags, input.id);
  const next = nextTaxonomy(current.doc);
  next.chapterTags = {...next.chapterTags, [input.id]: tags};
  if (input.publish) next.publishedChapterTags = {...next.publishedChapterTags, [input.id]: structuredClone(tags)};
  const serialized = serializeTaxonomy(next);

  // If the claim changes zero rows, the unique writeToken inside serialized cannot
  // match the second statement. A D1 batch is atomic even if the second SQL fails.
  const [claim, chapter] = await db.batch([
    db.prepare('UPDATE settings SET value=? WHERE key=? AND value=? AND EXISTS (SELECT 1 FROM chapters WHERE ' + activeVersion + ')')
      .bind(serialized, TAXONOMY_KEY, current.raw, input.id, input.version),
    chapterUpdate(db, input, 'EXISTS (SELECT 1 FROM settings WHERE key=? AND value=?)', [TAXONOMY_KEY, serialized]),
  ]);
  if (!claim.meta.changes || !chapter.meta.changes) throw conflict();
  return chapter;
}

export async function adminChaptersWithTags(db: D1Database, id?: string) {
  // Capture the settings revision first. If another writer wins before the rows
  // are fetched, either this revision or the returned chapter version rejects a stale save.
  const state = await readTaxonomy(db);
  const query = id === undefined
    ? db.prepare('SELECT * FROM chapters ORDER BY position,id')
    : db.prepare('SELECT * FROM chapters WHERE id=?').bind(id);
  const {results} = await query.all<{id:string} & Record<string, unknown>>();
  return results.map(row => state.state === 'ready'
    ? {...row, tags: getChapterTags(state.doc.chapterTags, row.id), expectedRevision: state.doc.revision}
    : row);
}
