import seed from '../db/seed.json';
import {firstChapter} from './chapter-one';
import {secondChapter} from './chapter-two';
import {thirdChapter} from './chapter-three';
import {thirdChapter as previousThirdChapter} from './content-history/chapter-three-v1';
import {fourthChapter} from './chapter-four';
import {firstChapter as previousFirstChapter} from './content-history/chapter-one-v1';
import {cleanHtml} from './content';
import {applyScreenshotRevision} from './screenshot-release';
import {applyFifthChapterRevision} from './chapter-five-release';

export const FIRST_CHAPTER_REVISION='content_revision:getting-started:20260910-1';
export const FIRST_CHAPTER_BACKUP='content_backup:getting-started:20260910-1';
export const ONBOARDING_REVISION='content_revision:getting-started:20260910-2';
export const ONBOARDING_BACKUP='content_backup:getting-started:20260910-2';
export const SECOND_CHAPTER_REVISION='content_revision:chatgpt:20260910-1';
export const SECOND_CHAPTER_BACKUP='content_backup:chatgpt:20260910-1';
export const THIRD_CHAPTER_REVISION='content_revision:codex:20260910-1';
export const THIRD_CHAPTER_BACKUP='content_backup:codex:20260910-1';
export const THIRD_SUPPLEMENT_REVISION='content_revision:codex:20260911-1';
export const THIRD_SUPPLEMENT_BACKUP='content_backup:codex:20260911-1';
export const FOURTH_CHAPTER_REVISION='content_revision:desktop:20260911-1';
export const FOURTH_CHAPTER_BACKUP='content_backup:desktop:20260911-1';
type Content={id:string;title:string;description:string;body:string};

// Each user-authorized content release is immutable and applies once. Compare the
// complete expected draft and published content, then back up and replace in one
// transaction. Later owner edits remain authoritative, even after redeployment.
export async function applyRelease(db:D1Database,key:string,backup:string,version:number,original:Content,next:Content){
 if(await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first())return;
 const row:any=await db.prepare('SELECT * FROM chapters WHERE id=?').bind(original.id).first();
 if(!row||row.version!==version||row.deleted_at||row.title!==original.title||row.description!==original.description||row.body!==original.body||row.published_title!==original.title||row.published_description!==original.description||row.published_body!==original.body)return;
 const html=cleanHtml(next.body),now=new Date().toISOString();
 const guard='id=? AND version=? AND deleted_at IS NULL AND title=? AND description=? AND body=? AND published_title=? AND published_description=? AND published_body=? AND NOT EXISTS (SELECT 1 FROM settings WHERE key=?)';
 const expected=[original.id,version,original.title,original.description,original.body,original.title,original.description,original.body,key];
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO settings (key,value) SELECT ?,? FROM chapters WHERE '+guard).bind(backup,JSON.stringify(row),...expected),
  db.prepare('UPDATE chapters SET title=?,description=?,body=?,published_title=?,published_description=?,published_body=?,updated_at=?,published_at=?,version=version+1 WHERE '+guard).bind(next.title,next.description,html,next.title,next.description,html,now,now,...expected),
  db.prepare('INSERT OR IGNORE INTO settings (key,value) SELECT ?,? FROM chapters WHERE id=? AND version=? AND body=? AND published_body=?').bind(key,now,original.id,version+1,html,html),
 ]);
}
export async function applyFirstChapterRevision(db:D1Database){
 const original=seed.chapters.find(c=>c.id===firstChapter.id)!;
 await applyRelease(db,FIRST_CHAPTER_REVISION,FIRST_CHAPTER_BACKUP,1,original,previousFirstChapter);
 await applyRelease(db,ONBOARDING_REVISION,ONBOARDING_BACKUP,2,{...previousFirstChapter,body:cleanHtml(previousFirstChapter.body)},firstChapter);
}
export async function applySecondChapterRevision(db:D1Database){
 const original=seed.chapters.find(c=>c.id===secondChapter.id)!;
 await applyRelease(db,SECOND_CHAPTER_REVISION,SECOND_CHAPTER_BACKUP,1,original,secondChapter);
}
export async function applyThirdChapterRevision(db:D1Database){
 const original=seed.chapters.find(c=>c.id===thirdChapter.id)!;
 await applyRelease(db,THIRD_CHAPTER_REVISION,THIRD_CHAPTER_BACKUP,1,original,previousThirdChapter);
 await applyRelease(db,THIRD_SUPPLEMENT_REVISION,THIRD_SUPPLEMENT_BACKUP,2,{...previousThirdChapter,body:cleanHtml(previousThirdChapter.body)},thirdChapter);
}
export async function applyFourthChapterRevision(db:D1Database){
 const original=seed.chapters.find(c=>c.id===fourthChapter.id)!;
 await applyRelease(db,FOURTH_CHAPTER_REVISION,FOURTH_CHAPTER_BACKUP,1,original,fourthChapter);
}
export async function applyContentRevisions(db:D1Database){
 await applyFirstChapterRevision(db);
 await applySecondChapterRevision(db);
 await applyThirdChapterRevision(db);
 await applyFourthChapterRevision(db);
 await applyFifthChapterRevision(db);
 await applyScreenshotRevision(db);
}
