import {renderCatalogPage} from '@/app/catalog';
import type {Query} from '@/lib/public-taxonomy';
export const dynamic='force-dynamic';

export default async function Learn({params,searchParams}:{params:Promise<{task:string}>;searchParams:Promise<Query>}) {
  return renderCatalogPage(await searchParams,{group:'tasks',id:(await params).task});
}
