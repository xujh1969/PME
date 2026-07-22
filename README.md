# PME - Portable Markdown Editor

PME 是一个本地优先的 Markdown 可视化编辑器，基于 Tauri 2 和 TipTap v3 构建。

**当前版本**: 0.1.8

## 功能特性

### 核心编辑功能

- **所见即所得编辑**：基于 TipTap / ProseMirror 实现流畅的富文本编辑体验
- **Markdown 支持**：支持标题、列表、任务列表、引用、分割线、链接、图片、表格、公式、代码块
- **代码高亮**：支持多种编程语言语法高亮（基于 lowlight）
- **Mermaid 图表**：支持 Mermaid 流程图、时序图等多种图表类型，支持 AI 助手生成图表代码（流式输出），支持主题适配和缩放拖拽
- **KaTeX 公式**：支持 LaTeX 数学公式渲染，支持 `$...$`、`$$...$$`、`\(...\)`、`\[...\]` 四种格式
- **图片处理**：支持拖入、粘贴、网络 URL 插入和百分比缩放
- **视频插入**：支持插入本地视频文件并播放
- **源码模式**：可切换到 Markdown 源码编辑

### 折叠功能

- **标题折叠**：各级标题（H1-H6）可折叠/展开，点击标题前箭头切换状态
- **折叠持久化**：折叠状态通过 `<!--collapsed-->` 标记保存到 Markdown 文件，下次打开保持状态
- **大纲联动**：点击大纲中被折叠的标题时，自动展开父标题并跳转定位
- **折叠详情块**：选中文字后可创建带总结标题的折叠块，点击展开/收起详情内容

### 文档管理

- **Workspace 模式**：支持多文件标签页和文件树管理
- **搜索功能**：支持全文搜索和替换，支持区分大小写和全字匹配，查找时光标自动跳转到匹配位置，按"下一个"/"上一个"光标跟随移动
- **最近打开文件**：文件菜单中显示最近6个打开的文件列表，包含文件名和路径，点击在新标签页打开
- **大纲视图**：文档结构自动生成，支持点击跳转，点击被折叠标题下的子标题时自动展开父标题
- **关闭保存提示**：关闭时自动检测未保存的修改并提示

### 扩展功能

- **警告框（Callout）**：支持多种类型（note, tip, important, warning, caution），带图标显示
- **脚注**：支持 Markdown 脚注语法
- **目录**：自动生成文档目录，基于标题结构
- **任务列表**：支持可勾选的任务项
- **上下标**：支持上标和下标格式
- **高亮标记**：支持多色文本高亮
- **文本颜色**：支持自定义文本颜色
- **Emoji**：支持 Emoji 表情插入
- **段落对齐**：支持左对齐、居中、右对齐、两端对齐
- **段落缩进**：支持段落增加/减少缩进（最多5级），支持列表项嵌套缩进

### 配置与外观

- **字体配置**：可独立设置中文、英文和代码字体
- **主题切换**：支持浅色主题和深色主题（ElevenLabs 设计风格）
- **配置持久化**：配置文件保存在用户主目录 `.pme/config.json`

### AI 助手

- **智能文本处理**：支持智能润色、精简压缩、内容扩写、正式化改写、口语化改写、文本翻译、生成摘要、智能续写
- **文档生成**：支持生成模板（方案、报告、合同等）、生成表格（将文字整理为 Markdown 表格）
- **自由命令**：支持输入自定义指令直接发送给 AI
- **自定义功能**：可通过配置添加自定义 AI 功能按钮，每个功能包含名称和提示词模板
- **补充命令**：在执行任何 AI 功能时，可添加额外指令与选中文本一起发送
- **操作模式**：支持复制结果、插入下方、替换原文三种操作

### 导出与打印

- **PDF 导出**：支持导出为 PDF 文件，使用配置的字体渲染，支持数学公式和代码块渲染
- **打印功能**：支持打印到打印机，包含打印预览，修复了打印预览重复弹出问题
- **ZIP 打包**：支持将文档及相关资源打包为 ZIP 文件，Base64 嵌入图片会自动提取保存为单独文件，使用相对路径引用，保持与其他 Markdown 工具的兼容性

### 交互体验

- **菜单悬停**：菜单打开后，鼠标在主菜单栏上移动时自动切换菜单
- **编辑界面底色统一**：文档编辑区底色与文档内容底色保持一致，无论文档长短
- **深色主题优化**：下拉框、输入框等控件适配深色主题，接近 VS Code 深色主题风格
- **中文字体扩展**：中文字体配置增加楷体 (KaiTi) 和仿宋体 (FangSong) 选项

## 技术栈

- **前端框架**：Vanilla JavaScript (ES Modules)
- **编辑器**：TipTap v3 + ProseMirror
- **构建工具**：Vite 8
- **桌面框架**：Tauri 2
- **图标库**：Lucide
- **代码高亮**：lowlight
- **数学公式**：KaTeX
- **图表渲染**：Mermaid
- **PDF 生成**：html2pdf.js

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

浏览器访问：`http://127.0.0.1:5173/`

### Tauri 桌面端

**开发模式**：

```bash
npm run tauri:dev
```

**打包构建**：

```bash
npm run tauri:build
```

### 构建产物

- 可执行文件：`src-tauri/target/release/pme.exe`
- NSIS 安装包：`src-tauri/target/release/bundle/nsis/PME_0.1.5_x64-setup.exe`
- MSI 安装包：`src-tauri/target/release/bundle/msi/PME_0.1.5_x64_en-US.msi`

## 项目结构

```
PME_Trae/
├── src/                      # 前端源代码
│   ├── app.mjs               # 主应用入口（状态管理、生命周期）
│   ├── styles.css            # 全局样式（包含浅色/深色主题变量）
│   ├── core/                 # 核心模块
│   │   ├── config.mjs        # 配置管理（字体、主题）
│   │   ├── markdown.mjs      # Markdown 解析与序列化
│   │   ├── ordered-list-extension.mjs  # 自定义有序列表扩展
│   │   ├── workspace-session.mjs       # Workspace 会话管理
│   │   ├── pdf-export.mjs    # PDF 导出逻辑
│   │   ├── source-mode.mjs   # 源码模式切换
│   │   └── shortcuts.mjs     # 快捷键定义
│   ├── editor/               # 编辑器相关
│   │   ├── editor-extensions.mjs       # TipTap 扩展配置
│   │   ├── document-link.mjs          # 文档链接处理
│   │   ├── mermaid-node.mjs           # Mermaid 图表节点
│   │   ├── heading-collapse.mjs       # 标题折叠插件
│   │   ├── callout-extension.mjs      # 警告框扩展
│   │   └── video-extension.mjs        # 视频扩展
│   └── ui/                   # UI 组件
│       ├── settings-modal.mjs         # 配置对话框
│       ├── image-insert-modal.mjs     # 图片插入对话框
│       ├── ai-modal.mjs               # AI 助手对话框
│       └── app-command-runner.mjs     # 应用命令处理
├── src-tauri/                # Tauri 后端代码
│   ├── src/main.rs           # Rust 主程序（配置文件读写命令）
│   ├── capabilities/         # 权限配置
│   ├── Cargo.toml            # Rust 依赖配置
│   └── tauri.conf.json       # Tauri 配置
├── elevenlabs/               # ElevenLabs 设计风格规范
├── index.html                # HTML 入口
├── package.json              # npm 依赖配置
└── README.md                 # 项目说明
```

## 技术实现细节

### 配置管理

配置文件存储在用户主目录下的 `.pme/config.json`，包含以下结构：

```json
{
  "fonts": {
    "chinese": "Noto Sans SC, Microsoft YaHei, sans-serif",
    "english": "Inter, SF Pro Display, sans-serif",
    "code": "JetBrains Mono, Fira Code, monospace"
  },
  "theme": "light"
}
```

由于 Tauri 2 的安全策略，配置文件读写通过 Rust 命令实现：

- `read_config_file()`：读取配置文件内容
- `write_config_file(content)`：写入配置文件

配置模块 `src/core/config.mjs` 提供以下功能：

- `initConfig()`：初始化配置，读取或使用默认值
- `saveConfig()`：保存配置到文件
- `getCurrentFonts()`：获取当前字体配置
- `setFonts(fonts)`：设置字体并应用到编辑器
- `setTheme(theme)`：切换主题并应用 CSS 变量

### 主题系统

主题通过 CSS 变量和 `data-theme` 属性实现切换：

- 浅色主题：`data-theme="light"`（默认）
- 深色主题：`data-theme="dark"`

主题配色基于 ElevenLabs 设计风格：

**浅色主题**：

- 画布色：`#f5f5f5`（米白色）
- 文字色：`#0c0a09`（暖黑色）
- 卡片色：`#ffffff`（纯白）

**深色主题**：

- 画布色：`#0c0a09`（深黑色）
- 文字色：`#f5f5f5`（米白色）
- 卡片色：`#1c1917`（深色卡片）

字体配置仅应用于 `.ProseMirror` 元素，不影响界面菜单、按钮等 UI 组件。

### 快捷键

#### 全局快捷键（无论焦点在哪里都能触发）

| 快捷键    | 功能             |
| ------ | -------------- |
| Ctrl+F | 查找（自动聚焦到查找输入框） |
| Ctrl+H | 替换（自动聚焦到查找输入框） |
| Ctrl+/ | 切换源码模式         |

#### 文件操作

| 快捷键          | 功能   |
| ------------ | ---- |
| Ctrl+N       | 新建文件 |
| Ctrl+O       | 打开文件 |
| Ctrl+S       | 保存文件 |
| Ctrl+Shift+S | 另存为  |
| Ctrl+P       | 打印   |

#### 段落格式

| 快捷键       | 功能      |
| --------- | ------- |
| Ctrl+0    | 正文      |
| Ctrl+1\~6 | 一级到六级标题 |
| Ctrl+=    | 提升标题级别  |
| Ctrl+-    | 降低标题级别  |
| Ctrl+]    | 增加缩进（段落或列表）  |
| Ctrl+\[   | 减少缩进（段落或列表）  |

#### 格式设置

| 快捷键          | 功能   |
| ------------ | ---- |
| Ctrl+B       | 加粗   |
| Ctrl+I       | 斜体   |
| Ctrl+U       | 下划线  |
| Ctrl+Shift+5 | 删除线  |
| Ctrl+Shift+C | 文本颜色 |
| Ctrl+Shift+H | 背景高亮 |
| Ctrl+\\      | 清除格式 |

#### 块级元素

| 快捷键          | 功能  |
| ------------ | --- |
| Ctrl+Shift+M | 公式块 |
| Ctrl+Shift+K | 代码块 |

### 菜单说明

#### 文件菜单

- **新建文件** (Ctrl+N)：创建新的 Markdown 文件
- **打开文件** (Ctrl+O)：打开本地 Markdown 文件
- **最近打开**：显示最近6个打开的文件列表，包含文件名和完整路径，点击在新标签页打开
- **保存** (Ctrl+S)：保存当前文件
- **另存为** (Ctrl+Shift+S)：保存当前文件为新文件
- **打包当前文档**：将文档及相关资源打包为 ZIP 文件
- **导出 PDF**：导出为 PDF 文件
- **配置**：打开配置对话框，设置字体和主题
- **打印** (Ctrl+P)：打开打印对话框

#### 编辑菜单

- **撤销** (Ctrl+Z)：撤销上一步操作
- **重做** (Ctrl+Y)：重做上一步操作
- **剪切** (Ctrl+X)：剪切选中内容
- **复制** (Ctrl+C)：复制选中内容
- **粘贴** (Ctrl+V)：粘贴剪贴板内容
- **全选** (Ctrl+A)：选中全部内容

#### 视图菜单

- **侧边栏**：切换侧边栏显示
- **大纲**：切换大纲视图显示
- **文件树**：切换文件树显示
- **状态栏**：切换状态栏显示
- **缩放**：调整编辑器缩放比例

#### 帮助菜单

- **关于 PME**：显示关于对话框，包含作者信息

## 重要文档

- `DEVELOPMENT.md`：开发指南和架构说明
- `PME UI详细设计 v1.0.md`：UI 设计规范

## 许可证

MIT License

## 作者

Xu JianHang
