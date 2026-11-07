import {TAXONOMY_MATERIALS,type Category,type Material} from './taxonomy-types';

export const MATERIAL_LABELS:Record<Material,string>={
  grass:'草地',dirt:'泥土',stone:'石头',water:'水面',sand:'沙地',
  wood:'木头',ember:'余烬',gem:'宝石',snow:'雪地',
};

// Resolve from the original stored order, not an index after empty categories
// are hidden. This is presentation only: no backfill or mutation of settings.
export function categoryMaterial(category:Pick<Category,'order'|'material'>):Material {
  return category.material ?? TAXONOMY_MATERIALS[category.order % TAXONOMY_MATERIALS.length];
}
