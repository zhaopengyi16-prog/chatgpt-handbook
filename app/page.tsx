import {renderCatalogPage} from './catalog';
import type {Query} from '@/lib/public-taxonomy';
export const dynamic='force-dynamic';

export default async function Home({searchParams}:{searchParams:Promise<Query>}) {
  return renderCatalogPage(await searchParams);
}
