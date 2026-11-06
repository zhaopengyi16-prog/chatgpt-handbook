import {database, publicChapters} from './data';
import {decodeTaxonomy} from './taxonomy';
import {TAXONOMY_KEY} from './taxonomy-types';

type Listing = {id:string; title:string; description:string; position:number; published_at:string};
type Chapter = {id:string; title:string; description:string; body:string};
type Selection = {id:string; authorizedPreview:boolean};

// Publish moves chapter/label snapshots in one transaction. Read them in one
// transaction too, so a request cannot pair a new title/body with old labels.
export async function readReaderSnapshot(mayBootstrap:boolean, selected?:Selection) {
  const db=database();
  const statements=[
    db.prepare('SELECT id,published_title AS title,published_description AS description,published_position AS position,published_at FROM chapters WHERE published_body IS NOT NULL AND deleted_at IS NULL ORDER BY published_position,id'),
    db.prepare("SELECT key,value FROM settings WHERE key IN ('seed_v1',?)").bind(TAXONOMY_KEY),
    // Validate even draft/recycle-bin references on the server. Never return this list to readers.
    db.prepare('SELECT id FROM chapters'),
  ];
  if(selected) statements.push(db.prepare(selected.authorizedPreview
    ? 'SELECT id,title,description,body FROM chapters WHERE id=?'
    : 'SELECT id,published_title AS title,published_description AS description,published_body AS body FROM chapters WHERE id=? AND deleted_at IS NULL AND published_body IS NOT NULL'
  ).bind(selected.id));
  let results=await db.batch(statements);
  if(mayBootstrap && !results[2].results.length && !results[1].results.length) {
    // Keep v14 cold start on a completely fresh site. Never replay historical
    // releases on an existing site or seed on preview/invalid taxonomy reads.
    await publicChapters();
    results=await db.batch(statements);
  }
  const [listing,settings,ids,detail]=results;
  const raw=(settings.results as {key:string;value:string}[]).find(s=>s.key===TAXONOMY_KEY)?.value ?? null;
  const state=decodeTaxonomy(raw,new Set((ids.results as {id:string}[]).map(c=>c.id)));
  return {list:listing.results as Listing[],doc:state.state==='ready'?state.doc:null,row:(detail?.results[0] as Chapter|undefined)};
}
