# PME 后续开发交接说明

更新时间：2026-07-09  
适用版本：0.1.0

## 1. 项目目标

PME 是一个本地优先的 Markdown 可视化编辑器。当前主线已经从“项目目录型编辑器”调整为“通用 Markdown 文件编辑器”：

- 新建 Markdown 时立即进入编辑，不要求先选目录。
- 打开已有 Markdown 文件时直接进入编辑。
- 原始文件保持干净，图片来源不在编辑阶段强制复制到 `assets/`。
- 分享时通过打包功能生成 Markdown 副本、`assets/` 和 ZIP。

后续开发应优先维护这个方向，避免重新把普通用户操作绑定到项目目录。

## 2. 技术栈

| 层 | 技术 |
| --- | --- |
| 前端构建 | Vite |
| UI | 原生 DOM + CSS |
| 编辑器 | TipTap 3 / ProseMirror |
| Markdown 扩展 | KaTeX、Mermaid、lowlight |
| 图标 | lucide |
| ZIP 打包 | fflate |
| 桌面端 | Tauri 2 |
| 后端 | Rust |
| 测试 | Node.js `node --test` |

注意：当前不是 React 项目，早期文档中提到 React/TypeScript 已不符合实际。

## 3. 目录说明

```text
PME/
├─ index.html
├─ package.json
├─ src/
│  ├─ app.mjs
│  ├─ styles.css
│  ├─ assets/
│  │  └─ pme-hero.png
│  └─ core/
│     ├─ assets.mjs
│     ├─ browser-workspace.mjs
│     ├─ code-indent.mjs
│     ├─ markdown.mjs
│     ├─ markdown-shortcuts.mjs
│     ├─ outline.mjs
│     ├─ search.mjs
│     ├─ shortcuts.mjs
│     ├─ tabs.mjs
│     ├─ tauri-workspace.mjs
│     ├─ workspace-adapter.mjs
│     └─ workspace.mjs
├─ src-tauri/
│  ├─ Cargo.toml
│  ├─ tauri.conf.json
│  └─ src/main.rs
├─ tests/
├─ notion/
│  ├─ DESIGN.md
│  └─ README.md
└─ *.md
```

### 3.1 前端核心文件

| 文件 | 责任 |
| --- | --- |
| `src/app.mjs` | 应用主入口、TipTap 初始化、UI 渲染、事件绑定、菜单、弹窗、导出 |
| `src/styles.css` | 全局样式、设计系统 token、编辑器样式、弹窗、首页 |
| `src/core/markdown.mjs` | Markdown 解析与序列化 |
| `src/core/workspace-adapter.mjs` | 文件系统适配器统一入口 |
| `src/core/tauri-workspace.mjs` | Tauri 前端命令封装 |
| `src/core/browser-workspace.mjs` | 浏览器 File System Access API 封装 |
| `src/core/workspace.mjs` | workspace 兼容模型、路径树和文件名校验 |
| `src/core/assets.mjs` | 图片文件识别、资产命名、指纹 |
| `src/core/code-indent.mjs` | 代码块自动缩进策略 |
| `src/core/search.mjs` | 文本搜索匹配 |
| `src/core/outline.mjs` | 标题大纲提取 |
| `src/core/shortcuts.mjs` | 应用级快捷键映射 |

### 3.2 Tauri 核心文件

| 文件 | 责任 |
| --- | --- |
| `src-tauri/src/main.rs` | 原生文件对话框、Markdown 文件读写、PDF 导出、ZIP/二进制保存 |
| `src-tauri/tauri.conf.json` | Tauri 窗口、构建和打包配置 |

## 4. 程序架构

```text
用户操作
  |
  v
src/app.mjs
  |
  +--> TipTap Editor / ProseMirror JSON
  |
  +--> src/core/markdown.mjs
  |       parseMarkdown()
  |       serializeMarkdown()
  |
  +--> src/core/workspace-adapter.mjs
          |
          +--> Browser adapter
          +--> Tauri adapter
          +--> Memory adapter
```

Tauri 端：

```text
src/core/tauri-workspace.mjs
  |
  v
@tauri-apps/api/core.invoke()
  |
  v
src-tauri/src/main.rs #[tauri::command]
  |
  +--> 文件选择/保存
  +--> Markdown 读取
  +--> PDF 导出
  +--> 二进制 ZIP 保存
```

## 5. 主要接口

### 5.1 前端适配器接口

所有文件系统能力都应走 `createWorkspaceAdapter()`，不要在业务代码里直接判断浏览器或 Tauri。

```js
const adapter = createWorkspaceAdapter();
await adapter.openMarkdownFile();
await adapter.saveTextFileDialog("Untitled.md", markdown);
```

标准方法：

```ts
pickDirectory(): Promise<string | null>
createWorkspace(projectName, options?): Promise<WorkspacePayload | null>
openWorkspace(): Promise<WorkspacePayload | null>
openMarkdownFile(): Promise<WorkspacePayload | null>
openRecentWorkspace(recent): Promise<WorkspacePayload | null>
openRecentMarkdownFile(recent): Promise<WorkspacePayload | null>
writeTextFile(path, content): Promise<void>
writeBlobFile(path, blob): Promise<void>
removeFile(path): Promise<void>
saveTextFileDialog(defaultFileName, content): Promise<string | null>
saveBlobFileDialog(defaultFileName, blob): Promise<string | null>
```

### 5.2 Tauri 命令

Rust 命令定义在 `src-tauri/src/main.rs`：

| 命令 | 说明 |
| --- | --- |
| `open_markdown_file_dialog` | 打开单个 Markdown 文件 |
| `open_markdown_file_path` | 从最近文件路径打开 Markdown |
| `pick_workspace_parent_dialog` | 选择目录，兼容旧新建项目流程 |
| `create_workspace_dialog` | 创建旧 workspace |
| `open_workspace_dialog` | 打开旧 workspace 目录 |
| `open_workspace_path` | 从路径打开旧 workspace |
| `write_text_file` | 写文本文件 |
| `write_binary_file` | 写二进制文件 |
| `remove_file` | 删除文件 |
| `export_markdown_file_dialog` | 选择位置导出 Markdown |
| `export_binary_file_dialog` | 选择位置导出 ZIP |
| `export_html_to_pdf_dialog` | 使用 Edge headless 导出 PDF |

### 5.3 WorkspacePayload

```ts
interface WorkspacePayload {
  kind: string;
  projectName: string;
  displayName: string;
  filePath: string;
  rootPath: string;
  selectedPath: string;
  files: Record<string, string>;
  paths: string[];
  assetIndex: Record<string, string>;
}
```

## 6. 数据结构

### 6.1 ProseMirror 文档

PME 内部编辑状态是标准 ProseMirror JSON：

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "标题" }]
    }
  ]
}
```

### 6.2 图片节点

```json
{
  "type": "image",
  "attrs": {
    "src": "https://example.com/a.png",
    "alt": "image",
    "width": 480,
    "scale": 50,
    "originalWidth": 960
  }
}
```

### 6.3 Mermaid 节点

```json
{
  "type": "mermaidDiagram",
  "attrs": {
    "code": "flowchart TD\nA --> B"
  }
}
```

### 6.4 表格单元格

```json
{
  "type": "tableCell",
  "attrs": {
    "textAlign": "center"
  }
}
```

## 7. 开发思路与约束

### 7.1 单文件优先

新功能默认围绕当前 Markdown 文件设计。只有明确需要目录能力时，才触发 workspace 或文件夹逻辑。

### 7.2 保持 Markdown 可读

优先保存标准 Markdown。只有标准 Markdown 无法表达时，才使用兼容性较好的 HTML，例如带宽度的图片：

```html
<img src="a.png" alt="" width="480" data-pme-scale="50" data-pme-original-width="960" />
```

### 7.3 不破坏原始文档

打包、导出、PDF 生成都应基于副本或导出流，不应悄悄改写用户当前文件。

### 7.4 浏览器和 Tauri 的边界

浏览器端适合测试编辑逻辑和 UI。真实路径、无提示目录访问、PDF 直接落盘等能力以 Tauri 端为准。

### 7.5 UI 规范

新 UI 必须遵循：

- `notion/DESIGN.md` 的色彩、圆角、按钮、输入框风格。
- 所有弹窗中文化。
- 不使用浏览器原生 `alert` / `confirm`。
- 按钮文字不折行。
- 表单控件不要过高。
- 顶部菜单/工具条和底部状态栏固定。

## 8. 测试方法

### 8.1 全量单元测试

```powershell
npm test
```

当前测试覆盖：

- Markdown 解析和序列化。
- 图片资产和网络图片策略。
- 表格对齐。
- 公式和 Mermaid。
- 搜索。
- 大纲。
- 快捷键。
- Tauri 配置和 Rust 命令注册。
- 弹窗约束。
- 设计系统关键样式。
- 启动屏幕。

### 8.2 前端构建

```powershell
npm run build
```

构建通过是打包前置条件。

### 8.3 浏览器手工测试

```powershell
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

建议测试：

1. 新建 Markdown，输入标题、段落、表格、代码块、公式、Mermaid。
2. 插入网络图片和本地图片。
3. 粘贴网页图片。
4. 保存 Markdown，并用 Typora 打开验证。
5. 测试搜索、大纲、源码模式和缩放。

### 8.4 Tauri 手工测试

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
npm run tauri:dev
```

建议测试：

1. 打开已有 Markdown 文件。
2. 保存到原文件。
3. 新建 Markdown 后首次保存。
4. 导出 PDF。
5. 打包含图片 Markdown 为 ZIP。
6. 最近文件打开。

## 9. 打包方法

确保 Rust / Cargo 可用。如果 Cargo 已安装但不在当前 PATH，可以临时加入：

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
```

打包：

```powershell
npm run tauri:build
```

常见产物：

```text
src-tauri/target/release/pme.exe
src-tauri/target/release/bundle/nsis/PME_0.1.0_x64-setup.exe
src-tauri/target/release/bundle/msi/PME_0.1.0_x64_en-US.msi
```

如果 PDF 导出失败，优先检查：

- Microsoft Edge 是否存在。
- 目标保存目录是否可写。
- Tauri 后端是否能创建临时 HTML 和临时 Edge profile。
- 是否有旧 exe 仍在运行导致文件占用。

## 10. 重点后续任务

1. 完善设置系统：字体、字号、行距、主题、编辑区背景。
2. 增强 Markdown parser，逐步支持有序列表、嵌套列表、Front Matter、脚注。
3. 完善 PDF 导出模板，特别是 Mermaid 大图策略。
4. 增加打开外部 Markdown 文件后的本地图片解析能力和失败提示。
5. 将 `src/app.mjs` 中过大的 UI/业务逻辑拆分为更小模块，但不要为了抽象而抽象。
6. 增加端到端测试，覆盖 Tauri 关键文件操作。
7. 梳理旧 workspace 兼容代码，确认是否保留或逐步移除。

## 11. 开发注意事项

- 修改前先读相关测试，优先补或改测试。
- 只改与需求有关的文件。
- 不要重新引入 `.pme` 配置目录作为默认行为。
- 不要在编辑阶段自动创建 `assets` 目录。
- 不要用 `Ctrl+N`、`Ctrl+W` 这类会和浏览器冲突的快捷键。
- 不要在文档中保存 blob URL 作为长期路径；如果无法持久化，应打包或保存时处理。
- Mermaid 缩放比例是否写入 Markdown 仍未定，暂时不要引入破坏兼容性的私有语法。
