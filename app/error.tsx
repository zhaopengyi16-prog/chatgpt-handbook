'use client';
export default function Error({reset}:{reset:()=>void}){return <main id="main" className="wide mm-state-page"><p className="home-label">AI 妙妙屋</p><h1>暂时无法加载页面</h1><p>请稍后重试。</p><button className="button" onClick={reset}>重新加载</button></main>;}
