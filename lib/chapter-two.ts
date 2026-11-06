import {Block,renderBlocks} from './blocks';

// Published through an explicit, guarded content revision. The live owner-edited
// chapter remains authoritative after that release has been applied.
export const secondChapterBlocks:Block[]=[
 {id:'gpt-purpose',kind:'note',title:'这一章，学会找到并使用功能',text:'完成注册和登录后，接下来认识界面、选择使用方式，再学会调用常用功能和查看套餐。你可以一边阅读，一边在自己的账号中寻找对应入口。'},
 {id:'gpt-reading',kind:'text',text:'本章按当前官方说明整理，核对日期为 2026 年 9 月 10 日。界面会随版本、套餐和工作区变化；同一功能可能显示中文或英文名称。遇到与你的画面不同的地方，先按功能名称查找，再看本章末尾的排查表。'},

 {id:'gpt-interface-h',kind:'heading',level:2,anchor:'interface',title:'2.1  看懂 ChatGPT 界面'},
 {id:'gpt-interface-intro',kind:'text',text:'打开新对话后，先找三块区域：用于切换内容的侧边栏、用于阅读回答的对话区，以及用于发消息的输入区。第一次使用时，认出下面这些入口就够了。'},
 {id:'gpt-interface-map',kind:'table',headers:['编号与区域','你会看到什么','用它做什么'],rows:[['① 侧边栏','新建对话、历史对话、项目等入口','开始新主题，或返回以前的内容。窗口较窄时，先展开侧边栏。'],['② 对话区','你发送的消息、AI 的回答、任务进度和结果','阅读回答，继续追问，查看文件或来源。'],['③ 输入框','输入消息的位置','写清问题或要求；发送前可继续补充文字。'],['④ 附件与工具入口','输入框附近的添加按钮、附件或工具菜单','添加文件、图片，或选择当前可用工具。'],['⑤ 模式选择','支持的入口中可见 Chat / Work','选择日常交流，或让 AI 连续处理一项任务。'],['⑥ 模型与推理设置','模型名称、Power 或推理强度等控件','调整用于处理任务的模型和思考投入；具体名称见账号界面。'],['⑦ 项目与资料入口','Projects，以及支持入口中的 Library','整理持续进行的主题，查找关联资料和生成的文件。'],['⑧ 头像与账号菜单','账号、工作区、设置等','确认当前身份，进入设置，查找套餐与用量相关入口。']]},
 {id:'gpt-interface-shot',kind:'screenshot',title:'截图 01 · 主界面总览',text:'此处将补充一张带 ①—⑧ 标注的界面图，对应上面的区域说明。',caption:'先认出侧边栏、对话区和输入区，再按需要寻找其他功能。',src:''},
 {id:'gpt-interface-reply',kind:'text',text:'发送消息后，在同一对话中补充要求，可以继续修改刚才的结果。换成无关的新主题时，使用「新建对话」。文件卡片和引用链接通常也出现在回答附近，点击它们查看实际文件或来源。'},
 {id:'gpt-interface-ref',kind:'link',title:'官方说明：开始使用 ChatGPT',href:'https://learn.chatgpt.com/docs/use-chatgpt',text:'查看 Chat、Work 与 Codex 的入口，以及对话、附件和结果查看方式。'},

 {id:'gpt-platform-h',kind:'heading',level:2,anchor:'web-and-desktop',title:'2.2  浏览器版与桌面版有什么区别'},
 {id:'gpt-platform-intro',kind:'text',text:'网页版是在浏览器里打开 ChatGPT；桌面版是安装在电脑上的应用。两者都能用于对话和处理资料。决定你能用什么的因素包括套餐、当前入口、系统平台和工作区设置。'},
 {id:'gpt-platform-table',kind:'table',headers:['比较项目','浏览器版','桌面版'],rows:[['进入方式','浏览器打开 chatgpt.com 并登录。','安装官方应用，再登录账号。'],['问答与资料处理','支持对话；可用功能中包括搜索、附件、文件生成和多步骤任务。','也支持这些工作，并提供集中查看项目、任务与文件的界面。'],['电脑里的文件','上传所需文件，或使用已连接的来源。','可以上传文件；启用本地工作时，还可选择允许访问的文件夹。'],['任务在哪里运行','Work 在托管的云端环境中运行。','支持的账号可选择云端或本地工作；以当前显示的运行位置为准。'],['浏览器和电脑应用操作','可用云端工具处理获准的网站与资料。','支持的系统和账号可使用本机浏览器、电脑应用等工具，需要相应授权。'],['关闭窗口之后','云端任务可以继续运行；完成情况到原对话查看。','云端任务可继续；需要本机文件或应用的任务，要保持电脑与应用可用。'],['平台差异','主要通过网页使用。','Windows 与 macOS 的工具、权限和更新进度可能不同，应看对应系统说明。']]},
 {id:'gpt-platform-choice',kind:'note',title:'怎样选择',text:'主要是问答、读资料和生成文件，可以先用网页版。经常围绕电脑上的文件夹工作，或需要桌面应用提供的工具，再使用桌面版。桌面版中的“本地工作”指任务能访问本机资源，并不表示模型一定在你的电脑里离线运行。'},
 {id:'gpt-platform-shot',kind:'screenshot',title:'截图 02 · 网页与桌面入口对照',text:'此处将补充同一账号的网页版与桌面版画面，标出模式选择、项目入口和运行位置。',caption:'对照时同时核对账号与工作区，避免把套餐差异误认为平台差异。',src:''},
 {id:'gpt-web-ref',kind:'link',title:'官方说明：ChatGPT 网页版',href:'https://learn.chatgpt.com/docs/web',text:'网页版的研究、分析、文件与项目功能。'},
 {id:'gpt-desktop-ref',kind:'link',title:'官方说明：ChatGPT 桌面版',href:'https://learn.chatgpt.com/docs/app',text:'桌面工作区、文件预览与电脑工具入口。'},

 {id:'gpt-features-h',kind:'heading',level:2,anchor:'feature-overview',title:'2.3  ChatGPT 有哪些功能'},
 {id:'gpt-features-intro',kind:'text',text:'先用这张表建立整体认识。它是一份功能地图；某项是否在你的账号中开放，以及可以使用多少次，要结合 2.5 的套餐与用量说明查看。'},
 {id:'gpt-features-table',kind:'table',headers:['功能','它能做什么','常见入口或开始方式'],rows:[['对话与写作','解释一个问题，整理思路，起草或修改文字。','新建对话，在输入框中说明要求。'],['搜索与资料研究','查找外部资料，比较来源，整理带出处的结果。','要求搜索最新资料；较完整的研究可使用 Work 或账号提供的研究入口。'],['文件与数据分析','阅读文档或表格，提取信息，分析数据，生成文件。','添加附件，并说明希望得到的结果。'],['图片理解','看你提供的图片，解释其中的信息。','添加图片，再指出需要查看的区域。'],['图片生成与修改','按要求生成图片，或修改你给出的图片。','描述画面；修改图片时同时附上原图。'],['语音','把说话转成文字，或与 AI 连续语音交流。','语音输入或语音对话入口。'],['项目与资料管理','把同一主题的对话、文件和要求放在一起。','Projects / 项目；文件可在支持的资料入口中查看。'],['记忆与自定义指令','让后续交流参考你的偏好和适用要求。','设置中的个性化相关选项。'],['多步骤任务与扩展','连续处理任务、连接其他应用、复用流程或安排定时工作。','Work、Plugins / 插件、Skills / 技能、Scheduled / 定时任务。']]},
 {id:'gpt-features-ref',kind:'link',title:'官方功能目录',href:'https://learn.chatgpt.com/docs/features',text:'从这里继续查看每项功能的最新说明。'},

 {id:'gpt-core-h',kind:'heading',level:2,anchor:'important-features',title:'2.4  重要功能如何使用'},
 {id:'gpt-mode-h',kind:'heading',level:3,anchor:'modes-and-models',title:'2.4.1  模式与模型：先决定怎么做，再选择处理方式'},
 {id:'gpt-mode-text',kind:'text',text:'模式影响任务如何展开：Chat 适合问答和来回讨论；Work 适合把一项任务推进到可以查看的结果。模型则是背后处理信息的能力选项。Codex 是偏向开发工作的入口，会展示更多代码和工程细节；本章先围绕 ChatGPT 讲解。'},
 {id:'gpt-mode-steps',kind:'steps',items:[{title:'找到模式选择',text:'在支持的 ChatGPT 入口中，查看输入框上方或附近的 Chat / Work 切换。一般问题先用 Chat；需要整理文件、研究资料并形成完整结果时，选择 Work。'},{title:'找到模型或 Power 控件',text:'Work 当前官方说明将模型与推理设置放在输入框下方。部分界面以 Power 呈现，具体模型可能在 Advanced / 高级中。先保留账号默认选项即可。'},{title:'按任务需要调整',text:'当任务需要更深入的分析或规划时，再提高推理强度。较高投入通常需要更多时间和用量。不要仅凭回答更长判断效果更好，要看是否解决了你的问题。'}]},
 {id:'gpt-mode-shot',kind:'screenshot',title:'截图 03 · 模式、模型与推理设置',text:'此处将标出 Chat / Work 切换，以及当前模型或 Power 设置的位置。',caption:'界面中的模式名称、模型名称和套餐名称，代表不同的概念。',src:''},
 {id:'gpt-mode-ref',kind:'link',title:'官方说明：模型与推理设置',href:'https://learn.chatgpt.com/docs/models',text:'核对当前模型入口与设置方式。'},

 {id:'gpt-files-h',kind:'heading',level:3,anchor:'files-and-data',title:'2.4.2  文件与数据：从上传资料到取得结果'},
 {id:'gpt-files-text',kind:'text',text:'当问题依赖一份文档、PDF 或表格时，把相关文件加入对话，比重新手打全部内容更方便。上传是提供材料；生成文件是让 ChatGPT 根据材料制作一个可打开的结果，两者是不同步骤。'},
 {id:'gpt-files-steps',kind:'steps',items:[{title:'添加资料',text:'打开输入框旁的附件入口，选择文件；支持拖放的界面也可把文件拖入输入区。等待文件名称或附件卡片出现，并确认选对了文件。'},{title:'说明处理范围',text:'指出要处理的文件、页码、工作表或字段，以及希望输出文字、表格还是可下载文件。例如：“只检查这张表的日期格式，列出需要统一的行。”'},{title:'发送并查看结果',text:'发送后查看回答或进度。若材料无法读取，按提示补充可读版本；扫描不清的页面可以单独截取清晰图片。'},{title:'打开、修改、下载',text:'有文件卡片或链接时，打开查看实际内容。需要修改就在同一对话指出位置；确认后使用可用的下载或保存入口取得文件。仅出现一段文字，不代表已经生成附件。'}]},
 {id:'gpt-files-note',kind:'note',title:'读表格时要把含义交代清楚',text:'日期范围、单位和字段含义会影响分析结果。让它先解释准备使用哪些列，再进行计算；关键数字可对照原表抽查。文件大小与数量限制，以上传入口的提示为准。'},
 {id:'gpt-files-shot',kind:'screenshot',title:'截图 04 · 文件上传与结果查看',text:'此处将展示附件已加入的状态，以及生成文件后的预览和下载位置。',caption:'确认输入文件正确，再检查实际生成的文件。',src:''},
 {id:'gpt-files-ref',kind:'link',title:'官方说明：处理与查看文件',href:'https://learn.chatgpt.com/docs/artifacts-viewer',text:'文档、演示文稿、表格和 PDF 的预览、修改与下载。'},

 {id:'gpt-search-h',kind:'heading',level:3,anchor:'search-and-research',title:'2.4.3  搜索与研究：知道答案从哪里来'},
 {id:'gpt-search-text',kind:'text',text:'普通回答可能依靠模型已有知识；搜索会引入外部资料。涉及最新功能、新闻或具体来源时，直接说明需要搜索，并要求给出出处。研究任务通常还需要比较多个来源，再整理结论。'},
 {id:'gpt-search-steps',kind:'steps',items:[{title:'说明查询对象和时间',text:'在对话中要求搜索，并写清主题、时间范围和来源偏好。例如：“查找这项功能的当前官方说明，并附上链接。”'},{title:'查看搜索过程与引用',text:'留意回答中是否出现搜索活动、来源或引用链接。没有来源时，可追问依据，不要仅凭回答里写着“最新”就认为已联网。'},{title:'需要综合研究时扩大任务',text:'切换到可用的 Work 或研究入口，说明需要比较哪些问题、希望得到什么格式。先确认研究范围，再让它整理资料。不同账号的研究入口名称可能不同。'},{title:'回到原始来源',text:'打开关键引用，检查内容是否支持结论、发布时间是否适用。找不到证据的部分，应保留为待确认问题。'}]},
 {id:'gpt-search-shot',kind:'screenshot',title:'截图 05 · 搜索活动与来源链接',text:'此处将展示一次带来源的回答，标出搜索记录和引用入口。',caption:'能打开并核对原始来源，才方便判断信息是否适用。',src:''},
 {id:'gpt-search-ref',kind:'link',title:'官方说明：联网搜索',href:'https://learn.chatgpt.com/docs/web-search',text:'查看网页与桌面入口的搜索方式。'},

 {id:'gpt-media-h',kind:'heading',level:3,anchor:'images-and-voice',title:'2.4.4  图片与语音：分清输入和生成'},
 {id:'gpt-media-table',kind:'table',headers:['你要做的事','怎么开始','怎样判断已经完成'],rows:[['让它看懂图片','添加图片，并指出要解释的区域或问题。','回答针对你提供的图，而不是泛泛介绍。'],['生成或修改图片','说明画面要求；修改时附原图，并说清保留与修改的部分。','出现实际图片，可以打开检查。'],['用说话代替打字','选择语音输入，将语音转成输入框中的文字。','文字已出现，校对后再发送。'],['连续语音交流','在支持的入口开启语音对话，并授予麦克风权限。','能听见回应并继续交谈；结束时关闭语音对话。']]},
 {id:'gpt-image-steps',kind:'steps',items:[{title:'选择图片并说明用途',text:'读图时上传图片，告诉它重点看哪里；生图时描述主体、画面比例和用途。先处理一张，便于判断是否理解正确。'},{title:'检查结果，再作局部修改',text:'打开生成图片，说明哪些部分要改、哪些部分保留。支持图片批注的界面，可以指向具体区域给出反馈。'},{title:'开始或结束语音',text:'当前桌面说明使用 Start voice chat / Start new voice chat 开启语音；首次使用按提示允许麦克风。完成后选择 Stop voice chat。若只想输入文字，使用语音输入即可。'}]},
 {id:'gpt-media-note',kind:'note',title:'语音功能也有使用条件',text:'当前官方桌面 Voice 说明列出 Plus、Pro、Business、Edu 和 Enterprise 支持，实际入口还受推出进度与工作区设置影响。不要把桌面 Voice 的条件直接套用到其他语音入口。'},
 {id:'gpt-media-shot',kind:'screenshot',title:'截图 06 · 图片与语音入口',text:'此处将补充图片附件、生成图片结果，以及语音输入和语音对话入口的对照。',caption:'提供图片、生成图片、语音转文字与语音对话，是不同功能。',src:''},
 {id:'gpt-image-input-ref',kind:'link',title:'官方说明：图片输入',href:'https://learn.chatgpt.com/docs/image-inputs',text:'如何提供图片，并说明要查看的内容。'},
 {id:'gpt-image-gen-ref',kind:'link',title:'官方说明：图片生成与编辑',href:'https://learn.chatgpt.com/docs/image-generation',text:'如何生成、查看和继续修改图片。'},
 {id:'gpt-voice-ref',kind:'link',title:'官方说明：桌面语音对话',href:'https://learn.chatgpt.com/docs/features/voice',text:'开启方法、语音输入的区别，以及适用条件。'},

 {id:'gpt-projects-h',kind:'heading',level:3,anchor:'projects-and-chats',title:'2.4.5  项目与对话：把持续进行的事情放在一起'},
 {id:'gpt-projects-text',kind:'text',text:'同一门课程、长期写作或持续研究，往往会产生多次对话和多份材料。项目可以把它们放到一个主题下，并为项目中的对话提供共同资料与说明。一次性的简单问题可以直接新建普通对话。'},
 {id:'gpt-projects-steps',kind:'steps',items:[{title:'进入 Projects / 项目',text:'在侧边栏或项目视图找到新建入口，建立项目并起一个容易辨认的名字。'},{title:'添加共同资料与要求',text:'在 Sources / 来源等资料区域添加相关文件；在项目说明中写清长期适用的要求，例如“围绕这门课程整理笔记，保留术语的中英文对照”。'},{title:'在项目内开始对话',text:'从项目中创建新对话，使其使用项目资料。每个不同目标可以单开一条对话，避免把所有事情堆在一条长对话里。'},{title:'返回并整理',text:'在项目的 Chats / 对话列表中返回已有内容。普通历史对话则从侧边栏查找；需要重命名、归档或删除时，查看该条对话的菜单与确认提示。'}]},
 {id:'gpt-projects-note',kind:'note',title:'ChatGPT 项目与本地文件夹项目有区别',text:'普通 ChatGPT 项目使用你上传或连接的资料，不会因为建了项目就自动读取电脑目录。本地项目需要在支持的桌面入口中明确选择文件夹；工程目录的组织方法会在后面的 Codex 章节说明。'},
 {id:'gpt-projects-shot',kind:'screenshot',title:'截图 07 · 项目、资料与对话',text:'此处将补充项目入口、来源区域、项目说明和项目内新对话的位置。',caption:'先选对项目，再开始需要共享资料的对话。',src:''},
 {id:'gpt-projects-ref',kind:'link',title:'官方说明：项目与对话',href:'https://learn.chatgpt.com/docs/projects',text:'理解项目共享资料，以及本地文件夹项目的区别。'},

 {id:'gpt-personalize-h',kind:'heading',level:3,anchor:'memory-and-instructions',title:'2.4.6  记忆与自定义指令：减少重复说明'},
 {id:'gpt-personalize-table',kind:'table',headers:['设置','主要用途','简单示例'],rows:[['自定义指令','明确告诉助手你希望它怎样回应或工作。','“先给结论；专业术语附上中文解释。”'],['记忆','把适用的偏好与背景带到后续交流中。','记住你长期使用的表达偏好，减少重复说明。'],['项目说明','规定某个项目中持续适用的要求。','“本项目围绕某门课程，笔记按课程章节组织。”']]},
 {id:'gpt-personalize-steps',kind:'steps',items:[{title:'打开设置中的个性化入口',text:'在支持的客户端进入 Settings / 设置，找到 Personalization / 个性化相关选项。先查看哪些设置在当前账号可用。'},{title:'填写少量明确要求',text:'在自定义指令中写下长期适用的表达或工作要求。只属于某个主题的要求，放进该项目说明。'},{title:'查看并管理记忆',text:'进入记忆相关设置，检查已启用的选项与可管理的内容，按当前界面修改、移除或关闭。重要要求应明确写在指令或项目说明中。'}]},
 {id:'gpt-personalize-shot',kind:'screenshot',title:'截图 08 · 个性化设置',text:'此处将标出自定义指令、记忆及其管理入口。',caption:'把跨主题的个人偏好与某个项目的专用要求分开填写。',src:''},
 {id:'gpt-personalize-ref',kind:'link',title:'官方说明：个性化、指令与记忆',href:'https://learn.chatgpt.com/docs/personalize',text:'查看当前支持的个性化选项和管理方式。'},

 {id:'gpt-work-h',kind:'heading',level:3,anchor:'work-and-extensions',title:'2.4.7  多步骤任务与扩展：让功能配合起来'},
 {id:'gpt-work-text',kind:'text',text:'在 Work 中，可以先说明最终希望拿到什么，再提供文件或来源。任务进行中，查看进度，补充缺失信息，必要时调整要求；完成后打开实际结果。需要连接外部资料或复用处理步骤时，再使用当前可用的插件与技能。'},
 {id:'gpt-work-table',kind:'table',headers:['名称','可以怎样理解','开始方式'],rows:[['Work','围绕一个结果，连续处理多个步骤。','选择 Work，交代目标、资料、输出形式与需要你确认的事项。'],['Plugins / 插件','为助手增加可安装的工具和流程。','打开 Plugins，查看详情并安装；需要外部账号时按提示连接。'],['Skills / 技能','为某一类任务保存可复用的流程和要求。','使用已安装的技能，或从支持的选择入口指定它。'],['Scheduled / 定时任务','按时间重复执行一项已定义的工作。','在支持的对话中说明时间与任务；建立后到 Scheduled 检查和管理。']]},
 {id:'gpt-work-steps',kind:'steps',items:[{title:'先完成一次普通任务',text:'确认目标、资料与输出要求足够清楚，检查实际结果，再考虑复用或定时执行。'},{title:'按需要连接工具',text:'在 Plugins 中找到所需插件，检查支持的平台，安装并完成所需授权。按官方说明，新开对话使用刚安装的插件。'},{title:'复用流程或安排时间',text:'重复工作可使用技能；需要定时运行时，说明日期、时间、时区和输出要求。建立后检查任务记录，确认时间与状态。'},{title:'检查运行条件',text:'云端任务需要其资料和连接保持可用；依赖本机文件的桌面定时任务，需要电脑开机、应用运行。到 Scheduled 查看最近结果，并按需要调整或暂停。'}]},
 {id:'gpt-work-shot',kind:'screenshot',title:'截图 09 · 扩展与定时任务',text:'此处将补充插件目录、已安装状态，以及定时任务的管理位置。',caption:'根据任务需要添加工具，再检查它是否已经连接并可用。',src:''},
 {id:'gpt-skills-ref',kind:'link',title:'官方说明：技能与插件',href:'https://learn.chatgpt.com/docs/skills-and-plugins',text:'理解可复用流程与工具扩展。'},
 {id:'gpt-plugins-ref',kind:'link',title:'官方说明：安装和使用插件',href:'https://learn.chatgpt.com/docs/plugins',text:'目录入口、安装、账号连接与平台条件。'},
 {id:'gpt-schedule-ref',kind:'link',title:'官方说明：定时任务',href:'https://learn.chatgpt.com/docs/automations',text:'建立、查看和管理定时工作，以及本地运行条件。'},

 {id:'gpt-plans-h',kind:'heading',level:2,anchor:'plans-and-usage',title:'2.5  认识套餐，查看自己的权限与用量'},
 {id:'gpt-plan-order-h',kind:'heading',level:3,anchor:'official-plan-order',title:'2.5.1  按官方顺序认识套餐'},
 {id:'gpt-plan-intro',kind:'text',text:'套餐决定可用能力与用量。按官方页面的个人、组织分组排列如下；组织方案还包含成员与工作区管理。表内美元价格是 2026 年 9 月 10 日核对的官网标价，实际币种、税费和购买条件以结算页为准。'},
 {id:'gpt-plan-table',kind:'table',headers:['类别与套餐','官网参考价格','主要区别'],rows:[['个人 · Free','$0 / 月','免费体验；可用功能与额度查看当前账号。'],['个人 · Go','$8 / 月','轻量使用方案；升级前核对所需功能是否包含。'],['个人 · Plus','$20 / 月','个人订阅；提供更丰富的可用能力，Work / Codex 仍有额度。'],['个人 · Pro','$100 / 月起','官方列出不同用量档位，选购时查看具体档位。'],['组织 · Business','年付折合 $20 / 人 / 月；月付 $25 / 人 / 月','标准方案至少 2 人，包含工作区与管理能力。'],['组织 · Enterprise / Edu','联系销售或所属机构','面向企业与教育机构，具体权限和用量按协议与管理员配置。']]},
 {id:'gpt-plan-ref',kind:'link',title:'官方套餐、参考价格与功能条件',href:'https://learn.chatgpt.com/docs/pricing',text:'此页包含 ChatGPT Work / Codex 的说明；核对套餐时同时查看账号内当前展示的具体功能。'},
 {id:'gpt-plan-check-h',kind:'heading',level:3,anchor:'check-your-plan',title:'2.5.2  查看当前套餐与订阅'},
 {id:'gpt-plan-steps',kind:'steps',items:[{title:'先确认账号与工作区',text:'打开头像或账号菜单，确认使用的是订阅对应的账号。如果同时拥有个人与组织工作区，再确认当前选中哪一个。'},{title:'寻找套餐与管理入口',text:'从账号菜单或设置进入账户、订阅、套餐等相关区域；名称可能显示为 Plan、Subscription 或 Manage。查看当前套餐和可用的管理操作。桌面入口不完整时，使用同一账号进入网页版查找。'},{title:'核对订阅信息',text:'查看页面列出的套餐、账单周期、续费信息及可用的账单或发票入口。组织成员没有管理选项时，向工作区管理员确认。'},{title:'按原购买渠道管理',text:'若页面提示订阅由应用商店管理，按提示返回对应商店的订阅记录；网页购买则使用网页提供的管理入口。更改前核对生效时间，并保存页面确认信息。'}]},
 {id:'gpt-plan-shot',kind:'screenshot',title:'截图 10 · 当前账号、套餐与订阅管理',text:'此处将补充从账号菜单进入套餐管理的实际路径；截图时标出入口与套餐名称即可。',caption:'菜单文字可能随版本变化；个人订阅与组织工作区应分别核对。',src:''},
 {id:'gpt-account-ref',kind:'link',title:'官方说明：账号、工作区与登录方式',href:'https://learn.chatgpt.com/docs/auth',text:'核对当前账号与工作区；API 登录与 ChatGPT 订阅使用不同的计费方式。'},
 {id:'gpt-usage-h',kind:'heading',level:3,anchor:'usage-and-reset',title:'2.5.3  查看用量与重置提示'},
 {id:'gpt-usage-steps',kind:'steps',items:[{title:'进入用量页面',text:'在当前入口寻找 Usage / 用量；也可从上方官方套餐说明中的用量问答，打开其提供的 usage dashboard 链接。'},{title:'确认看的是哪项额度',text:'核对功能名称、剩余用量和重置时间。Work 与 Codex 共用相关用量；桌面语音有独立的对话额度，其启动的任务还会使用任务额度。'},{title:'达到限制后再决定下一步',text:'按页面提示等待重置，或查看当前账号提供的追加用量与升级选项。任务复杂度与模型会影响消耗，不能简单换算成固定的可发送条数。'}]},
 {id:'gpt-usage-shot',kind:'screenshot',title:'截图 11 · 用量与重置时间',text:'此处将补充用量页面，标出额度所属功能、剩余状态和重置提示。',caption:'以当前账号的实际页面为准，分清套餐、可用功能与剩余额度。',src:''},
 {id:'gpt-api-note',kind:'note',title:'ChatGPT 订阅与 API 费用分开理解',text:'本章使用 ChatGPT 账号登录。API 是供程序调用模型的一种方式，按 API 的规则计费；拥有 ChatGPT 订阅，不等于程序调用 API 已经免费。普通入门不需要先购买 API 额度。'},

 {id:'gpt-troubleshooting-h',kind:'heading',level:2,anchor:'find-missing-features',title:'2.6  找不到功能时怎么办'},
 {id:'gpt-troubleshooting',kind:'table',headers:['遇到的情况','先检查什么','下一步'],rows:[['按钮与教程位置不同','是否使用同一平台；侧边栏或工具菜单是否折叠。','按功能名称查找；桌面版检查更新。'],['订阅后仍显示免费或功能少','当前账号、登录方式和工作区是否对应订阅。','回到购买账号和正确工作区，查看订阅状态。'],['模型或某项工具没有显示','套餐、推出进度及工作区是否允许。','查看官方说明；组织账号再向管理员确认。'],['文件没有加入对话','是否上传完成，是否提示格式、大小或数量限制。','按提示调整资料，确认附件卡片出现后发送。'],['无法打开电脑文件夹','当前是否是网页版或云端任务。','上传所需文件；需要本地目录时使用支持的桌面入口。'],['语音无法开始','麦克风权限、输入设备、功能开放状态。','检查系统与应用设置，确认当前入口支持语音。'],['提示额度不足','哪项功能达到限制，何时重置。','到对应用量页面查看，再按需调整任务或等待。'],['没有订阅管理按钮','订阅购买渠道，以及自己在组织内的角色。','按购买渠道管理；组织成员联系管理员。']]},
 {id:'gpt-finish',kind:'list',items:[{title:'',text:'能找到新建对话、附件、项目和设置。'},{title:'',text:'知道网页与桌面版各自如何接收资料。'},{title:'',text:'能选择合适的功能，并打开实际结果或来源。'},{title:'',text:'知道自己的账号与工作区，并能找到套餐、用量信息。'}]},
 {id:'gpt-end',kind:'text',text:'熟悉这些入口后，接下来就可以学习怎样把需求交代清楚，以及如何在具体任务中组织资料、推进修改和检查结果。后续章节再逐步展开方法与案例。'},
];

export const secondChapter={
 id:'chatgpt',
 title:'熟悉 ChatGPT：界面、功能与套餐',
 description:'看懂界面，了解网页版与桌面版的区别，掌握常用功能的入口，并学会查看套餐、订阅与用量。',
 body:renderBlocks(secondChapterBlocks),
};
