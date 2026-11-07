import type {Material} from '@/lib/taxonomy-types';
import {CategoryIcon,PixelIcon} from './icon';
export function MaterialCard({href,name,description,count,material,icon='book',label,compact=false}:{href:string;name:string;description?:string;count?:number;material:Material;icon?:string;label?:string;compact?:boolean}) {
 return <a className={'mm-category-card'+(compact?' mm-category-compact':'')} href={href}>
   <div className="mm-card-strip mm-material" data-material={material}><CategoryIcon icon={icon}/>{label&&<span>{label}</span>}</div>
   <div className="mm-card-content"><h3>{name}</h3>{description&&<p>{description}</p>}<div className="mm-card-bottom">{count!==undefined&&<span>{count?count+' 篇教程':'即将上线'}</span>}<PixelIcon name="arrow"/></div></div>
 </a>;
}
