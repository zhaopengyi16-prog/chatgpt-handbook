# 第 3b 批第一份兼容 PR 验证报告

2026-11-08（北京时间）。分支：`feat/v2-material-compat`；目标：`main`。本轮只完成 material 兼容读取和方案提交，未合并、未发布，也未开始第二份全站推广 PR。

完整方案已先提交到 `plan/v2-3b`，提交 `e8dcaf562754f06856d923f5392512bc4216dc44`，文件为 [V2_3B_PLAN.md](./V2_3B_PLAN.md)。功能分支基于该文档提交；本 PR 相对 main 包含同一份方案，避免另开文档 PR 打断“第一份 PR 完成即停止”的流程。

## 改动范围

| 文件 | 改动 |
| --- | --- |
| `docs/V2_3B_PLAN.md` | 完整方案、逐文件清单和作者补充的六项要求；兼容先上线、v16风险、字体范围、后台回归、配对截图/未初始化截图、300KB及手机LCP、逐PR停止 |
| `lib/taxonomy-types.ts` | 九种材质白名单和 Material 类型；Category.material 可选；schema 仍为 1 |
| `lib/taxonomy.ts` | 存量分类读取/序列化接受合法 material，旧编辑保留它；create 使用原字段输入白名单；edit 原输入白名单不改 |
| `tests/taxonomy.ts` | 新增兼容行为与写入门禁测试，原断言全部保留 |
| `docs/V2_3B_COMPAT_REPORT.md` | 本验证报告 |

相对 main `1de94b9e3836d731bbd51553e5b256c20998e2d6`，除上述两个 lib 文件与测试文件外，**其余 297 个已跟踪文件的 Git blob 内容哈希全部一致**。两份文档为新增文件。后台、公开页、CSS/字体、sanitize、旧截图过滤、认证、API 权限链、章节写入算法、初始化、数据库/迁移、依赖、锁文件和托管配置都未改动。

## 兼容行为

- 旧数据缺少 material 仍合法；读取不补默认值、不重排、不改写原 JSON。
- 合法存量仅接受 `grass / dirt / stone / water / sand / wood / ember / gem / snow`；null、未知值、空白/大小写变体、数字、布尔、数组和对象均不合法。
- 原字段编辑、排序、空分类策略调整、其他分类增删、章节草稿保存/发布和导出保留已有材质。
- **当前不开放写入。** 管理员对 create.item 或 edit.changes 显式提交 material，九种合法值和 null 都返回 400；原值、revision、writeToken、章节和媒体保持不变。分类界面没有增加材质选择器。
- `schema:1`、taxonomy_v1 键、expectedRevision、原始 JSON CAS、revision + 1、唯一 writeToken 与章节/标签同一 batch 的 SQL 及算法均保持不变。成功旧操作按原机制更换 token，冲突返回 409，不出现半更新。

## 真实命令结果

方案文档阶段与兼容代码阶段分别运行过下列命令，均 exit 0。兼容代码阶段输出：

```text
node tests/run.mjs
PASS: 166 API checks; owner/member/guest permissions, pending visibility, moderation, signed cookies, rate limits, atomic content migration, chapters/media, legacy-image projection, preview isolation and write guards.
PASS: taxonomy integration (135 HTTP expectations); initialization and rollback, visibility on rendered pages and APIs, filters and counts, validation, CAS and atomic publish, legacy editors, restore and export.
Style preview checks passed (12 rendered responses; guest/member/admin access, theme selection, taxonomy isolation, fail-closed errors and unchanged data).

pnpm build
Build complete. Run `vinext start` to start the production server.

git diff --check
exit 0
```

构建保留已有 Vinext 路由静态分类提示：构建时不能自动识别 headers()/cookies() 等动态 API 的全部使用情况。它未导致构建失败；没有以此声称已完成浏览器或线上验证。

分类 HTTP 检查 **101 → 135**。新增的纯解析、序列化和快照断言不计入这个 HTTP 数字。主要证据如下：

| 行为 | 测试证据 |
| --- | --- |
| 旧数据与合法值 | 独立写出的九值 expected 表，不直接用实现白名单自证；旧缺省文档无字段回填，九值解析与序列化往返保留，schema=1 |
| 非法存量 | 多类非法值解析为 invalid、序列化拒绝；含null的库内配置读取/初始化不重置数据 |
| 读取不写 | 格式化的未来JSON涵盖三组分类；管理员分类/章节/导出、公开首页/场景/工具/章节读取后，原始JSON字节、revision/writeToken及全部章节/媒体/settings字段不变 |
| 提前写入拦截 | 九值和null的create/edit共20次400；逐次对照完整快照 |
| 权限 | 在已兼容含材质数据上，游客401、成员403；原 origin、所有权、审核、限流及其他API权限断言全部保留 |
| 旧分类编辑 | 带材质分类改说明并恢复、重排、空策略切换，以及其他项增删，材质均保留；新普通分类不自动补材质 |
| 后台保存/发布 | 同一含材质夹具贯穿草稿、显式发布、旧客户端发布、陈旧分类版本/章节版本409、SQL触发器中断回滚、并发一成一败、撤下/删除/恢复/再发布和导出 |

后台源码完全未改，以上接口和数据测试验证了保存/草稿/发布/权限链的原行为；Node/SSR 测试不执行真实浏览器编辑器手势，不能冒充完整前端交互验收。

## v16 的实际兼容边界

Sites 保存版本查询确认 v16 来源提交是 `33e08f68e4a179e9f25f85e25152141043cf65f1`。只读获取该提交，核对 taxonomy、types、chapter-taxonomy-write、public-taxonomy、reader-snapshot、catalog 和 API route 七个文件，与本轮 main 基线完全一致。

另将 v16 的解析器以显式 TypeScript loader 编译为本地 CommonJS，在纯内存夹具验证：

```text
v16 without material: ready
v16 with material: grass -> invalid
现有分类配置无法读取：包含不允许的字段。 请检查备份；数据未被覆盖。
```

一次性核对脚本最初遇到 TypeScript loader 与 ESM/CommonJS 配置错误，调整测试脚本后通过；未更改保存版本的解析器源码或项目依赖。没有向生产 D1 注入夹具。

旧读取器遇此数据会使公开首页回退旧章节目录、分类投影不可用，分类管理写入和章节保存/发布返回409。它不会自动清空正文，但已经不满足正常使用要求。

## 上线顺序及停止点

1. 本 PR 完成后停止，交作者与 Claude 审核；本轮不合并、不发布。
2. 后续获得明确授权，先合并兼容 PR，在 Sites 预览并正式上线兼容版本。验证1–7章/分类、旧编辑保存/预览/发布正常、旧数据无自动变化、主动写material仍拒绝；记录版本号和提交。
3. 只有该上线验证完成，才开始下一份全站推广 PR 并开放后台/API材质写入。此后的最低回退目标是该兼容版本，**绝不回到 v14，也不回到不识别material的v16**。
4. 不删 taxonomy_v1，不重跑初始化，不用覆盖正文、重置分类或批量删字段修复回退。

## 未验证及后续交付

- 尚未在 Sites 上线本兼容版本，不能声称已完成生产D1或R2验证。只有隔离 SQLite/D1 mock、服务器渲染和构建验证。
- 本 PR 不改视觉，因此未执行全站样式后的 B1–B5 配对截图、未初始化首页截图、手机 LCP、字体慢载可见性、300KB冷载及 Lighthouse；这些已明确列为下一份推广 PR 的验收项。本轮不以旧截图、开发环境数字或静态gzip模型代替。
- 后台浏览器完整编辑手势和实际帐号登录流程需要在后续合法预览中验证，不更改身份方案或伪造生产请求头。
- 当前材质写入门禁仍关闭；没有新增素材、字体、外部链接资源或依赖，没有写生产数据。
