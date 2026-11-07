# 第 3b 批全站推广审查报告

状态：作者已确认 PR #8 代码审核通过，现补性能验收。**不合并、不发布；生产站仍为 v18。** Sites v19 已保存，但本次接口没有提供候选预览地址，性能硬门槛尚未完成，PR 保持草稿；详见本报告末尾的补验收记录。

## 回退与范围

- 作者已确认 v18 线上验收通过。新回退目标为 **Sites v18 / GitHub `f55a087fcca4f0fcfac94865517fc342e5c4333a`**；对应 Sites 源码 `100a97c01e71221e94412cf1657bfe4e5f8ab00c`，两仓 tree 相同。完整记录见 `V2_3B_PLAN.md` 第 9 节。
- 分支 `feat/v2-style-rollout` 基于该 main，按回退记录、共享外观、动态分类、阅读与后台、论坛、字体、验收文档分提交。
- 启用 material 写入后只能回退到已兼容的 v18，不能回 v16/v14；不删除分类键、清空设置或批量改正文。
- 没有创建 Sites 版本、部署、合并 PR、写入生产 D1、初始化线上分类或上传章节截图。

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

1. 在允许的性能环境，对生产候选按方案执行三次独立冷载、整页滚动后的全资源传输统计和手机 LCP；测首页、章节、社区 Lighthouse，保留实际网络/CPU条件与报告。Sites 实际传输还需其预览环境核验。
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

**当前阻塞是缺少可访问的 v19 候选预览 URL，不是要求使用 DevTools。** 已检查现有 Sites 工具：保存只返回版本、源码与归档信息；`get_site` 没有提供候选预览地址。当前可调用的 deploy 接口是正式发布，作者本轮明确不允许发布，因此没有用它来获得网址，也没有猜测候选子域名、扩大站点访问权限、伪造身份或使用鉴权绕过。

首页三次、章节页一次、社区页一次均**尚未开始候选测量**。HTML/CSS/JS/字体/图像各项 transferSize、encodedBodySize 及 LCP 全部记为“未测得”，不是 0；不能判断达标或超标。本地开发预览、线上 v18、构建包大小和静态压缩估算都不作为替代。本轮未删模块或执行性能削减。

取得平台实际提供的 v19 预览入口后，继续按作者口径执行：

1. 每次用独立游客冷会话，顶层页面视口在导航前设为 375×812，保留版本/URL/时间/浏览器和页面可见状态；不使用 iframe 代替顶层页面。
2. 在任何滚动或点击前，通过 buffered `PerformanceObserver` 记录首屏 LCP；字体与首屏稳定后冻结 LCP，再整页滚动统计新增资源。
3. `navigation` 与每条 `resource` 的 `transferSize` 相加，重复 URL 的重复请求照计；分别汇总 HTML、CSS、JS、字体、图像与其他/API，记录 `encodedBodySize` 作为核对，不将它再次叠加进总量。
4. 对缓存命中、Service Worker、跨域零值、缺失的重定向/失败请求等标出不完整性，不能把跨域 0/0 当成免费资源，也不能以 encodedBodySize 简单替换 0 后宣称冷载通过。
5. 任一次已观测总量超过 300,000 B，立刻停止后续轮次，报告分项与削减建议，不自行删模块。三次都完整且达标后，才补记验收通过；章节和社区参考值另列。

继续所需：由 Sites 提供**实际可访问的 v19 候选预览地址**。没有这个入口之前，保持未验收、未发布状态；不改变回退基线。
