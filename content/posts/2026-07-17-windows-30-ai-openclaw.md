---
title: "Windows上30分钟搭建你的私人AI管家：OpenClaw新手完全指南"
date: 2026-07-17
source: wechat
original_url: "https://mp.weixin.qq.com/s?__biz=MzUxODQwNjMwOQ%3D%3D&idx=1&mid=2247484559&sn=5538da1370e65a848486b8d5cc055c4b"
locale: zh
---
为什么选择OpenClaw？第一部分：准备工作（5分钟）第二部分：安装OpenClaw（10分钟）第三部分：3个核心功能实操（10分钟）第四部分：验证与进阶（5分钟）

---

## 为什么选择OpenClaw？

**改名风云**：这个项目在2026年1月底经历了两次改名！**改名时间线：**2026年1月27日：原名Clawdbot，商标问题浮现2026年1月28日：更名为**Moltbot**（第一次改名）2026年1月30日：最终更名为**OpenClaw**（第二次改名）**当前官方信息：**项目名称：OpenClaw 🦞仓库：openclaw/openclaw官网：访问openclaw.ai查看描述：Your own personal AI assistant. Any OS. Any Platform.**重要提示：**网上教程可能出现：Clawdbot、OpenClaw、OpenClaw这三个名称指的是**同一个项目**

### ChatGPT vs OpenClaw

对比项ChatGPTOpenClaw运行位置云端浏览器你的本地电脑核心能力对话回答执行真实任务记忆能力单次对话24/7持久化记忆访问权限无能访问你的文件、邮件、日历远程控制❌✅ 从手机控制电脑

### OpenClaw能做什么

✅ 自动清理Gmail邮件（标记、分类、回复）✅ 管理Google Calendar（创建事件、智能提醒）✅ 远程控制Windows电脑（从手机执行命令）✅ 24/7待命，随时响应你的需求

### 这篇指南适合谁？

✓ 普通Windows用户（会使用电脑即可）✓ 想快速上手OpenClaw（30分钟完成）✓ 需要手把手教学（每步都有验证点）✗ 不适合：完全不懂电脑的小白

---

## 第一部分：准备工作（5分钟）

**目标**：确保你的Windows环境满足OpenClaw运行要求，避免安装中途卡住。

### 系统要求

**Windows 11** 或 **Windows 10**（版本1909或更高）至少4GB可用内存2GB可用磁盘空间稳定的网络连接

### 必需账号

**Claude API密钥**：访问Anthropic官网控制台（推荐）注册 → API密钥页面 → 创建密钥（只显示一次，立即复制！）**可选：其他AI模型API**OpenClaw支持多种AI模型，包括OpenAI、Gemini、Anthropic等不同模型可能需要额外的配置或代码修改建议新手先使用Claude API快速上手**IM账号（任选其一）**：**Telegram**：访问Telegram网页版或下载应用（推荐，新手友好）**Discord**：访问Discord官网（功能强大）**Slack**：访问Slack官网（适合团队协作）其他支持平台：WhatsApp、Signal、MS Teams、Matrix等

### 软件清单

#### 1. Node.js 18+

访问Node.js官网下载（选LTS版本）双击.msi安装，一路"下一步"重启命令行窗口

#### 2. Git for Windows

访问Git官网下载Windows版本双击安装推荐选项：Git Bash Here（在文件夹右键菜单中添加Git Bash选项）使用Windows默认控制台窗口

#### 3. 代码编辑器（可选）

**VS Code**：访问VS Code官网下载（推荐）或其他你喜欢的编辑器

### ✅ 验证检查清单

**方法1：PowerShell**ounter(lineounter(lineounter(line# 右键"开始"按钮 → 选择"Windows PowerShell"node --version # 应显示 v18.x.x 或更高git --version # 应显示 git version 2.x.x**方法2：CMD**ounter(lineounter(lineounter(line# Win+R 输入 cmd 回车node --versiongit --version**方法3：Git Bash**ounter(lineounter(lineounter(line# 在文件夹右键 → Git Bash Herenode --versiongit --version

### ⚠️ 常见问题

**Node.js安装失败？**使用nvm-windows安装：访问GitHub的nvm-windows发布页面下载安装nvm-windows打开PowerShell：nvm install 18nvm use 18

**Git安装后找不到命令？**重启命令行窗口检查系统环境变量PATH是否包含Git路径**找不到Claude API密钥？**Anthropic后台偶尔延迟，刷新页面后重新创建

---

## 第二部分：安装OpenClaw（10分钟）

**目标**：在Windows本地成功运行OpenClaw，并与Telegram连接。

### 步骤1：克隆OpenClaw仓库

**⚠️ 重要：如果GitHub访问受限，需要配置代理****方法1：Git Bash（推荐）**ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line# 在你想安装的目录右键 → Git Bash Here
# 如果需要代理，设置代理（替换为你的代理端口）git config --global http.proxy http://127.0.0.1:7890git config --global https.proxy https://127.0.0.1:7890
# 克隆仓库（注意：如果无法访问GitHub，请使用方法4的镜像地址）git clone https://github.com/clawdbot/clawdbot.git
# 进入项目目录cd clawdbot**方法2：CMD**ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line# 打开CMD，进入安装目录cd C:\Users\你的用户名\Documents
# 如果需要代理git config --global http.proxy http://127.0.0.1:7890git config --global https.proxy https://127.0.0.1:7890
# 克隆仓库（注意：如果无法访问GitHub，请使用方法4的镜像地址）git clone https://github.com/clawdbot/clawdbot.git
# 进入项目目录cd clawdbot**方法3：PowerShell**ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line# 进入安装目录cd $env:USERPROFILE\Documents
# 如果需要代理git config --global http.proxy http://127.0.0.1:7890git config --global https.proxy https://127.0.0.1:7890
# 克隆仓库（注意：如果无法访问GitHub，请使用方法4的镜像地址）git clone https://github.com/clawdbot/clawdbot.git
# 进入项目目录cd clawdbot**方法4：使用镜像（推荐，不需要代理）**ounter(lineounter(lineounter(line# 使用GitHub镜像（国内访问友好）git clone https://github.com.cnpmjs.org/clawdbot/clawdbot.gitcd clawdbot**✅ 验证点**：应该看到项目文件列表（package.json、src/等）**⚠️ 常见错误**：**git clone 失败**？Clash: 7890 (HTTP), 7891 (SOCKS5)V2Ray: 10808 (HTTP), 10809 (SOCKS5)检查代理是否运行：常见代理端口或使用镜像（方法4）**代理连接失败**？确认代理软件正在运行检查代理端口是否正确尝试取消代理配置使用镜像：git config --global --unset http.proxygit config --global --unset https.proxy

---

### 步骤2：安装依赖

**⚠️ PowerShell用户必读：执行策略限制**如果遇到错误：无法加载文件 npm.ps1，因为在此系统上禁止运行脚本**解决方法：****方法1：临时允许执行（推荐，单次有效）**ounter(lineounter(lineSet-ExecutionPolicy -Scope Process -ExecutionPolicy Bypassnpm install**方法2：永久允许执行**ounter(lineSet-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned**方法3：使用CMD或Git Bash（无此限制）**ounter(lineounter(lineounter(line# 打开CMD，进入clawdbot目录cd C:\Users\你的用户名\Documents\clawdbotnpm install

---

**开始安装依赖：****方法1：使用国内镜像（推荐，速度快）**ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line# 设置淘宝镜像npm config set registry https://registry.npmmirror.com
# 清理缓存npm cache clean --force
# 安装依赖npm install**方法2：直接使用镜像（单次）**ounter(lineounter(line# 使用淘宝镜像安装npm install --registry=https://registry.npmmirror.com**方法3：不使用镜像（需要代理）**ounter(lineounter(lineounter(lineounter(lineounter(line# 如果配置了代理npm install
# 或临时指定代理npm install --proxy http://127.0.0.1:7890**✅ 验证点**：显示大量包安装完成，最后无错误信息**⚠️ 常见错误**：**PowerShell执行策略错误**？使用上面的方法1或方法3**npm命令找不到**？检查Node.js是否正确安装，重启命令行**安装卡住不动**？按 Ctrl+C 取消，使用国内镜像重试**网络超时**？使用国内镜像（方法1）**权限错误**？以管理员身份运行命令行（右键 → 以管理员身份运行）**查看当前npm配置：**ounter(linenpm config get registry

---

### 步骤3：配置环境变量

**方法1：记事本**ounter(lineounter(lineounter(lineounter(lineounter(line# 复制环境变量模板copy .env.example .env
# 使用记事本打开notepad .env**方法2：VS Code**ounter(lineounter(lineounter(lineounter(lineounter(line# 复制环境变量模板copy .env.example .env
# 使用VS Code打开code .env**在.env中添加：****使用Claude API（推荐）：**ounter(lineounter(lineounter(lineANTHROPIC_API_KEY=sk-ant-xxxx # 替换为你的Claude密钥CLAWD_NAME=MyOpenClaw # 给你的AI起个名字PORT=3000 # 端口号（可选，默认3000）**使用其他AI模型：**ounter(lineounter(lineounter(line# 根据你选择的模型配置相应的API密钥# 例如：OpenAI、Gemini等# 具体配置请参考官方文档**保存并关闭编辑器****✅ 验证点**：执行 type .env（CMD/PowerShell）或 cat .env（Git Bash），确认配置显示正确**⚠️ 常见错误**：**API密钥格式错误**？确保是 sk-ant- 开头**文件保存失败**？检查是否有写入权限，以管理员身份运行**找不到文件**？检查当前目录：执行 dir（CMD）或 ls（Git Bash），应看到 .env 文件

---

### 步骤4：启动OpenClaw

ounter(lineounter(line# 启动服务npm start**✅ 验证点**：看到 ✓ OpenClaw is running! 或类似成功消息**⚠️ 常见错误**：**端口被占用**？修改.env中的 PORT=3001（改为其他端口）**API密钥无效**？检查密钥是否正确复制，无多余空格**防火墙拦截**？允许Node.js通过Windows防火墙**注意**：保持此命令行窗口运行，不要关闭！这是OpenClaw正在运行。

---

### 步骤5：连接IM平台

OpenClaw支持多个即时通讯平台，你可以选择最适合你的：**推荐平台对比：**平台优点缺点适合人群**Telegram**简单易用、中文友好需要特殊网络环境个人用户新手首选**Discord**功能强大、社区活跃界面复杂技术爱好者、团队**Slack**团队协作好功能相对简单企业团队**WhatsApp**用户基数大端到端加密限制个人日常使用**官方支持平台列表：**Telegram, Discord, Slack, WhatsAppSignal, MS Teams, Matrix, MattermostNextcloud Talk等**关于国内IM平台：**飞书、企业微信等国内平台目前**不在官方支持列表**中如需集成，可能需要通过webhook、API或自定义插件方式实现建议先使用官方支持的平台（推荐Telegram或Discord）具体集成方案请参考官方文档或社区讨论**本教程以Telegram为例，其他平台的配置方法类似，具体请参考官方文档。**

---

### 步骤5.1：连接Telegram（推荐新手）

在Telegram中：搜索 @BotFather发送 /newbot设置：显示名称（如：我的AI助手）用户名（必须以bot结尾，如：MyOpenClaw_bot）复制Token（格式：123456789:ABCdefGHI...，只显示一次！）**2. 配置.env文件**编辑 .env 文件，添加：ounter(lineounter(lineounter(lineTELEGRAM_BOT_TOKEN=你的Token # 粘贴刚才复制的TokenCLAWD_NAME=MyOpenClaw # 给你的AI起个名字PORT=3000 # 端口号（可选，默认3000）**完整配置示例（使用Claude API + Telegram）：**ounter(lineounter(lineounter(lineounter(lineANTHROPIC_API_KEY=sk-ant-xxxx # 你的Claude密钥TELEGRAM_BOT_TOKEN=你的TokenCLAWD_NAME=MyOpenClawPORT=3000**配置说明：**ANTHROPIC_API_KEY：Claude API密钥（推荐）TELEGRAM_BOT_TOKEN：Telegram机器人Token（必填）CLAWD_NAME：给AI起的名字（自定义）PORT：端口号（可选，默认3000）**3. 保存并重启OpenClaw**在命令行按 Ctrl+C 停止OpenClaw，然后重新启动：ounter(linenpm start**4. 测试Telegram机器人**在Telegram中找到你创建的机器人（搜索你设置的用户名）点击"开始"或发送 /start尝试发送 hello**✅ 验证点**：收到机器人的回复**⚠️ 常见错误**：**Token无效**？重新生成Token：在BotFather发送 /mybots选择你的机器人 → API Token → Revoke复制新的Token并更新 .env**机器人无响应**？确保 npm start 正在运行检查 .env 文件中Token是否正确（无多余空格）查看命令行窗口的错误信息**找不到机器人**？在Telegram搜索你设置的用户名（必须以bot结尾）确认BotFather显示的状态是"Running"**网络连接问题**？检查是否能访问Telegram如果在中国大陆，可能需要特殊网络环境**获取Telegram用户ID（可选，用于配置权限）：**在Telegram中搜索 @userinfobot发送任意消息机器人会返回你的用户ID（数字格式）记录这个ID，后续配置 ALLOWED_USERS 时使用

---

## 第三部分：3个核心功能实操（10分钟）

**目标**：掌握OpenClaw最实用的3个功能，立即提升工作效率。

---

### 功能1：邮件管理（清理、回复、分类）

#### 步骤1：让OpenClaw访问你的邮箱

在Telegram中发送给OpenClaw：ounter(line我需要你帮我管理Gmail，该怎么做？**预期回复**：OpenClaw会指导你创建Gmail API密钥和OAuth凭证

#### 步骤2：创建Gmail API密钥

访问Google Cloud Console控制台创建新项目 → 启用Gmail API创建OAuth 2.0凭证 → 选择"桌面应用"下载客户端密钥文件，重命名为 credentials.json将文件放入 C:\Users\你的用户名\Documents\clawdbot\config\ 目录**Windows路径说明**：Windows使用 \（反斜杠），Git Bash可使用 /（正斜杠），两者都有效。**如果不知道config目录在哪**：ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line# CMD/PowerShellcd configcd # 显示当前目录
# Git Bashcd configpwd

#### 步骤3：授权OpenClaw访问

ounter(lineounter(line# 在clawdbot目录运行npm run auth:gmail浏览器会弹出，点击"授权"**✅ 验证点**：终端显示 "✓ Gmail授权成功"

#### 步骤4：测试邮件清理

在Telegram中发送：ounter(line帮我查看未读邮件，并标记促销邮件为已读**预期回复**：类似 "发现15封未读邮件，其中8封为促销邮件，已标记为已读"

#### 步骤5：测试自动回复

ounter(line帮我回复这封重要邮件："感谢您的来信，我会在24小时内回复。"**⚠️ 常见错误**：**授权失败**？删除 config\token.json 后重新授权**无法发送邮件**？检查Gmail IMAP/SMTP是否已启用**路径问题**？确保 credentials.json 在 config 目录中

---

### 功能2：日历管理（创建事件、提醒）

#### 步骤1：连接Google Calendar

在Telegram中发送：ounter(line我需要管理我的日历

#### 步骤2：创建Google Calendar API凭证

在Google Cloud Console启用Calendar API创建OAuth 2.0凭证（同Gmail步骤）将凭证放入 config\credentials.json**注意**：如果已经配置过Gmail，credentials.json会包含两者的凭证。

#### 步骤3：授权日历访问

ounter(linenpm run auth:calendar**✅ 验证点**：终端显示 "✓ Calendar授权成功"

#### 步骤4：创建事件

在Telegram中发送：ounter(line明天下午3点创建一个会议："项目评审"，持续1小时**预期回复**：类似 "✓ 已创建事件：项目评审，明天 15:00-16:00"

#### 步骤5：智能提醒

ounter(line每天早上9点提醒我今天的日程**⚠️ 常见错误**：**日历API未启用**？重新检查Google Cloud Console**时区错误**？在.env中设置 TZ=Asia/Shanghai 或其他时区**credentials.json冲突**？确保包含Calendar和Gmail两个API的权限

---

### 功能3：远程控制（从手机控制Windows）

#### 步骤1：启用远程控制权限

在Telegram中发送：ounter(line我需要远程控制我的电脑OpenClaw会列出需要的权限列表（文件访问、终端执行等）

#### 步骤2：配置安全设置

编辑 .env，添加：ounter(lineounter(lineALLOWED_USERS=你的Telegram用户ID # 只允许特定用户控制ALLOWED_COMMANDS=dir,echo,type # 允许的安全命令白名单（Windows命令）**获取Telegram用户ID**：在Telegram中搜索 @userinfobot发送任意消息获取你的数字ID复制这个ID到 .env 文件

#### 步骤3：测试文件操作

在Telegram中发送（用手机）：ounter(line列出Desktop目录的文件**预期回复**：显示你的桌面文件列表

#### 步骤4：测试终端执行

ounter(line执行命令：echo "Hello from phone!" > %USERPROFILE%\test.txt**✅ 验证点**：在Windows命令行执行：ounter(linetype %USERPROFILE%\test.txt应该看到 "Hello from phone!"

#### 步骤5：高级控制 - 查找文件

ounter(line在Documents目录查找所有.pdf文件**⚠️ 常见错误**：**权限被拒绝**？检查ALLOWED_COMMANDS配置**命令执行超时**？在.env增加 COMMAND_TIMEOUT=30000（30秒）**Windows路径问题**：使用 %USERPROFILE% 代替 ~**命令不兼容**：确保使用Windows命令（dir而不是ls，type而不是cat）**Windows常用命令对照表**：功能Linux/Mac命令Windows命令列出文件lsdir显示文件内容cat filenametype filename复制文件cp source destcopy source dest删除文件rm filenamedel filename当前目录pwdcd (无参数)

---

## 第四部分：验证与进阶（5分钟）

**目标**：确保所有功能正常工作，了解下一步如何提升。

---

### 功能验证清单

ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line✅ 准备工作 [ ] Node.js 18+ 已安装 [ ] Git for Windows 已安装 [ ] Claude API密钥已获取 [ ] IM账号已创建（Telegram/Discord/Slack等）
✅ 安装成功 [ ] OpenClaw仓库已克隆 [ ] 依赖包已安装 [ ] 环境变量已配置 [ ] 服务启动成功 [ ] Telegram机器人已连接
✅ 核心功能 [ ] Gmail授权成功 [ ] 邮件清理功能正常 [ ] Calendar授权成功 [ ] 事件创建功能正常 [ ] 远程命令执行成功

---

### 常见问题速查

**问题1：git clone 失败（无法访问GitHub）**ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line错误：Failed to connect to github.com port 443解决：方法1 - 配置代理： git config --global http.proxy http://127.0.0.1:7890
 方法2 - 使用镜像： git clone https://github.com.cnpmjs.org/clawdbot/clawdbot.git （镜像地址：github国内cnpmjs镜像）**问题2：PowerShell执行策略限制**ounter(lineounter(lineounter(line错误：无法加载文件 npm.ps1，因为在此系统上禁止运行脚本解决：Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass 然后重新运行 npm install**问题3：npm install 很慢或卡住**ounter(lineounter(lineounter(lineounter(lineounter(line错误：安装过程一直卡住不动解决：使用国内淘宝镜像： npm config set registry https://registry.npmmirror.com npm cache clean --force npm install**问题4：OpenClaw启动失败**ounter(lineounter(line错误：Error: ENOENT: no such file or directory解决：确保在clawdbot目录下运行 npm start，执行 dir 检查文件**问题5：Telegram机器人无响应**ounter(lineounter(lineounter(lineounter(line错误：机器人不回复消息解决：检查.env中的TELEGRAM_BOT_TOKEN是否正确 确保 npm start 正在运行 重启服务：Ctrl+C 然后 npm start**问题6：Gmail授权后无法读取邮件**ounter(lineounter(line错误：Error: invalid_grant解决：删除 config\token.json，重新运行 npm run auth:gmail**问题7：远程命令执行超时**ounter(lineounter(line错误：Command execution timeout解决：在.env增加 COMMAND_TIMEOUT=60000**问题8：Windows路径问题**ounter(lineounter(lineounter(line错误：找不到文件或路径解决：使用完整路径，如 C:\Users\你的用户名\Documents\clawdbot 或使用环境变量 %USERPROFILE%**问题9：防火墙拦截**ounter(lineounter(lineounter(line错误：连接被拒绝解决：Windows安全中心 → 防火墙和网络保护 → 允许应用通过防火墙 → 勾选Node.js**问题10：npm命令找不到**ounter(lineounter(lineounter(lineounter(line错误：'npm' 不是内部或外部命令解决：1. 检查Node.js是否正确安装 2. 重启命令行窗口 3. 检查系统PATH环境变量是否包含Node.js路径**问题11：Telegram无法访问（中国大陆）**ounter(lineounter(lineounter(line错误：无法连接到Telegram服务器解决：需要特殊网络环境访问Telegram 或使用代理/VPN**问题12：提示 moltbot 不是命令**ounter(lineounter(lineounter(lineounter(lineounter(line错误：'moltbot' 不是内部或外部命令解决：CLI 不在 PATH。仓库内可以用 Node 入口执行： node .\moltbot.mjs <command>
 如果想要全局命令，请安装 CLI，并确保 PATH 包含 npm 全局 bin 目录**问题13：Doctor 提示 Control UI assets 缺失**ounter(lineounter(lineounter(lineounter(line错误：UI 资源未构建解决：确认已安装 pnpm，然后在仓库根目录执行： pnpm install node scripts/ui.js build**问题14：Doctor 提示 pnpm workspace 里出现 package lock**ounter(lineounter(lineounter(line错误：npm 和 pnpm 混用解决：删除 package-lock.json，用 pnpm 重新安装依赖： pnpm install**问题15：Sessions 或 credentials 目录缺失**ounter(lineounter(lineounter(lineounter(line错误：状态目录未初始化解决：手动创建目录： mkdir C:\Users\<user>\.clawdbot\agents\main\sessions mkdir C:\Users\<user>\.clawdbot\credentials**问题16：Gateway 未运行或服务未安装**ounter(lineounter(line错误：网关服务没安装或没启动解决：用 CLI 安装并启动，或通过 Windows 计划任务启动已安装的服务**问题17：聊天里出现 401 Authorization Failure**ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line错误：通常是模型提供方的 key 没有被网关进程读取到解决：确认 key 有效并且网关能读到
 检查要点： - API密钥格式是否正确 - 网关服务的环境变量配置 - 模型配置是否匹配所选服务商**问题18：key 有效但仍然 401**ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line错误：key 可能没有被服务进程看到解决：Windows 计划任务不会自动读取仓库里的 .env 可选方案： - 写入用户或系统环境变量 - 通过 CLI 写入 auth profile - 使用服务级环境文件
 然后重启 Gateway 任务**问题19：Windows 下如何重启 Gateway**ounter(lineounter(lineounter(line解决：如果是计划任务安装，可以这样重启： schtasks /End /TN "OpenClaw Gateway" schtasks /Run /TN "OpenClaw Gateway"**问题20：日志在哪里**ounter(lineounter(lineounter(line解决：网关启动时会打印日志路径。常见位置： - C:\tmp\moltbot\moltbot-YYYY-MM-DD.log - 会话日志：C:\Users\<user>\.clawdbot\agents\main\sessions\*.jsonl**问题21：如何确认网关在监听**ounter(lineounter(lineounter(lineounter(line解决：检查端口是否打开： Get-NetTCPConnection -LocalPort 18789
 如果没在监听，重启任务后再检查

---

### 下一步探索方向

#### 进阶功能

**自定义技能开发**：创建个人化的自动化脚本**多平台集成**：同时连接多个IM平台（Telegram + Discord + Slack等）**数据持久化**：配置记忆功能，让OpenClaw记住你的偏好**定时任务**：设置Windows任务计划定时自动化工作流**后台运行**：将OpenClaw设置为Windows服务，开机自启动**切换AI模型**：尝试OpenAI、Gemini等其他模型（需额外配置）

#### Windows特定优化

**PowerShell集成**：利用PowerShell的强大功能**Windows任务计划**：定时执行OpenClaw命令**系统通知**：配置Windows桌面通知**剪贴板操作**：远程复制粘贴文本

#### 学习资源

**官方文档**：访问GitHub仓库查看文档**社区讨论**：在Twitter搜索话题 #OpenClaw**技能市场**：浏览社区分享的自定义技能**Windows文档**：Windows命令行参考手册

#### 安全提醒

定期更换API密钥设置命令白名单，限制远程操作范围不要分享.env文件和凭证信息使用Windows Defender定期扫描保护好Telegram账户安全限制 ALLOWED_USERS，只让信任的用户控制

---

### Windows服务化运行（进阶）

**目标**：让OpenClaw在后台自动运行，开机启动。

#### 方法1：使用Node.js的pm2（推荐）

ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line# 全局安装pm2npm install -g pm2
# 启动OpenClawpm2 start npm --name "moltbot" -- start
# 设置开机启动pm2 startup# 复制输出的命令并执行
# 保存当前进程列表pm2 save
# 查看状态pm2 status
# 查看日志pm2 logs moltbot
# 重启服务pm2 restart moltbot
# 停止服务pm2 stop moltbot

#### 方法2：使用Windows服务工具（NSSM）

ounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(lineounter(line# 访问NSSM官网下载# 解压后，将nssm.exe放到系统PATH中
# 安装为服务nssm install OpenClaw
# 在弹出的窗口配置：# Path: C:\Program Files\nodejs\node.exe# Startup directory: C:\Users\你的用户名\Documents\clawdbot# Arguments: C:\Users\你的用户名\Documents\clawdbot\node_modules\.bin\npm start
# 启动服务nssm start OpenClaw
# 设置服务为自动启动nssm set OpenClaw Start SERVICE_AUTO_START

---

## 🎉 恭喜！

你已经在Windows上成功搭建了自己的AI私人管家。现在你可以：从手机远程控制Windows电脑自动管理Gmail邮件和日历让AI处理重复性任务**Windows系统提示**：使用Windows命令（dir, type, copy等）而不是Linux命令注意路径格式（使用反斜杠 \）利用Windows任务计划实现定时任务使用pm2或nssm实现后台运行享受你的AI助手带来的效率提升吧！有什么问题随时在Telegram中给你的OpenClaw发消息询问它自己！

---

**文档信息**版本：1.0系统要求：Windows 10/11创建日期：2026-01-29预计阅读时间：15分钟实际操作时间：30分钟**命令行参考****CMD**：传统的Windows命令行**PowerShell**：功能更强大的命令行**Git Bash**：类Linux环境，熟悉Linux命令的用户推荐使用
