# 账号实施前的平台只读探针

日期：2026-11-09。分支：`feat/platform-probe`。基线：PR #9 文档合并提交 `aa417f87e43876f21cfc4884a0be0eaa51ba892e`。

**本 PR 只交付临时探针及测试，不合并、不发布、不运行线上探针。账号代码、六张表及 0002 迁移均未实施。** 当前线上仍为 v19；不能把本地测试当作 Sites 平台结论。账号一期的已定范围见 [ACCOUNTS_DESIGN.md](ACCOUNTS_DESIGN.md)。

## 1. 入口、权限与零写入

审核并另获部署授权后，所有者通过已有 ChatGPT 登录访问 `/api/admin/platform-probe`，无需 DevTools。GET 是小型操作面板；POST 在同一路径运行单个固定诊断。没有公开导航入口，不加载全站布局，不刷新会话。

| 请求 | 行为 |
| --- | --- |
| GET `/api/admin/platform-probe` | 返回静态 HTML 面板；不自动执行探针 |
| POST 同一路径，`{"action":"headers"}` | 只输出候选 IP 头存在性及四个身份头的布尔观测 |
| POST，action 为 `pbkdf2-600000` 或 `pbkdf2-100000` | 单次固定成本派生，分别记录支持/错误与计时局限 |
| POST，action 为 `d1-export` | 有界预检后实际尝试原生 dump；只返回脱敏状态 |
| 额外路径、查询参数、其他方法、额外 JSON 字段 | 拒绝；不进入其他 API 或初始化 |

POST 只接受 `application/json`，流式读取上限 1,024 字节，正文必须只有一个白名单 action。不接受任意 SQL、URL、密码、迭代数、身份值或客户端“已验证”标记。一次请求只测一项，面板等待结束前禁用按钮，不自动重试。

原有顺序保持：**严格 Origin 检查 → 读取身份 → 统一 adminPath 管理员检查 → 写操作身份检查 → 精确探针分派**。匿名 401、普通 ChatGPT 成员 403。权限拒绝发生在 KDF/dump 之前，不额外开放游客例外。

整个 `admin/platform-probe` 命名空间（包括错误方法和额外路径）跳过 `ensureSeed()`。专用 `probeIdentity()` 仅调用未修改的 `getChatGPTUser()` 并 SELECT 已有 `owner_user_id`；不调用可能自动创建 owner 的 `identity()`。owner 缺失、空值或不匹配时拒绝，不能用环境中的邮箱现场初始化 owner。

不改 `app/chatgpt-auth.ts`、`lib/data.ts`、`lib/guests.ts`，不调用游客 Cookie、session touch、R2 写入或数据修订。只读 SQL 是 owner SELECT 和两个大小 PRAGMA；原生 dump 是读取。所有输出 `Cache-Control: no-store`，不设置 Cookie、不持久化诊断结果；面板不使用 localStorage。HTML 具有 nonce CSP、禁止嵌入、禁止外部资源与 no-referrer/noindex；结果用 `textContent`，不渲染返回 HTML。

框架可能自动为未显式导出的 HEAD/OPTIONS 生成响应；这些响应不能作为探针成功。探针路由逻辑本身只接受 GET/POST，其他方法不运行昂贵操作。保留全站既有方法导出，不为探针改变其他 API 的 HEAD/OPTIONS 行为。

## 2. 四项检测如何解释

### 2.1 可信访客 IP

返回 `candidatePresent` 与来源头名 `cf-connecting-ip`（不存在则 null），**从不返回 IP 原文、哈希、完整请求头或请求上下文**。有头时 `trust: unverified`、`trustedAvailable: null`；没有时 `trust: unavailable`、`trustedAvailable: false`。这里的“无”表示未观察到本方案支持的候选，不宣称平台不可能提供其他可信来源。

应用层看到一个头并不能独自证明它是终端访客 IP：Sites 上游 Worker 转发方式、是否覆盖外部同名头、是否返回代理共享地址仍需平台证据。Cloudflare 官方说明 Worker 子请求会影响该头语义。[S1] 本 PR 不将 X-Forwarded-For、X-Real-IP 或任意客户端头当限流依据，不保存 IP，不编造可信结论。

最终报告必须将“有候选头”和“可信访客 IP 已证实”分开。若后者仍未知，账号注册继续关闭，交作者与 Claude 决定如何取得平台转发契约/受控外部测试证据，不用 Cookie 限流冒充 IP 限流。

### 2.2 外部伪造平台头

面板“运行四步外部头测试”由真实浏览器依次发送：

1. 当前 owner 的正常登录请求，必须先取得有效探针 JSON。
2. 保留合法登录，添加固定、明确非 owner 的四个哨兵头。
3. `credentials: omit` 的无凭据基线。
4. 无凭据加相同非 owner 哨兵。

固定测试头为 `oai-authenticated-user-id`、`oai-authenticated-user-email`、`oai-authenticated-user-full-name`、`oai-authenticated-user-full-name-encoding`。公开哨兵不是凭据；**不得替换成真实 owner ID，也不得通过伪造所有者身份取得后台**。请求禁止跟随重定向，不把登录页的 200 当成功。源码中的测试 owner 仅用于隔离 mock，不用于线上外部请求。

面板记录四个请求的状态、是否取得带固定探针标记的 JSON，以及每个头是否仍等于哨兵。已登录加哨兵请求仍通过 owner 检查且四个哨兵均未到达应用，支持“本轮四个被测头被剥离或覆盖”。字段 `testedHeadersNotForwarded` 只表示这项证据，整体结论仍标 `requires-review`。

- 匿名 401 只说明未认证；403、边缘拒绝、网络错误或重定向不能证明头已被剥离。
- 若已登录请求变 403，可能是哨兵到达应用或入口拒绝；单凭状态不能区分，报告未知。
- 不从四个头推断整个 `oai-authenticated-user-*` 前缀，也不推断任意其他托管平台安全。
- 服务端的 `verdict: unverified` 不会因客户端请求参数而变 true；真实发送步骤与观测须一起审核。

### 2.3 PBKDF2-SHA256

两个按钮分别执行 WebCrypto PBKDF2-SHA256、256 位输出、随机 32 字节非真实口令输入与随机 32 字节盐；一次只执行指定档位。输入、盐、派生值不进响应/日志/数据库，使用后尽力清零可控制的缓冲区，不承诺运行时内部副本已全部擦除。

记录 `iterations`、`status: supported/error` 和固定白名单错误类型。禁止透传异常 message/stack。`rawTimerDeltaMs` 是服务端原始时钟差；**`timingReliable: false`，`durationMs: null`**：正式 Workers 的 performance.now/Date.now 可能只在 I/O 后推进，0 ms 不是零计算耗时。[S2] 面板另给 `roundTripMs`，明确包含网络、鉴权、D1、计算和读取响应，不冒充纯 KDF CPU 时间，不制造无关 I/O 来掩饰测量限制。

按作者规则，实际 Sites 成功支持 600,000 就使用该值；确认该档不支持/无法在平台限制内完成、而 100,000 实测成功时采用 100,000。仅网络超时或没有有效响应时，结果未知，不能自动选择低档。两档都不能完成时不开放账号。不接受低于 100,000 的替代，不把多次低档计算当作一次高档。

### 2.4 完整 D1 导出

探针不把现有 `/api/admin/export` 的内容 JSON 当全库备份，也不调用可能 seed 的导出路径。仅检测当前 DB binding 的原生 `dump()`：不存在时报 unavailable；存在仍须实际调用。官方文档指出 dump 只适用于 alpha 数据库，因此“方法存在”不证明可用。[S3]

先只读取得 `PRAGMA page_count` 和 `PRAGMA page_size`，两者必须是正安全整数、乘积安全且不大于 8 MiB。预检失败/不受支持返回 unverified，超限返回 skipped，不继续分配 dump。此估算与 dump 间可能有正常业务写入，**不是硬内存上限保证**；实际返回后再次检查大小。

检查原生返回值是 ArrayBuffer，严格匹配 `SQLite format 3\0` 的 16 字节文件头，且未超限；成功只报 `native-dump-succeeded` 和字节数。全部内容留在本次请求内存，随后尽力清零；不回传、落盘、写 R2 或进 GitHub。异常只报固定原因码。

`backupPathReady`、`integrityVerified`、`restoreVerified` 始终为 false：文件头和大小正常不等于全部表/行、迁移登记、完整性及恢复演练已验证。还须单独落实作者可访问的完整私有导出路径、核对全库及恢复，保留最多 30 天。若原生 dump 不支持，需要平台导出权限或另审私有完整备份工具，不能开放注册后补备份。

## 3. 获批后的运行和结果模板

本 PR 停在审核阶段；合并、临时部署与实际运行另获授权。部署时不迁移、不初始化账号，不更改 owner；使用当前合法 owner 会话。

1. 记录实际 Sites 版本与 Git 提交；确认 owner 正常登录，访问临时入口。
2. 查看脱敏头信息，运行四步身份头实验，分别记录结果，不在报告粘贴真实身份或 IP。
3. 分别运行 600,000 和 100,000 两个按钮，记录服务端原始差值/错误和浏览器 RTT；无有效响应则未知。
4. 检查原生 D1 导出能力；不把诊断状态当实际备份文件已保存。
5. 交作者与 Claude 审核缺口。没有完整备份路径、身份边界或可信 IP 证据前，注册保持未开放。探针结果未出前不写账号代码。

| 项目 | 当前结果 | 后续记录字段 |
| --- | --- | --- |
| 可信终端访客 IP | **未运行/未验证** | 候选有/无、来源头名、平台信任依据；无原值 |
| 四个身份头的入口处理 | **未运行/未验证** | 四步 HTTP 状态、被测头名与哨兵是否保留、证据局限 |
| PBKDF2 600,000 | **未运行/未验证** | 支持/固定错误码/未知、原始时钟差、RTT |
| PBKDF2 100,000 | **未运行/未验证** | 同上；明确测试环境与日期 |
| 当前绑定原生 dump | **未运行/未验证** | 能力状态、原因码、估算/返回字节数 |
| 完整私有备份与恢复路径 | **尚未落实** | 私有路径由作者保管，公开报告只记存在性/恢复验证时间，不上传备份 |

## 4. 修改清单与测完删除

| 文件 | 本 PR 用途 | 测完后的撤除 |
| --- | --- | --- |
| `app/api/[...path]/route.ts` | 原 gate 之后精确分派，探针 namespace 零写身份读取 | 删除 probe imports、namespace 特例和分派；其它原逻辑保持 |
| `lib/platform-probe.ts` | 只读 owner、脱敏头、两档 KDF、原生导出检测 | 删除文件 |
| `lib/platform-probe-page.ts` | 同一 owner gate 内的临时操作面板 | 删除文件 |
| `tests/platform-probe.ts`、`tests/run.mjs` | 探针行为测试与接入；原有套件保留 | 撤除临时套件及入口；补 API 不可达回归 |
| `docs/PLATFORM_PROBE.md` | 运行说明、真实结果/缺口与下线清单 | 保留脱敏历史报告，记录删除 PR 和部署版本 |

完成真实测量并审核后通过单独清理 PR 撤除代码，再按授权部署；验证入口不可用、不再运行 KDF/dump。不要只隐藏按钮而保留服务器接口。当前不自动删除尚未部署/测量的探针，也不借完成探针开始账号业务代码。

## 5. 验证记录

2026-11-09 实际运行结果：

```text
node tests/run.mjs   exit 0
pnpm build          exit 0；Build complete
git diff --check    exit 0

PASS: 166 API checks
PASS: taxonomy integration (205 HTTP expectations)
Style preview checks passed (12 rendered responses)
PASS: catalog rollout SSR
Reading rollout checks passed (7 public chapters)
PASS: shared session and forum loading
PASS: platform probe (82 HTTP responses)
```

构建有既有 middleware 弃用与部分路由 Unknown 提示，无构建失败。原有套件和权限断言全部保留。新增测试在无 seed、无历史 revision 标记、已有作者正文和媒体的隔离 SQLite 夹具中逐字段对比全部表，并禁止所有 DB batch/run 与 R2 写入口；覆盖 owner 缺失不初始化、非 owner 拒绝、Origin、错误 action/方法/体积、脱敏、两档本地 Node KDF、冻结时钟、D1 各种失败及成功状态。另在 Node VM 执行真实面板脚本，核对四步 credentials 顺序、固定哨兵、重定向/登录页/网络失败不会冒充验证成功。

独立审查发现并修复编码路径可能落回初始化流程的问题；新增 8 个编码/相似路径 × owner/匿名 × GET/POST 共 32 项回归，均 404、零写且不执行 KDF/dump。测试参数按当前 vinext 行为逐段 decodeURIComponent，覆盖编码 `/`、`\\`、`?`、`#`、双重编码及相似名称。

还以 `pnpm build` 的生产产物在本地 workerd 启动真实 HTTP 服务，**只用匿名请求，不伪造 owner 登录**，获得以下结果：

| 方法/路径 | 实际状态 |
| --- | --- |
| GET / POST / PUT / DELETE `/api/admin/platform-probe` | 401；无 Set-Cookie |
| HEAD 同路径 | 401；空响应体 |
| OPTIONS 同路径 | 框架生成 204；Allow 为 DELETE, GET, HEAD, OPTIONS, POST, PUT |
| `%2Fextra` / `%3Fdebug` / `%23debug` / `%5Cextra`，以及 `admin%2Fplatform-probe` | 404；不落回初始化 |

上述响应均为 `private, no-store`。生产框架的 OPTIONS 204 与直接调用 handler 的 405 不同，已区分记录，不把 OPTIONS 当已授权诊断。HTTP 检查完成后本地服务已停止。

**未验证范围**：实际 Sites 的可信访客 IP、外部身份头处理、PBKDF2 平台上限/资源耗时、完整 D1 导出及私有备份恢复；未部署或运行线上探针。Node KDF 成功和 SQLite mock dump 只证明本地行为，不证明平台能力。未进行真实 owner 浏览器页面视觉验收；面板请求逻辑已用 VM 验证。不得将这些缺失证据填为通过。

## 6. 官方依据

2026-11-09 核对：

- [S1 Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)：终端 IP 头与 Worker 子请求差异。
- [S2 Workers performance and timers](https://developers.cloudflare.com/workers/runtime-apis/performance/)：正式环境时钟只在 I/O 后推进，CPU 纯计算不能据此可靠计时。
- [S3 D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/)：原生 dump 的 alpha 限制、SQLite ArrayBuffer 返回方式。
- [WebCrypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)：内置密码学接口；不保证本项目 Sites 配额或迭代上限。
