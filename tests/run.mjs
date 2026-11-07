import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readdirSync,mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const folder=readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@0.27.'));
const {build}=require(resolve('node_modules/.pnpm',folder,'node_modules/esbuild/lib/main.js'));
mkdirSync('.sites-runtime/tests',{recursive:true});
// These Node suites assert server behavior and markup; the browser/build checks cover CSS and assets.
await build({entryPoints:['tests/integration.ts','tests/taxonomy.ts','tests/style-preview.ts','tests/catalog-rollout.ts','tests/reading-rollout.ts','tests/session-user.ts'],bundle:true,external:['sanitize-html','react','react-dom','react-dom/server','radix-ui'],loader:{'.css':'empty'},platform:'node',format:'esm',outdir:'.sites-runtime/tests',outExtension:{'.js':'.mjs'},plugins:[{name:'test-only-runtime',setup(b){b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},()=>({path:resolve('tests/runtime-mock.ts')}));}}]});
await import(resolve('.sites-runtime/tests/integration.mjs'));
await import(resolve('.sites-runtime/tests/taxonomy.mjs'));
await import(resolve('.sites-runtime/tests/style-preview.mjs'));

await import(resolve('.sites-runtime/tests/catalog-rollout.mjs'));
await import(resolve('.sites-runtime/tests/reading-rollout.mjs'));
await import(resolve('.sites-runtime/tests/session-user.mjs'));
