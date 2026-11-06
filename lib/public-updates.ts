// Deliberately editorial: saving an unpublished draft must never generate a public update.
export const publicUpdates = [
  {id:'learning-catalog',title:'教程可以按任务来找了',description:'分类启用后，先选想做的事，再按工具和难度筛选。原有章节的地址不变。'},
  {id:'reading-images',title:'旧截图从阅读页下线',description:'阅读教程时不再显示旧截图和空图框。之后补充的新截图会直接出现在相关步骤旁。'},
  {id:'guest-review',title:'游客留言与审核',description:'游客可以填写昵称、提交问题或回复，审核通过后公开。登录成员可以管理自己的发言，只有站点所有者可以编辑教程和管理全站。'},
  {id:'community',title:'内容管理与站内讨论',description:'教程支持草稿与发布、正文编辑和截图管理。阅读无需登录，也可以使用 ChatGPT 账号参与讨论。'},
  {id:'v3',title:'V3.0 · 原纲整理',description:'原手册整理为在线章节，沿用浅色阅读版式。'},
] as const;
