# 第 3b 批全站推广审查报告

状态：作者已确认 PR #8 代码审核通过，现补性能验收。**不合并、不发布；生产站仍为 v18。** Sites v19 已保存但未部署；作者已改为接受本地生产预览验收。生产构建与 gzip 响应已验证，但当前受管理浏览器不能创建独立冷会话，375×812 三次全页预算和 LCP 尚未测得，PR 保持草稿。详见末尾最新补验收记录。

## 回退与范围

- 作者已确认 v18 线上验收通过。新回退目标为 **Sites v18 / GitHub `f55a087fcca4f0fcfac94865517fc342e5c4333a`**；对应 Sites 源码 `100a97c01e71221e94412cf1657bfe4e5f8ab00c`，两仓 tree 相同。完整记录见 `V2_3B_PLAN.md` 第 9 节。
- 分支 `feat/v2-style-rollout` 基于该 main，按回退记录、共享外观、动态分类、阅读与后台、论坛、字体、验收文档分提交。
- 启用 material 写入后只能回退到已兼容的 v18，不能回 v16/v14；不删除分类键、清空设置或批量改正文。
- 最初推广实施未创建 Sites 版本；后续按作者要求只保存了 v19（未部署）。没有合并 PR、写入生产 D1、初始化线上分类或上传章节截图。

## 实际改动

| 部分 | 实施内容 | 保留边界 |
| --- | --- | --- |
| 外壳与视觉 | 真实妙妙屋品牌、天空导航、手机 60px 顶栏/五项底栏、原创木屋/材质、共享按钮与纸面 | EN 隐藏；正文、编辑器、帖子为系统字体；阅读表面无纹理 |
| 首页与分类 | 房间、工具、难度路线、讨论与更新摘要使用公开投影；筛选和旧目录保留 | 不硬编码分类数量；保留 emptyPolicy；未初始化时仍显示七章目录 |
| material | 自动与九种白名单选择；创建可省略，编辑省略保留、null 恢复自动 | schema 仍为 1；CAS/writeToken、SQL、原子发布算法不变 |
| 阅读与后台 | 合并小节/章节的原生手机 details 目录；统一阅读、编辑区和管理外观 | 不改块编辑器、序列化、草稿/发布 handlers、权限或读取过滤器 |
| 论坛 | 一个浏览器页面代际共享 me；加载/错误/空态分开；请求取消与晚响应隔离 | 旧身份详情/编辑态不跨代际复用；me 失败仍能只读公开详情，写操作等待身份确认 |
| 字体 | 复用 64 份自托管分片，扩充首页热字集 | 不加依赖、不加外部字体链接；unicode-range 与 swap 保留；四份许可不变 |

源代码复核：24 个保护文件与 `f55a087` 的 SHA-256 完全一致，包括认证、权限分派、schema/迁移、sanitize、旧图过滤、章节事务、初始化、依赖/锁文件及许可。`tests/integration.ts` 未改，原权限断言完整保留。后台 state/hooks/handlers 与基线一致，93 个事件/表单绑定属性的 AST 对照一致；这是代码不变证明，不冒充浏览器实际编辑操作。

## 命令与真实结果

最终候选执行：

```text
node tests/run.mjs                         exit 0
PASS: 166 API checks; owner/member/guest permissions, pending visibility,
moderation, signed cookies, rate limits, atomic content migration,
chapters/media, legacy-image projection, preview isolation and write guards.
PASS: taxonomy integration (205 HTTP expectations); initialization and rollback,
visibility on rendered pages and APIs, filters and counts, validation,
CAS and atomic publish, legacy editors, restore and export.
Style preview checks passed (12 rendered responses).
PASS: catalog rollout SSR; dynamic tasks/tools/difficulties, preserved filters,
empty/error states, uninitialized directory and escaped metadata.
Reading rollout checks passed (7 public chapters; native combined directory,
unchanged reader data, no legacy images or downloads).
PASS: shared session and forum loading; single request, retry, page generations,
BFCache invalidation, owner/member/guest detail isolation, stale filters,
unmount and real initial markup.

pnpm build                                exit 0
Build complete. Run `vinext start` to start the production server.

git diff --check                          exit 0
```

新增测试在 `tests/catalog-rollout.ts`、`tests/reading-rollout.ts`、`tests/session-user.ts`；材质测试扩展 `tests/taxonomy.ts`。测试 mock 仅补 SSR 所需的 `usePathname`，没有生产身份注入。构建仍提示 middleware 命名弃用，以及 community/contribute/updates 的静态分类为 Unknown；构建未失败，本批没有顺带迁移框架配置。完整 stdout/stderr 随验收包提供。

## 浏览器证据及其边界

截图目录：交付包 `miaomiao-3b-review.zip` 内 `screenshots/`，共 46 张。`evidence-index.json` 列出文件尺寸与 SHA-256。所有页面均为隔离本地预览，**不是线上数据/登录验收**。

- before 为 v18 对应文件树；after 为本 PR 候选。
- 使用同源 iframe 的 **375×812 / 1440×900 CSS 视口** 检查响应式布局；截图为视口区域，不冒充整页移动设备截图。另有原生浏览器完整首页 `after-home-native-full.jpg`（不同宽度，补充展示整体布局）。
- 使用本地七篇公开章节、taxonomy revision 1、emptyPolicy=hide；首页显示写代码/做工程。未初始化状态只在本地临时移除分类键并逐字恢复，未触碰线上。
- 讨论详情截图用一篇明确标为本地测试的公开话题；没有伪造登录、owner 或身份请求头。截图后已清理该临时话题和 public 下诊断页面。

| 项目 | 证据 | 结果 / 缺口 |
| --- | --- | --- |
| B1 | `before-community-375.jpg`、`after-community-375.jpg`、`after-B1-button-focus-375.jpg`、`after-community-form-375.jpg` | 基础元素色归入 base layer，真实按钮文字/焦点可见；没有用 !important 修补。未补齐 before 的全部 hover/disabled 状态配对 |
| B2 | `before-chapter-five-375.jpg`、`after-chapter-five-375.jpg`、`after-B2-toc-open-375.jpg` | Enter 可展开；包含 14 个小节/章节链接；展开高约 1008px、overflow:visible，随页面滚动 |
| B3 | chapter-five / chapter-six 的 before/after 两种尺寸，以及对应 development-network JSON | 前后均保留 2a 的过滤效果；公开 DOM 无旧图，实测请求无旧截图或三个旧 zip。未通过伪造旧图制造 before |
| B4 | community 空态、with-topic、topic、form；session 测试与 development-network JSON | 六个公开页面正常首载各 1 次 me；加载中不显示假计数。实际慢网/错误/BFCache 全状态截图仍待补；相应逻辑由自动测试覆盖 |
| B5 | home/community/chapter 的双尺寸截图，`mobile-layout-final.json` | 所测游客页顶栏 60px；页面 scrollWidth=clientWidth；可见交互目标均至少 40px（单选/复选按 label 点击区计）。成员/管理员顶栏、虚拟键盘、200%缩放未做浏览器验收 |
| 未初始化 | `before-home-375/1440.jpg`、`after-uninitialized-home-375/1440.jpg` | 保留章节目录，不偷初始化 |
| 场景、工具、更新、共建 | 对应 before/after 双尺寸文件 | 正常呈现；共建没有旧下载区块 |
| 草稿 | `after-draft-404-375/1440.jpg` | 游客显示不存在或尚未发布；列表/计数/API/成员不可见由原集成测试覆盖 |

实际对首页、场景、工具、第 5/6 章、社区执行 DOM 尺寸检查；没有整页横向溢出，工具横滚限定在局部容器。第一至七章均有 SSR 读取/内容不变回归，但本轮浏览器截图不覆盖每一章的全部段落。

## 字体、颜色与性能

| 指标 | 本轮结果 | 解释 |
| --- | ---: | --- |
| 全部 64 份 WOFF2 | 1,130,576 B | 文件总量，不是每页加载量 |
| 首页热字集 + ASCII | 20,624 B | 七章标题所需静态文件；开发预览首页观察到这两片 |
| 字体声明 CSS | 65,037 B | 文件大小，不是压缩传输量 |
| 字形覆盖 | 38,130 cmap | 分片无重叠、覆盖未减少、四份许可 hash 不变 |
| 原创材质 SVG | 8,846 B | 复用既有 14 个资源，没有新增材质包 |
| 正文墨色/卡片 | 14.67:1 | 静态色对计算 |
| 主按钮文字/绿色 | 5.22:1 | 静态色对计算 |
| 危险按钮 / 禁用按钮 | 6.98:1 / 5.57:1 | 静态色对计算 |
| 材质上的标签 | 14.67:1 | 标签有不透明米白底，不直接把文字压在纹理上 |

保留 `font-display:swap`，没有字体 ready 才显示首屏的逻辑。长章节的标题/目录会触发额外分片：本地第 5/6 章分别观察到 10/12 片；不把首页两片结果扩大为全站下载上限。未来作者改标题仍须复测。

**300,000 B 生产首页三次冷载硬验收：未完成。移动 LCP before/after 正式值：未完成。Lighthouse 性能/无障碍分数：未测得。** 浏览器显示组织策略禁止 DevTools，现有界面没有授权的冷缓存、节流或 Lighthouse 测量能力；没有绕过此限制。诊断页保存的 Resource Timing 与 LCP 是开发构建、复用缓存、iframe 条件，只用于 me/旧图请求观察，不能代替生产冷载、全量 HAR、真实手机 LCP 或预算通过证明。

## 合并前待完成

1. 按作者最新口径，在本地生产预览完成三次独立游客冷载、375×812 顶层视口、全资源传输统计和 LCP；章节、社区各一次参考测量。本轮不要求 DevTools。全部达标后等作者确认合并发布；收到发布通知后同口径测正式首页三次，正式站超标回退 v18 再优化。原计划的 Lighthouse 结果仍未测得，不以诊断结果替代。
2. 合法管理员身份下补齐分类 material 保存/409、块增删移动/撤销、草稿/预览/发布、图库、审核、导出、底栏与保存条的浏览器验收及截图。本轮没有伪造预览登录来完成这些操作。
3. 补齐 B1 全状态、B4 慢网/错误/重试/BFCache、成员/管理员 B5、200%缩放和中间断点；当前截图与离线测试仅覆盖上表注明的范围。
4. 作者与 Claude 审核差异和本报告。未经后续授权，不合并、不发布。

## 2026-11-08 补验收：v19 已保存，候选预览地址未提供

作者已确认代码审核通过，并要求保存 PR #8 的 Sites 候选版本，用游客隔离窗口在 375×812 下测试三次首页。此轮只保存版本，没有合并 GitHub PR、正式发布、变更访问权限或修改功能代码。

| 项目 | 实际记录 |
| --- | --- |
| 候选 Sites 版本 | **v19，未发布** |
| 已审核 GitHub 源码 | `fa3dd1b25c04253f675c0e371037b859b9074476` |
| Sites 源码提交 | `f6619f38cfe5debbcd3f65f2ab40a66038810daa` |
| 两份源码一致的 Git tree | `546fbf538f73df663e328ee00857c31ac8b3e3bb` |
| saved version ID | `appgprj_6aa293ccdcb08191a3dd5ec519a8c90d~appgver_b851fefcddf48191863cba1dc9272058` |
| 构建产物 SHA-256 | `46132aa8ea8ec7309f4d9dd99a1d6a15e1285468ea080749199d18161de3ed17` |
| 构建包 | 4,485,120 B，218 个文件；这是完整服务器及资源构建包，**不是首页传输量** |
| 保存结果 deployment_id | `null`，未调用部署接口 |
| 保存后 get_site.current_preview_url | **`null`** |
| 生产站 | 保持 v18；回退目标仍为 v18 / `f55a087` |

从审核分支完整复制源码后，对 Git tree 做了逐字节等价检查，再执行 `node tests/run.mjs` 和官方构建助手（调用项目 build 脚本），均退出 0。API 166 项、taxonomy 205 项、预览 12 个响应及新增目录/阅读/session 套件全部通过。源码保存助手随后推送该文件树并生成构建包，`save_site_version` 成功返回 v19。

**本次历史记录当时的阻塞是缺少可访问的 v19 候选预览 URL，不是要求使用 DevTools。** 已检查现有 Sites 工具：保存只返回版本、源码与归档信息；`get_site` 没有提供候选预览地址。当前可调用的 deploy 接口是正式发布，作者本轮明确不允许发布，因此没有用它来获得网址，也没有猜测候选子域名、扩大站点访问权限、伪造身份或使用鉴权绕过。

首页三次、章节页一次、社区页一次均**尚未开始候选测量**。HTML/CSS/JS/字体/图像各项 transferSize、encodedBodySize 及 LCP 全部记为“未测得”，不是 0；不能判断达标或超标。本地开发预览、线上 v18、构建包大小和静态压缩估算都不作为替代。本轮未删模块或执行性能削减。

取得平台实际提供的 v19 预览入口后，继续按作者口径执行：

1. 每次用独立游客冷会话，顶层页面视口在导航前设为 375×812，保留版本/URL/时间/浏览器和页面可见状态；不使用 iframe 代替顶层页面。
2. 在任何滚动或点击前，通过 buffered `PerformanceObserver` 记录首屏 LCP；字体与首屏稳定后冻结 LCP，再整页滚动统计新增资源。
3. `navigation` 与每条 `resource` 的 `transferSize` 相加，重复 URL 的重复请求照计；分别汇总 HTML、CSS、JS、字体、图像与其他/API，记录 `encodedBodySize` 作为核对，不将它再次叠加进总量。
4. 对缓存命中、Service Worker、跨域零值、缺失的重定向/失败请求等标出不完整性，不能把跨域 0/0 当成免费资源，也不能以 encodedBodySize 简单替换 0 后宣称冷载通过。
5. 任一次已观测总量超过 300,000 B，立刻停止后续轮次，报告分项与削减建议，不自行删模块。三次都完整且达标后，才补记验收通过；章节和社区参考值另列。

后续作者已授权改用本地生产预览，故不再把 v19 预览 URL 列为继续条件。下面记录新的执行结果。


## 2026-11-08 补验收：本地生产预览（未完成硬门槛）

作者授权用 `pnpm build` 的本地生产预览替代缺失的 Sites v19 预览。**本轮没有修改功能代码、合并、发布或削减模块。** 以下压缩诊断成功，但不是完整首页性能验收；不能判定 300,000 B 通过或超标。

### 生产预览环境

- 分支 `feat/v2-style-rollout`，起点 `2f8d7bc736dd2af6cd7cae529b14efafb70f2385`；相对已审核的 `fa3dd1b` 仅报告文档变化。
- 在源工程执行 `pnpm build`，退出 0；将 218 个构建产物按字节复制到独立本地 QA 目录，用已有 Wrangler 的 `dev --local --config dist/server/wrangler.json --live-reload=false` 服务已编译 Worker 与静态产物。这里的 `dev` 是本地 Worker 运行器，**不是 Vite/Next 源码开发服务**；未重新编译源模块或注入热更新。
- 使用单一预览守护进程分配的 `http://127.0.0.1:4173/`，未开放外网。启动适配文件和只读压缩诊断页面仅在仓库外的临时 QA 副本中，未加入 Git/Sites 源码或保存版本。
- 本地 SQLite 夹具包含七篇公开章节、taxonomy revision 1、emptyPolicy=hide，不是生产 D1 的最新导出。没有管理员身份注入，`/api/me` 实测返回 `user: null`。未连接或改写生产 D1。
- 此环境没有网络/CPU 节流。若后续测得本地 LCP，也只能说明本地运行条件，不能代替正式站结果。

### 实测 HTTP 压缩（仅四个响应抽样）

测量时间：`2026-11-07T18:26:14.703Z`（UTC；北京时间 2026-11-08）。浏览器 Chrome 156 / Linux，实际顶层视口 1363×936、DPR 1。使用正常同源页面脚本，以 `credentials: omit`、`cache: no-store`、`redirect: error` 只读 GET 首页 HTML、其实际引用的一条 CSS、一条 JS 和 `/api/me`；下载的首页脚本不执行。通过 Fetch 读取响应头，再读取 Resource Timing。所有响应 200，`workerStart=0`。

**实际协商为 gzip**：四项响应均返回 `Content-Encoding: gzip`；本轮未观测到 `br`，因此不宣称已验证 Brotli。下表是每个抽样请求的原始值，不能相加后当成首页总传输量。JS 只抽样了很小的运行时文件，**不代表全部 JS**；字体和图像未在此诊断中请求。

| 抽样资源 | transferSize (B) | encodedBodySize (B) | decodedBodySize (B) | Content-Encoding |
| --- | ---: | ---: | ---: | --- |
| 首页 HTML | 16,326 | 16,026 | 80,929 | gzip |
| HTML 引用的 CSS | 52,072 | 51,772 | 238,458 | gzip |
| HTML 引用的 JS | 722 | 422 | 694 | gzip |
| 游客身份接口 | 333 | 33 | 13 | gzip |

实际抽样路径：`/`、`/_next/static/css/index.CwL5WePp.css`、`/_next/static/chunks/rolldown-runtime-C60lm6uB.js`、`/api/me`。`encodedBodySize` 只用于核对，不重复加入 `transferSize`。首页响应 `Cache-Control: no-store, must-revalidate`，CSS/JS 为 `public, max-age=31536000, immutable`；本次请求使用 no-store，因此这些单项诊断没有借用缓存来报低值。

### 本轮无法完成的验收条件

当前浏览器的“New Incognito window”处于禁用状态，菜单显示组织管理；配置管理界面没有新增独立配置/游客入口。现有浏览器控制接口也没有创建全新 context、设置顶层 375×812 视口或清理单独测试会话缓存的能力。本轮没有修改组织策略、绕过管理限制或启动另一套不受管理的浏览器。普通新标签页共享会话，不能作为“新的隔离窗口”；本地页面脚本也不能替代真正隔离会话。

| 要求 | 有效完成次数 | 完整 transferSize / encodedBodySize | LCP | 判定 |
| --- | ---: | --- | --- | --- |
| 首页，375×812 独立游客冷载三次 | 0 / 3 | 未测得 | 未测得 | 未验收 |
| 章节页，同口径一次 | 0 / 1 | 未测得 | 未测得 | 未验收 |
| 社区页，同口径一次 | 0 / 1 | 未测得 | 未测得 | 未验收 |

没有将桌面诊断、iframe、复用缓存、静态文件大小或离线 gzip 估算冒充所需的移动首页完整性能数据。此次没有有效的超标结果，因此也不把它报告为“超标”，不据抽样结果删模块或改代码。

### 继续条件及发布后复测

1. 需要具备**新建隔离游客会话、375×812 顶层视口、运行 Performance API**能力的测量环境；不要求 DevTools，不再等待 Sites v19 预览地址。当前环境限制未解除前，硬门槛保持未验收。
2. 首页连续三次，每次独立冷启动；使用一条 navigation 与全部 resource entries 分项汇总 HTML/CSS/JS/字体/图像/其他，记录 transferSize 和 encodedBodySize。用 buffered PerformanceObserver 记录首屏 LCP，在交互/滚动之前冻结；稳定后统计整页新增资源。不删除重复请求，不把跨域零值当作免流量。
3. 任一有效轮次 >300,000 B 就停止后续测量，按实际大项提出削减方案，交作者决定；不自行删模块、不发布。若三次均完整且 ≤300,000 B，再补章节/社区参考结果并停等作者确认合并发布。
4. 收到作者的正式发布通知后，在正式站用游客同口径复测首页三次。正式站不达标则按作者指令回退 **v18 / `f55a087`** 后再优化；目前没有发布通知，未执行发布或回退。

### 本轮复核命令

```text
node tests/run.mjs    exit 0
pnpm build           exit 0
git diff --check     exit 0
```

测试原始输出：166 API checks、taxonomy 205 HTTP expectations、12 rendered preview responses、catalog rollout SSR、7 public chapters reading rollout、shared session and forum loading 全部 PASS。构建输出 `Build complete. Run vinext start to start the production server.`，原有 middleware 弃用和部分路由 Unknown 提示仍存在。

本轮 Git 差异仅 `docs/V2_3B_ROLLOUT_REPORT.md`。测试/构建通过不改变预算和 LCP 的未验证状态。
