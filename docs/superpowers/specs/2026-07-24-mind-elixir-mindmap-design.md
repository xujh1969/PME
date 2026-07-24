# Mind Elixir 思维导图功能设计

## 背景

PME 已支持在 Markdown 文档中插入 Mermaid 图表，并能在导出 PDF/HTML 时将图表转换为适合页面的静态展示。现在需要新增类似 XMind 的思维导图功能：用户可以在编辑器中插入思维导图，并通过图形化界面直接编辑节点；导出 PDF 和 HTML 时，思维导图以静态图片显示。

第一版目标是实现稳定的文档内思维导图块，而不是完整复刻 XMind。功能范围应保持克制，优先保证 Markdown 自包含、编辑体验可用、导出结果稳定。

## 成功标准

- 用户可以从菜单或工具栏插入一个默认思维导图。
- 思维导图在可视化编辑器中使用 Mind Elixir 进行图形化交互编辑。
- 保存 Markdown 时，思维导图数据以 fenced code block 形式保存在文档内。
- 重新打开 Markdown 后，思维导图可以正确恢复。
- 导出 PDF 时，思维导图显示为静态图片，并按页面最大宽度和最大高度等比缩放。
- 导出 HTML 时，思维导图显示为静态图片，不保留交互脚本。
- 简单图和较复杂的长图都不会导致 PDF 空白页、超大图或跨多页异常。

## 用户体验

### 插入

在现有插入菜单和工具栏中增加“思维导图”入口。点击后插入默认导图：

- 中心主题：`中心主题`
- 两个示例子节点：`主题 1`、`主题 2`

默认内容可以帮助用户理解交互方式，但不加入额外说明文本。

### 编辑

思维导图块在编辑器中以原子块形式呈现，内部挂载 Mind Elixir。

第一版依赖 Mind Elixir 自带交互能力：

- 点击节点编辑文本。
- 拖拽节点调整结构。
- 使用库内置快捷键新增同级或子级节点。
- 画布支持缩放和平移。

PME 只负责节点容器、数据持久化、选中状态、导出准备和错误兜底，不重写 Mind Elixir 的核心交互。

### 删除和选择

思维导图作为 TipTap 原子块，行为与 Mermaid 图表类似：

- 可以被整体选中。
- 可以被删除。
- 光标移动时不进入内部 DOM 文本。

## Markdown 数据格式

使用 fenced code block 存储 Mind Elixir 数据：

```md
```mindmap
{
  "nodeData": {
    "id": "root",
    "topic": "中心主题",
    "children": []
  }
}
```
```

解析规则：

- 语言标识为 `mindmap` 时解析为 `mindMap` 节点。
- 代码块内容按 JSON 解析。
- JSON 无效时保留原始文本并在编辑器中显示错误状态，避免数据丢失。

序列化规则：

- `mindMap` 节点序列化回 ` ```mindmap ` fenced code block。
- JSON 使用稳定格式输出，减少无意义 diff。

## 架构

### 新增编辑器节点

新增 `src/editor/mindmap-node.mjs`：

- 定义 TipTap 节点 `mindMap`。
- 属性包含：
  - `data`：Mind Elixir 数据对象或 JSON 字符串。
  - `raw`：当 JSON 无效时保留原始内容。
- NodeView 中创建容器并挂载 Mind Elixir。
- 当 Mind Elixir 数据变化时，将最新数据同步回 TipTap 节点属性。

### Mind Elixir 集成

依赖包使用 `mind-elixir`。

初始化方式参考 Mind Elixir 官方 API：

```js
const mind = new MindElixir({ el: container });
mind.init(data);
```

需要封装本地适配层，避免库 API 直接散落在应用入口中：

- `createDefaultMindMapData()`
- `normalizeMindMapData(value)`
- `serializeMindMapData(data)`
- `renderMindMap(container, data, options)`
- `exportMindMapElementToImage(element, limits)`

### 应用入口接入

在现有编辑器扩展注册处加入 `MindMap` 节点。

在插入命令系统中增加：

- 菜单命令：`mindmap`
- 工具栏按钮：`MindMap` 或中文显示“思维导图”
- 命令执行：`insertMindMap({ data: createDefaultMindMapData() })`

## 导出设计

### PDF 导出

PDF 导出沿用现有可打印 DOM 克隆流程。

新增 `prepareMindMapsForPrint(root)`：

1. 找到 `.mindmap-diagram` 节点。
2. 从 DOM 中读取已渲染的 Mind Elixir 内容。
3. 导出为静态图片，优先使用 Mind Elixir 的导出能力；如果不可用，则使用可序列化 SVG 或 canvas 兜底。
4. 使用与 Mermaid 相同的最大宽度和最大高度约束，等比缩放图片。
5. 替换交互式 DOM 为静态 `<img>`。

尺寸原则：

- 最大宽度：参考 Mermaid 当前 PDF 导出最大宽度。
- 最大高度：参考 Mermaid 当前 PDF 导出最大高度。
- 只缩小，不放大。
- PNG 和 SVG fallback 使用同一套尺寸计算。

### HTML 导出

HTML 打包导出也使用静态图片。

因为 HTML 打包当前直接读取编辑器 DOM，所以需要在 HTML 打包前复用一套“导出前静态化”逻辑，而不是把 Mind Elixir 的交互 DOM 原样写入 ZIP。

HTML 导出结果：

- 不包含 Mind Elixir 运行时代码。
- 不保留交互能力。
- 使用 `<img>` 展示导图。
- 样式与 PDF 保持一致：居中、无边框、只缩小不放大。

## 错误处理

- Mind Elixir 初始化失败时，节点显示错误状态，但保留原始数据。
- JSON 解析失败时，显示“思维导图数据无效”，并保留 raw 文本用于序列化。
- 导出图片失败时，导出错误占位块，避免整个 PDF/HTML 导出失败。
- 导出失败应记录 `console.warn`，但不阻断文档其他内容导出。

## 测试计划

### Markdown

- ` ```mindmap ` 能解析为 `mindMap` 节点。
- `mindMap` 节点能稳定序列化回 Markdown。
- 无效 JSON 不丢失原始内容。

### 编辑器结构

- MindMap 节点注册在编辑器扩展中。
- 插入命令存在且插入默认导图。
- 应用入口不直接堆放 Mind Elixir 细节。

### 导出

- PDF 导出会调用思维导图静态化逻辑。
- HTML 导出不会保留 Mind Elixir 交互运行时代码。
- 长导图使用最大宽度和最大高度等比缩放。
- 静态导图居中、无边框、不强制放大。

## 非目标

第一版不实现：

- XMind 文件导入导出。
- 多主题模板管理。
- 云同步或协作编辑。
- 交互式 HTML 导出。
- 从 Markdown 标题或列表自动生成思维导图。
- 独立全屏脑图编辑器。

这些能力可以在第一版稳定后作为后续迭代。

## 风险与缓解

- **Mind Elixir DOM 与 TipTap 事件冲突**：NodeView 使用 `stopEvent` 控制内部交互，类似 Mermaid 控件处理。
- **导出静态图片不稳定**：优先使用 Mind Elixir 官方导出 API，同时保留 SVG/canvas 兜底。
- **长图再次触发 PDF 分页问题**：复用 Mermaid 的宽高双约束尺寸计算，并加入测试。
- **Markdown diff 过大**：JSON 使用稳定缩进输出，避免随机字段顺序或无意义格式变化。
- **依赖体积增加**：Mind Elixir 只在思维导图节点模块中引入，后续可评估动态加载。

## 推荐实施顺序

1. 安装 `mind-elixir` 并添加 MindMap 数据工具。
2. 扩展 Markdown 解析和序列化。
3. 新增 TipTap `mindMap` 节点与 NodeView。
4. 接入菜单、工具栏和命令系统。
5. 添加导出静态化流程，先覆盖 PDF，再覆盖 HTML。
6. 补齐样式和测试。
7. 构建验证并手动检查简单图、复杂长图的 PDF/HTML 导出。
