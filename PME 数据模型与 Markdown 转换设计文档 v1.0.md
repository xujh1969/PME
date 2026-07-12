# PME 数据模型与 Markdown 转换设计文档

版本：0.1.0  
更新时间：2026-07-09

## 1. 设计目标

PME 的数据设计遵循一个核心原则：

> 编辑时使用 TipTap / ProseMirror 富文本模型，存储时尽量保持标准 Markdown。

当前主模型是“单 Markdown 文件”而不是“项目目录”。内部仍保留 workspace 适配层，是为了同时支持浏览器文件 API、Tauri 原生文件 API，以及早期项目目录逻辑。

## 2. 数据流总览

打开文件：

```text
-------------+      +------------------+      +--------------------+
| .md 文件   | ---> | parseMarkdown()   | ---> | ProseMirror JSON   |
+-------------+      +------------------+      +--------------------+
                                                     |
                                                     v
                                              TipTap 编辑器
```

保存文件：

```text
TipTap 编辑器
      |
      v
ProseMirror JSON
      |
      v
serializeMarkdown()
      |
      v
.md 文件
```

打包分享：

```text
当前文档 JSON
      |
      v
扫描 image 节点
      |
      v
下载网络图片 / 读取本地图片 / 处理 data URL
      |
      v
生成 Markdown 副本 + assets/
      |
      v
ZIP
```

## 3. 顶层运行状态

主运行状态位于 `src/app.mjs` 的 `state` 对象中。关键字段包括：

| 字段 | 说明 |
| --- | --- |
| `workspaceAdapter` | 当前文件系统适配器，浏览器/Tauri/内存三选一 |
| `projectName` | 当前显示名称；单文件模式下通常来自文件名 |
| `files` | 路径到文本或预览 URL 的映射 |
| `paths` | 当前可见路径列表 |
| `openTabs` | 已打开文档标签 |
| `selectedPath` | 当前活动 Markdown 路径 |
| `documents` | 路径到 ProseMirror JSON 的映射 |
| `dirtyFiles` | 未保存文件集合 |
| `sourceMode` | 是否显示 Markdown 源码模式 |
| `showFileTree` | 是否显示旧文件树；新单文件模式通常为 false |
| `collapsedFolders` | 文件树折叠状态，兼容旧 workspace |
| `findQuery/findMatches` | 搜索状态 |

## 4. WorkspacePayload 接口

Tauri 后端和前端适配器之间使用 `WorkspacePayload`：

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

字段说明：

- `kind`：`tauri-file`、`tauri`、`browser-file`、`browser`、`memory` 等。
- `projectName`：用于界面显示的项目/文档名。
- `displayName`：更友好的显示名。
- `filePath`：单 Markdown 文件的真实路径，Tauri 模式使用。
- `rootPath`：目录型 workspace 根路径，兼容旧逻辑。
- `selectedPath`：打开后默认选中的文档路径。
- `files`：Markdown 文件内容，以及图片预览 URL。
- `paths`：文件树/路径集合。
- `assetIndex`：历史图片资产索引，当前单文件模式中不是主路径。

## 5. 文件系统适配层

入口：`src/core/workspace-adapter.mjs`

### 5.1 适配器选择

```text
如果 window.__TAURI_INTERNALS__ 存在 -> Tauri adapter
否则如果浏览器支持 File System Access API -> Browser adapter
否则 -> Memory adapter
```

### 5.2 标准适配器方法

```ts
interface WorkspaceAdapter {
  kind: string;
  canPersist: boolean;
  getWorkspaceInfo(): object | null;
  pickDirectory(): Promise<string | null>;
  createWorkspace(projectName: string, options?: object): Promise<WorkspacePayload | null>;
  openWorkspace(): Promise<WorkspacePayload | null>;
  openMarkdownFile(): Promise<WorkspacePayload | null>;
  openRecentWorkspace(recent: object): Promise<WorkspacePayload | null>;
  openRecentMarkdownFile(recent: object): Promise<WorkspacePayload | null>;
  writeTextFile(path: string, content: string): Promise<void>;
  writeBlobFile(path: string, blob: Blob): Promise<void>;
  removeFile(path: string): Promise<void>;
  saveTextFileDialog(defaultFileName: string, content: string): Promise<string | null>;
  saveBlobFileDialog(defaultFileName: string, blob: Blob): Promise<string | null>;
}
```

## 6. Markdown 支持范围

实现文件：`src/core/markdown.mjs`

### 6.1 块级节点

| Markdown | ProseMirror 类型 | 说明 |
| --- | --- | --- |
| `#` 到 `######` | `heading` | 标题 |
| 普通文本 | `paragraph` | 段落 |
| `---` / `***` | `horizontalRule` | 分割线 |
| `- item` | `bulletList` | 无序列表 |
| `- [ ] item` / `- [x] item` | `taskList` | 任务列表 |
| `> quote` | `blockquote` | 引用 |
| fenced code | `codeBlock` | 代码块，带 `language` |
| ` ```mermaid ` | `mermaidDiagram` | Mermaid 图表 |
| `$$ ... $$` | `blockMath` | 块级公式 |
| pipe table | `table` | 表格，支持对齐 |
| Markdown image | `image` | 图片 |
| HTML `img` | `image` | 用于保存图片尺寸 |

### 6.2 行内标记

| Markdown | 类型 |
| --- | --- |
| `**bold**` | `bold` |
| `*italic*` | `italic` |
| `~~strike~~` | `strike` |
| `` `code` `` | `code` |
| `[text](url)` | `link` |
| `$latex$` | `inlineMath` |

## 7. 图片模型

图片节点属性：

```ts
interface ImageAttrs {
  src: string;
  alt?: string;
  width?: number;
  scale?: number;
  originalWidth?: number;
  assetSrc?: string;
}
```

当前策略：

- 网络图片插入后保留原始 URL。
- 从网页复制图片时，优先提取 HTML 中的 `<img src>` 网络地址。
- 如果剪贴板只有图片二进制，则在编辑阶段使用 data URL，不自动写入 `assets/`。
- 图片大小使用原始宽度百分比控制，保存时计算成 HTML `img width`，并保留 `data-pme-scale`、`data-pme-original-width`。
- Markdown 图片路径在保存时按当前 Markdown 文件位置转为相对路径。

示例：

```html
<img src="image.png" alt="" width="480" data-pme-scale="50" data-pme-original-width="960" />
```

## 8. Mermaid 模型

节点类型：`mermaidDiagram`

```ts
interface MermaidAttrs {
  code: string;
  zoom?: number;
}
```

存储格式保持标准 fenced code：

````markdown
```mermaid
flowchart TD
  A --> B
```
````

当前缩放主要是编辑器视图状态。是否把缩放比例写入 Markdown，未来需要另行设计。建议保持 Markdown 标准语法，必要时使用 HTML 注释或外部元数据，但不要破坏 Typora 兼容性。

## 9. 表格模型

表格使用 TipTap table 系列扩展：

- `table`
- `tableRow`
- `tableHeader`
- `tableCell`

自定义属性：

```ts
interface TableCellAttrs {
  textAlign?: "left" | "center" | "right";
}
```

Markdown 对齐保存为表格分隔行：

```markdown
| A | B | C |
| :--- | :---: | ---: |
| left | center | right |
```

## 10. 代码块模型

代码块使用 `@tiptap/extension-code-block-lowlight`，语言保存在：

```ts
interface CodeBlockAttrs {
  language?: string;
}
```

保存格式：

````markdown
```javascript
console.log("PME");
```
````

自动缩进逻辑在 `src/core/code-indent.mjs`，根据语言返回 2 或 4 空格，并识别 `{`、`[`、`(`、Python 冒号、Shell `then/do` 等增加缩进的场景。

## 11. 导出与打包数据规则

### 11.1 PDF

前端生成可打印 HTML，Tauri 端调用：

```text
export_html_to_pdf_dialog(defaultFileName, html)
```

Rust 后端使用 Edge headless：

```text
msedge --headless=new --print-to-pdf=...
```

并使用 `--no-pdf-header-footer` 等参数移除浏览器打印页眉页脚。

### 11.2 Markdown ZIP

前端函数：`packageCurrentDocument()`

规则：

1. 扫描当前文档中的图片节点。
2. 如果没有图片，直接导出 Markdown。
3. 如果有图片，提示用户将下载/复制资源。
4. 对同一个来源只生成一个包内 asset。
5. 生成 ZIP：
   - `文档名.md`
   - `assets/图片文件`
6. 修改副本里的图片地址为 `assets/...`。
7. 原始 Markdown 不变。

## 12. 已知限制

- Markdown parser 是轻量实现，不是完整 CommonMark 解析器。
- 复杂嵌套列表、复杂 HTML、脚注、Front Matter 等尚未完整支持。
- Mermaid 缩放比例尚未写入 Markdown。
- 浏览器端直接读写真实路径受安全限制；完整体验以 Tauri 端为准。
- PDF 导出中的超大 Mermaid 图表需要后续设计分页和缩放策略。
