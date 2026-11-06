# 替换截图

本版保留 73 张原始 PNG，显示在 74 处引用位置。一处位置可以包含多张图片；固定位置编号仍由 id 标识。

1. 在网页中找到图片，点击可查看原图。使用 config/screenshots.json 的 caption、id 和 source_image 确认对应位置。
2. 将允许公开的新图片放入 screenshots/，例如 screenshots/account-menu-new.png。
3. 修改该位置 images 数组里的 file、width、height，并把位置的顶层 file 更新为数组第一张图片。需要多张图时，向 images 数组增加条目。
4. 保留 id，按需要更新 caption。替换后删除失效的 source_image 与 sha256 原图记录。
5. 确认图片可以公开后，将 status 从 original 改为 ready，并清空对应 review_note。
6. 运行 python3 build.py 重新生成网站和下载包，检查原图链接、比例及章节位置。

不要改写原图文件后继续保留旧的校验摘要。引用位置重用同一张图片时，注意所有需要更新的位置。

构建只会把清单中实际引用的图片加入网页和源码下载包。对于不再使用的旧原图，也应从工作目录中清除，避免以后误提交；仅提交本次需要发布的更新。

原图维护记录见 ORIGINAL_SCREENSHOTS_REVIEW.md。截图里的界面可能是旧版本，不能仅凭原图恢复而认为其中的价格、用量或操作步骤仍然适用。
