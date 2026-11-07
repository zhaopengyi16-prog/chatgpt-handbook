'use client';

import { useRef, useState, type FormEvent } from 'react';

type Scene = 'all' | 'modeling' | 'coding' | 'engineering';
type IconName = 'cube' | 'code' | 'ruler' | 'arrow' | 'check' | 'spark';

/** Original icons drawn on a 16 × 16 integer grid. */
function PixelIcon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    cube: 'M8 1 15 5V11L8 15 1 11V5L8 1ZM1 5 8 9 15 5M8 9V15M5 3 12 7',
    code: 'M5 3 1 8 5 13M11 3 15 8 11 13M9 1 7 15',
    ruler: 'M2 1H6V10H15V14H2V1ZM3 4H6M3 7H6M9 11V14M12 11V14',
    arrow: 'M2 8H14M9 3 14 8 9 13',
    check: 'M2 8 6 12 14 3',
    spark: 'M7 1H9V6H14V8H9V13H7V8H2V6H7V1M13 12H15V14H13V12',
  };
  return <svg className={`sp-icon ${className}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="miter" strokeLinecap="square" aria-hidden="true"><path d={paths[name]} /></svg>;
}

const scenes: { id: Exclude<Scene, 'all'>; title: string; icon: IconName; description: string; lesson: string; label: string }[] = [
  { id: 'modeling', title: 'AI 三维建模', icon: 'cube', description: '从一个几何体开始，把空间里的想法变成形状。', lesson: '用 Blender 搭出第一个小场景', label: 'Blender · 基础教程' },
  { id: 'coding', title: '写代码', icon: 'code', description: '说清目标，读懂改动，和 AI 一起完成第一个项目。', lesson: '让 Codex 读懂你的项目', label: 'ChatGPT 与 Codex · 基础教程' },
  { id: 'engineering', title: '做工程', icon: 'ruler', description: '把零散的任务，组织成可以检查和复用的工作流。', lesson: '为项目建立一份清晰的任务说明', label: 'ChatGPT 与 Codex · 基础教程' },
];

const prompt = '请先阅读这个项目的 README 和目录结构，用我能理解的语言说明：\n1. 这个项目解决什么问题？\n2. 我应该从哪个文件开始看？\n3. 如果要增加一个功能，建议先做什么？\n先给阅读结果和计划，等我确认后再修改文件。';

export default function StyleDemo({ theme }: { theme: 'original' | 'pixel' }) {
  const [scene, setScene] = useState<Scene>('all');
  const [difficulty, setDifficulty] = useState<'基础教程' | '高级技巧'>('基础教程');
  const [copyStatus, setCopyStatus] = useState('');
  const [title, setTitle] = useState('');
  const [formScene, setFormScene] = useState('coding');
  const [formError, setFormError] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [forumState, setForumState] = useState<'ready' | 'loading' | 'empty' | 'error'>('ready');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const visibleScenes = scenes.filter((item) => scene === 'all' || scene === item.id);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus('已复制，可以粘贴到你的对话中。');
    } catch {
      setCopyStatus('暂时无法自动复制，请选中下方文字手动复制。');
    }
  }

  function submitDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = title.trim().length < 5;
    setFormError(invalid);
    setFormSuccess(!invalid);
    if (invalid) titleInput.current?.focus();
  }

  return (
    <main id="main" className="style-preview" data-theme={theme}>
      <a className="sp-skip" href="#sp-article">跳到示例正文</a>
      <div className="sp-reviewbar">
        <div><strong>风格实验室</strong><span>管理员预览 · 相同内容，比较两种样式</span></div>
        <nav aria-label="预览样式" className="sp-theme-switch">
          <a href="?theme=original" aria-current={theme === 'original' ? 'page' : undefined}>当前样式</a>
          <a href="?theme=pixel" aria-current={theme === 'pixel' ? 'page' : undefined}>像素样式</a>
        </nav>
      </div>
      <div className="sp-canvas">
        <header className="sp-topbar">
          <a className="sp-brand" href="#sp-hero-title"><span className="sp-brandmark"><PixelIcon name="spark" /></span>AI 共学手册<span className="sp-preview-tag">样例</span></a>
          <nav className="sp-desktop-nav" aria-label="示例站点导航"><a href="#sp-scenes">探索教程</a><a href="#sp-community">一起讨论</a><a href="#sp-components">组件展示</a></nav>
          <button ref={menuButton} className="sp-button sp-menu-button" type="button" aria-expanded={menuOpen} aria-controls="sp-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false); }}>菜单 <span aria-hidden="true">{menuOpen ? '−' : '+'}</span></button>
        </header>
        <nav className="sp-mobile-menu" id="sp-mobile-menu" hidden={!menuOpen} aria-label="示例手机导航" onKeyDown={(event) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}><a href="#sp-scenes" onClick={() => setMenuOpen(false)}>探索教程</a><a href="#sp-community" onClick={() => setMenuOpen(false)}>一起讨论</a><a href="#sp-components" onClick={() => setMenuOpen(false)}>组件展示</a></nav>
        <div className="sp-content">
          <section className="sp-hero" aria-labelledby="sp-hero-title">
            <div className="sp-hero-copy">
              <p className="sp-kicker"><span className="sp-status-square" aria-hidden="true" /><span className="sp-pixel">LEARN · BUILD · SHARE</span></p>
              <h1 id="sp-hero-title">把想法，<br />一步步搭出来。</h1>
              <p className="sp-intro">从你想完成的事开始。<br />学一点、做一点，在讨论中一起把问题弄明白。</p>
              <div className="sp-actions"><a className="sp-button sp-primary" href="#sp-scenes">找到我的起点 <PixelIcon name="arrow" /></a><a className="sp-text-link" href="#sp-article">看看教程怎么读 <span aria-hidden="true">↗</span></a></div>
              <p className="sp-hero-note">目标清楚 · 步骤可循 · 人人可以提问</p>
            </div>
            <div className="sp-project-card box">
              <div className="sp-project-top"><span className="sp-pixel">YOUR NEXT BUILD</span><span aria-hidden="true">↗</span></div>
              <div className="sp-project-visual" aria-hidden="true"><div className="sp-grid-floor" /><svg viewBox="0 0 240 160" className="sp-cube-art"><path d="M120 20 188 56V112L120 148 52 112V56Z" fill="#E3EADF" stroke="#384638" strokeWidth="2" /><path d="M52 56 120 92 188 56M120 92V148" fill="none" stroke="#384638" strokeWidth="2" /><path d="M120 20 188 56 120 92 52 56Z" fill="#fff" stroke="#384638" strokeWidth="2" /><path d="M120 92 188 56V112L120 148Z" fill="#285741" stroke="#384638" strokeWidth="2" /><path d="M86 38 154 74M154 38 86 74M86 74V130M52 84 120 120M120 120 188 84M154 74V130" fill="none" stroke="#384638" strokeWidth="2" /><path d="M154 74V130M120 120 188 84" fill="none" stroke="#A8BFA7" strokeWidth="2" /><rect x="208" y="34" width="8" height="8" fill="#285741" /><rect x="25" y="102" width="6" height="6" fill="#384638" /></svg><span className="sp-visual-label">小目标，大进步。</span></div>
              <div className="sp-project-bottom"><span className="sp-index sp-pixel">01</span><div><strong>从第一个小项目开始</strong><span>先完成，再慢慢完善。</span></div><PixelIcon name="arrow" /></div>
            </div>
          </section>

          <section className="sp-section" id="sp-scenes" aria-labelledby="sp-scenes-title">
            <div className="sp-section-heading"><div><p className="sp-kicker sp-pixel">01 / FIND YOUR PATH</p><h2 id="sp-scenes-title">你想做什么？</h2></div><span className="sp-section-note">场景卡片与筛选样例</span></div>
            <div className="sp-filters"><div className="sp-chip-group" role="group" aria-label="筛选示例场景">{([{ id: 'all', title: '全部场景' }, ...scenes] as { id: Scene; title: string }[]).map((item) => <button className="sp-chip" key={item.id} type="button" aria-pressed={scene === item.id} onClick={() => setScene(item.id)}>{scene === item.id && <PixelIcon name="check" />}{item.title}</button>)}</div><div className="sp-difficulty" role="group" aria-label="示例难度">{(['基础教程', '高级技巧'] as const).map((item) => <button type="button" key={item} aria-pressed={difficulty === item} onClick={() => setDifficulty(item)}>{item}</button>)}</div></div>
            <div className="sp-scene-grid">{visibleScenes.map((item) => <a className="sp-scene-card box" href="#sp-article" key={item.id}><div className="sp-card-top"><span className="sp-icon-box"><PixelIcon name={item.icon} /></span><span className="sp-card-number sp-pixel">0{scenes.indexOf(item) + 1}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="sp-card-bottom"><span>进入{difficulty}</span><PixelIcon name="arrow" /></div></a>)}</div>
            <p className="sp-selection-note" aria-live="polite">正在展示 {visibleScenes.length} 个场景的{difficulty}样例。这里的筛选只用于体验，不改变网站分类。</p>
          </section>

          <section className="sp-reading-section sp-section" aria-labelledby="sp-reading-title">
            <div className="sp-section-heading"><div><p className="sp-kicker sp-pixel">02 / ONE STEP AT A TIME</p><h2 id="sp-reading-title">让阅读，回到内容本身。</h2></div><span className="sp-section-note">正文与目录样例</span></div>
            <div className="sp-reading-layout">
              <aside className="sp-reading-aside"><details className="sp-toc" open><summary>这篇教程的目录</summary><nav aria-label="示例教程目录"><a href="#sp-article">开始之前</a><a href="#sp-step-one">01 · 先建立共同认识</a><a href="#sp-step-two">02 · 给出清晰的边界</a><a href="#sp-checklist">03 · 检查你的结果</a><span className="sp-toc-label">更多章节 · 样例</span><a href="#sp-scenes">认识工具与环境</a><a href="#sp-components">继续探索常用操作</a></nav></details><div className="sp-margin-note"><PixelIcon name="spark" /><strong>先理解，再动手。</strong><p>不用一次学会全部。完成一个小步骤，就离目标近一点。</p></div></aside>
              <article className="sp-article" id="sp-article" tabIndex={-1} aria-labelledby="sp-article-title">
                <div className="sp-article-header"><p className="sp-breadcrumb">写代码 <span aria-hidden="true">/</span> ChatGPT 与 Codex</p><div className="sp-article-labels"><span className="sp-tag">基础教程</span><span>阅读样例 · 约 3 分钟</span></div><h2 id="sp-article-title">让 Codex 读懂你的项目</h2><p>好的协作，从共享同一份背景开始。先让 AI 看清项目的目标、结构和约束，再把想法交给它实现。</p></div>
                <div className="sp-note"><span className="sp-note-symbol" aria-hidden="true">i</span><div><strong>这一节，你将学会</strong><p>用一段明确的说明建立项目上下文，并在修改前检查 AI 是否理解了你的意图。这是排版样例，不是已发布教程。</p></div></div>
                <h3 id="sp-step-one"><span className="sp-step-index sp-pixel">01</span>先建立共同认识</h3><p>打开项目后，不急着提出一长串功能。先描述你要解决的问题，让 Codex 阅读现有说明，并复述它的理解。</p>
                <ol className="sp-steps"><li><strong>说清目标。</strong> 你希望谁在什么场景下完成什么事？</li><li><strong>补充背景。</strong> 提供项目说明、相关文件和已有约定。</li><li><strong>确认计划。</strong> 先讨论步骤，再决定是否开始修改。</li></ol>
                <figure className="sp-figure"><div className="sp-figure-label"><span>项目工作区</span><span className="sp-tag">原创示意图</span></div><img src="/assets/style-preview/project-workspace.svg" width="960" height="520" alt="原创工作区示意图：左侧是项目文件，中间阅读任务说明，右侧确认协作计划；并非真实软件截图。" loading="lazy" /><figcaption>示意图：把文件、目标与执行计划放在同一个上下文里。正式教程图片由作者在后台上传。</figcaption></figure>
                <h3 id="sp-step-two"><span className="sp-step-index sp-pixel">02</span>给出清晰的边界</h3><p>一句“帮我做好”还不够具体。告诉 AI 哪些可以修改、哪些需要保留，以及你希望如何验收结果。</p>
                <div className="sp-prompt"><div className="sp-block-heading"><strong>可以这样开始</strong><button className="sp-button sp-copy" type="button" onClick={copyPrompt}>复制提示词 <span aria-hidden="true">⧉</span></button></div><p className="sp-prompt-text">{prompt}</p><p className="sp-live-status" aria-live="polite">{copyStatus || '复制后，按你的项目情况补充具体信息。'}</p></div>
                <p>先确认工作区的状态，也能帮助你辨认之后发生了哪些改动。例如，下面这条命令用于查看 Git 工作区状态：</p>
                <div className="sp-code-block"><div className="sp-code-label"><span>终端 · 只读检查</span><span>Shell</span></div><pre tabIndex={0} aria-label="Git 状态命令，可横向滚动"><code><span className="sp-code-comment"># 查看当前分支与文件改动</span>{'\n'}git status --short --branch</code></pre></div>
                <h3 id="sp-checklist"><span className="sp-step-index sp-pixel">03</span>检查你的结果</h3><p>把“看起来完成了”变成可以回答的检查项。遇到偏差时，说明具体表现，比重新下达整个任务更有效。</p>
                <div className="sp-table-scroll" role="region" aria-label="协作检查表，可横向滚动" tabIndex={0}><table><caption>协作前后的三个检查点</caption><thead><tr><th scope="col">检查什么</th><th scope="col">怎样判断</th><th scope="col">下一步</th></tr></thead><tbody><tr><th scope="row">目标</th><td>复述是否准确，没有遗漏条件</td><td>确认理解</td></tr><tr><th scope="row">范围</th><td>改动是否都在约定范围内</td><td>阅读差异</td></tr><tr><th scope="row">结果</th><td>关键流程是否按预期运行</td><td>记录验证</td></tr></tbody></table></div>
                <div className="sp-article-end"><PixelIcon name="check" /><p><strong>完成一个小循环。</strong><br />说明目标 → 确认理解 → 检查结果。</p><a className="sp-button" href="#sp-discussion-form">就这一节提问 <PixelIcon name="arrow" /></a></div>
              </article>
            </div>
          </section>

          <section className="sp-section" id="sp-components" aria-labelledby="sp-components-title"><div className="sp-section-heading"><div><p className="sp-kicker sp-pixel">03 / SMALL DETAILS MATTER</p><h2 id="sp-components-title">每一步，都有清楚的反馈。</h2></div><span className="sp-section-note">按钮、表单与状态</span></div>
            <div className="sp-components-grid"><section className="sp-panel box"><h3>操作与状态</h3><p>不只靠颜色区分。选中、等待与完成，都有相应的文字说明。</p><div className="sp-button-samples"><a className="sp-button sp-primary" href="#sp-discussion-form">开始提问 <PixelIcon name="arrow" /></a><a className="sp-button" href="#sp-article">返回教程</a><button className="sp-button sp-selected" type="button" onClick={() => setDifficulty(difficulty === '基础教程' ? '高级技巧' : '基础教程')}><PixelIcon name="check" /> 切换难度：{difficulty}</button><button className="sp-button" type="button" disabled>暂不可用</button><button className="sp-button" type="button" disabled aria-busy="true">正在提交…</button></div><div className="sp-state-note"><PixelIcon name="check" /><div><strong>完成状态样例</strong><p>更改已准备好，可以继续检查。</p></div></div><p className="sp-small-note">试着用 Tab 键移动焦点，查看清楚可见的焦点边框。</p></section>
              <form className="sp-panel box sp-form" id="sp-discussion-form" onSubmit={submitDemo} noValidate><div className="sp-form-heading"><h3>把你的问题说具体</h3><span className="sp-tag">本地演示</span></div><p>这里只演示输入和反馈，不会发送或保存帖子。</p><label htmlFor="sp-title">问题标题 <span>（必填）</span></label><input ref={titleInput} id="sp-title" required value={title} onChange={(e) => { setTitle(e.target.value); setFormSuccess(false); }} placeholder="例如：如何确认 AI 只修改了指定文件？" aria-invalid={formError} aria-describedby={formError ? 'sp-title-help sp-form-error' : 'sp-title-help'} maxLength={100} /><p className="sp-field-hint" id="sp-title-help">至少 5 个字，写出你遇到的具体问题。</p>{formError && <p className="sp-form-error" id="sp-form-error" role="alert">! 请填写至少 5 个字的问题标题。</p>}<label htmlFor="sp-form-scene">关联场景</label><select id="sp-form-scene" value={formScene} onChange={(event) => setFormScene(event.target.value)}>{scenes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><div className="sp-form-actions"><button className="sp-button sp-primary" type="submit">体验提交反馈 <PixelIcon name="arrow" /></button><span>不会公开发布</span></div><p className="sp-live-status" role="status">{formSuccess ? '✓ 演示校验通过。你的输入只留在当前页面，没有提交到服务器。' : '试试空标题，或填好标题后提交。'}</p></form></div>
          </section>

          <section className="sp-section sp-community" id="sp-community" aria-labelledby="sp-community-title"><div className="sp-section-heading"><div><p className="sp-kicker sp-pixel">04 / BETTER TOGETHER</p><h2 id="sp-community-title">一个人的疑问，大家的经验。</h2></div><a className="sp-button" href="#sp-discussion-form">发起讨论 <PixelIcon name="arrow" /></a></div><div className="sp-community-toolbar"><p>先看看别人如何解决，再分享你的尝试。</p><div className="sp-chip-group" role="group" aria-label="论坛状态演示">{([{ key: 'ready', label: '有讨论' }, { key: 'loading', label: '加载中' }, { key: 'empty', label: '空列表' }, { key: 'error', label: '加载失败' }] as const).map((item) => <button type="button" className="sp-chip" key={item.key} aria-pressed={forumState === item.key} onClick={() => { setForumState(item.key); setSelectedTopic(null); }}>{item.label}</button>)}</div></div>
            <div className="sp-forum-state" aria-live="polite">{forumState === 'ready' ? <><p className="sp-topic-count">2 条示例讨论</p><div className="sp-forum-list">{[{ id: 'start', title: '从零开始做项目，应该先让 AI 写代码吗？', tag: '写代码', replies: '8 条回复', icon: 'code' as const }, { id: 'model', title: 'Blender 第一个场景：你是怎么拆解步骤的？', tag: 'AI 三维建模', replies: '3 条回复', icon: 'cube' as const }].map((topic) => <div className="sp-topic" key={topic.id}><span className="sp-topic-icon"><PixelIcon name={topic.icon} /></span><div><button className="sp-topic-title" type="button" aria-expanded={selectedTopic === topic.id} aria-controls={`sp-topic-${topic.id}`} onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}>{topic.title}</button><div className="sp-topic-meta"><span className="sp-tag">{topic.tag}</span><span>已公开 · 示例作者</span></div><p className="sp-topic-excerpt" id={`sp-topic-${topic.id}`} hidden={selectedTopic !== topic.id}>先描述你想完成的结果，再把任务拆成可以检查的小步骤。这是讨论展开效果的样例，没有读取真实帖子。</p></div><span className="sp-replies">{topic.replies}</span></div>)}</div></> : forumState === 'loading' ? <div className="sp-forum-placeholder" aria-busy="true"><span className="sp-loading-blocks" aria-hidden="true">▪ ▪ ▪</span><h3>正在读取讨论…</h3><p>准备好后再显示讨论数量。</p></div> : forumState === 'error' ? <div className="sp-forum-placeholder"><span className="sp-note-symbol" aria-hidden="true">!</span><h3>暂时没能读取讨论</h3><p>你可以再试一次，已填写的内容会保留。</p><button className="sp-button" type="button" onClick={() => setForumState('ready')}>重新加载</button></div> : <div className="sp-forum-placeholder"><PixelIcon name="spark" /><h3>这里还没有讨论</h3><p>分享你遇到的问题，成为对话的起点。</p><a className="sp-button" href="#sp-discussion-form">写下第一个问题 <PixelIcon name="arrow" /></a></div>}</div>
          </section>
          <footer className="sp-preview-footer"><span className="sp-brandmark"><PixelIcon name="spark" /></span><div><strong>每一个小步骤，都算数。</strong><p>这是独立的样式预览。教程、社区和后台的现有外观保持原样。</p></div><a className="sp-text-link" href="#sp-hero-title">回到顶部 ↑</a></footer>
        </div>
      </div>
    </main>
  );
}
