# 本站账号与可选 ChatGPT 绑定设计

状态：**仅设计，等待作者与 Claude 审核；未实现、未迁移、未合并、未发布。**

日期：2026-11-09（北京时间）。分支：`plan/accounts`。代码基线：main `f8fb0fa811b8a782da449d1c4cbcdcc2af9d2fa6`（PR #8 已合并）。当前线上为 Sites v19；其功能源码对应 `fa3dd1b`，后续差异是报告。本批唯一新增文件为本文。

## 1. 目标、既定规则与实施边界

访客可直接以用户名、密码注册和登录，不必拥有 ChatGPT。本站账号可主动绑定一个 ChatGPT 身份，也可始终不绑定。保留游客待审发言、原 ChatGPT 登录、站点所有者后台、编辑器、草稿/发布、图库、分类和原有链接。

作者已确定：注册时显示一次恢复码；丢失时由管理员人工核验后生成一次性重置码；新账号前 3 帖需审核，之后可直接发布；管理员可强制审核、封禁和强制下线；注销删除账号数据，保留帖子并显示“已注销用户”，注销前允许自行删帖。

本设计需要突破 AGENTS.md 的两项既有实施边界：**修改 `identity()`/精确权限分派，以及新增数据库表/迁移**。这是本批先出文档的理由，不视为已获得代码实施授权。本文列明变更后停止，下一批须经作者与 Claude 审核。现有 AGENTS.md、业务文件、迁移文件和依赖本批均不修改。

不新增依赖，不引入外部账号服务，不收集本站用户的邮箱、手机号、实名、头像或长期设备画像。账号模块不改章节正文、sanitize、旧截图过滤、taxonomy schema/CAS 或既有发布事务。

## 2. 对现状的核对

| 位置（main 基线） | 当前行为 | 对设计的影响 |
| --- | --- | --- |
| `app/chatgpt-auth.ts` | 从 Sites 注入的 `oai-authenticated-user-*` 读取平台身份；有安全 returnTo 与平台登录/退出链接 | 复用，不将本站密码接入该函数，不伪造平台头 |
| `lib/data.ts: identity()` | 仅识别 ChatGPT；`owner_user_id` 与当前平台 ID 比较；尚未建立 owner 时，可信平台邮箱匹配环境变量才执行一次性初始化 | 管理权源保持独立；注册、绑定、恢复接口绝不能设置 owner |
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

`accounts`、会话表、绑定表都没有 role/admin 字段。任何请求体中的 `admin`、`role`、`owner_user_id`、`authorId` 一律拒绝或不进入受信模型。用户名/昵称、绑定关系、曾经以 ChatGPT 登录过都不能赋予管理员权限。**绑定所有者 ChatGPT 的账号，仅凭密码 Cookie 发出的请求仍然不是管理员。**

保留原 owner 初始化机制，只允许 `getChatGPTUser()` 得到的可信平台用户参与；没有配置或没有匹配时不设 owner，不采用“第一个注册者就是管理员”。本次 owner 平台身份与本地账号被封禁/注销是独立事项，不能把唯一站点管理员锁死。

所有 `/api/admin/*` 在业务分派前统一检查上述 admin，包含未知路径及未来新接口。有效普通本站账号得到 **403**；完全未认证得到 401。后台页面仍要求 ChatGPT，再检查 owner；页面是否显示按钮不参与 API 授权。

### 3.2 密码算法、迭代次数与平台限制

方案参数：仅使用 Workers 内置 `crypto.subtle` 的 **PBKDF2-HMAC-SHA256，100,000 次，独立随机 32 字节盐，32 字节派生结果**。盐来自 `crypto.getRandomValues`，每次注册/改密/重置重新生成；编码为单个字段，例如 `pbkdf2-sha256$v1$100000$<salt-base64url>$<digest-base64url>`。校验按记录内的已支持版本与参数执行，严格限制长度/参数白名单，不能盲信数据库里任意大的迭代数字，也不能修改默认常量后使旧账号失效。使用 Workers `crypto.subtle.timingSafeEqual` 比较等长结果，不退化成提前返回的逐字节比较。[S1]

**100,000 是保守的生产兼容提案，不是已测得的 Sites 上限，也不等于满足 OWASP 建议。** 官方历史 workerd 源码曾硬限制 100,000；官方维护者随后说明开源 workerd 改为可配置、移除默认上限，但生产 Workers 当时仍有限制。当前官方 WebCrypto 文档未承诺本项目 Sites 的迭代上限。因此不能把本地 Node/Wrangler 的成功当作生产支持 600,000 次的证据。[S2]

OWASP 当前建议 PBKDF2-HMAC-SHA256 使用 600,000 次；本提案 100,000 低于该值。在线限流不弥补数据库泄露后的离线破解成本。实施前需在实际 Sites 运行环境用非真实密码的受控用例确认支持次数、耗时与配额；若支持 600,000 且成本可接受，提交参数更新供审核。若只支持 100,000，须由作者明确接受该折中，否则保持注册关闭。**不通过重复调用/自制加密算法冒充 600,000 次，也不因超时自动降低次数。**[S3]

Workers 通用 CPU 配额与 PBKDF2 单次迭代上限不同：官方 Free HTTP 请求 CPU 10 ms；Paid 默认 30 s，可配置到 5 min。Sites 使用的实际配额本批未知，不能套用其中某档作上线保证。[S4]

密码为 15–128 个 Unicode 码点、UTF-8 不超过 512 B，允许空格和长口令，不 trim、不静默规范化、不截断。校验两次输入一致，前端支持密码管理器与粘贴；服务端所有入口实施同一限制；密码字段不得复用现有 route.ts 的 `text()`，因为它会 trim。账号请求体最多 8 KiB，先限流再 KDF。未知用户名也执行固定参数 dummy KDF，避免明显的用户存在性时间差。只记录事件类型、结果码和请求关联号；不记录密码、请求体、Cookie、恢复码、重置码、完整认证头或密码哈希。异常响应不回显 SQL 参数和提交值。

### 3.3 服务端会话与 CSRF

Cookie：`__Host-mm-session=<32随机字节的base64url>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`，不设 Domain。数据库仅存令牌 SHA-256 摘要。高熵随机令牌/恢复码可用 SHA-256 摘要，**用户密码不能用普通 SHA-256 替代 PBKDF2**。[S5]

绝对期限 7 天，闲置期限 24 小时；last_seen 最多每 15 分钟更新一次，真实有效期以服务端为准。登录成功生成全新令牌，不接受客户端指定 session ID；同名Cookie出现多份时拒绝解析，不任取第一份。每请求查会话、账号状态与 `session_epoch`，禁止跨请求缓存授权；使用 D1 主库读取，避免副本延迟使封禁/强制下线暂时失效。[S6]

退出删除当前会话并清 Cookie；管理员“强制下线”、改密、重置、封禁/解封递增账号 session_epoch 并删除全部会话。登录创建会话须条件检查密码验证时的 epoch/凭据/status仍相同（active为普通访问，banned为上述安全白名单），否则与同时改密/封禁竞争时拒绝建立旧会话。绑定/解绑也撤销并旋转本站会话。会话不保存任何管理员布尔值。封禁操作先使所有旧会话失效；之后正确密码仍可新建当前epoch的**受限安全会话**，只允许 GET account/自己的posts、POST logout/password/recovery、DELETE自己的posts/account。权限每请求从status推导，不另存role；论坛发帖/编辑、profile、绑定/解绑及全部后台接口拒绝。这样封禁用户仍可改密、保存恢复码或注销，不会被锁死在登录门外。

收到格式错误/伪造的本站Cookie时，公开只读可按游客展示，但携带它的写请求先拒绝401并要求清理/重新登录，不能暗中降级成游客发帖。主动清除身份后仍可走原游客待审流程；不宣称账号封禁可以永久识别匿名浏览者。

本地会话退出不会退出 ChatGPT 平台。UI 分别说明“退出本站账号”和“退出 ChatGPT”；用户选择仅密码模式但浏览器仍带 owner 的平台身份时，应先走原平台退出流程。后台强制下线只能撤销本站会话，不能声称撤销 ChatGPT 平台会话；被封禁的绑定账号在 ChatGPT 入口也要经过本地封禁判断（owner 本次平台管理身份除外）。

**应用所有写入口**（注册、登录、退出、改密、恢复、绑定、解绑、注销、发言、后台）统一在解析主体/查账户/执行 KDF 前检查 Origin。要求与部署侧配置 `AUTH_PUBLIC_ORIGIN` 的本站受信 HTTPS origin 精确匹配，且请求目标也匹配；切换自定义域名时显式更新配置并重新登录，不从客户端Host推导信任；缺失、`null`、多值、错误端口、相似子域均返回 403。不接受用 Referer 或 X-Forwarded-Host 绕过；不开放带凭据的跨域 CORS。维持现有 route 的同源检查，并在未来实施中核实 Sites 转发的请求 origin 契约。SameSite 仅为补充，不替代 Origin。平台自管的 `/signin-with-chatgpt`、`/callback`、`/signout-with-chatgpt` 继续由 Sites 处理，不在应用自造 OAuth 回调或改写为密码登录。

### 3.4 用户名、昵称及双维限流

用户名先 NFKC、去首尾空白、ASCII 小写，再要求 `[a-z0-9_]{3,24}`；只存规范化结果，数据库 UNIQUE 作为最终保证。中文由昵称表达。用户名创建后首版不可更名。并发注册同名只有一个成功，不用“先 SELECT 再 INSERT”作为唯一检查。用户名可用性是公开注册界面的有限信息，失败统一“名称不可使用”，不另开无节流探测接口。

用户名与昵称都执行保留名称检查：NFKC、大小写折叠、移除空格/常见分隔符后，禁止 `admin`、`administrator`、`root`、`moderator`、`official`、`miaomiao`、`miaomiaohouse`、`管理员`、`站长`、`版主`、`妙妙屋`、`AI妙妙屋`、`官方` 及带这些保留词的伪装变体。拒绝控制字符、双向文本控制符、零宽格式字符与不可见昵称。昵称 2–24 个 Unicode 码点，用纯文本渲染；昵称不是唯一凭证，不授予官方标识。官方标识仅由本次可信 owner 服务器输出。

本站账号新发言忽略客户端 authorName，读取账号昵称；游客/普通 ChatGPT 成员新填写的发言昵称同样检查保留词（不回写历史昵称），防止绕开注册页冒充。原平台 owner 的实际发言可带服务器生成的官方标识；与其绑定的**密码登录**账号不获得此标识。

初始限流参数（项目提案，非平台保证）：

| 入口 | IP 桶 | 规范化用户名桶 | 失败锁定 |
| --- | --- | --- | --- |
| 登录 | 每 15 分钟 30 次尝试 | 每 15 分钟 10 次尝试 | 用户名失败 5 次锁 15 分钟；IP 失败 20 次锁 15 分钟 |
| 注册 | 每小时 5 次尝试 | 每小时 5 次尝试 | 达上限锁到窗口结束，包括名称冲突/格式失败 |
| 恢复/重置 | 每 15 分钟 10 次尝试 | 每 15 分钟 5 次尝试 | 独立恢复桶锁 15 分钟，不无限延长密码登录锁 |
| 改密/解绑/注销的密码复核 | 每 15 分钟 20 次 | 每账号 15 分钟 5 次失败 | 独立敏感操作锁 15 分钟 |

另设全站认证尝试每分钟 120 次的成本上限；所有桶均在 KDF 前用 D1 原子 UPSERT/条件 UPDATE 预约，不使用 Worker 内存 Map。并发和多个边缘实例不能超发；锁内请求不再次延长锁期。登录成功不清 IP/全站桶；不允许用一个正确账号洗掉攻击来源计数。返回 429 与 Retry-After；未知用户名也进入同样计数。发生存储错误时认证写入失败关闭，不放行无限尝试。

IP 只接受**核实过 Sites 可信转发链路**的来源。不能直接相信任意 X-Forwarded-For；Cloudflare 文档说明 CF-Connecting-IP 在 Worker 子请求场景可能不同于直接访客请求。启用注册前必须确认该站点取得的是可信访客 IP；本批未完成此平台验证。无法确认时注册/密码认证保持关闭并提示暂不可用，不能跳过 IP 桶。[S7]

限流键为服务端 `AUTH_RATE_KEY` 的 HMAC（用途、规范化 IP 或用户名；**不把时间窗口放进键**），不存原始 IP、UA 或用户名到限流表；密钥放 Sites secret，不入 settings/仓库/内容导出。短期伪名键仍是安全元数据，不宣称匿名。`window_start` 管理计数窗口；窗口轮换可重置 count/failures，但必须保留尚未到期的 blocked_until，expires_at 至少覆盖锁定截止。否则在窗口末尾触发的15分钟锁会在下一窗口被绕过。密钥轮换同样不能清掉尚有效的锁。窗口过期后惰性限量清理，最长保留 24 小时；D1 中只保留计数与到期时间。未提供密钥时失败关闭。IPv6 地址需规范化，不能让同一地址的不同写法换桶。

### 3.5 最小数据

账号资料只有内部随机 ID、用户名、昵称、密码哈希编码、创建时间、状态。没有邮箱、手机号、实名。会话、恢复摘要、绑定的 ChatGPT subject、限流计数和审核进度是实现本任务必需的独立安全表，下面逐表列出；不能将“只保存五类资料”解释成不存撤销会话或恢复所需的数据。

绑定只保存平台不透明 userId，不复制 ChatGPT 邮箱或姓名。原平台登录解析临时读取邮箱以保持现有 owner 初始化逻辑；这些数据不进入本站 accounts 表、日志或新的备份资料字段。

## 4. 新表、迁移 SQL 与事务约束

### 4.1 数据结构

共新增 7 张表；不 ALTER/重建现有 chapters、media、topics、replies、settings、guest_limits；不改已有 author_id，无用户资料批量初始化。

| 表 | 用途与生命周期 |
| --- | --- |
| `accounts` | 最小账号资料；status 只有 active/banned，永久注销实际 DELETE |
| `account_controls` | 审核模式 auto/manual；会话撤销 epoch；账号写 CAS revision/token；无角色字段 |
| `account_sessions` | 令牌摘要、账号、epoch、创建/最后访问/绝对到期；撤销删除，过期清理 |
| `account_chatgpt_links` | 一账号最多一个 ChatGPT，一 ChatGPT 最多一个账号；明确绑定时间 |
| `account_challenges` | 恢复码、管理员重置码、绑定一次性 nonce 的摘要；绑定 nonce 限定发起会话和待绑定的平台subject；使用后删除 |
| `account_topic_credits` | 前 3 个审核通过主题帖的去重凭据；最多 3 行/账号；删除帖子不倒扣进度，注销随账号删除 |
| `account_rate_limits` | 无明文 IP/用户名的短期限流桶；没有长期设备档案 |

`accounts_v1_config` 在 settings 中保存 `{schema:1, initialized:false, registrationOpen:false}`，独立于 `taxonomy_v1`。initialized 是结构/运行条件已验证的单向标记，registrationOpen 才是暂停新注册的开关。迁移完成、核验运行条件后才由受控步骤设置 initialized=true；此后密码登录、已有会话、绑定、封禁与审核检查持续工作，关闭 registrationOpen 不能停用这些检查。存在账号后不允许把 initialized 改回false或删配置来模拟旧库。若以后要暂停密码登录，应另审独立维护机制，不复用注册开关。两字段不能由注册/普通用户写入。密码字段包含算法与盐，所以无需额外的个人资料字段。

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

CREATE TABLE account_chatgpt_links (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  chatgpt_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE account_challenges (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('recovery','reset','link')),
  bound_session_hash TEXT REFERENCES account_sessions(token_hash) ON DELETE CASCADE,
  link_chatgpt_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  UNIQUE (account_id,purpose),
  CHECK (length(token_hash) = 64),
  CHECK (expires_at IS NULL OR expires_at > created_at),
  CHECK (
    (purpose = 'recovery' AND bound_session_hash IS NULL AND link_chatgpt_id IS NULL AND expires_at IS NULL)
    OR (purpose = 'reset' AND bound_session_hash IS NULL AND link_chatgpt_id IS NULL AND expires_at IS NOT NULL)
    OR (purpose = 'link' AND bound_session_hash IS NOT NULL AND link_chatgpt_id IS NOT NULL AND expires_at IS NOT NULL)
  )
);
CREATE INDEX idx_account_challenges_expiry ON account_challenges(expires_at);

CREATE TABLE account_topic_credits (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL UNIQUE,
  credited_at INTEGER NOT NULL,
  PRIMARY KEY (account_id,topic_id)
);
-- topic_id 故意不引用 topics：删帖不能使相同已获得的审核进度被重复计算/倒扣。

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
- 审核通过与计数：针对本地作者主题帖的 pending→approved 版本变更、去重 credit（最多三行）在同一受条件保护 batch；重复审批、并发审批或删除/恢复均不能重复记功。不得通过先批帖、后补计数造成一半完成。
- 每次新帖子/回复：在同一账号条件写事务中重新检查封禁/审核模式/已批准 credit，再写审核状态，不相信页面缓存或提交的 pending/authorKind。现有帖子 ID 幂等语义保留，重复请求不追加 credit。
- 改密、恢复、绑定/解绑、注销：凭据/nonce 消费、epoch、会话撤销、绑定和账号变更分别形成单个受条件保护 batch。nonce 并发消费仅一条成功；旧的 `can_edit` 不作为写授权。

不得修改既有章节正文事务与 taxonomy 的 schema、revision、writeToken；账号控制字段是新表内独立的并发控制。

### 4.4 如何回退迁移

生产回退首选**代码回退且保留新表**，不是执行 Down，不恢复一份旧全库覆盖现有帖子。已有账号后的生产数据库不得 DROP 新表。数据保持在当前 D1，恢复新版时仍能使用。

下面是结构撤销 SQL，仅适用于尚未开放注册、所有 7 张新表均为 0 行、没有 `account:` 作者记录、已停用账号写入并核对备份的环境。执行器必须在执行前验证这些条件；不满足就拒绝。需要与迁移记录同步撤销，不能仅 DROP 后留下“0002 已应用”。已经有账号时，物理撤销会丢数据，**不提供作为普通生产回退步骤**。

```sql
DROP TABLE account_challenges;
DROP TABLE account_topic_credits;
DROP TABLE account_chatgpt_links;
DROP TABLE account_sessions;
DROP TABLE account_controls;
DROP TABLE account_rate_limits;
DROP TABLE accounts;
DELETE FROM settings WHERE key='accounts_v1_config';
```

迁移本身只新增结构/关闭开关，不更新任何已有章节、媒体或讨论行。注册等功能上线后，只有明确的用户操作/管理员操作会改变相应账号和讨论作者资料；下面列明注销影响。

## 5. 身份识别、绑定与帖子归属

### 5.1 服务端身份模型

`identity()` 保留兼容的 `{id,name,admin}` 对外形状，内部增加分离的 `chatgptSubject`、`localAccount`、`actorKind`、`ownedAuthorIds`、审核/封禁状态。`/api/me` 只返回 UI 需要的摘要，不返回 session 摘要、绑定 subject 列表、恢复摘要、限流键或密码字段。管理权限只由 §3.1 计算；`ownedAuthorIds` 只管自己的普通发言，不能用于后台权限。

| 本次可信平台身份 | 本站会话 | 生效身份和权限 |
| --- | --- | --- |
| 无 | 无/过期/伪造 | 游客；伪造会话不获得写/编辑权；受保护接口 401 |
| 无 | 有效 A | 本站账号 A，`admin=false`；即使 A 绑定 owner 也一样 |
| 普通 ChatGPT B | 无，且 B 未绑定 | 保持原 ChatGPT 成员，原帖子归属与直接发言不变 |
| 普通 ChatGPT B | B 已绑定 A（可无本站 Cookie） | 以关联账号 A 的论坛身份/审核/封禁策略工作；不额外造密码会话 |
| owner ChatGPT | 任意 | 本次具备管理员权限，来源标明 ChatGPT；本地账号从未获得该角色 |
| 普通 B | 同时有未与 B 绑定的 A 会话 | 普通论坛行为优先 B；显示身份冲突，不自动合并；账号敏感操作返回 409，要求明确退出一种身份或进入绑定流程 |

模块可用时，已绑定的普通平台用户必须查询同一账号状态，不能在绑定仍存在时通过切换登录入口绕过本地封禁或强制审核。封禁账号仍可只读公开页面；账号安全页可显示封禁说明，允许经密码复核后的退出/注销，不允许发言或自行解绑绕过封禁。owner 本次平台后台身份不受本地账号封禁影响，owner 可解除错误封禁。

身份只在请求内缓存，服务端所有权辅助函数统一校验。若声明账号模块 ready 却读不到表/控制行，应返回账号功能 503、阻止论坛写入，不能静默降级为“未绑定 ChatGPT 直接发布”。公开阅读与可信 owner 的修复入口尽量保留，不能给失败状态授权。

### 5.2 绑定/解绑流程

绑定须同时证明两个身份：当前有效本站会话、再次验证本站密码、当前 Sites 认证的 ChatGPT 身份，以及一次性绑定 nonce。如尚未登录ChatGPT，先走既有平台登录链接返回账号页；随后同源 POST start 建立10分钟nonce，服务端同时固定当前本站session与本次可信ChatGPT subject到challenge.link_chatgpt_id。页面显示这个快照对应的待绑定身份，让用户确认后以密码+nonce提交confirm。确认时必须重新读取平台头，且其subject与challenge快照完全一致；另一标签切换ChatGPT身份后须409重新确认，不能误绑新身份。nonce仅留页面内存，刷新重新发起，不能进URL/localStorage。ChatGPT ID不从请求体采信；绑定start/confirm是身份冲突场景下的精确例外，两份证明都必须分别验证，不能沿用冲突状态下的普通账号操作。

冲突（一方已绑定其他身份）返回 409，绝不覆盖。客户端提供的邮箱、昵称、用户名、returnTo 都不能用于自动关联。数据库两个唯一约束和事务防止并发抢绑。绑定完成后撤销旧本站会话、生成新会话，删除 nonce；不写 owner、不改原 ChatGPT 帖子的 author_id。

解绑需当前本站账号证明、密码复核与同源 POST；成功撤销本站会话并删除绑定。若只通过 ChatGPT 登录且无本站会话，先用密码完成本站登录；无有效密码走恢复。封禁时不允许自行解绑。本站账号密码仍可独立登录，不会因解绑失去全部登录方式。退出 ChatGPT 平台不是解绑，解绑也不是退出平台。

### 5.3 历史帖子和新帖子

- 原 ChatGPT 帖子保留原始 author_id，不批量转移。未绑定时仍由相同平台身份管理。
- 绑定后本站账号的普通发言所有权集合为 `account:<A.id>` 加当前已验证绑定的 ChatGPT ID；因此用密码可管理已经明确绑定身份的普通历史帖子，但**不得置顶、锁定、隐藏、审核或编辑教程**。解绑后不再通过密码拥有 ChatGPT 历史帖子；平台用户仍可管理它们。
- 本站账号及其绑定平台入口的新发言统一写 `account:<A.id>`、`author_kind='account'`、服务器昵称，避免来源切换后割裂。未绑定 ChatGPT 新发言继续原 ID、member 种类。owner 的后台行为仍依据当前平台权源。
- 新账号不会因绑定一个旧 ChatGPT 身份自动拿到审核信用，历史 ChatGPT 主题帖不补记前三帖进度。
- **首版不认领游客内容**。注册后原游客待审内容仍属 guest，不按昵称、IP、提交 ID 或 localStorage 认领；也不把签名 guest Cookie 升级为编辑凭证。这样 `lib/guests.ts` 可保持原样。未来认领需独立设计并审批。

### 5.4 前三帖规则的明确口径

提案将“前三帖”定义为 **3 篇不同主题帖经管理员审核通过**，回复与主题共用审核状态但回复不计入三篇。未达到 3 个 credit 时，所有新主题/回复均 pending；第 4 篇若在前三篇审核通过前提交，也保持 pending，不能通过连续发四篇绕过。达到门槛只影响之后的新发言，原待审队列不自动公开。被拒绝的帖不记功；用户删掉已批准帖不倒扣信用；重复请求/重复批准不累计。

`review_mode='manual'` 始终待审，auto 才按三篇门槛；封禁禁止发言与编辑。管理员可以把账号改回 manual，不能在账号表加 admin 角色。本站账号编辑已批准发言时重新按当前审核策略判定；仍在试用/强制审核阶段的改文回 pending，版本检查防止用旧页面绕过。普通未绑定 ChatGPT 成员的原行为保留。

这是对作者规则的防绕过落地口径，需在审核中确认“帖是否只计主题、是否以审核通过为门槛”，本批不擅自实现另一种含义。

### 5.5 注销与自己的待审内容

新增私有“我的发言”：只从服务端所有权集合取记录，可看到自己的待审/公开内容，响应 no-store；公开列表、计数、详情和搜索仍不泄漏待审内容。用户可在注销前删除自己的主题/回复。现有删除主题会级联删除其所有回复，确认框须明确包括他人回复的影响；本批方案保留该既有语义，不静默改为软删除。

注销需重新输入密码、同源请求、明确确认，不接受仅凭恢复码直接删除。以注销事务提交时的有效所有权集合为范围：本站 `account:` 帖子，以及**当前仍绑定**的 ChatGPT 历史帖子，一并匿名化。界面显示两类数量，说明若希望保留独立 ChatGPT 历史归属，应先解绑；已解绑的历史平台帖子不在此次范围。此范围选择列入作者审核项。

在一个受条件保护的 D1 batch 中，将范围内 topics/replies 的 `author_name` 实际写为“已注销用户”，`author_id` 改成每条独立的 `deleted:<随机UUID>`，`author_kind='deleted'`，version +1；保留帖子 ID、正文、创建时间、锁定/隐藏/审核状态。不仅在渲染层换名字。随后删除账号及所有从属 controls、sessions、links、challenges、credits。不能保留旧 ID 到匿名 ID 的映射、原昵称或 username 墓碑；短期限流 HMAC 无账号 FK，仍按最长 24 小时自动到期。已有正文若自行包含个人资料，注销前由用户编辑/删除，系统不猜测并改写正文。

并发发帖/绑解绑/改密与注销按同一 controls revision/token 串行判定，不能留下注销后的实名新帖。用户名可被重新注册，但新 ID 全新，永远不能认领匿名帖子。删除本地 owner 绑定账号不删除 `owner_user_id`，也不删除其 ChatGPT 平台账号。纯 ChatGPT 登录且从未注册本站账号者不显示“注销本站账号”。

**封禁范围是当前账号，不是永久封人。** 注销删除绑定与账号资料后，同一ChatGPT可能重新成为独立平台成员，也可能重新注册新账号；新注册仍从零审核。退出身份后也无法靠不收集个人信息的系统永久识别访客。保留游客待审与现有限流，不暗中保留永久ChatGPT黑名单来违背删除数据承诺。如果作者希望注销后仍永久封禁原平台身份，须另审数据保留规则，不能把它作为已实现保证。

## 6. 恢复码与管理员重置

注册成功生成 32 字节随机恢复码，只显示一次，页面明确让用户离线保存；只保存带用途域分隔的 SHA-256 摘要。只在 HTTPS POST 响应正文返回一次，no-store，不进 URL、localStorage、日志或埋点。账号页只查“已设置/需重新生成”及生成时间，不能再展示旧码。更换恢复码需密码复核，生成后旧码立即失效。

恢复页输入用户名、恢复码、新密码和确认密码；同样实施 IP/用户名限流。一个事务原子消费有效码、写新随机盐密码哈希、撤销全部会话与其他重置/绑定挑战、生成新恢复码摘要；成功后显示新恢复码一次，要求重新密码登录。并发消费只有一个成功，失败统一“不正确或已失效”；无自动管理员或平台身份。密码改变/管理员重置采用相同撤销规则。

后台“生成一次性重置码”只允许当前 owner ChatGPT，生成 32 随机字节、15 分钟有效、只显示一次；每次重新生成废弃此前 reset 码。仅生成 reset 码不改变用户密码，消费时才撤销会话并替换密码。它只能用于设置新密码，不能直接登录、解绑、解除封禁或授予任何权限。封禁账号重置密码后仍然封禁。

不收联系方式意味着：**丢失密码和恢复码时，无法仅靠用户名安全找回。** 管理员发码前须通过已有有效会话、当前认证的已绑定 ChatGPT，或可靠的既有线下关系核验；不能以公开发帖截图、知道昵称、留言声称“我是本人”作为证明。无法核验时不发码，也不承诺必定找回。管理员把码通过已有私下渠道交给本人，不在论坛公开、不新增收集邮箱/证件；应用不自动发送消息。人工核验标准须作者确认。[S8]

## 7. 页面与接口

### 7.1 页面

| 页面 | 内容/交互 |
| --- | --- |
| `/register` | 用户名、昵称、密码/确认；不需要 ChatGPT；提示前三帖审核与恢复码；成功一次显示恢复码 |
| `/login` | 用户名+密码为直接入口，另有原“使用 ChatGPT 登录”；恢复入口、明确的身份冲突/退出提示 |
| `/account/recover` | 恢复码或管理员一次性重置码 + 新密码；通用失败提示，不显示账号是否存在 |
| `/account` | 当前登录来源、昵称修改、密码修改、恢复码状态/重生成、绑定/解绑、我的发言、退出、注销；封禁状态说明 |
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
| POST `/api/account/chatgpt-link/start`、`/confirm`、`/unlink` | 上述双重证明/一次性 nonce/密码；所有步骤同源写入 |
| GET `/api/account/posts` | 只读当前账号自己的内容，含待审，分页/no-store |
| DELETE `/api/account/posts/<kind>/<id>` | 所有权 + 当前密码会话或对应绑定平台主体、版本检查；允许删自己的待审内容 |
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
| `lib/data.ts` 的 `identity()` | 必改：组合平台/本站/游客，独立计算 admin、读取绑定/账号状态 | 受保护文件；必须先审批；database/seed/章节读取不改 |
| `app/chatgpt-auth.ts` | **计划不改**：现有 getChatGPTUser、安全 returnTo 和平台登录/退出已足够 | 不把密码或绑定映射伪装成平台头；若平台兼容要求确需改，再停下说明 |
| `lib/guests.ts` | **计划不改**：首版不认领游客，不改 HMAC/Cookie/游客限流 | 新账号认证与限流用独立模块；不扩大游客权限 |
| `app/api/[...path]/route.ts` | 必改：精确匿名 auth 名单、账号/管理接口、分离 actorKind/pending、统一所有权、私有待审删除、审核credit事务 | 受保护权限分派；Origin/admin gate 不弱化；只修改获批的身份/账号相关逻辑 |
| `lib/account-passwords.ts`（新增） | PBKDF2 参数格式/随机盐/验证；恢复令牌摘要与域分隔 | server-only；无 Node 密码库或新依赖 |
| `lib/account-sessions.ts`（新增） | 不透明会话、Cookie、epoch、撤销、当前请求主体 | 不缓存 admin，不造 ChatGPT 登录 |
| `lib/account-rate-limit.ts`（新增） | 可信 IP 解析、HMAC 桶、原子预约/失败锁、TTL | 不复用 guest_limits 存账号画像 |
| `lib/accounts.ts`、`lib/account-ownership.ts`（新增） | 注册/恢复/绑定/注销、账号CAS/审核信用、普通发言归属 | 参数化 SQL；不用于替代 admin gate |
| `db/schema.ts` | 添加上述 7 表/索引 | 既有表定义保持 |
| `drizzle/0002_accounts.sql` 与 `drizzle/meta/` 新快照/日志 | 经审核后生成新增迁移 | 本批仅正文展示 SQL，不创建迁移、不执行生产写入 |
| `app/register/page.tsx`、`app/login/page.tsx`、`app/account/page.tsx`、`app/account/recover/page.tsx`、对应表单组件/CSS（新增） | 登录、注册和账号管理 | 与原内容编辑器分离；无外链字体/依赖 |
| `app/shared.tsx`、`app/site-shell.tsx` | 登录入口/账户菜单、来源和退出方式 | 保留原 ChatGPT 登录入口及后台链接 |
| `app/session-store.ts`、`app/session-user.tsx` | 账号摘要/登录来源；登录、退出、绑定、改密后刷新同一 store 代际 | 不额外重复请求 me；晚响应、BFCache隔离保留 |
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
| admin 隔离 | 对 chapters、taxonomy、media、reader-preview、export、review、topics、accounts 及未知 `/api/admin/*`，逐一用有效普通账号调用各方法，必须 403；本地绑定 owner 但无 owner 本次平台头也全部 403；没有 cookie 401；本次 owner 平台头才可通过；客户端 role/admin/owner 参数无效 |
| 平台信任 | 普通外部请求自行构造 oai 头不能经 Sites 获得管理员；应用源码只在受信平台运行；header去除/注入契约未经验证不得宣称防伪完成 |
| 凭据 | 同密码不同盐、正确/错误/未知用户、随机盐长度、记录参数校验、长Unicode边界、不trim；日志/错误/URL/普通导出不含密码；恢复码仅允许在规定的一次性成功响应中出现；实际 Sites 支持参数与耗时 |
| 会话 | 随机伪造、篡改、重复同名Cookie、过长值、过期/闲置、已撤销、账号不存在、epoch落后均拒绝；logout/强制下线/改密后立即失效；与并发登录竞争不可复活；Cookie无Domain且属性完整 |
| CSRF | 每个写入口的同源成功/跨域、缺失Origin、null、多值、假端口、假子域、伪造forwarded头拒绝；不使用 GET 做账号业务写入；匿名auth白名单不接受其他方法和路径 |
| 限流 | 同IP换用户名、同用户名换IP均受限；未知用户名也计数；并发/多实例准确；跨计数窗口锁期不提前结束；恢复桶隔离；过期清理；IP头不可验证/缺少secret时失败关闭 |
| 名称/绑定 | NFKC/大小写并发唯一；保留词、零宽/双向字符、伪造authorName拒绝；需两个身份+密码+nonce，重放/过期/错session/抢绑409；不同主体不自动合并；绑定owner密码模式无管理权；确认页后切换平台身份返回409 |
| 审核 | 前3个不同已批主题门槛、回复不加分、四帖并发仍pending、重复请求/审批不加分、manual优先、封禁换ChatGPT入口不可绕过；旧ChatGPT直接发布/游客待审仍在 |
| 隐私/归属 | 旧ChatGPT帖子ID与归属不变；绑定/解绑后的can_edit集合；游客内容不认领；自己的待审仅私有API可见，公开列表/搜索/计数/URL仍不可见 |
| 恢复 | 一次显示/一次消费、并发只有一条成功、旧码失效、15分钟过期、生成新reset废弃旧码；重置不解封、不升权；无法证明归属不发码 |
| 注销 | 全部相关作者字段落库匿名化；账号/盐哈希/会话/绑定/挑战/credit删除；正文与审核状态保留；并发发帖不留旧作者；同用户名重注册不能认领；封禁后旧Cookie失效，正确密码受限登录仍能注销，不能论坛写/绑解绑/后台；注销前删自己的待审内容，不能删他人 |
| 数据库 | Up在旧库成功且旧表逐字段不变；重复/半成品迁移不重置；FK/唯一/CHECK；冲突409无部分写入；Down只限空表；大量帖子注销的D1语句数/耗时与响应超时演练 |
| v19 回退 | 带新表/新帖子/匿名作者的库交给v19，章节/游客/原平台功能可用，账号入口不可用但数据仍在；v19再产生内容后重升新版数据仍完整；明确测试v19无法执行新封禁策略的边界 |
| 原有回归 | 原权限、后台编辑、草稿/预览/发布、媒体、数据导出、旧图过滤、taxonomy CAS和七章链接全部保留；关闭注册后已绑定身份仍执行封禁/审核，删配置/错误initialized不能降级；完整 `node tests/run.mjs` 与 `pnpm build` |

注销若超出单 batch 的平台资源上限，不能改成“先删账号再慢慢匿名化”；应保持账号不变并返回可重试错误，另提审可恢复的分阶段协议。不在未测得上限时承诺无限帖子账号都可单次注销。

## 10. 发布、备份与回退

### 10.1 分阶段上线

1. 审核本文，明确 §11 的风险/口径以及受保护文件、表结构变更；只批准方案不自动授权发布。
2. 实施 PR A：新增结构、兼容读取和独立注册开关，默认尚未初始化。无配置且新表全部不存在的真正旧库仍提供原ChatGPT/游客/内容；账号页面提示暂未开放，账号写接口503，不在identity临时创建表。缺少配置时核对schema，若新表已存在则不得当旧库降级；initialized=false但已有账号同样失败关闭并交owner修复。initialized=true但表异常时按§5.1处理。运营期 registrationOpen=false 仅拒绝新注册，不改变已有用户权限判定。
3. **迁移前完整备份并验证可恢复**。先在与线上隔离的库演练 Up、原数据逐字段比较、代码回退、再升级。不得用线上初始化或测试账号探测权限。
4. 使用平台正式迁移途径应用 0002，读核验表/索引/外键/迁移登记；运行条件达标后以服务器侧受控操作设置 initialized，再单独开放 registrationOpen。不把开关/参数藏在公开注册接口。
5. 实施 PR B：账号接口/页面、绑定、恢复、管理与审核。待已审测试和 Sites 实际运行条件确认后才开启注册；本轮不能用 v19 样式性能免测决定免除新身份系统的权限/密码测试。
6. 保存新 Sites 版本，作者另行同意后发布。记录版本、Git提交、迁移号、备份时间与回退入口；不预编不存在的版本号。账号上线之前仍保持现网 v19。

### 10.2 备份边界

旧后台 JSON 是内容备份，继续不混入密码哈希/恢复摘要/session。账号上线前必须落实私有完整 D1 导出/恢复通道（含 7 张新表、settings、原内容和迁移记录），以及仅作者可访问的备份存储。Sites 是否向当前账号开放完整 D1 导出/Time Travel 操作须在实施时确认；Cloudflare 有该能力不代表此 Sites 项目已有可操作权限。[S9]

如平台无完整导出途径，下一份实施 PR 需先补专门的 owner-only 私有账号备份设计/工具并审核，**不能用现有内容导出替代后直接开放注册**。备份不能进公开GitHub、R2公开图库或普通用户导出；其中即使只有哈希也属于凭据材料。恢复到新部署后清除全部 session/reset/link挑战、递增epoch，保留账号密码/长期恢复码与审核/绑定资料。备份恢复要与正文/迁移版本一致，不能只恢复账号表丢失后续发帖。

注销删除当前在线库的账号数据；历史备份中的旧副本不能保证瞬时消失。提案私有人工备份最长保留30天，平台保留期需实际核实并在注销说明中如实显示。受限备份仅供灾难恢复，不用于账号找回或日常查询。需要单独受限的短期注销清单（只含旧随机账号ID及注销时间，不含用户名/哈希/平台ID），到最后一份相关备份过期后删除；若作者要求连这种短期ID清单也不保留，必须使相关旧备份不可再恢复，而不能同时承诺任意恢复旧库且不复活已注销账号。此政策列入审核项，不在本批创建清单。

### 10.3 回退到 v19 的准确行为

| 内容 | 回退 v19 后 |
| --- | --- |
| 新增账号表/密码/审核资料/绑定 | 保留在同一个 D1，v19 不读取；不得 DROP/清库/恢复旧快照 |
| 用户名密码登录 | **暂时不能用**；v19无注册/账号路由，旧账号入口返回不存在，cookie被忽略，不导致全站报错 |
| 已绑定 ChatGPT | 可走v19原平台登录；v19不理解绑定，不通过本地账号映射取得本站帖子编辑权 |
| 原ChatGPT/游客/管理员 | 恢复v19本来的行为；owner仍由本次平台身份决定 |
| account作者的公开帖子 | author_name已落库，v19可显示；本站账号暂不能编辑；pending继续不公开 |
| 已注销账号的帖子 | 已落库为“已注销用户”，v19也显示该名称，不依赖新渲染器 |
| 新账号封禁/强制审核 | **v19不认识这些规则**；已绑定用户若使用原ChatGPT入口，可恢复v19原成员行为，不能声称新封禁仍有效 |

因此 v19 是**数据可保留的紧急代码回退**，不是完整账号安全策略兼容版本。若必须在回退期间继续执行新封禁/审核规则，应采用保留账号服务的修复版本，而非纯v19；不能靠删绑定/删账号来解决。若站点需进入社区只读维护，须先确认平台可用控制方式，不能假装已有v19开关。

再次部署新版时不重复播种账号/覆盖正文，先检查迁移与现有数据，清除旧会话/短期挑战并递增epoch，原账号重新登录（封禁者仅受限安全访问）即可；密码、未消费的长期恢复码、帖子、绑定、审核进度保留。回退期间 v19 新产生的帖子/回复也保留。备份用于真正灾难恢复，常规代码回退不回滚数据库时间点。

## 11. 待作者与 Claude 审核的事项

以下不是重问已确定的功能，而是实现所需的具体边界；未确认前不写代码：

1. 是否接受 §3.2 的 100,000 次保守兼容提案及低于 OWASP 600,000 的折中；实际 Sites 若不满足所选参数/CPU条件则不开注册。
2. 确认“前3帖”指3篇审核通过的不同主题帖，回复同审核但不累计；提前提交的第4篇仍待审。
3. 确认本站账号注销会匿名化**当前仍绑定**的历史ChatGPT帖子；解绑后它们仍独立属于平台用户。
4. 确认恢复码也丢失时的人工核验标准；无法证明归属时不能安全保证找回。
5. 确认私有备份保留/注销清单政策；先落实完整备份和可恢复路径，再开放注册。
6. 批准未来实施涉及 `identity()`、精确匿名auth分派/审核/归属判定及7张新表/0002迁移。`app/chatgpt-auth.ts` 和 `lib/guests.ts` 按本方案不改。

平台待验证：可信真实IP来源、身份头不可由外部伪造、Sites PBKDF2参数/CPU预算、完整D1备份权限。这里列的是待完成证据，不将它们写成已有保障。

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

## 13. 本文交付验证

仅新增本文；未写账号功能、未创建迁移文件、未运行生产SQL、未改变线上版本。本分支验证结果：

```text
node tests/run.mjs    exit 0
pnpm build           exit 0
git diff --check     exit 0
```

原测试实际输出：166 API checks、taxonomy 205 HTTP expectations、12 rendered preview responses、catalog rollout SSR、7 public chapters reading rollout、shared session and forum loading 均 PASS。构建输出 Build complete；保留原有 middleware 弃用与部分路由 Unknown 提示，未因此修改框架配置。

文档中的 Up/Down SQL 在临时内存 SQLite 上检查通过：7张新表、旧表数据保留、外键检查、账号从属记录级联删除、重复Up拒绝、空库Down后原schema/settings一致；没有连接生产D1。这只是DDL语法/结构验证，不代替D1迁移部署、并发事务、密码运行成本或账号功能测试。

本轮复核补齐了跨窗口锁定、封禁后的受限安全登录、绑定目标快照、注销与永久封人的边界、注册开关与身份检查分离。上述均只写在方案中。**账号代码尚未实现，不能将现有测试通过写成新账号安全性已验收。**
