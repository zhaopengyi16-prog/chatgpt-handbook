# 中文像素字体：一次性离线生成

这段工具仅用于维护 `/admin/style-preview` 的字体资源，**不属于网站运行或构建依赖**。发布时直接使用已提交的 WOFF2 分片；正常 `pnpm install` / `pnpm build` 不运行 Python，不下载字体。

## 固定输入

- 官方项目：[TakWolf/fusion-pixel-font](https://github.com/TakWolf/fusion-pixel-font)
- 官方发布：[2026.10.25](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25)
- tag 对应代码提交：`3266d59c25c3fa8f8b5e163b29736a706fd9ab6f`。
- 下载文件：[fusion-pixel-font-12px-proportional-ttf.woff2-v2026.10.25.zip](https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.10.25/fusion-pixel-font-12px-proportional-ttf.woff2-v2026.10.25.zip)。此包只作工具输入，不提交到仓库。
- ZIP 的 SHA-256：`5624e6a1e5c448500771480c3080df0e0748c410e0838dc9ae085c49c21bf25e`，与官方 release API 的 digest 一致。
- 包内源文件：`fusion-pixel-12px-proportional-zh_hans.ttf.woff2`，960,056 bytes。
- 源文件 SHA-256：`7cdaf516e63dbcb7b190b3d0606bdd5d451ef51593d6d3d934d30ba086e88b6d`。

本次使用预装 Python 3.12 / fontTools 4.61.1 和系统 libbrotli；没有安装网站依赖。其他维护环境可以在独立工具环境中安装 `fonttools[woff]`。若已有系统 `libbrotlienc` / `libbrotlidec`，脚本内的 ctypes 适配可在无 Python Brotli 模块时使用它们。

## 重建

在仓库根目录执行（将 ZIP 路径替换成你的本地下载路径）：

```sh
python3 app/admin/style-preview/font-build/subset_font.py \
  --archive /path/to/fusion-pixel-font-12px-proportional-ttf.woff2-v2026.10.25.zip \
  --output public/assets/style-preview/miaomiao-font
```

脚本先校验 ZIP 和源字体 SHA-256，再建立 ASCII、首页常用字、冷字三个集合。`hot-chars.txt` 是首页固定文本的维护输入；初版标题/导航/分类名称，加上本次预览组件出现的中文和中文标点，合并为首页分片。中文正文仍使用系统字体，放入常用字输入并不改变正文 CSS。

剩余来源字体字符按 2048 码位区间分片。每片的 CSS `unicode-range` **精确列出实际字符**，与首页和 ASCII 分片互斥。所有分片 cmap 的并集必须等于源字体 cmap；脚本重新打开每份 WOFF2 校验这一点，同时核对源版权和许可证元数据仍在。生成 `fonts.css`、`manifest.json`（逐片大小、哈希、范围）、`coverage.txt`（全部覆盖范围），并原样复制发行包里的四份许可证。

生成文件统一使用派生字体名称 **Miaomiao Pixel**。仅做子集、分片、名称区分与 WOFF2 编码，不绘制或引入新的第三方字形。源字体整体文件和中间 SFNT 不输出到网站；SFNT 只在内存中存在。

## 许可与覆盖边界

字体使用 **SIL Open Font License 1.1**，与上游程序代码的 MIT 许可分开。保留源发行包中 `OFL.txt`、`LICENSES/ark-pixel/OFL.txt`、`LICENSES/cubic-11/OFL.txt`、`LICENSES/galmuri/LICENSE.txt`，以及字体嵌入的版权及许可说明。源官方 README 说明 `zh-Hans` 是简体中文特定字形，12px 适合整数倍显示；本次使用官方推荐的 proportional 比例模式。

实测源字体有 **38,130 个 cmap 字符**，其中 CJK Unified Ideographs 区间有 **19,466 个汉字**。GB2312 的 6,763 个汉字中支持 **6,647 个，缺 116 个**，具体缺字码位见 `manifest.json`。这是上游本身的覆盖边界，不是分片丢字；本次保留源字体全部 cmap。新增分类使用来源未包含的字时，由 CSS 后备系统字体显示，不能声称“覆盖所有简体汉字”。脚本遇到常用字输入里出现来源缺字会报错，要求维护者明确采用系统回退而不是静默伪报覆盖。

CSS 使用 `font-display: swap`。只有标题、卡片名称和导航选择本字体，正文、表单、代码使用系统字体。不要在全站布局 preload 整套字体。浏览器只为页面实际用到的字符下载相应片；新增分类文字仍能从冷片按需选择，没有“仅当前页面截图中的字可用”的限制。

## 测量口径

`manifest.json` 的 `totalWoff2Bytes` 是全部分片文件总大小，`homeAndAsciiBytes` 是维护输入所覆盖文本所需的两个文件的磁盘字节数。它们**不能冒充浏览器实际传输量**。实际首页需在冷缓存手机预览中记录 Resource Timing 的 `transferSize` / `encodedBodySize`、请求列表和缓存条件，若任何额外字符触发冷片，必须包含在合计中。`fonts.css` 自身单独统计，不属于字体 WOFF2 字节。
