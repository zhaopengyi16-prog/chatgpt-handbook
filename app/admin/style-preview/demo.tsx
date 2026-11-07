'use client';

import {useRef, useState, type FormEvent} from 'react';
import HouseArt from './house';

type IconName = 'home'|'rooms'|'tools'|'forum'|'updates'|'person'|'code'|'ruler'|'cube'|'web'|'file'|'video'|'image'|'plus'|'arrow'|'check';
type Material = 'grass'|'dirt'|'stone'|'water'|'sand'|'wood'|'ember'|'gem'|'snow';

// Original line icons, drawn on a 16 × 16 grid. No icon-pack or game artwork.
function Icon({name}: {name:IconName}) {
  const paths:Record<IconName,string> = {
    home:'M1 7 8 1 15 7M3 6V15H13V6M6 15V10H10V15',
    rooms:'M1 1H7V7H1ZM9 1H15V7H9ZM1 9H7V15H1ZM9 9H15V15H9Z',
    tools:'M10 1 15 6 6 15 1 10ZM8 3 13 8M3 8 8 13',
    forum:'M1 2H15V11H6L2 15V11H1Z',
    updates:'M8 1V5M8 11V15M1 8H5M11 8H15M6 6H10V10H6Z',
    person:'M5 1H11V7H5ZM2 15V12L5 9H11L14 12V15',
    code:'M5 3 1 8 5 13M11 3 15 8 11 13M9 1 7 15',
    ruler:'M2 1H6V10H15V14H2ZM3 4H6M3 7H6M9 11V14M12 11V14',
    cube:'M8 1 15 5V11L8 15 1 11V5ZM1 5 8 9 15 5M8 9V15',
    web:'M1 2H15V14H1ZM1 6H15M3 4H4M6 4H7',
    file:'M3 1H10L14 5V15H3ZM10 1V5H14M6 8H11M6 11H11',
    video:'M1 2H15V14H1ZM4 2V14M12 2V14M1 6H4M1 10H4M12 6H15M12 10H15',
    image:'M1 6V1H6M10 1H15V6M15 10V15H10M6 15H1V10M3 12 7 7 10 10 12 8 14 11M10 4H11V5H10Z',
    plus:'M8 1V15M1 8H15', arrow:'M1 8H15M10 3 15 8 10 13', check:'M1 8 6 13 15 3',
  };
  return <svg className="mm-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="square" aria-hidden="true"><path d={paths[name]}/></svg>;
}

const rooms:{id:string;name:string;label:string;icon:IconName;material:Material;description:string;count:number}[] = [
  {id:'coding',name:'写代码',label:'CODE',icon:'code',material:'grass',description:'说清想改什么，让 AI 动手，再验证结果。',count:1},
  {id:'engineering',name:'做工程',label:'BUILD',icon:'ruler',material:'stone',description:'准备环境，把工程任务拆成可验证的小步。',count:1},
  {id:'modeling',name:'AI 建模',label:'3D',icon:'cube',material:'gem',description:'用 AI 辅助 Blender，做出第一个三维模型。',count:0},
  {id:'website',name:'做网站',label:'WEB',icon:'web',material:'water',description:'从页面结构开始，搭出适合手机阅读的网站。',count:0},
  {id:'files',name:'改文件',label:'FILES',icon:'file',material:'sand',description:'批量整理、转换文件，先预览再核对。',count:0},
  {id:'video',name:'做视频',label:'VIDEO',icon:'video',material:'ember',description:'整理脚本和分镜，把素材剪成一段短片。',count:0},
  {id:'images',name:'生图片',label:'IMAGE',icon:'image',material:'wood',description:'说明用途和构图，生成、比较并导出图片。',count:0},
];
const tools:{name:string;label:string;material:Material;count:number}[] = [
  {name:'ChatGPT 与 Codex',label:'GPT',material:'grass',count:6},
  {name:'Claude',label:'CLAUDE',material:'ember',count:0},
  {name:'国内 AI',label:'CN AI',material:'wood',count:0},
  {name:'多模型与开源',label:'MULTI',material:'stone',count:1},
  {name:'智能体',label:'AGENT',material:'gem',count:0},
  {name:'WorkBuddy',label:'WORK',material:'water',count:0},
];
const categories = [
  {name:'使用求助',material:'grass'}, {name:'经验分享',material:'sand'},
  {name:'内容纠错',material:'ember'}, {name:'功能建议',material:'water'},
] as const;
const topics = [
  {title:'Codex 读不到我的项目文件夹怎么办？',category:'使用求助',text:'先检查打开的工作区，再确认项目路径与访问范围。这里展示讨论展开后的阅读效果。'},
  {title:'用 AI 改论文格式的一次实践',category:'经验分享',text:'先保留原件，再拿一小段内容试改，确认格式后再应用到全文。'},
  {title:'第 2 章套餐价格需要更新',category:'内容纠错',text:'补充官方来源和核对日期，让下一位读者也能判断信息是否仍然适用。'},
];
const prompt = '请先阅读项目说明，复述目标和现有约束。\n列出你准备修改的文件，以及每一步怎样验证。\n先给计划，等我确认后再开始修改。';

export default function StyleDemo({theme}:{theme:'original'|'pixel'}) {
  const [language,setLanguage] = useState<'zh'|'en'>('zh');
  const [notice,setNotice] = useState('');
  const [selection,setSelection] = useState<{name:string;description:string}|null>(null);
  const [category,setCategory] = useState<string|null>(null);
  const [empty,setEmpty] = useState(false);
  const [expanded,setExpanded] = useState<number|null>(null);
  const [question,setQuestion] = useState('');
  const [formMessage,setFormMessage] = useState('');
  const [formError,setFormError] = useState(false);
  const [copyMessage,setCopyMessage] = useState('');
  const [activeNav,setActiveNav] = useState('首页');
  const questionRef = useRef<HTMLInputElement>(null);
  const sampleRef = useRef<HTMLDetailsElement>(null);
  const shownTopics = empty ? [] : topics.filter(topic => !category || topic.category === category);

  function showRoom(name:string,description:string) {
    setSelection({name,description});
  }
  function openQuestion() {
    if (sampleRef.current) sampleRef.current.open = true;
    questionRef.current?.focus();
    questionRef.current?.scrollIntoView({block:'center'});
  }
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = question.trim().length < 5;
    setFormError(invalid);
    setFormMessage(invalid ? '请填写至少 5 个字的问题标题。' : '演示校验通过。内容仅留在当前页面，没有发布。');
    if (invalid) questionRef.current?.focus();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(prompt);setCopyMessage('已复制提示词。'); }
    catch {setCopyMessage('暂时无法自动复制，请选中文字手动复制。');}
  }
  function localAccount() {setNotice('这是管理员风格预览。登录和「我的」仅展示入口，不会切换你的账号。');}
  const navigation:{name:string;href:string;icon:IconName}[] = [
    {name:'首页',href:'#mm-home',icon:'home'}, {name:'教程',href:'#mm-rooms',icon:'rooms'},
    {name:'工具',href:'#mm-tools',icon:'tools'}, {name:'论坛',href:'#mm-forum',icon:'forum'},
    {name:'更新',href:'#mm-updates',icon:'updates'},
  ];

  return <main id="main" className="style-preview" data-theme={theme} data-brand="miaomiao">
    <div className="mm-sky" id="mm-home">
      <header className="mm-topbar">
        <a className="mm-brand" href="#mm-home" aria-label="AI 妙妙屋 首页"><span className="mm-logo mm-material" data-material="grass" aria-hidden="true"/><span><strong>AI 妙妙屋</strong><small>MIAOMIAO HOUSE</small></span></a>
        <nav className="mm-inventory" aria-label="示例主导航">{navigation.map(item=><a key={item.name} href={item.href} aria-current={activeNav===item.name?'location':undefined} onClick={()=>setActiveNav(item.name)}><Icon name={item.icon}/><span>{item.name}</span></a>)}</nav>
        <div className="mm-header-actions"><div className="mm-language" role="group" aria-label="语言外观演示"><button type="button" aria-pressed={language==='zh'} onClick={()=>{setLanguage('zh');setNotice('已选择中文。本预览仅演示语言切换状态。');}}>中</button><button type="button" aria-pressed={language==='en'} onClick={()=>{setLanguage('en');setNotice('EN 已选中。本批不提供翻译，内容仍为中文。');}}>EN</button></div><button className="mm-button mm-login" type="button" onClick={localAccount}>登录</button></div>
      </header>
      <section className="mm-hero mm-wrap" aria-labelledby="mm-hero-title">
        <div className="mm-hero-copy"><p className="mm-eyebrow">WELCOME HOME · LEARN SOMETHING NEW</p><h1 id="mm-hero-title">欢迎来到<br/><span>AI 妙妙屋</span></h1><p className="mm-intro">每个房间学一件事：建模、写代码、做网站、做视频……<span className="mm-hero-extra">教程一步步跟着做，</span>卡住了就到论坛里问。</p><div className="mm-hero-actions"><a className="mm-button mm-primary" href="#mm-learning"><span aria-hidden="true">▶</span> 从入门开始</a><a className="mm-button" href="#mm-forum">参与讨论</a></div><div className="mm-hero-badges"><span>7 个场景</span><span>6 组工具</span><span>固定样例 · 非实时统计</span></div></div>
        <div className="mm-house" aria-hidden="true"><HouseArt/><span>MIAOMIAO HOUSE</span></div>
      </section>
    </div>
    <div className="mm-ground" aria-hidden="true"><div className="mm-material" data-material="grass"/><div className="mm-material" data-material="dirt"/></div>
    <div className="mm-wrap mm-content">
      <section className="mm-section" id="mm-rooms" aria-labelledby="mm-rooms-title">
        <div className="mm-section-heading"><div><h2 id="mm-rooms-title">妙妙屋的房间</h2><p>每个房间一个场景，从「基础」走到「高级」。</p></div><a className="mm-text-link" href="#mm-learning">查看学习路线 <Icon name="arrow"/></a></div>
        <div className="mm-room-grid">{rooms.map(room=><button className="mm-room-card" type="button" key={room.id} aria-pressed={selection?.name===room.name} onClick={()=>showRoom(room.name,room.count ? `${room.name}的基础教程样例：先理解目标，再完成一个可以检查的小任务。` : `${room.name}的教程正在编写。这个房间展示「即将上线」状态。`)}><span className="mm-material mm-card-strip" data-material={room.material}><Icon name={room.icon}/><span>{room.label}</span></span><span className="mm-card-content"><strong className="mm-card-name">{room.name}</strong><span className="mm-card-description">{room.description}</span><span className="mm-card-bottom"><span>{room.count ? `${room.count} 篇教程`:'即将上线'}</span><span className="mm-tag">{room.count?'基础':'编写中'}</span></span></span></button>)}<button type="button" className="mm-room-card mm-room-propose" onClick={()=>{setCategory('功能建议');setEmpty(false);document.getElementById('mm-forum')?.scrollIntoView({block:'start'});}}><Icon name="plus"/><strong className="mm-card-name">想学别的？</strong><span>到论坛说说你的想法，<br/>一起添一个新房间。</span></button></div>
        {selection && <div className="mm-selection" role="status"><div><strong>{selection.name}</strong><p>{selection.description}</p></div><button className="mm-button" type="button" onClick={()=>setSelection(null)} aria-label="关闭分类样例">关闭</button></div>}
      </section>
      <section className="mm-section" id="mm-learning" aria-labelledby="mm-learning-title"><div className="mm-section-heading"><div><h2 id="mm-learning-title">学习路线</h2><p>不知道从哪开始？沿着这条路走。</p></div></div><ol className="mm-learning-path"><li><a className="mm-route mm-material" data-material="grass" href="#mm-samples" onClick={()=>{if(sampleRef.current)sampleRef.current.open=true;}}><span>LV.1</span><strong>基础教程</strong><p>认识工具、准备环境，完成第一次尝试。</p></a></li><li><a className="mm-route mm-material" data-material="stone" href="#mm-rooms"><span>LV.2</span><strong>选一个场景</strong><p>写代码、建模或做网站，做出一个小成果。</p></a></li><li><a className="mm-route mm-material" data-material="gem" href="#mm-tools"><span>LV.3</span><strong>高级技巧</strong><p>Skill、插件、多模型，搭建自己的工作流。</p></a></li></ol></section>
      <section className="mm-section" id="mm-tools" aria-labelledby="mm-tools-title"><div className="mm-section-heading"><div><h2 id="mm-tools-title">工具专区</h2><p>同一件事，换个工具怎么做。</p></div><span className="mm-scroll-hint">左右滑动查看更多工具 →</span></div><div className="mm-tools-scroll" role="region" aria-label="工具卡片，可横向滚动" tabIndex={0}><div className="mm-tool-grid">{tools.map(tool=><button className="mm-tool-card" type="button" key={tool.name} onClick={()=>setNotice(`${tool.name}：${tool.count?`${tool.count} 篇教程的列表样例。`:'即将上线。'}当前只演示工具卡片状态。`)}><span className="mm-material mm-tool-strip" data-material={tool.material}><span>{tool.label}</span></span><span className="mm-tool-content"><strong>{tool.name}</strong><span>{tool.count?`${tool.count} 篇`:'即将上线'}</span></span></button>)}</div></div></section>
      <section className="mm-section mm-forum mm-panel" id="mm-forum" aria-labelledby="mm-forum-title"><div className="mm-section-heading"><div><h2 id="mm-forum-title">论坛广场</h2><p>游客也能提问，审核后公开。</p></div><button className="mm-button mm-primary" type="button" onClick={openQuestion}>发起讨论</button></div><div className="mm-forum-filters" role="group" aria-label="讨论用途">{categories.map(item=><button className="mm-filter" type="button" key={item.name} aria-pressed={category===item.name} onClick={()=>{setCategory(category===item.name?null:item.name);setEmpty(false);}}><span className="mm-color-chip" data-material={item.material} aria-hidden="true"/>{item.name}{category===item.name&&<span aria-hidden="true">✓</span>}</button>)}</div>
        <div className="mm-topic-area" aria-live="polite">{shownTopics.length ? <ul className="mm-topics">{shownTopics.map(topic=>{const i=topics.indexOf(topic);return <li key={topic.title}><div className="mm-topic-row"><button className="mm-topic-title" type="button" aria-expanded={expanded===i} aria-controls={`mm-topic-${i}`} onClick={()=>setExpanded(expanded===i?null:i)}><span className="mm-example">示例</span>{topic.title}</button><span className="mm-tag">{topic.category}</span></div><p id={`mm-topic-${i}`} hidden={expanded!==i} className="mm-topic-detail">{topic.text}</p></li>;})}</ul> : <div className="mm-empty"><Icon name="forum"/><h3>这里还没有讨论</h3><p>说说你遇到的问题，让经验从这里开始。</p><button className="mm-button" type="button" onClick={openQuestion}>发起第一个讨论</button></div>}</div><div className="mm-forum-demo"><span>示例话题仅用于展示，不读取线上帖子。</span><button className="mm-text-link" type="button" aria-pressed={empty} onClick={()=>{setEmpty(!empty);setCategory(null);}}>{empty?'查看示例话题':'查看空状态'} <Icon name="arrow"/></button></div>
      </section>
      <section className="mm-section mm-updates mm-panel" id="mm-updates" aria-labelledby="mm-updates-title"><h2 id="mm-updates-title">更新日志</h2><ul><li><span>教程可以按任务来找了</span><span className="mm-update-label">NEW</span></li><li><span>旧截图从阅读页下线</span><span className="mm-update-label">FIX</span></li></ul><p className="mm-update-note">样例记录 · 每一步改进，都留下一块新的积木。</p></section>
    </div>
    <footer className="mm-footer"><div className="mm-material mm-footer-grass" data-material="grass" aria-hidden="true"/><div className="mm-material mm-footer-dirt" data-material="dirt" aria-hidden="true"/><div className="mm-footer-stone mm-material" data-material="stone"><div className="mm-wrap"><strong>AI 妙妙屋 · 开放教程</strong><p>一起学习，一起把想法搭出来。</p><a className="mm-text-link" href="#mm-samples" onClick={()=>{if(sampleRef.current)sampleRef.current.open=true;}}>共建与许可说明 <Icon name="arrow"/></a></div></div></footer>
    <div className="mm-wrap mm-review-area">
      <details className="mm-samples" id="mm-samples" ref={sampleRef}><summary>阅读与组件样例 <span>展开检查按钮、正文、表单</span></summary><div className="mm-sample-body"><div className="mm-review-note"><p><strong>管理员风格预览</strong> · 所有分类、篇数与讨论均为固定样例。共建许可沿用站点现有说明，本页不更改许可或发布正文。</p><nav aria-label="样式对照"><a className="mm-button" href="?theme=pixel" aria-current={theme==='pixel'?'page':undefined}>妙妙屋样式</a><a className="mm-button" href="?theme=original" aria-current={theme==='original'?'page':undefined}>圆角对照</a></nav></div>
      <article className="mm-article"><h2>先理解目标，再开始修改</h2><p>好的协作，从说清楚你想完成的事情开始。先让 AI 阅读项目说明，复述目标与约束，再决定下一步怎样做。</p><h3>把要求变成可以检查的小步骤</h3><p>例如，先确认当前工作区状态，阅读差异，再运行项目已有的验证命令。正文保持系统字体，方便长时间阅读。</p><pre tabIndex={0} aria-label="命令样例"><code>git status --short --branch</code></pre><div className="mm-prompt"><strong>提示词样例</strong><p>{prompt}</p><button className="mm-button" type="button" onClick={copy}>复制提示词</button><span role="status">{copyMessage}</span></div><table><caption>协作前后的检查点</caption><thead><tr><th scope="col">检查项</th><th scope="col">怎样确认</th></tr></thead><tbody><tr><th scope="row">目标</th><td>复述准确，没有遗漏约束</td></tr><tr><th scope="row">范围</th><td>改动都在约定的文件内</td></tr><tr><th scope="row">结果</th><td>关键流程按预期工作</td></tr></tbody></table><figure><img src="/assets/style-preview/project-workspace.svg" width="960" height="520" alt="原创工作区示意图，展示项目文件、任务说明和协作计划。" loading="lazy"/><figcaption>原创示意图 · 非真实产品截图。</figcaption></figure></article>
      <section className="mm-button-showcase" aria-labelledby="mm-buttons-title"><h3 id="mm-buttons-title">按钮状态</h3><div><button className="mm-button mm-primary" type="button" onClick={()=>setNotice('主按钮已响应。')}>主按钮</button><button className="mm-button" type="button" onClick={()=>setNotice('次按钮已响应。')}>次按钮</button><a className="mm-button mm-primary" href="#mm-home">链接按钮</a><button className="mm-button mm-primary" type="button" disabled>暂不可用</button><button className="mm-button" type="button" disabled aria-busy="true">正在提交…</button></div></section>
      <form className="mm-form" onSubmit={submit} noValidate><h3>把问题说具体</h3><p>这里只体验校验，不会保存或发布。</p><label htmlFor="mm-question">问题标题</label><input id="mm-question" ref={questionRef} required minLength={5} maxLength={100} value={question} onChange={event=>{setQuestion(event.target.value);setFormMessage('');setFormError(false);}} aria-invalid={formError} aria-describedby="mm-question-help mm-form-message" placeholder="例如：如何确认 AI 只修改指定文件？"/><p id="mm-question-help">至少 5 个字，写出你遇到的具体问题。</p><label htmlFor="mm-question-room">关联房间</label><select id="mm-question-room">{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select><button className="mm-button mm-primary" type="submit">体验提交反馈</button><p id="mm-form-message" role="status" className={formError?'mm-error':''}>{formMessage}</p></form>
      </div></details>
    </div>
    <div className="mm-announcement" role="status" aria-live="polite">{notice&&<><span>{notice}</span><button type="button" className="mm-button" onClick={()=>setNotice('')}>关闭</button></>}</div>
    <nav className="mm-bottom-nav" aria-label="示例底部导航">{[{name:'首页',href:'#mm-home',icon:'home' as const},{name:'教程',href:'#mm-rooms',icon:'rooms' as const},{name:'论坛',href:'#mm-forum',icon:'forum' as const},{name:'工具',href:'#mm-tools',icon:'tools' as const}].map(item=><a key={item.name} href={item.href} aria-current={activeNav===item.name?'location':undefined} onClick={()=>setActiveNav(item.name)}><Icon name={item.icon}/><span>{item.name}</span></a>)}<button type="button" onClick={localAccount}><Icon name="person"/><span>我的</span></button></nav>
  </main>;
}
