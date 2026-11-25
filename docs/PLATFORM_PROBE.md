# 平台探针（账号第一期前置检查）

状态：临时诊断，只读。结果记录到本文后，下一份 PR 删除 `lib/platform-probe.ts`、`route.ts` 中的三个探针分支及对应测试。

依据 `docs/ACCOUNTS_DESIGN.md`：没有探针结果，不写账号代码。

## 接口

| 接口 | 谁能访问 | 返回内容 |
| --- | --- | --- |
| `GET /api/probe/headers` | 任何人（必须公开，才能测伪造请求头） | 到达应用的 `oai-*` 请求头**名称**列表，以及身份头是否齐全。不返回值 |
| `GET /api/admin/probe` | 仅站点所有者 | 七个常见来源 IP 请求头是否存在、条目数、地址类型（ipv4/ipv6/other）。不返回地址 |
| `GET /api/admin/probe/kdf?iterations=100000` 或 `600000` | 仅站点所有者 | 用一次性随机密码和盐做一次 PBKDF2-SHA256，返回成功或报错 |

三个接口都放在 `route.ts` 现有的来源检查、管理员校验之后，不读写 D1、不设 Cookie。

## 怎样测（发布后由作者执行）

以下 `SITE` 指 `https://chatgpt-handbook-community.zhaopengyi16.chatgpt.site`。

**① 伪造身份头会不会被剥掉（最重要）**

不登录，在 Windows PowerShell 运行（注意是 `curl.exe`）：

```powershell
curl.exe -s -H "oai-authenticated-user-id: probe-fake" -H "oai-authenticated-user-email: probe@example.com" https://chatgpt-handbook-community.zhaopengyi16.chatgpt.site/api/probe/headers
```

- 返回 `{"oaiHeaderNames":[],"identityHeadersPresent":false}`：Sites 剥掉了伪造头，安全。
- 返回的列表里有 `oai-authenticated-user-id`：**伪造头能到达应用，任何人可冒充成员。立即停止，回报 Claude。**

再用已登录的浏览器打开 `https://chatgpt-handbook-community.zhaopengyi16.chatgpt.site/api/probe/headers`，应看到身份头名称，用来确认探针本身正常。

**② 能否拿到可信访客 IP**

用所有者身份在浏览器打开 `https://chatgpt-handbook-community.zhaopengyi16.chatgpt.site/api/admin/probe`，截图 `ip` 部分。重点看 `cf-connecting-ip` 是否存在、`x-forwarded-for` 有几层。

**③ PBKDF2 迭代次数**

依次打开（每个只开一次）：

1. `https://chatgpt-handbook-community.zhaopengyi16.chatgpt.site/api/admin/probe/kdf?iterations=100000`
2. `https://chatgpt-handbook-community.zhaopengyi16.chatgpt.site/api/admin/probe/kdf?iterations=600000`

记录返回的 `ok` 以及浏览器开发者工具或体感的响应时间。Workers 计算期间计时器可能不走，`elapsedMs` 为 0 属正常。返回错误页或超时也是有效结果，说明该次数不可用。

**④ 能否完整导出 D1**

这项不靠代码：在 ChatGPT Sites 管理界面查看是否有数据库导出、备份或时间点恢复功能，截图记录。

## 结果记录

| 项目 | 结果 | 日期 |
| --- | --- | --- |
| ① 伪造身份头 | 待测 | |
| ② 可信访客 IP | 待测 | |
| ③ 100,000 次 | 待测 | |
| ③ 600,000 次 | 待测 | |
| ④ D1 完整导出 | 待测 | |

## 验证情况

- `lib/platform-probe.ts` 的纯函数已在 Node 22 下单独运行检查通过（地址类型识别、不回显值、迭代次数白名单、100,000 与 600,000 次派生）。
- `tests/integration.ts` 新增权限与不写库断言：匿名 401、普通成员 403、非法次数 400、settings 前后一致、响应不含邮箱/ID/地址。
- **`node tests/run.mjs` 和 `pnpm build` 未在编写环境运行**（无法安装依赖），合并前须由作者或 Codex 运行并报告结果。
