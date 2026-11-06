import {Block,renderBlocks} from './blocks';

const h=(id:string,title:string,level=2):Block=>({id,kind:'heading',anchor:id,title,level});
const t=(id:string,text:string):Block=>({id,kind:'text',text});
const note=(id:string,title:string,text:string):Block=>({id,kind:'note',title,text});
const table=(id:string,headers:string[],rows:string[][]):Block=>({id,kind:'table',headers,rows});
const steps=(id:string,items:string[][]):Block=>({id,kind:'steps',items:items.map(([title,text])=>({title,text}))});
const code=(id:string,title:string,text:string):Block=>({id,kind:'prompt',title,text});
const ref=(id:string,title:string,href:string,text:string):Block=>({id,kind:'link',title,href,text});
const shot=(id:string,title:string,text:string):Block=>({id,kind:'screenshot',title,text,caption:title,src:''});

export const fourthChapterBlocks:Block[]=[
 note('env-purpose','这一章，把电脑准备到能开始工作','你已经认识 Codex 的界面。现在根据自己的任务，准备项目文件夹、编辑器、版本记录和所需扩展，并逐项验证。配置的目标是让实际任务顺利运行，而不是安装尽可能多的软件。'),
 t('env-reading','本章以 Windows 桌面端为主，关键位置补充 macOS 提示，按 2026 年 9 月 11 日查阅的官方资料整理。Codex 本身的安装和登录见第一章。本章中的 VS 指 VS Code；如果项目明确要求 Visual Studio 或特定编译器，请保留项目原有要求。'),
 ref('env-ch3','先认识桌面功能：第三章','/chapters/codex.html','不熟悉项目、终端、审查面板时，可以先返回第三章。'),

 h('prepare-tools','4.1  先确定任务，再选择工具'),
 table('env-task-map',['你要做什么','先准备什么','按需要再加'],[
 ['阅读资料、整理文字','Codex、明确的资料目录、能打开成果的阅读软件','需要生成 Word、表格、PDF 等文件时，选择对应技能和查看工具。'],
 ['持续修改文档或代码','固定项目目录、VS Code、Git','需要跨设备同步或协作时，连接 GitHub。'],
 ['制作或维护网页','以上工具、浏览器、项目要求的运行环境','项目使用 Node.js 才安装对应版本；不是每个网页都需要 Node.js。'],
 ['运行 Python 脚本或处理数据','项目要求的 Python、独立项目环境','数据处理库按项目说明安装。'],
 ['已有嵌入式或其他专业工程','原工程指定的编辑器、编译器、SDK 和调试工具','先让 Codex 阅读工程说明，不要擅自替换工具链。']]),
 note('env-base','Git 和 VS Code 是常用搭档，并非所有任务的启动条件','VS Code 方便查看与编辑文件；Git 记录文件版本；GitHub 存放远程仓库。普通对话不要求安装它们，但持续维护项目时，版本记录能帮助你检查和恢复改动。'),
 t('env-platform','先沿用电脑当前可用的工作方式。WSL、Docker、额外终端和多个包管理器都属于按需选项；项目没有明确要求时，可以暂不安装。'),
 shot('env-tools-shot','截图 01 · 环境准备清单','展示任务类型、已安装工具、缺少工具与检查结果。'),

 h('folder-and-editor','4.2  准备项目目录与 VS Code'),
 steps('env-folder-steps',[
 ['选一个长期使用的位置','例如在数据盘建立 AI_Projects，再为每个项目建立一个独立文件夹。示例位置不是强制要求；选定后记录完整路径。'],
 ['把相关材料放在一起','将输入材料、工作文件和输出成果合理分类。已有工程先保留原目录结构，让 Codex 说明各目录用途。'],
 ['在 Codex 中打开这份目录','通过打开文件夹入口选择项目，先要求 Codex 报告当前目录和看到的文件，再开始写入。'],
 ['让 VS Code 打开同一份目录','使用 File → Open Folder / 文件 → 打开文件夹。核对完整路径，避免两个应用分别打开旧副本和新副本。']]),
 code('env-folder-prompt','确认工作目录','请先只读取当前项目。告诉我：当前目录的完整路径、主要文件和目录的用途、是否已有 Git 仓库，以及是否缺少项目说明。暂时不要移动文件、安装软件或修改配置。'),
 shot('env-folder-shot','截图 02 · 两个应用打开同一项目','标注 Codex 当前项目与 VS Code 文件夹路径；如果是 Worktree，说明这是单独的工作目录。'),
 h('install-vscode','4.2.1  安装并打开 VS Code',3),
 steps('env-vscode-steps',[
 ['从官方入口下载','打开下面的 VS Code 官方安装说明，选择适合系统的版本。Windows 普通个人使用可以选择 User Setup；受管理电脑遵循单位的软件安装规则。'],
 ['运行安装程序','按安装向导完成安装。若希望在终端输入 code 打开编辑器，检查加入 PATH 的选项；安装完成后重新打开终端。'],
 ['需要中文时切换显示语言','按 Ctrl + Shift + P 打开命令面板，搜索 Configure Display Language，按提示安装中文语言包并重启。macOS 使用 Command + Shift + P。'],
 ['打开项目并认识三个区域','左侧文件列表用于找文件，中间编辑区查看内容，下方终端运行命令。保存文件后，Codex 可以重新读取同一路径中的最新内容。']]),
 code('env-code-check','可选检查：终端是否识别 VS Code','code --version'),
 t('env-code-check-text','返回版本说明终端能找到 VS Code。命令未找到时，先重新打开终端；也可以从开始菜单启动 VS Code，使用菜单打开文件夹。不要因为命令入口未生效就反复重装。'),
 ref('env-vscode-ref','官方安装：VS Code for Windows','https://code.visualstudio.com/docs/setup/windows','下载方式、安装范围和终端入口。'),
 ref('env-vscode-language','官方说明：显示语言','https://code.visualstudio.com/docs/configure/locales','查找语言包和切换显示语言。'),
 shot('env-vscode-shot','截图 03 · VS Code 安装与中文界面','展示安装入口、语言切换和项目文件列表。'),
 note('env-editor-extension','Codex 桌面端与 VS Code 扩展分别安装','从桌面端把文件交给 VS Code 打开，不要求先安装 Codex 扩展。只有希望在 VS Code 内与 Codex 对话时，才安装官方 Codex 扩展并按提示登录。核对发布者和官方链接，避免安装名称相近的扩展。'),
 ref('env-ide-ref','官方说明：Codex 编辑器扩展','https://learn.chatgpt.com/docs/codex/ide','需要编辑器内的 Codex 入口时再配置。'),

 h('install-git','4.3  安装 Git，开始记录版本'),
 t('env-git-intro','Git 像项目的版本记录本：你选择需要保留的修改，并写下一条说明，就得到一次提交。安装 Git、创建 GitHub 账号、登录 GitHub 是三件事；本地记录版本可以先不连接远程平台。'),
 steps('env-git-install',[
 ['通过官方指引安装 Git','Windows 按 Git 官方下载页选择安装程序；macOS 按该系统的官方安装选项操作。如果电脑已有 Git，先检查版本与路径，避免重复安装。'],
 ['重开终端并检查','输入 git --version，出现版本号后，再让 Codex 在当前任务使用的终端中检查一次。不同运行环境可能使用不同的 Git。'],
 ['设置提交者姓名与邮箱','这是版本记录里显示的作者信息，不是 GitHub 登录凭据。公开仓库可使用 GitHub 邮箱设置中提供的隐私邮箱。示例命令中的内容必须替换成自己的信息。'],
 ['检查已有设置','在项目中查询 user.name 与 user.email。如果已有正确配置，不必覆盖；多个工作身份可分别使用仓库级设置。']]),
 code('env-git-check','检查 Git 与当前作者配置','git --version\ngit config --get user.name\ngit config --get user.email'),
 code('env-git-config','首次设置个人默认作者信息（先替换示例）','git config --global user.name "你的显示名称"\ngit config --global user.email "你的提交邮箱"'),
 ref('env-git-ref','官方指引：设置 Git','https://docs.github.com/en/get-started/git-basics/set-up-git','安装与连接 GitHub 的基础说明。'),
 ref('env-git-download','Git 官方安装入口','https://git-scm.com/downloads','按操作系统选择安装方法，不使用来源不明的安装脚本。'),
 shot('env-git-shot','截图 04 · Git 安装验证','展示 git --version 与作者配置查询结果；示例邮箱使用演示信息。'),
 h('first-version','4.3.1  为本地项目保留第一个版本',3),
 steps('env-first-version',[
 ['先确认是不是已有仓库','让 Codex 检查当前目录及所属仓库根目录。已有仓库直接沿用，避免把子文件夹另建成嵌套仓库。'],
 ['新项目才初始化','在 VS Code 源代码管理区域使用 Initialize Repository / 初始化仓库；若界面显示的是已有更改列表，不必再次初始化。'],
 ['检查哪些文件应当记录','把缓存、依赖目录、生成产物和本地秘密配置排除在提交范围之外。让 Codex根据项目类型整理 .gitignore；已经被 Git 跟踪的文件不会仅因加入忽略规则而消失。'],
 ['选择、提交、确认','查看差异，暂存需要的文件，填写如“建立项目初始版本”的说明后提交。在历史记录中确认提交存在。此时尚未自动上传到 GitHub。']]),
 ref('env-git-record-ref','官方说明：记录版本与忽略文件','https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository','查看暂存、提交与忽略规则的工作方式。'),
 shot('env-commit-shot','截图 05 · 第一次本地提交','标出源代码管理、待提交文件、提交说明和历史记录。'),

 h('github-sync','4.4  连接 GitHub，完成一次真正的同步'),
 table('env-github-terms',['名称','含义','怎样确认'],[
 ['本地仓库','电脑上带有 Git 历史的项目。','能查看状态和提交记录。'],
 ['远程仓库','GitHub 上用来接收提交的项目。','核对账号、仓库名称和网址。'],
 ['分支','一条工作历史。','核对当前分支和远程页面选择的分支。'],
 ['推送 Push','把本地提交发送到远程。','操作成功后，网页出现对应提交和文件。'],
 ['拉取 Pull','获取远程提交并整合到当前分支。','处理本地未提交修改和可能出现的冲突。']]),
 h('publish-existing-folder','4.4.1  本地已有项目，GitHub 上还没有',3),
 steps('env-publish-github',[
 ['准备 GitHub 账号','在浏览器中登录自己的 GitHub。后续 VS Code 请求连接时，核对浏览器里的账号；不要把密码或令牌贴进对话。'],
 ['完成本地提交','先按 4.3 检查文件并创建版本记录。空文件夹或没有提交的项目，不能当成已经完成同步。'],
 ['发布到远程仓库','在 VS Code 中搜索 Publish to GitHub，按提示登录，核对仓库名称和公开范围。首次保存个人工程可选择私有；决定开源时再确认可公开的文件和许可证。'],
 ['打开 GitHub 核对结果','检查是否出现预期文件和最新提交说明。只看到 README、上传报错或仍在等待授权，都不能算完整上传成功。']]),
 note('env-existing-remote','如果 GitHub 上已经有仓库','不要重复创建同名仓库。先让 Codex 检查当前远程地址和双方历史，再选择连接已有远程或先克隆。两边都有独立提交时，需要处理历史差异；不要直接强制推送覆盖。'),
 shot('env-github-publish-shot','截图 06 · 发布仓库与选择可见性','展示 Publish to GitHub、账号确认和公开／私有选择。'),
 h('clone-existing-repo','4.4.2  GitHub 上已有项目，下载到电脑',3),
 steps('env-clone',[
 ['复制仓库的 HTTPS 地址','进入目标仓库，点击 Code 并复制 HTTPS 克隆地址。确认这是需要的项目，以及自己具备访问权限。'],
 ['在 VS Code 选择 Git: Clone','通过命令面板执行克隆，粘贴地址，再选择用于存放项目的父文件夹。私有仓库按提示登录。'],
 ['打开克隆后的目录','克隆通常已经带有远程地址和历史，不要重新初始化。Codex 与 VS Code 都打开这个目录。'],
 ['先阅读项目说明','查看 README、依赖说明和运行要求，再决定是否安装依赖、运行脚本。']]),
 ref('env-vscode-github','官方说明：在 VS Code 中使用 GitHub','https://code.visualstudio.com/docs/sourcecontrol/repos-remotes','发布本地项目、克隆仓库与连接账号。'),
 shot('env-clone-shot','截图 07 · 克隆与打开项目','展示仓库地址、目标目录和克隆后的项目文件。'),
 h('daily-sync','4.4.3  后续修改怎样同步',3),
 steps('env-sync-loop',[
 ['开始前检查双方状态','核对分支和未提交文件。有远程更新时先妥善保存本地工作，再获取和整合远程改动；有冲突时先处理冲突。'],
 ['修改后检查文件差异','确认本次任务实际修改了什么，运行项目要求的检查，再暂存需要保留的文件。'],
 ['提交后推送','提交填写有意义的说明，再执行推送。推送失败时查看错误原因，不把失败当成已经同步。'],
 ['在远程确认','打开同一仓库的同一分支，检查提交和文件。若使用 VS Code 的同步按钮，先了解它可能同时执行拉取和推送。']]),
 code('env-sync-prompt','让 Codex 帮你核对同步状态','请核对当前项目的 Git 状态、当前分支、远程仓库地址和最近提交。告诉我哪些改动尚未提交、哪些提交尚未推送；必要时获取远程状态进行比较。不要丢弃改动或强制推送。先列出同步方案，确认后再执行，并报告远程验证结果。'),
 note('env-sync-boundary','代码同步与网站上线分别确认','GitHub 仓库可以保存代码，但网站是否更新取决于部署流程。数据库里的最新评论、账号和后台修改也不会因为推送代码就自动备份。同步源码、备份数据、发布网站分别有自己的完成标志。'),
 shot('env-remote-shot','截图 08 · 远程同步成功的证据','展示 GitHub 对应分支的最新提交与项目文件，和本地记录对应。'),

 h('project-runtimes','4.5  按项目需要安装运行环境'),
 t('env-runtime-intro','编辑器负责查看和编辑文件；运行环境负责执行相应的程序。安装 VS Code 不会自动让所有项目都能运行。先让 Codex 阅读项目声明，再选择兼容版本；已有项目优先遵守版本约束和锁定文件。'),
 table('env-runtime-table',['工具','什么时候需要','先检查什么'],[
 ['Node.js 与包管理器','项目包含 JavaScript／TypeScript 构建、开发服务器等流程。','查看 package.json、版本文件与锁定文件，沿用项目要求的 npm、pnpm 或其他工具。'],
 ['Python 与虚拟环境','需要运行 Python 脚本或相关数据处理工具。','查看 Python 版本和依赖声明，将项目依赖安装到独立虚拟环境。'],
 ['编译器与 SDK','C/C++、嵌入式或其他需要编译的工程。','原项目要求的目标平台、工具链和构建方式。'],
 ['WSL 或 Docker','项目明确依赖 Linux 或容器工作方式。','是否已有原生可行方案；文件与命令究竟在哪个环境执行。']]),
 code('env-runtime-check','只检查任务需要的工具（无需全部安装）','node --version\nnpm --version\npython --version'),
 t('env-runtime-check-text','分别运行你需要的检查。某条命令未找到，只说明当前终端无法调用它，不代表所有项目都不能工作。Windows 的 Python 也可能通过 py 调用；让 Codex 检查实际解释器路径。安装依赖后，应再执行项目要求的启动或验证命令。'),
 ref('env-node-ref','Node.js 官方下载','https://nodejs.org/en/download','按项目支持的版本和系统选择，不仅看“最新”标签。'),
 ref('env-python-ref','Python 官方下载','https://www.python.org/downloads/','按项目要求准备解释器，再建立项目环境。'),
 note('env-runtime-isolation','Windows 和 WSL 的工具不会自然变成同一套','明确 Codex 的运行环境与终端所用环境，再安装依赖。Windows 中安装成功，不代表 WSL 内也已经具备；切换环境后重新检查路径与版本。'),
 ref('env-windows-ref','官方说明：Windows 桌面端与 WSL','https://learn.chatgpt.com/docs/windows/windows-app','核对当前运行环境、终端和 Git 的安装位置。'),
 shot('env-runtime-shot','截图 09 · 运行环境检查','展示实际解释器或运行时路径、版本，以及项目启动或验证结果。'),

 h('install-skills-plugins','4.6  安装第一组 Skill 与插件'),
 table('env-extension-map',['对象','主要用途','从哪里开始'],[
 ['Skill · 技能','告诉 Codex 某类任务应该按照怎样的步骤处理。','查看已提供的技能，或使用当前可用的技能安装工具。'],
 ['Plugin · 插件','分发技能、外部连接和其他能力。','打开 Plugins，阅读详情后安装。'],
 ['外部服务连接','使插件能访问指定账号中的资料或工具。','在连接流程中登录并授权，再核对可访问范围。'],
 ['VS Code 扩展','扩展 VS Code 编辑器中的功能。','从 VS Code 扩展入口安装；与 Codex 插件分开管理。']]),
 h('starter-extension-set','4.6.1  从少量常用能力开始',3),
 table('env-starter-skills',['用途','起步选择','怎样判断需要'],[
 ['核对 OpenAI 产品用法','OpenAI Docs 技能','教程、配置和功能说明需要官方资料时使用。'],
 ['安装现成技能','Skill Installer','需要从可信来源添加本地技能时使用；已经自带的不重复安装。'],
 ['制作自己的流程','Skill Creator','有反复执行的任务时再使用，详细制作留到进阶章节。'],
 ['维护 GitHub 项目','GitHub 插件','需要访问仓库、问题和合并请求时连接；普通本地 Git 操作不以它为前提。'],
 ['制作文档、表格或 PDF','对应文件类型的技能或插件','先查看当前可用能力，再按任务补充；无需一次装齐。']]),
 t('env-catalog-note','名称、默认提供情况和安装入口会随客户端与工作空间变化。先让 Codex 列出当前真正可用的技能与插件；表中的能力不代表每个账号都已经拥有。安装时查看发布者、说明和支持的使用端。'),
 h('install-plugin-steps','4.6.2  插件：安装、连接、验证',3),
 steps('env-plugin-steps',[
 ['打开 Plugins 搜索目标','先阅读插件说明，确认功能与支持平台。这里的起步示例是 GitHub；并非所有插件都适用于每个任务。'],
 ['安装插件','通过当前显示的安装入口完成。若提示只支持桌面端，在桌面应用中继续。'],
 ['连接自己的账号','有外部服务时按提示登录；在服务端授权所需仓库或资料。安装完成、账号已连接、目标资源可访问，应分别确认。'],
 ['新开对话做只读验证','让 Codex 列出目标仓库的文件或读取一份已授权资料。核对访问的是正确账号和项目，再使用会修改数据的功能。']]),
 ref('env-plugin-ref','官方说明：插件安装与连接','https://learn.chatgpt.com/docs/plugins','安装后新开对话；不同使用端的插件支持情况不同。'),
 shot('env-plugin-shot','截图 10 · 插件安装与连接状态','展示插件详情、安装状态和外部账号连接；不展示密钥。'),
 h('install-local-skill','4.6.3  本地 Skill：选择来源与作用范围',3),
 steps('env-skill-steps',[
 ['先检查是否已有所需技能','请 Codex 查看当前可用技能；如果已经具备，就直接尝试使用。'],
 ['使用可用的 Skill Installer','明确技能名称，或提供可信仓库中的具体技能目录链接。让安装器先说明来源、用途和准备安装的位置，再完成安装。'],
 ['区分项目级与个人级','只服务当前项目的技能放在项目范围；希望多个项目复用的技能放在个人范围。让安装器按当前客户端支持的目录处理，避免自己混用旧教程路径。'],
 ['检查是否可调用','尝试在技能候选中找到它，或要求 Codex明确调用该技能做一个小型验证。没有出现时检查安装位置，必要时重启；插件携带的技能按插件说明新开对话。']]),
 code('env-skill-prompt','安装技能前先检查','请检查当前可用的技能。我需要的能力是：[填写具体任务]。优先使用已有技能；确需安装时，列出可信来源、技能作用、安装范围和依赖。若当前有 Skill Installer，请使用它处理。不要覆盖同名技能；安装后告诉我如何调用，并做一次不修改现有项目的验证。'),
 ref('env-skill-ref','官方说明：本地技能与安装器','https://learn.chatgpt.com/docs/build-skills','查看技能作用范围与 Skill Installer；本章先完成安装，编写留到进阶章节。'),
 shot('env-skill-shot','截图 11 · 技能安装与调用验证','展示技能名称、来源、作用范围和一次实际调用结果。'),
 t('env-extension-maintain','以后不常用的能力可以卸载或停用；更新前阅读变更说明，并重新验证常用任务。删除插件与撤销外部账号连接可能是两个操作，需要分别检查。'),

 h('codex-setup','4.7  让 Codex 帮你完成环境配置'),
 note('env-local-access','先让 Codex 连接到真正要配置的电脑和项目','本机配置应在能访问该电脑的桌面任务中进行。普通网页对话或云端任务中的终端，不会自动成为你电脑上的终端。先核对运行位置、操作系统和项目路径，再要求安装。'),
 t('env-auto-intro','“一键配置”更适合已经明确、可以复用的一组步骤。第一次配置时，先检查现状并确定方案；注册、网页登录、系统授权等环节可能仍需你操作。下面的提示词把首次准备和后续复用分开。'),
 code('env-audit-prompt','第一步：检查电脑与项目','我想在这台电脑上使用 Codex 完成：[填写任务类型]。项目位置是：[填写路径]。\n请先只读检查：操作系统、当前执行环境、项目目录、已有 Git 和 VS Code、项目要求的运行时与依赖、可用技能和插件。\n按“已具备／缺少／暂不需要”列出结果，说明每项工具的用途，并给出最小配置方案。优先保留已有可用配置，不要先安装、升级或覆盖文件。'),
 code('env-apply-prompt','第二步：执行选定方案','请执行刚才确认的配置项目：[填写项目]。\n使用官方来源和项目要求的兼容版本；已满足要求的工具跳过。涉及登录或系统授权时告诉我在什么界面操作，不索取明文密码或密钥。\n安装后逐项检查版本、路径和实际可用性；失败时先说明原因，不用大范围改权限或重装全部环境来替代排错。\n完成后输出已完成、未完成、需要我处理的事项，并把不含秘密信息的配置记录保存到项目文档中。'),
 code('env-reuse-prompt','第三步：把已验证步骤做成可复用配置','请依据这次成功的配置结果，整理项目的环境准备说明和可重复执行的设置脚本。\n区分系统软件安装、项目依赖恢复、启动与检查命令；重复执行时先检测，不删除已有文件，不覆盖账号配置，不自动公开仓库或推送。\n注明系统与版本要求、每一步的作用、停止条件，以及失败后怎样重试。仅记录变量名称，不保存密钥值。执行一次适合当前环境的验证后，报告实际结果。'),
 table('env-auto-boundary',['Codex 可协助完成','仍可能需要你操作'],[
 ['检查版本、目录、依赖和配置冲突','说明任务目标、选择项目位置。'],
 ['下载或安装获准的工具，配置项目依赖','完成系统安装确认、账号登录和外部服务授权。'],
 ['生成设置脚本、整理说明和检查结果','核对公开范围、真实账号信息与最终效果。']]),
 shot('env-audit-shot','截图 12 · 环境检查与配置方案','展示只读检查结果和确认后的配置清单。'),
 h('reuse-environment','4.7.1  日常启动与新工作目录的自动准备',3),
 t('env-actions','配置成功后，可以在 Codex 的本地环境设置中为项目添加常用 Actions，例如启动开发程序或执行检查。先手动验证对应命令，再保存为快捷操作。设置脚本可用于新 Worktree 的准备；它解决新工作目录缺少依赖的问题，不代表每次打开任意目录都会安装整台电脑。'),
 steps('env-actions-steps',[
 ['找到项目实际使用的命令','请 Codex从项目说明和配置中确认启动、构建或检查命令，并说明在哪个目录运行。'],
 ['配置常用操作','在当前桌面端的本地环境设置中添加对应 Action，使用能看懂的名称，如“启动预览”或“检查项目”。'],
 ['需要 Worktree 时再配置准备脚本','只包含新工作目录所需的依赖准备。按 Windows／macOS／Linux 区分必要命令；不要把账号登录和破坏性操作放入自动脚本。'],
 ['验证一次并记录','运行 Action，或创建需要的 Worktree 验证准备脚本，检查实际返回结果。共享配置前移除机器专属路径和秘密信息。']]),
 ref('env-local-ref','官方说明：本地环境、设置脚本与 Actions','https://learn.chatgpt.com/docs/environments/local-environment','配置生成的位置、Worktree 设置脚本与常用操作。'),
 shot('env-actions-shot','截图 13 · 常用操作与项目设置','展示 Actions 的名称、命令、工作目录和一次验证结果。'),

 h('environment-check','4.8  检查准备结果，处理常见问题'),
 {id:'env-checklist',kind:'list',items:[
 {title:'',text:'Codex 和编辑器打开的是计划使用的同一目录或明确选定的 Worktree。'},
 {title:'',text:'Git 可用，作者配置正确，能够查看一次真实提交。'},
 {title:'',text:'需要远程同步时，GitHub 对应分支已出现预期文件和提交。'},
 {title:'',text:'项目要求的运行环境可用，至少完成一次实际启动或检查。'},
 {title:'',text:'所需技能能被调用；插件连接的账号与资源范围正确。'},
 {title:'',text:'配置说明记录了版本、路径、启动方式和待处理事项。'}]},
 table('env-faq',['遇到的问题','先检查','下一步'],[
 ['软件已安装，但命令未找到','终端是否重新打开、PATH 是否生效、执行环境是否一致。','确认程序实际路径后修复入口，再让 Codex复查。'],
 ['Git 提示缺少作者信息','当前仓库读取到的 user.name 与 user.email。','填写自己的正确身份，再重试提交。'],
 ['GitHub 页面没有最新文件','是否只保存未提交、提交未推送、查看了错误分支。','逐项核对状态，并确认推送成功。'],
 ['推送被拒绝或出现冲突','账号权限、本地修改和远程历史。','先让 Codex解释具体冲突，保留本地工作再处理；不要直接强推。'],
 ['装了插件但读不到资料','当前对话、账号连接、所授权仓库和工具支持端。','按提示完成连接，新开对话并做只读验证。'],
 ['Skill 没出现或使用效果不对','名称、来源、目录、任务是否适用。','检查安装范围，明确指定技能；需要时重启并复查。'],
 ['依赖安装后仍不能运行','项目版本要求、工作目录与完整报错。','按具体错误处理，保留锁定文件与已验证版本。'],
 ['自动配置只完成了一部分','是否等待系统确认、网页登录或网络访问。','补齐缺少环节，再从失败步骤继续，并要求列出未完成事项。']]),
 shot('env-done-shot','截图 14 · 环境验收结果','展示通过、未通过和待人工处理的项目，不以一句“配置完成”代替检查结果。'),
 t('env-finish','完成本章后，你应当拥有一份能打开、能检查、能记录版本，并且能运行所需任务的项目。接下来再学习如何编写项目规则、制作自己的 Skill，以及把插件和常用操作组织成可复用工作流。'),
];

export const fourthChapter={id:'desktop',title:'准备 Codex 工作环境：工具安装与配置',description:'准备 VS Code、Git 与 GitHub 同步，按项目安装运行环境和技能插件，让 Codex 协助检查、配置并验证可复用的工作环境。',body:renderBlocks(fourthChapterBlocks)};
