import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readdirSync,mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const folder=readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@0.27.'));
const {build}=require(resolve('node_modules/.pnpm',folder,'node_modules/esbuild/lib/main.js'));
mkdirSync('.sites-runtime/tests',{recursive:true});
await build({entryPoints:['tests/integration.ts'],bundle:true,external:['sanitize-html'],platform:'node',format:'esm',outfile:'.sites-runtime/tests/integration.mjs',plugins:[{name:'test-only-runtime',setup(b){b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},()=>({path:resolve('tests/runtime-mock.ts')}));}}]});
await import(resolve('.sites-runtime/tests/integration.mjs'));
