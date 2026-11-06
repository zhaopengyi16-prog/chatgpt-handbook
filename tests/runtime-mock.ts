// Test-only adapters; never imported by production.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export const sqlite=new DatabaseSync(':memory:');
for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()) sqlite.exec(readFileSync('drizzle/'+name,'utf8'));
function prepare(sql:string){
 return {bind(...args:any[]){return statement(sql,args);},...statement(sql,[])};
}
function statement(sql:string,args:any[]){
 // D1 executes a batch in one transaction without yielding between statements.
 const runSync=()=>{
  const stmt=sqlite.prepare(sql);
  if(/^\s*SELECT\b/i.test(sql)) return {results:stmt.all(...args),meta:{changes:0},success:true};
  const r=stmt.run(...args);return {results:[],meta:{changes:Number(r.changes)},success:true};
 };
 return {
  runSync,
  async first(){return sqlite.prepare(sql).get(...args)||null;},
  async all(){return {results:sqlite.prepare(sql).all(...args),success:true};},
  async run(){return runSync();},
 };
}
const objects=new Map<string,Uint8Array>();
export const env={HANDBOOK_OWNER_EMAIL:'owner@handbook.test',DB:{prepare,async batch(stmts:any[]){sqlite.exec('BEGIN');try{const result=stmts.map(s=>s.runSync());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}},BUCKET:{async put(k:string,b:ArrayBuffer){objects.set(k,new Uint8Array(b));},async get(k:string){const b=objects.get(k);return b?{body:b}:null;},async delete(k:string){objects.delete(k);}}};
let current=new Headers();
export function setHeaders(h:Headers){current=h;}
export async function headers(){return current;}
export function redirect(path:string){throw new Error('REDIRECT:'+path);}
export function notFound():never{throw new Error('NOT_FOUND');}
