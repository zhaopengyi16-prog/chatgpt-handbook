import type {ReactNode} from 'react';
export function ArticleHeader({title,description}:{title:string;description:string}){
 return <header className="chapter-intro"><p className="home-label">ChatGPT 使用手册</p><h1>{title}</h1><p>{description}</p></header>;
}
export function ArticleBody({html,children}:{html:string;children?:ReactNode}){
 return <><div className="handbook-body" dangerouslySetInnerHTML={{__html:html}}/>{children}</>;
}
