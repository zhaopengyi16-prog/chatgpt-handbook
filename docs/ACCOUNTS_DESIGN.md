# 本站账号一期设计与二期绑定边界

状态：**PR #9 设计审核通过，按作者最新决定修订；仅文档，不代表账号功能已实现、迁移或发布。先完成平台探针 PR，停下等审核；探针结果出来前不写账号代码。**

日期：2026-11-09（北京时间）。分支：`plan/accounts`。代码基线：main `f8fb0fa811b8a782da449d1c4cbcdcc2af9d2fa6`（PR #8 已合并）。当前线上为 Sites v19；其功能源码对应 `fa3dd1b`，后续差异是报告。本文为账号设计文档；本次仅同步作者已批准的范围和前置条件。

## 1. 目标、既定规则与实施边界

访客可直接以用户名、密码注册和登录，不必拥有 ChatGPT。一期只做本站账号注册、登录、恢复码、后台管理（审核模式、封禁、一次性重置码、强制下线）、前三条发言审核与注销。保留游客待审发言、原 ChatGPT 登录、站点所有者后台、编辑器、草稿/发布、图库、分类和原有链接。

**ChatGPT 绑定/解绑移到第二期**：一期不建 `account_chatgpt_links`，不提供绑定页面、接口或 challenge，不在 `identity()` 中实现绑定分支，不合并本站与 ChatGPT 帖子所有权。二期需独立设计、迁移与审核；当前浏览器同时登录两种身份不等于绑定。

作者已确定：注册时显示一次恢复码；丢失时仅在用户仍能登录该本站账号或作者线下认识本人的情况下发一次性重置码。主题和回复合计 3 条不同发言获审核通过后，后续发言直接发布；被拒的不计，提前提交的第 4 条仍待审。管理员可强制审核、封禁和强制下线；注销删除账号数据，本站账号帖子保留并显示“已注销用户”，注销前允许自行删帖。

作者已批准未来修改 `identity()`、API 精确分派，以及新增 **6 张表和 `0002` 迁移**。`app/chatgpt-auth.ts` 和 `lib/guests.ts` 明确不改。此授权有先后顺序：**先提交仅 owner 可访问的只读平台探针 PR；探针结果出来并经过审核后才开始账号实现**。本轮不创建账号模块、迁移文件或生产数据，不发布网站。

不新增依赖，不引入外部账号服务，不收集本站用户的邮箱、手机号、实名、头像或长期设备画像。账号模块不改章节正文、sanitize、旧截图过滤、taxonomy schema/CAS 或既有发布事务。私有完整备份最多保留 30 天，允许仅含随机账号 ID 与时间的注销清单；没有完整备份路径前不开放注册。

## 2. 对现状的核对

| 位置（main 基线） | 当前行为 | 对设计的影响 |
| --- | --- | --- |
| `app/chatgpt-auth.ts` | 从 Sites 注入的 `oai-authenticated-user-*` 读取平台身份；有安全 returnTo 与平台登录/退出链接 | 复用，不将本站密码接入该函数，不伪造平台头 |
| `lib/data.ts: identity()` | 仅识别 ChatGPT；`owner_user_id` 与当前平台 ID 比较；尚未建立 owner 时，可信平台邮箱匹配环境变量才执行一次性初始化 | 管理权源保持独立；注册、恢复接口绝不能设置 owner |
| `app/api/[...path]/route.ts` | 非 GET/HEAD 先检查严格同 Origin；再检查 admin；未登录写操作仅允许游客 POST topics/replies | 新匿名注册/登录需要精确新增例外，不能声称原 gate 不变就能工作 |
| 同上 | `pending = !user`，pending 同时决定 guest 限流与 `author_kind` | 必须拆成“身份种类”和“审核状态”，本站待审账号不是游客 |
| `db/schema.ts` | topics/replies 的作者 ID、姓名是字符串，无用户外键；回复有 topic 外键 | 可新增独立账号表，保持原帖子 ID、ChatGPT 作者 ID 与正文 |
| `lib/guests.ts` | `__Host-handbook-guest` 是 HMAC 签名匿名提交标识，不授予编辑权；已有浏览器/全站限流 | 原样保留，首版不实现游客认领 |
| API topic GET/PUT/DELETE | 普通用户连自己的待审 topic 也不能从公开详情读取；已登录成员通过作者 ID 管理自己的公开帖 | 新增私有“我的发言”通道，不开放公开待审列表或计数 |
| `/api/admin/export` | `handbook-backup-v1` 只导出内容、媒体清单、分类和正文历史 | **不是完整数据库/账号备份**；不能用它证明密码数据已备份 |

Sites 验证平台身份后注入请求头是信任前提。当前代码仍不能直接放到任意公开 Worker 并信任同名客户端头；新增本站账号并不会自动消除原 ChatGPT 登录的部署限制。

## 3. 五条安全底线

### 3.1 管理员只由本次可信 ChatGPT 身份决定

唯一公式：

```text
admin = currentTrustedChatGPT != null
        AND settings.owner_user_id != null
        AND currentTrustedChatGPT.userId === settings.owner_user_id
```

一期 `accounts`、会话表都没有 role/admin 字段；二期任何绑定表也不得增加此字段。任何请求体中的 `admin`、`role`、`owner_user_id`、`authorId` 一律拒绝或不进入受信模型。用户名/昵称、曾经以 ChatGPT 登录过都不能赋予管理员权限。**一期密码 Cookie 永远不产生管理员权限；未来二期即使绑定所有者 ChatGPT，仅凭密码 Cookie 的请求仍然不是管理员。**

保留原 owner 初始化机制，只允许 `getChatGPTUser()` 得到的可信平台用户参与；没有配置或没有匹配时不设 owner，不采用“第一个注册者就是管理员”。本次 owner 平台身份与本地账号被封禁/注销是独立事项，不能把唯一站点管理员锁死。

所有 `/api/admin/*` 在业务分派前统一检查上述 admin，包含未知路径及未来新接口。有效普通本站账号得到 **403**；完全未认证得到 401。后台页面仍要求 ChatGPT，再检查 owner；页面是否显示按钮不参与 API 授权。

### 3.2 密码算法、迭代次数与平台限制

方案仅使用 Workers 内置 `crypto.subtle` 的 **PBKDF2-HMAC-SHA256，独立随机 32 字节盐，32 字节派生结果**。迭代次数已由作者决定：平台探针在实际 Sites 运行环境支持 **600,000** 次就采用 600,000；否则采用 **100,000**。两档都不能完成或平台条件不足时保持账号功能关闭，不寻找更低档回退。探针使用固定的非真实测试口令，不测试真实用户密码；分别记录两档耗时或安全错误码，见 §10.1。

盐来自 `crypto.getRandomValues`，每次注册/改密/重置重新生成。编码例为 `pbkdf2-sha256$v1$600000$<salt-base64url>$<digest-base64url>`（若最终选 100,000，记录对应参数）。校验按记录内已支持版本/参数执行，严格限制长度与参数白名单，不能盲信数据库里任意大的迭代数字；修改默认参数也不能使已有账号失效。使用 Workers `crypto.subtle.timingSafeEqual` 比较等长结果，不退化成提前返回的逐字节比较。[S1]

**实际 Sites 的 PBKDF2 上限目前未测得。** 官方历史 workerd 源码曾硬限制 100,000；官方维护者随后说明开源 workerd 改为可配置、移除默认上限，但生产 Workers 当时仍有限制。当前官方 WebCrypto 文档未承诺本项目 Sites 的迭代上限，本地 Node/Wrangler 成功也不证明生产支持。[S2] OWASP 当前建议 PBKDF2-HMAC-SHA256 600,000 次；作者已接受平台不支持时采用 100,000 的条件折中，但仍须如实记录该值低于建议，在线限流不能弥补数据库泄露后的离线破解成本。**不通过重复调用/自制算法冒充 600,000 次，不在每次用户请求超时时自动降档。**[S3]

Workers 通用 CPU 配额与 PBKDF2 单次迭代上限不同：官方 Free HTTP 请求 CPU 10 ms；Paid 默认 30 s，可配置到 5 min。Sites 实际配额本批未知；探针 wall-clock 耗时不是可用 CPU 配额证明，报告必须区分支持/报错/超时和测量环境。[S4] Workers 的 `performance.now()` / `Date.now()` 在没有 I/O 的 CPU 操作期间可能不前进，测得 0 ms 不构成真实耗时证据。浏览器观测的往返时间（RTT）须单独列出，注明包含网络、鉴权和 D1，不能当作 PBKDF2 本身耗时。[S10]

密码为 **10–128 个 Unicode 码点、UTF-8 不超过 512 B**，允许空格和长口令，不 trim、不静默规范化、不截断。校验两次输入一致，前端支持密码管理器与粘贴；服务端所有入口同一限制；密码字段不得复用 route.ts 的 `text()`，因为它会 trim。账号请求体最多 8 KiB，先限流再 KDF。未知用户名也执行最终选定参数的 dummy KDF，避免明显的用户存在性时间差。只记录事件类型、结果码和请求关联号；不记录密码、请求体、Cookie、恢复码、重置码、完整认证头或密码哈希。异常响应不回显 SQL 参数和提交值。

### 3.3 服务端会话与 CSRF

Cookie：`__Host-mm-session=<32随机字节的base64url>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`，不设 Domain。数据库仅存令牌 SHA-256 摘要。高熵随机令牌/恢复码可用 SHA-256 摘要，**用户密码不能用普通 SHA-256 替代 PBKDF2**。[S5]

绝对期限 7 天，闲置期限 24 小时；last_seen 最多每 15 分钟更新一次，真实有效期以服务端为准。登录成功生成全新令牌，不接受客户端指定 session ID；同名Cookie出现多份时拒绝解析，不任取第一份。每请求查会话、账号状态与 `session_epoch`，禁止跨请求缓存授权；使用 D1 主库读取，避免副本延迟使封禁/强制下线暂时失效。[S6]

退出删除当前会话并清 Cookie；管理员“强制下线”、改密、重置、封禁/解封递增账号 session_epoch 并删除全部会话。登录创建会话须条件检查密码验证时的 epoch/凭据/status仍相同（active为普通访问，banned为上述安全白名单），否则与同时改密/封禁竞争时拒绝建立旧会话。会话不保存任何管理员布尔值。封禁操作先使所有旧会话失效；之后正确密码仍可新建当前epoch的**受限安全会话**，只允许 GET account/自己的posts、POST logout/password/recovery、DELETE自己的posts/account。权限每请求从status推导，不另存role；论坛发帖/编辑、profile 及全部后台接口拒绝。这样封禁用户仍可改密、保存恢复码或注销，不会被锁死在登录门外。

收到格式错误/伪造的本站Cookie时，公开只读可按游客展示，但携带它的写请求先拒绝401并要求清理/重新登录，不能暗中降级成游客发帖。主动清除身份后仍可走原游客待审流程；不宣称账号封禁可以永久识别匿名浏览者。

本地会话退出不会退出 ChatGPT 平台。UI 分别说明“退出本站账号”和“退出 ChatGPT”；用户选择仅密码模式但浏览器仍带 owner 的平台身份时，应先走原平台退出流程。后台强制下线只能撤销本站会话，不能声称撤销 ChatGPT 平台会话。一期没有身份绑定，本地封禁只作用于本站账号；原 ChatGPT 身份是独立主体，不能宣称可凭本地账号推断并封禁它。

**应用所有写入口**（注册、登录、退出、改密、恢复、注销、发言、后台）统一在解析主体/查账户/执行 KDF 前检查 Origin。要求与部署侧配置 `AUTH_PUBLIC_ORIGIN` 的本站受信 HTTPS origin 精确匹配，且请求目标也匹配；切换自定义域名时显式更新配置并重新登录，不从客户端Host推导信任；缺失、`null`、多值、错误端口、相似子域均返回 403。不接受用 Referer 或 X-Forwarded-Host 绕过；不开放带凭据的跨域 CORS。维持现有 route 的同源检查，并在未来实施中核实 Sites 转发的请求 origin 契约。SameSite 仅为补充，不替代 Origin。平台自管的 `/signin-with-chatgpt`、`/callback`、`/signout-with-chatgpt` 继续由 Sites 处理，不在应用自造 OAuth 回调或改写为密码登录。

### 3.4 用户名、昵称及双维限流

用户名先 NFKC、去首尾空白、ASCII 小写，再要求 `[a-z0-9_]{3,24}`；只存规范化结果，数据库 UNIQUE 作为最终保证。中文由昵称表达。用户名创建后首版不可更名。并发注册同名只有一个成功，不用“先 SELECT 再 INSERT”作为唯一检查。用户名可用性是公开注册界面的有限信息，失败统一“名称不可使用”，不另开无节流探测接口。

用户名与昵称都执行保留名称检查：NFKC、大小写折叠、移除空格/常见分隔符后，禁止 `admin`、`administrator`、`root`、`moderator`、`official`、`miaomiao`、`miaomiaohouse`、`管理员`、`站长`、`版主`、`妙妙屋`、`AI妙妙屋`、`官方` 及带这些保留词的伪装变体。拒绝控制字符、双向文本控制符、零宽格式字符与不可见昵称。昵称 2–24 个 Unicode 码点，用纯文本渲染；昵称不是唯一凭证，不授予官方标识。官方标识仅由本次可信 owner 服务器输出。

本站账号新发言忽略客户端 authorName，读取账号昵称；游客/普通 ChatGPT 成员新填写的发言昵称同样检查保留词（不回写历史昵称），防止绕开注册页冒充。原平台 owner 的实际发言可带服务器生成的官方标识；任何只凭本站密码登录的账号均不获得此标识。

初始限流参数（项目提案，非平台保证）：

| 入口 | IP 桶 | 规范化用户名桶 | 失败锁定 |
| --- | --- | --- | --- |
| 登录 | 每 15 分钟 30 次尝试 | 每 15 分钟 10 次尝试 | 用户名失败 5 次锁 15 分钟；IP 失败 20 次锁 15 分钟 |
| 注册 | 每小时 5 次尝试 | 每小时 5 次尝试 | 达上限锁到窗口结束，包括名称冲突/格式失败 |
| 恢复/重置 | 每 15 分钟 10 次尝试 | 每 15 分钟 5 次尝试 | 独立恢复桶锁 15 分钟，不无限延长密码登录锁 |
| 改密/恢复码重生成/注销的密码复核 | 每 15 分钟 20 次 | 每账号 15 分钟 5 次失败 | 独立敏感操作锁 15 分钟 |

另设全站认证尝试每分钟 120 次的成本上限；所有桶均在 KDF 前用 D1 原子 UPSERT/条件 UPDATE 预约，不使用 Worker 内存 Map。并发和多个边缘实例不能超发；锁内请求不再次延长锁期。登录成功不清 IP/全站桶；不允许用一个正确账号洗掉攻击来源计数。返回 429 与 Retry-After；未知用户名也进入同样计数。发生存储错误时认证写入失败关闭，不放行无限尝试。

IP 只接受**核实过 Sites 可信转发链路**的来源。不能直接相信任意 X-Forwarded-For；Cloudflare 文档说明 CF-Connecting-IP 在 Worker 子请求场景可能不同于直接访客请求。启用注册前必须确认该站点取得的是可信访客 IP；本批未完成此平台验证。无法确认时注册/密码认证保持关闭并提示暂不可用，不能跳过 IP 桶。[S7]

限流键为服务端 `AUTH_RATE_KEY` 的 HMAC（用途、规范化 IP 或用户名；**不把时间窗口放进键**），不存原始 IP、UA 或用户名到限流表；密钥放 Sites secret，不入 settings/仓库/内容导出。短期伪名键仍是安全元数据，不宣称匿名。`window_start` 管理计数窗口；窗口轮换可重置 count/failures，但必须保留尚未到期的 blocked_until，expires_at 至少覆盖锁定截止。否则在窗口末尾触发的15分钟锁会在下一窗口被绕过。密钥轮换同样不能清掉尚有效的锁。窗口过期后惰性限量清理，最长保留 24 小时；D1 中只保留计数与到期时间。未提供密钥时失败关闭。IPv6 地址需规范化，不能让同一地址的不同写法换桶。

### 3.5 最小数据

账号资料只有内部随机 ID、用户名、昵称、密码哈希编码、创建时间、状态。没有邮箱、手机号、实名。会话、恢复摘要、限流计数和审核进度是实现本任务必需的独立安全表，下面逐表列出；不能将“只保存五类资料”解释成不存撤销会话或恢复所需的数据。

一期不保存任何 ChatGPT 绑定资料，不复制 ChatGPT 邮箱或姓名。原平台登录解析临时读取邮箱以保持现有 owner 初始化逻辑；这些数据不进入本站 accounts 表、日志或新的备份资料字段。

## 4. 新表、迁移 SQL 与事务约束

### 4.1 数据结构

共新增 6 张表；不 ALTER/重建现有 chapters、media、topics、replies、settings、guest_limits；不改已有 author_id，无用户资料批量初始化。

| 表 | 用途与生命周期 |
| --- | --- |
| `accounts` | 最小账号资料；status 只有 active/banned，永久注销实际 DELETE |
| `account_controls` | 审核模式 auto/manual；会话撤销 epoch；账号写 CAS revision/token；无角色字段 |
| `account_sessions` | 令牌摘要、账号、epoch、创建/最后访问/绝对到期；撤销删除，过期清理 |
| `account_challenges` | 恢复码、管理员重置码的摘要；仅 recovery/reset 两种用途，使用后删除 |
| `account_contribution_credits` | 主题和回复合计前 3 条审核通过发言的去重凭据；以内容种类+ID 唯一，最多 3 行/账号；删帖不倒扣，注销随账号删除 |
| `account_rate_limits` | 无明文 IP/用户名的短期限流桶；没有长期设备档案 |

`accounts_v1_config` 在 settings 中保存 `{schema:1, initialized:false, registrationOpen:false}`，独立于 `taxonomy_v1`。initialized 是结构/运行条件已验证的单向标记，registrationOpen 才是暂停新注册的开关。迁移完成、核验运行条件后才由受控步骤设置 initialized=true；此后密码登录、已有会话、封禁与审核检查持续工作，关闭 registrationOpen 不能停用这些检查。存在账号后不允许把 initialized 改回false或删配置来模拟旧库。若以后要暂停密码登录，应另审独立维护机制，不复用注册开关。两字段不能由注册/普通用户写入。密码字段包含算法与盐，所以无需额外的个人资料字段。

### 4.2 拟议 Up SQL（仅文档；实施后才生成 `drizzle/0002_accounts.sql`）

使用现有迁移系统登记顺序和 checksum，不在请求中执行 DDL。以下 SQL 不带 `IF NOT EXISTS`，避免把不一致的半成品表当成功；重复执行由迁移记录阻止，若意外再次执行应失败且不得清表。时间字段为 Unix 毫秒。

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
  CHECK (length(username) BETWEEN 3 AND 24),
  CHECK (username NOT GLOB '*[^a-z0-9_]*')
);

CREATE TABLE account_controls (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  review_mode TEXT NOT NULL DEFAULT 'auto' CHECK (review_mode IN ('auto','manual')),
  session_epoch INTEGER NOT NULL DEFAULT 1 CHECK (session_epoch > 0),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  write_token TEXT NOT NULL DEFAULT ''
);

CREATE TABLE account_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  session_epoch INTEGER NOT NULL CHECK (session_epoch > 0),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK (length(token_hash) = 64),
  CHECK (created_at <= last_seen_at AND last_seen_at < expires_at)
);
CREATE INDEX idx_account_sessions_owner ON account_sessions(account_id);
CREATE INDEX idx_account_sessions_expiry ON account_sessions(expires_at);

CREATE TABLE account_challenges (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('recovery','reset')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  UNIQUE (account_id,purpose),
  CHECK (length(token_hash) = 64),
  CHECK (expires_at IS NULL OR expires_at > created_at),
  CHECK (
    (purpose = 'recovery' AND expires_at IS NULL)
    OR (purpose = 'reset' AND expires_at IS NOT NULL)
  )
);
CREATE INDEX idx_account_challenges_expiry ON account_challenges(expires_at);

CREATE TABLE account_contribution_credits (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  content_kind TEXT NOT NULL CHECK (content_kind IN ('topic','reply')),
  content_id TEXT NOT NULL,
  credited_at INTEGER NOT NULL,
  PRIMARY KEY (content_kind,content_id)
);
CREATE INDEX idx_account_contribution_credits_owner ON account_contribution_credits(account_id);
-- topic/reply 的 ID 可能相同，必须连同 content_kind 去重，不能只 UNIQUE(content_id)。
-- content_id 故意不引用内容表：删帖不倒扣信用；每账号最多三条由同一 CAS 事务保证。

CREATE TABLE account_rate_limits (
  key TEXT PRIMARY KEY NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  blocked_until INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_account_rate_limits_expiry ON account_rate_limits(expires_at);

INSERT INTO settings(key,value)
SELECT 'accounts_v1_config','{"schema":1,"initialized":false,"registrationOpen":false}'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='accounts_v1_config');
```

账号 ID 用服务器随机 UUID，帖子作者存 `account:<uuid>`，原 ChatGPT ID 保持不变。启动核验/身份解析应拒绝平台 subject 与 `account:`、`guest:`、`deleted:` 内部命名空间冲突，不能按用户名构造 ID。用户名保留词、Unicode 规范化、昵称与密码编码合法性仍由服务端校验；SQL 约束是补充。

### 4.3 并发和原子性

D1 `batch()` 对一组语句提供事务回滚，但 **UPDATE 影响 0 行不等于 SQL 抛错**。不能检查完某条 CAS 失败后才发现其他语句已提交。拟复用项目的条件写模式：首条 CAS 包括账号 revision、session_epoch、状态、相关帖版本/审核状态和凭据快照等全部前置条件，成功写入服务器随机 write_token；后续每条写入都以本次 token 与新 revision 为条件。首条不成功则其余零写入，返回 409；唯一约束或 SQL 失败使整批回滚。不得给后续语句漏加条件。[S6]

- 注册：一次 batch 插入账号、controls、恢复码摘要及初始会话（须在事务中仍满足 initialized/registrationOpen）；用户名冲突整批回滚，绝不出现无密码资料/孤儿会话。响应丢失时用户可正常密码登录，重新生成恢复码；不能重新读取旧码明文。
- 登录与改密竞争：凭据校验后的会话 INSERT 同时校验账号密码快照/epoch/status；竞争失败不发 Cookie。管理员封禁/强制下线后，之前已开始的登录也不能重新生成有效旧会话。
- 审核通过与计数：针对本地作者主题或回复的 pending→approved 版本变更、按 (content_kind, content_id) 去重 credit（每账号最多三行）在同一受条件保护 batch；重复审批、并发审批或删除/恢复均不能重复记功。不得通过先批帖、后补计数造成一半完成。
- 每次新帖子/回复：在同一账号条件写事务中重新检查封禁/审核模式/已批准 credit，再写审核状态，不相信页面缓存或提交的 pending/authorKind。现有帖子 ID 幂等语义保留，重复请求不追加 credit。
- 改密、恢复、注销：凭据/恢复或重置码消费、epoch、会话撤销和账号变更分别形成单个受条件保护 batch。一次性码并发消费仅一条成功；旧的 `can_edit` 不作为写授权。

不得修改既有章节正文事务与 taxonomy 的 schema、revision、writeToken；账号控制字段是新表内独立的并发控制。

### 4.4 如何回退迁移

生产回退首选**代码回退且保留新表**，不是执行 Down，不恢复一份旧全库覆盖现有帖子。已有账号后的生产数据库不得 DROP 新表。数据保持在当前 D1，恢复新版时仍能使用。

下面是结构撤销 SQL，仅适用于尚未开放注册、所有 6 张新表均为 0 行、没有 `account:` 作者记录、已停用账号写入并核对备份的环境。执行器必须在执行前验证这些条件；不满足就拒绝。需要与迁移记录同步撤销，不能仅 DROP 后留下“0002 已应用”。已经有账号时，物理撤销会丢数据，**不提供作为普通生产回退步骤**。

```sql
DROP TABLE account_challenges;
DROP TABLE account_contribution_credits;
DROP TABLE account_sessions;
DROP TABLE account_controls;
DROP TABLE account_rate_limits;
DROP TABLE accounts;
DELETE FROM settings WHERE key='accounts_v1_config';
```

迁移本身只新增结构/关闭开关，不更新任何已有章节、媒体或讨论行。注册等功能上线后，只有明确的用户操作/管理员操作会改变相应账号和讨论作者资料；下面列明注销影响。

## 5. 一期身份识别与帖子归属

### 5.1 服务端身份模型

`identity()` 保留兼容的 `{id,name,admin}` 对外形状，内部明确 `chatgptSubject`、`localAccount`、`actorKind`、`ownedAuthorIds`、审核/封禁状态。一期两种身份独立，不查绑定表、不做账号合并。`/api/me` 只返回 UI 需要的来源摘要，不返回 session 摘要、恢复摘要、限流键或密码字段。管理权限只按 §3.1 计算，所有权集合不能用于后台授权。

| 本次可信平台身份 | 本站会话 | 生效身份和权限 |
| --- | --- | --- |
| 无 | 无/过期/伪造 | 公开阅读为游客；伪造 Cookie 写请求拒绝，受保护接口 401 |
| 无 | 有效 A | 本站账号 A，`admin=false`，按账号审核/封禁策略发言 |
| 普通 ChatGPT B | 无本站会话 | 原 ChatGPT 成员 B，原帖子归属与直接发言行为保持 |
| 普通 ChatGPT B | 有效 A | 论坛按既有 ChatGPT B 身份工作；界面明确显示当前发言来源，不合并 A、B 的所有权 |
| owner ChatGPT | 任意 | 本次具备管理员权限，来源明确为当前 ChatGPT；本地账号不因此成为管理员 |

同时有两种身份时，普通论坛延续 ChatGPT 优先；独立的 `/api/account/*` 只依据有效本站会话管理 A 的账号资料及 A 的私有发言，不能用 ChatGPT 证明替代密码会话。UI 明确区分“论坛当前使用 ChatGPT”与“本站账号 A”；希望以本站账号发言时先走原 ChatGPT 退出流程。使用账号页不会自动把平台帖子转为本站帖子，也不会改变 admin 公式。即使某人分别拥有两种身份，一期也无法把其关联为一个封禁主体。

身份只在请求内缓存；本站会话每请求检查 epoch/status。若账号模块 ready 却读不到表/控制行，该账号功能返回 503，携带本站身份的账号写请求失败关闭，不能静默降为游客或绕过本站审核。公开阅读与可信 owner 的修复入口保留；原 ChatGPT 独立路径不假装具备未实现的绑定状态。未初始化与真正旧库的兼容见 §10.2。

### 5.2 历史帖子和新帖子

- 原 ChatGPT 帖子保留原始 author_id，仅原平台身份继续管理。本站密码登录不获得任何 ChatGPT 历史帖子所有权。
- 本站新发言用 `account:<A.id>`、`author_kind='account'`、服务器昵称；ChatGPT 新发言仍用原 ID 和 member 种类。所有权集合一次仅取当前主体对应的作者 ID，不合并两者。
- `/api/account/posts` 仅查询当前本站会话 A 的 `account:<A.id>`；即使同时带平台身份也不扩展到 ChatGPT 帖子。普通论坛所有权检查依据当前论坛 actor；管理员动作另过 admin gate。
- **一期不认领游客内容**。注册前的 guest 待审内容仍属 guest；不按昵称、IP、提交 ID、localStorage 或签名 guest Cookie 认领，`lib/guests.ts` 保持不变。未来认领需另行设计。

### 5.3 前三条发言审核的已定口径

**主题和回复都计数，累计 3 条不同发言审核通过后转为自动发布。** `account_contribution_credits` 以 `(content_kind, content_id)` 唯一；主题 `x` 与回复 `x` 是两条内容，不应碰撞。只在 pending→approved 的审核事务中为该账号记功，最多三条；同一内容重复审批、请求重放、修改后再次批准均不能重复累计。被拒绝的不计；已获信用的内容后来删除不倒扣，也不能通过删除/恢复反复加分。

未满三条时，所有新主题/回复待审；提前提交的第 4 条仍待审。达到三条只影响之后提交的新内容，既有待审队列不自动公开。批准主题、批准回复和新发言必须在同一账号 CAS 规则下串行判断，防止并发丢计数或提前放行；回复仍保留原主题可见性/锁定检查。

`review_mode='manual'` 始终待审；auto 才按三条门槛。封禁禁止本站账号发帖/编辑。本站账号编辑公开内容时重新按当前审核策略判定，尚未达标或强制审核阶段改文回 pending，版本检查防止旧页面绕过；已计过 credit 的内容不重复记功。独立 ChatGPT 成员原行为、游客待审行为均保留。

### 5.4 注销与自己的待审内容

私有“我的发言”只取当前本站账号所有权，可见自己的公开/待审内容，分页且 no-store；公开列表、计数、详情和搜索仍不泄露待审内容。注销前可自行删自己的主题/回复；删除主题会级联删除其所有回复，确认框明确包括他人回复的既有影响，不静默改为软删除。

注销需当前本站会话、再次输入密码、同源请求和明确确认，不接受仅凭恢复码直接删除。范围严格是该账号的 `account:<id>` 主题/回复；**不触及任何独立 ChatGPT 历史或新发言**，即使同一浏览器同时登录 ChatGPT。

在一个受条件保护的 D1 batch 中，将范围内 topics/replies 的 author_name 实际写为“已注销用户”，author_id 改为每条独立的 `deleted:<随机UUID>`，author_kind='deleted'，version +1；保留内容 ID、正文、创建时间和锁定/隐藏/审核状态。随后删除账号及从属 controls、sessions、challenges、credits。在线库不保留原昵称、username 墓碑或作者映射；短期限流 HMAC 按最长 24 小时到期。唯一允许的私有恢复防复活记录，是 §10.3 的随机账号 ID 与注销时间清单，不含用户名、哈希、ChatGPT ID。正文主动写入的个人资料由用户注销前编辑/删除，系统不猜测改写。

发帖、改密和注销共用 controls revision/token 防并发，不能留下注销后的旧作者新帖。相同用户名可重注册，但产生全新 ID，不能认领匿名帖子；不删除 settings.owner_user_id 或平台账号。纯 ChatGPT 用户未注册本站时不显示注销本站账号操作。

**封禁范围是当前本站账号，不是永久封人。** 注销后重新注册从零审核；ChatGPT 入口和游客身份本就独立。不能暗中新增永久身份黑名单或假装可跨入口识别同一人。

### 5.5 第二期绑定的保留边界（本期不实施）

可选绑定/解绑留待二期专门设计；至少需本站会话和密码复核、当前可信 ChatGPT 身份、一次性挑战、双方唯一约束和并发控制。届时另审表结构、归属转换、注销范围与封禁策略，不能沿用未确认的旧草案。无论怎样绑定，只有**本次**可信 owner ChatGPT 才能管理站点，密码 Cookie 绝不继承 admin。

一期 SQL、接口、测试验收和逐文件实施清单均不含绑定功能；不提前建空绑定表，不放空接口或占位身份分支。

## 6. 恢复码与管理员重置

注册成功生成 32 字节随机恢复码，只显示一次，页面明确让用户离线保存；只保存带用途域分隔的 SHA-256 摘要。只在 HTTPS POST 响应正文返回一次，no-store，不进 URL、localStorage、日志或埋点。账号页只查“已设置/需重新生成”及生成时间，不能再展示旧码。更换恢复码需密码复核，生成后旧码立即失效。

恢复页输入用户名、恢复码、新密码和确认密码；同样实施 IP/用户名限流。一个事务原子消费有效码、写新随机盐密码哈希、撤销全部会话与其他重置挑战、生成新恢复码摘要；成功后显示新恢复码一次，要求重新密码登录。并发消费只有一个成功，失败统一“不正确或已失效”；无自动管理员或平台身份。密码改变/管理员重置采用相同撤销规则。

后台“生成一次性重置码”只允许当前 owner ChatGPT，生成 32 随机字节、15 分钟有效、只显示一次；每次重新生成废弃此前 reset 码。仅生成 reset 码不改变用户密码，消费时才撤销会话并替换密码。它只能用于设置新密码，不能直接登录、解除封禁或授予任何权限。封禁账号重置密码后仍然封禁。

不收联系方式意味着：**丢失密码和恢复码时，无法仅靠用户名安全找回。** 作者已确定人工核验只接受两种情况：用户仍能登录该本站账号（核验当前有效本站会话），或作者线下认识本人；不能以公开发帖截图、知道昵称、留言声称“我是本人”作为证明。无法核验时不发码，也不承诺必定找回。管理员把码通过已有私下渠道交给本人，不在论坛公开、不新增收集邮箱/证件；应用不自动发送消息。不得把 ChatGPT 身份、邮件、公开截图或其他未批准证据当作替代条件。[S8]

## 7. 页面与接口

### 7.1 页面

| 页面 | 内容/交互 |
| --- | --- |
| `/register` | 用户名、昵称、密码/确认；不需要 ChatGPT；提示前三帖审核与恢复码；成功一次显示恢复码 |
| `/login` | 用户名+密码为直接入口，另有原“使用 ChatGPT 登录”；恢复入口、明确的当前身份来源/退出提示 |
| `/account/recover` | 恢复码或管理员一次性重置码 + 新密码；通用失败提示，不显示账号是否存在 |
| `/account` | 当前登录来源、昵称修改、密码修改、恢复码状态/重生成、我的发言、退出、注销；封禁状态说明 |
| `/admin` 内“账号”页签 | 分页账号列表、注册时间/状态、审核进度、强制审核/解除强制、封禁/解封、生成重置码、强制下线；不显示密码/恢复摘要 |

沿用妙妙屋纸面、方块边框和材质导航；像素字体仅标题/导航/标签，账号表单与帖子正文使用系统字体。输入带 label、autocomplete（username/current-password/new-password）、清晰错误/焦点；提交防重复，但后端仍独立校验。密码与恢复码不出现在可分享预览或截图演示中。

### 7.2 拟新增的 API（全部仍在现有 catch-all 的精确分派内）

| 方法 / 路径 | 授权与作用 |
| --- | --- |
| POST `/api/auth/register` | 唯一的匿名注册入口；Origin + body 上限 + 双维限流 + 参数校验 |
| POST `/api/auth/login` | 匿名密码验证入口；相同保护；新服务端会话，封禁账号仅获得下述受限安全访问 |
| POST `/api/auth/recover` | 消费 recovery/reset + 改密，不自动登录；匿名但须令牌、限流 |
| POST `/api/account/logout` | 撤销当前本站会话；过期会话也可幂等清 Cookie，仍要求 Origin |
| GET `/api/account` | 当前账号摘要，不返回秘密、原始平台 subject；未注册账号返回相应提示 |
| PUT `/api/account/profile` | 只允许 nickname；拒绝 username/role/admin/status 注入 |
| POST `/api/account/password`、`/recovery` | 当前账号+密码复核；改密/重新生成恢复码 |
| GET `/api/account/posts` | 只读当前账号自己的内容，含待审，分页/no-store |
| DELETE `/api/account/posts/<kind>/<id>` | 所有权 + 当前有效本站会话、版本检查；允许删自己的待审内容 |
| DELETE `/api/account` | 密码复核 + 显式确认 + Origin；原子匿名化/删除 |
| GET `/api/admin/accounts` | 当前 owner，分页列表/筛选，安全字段投影 |
| PUT `/api/admin/accounts/<id>` | 当前 owner + expectedRevision；只改审核模式/封禁状态 |
| POST `/api/admin/accounts/<id>/reset-code` | 当前 owner，生成短期一次性码，no-store |
| POST `/api/admin/accounts/<id>/revoke-sessions` | 当前 owner，递增 epoch/删除会话，不伪称退出 ChatGPT |

DELETE 的密码/确认数据只放受长度限制的 JSON body，不放 URL；需要为 account DELETE 单独解析该 body，不能沿用现有 DELETE 一概不解析的逻辑。其他 DELETE 现有格式保持。敏感接口 schema 严格拒绝额外字段。

**权限分派的明确改动**：保留当前最前面的 Origin 检查和 admin gate；之后用精确 method+完整路径名单允许 register/login/recover 的匿名操作，另给同源 logout 仅清 Cookie/本次令牌的幂等例外。不能写成 `parts[0]==='auth'` 就放行所有子路径/方法。名单外的匿名写仍只保留既有 topics/replies 例外，其他返回 401。账户接口在这些 gate 后做会话/所有权检查；所有管理接口仍在 `/api/admin/` 下。admin gate 对普通账号始终在任何业务写入之前返回 403。

上述新 auth/account/me 路径不调用 `ensureSeed()` 或重放历史章节更新；其加入现有只读/专用路径的排除清单是必要的路由改动，但不改 seed 实现。恢复/登录不能靠触发历史内容初始化取得可用账号表。

## 8. 逐文件改动清单（未来实施，本 PR 不修改）

| 文件 | 拟变更与理由 | 边界 |
| --- | --- | --- |
| `lib/data.ts` 的 `identity()` | 必改：组合独立的平台/本站/游客，独立计算 admin、读取本站账号状态；不查绑定 | 作者已授权，但须先完成探针 PR 与结果审核；database/seed/章节读取不改 |
| `app/chatgpt-auth.ts` | **计划不改**：现有 getChatGPTUser、安全 returnTo 和平台登录/退出已足够 | 不把密码或绑定映射伪装成平台头；若平台兼容要求确需改，再停下说明 |
| `lib/guests.ts` | **计划不改**：首版不认领游客，不改 HMAC/Cookie/游客限流 | 新账号认证与限流用独立模块；不扩大游客权限 |
| `app/api/[...path]/route.ts` | 必改：精确匿名 auth 名单、账号/管理接口、分离 actorKind/pending、统一所有权、私有待审删除、审核credit事务 | 受保护权限分派；Origin/admin gate 不弱化；只修改获批的身份/账号相关逻辑 |
| `lib/account-passwords.ts`（新增） | PBKDF2 参数格式/随机盐/验证；恢复令牌摘要与域分隔 | server-only；无 Node 密码库或新依赖 |
| `lib/account-sessions.ts`（新增） | 不透明会话、Cookie、epoch、撤销、当前请求主体 | 不缓存 admin，不造 ChatGPT 登录 |
| `lib/account-rate-limit.ts`（新增） | 可信 IP 解析、HMAC 桶、原子预约/失败锁、TTL | 不复用 guest_limits 存账号画像 |
| `lib/accounts.ts`、`lib/account-ownership.ts`（新增） | 注册/恢复/注销、账号CAS/主题及回复审核信用、普通发言归属 | 参数化 SQL；不用于替代 admin gate |
| `db/schema.ts` | 添加上述 6 表/索引 | 既有表定义保持 |
| `drizzle/0002_accounts.sql` 与 `drizzle/meta/` 新快照/日志 | 作者已授权 0002；探针完成并经审核后才生成迁移 | 本批仅正文展示 SQL，不创建迁移、不执行生产写入 |
| `app/register/page.tsx`、`app/login/page.tsx`、`app/account/page.tsx`、`app/account/recover/page.tsx`、对应表单组件/CSS（新增） | 登录、注册和账号管理 | 与原内容编辑器分离；无外链字体/依赖 |
| `app/shared.tsx`、`app/site-shell.tsx` | 登录入口/账户菜单、来源和退出方式 | 保留原 ChatGPT 登录入口及后台链接 |
| `app/session-store.ts`、`app/session-user.tsx` | 账号摘要/登录来源；登录、退出、改密后刷新同一 store 代际 | 不额外重复请求 me；晚响应、BFCache隔离保留 |
| `app/community/forum.tsx`、`app/community/topic.tsx` | 服务端昵称、账号审核提示、“我的发言”链接 | 不扩展本批无关的 Markdown/分类功能；权限由服务端执行 |
| `app/admin/panel.tsx`、`app/admin/accounts-panel.tsx`（新增） | 账号管理页签、列表与动作 | 块编辑器、草稿发布、图库和分类交互不改 |
| `tests/accounts.ts`、`tests/account-migrations.ts`（新增）、`tests/run.mjs` | 身份/密码/会话/CSRF/审核/注销/迁移回退行为测试 | 不删除现有权限/旧图/分类/编辑器断言 |
| `tests/integration.ts`、`tests/session-user.ts`、必要的 runtime mock | 精确补充新返回字段/身份矩阵和 UI 刷新用例 | mock 仅测试，生产不得引入假头 |
| `README.md`、`SECURITY.md`、`EDITOR_GUIDE.md`、`docs/COMMUNITY_SETUP.md` | 登录方式、数据范围、恢复/注销与管理员操作说明 | 文档不得宣称无实测上限或已完成的安全认证 |

`app/admin/page.tsx`、`app/admin/style-preview/page.tsx`、`app/admin/sample/page.tsx` 的 ChatGPT+owner 守卫继续保留，不改成“任意已登录即可”。`lib/reader-chapter.ts` 的管理员预览判定继续使用独立的 admin。`app/admin/block-editor.tsx`、sanitize/旧图过滤、taxonomy 与章节发布事务、package.json、锁文件不在本批实施范围。

## 9. 测试与验收计划

此节是**未来账号实现**的测试清单，不是当前已通过的账号测试。沿用现有测试运行器，不新增依赖；在允许的 Workers/Sites 测试环境补 WebCrypto、Cookie/Origin 与 D1 并发验证，Node mock 不能独自证明平台行为。

| 类别 | 必须覆盖的行为 |
| --- | --- |
| admin 隔离 | 对 chapters、taxonomy、media、reader-preview、export、review、topics、accounts 及未知 `/api/admin/*`，逐一用有效普通账号调用各方法，必须 403；即使该账号由 owner 本人注册，无本次 owner 平台头也全部 403；没有 cookie 401；本次 owner 平台头才可通过；客户端 role/admin/owner 参数无效 |
| 平台信任 | 普通外部请求自行构造 oai 头不能经 Sites 获得管理员；应用源码只在受信平台运行；header去除/注入契约未经验证不得宣称防伪完成 |
| 凭据 | 同密码不同盐、正确/错误/未知用户、随机盐长度、记录参数校验、10/128码点与512B边界、长Unicode、不trim；日志/错误/URL/普通导出不含密码；恢复码仅允许在规定的一次性成功响应中出现；实际 Sites 支持参数与耗时 |
| 会话 | 随机伪造、篡改、重复同名Cookie、过长值、过期/闲置、已撤销、账号不存在、epoch落后均拒绝；logout/强制下线/改密后立即失效；与并发登录竞争不可复活；Cookie无Domain且属性完整 |
| CSRF | 每个写入口的同源成功/跨域、缺失Origin、null、多值、假端口、假子域、伪造forwarded头拒绝；不使用 GET 做账号业务写入；匿名auth白名单不接受其他方法和路径 |
| 限流 | 同IP换用户名、同用户名换IP均受限；未知用户名也计数；并发/多实例准确；跨计数窗口锁期不提前结束；恢复桶隔离；过期清理；IP头不可验证/缺少secret时失败关闭 |
| 名称/独立身份 | NFKC/大小写并发唯一；保留词、零宽/双向字符、伪造authorName拒绝；同时有 ChatGPT 与本站会话时论坛来源确定、所有权不合并；一期不存在绑定接口或 SQL 查询；普通账号不能通过同名 owner 升权 |
| 审核 | 主题和回复合计3条获批；同ID不同kind分别计数、同kind同ID重复不计；拒绝不计、满3条后credit饱和；提前第4条仍pending，批准第三条不自动发布队列；并发主题/回复审批无丢计数/提前放行；manual优先、本站封禁拒绝写；独立ChatGPT直接发布/游客待审保留 |
| 隐私/归属 | 旧ChatGPT帖子ID与归属不变；本站/ChatGPT双会话的独立can_edit集合；游客内容不认领；自己的待审仅私有API可见，公开列表/搜索/计数/URL仍不可见 |
| 恢复 | 一次显示/一次消费、并发只有一条成功、旧码失效、15分钟过期、生成新reset废弃旧码；重置不解封、不升权；人工核验仅当前有效本站登录或作者线下熟人，其他情况不发码 |
| 注销 | 全部相关作者字段落库匿名化；账号/盐哈希/会话/挑战/credit删除；独立ChatGPT帖子不改；正文与审核状态保留；并发发帖不留旧作者；同用户名重注册不能认领；封禁后旧Cookie失效，正确密码受限登录仍能注销，不能论坛写/后台；注销前删自己的待审内容，不能删他人 |
| 数据库 | Up在旧库成功且旧表逐字段不变；重复/半成品迁移不重置；FK/唯一/CHECK；冲突409无部分写入；Down只限空表；大量帖子注销的D1语句数/耗时与响应超时演练 |
| v19 回退 | 带新表/新帖子/匿名作者的库交给v19，章节/游客/原平台功能可用，账号入口不可用但数据仍在；v19再产生内容后重升新版数据仍完整；确认v19不消费本站会话、不把本站帖子错认成ChatGPT所有 |
| 原有回归 | 原权限、后台编辑、草稿/预览/发布、媒体、数据导出、旧图过滤、taxonomy CAS和七章链接全部保留；关闭注册后已有本站身份仍执行封禁/审核，删配置/错误initialized不能降级；完整 `node tests/run.mjs` 与 `pnpm build` |

注销若超出单 batch 的平台资源上限，不能改成“先删账号再慢慢匿名化”；应保持账号不变并返回可重试错误，另提审可恢复的分阶段协议。不在未测得上限时承诺无限帖子账号都可单次注销。

## 10. 平台探针、发布、备份与回退

### 10.1 平台探针必须先行

当前只推进平台探针 PR，完成后停下等作者和 Claude 审核；未有结果前不写账号业务代码、不建六表、不添加 0002。探针使用**仅当前 owner 可访问的只读诊断接口**，不依赖新增账号身份，不改 `app/chatgpt-auth.ts`、`lib/guests.ts`；不得调用 `ensureSeed()`、owner 初始化、session touch 或其他隐式写入。若 owner 尚未存在，拒绝并报告，不现场创建 owner。

| 检测项 | 只读检测与输出边界 | 什么不算证据 |
| --- | --- | --- |
| 可信访客 IP | 仅返回有/无及来源头名；不返回、记录或保存 IP 原文 | 仅发现某个 header 存在不能证明可信，须核实 Sites 转发边界，未核实报告未知 |
| 伪造平台头 | 对本站受控外部请求使用明确的非真实测试标记；观察 Sites 是否剥离/替换 `oai-authenticated-user-*`；报告剥离/保留/无法验证，绝不回显真实身份 | 普通匿名 401 只能证明未授权，不能单独证明所有头已剥离；不伪造 owner ID 来取得后台权限 |
| PBKDF2 | 固定非真实测试口令+随机盐，对 600,000 和 100,000 分别执行并报告计时结果或脱敏错误；标注 Workers 时钟限制，不保存派生结果 | 本地 Node 成功不是 Sites 成功；无 I/O 时计时 0 ms 不是耗时证明；浏览器 RTT 另列并注明包含网络/鉴权/D1 |
| 完整 D1 导出 | 只读核对是否可取得含结构、全部表/行和迁移记录的完整备份及可用恢复路径；输出能力状态/缺口，数据只进入私有位置 | 现有内容 JSON 不等于完整 D1；平台理论支持不等于作者具有导出权限 |

若接口无权独自观察某项（例如 Sites 入口处理或控制台导出权限），返回“无法验证/待平台证据”，不能用猜测的 true 代替。探针结果不包含密码、派生密钥、原始 IP、身份头值或数据库内容；完整导出与公开诊断响应分离。测量不得以绕过 owner 校验、放开匿名诊断、写伪造身份或线上测试账号来换取结果。

探针部署与运行需要单独审核安排；本轮只开探针 PR，不合并、不发布。结果完成后删除临时接口及专用探针实现，保留脱敏报告；删除也经正常 PR 流程。账号实现前须确认可信 IP、平台头边界、所选 KDF 支持和完整备份路径；未满足时不能开放注册。

### 10.2 账号分阶段上线（探针之后）

1. 按探针结果固定 600,000 或 100,000 次参数，记录实际环境/耗时/错误与备份能力；作者和 Claude 审核后才开始账号代码。
2. 兼容 PR：新增六表、兼容读取和独立注册开关，默认未初始化。无配置且新表全部不存在的真正旧库继续原 ChatGPT/游客/内容功能；账号页提示暂未开放，账号写接口 503，不在 identity 临时建表。新表已存在但缺配置、initialized=false 却已有账号均失败关闭，交 owner 修复；initialized=true 却表异常按 §5.1 处理。registrationOpen=false 仅停止新注册，不停用已有用户权限检查。
3. **迁移前完整备份并验证可恢复**。隔离库演练 Up、旧数据逐字段比较、代码回退、再升级；不用线上测试账号探测权限。
4. 经审核的正式迁移途径应用 0002，核验表/索引/外键/迁移登记；运行条件达标后服务器侧受控设置 initialized。此时仍不开放注册。
5. 账号实现 PR：一期接口/页面、恢复、后台管理、主题和回复审核、注销。身份/密码/并发/恢复测试通过，完整私有备份路径落实后才另行开放 registrationOpen；不实现绑定，不借此前样式性能免测跳过账号安全测试。
6. 每个 PR 完成后停下等审核；合并、发布与开启注册分别按作者指令进行。记录实际 Sites 版本、Git 提交、迁移号、备份时间与回退入口，不预编版本号。账号上线前现网继续 v19。

### 10.3 备份边界与已定保留期

旧后台 JSON 仍是内容备份，不混入密码哈希/恢复摘要/session。账号上线前必须落实私有完整 D1 导出与恢复通道（含 **6 张新表**、settings、全部原内容和迁移记录），仅作者可访问。Sites 是否向当前账号提供此能力须由探针及平台权限证据确认；Cloudflare 有导出/Time Travel 不等于本项目拥有权限。[S9]

若无完整导出途径，应另提 owner-only 私有完整备份工具方案并审核；**没有完整备份路径就不开放注册**。备份不进 GitHub、公开 R2 图库、任何公共位置或普通用户导出；哈希也属于凭据材料。恢复到新部署后清除全部 session/reset 挑战、递增 epoch，保留账号密码、未消费长期恢复码及审核进度。恢复应与内容、迁移版本一致，不能只恢复账号表而遗漏后续帖子。

作者已确定：**私有完整备份最多保留 30 天**，到期销毁，平台托管副本实际保留/删除能力也需核实并如实披露。注销删除在线账号数据，但历史备份中的旧副本不能保证即时消失；备份仅供灾难恢复，不能用于日常查询或替用户找回账号。

允许在私有受限位置保留**仅有随机账号 ID 与注销时间**的注销清单，不含用户名、昵称、哈希或平台 ID。恢复备份时先按清单重放注销，避免复活已删除账号；相关最后一份可恢复备份过期后删除清单对应条目。该清单不入 GitHub/公开位置，不作为永久封禁或历史身份映射。此政策已定，不再作为待作者选择事项。

### 10.4 回退到 v19 的准确行为

| 内容 | 回退 v19 后 |
| --- | --- |
| 六表、密码、审核资料 | 留在同一个 D1，v19 不读取；不得 DROP/清库/恢复旧快照 |
| 用户名密码登录 | **暂时不能用**；v19 无账号路由，入口不存在，本站 Cookie 被忽略；不得使全站报错 |
| 原 ChatGPT/游客/管理员 | 原功能和归属保持；没有绑定映射，owner 仍只来自本次平台身份 |
| 本站账号公开帖子 | author_name 已落库，v19 可显示；本站账号暂不能编辑，pending 仍不公开 |
| 已注销帖子 | 已落库为“已注销用户”，不依赖新渲染器，v19 仍显示正确 |
| 本站封禁/强制审核 | 资料保留但 v19 不实现本站账号登录或这些账号规则；不会因此把本站账号升级成原平台身份 |

v19 是保留数据的紧急代码回退，账号登录暂不可用。原 ChatGPT 与游客流程继续其原有行为；一期本来就没有将其与本站账号关联，不能借回退宣称跨身份封禁。若需回退期间保留本站登录/账号管理，应使用兼容修复版本而非纯 v19。

再次升级不重复播种/覆盖数据；核对迁移与数据后清除旧会话/短期挑战并递增 epoch，用户重新登录，封禁者仅受限安全访问。账号密码、长期恢复码、帖子、审核进度和回退期间 v19 新内容都保留。普通代码回退不回滚数据库时间点。

## 11. 作者已确定事项与剩余平台证据

本次决定覆盖旧设计的冲突部分，不重复请求批准：

1. 绑定移至二期，一期无 links 表、绑定接口或 identity 绑定分支。
2. 先 owner-only 只读平台探针 PR，结果出来并经审核前无账号代码；测完删除探针。
3. 600,000 次支持即使用，否则 100,000；密码最短 10 字符，不自动降到更低。
4. 主题和回复合计三条审核通过；拒绝不计，提前第 4 条仍待审。
5. 人工发重置码只接受仍能登录该本站账号或作者线下认识本人。
6. 私有完整备份最多 30 天，允许随机 ID+时间注销清单；没有完整备份路径不开放注册。
7. 已批准未来修改 identity/API 精确分派以及六表/0002；`app/chatgpt-auth.ts`、`lib/guests.ts` 不改，实施仍受探针顺序限制。

仍缺的是**事实证据**而非作者偏好：可信访客 IP 来源及其信任边界、外部伪造身份头是否被 Sites 剥离、两档 PBKDF2 实测与资源约束、完整 D1 私有导出/恢复权限和保留期。现阶段均不能写为已验证；未知或失败项须在探针报告中明确，停下等审核，不自行绕过。

## 12. 官方来源与核对日期

均于2026-11-09核对；来源事实与本项目提案参数分开。链接是技术依据，不是本项目已完成实测的证明。

- [S1 Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)：PBKDF2、随机数及 timingSafeEqual API。
- [S2 Cloudflare workerd #1346](https://github.com/cloudflare/workerd/issues/1346)：历史100,000限制与维护者对开源/生产差异的说明；[固定历史源码](https://github.com/cloudflare/workerd/blob/d1a3c89716591753406923e177b54da3475dd01c/src/workerd/api/crypto-impl-pbkdf2.c%2B%2B)仅作历史佐证，不能当当前Sites上限。
- [S3 OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)：PBKDF2-HMAC-SHA256 600,000次建议。
- [S4 Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)：通用CPU配额，不代表Sites实际套餐。
- [S5 MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)：__Host-、Secure、Path、HttpOnly等约束。
- [S6 D1 Database API](https://developers.cloudflare.com/d1/worker-api/d1-database/)：batch原子失败回滚及主库/会话读取边界。
- [S7 Cloudflare HTTP Headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)：CF-Connecting-IP与Worker子请求的不同表现。
- [S8 OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)：高熵、单次、过期、限流与一致错误响应。
- [S9 D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)：平台数据库恢复能力；本项目是否可操作仍待确认。
- [S10 Workers Performance](https://developers.cloudflare.com/workers/runtime-apis/performance/)：计时在 I/O 时推进的运行时限制；不得把 CPU 操作期间读数不变当成操作耗时为零。

## 13. 本文交付验证

2026-11-09 本次修订后重新验证；仅修改本设计文档，无账号功能、迁移文件或生产 SQL。线上版本不变。

```text
node tests/run.mjs    全部 PASS
pnpm build           exit 0；Build complete
git diff --check     exit 0
```

输出包括 166 API checks、taxonomy 205 HTTP expectations、12 rendered preview responses、catalog rollout SSR、7 public chapters reading rollout、shared session and forum loading 均 PASS。构建仍有原有 middleware 弃用与部分路由 Unknown 提示。

本次六表 Up SQL 与无账号空表 Down SQL 在临时内存 SQLite 实际执行通过：先加载现有 drizzle 结构，Up 新增恰好六张表、无 links 表，Down 后表数还原。此检查仅验证本地 SQL 语法、表数与空表撤销，不代表 D1 迁移、并发或全部安全约束已经验收。

**账号代码尚未实现，平台探针尚无实测结果。** 现有测试通过不等于新账号安全性已验收；真实 Sites 的 IP/身份头、PBKDF2、完整 D1 导出与私有备份恢复均待探针与后续核验。
