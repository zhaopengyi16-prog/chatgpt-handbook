import {renderCatalogPage} from '@/app/catalog';
import type {Query} from '@/lib/public-taxonomy';
export const dynamic='force-dynamic';

export default async function Tool({params,searchParams}:{params:Promise<{tool:string}>;searchParams:Promise<Query>}) {
  return renderCatalogPage(await searchParams,{group:'tools',id:(await params).tool});
}
