#!/usr/bin/env python3
"""Build a portable, dependency-free tutorial and its public source download."""
from pathlib import Path
from html import escape, unescape
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'
CHAPTERS = json.loads((ROOT / 'content/chapters.json').read_text())
COMMUNITY = json.loads((ROOT / 'config/community.json').read_text())
SHOTS = json.loads((ROOT / 'config/screenshots.json').read_text())
DATE = '2026-09-10'
E = escape

def plain(value):
    return unescape(re.sub(r'<[^>]*>', '', value)).strip()

def repo_url():
    repo = COMMUNITY.get('repo', '')
    if not repo:
        return ''
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        raise ValueError('community.repo must be owner/repository')
    return 'https://github.com/' + repo

REPO = repo_url()
ENABLED = bool(COMMUNITY.get('enabled'))
if ENABLED and not all([REPO, COMMUNITY.get('repoId'), COMMUNITY.get('categoryId')]):
    raise ValueError('Enabled discussions require repo, repoId and categoryId')

def external(url, label, classes=''):
    return f'<a class="{classes}" href="{E(url, quote=True)}" target="_blank" rel="noopener noreferrer">{E(label)}</a>'

def codebox(text, label='可复制模板'):
    return f'<div class="codebox"><div class="codebar"><span>{E(label)}</span><button class="copy" type="button">复制</button></div><pre><code>{E(text)}</code></pre></div>'

def page(title, body, active='home', prefix='', chapter=''):
    nav = [('home', 'index.html', '首页'), ('tutorial', 'chapters/getting-started.html', '教程'), ('community', 'community.html', '讨论'), ('updates', 'updates.html', '更新')]
    links = ''.join(f'<a href="{prefix}{url}"' + (' class="active" aria-current="page"' if key == active else '') + f'>{name}</a>' for key, url, name in nav)
    menu = '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="chapter-menu">目录</button>' if chapter else ''
    config = json.dumps(COMMUNITY, ensure_ascii=False).replace('<', '\\u003c')
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="保留原创大纲的 ChatGPT 与 Codex 中文使用教程。阅读步骤、复制提示词，分享实践和改进建议。"><meta name="theme-color" content="#ffffff"><title>{E(title)} · ChatGPT 使用手册</title><link rel="stylesheet" href="{prefix}assets/site.css"></head>
<body data-chapter="{E(chapter)}"><a class="skip" href="#main">跳到正文</a><header class="header"><a class="brand" href="{prefix}index.html"><span class="brand-mark" aria-hidden="true">AI</span><span>ChatGPT 使用手册</span></a><nav aria-label="主导航">{links}</nav>{menu}</header>
<div class="review-note">保留原稿截图供对照，界面与操作入口可能随版本变化。</div>
{body}
<footer class="footer"><span>ChatGPT 使用手册 · V3.0</span><span><a href="{prefix}contribute.html">参与共建与许可</a> · <a href="{prefix}contribute.html#downloads">下载源码</a></span></footer><div class="toast" role="status" aria-live="polite"></div><script>window.HANDBOOK_COMMUNITY={config};</script><script src="{prefix}assets/site.js" defer></script><script src="{prefix}assets/downloads.js" defer></script></body></html>'''

def prepare_shots():
    ids = set()
    for shot in SHOTS:
        shot.setdefault('id', Path(shot['file']).stem)
        sid = shot['id']
        if sid in ids or not re.fullmatch(r'[a-z0-9-]+', sid):
            raise ValueError('Screenshot ids must be unique lowercase slugs')
        ids.add(sid)
        images = shot.get('images') or [{'file': shot['file']}]
        for item in images:
            path = Path(item['file'])
            if path.is_absolute() or '..' in path.parts or path.parts[0] != 'screenshots':
                raise ValueError('Screenshot paths must stay inside screenshots/')
            local = ROOT / path
            if not local.is_file():
                raise FileNotFoundError(local)
            dest = OUT / 'assets' / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(local, dest)
    (ROOT / 'config/screenshots.json').write_text(json.dumps(SHOTS, ensure_ascii=False, indent=2) + '\n')

def article_content(chapter):
    content = (ROOT / 'content' / chapter['file']).read_text()
    for shot in SHOTS:
        if shot['chapter'] != chapter['id']:
            continue
        original = '../assets/screenshots/' + shot['id'] + '.svg'
        status = shot.get('status')
        caption = shot['caption']
        if status == 'placeholder':
            caption += ' · 截图待补充'
        elif status in ('original', 'original-review'):
            caption += ' · 原稿截图（旧版界面）'
        image_html = ''
        for item in shot.get('images') or [{'file': shot['file']}]:
            src = '../assets/' + item['file']
            width = int(item.get('width', 1200))
            height = int(item.get('height', 520))
            image_html += f'<a href="{E(src)}" target="_blank" rel="noopener noreferrer" aria-label="查看原图：{E(shot["caption"])}"><img src="{E(src)}" width="{width}" height="{height}" loading="lazy" alt="{E(caption)}"></a>'
        figure = f'<figure class="shot" data-shot-id="{E(shot["id"])}">{image_html}<figcaption>{E(caption)}</figcaption></figure>'
        content, count = re.subn(r'<figure class="shot">\s*<img src="' + re.escape(original) + r'"[^>]*>\s*<figcaption>.*?</figcaption>\s*</figure>', lambda _: figure, content, flags=re.S)
        if count != 1:
            raise ValueError(f'Screenshot {shot["id"]}: expected one figure, found {count}')
    headings = []
    used = set()
    def heading(match):
        level, attrs, text = match.groups()
        anchor = re.search(r'\bid="([^"]+)"', attrs)
        hid = anchor.group(1) if anchor else f'section-{len(used) + 1}'
        if hid in used:
            raise ValueError(f'Duplicate heading id {hid}')
        used.add(hid)
        if not anchor:
            attrs += f' id="{hid}"'
        if level == '2':
            headings.append((hid, plain(text)))
        return f'<h{level}{attrs}>{text}</h{level}>'
    content = re.sub(r'<h([2-5])([^>]*)>(.*?)</h\1>', heading, content, flags=re.S)
    return content, headings

def discussion():
    if ENABLED:
        interior = '<p class="hint">分享你的疑问、实践结果和本章修订建议。加载评论后，可使用 GitHub 账号参与。</p><button class="button" data-load-discussion type="button">加载本章讨论</button><p class="hint discussion-status" role="status"></p><div class="giscus"></div><div class="actions">' + external(REPO + '/discussions', '在 GitHub 中打开讨论', 'button') + '</div>'
    else:
        interior = '<div class="empty-state"><strong>讨论尚未开放</strong><p>这里将用于交流本章问题、补充案例和提交勘误。你可以先阅读教程，或参考共建说明整理建议。</p><div class="actions"><a class="button" href="../contribute.html">查看共建说明</a></div></div>'
    return '<section class="discussion" id="discussion" aria-labelledby="discussion-title"><h2 id="discussion-title">围绕这一章，一起讨论</h2>' + interior + '</section>'

def chapter_page(chapter, index):
    content, headings = article_content(chapter)
    side = '<p class="side-caption">学习目录</p>'
    for c in CHAPTERS:
        active = c['id'] == chapter['id']
        side += f'<a class="chapter-link{" active" if active else ""}" href="{c["id"]}.html"' + (' aria-current="page"' if active else '') + f'><span>{c["number"]}</span>{E(c["title"])}</a>'
        if active:
            side += '<div class="subnav">' + ''.join(f'<a href="#{hid}">{E(label)}</a>' for hid, label in headings) + '</div>'
    side += '<div class="side-footer">基于原创手册持续整理。<br>原图已恢复，点击图片可放大。</div>'
    outline = '<strong>本章内容</strong>' + ''.join(f'<a href="#{hid}">{E(label)}</a>' for hid, label in headings) + '<a class="discuss-jump" href="#discussion">↓ 本章讨论</a>'
    prevnext = ''
    if index:
        prev = CHAPTERS[index - 1]
        prevnext += f'<a href="{prev["id"]}.html"><small>上一章</small>{E(prev["title"])}</a>'
    if index + 1 < len(CHAPTERS):
        nxt = CHAPTERS[index + 1]
        prevnext += f'<a class="next" href="{nxt["id"]}.html"><small>下一章</small>{E(nxt["title"])}</a>'
    else:
        prevnext += '<a class="next" href="../community.html"><small>继续交流</small>前往讨论社区</a>'
    body = f'''<div class="shell"><aside class="sidebar" id="chapter-menu" aria-label="章节目录">{side}</aside><main class="article" id="main"><p class="breadcrumb"><a href="../index.html">手册</a> / 第 {int(chapter['number'])} 章</p><header class="article-header"><p class="eyebrow">CHAPTER {chapter['number']}</p><h1>{E(chapter['title'])}</h1><p class="lead">{E(chapter['description'])}</p><div class="meta"><span>更新于 {DATE}</span><span>V3.0</span></div></header>{content}<nav class="page-nav" aria-label="相邻章节">{prevnext}</nav>{discussion()}</main><nav class="outline" aria-label="本页目录">{outline}</nav></div>'''
    return page(chapter['title'], body, 'tutorial', '../', chapter['id'])

def home():
    cards = ''.join(f'<a class="chapter-card" href="chapters/{c["id"]}.html"><span class="number">{c["number"]}</span><div><h3>{E(c["title"])}</h3><p>{E(c["description"])}</p></div><span class="arrow" aria-hidden="true">↗</span></a>' for c in CHAPTERS)
    body = f'''<main class="wide" id="main"><section class="intro"><p class="home-label">一本持续更新的中文实践手册</p><h1>把 AI 用进工作。<br>从一个清楚的任务开始。</h1><p>从 ChatGPT 到 Codex，从第一次提问到完整项目。<br>保留真实使用中积累的方法，也留出一起讨论、修订和补充的空间。</p><div class="actions"><a class="button primary" href="chapters/getting-started.html">开始阅读 <span aria-hidden="true">→</span></a><a class="button" href="community.html">看看讨论社区</a></div><div class="meta"><span>8 个内容单元</span><span>步骤 · 模板 · 实践</span><span>更新于 {DATE}</span></div></section><section aria-labelledby="start-title"><div class="section-label"><h2 id="start-title">按你的任务，找到起点</h2><span>也可以从第一章顺序阅读</span></div><ol class="flow"><li><span>01</span><strong>先建立认识</strong><p>阅读入门说明，确认账号、材料和任务目标。</p></li><li><span>02</span><strong>跟着步骤实践</strong><p>选择聊天或项目任务，复制模板，在自己的示例上尝试。</p></li><li><span>03</span><strong>检查，再交流</strong><p>核对真实结果，记录差异，把经验带回讨论。</p></li></ol></section><section aria-labelledby="contents-title"><div class="section-label"><h2 id="contents-title">完整目录</h2><span>沿用原创手册的大纲</span></div><div class="chapter-list">{cards}</div></section><div class="home-bottom"><section class="quiet-panel"><h2>手册可以一起变得更好</h2><p>一个清晰的问题、一处过时的说明、一份可公开的案例，都能帮助下一位读者。</p><a href="contribute.html">了解如何参与 →</a></section><section class="quiet-panel"><h2>这一版更新了什么？</h2><p>保留章节和操作细节，修正过时结论。原截图已按原稿恢复，可逐张换成新的界面截图。</p><a href="updates.html">查看修订记录 →</a></section></div></main>'''
    return page('从这里开始', body)

def community_page():
    topics = [('01', '使用问答', '描述遇到的问题，附上可复现步骤与已经尝试的方法。'), ('02', '实践分享', '交流自己的工作流程、提示词和可以公开的示例。'), ('03', '内容勘误', '指出过时入口、错误结论或缺少适用条件的步骤。'), ('04', '更新建议', '讨论下一版应该补充的内容与阅读体验。')]
    rows = ''.join(f'<div class="topic"><span class="topic-icon" aria-hidden="true">{n}</span><div><h3>{title}</h3><p>{desc}</p></div><span class="tag">{"前往 GitHub 参与" if ENABLED else "开放后可参与"}</span></div>' for n, title, desc in topics)
    if ENABLED:
        entry = '<div class="actions">' + external(REPO + '/discussions', '打开讨论区', 'button primary') + external(REPO + '/discussions/new', '发起新话题', 'button') + '</div><p class="hint">章节内可直接评论。独立话题在 GitHub 中发布，需要 GitHub 账号。</p>'
    else:
        entry = '<div class="empty-state"><strong>社区正在准备，讨论尚未开放</strong><p>教程现在可以阅读。完成社区连接后，你可以在章节底部评论，也可以发起独立话题。</p><p>下方展示的是讨论方向，尚无已发布的帖子。</p></div>'
    template = '所属章节与小节：\n问题类型：使用问答 / 实践分享 / 内容勘误 / 更新建议\n想完成什么：\n使用入口与版本：\n复现步骤：\n实际结果与预期结果：\n已尝试的方法：\n可公开的示例或来源：'
    body = f'<main class="wide" id="main"><section class="intro"><p class="home-label">一起学习，也一起改进</p><h1>把问题留下。<br>让经验被看见。</h1><p>围绕手册交流使用方法、复现问题和补充案例。具体章节的问题，可以直接留在对应章节下。</p></section>{entry}<h2>我们可以讨论什么</h2><div class="topic-list">{rows}</div><h2>让问题更容易得到回答</h2><p>说明你在什么环境中，做了什么，以及实际发生了什么。引用手册时标注章节；分享材料前删除账号凭据和无权公开的信息。</p>{codebox(template, "提问与反馈模板")}<div class="actions"><a class="button" href="contribute.html">阅读共建说明</a><a class="button" href="chapters/getting-started.html">回到教程</a></div></main>'
    return page('讨论社区', body, 'community')

def updates_page():
    body = f'''<main class="wide" id="main"><section class="intro"><p class="home-label">持续修订，保留来处</p><h1>更新记录</h1><p>保留原有内容的脉络，让每一次修改都有可追溯的理由。</p></section><section class="timeline"><time datetime="{DATE}">{DATE}</time><h2>V3.0 · 公开版</h2><p>从手写 Word 手册整理为可以阅读、复制与共建的网站。</p><ul><li>沿用八个内容单元，保留核心步骤、工程模板和多模型排查流程。</li><li>更新登录、计费、用量、插件支持和 AGENTS.md 等时效性说明。</li><li>补齐安全边界、Hooks、MCP 与常见问题中缺少的解释。</li><li>按作者要求恢复原稿的全部 73 张截图，保留原始清晰度与对应位置，由作者确认按现状发布。</li><li>统一纯白、浅灰、圆角的阅读界面，加入手机目录、提示词复制和打印样式。</li><li>提供章节评论组件与独立讨论入口；正式讨论尚未启用。</li></ul><h2>接下来</h2><ol><li>继续根据使用反馈修订正文与操作步骤。</li><li>按图片清单逐步更新截图，固定位置编号保持不变。</li><li>绑定公开 GitHub 仓库，启用评论并验证真实发帖流程。</li></ol></section><p class="callout">本版保留原作者的截图与使用经验。后续修改正文或图片后，可以继续更新同一个网站地址。</p><div class="actions"><a class="button" href="index.html">浏览全部章节</a><a class="button" href="contribute.html">提交更新的方法</a></div></main>'''
    return page('更新记录', body, 'updates')

def contribute_page():
    entry = external(REPO, '打开项目仓库', 'button primary') if REPO else '<p class="note">公开仓库入口将在启用社区时补充。目前可以下载源码，在本地审阅和修改。</p>'
    body = f'''<main class="wide article" id="main"><section class="intro"><p class="home-label">从一处小小的改进开始</p><h1>一起完善这本手册</h1><p>保留原作者的实践积累，也欢迎有依据、可复现、可以公开的新经验。</p></section><h2>你可以贡献什么</h2><ul><li><strong>修正内容：</strong>附上章节、原表述、修改建议及原始来源。</li><li><strong>补充案例：</strong>说明适用条件、步骤、验证结果与局限。</li><li><strong>更新截图：</strong>提供清晰的当前界面，保留教学所需区域。</li><li><strong>改善体验：</strong>指出使用设备、页面位置与遇到的问题。</li></ul><h2>保留原纲，按小节修订</h2><p>尽量围绕一个问题提交一次修改。标明产品版本、核对日期和出处；个人经验注明适用环境。不要把未执行的操作写成已经验证。</p><h2 id="downloads">下载与本地修改</h2><p>源码包含八章正文、样式、截图清单、评论配置和构建脚本。下载解压后按 README 操作；生成的 HTML 可以在浏览器中直接阅读。</p><div class="actions"><button class="button primary" type="button" data-download-package="source">下载完整源码</button><button class="button" type="button" data-download-package="html">下载 HTML 网页版</button></div><p class="hint download-status" role="status" aria-live="polite"></p><p class="offline-download-note" hidden>当前是离线阅读版本。需要下载源码或新版网页时，请打开<a href="https://chatgpt-handbook-community.zhaopengyi16.chatgpt.site/contribute.html#downloads">在线下载页面</a>。</p><details class="manual-downloads"><summary>手动下载</summary><div class="details-body"><p>如果完整下载未成功，分别下载代码和图片，解压后把 screenshots 文件夹放到源码目录中。</p><div class="actions"><a class="button" href="assets/handbook-source-core.zip" download>代码与正文</a><a class="button" href="assets/handbook-images.zip" download>原稿截图</a></div></div></details>{entry}<h2>截图怎么替换</h2><p>源码中的 <code>config/screenshots.json</code> 记录每个位置的固定编号、图片文件与说明。将新图放到 <code>screenshots/</code>，更新对应位置的图片文件、尺寸与说明，再重新生成网站即可。更新时删除已不用的旧图。详细步骤见下载包中的 <code>docs/SCREENSHOTS.md</code>。</p><h2>讨论怎么开放</h2><p>每章底部的评论与 GitHub Discussions 关联，独立话题也在同一仓库集中管理。维护者需要完成仓库配置和 giscus 授权；具体步骤见源码中的 <code>docs/COMMUNITY_SETUP.md</code>。</p><h2>公开分享与许可</h2><p>当前版本保留作者确认发布的原稿截图，后续会持续更新。第三方界面、商标及素材仍适用各自的权利与许可。仅提交你有权公开的文字、代码和图片。公开讨论与仓库中不要包含客户资料、组织内部项目、账号凭据或他人隐私。</p><p>网站代码采用 <a href="assets/LICENSE.txt">MIT 许可</a>，原创教程正文采用 <a href="assets/CONTENT_LICENSE.md">CC BY 4.0 许可说明</a>。转载和改编请保留出处、许可与修改说明；第三方产品、文档和素材仍遵循各自许可。</p><p>本手册是由原创实践资料整理的独立学习资源。产品名称和引用链接用于说明，不代表官方出品或背书。</p><div class="actions"><a class="button" href="community.html">查看讨论社区</a><a class="button" href="updates.html">查看更新记录</a></div></main>'''
    return page('参与共建', body)

def zip_files(path, paths, prefix=''):
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for source, relative in paths:
            info = zipfile.ZipInfo(prefix + relative, (2026, 9, 10, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, source.read_bytes())

def build():
    # dist is generated output, never a content source.
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'assets').mkdir(parents=True)
    (OUT / 'chapters').mkdir()
    prepare_shots()
    for name in ['site.css', 'site.js', 'downloads.js']:
        shutil.copyfile(ROOT / 'theme' / name, OUT / 'assets' / name)
    shutil.copyfile(ROOT / 'LICENSE', OUT / 'assets/LICENSE.txt')
    shutil.copyfile(ROOT / 'CONTENT_LICENSE.md', OUT / 'assets/CONTENT_LICENSE.md')
    for i, chapter in enumerate(CHAPTERS):
        (OUT / 'chapters' / (chapter['id'] + '.html')).write_text(chapter_page(chapter, i))
    for filename, render in [('index.html', home), ('community.html', community_page), ('updates.html', updates_page), ('contribute.html', contribute_page)]:
        (OUT / filename).write_text(render())
    sources = [(ROOT / name, name) for name in ['build.py', 'README.md', 'LICENSE', 'CONTENT_LICENSE.md', 'CONTRIBUTING.md', '.gitignore']]
    for folder in ['content', 'config', 'theme', 'docs']:
        sources.extend((p, p.relative_to(ROOT).as_posix()) for p in sorted((ROOT / folder).rglob('*')) if p.is_file())
    referenced = {item['file'] for shot in SHOTS for item in (shot.get('images') or [{'file': shot['file']}])}
    zip_files(OUT / 'assets/handbook-source-core.zip', sources, 'chatgpt-handbook/')
    image_files = [(ROOT / name, name) for name in sorted(referenced)]
    zip_files(OUT / 'assets/handbook-images.zip', image_files, 'chatgpt-handbook/')
    webpages = [(p, p.relative_to(OUT).as_posix()) for p in sorted(OUT.rglob('*')) if p.is_file() and p.suffix != '.zip' and 'screenshots' not in p.relative_to(OUT).parts]
    zip_files(OUT / 'assets/handbook-html-core.zip', webpages, 'chatgpt-handbook-html/')
    oversized = [p.name for p in OUT.rglob('*') if p.is_file() and p.stat().st_size > 25 * 1024 * 1024]
    if oversized:
        raise ValueError('Split large download assets before publishing: ' + ', '.join(oversized))
    print(f'Built {len(CHAPTERS)} chapters, 4 main pages, {len(SHOTS)} screenshot slots and 3 download assets.')

if __name__ == '__main__':
    build()
