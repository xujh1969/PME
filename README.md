# PME - Portable Markdown Editor

PME 是一个本地优先的 Markdown 可视化编辑器，基于 Tauri 2 和 TipTap v3 构建。

## 功能特性

- **所见即所得编辑**：基于 TipTap / ProseMirror 实现流畅的富文本编辑体验
- **Markdown 支持**：支持标题、列表、任务列表、引用、分割线、链接、图片、表格、公式、代码块
- **代码高亮**：支持多种编程语言语法高亮
- **Mermaid 图表**：支持 Mermaid 流程图、时序图等
- **KaTeX 公式**：支持 LaTeX 数学公式渲染
- **图片处理**：支持拖入、粘贴、网络 URL 插入和百分比缩放
- **Workspace 模式**：支持多文件标签页和文件树管理
- **搜索功能**：支持全文搜索
- **大纲视图**：文档结构自动生成
- **源码模式**：可切换到 Markdown 源码编辑
- **导出功能**：支持 PDF 导出和 ZIP 打包
- **关闭保存提示**：关闭时自动检测未保存的修改并提示

## 技术栈

- **前端框架**：Vanilla JavaScript (ES Modules)
- **编辑器**：TipTap v3 + ProseMirror
- **构建工具**：Vite 8
- **桌面框架**：Tauri 2
- **图标库**：Lucide
- **代码高亮**：lowlight
- **数学公式**：KaTeX
- **图表渲染**：Mermaid

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
- NSIS 安装包：`src-tauri/target/release/bundle/nsis/PME_0.1.1_x64-setup.exe`
- MSI 安装包：`src-tauri/target/release/bundle/msi/PME_0.1.1_x64_en-US.msi`

## 项目结构

```
PME_Trae/
├── src/                      # 前端源代码
│   ├── app.mjs               # 主应用入口
│   ├── styles.css            # 全局样式
│   ├── core/                 # 核心模块
│   │   ├── markdown.mjs      # Markdown 解析与序列化
│   │   ├── ordered-list-extension.mjs  # 自定义有序列表扩展
│   │   └── workspace-session.mjs       # Workspace 会话管理
│   ├── editor/               # 编辑器相关
│   │   ├── editor-extensions.mjs       # TipTap 扩展配置
│   │   └── document-link.mjs          # 文档链接处理
│   └── components/           # UI 组件
├── src-tauri/                # Tauri 后端代码
│   ├── src/                  # Rust 源代码
│   ├── capabilities/         # 权限配置
│   ├── Cargo.toml            # Rust 依赖配置
│   └── tauri.conf.json       # Tauri 配置
├── index.html                # HTML 入口
├── package.json              # npm 依赖配置
└── README.md                 # 项目说明
```

## 重要文档

- `DEVELOPMENT.md`：开发指南和架构说明
- `PME UI详细设计 v1.0.md`：UI 设计规范

## 许可证

MIT License