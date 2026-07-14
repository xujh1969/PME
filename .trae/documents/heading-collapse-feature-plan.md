# 标题折叠功能实现计划

## 概述
为各级标题（h1-h6）添加可折叠/展开能力，折叠状态通过 `<!--collapsed-->` HTML 注释标记持久化到 Markdown 文件，下次打开文件时保持折叠状态。

## 当前状态分析
- 标题由 `src/app.mjs` 的 `DelayedHeading`（继承自 `@tiptap/extension-heading`）提供，关闭了 inputRules，自定义了 Enter 键行为
- 编辑器扩展在 `src/editor/editor-extensions.mjs` 的 `createEditorExtensions` 中注册，通过 `options.delayedHeading.configure({ levels: [1..6] })` 注入
- Markdown 序列化/解析在 `src/core/markdown.mjs`：序列化 L285-L288，解析 L118-L127
- 标题样式在 `src/styles.css` L1154+（`.ProseMirror h1` 等）
- 项目已有 ProseMirror 插件使用模式（DragHandle 扩展）和 Node 属性持久化模式（callout-extension.mjs 的 addAttributes）

## 实现方案

### 文件 1: 新建 `src/editor/heading-collapse.mjs`
创建 ProseMirror 插件，负责：
- `buildDecorations(doc)`：遍历顶级节点
  - 对每个 heading 节点，创建 Widget Decoration（箭头按钮）插入到标题前
  - 对 `collapsed: true` 的标题，计算其折叠范围（从该标题到下一个同级或更高级标题，或文档末尾），为范围内的每个块节点创建 Node Decoration（`style: display:none`）
- 箭头点击处理：通过 `tr.setNodeMarkup(pos, undefined, { ...attrs, collapsed: !attrs.collapsed })` 切换折叠状态
- 导出 `headingCollapsePlugin` 函数和 PluginKey

关键算法（折叠范围）：
```
for each top-level node at position pos:
  if node.type === 'heading' && node.attrs.collapsed:
    level = node.attrs.level
    end = doc.content.size
    # 找下一个同级或更高级标题
    for j from i+1 to topNodes.length-1:
      if topNodes[j].type === 'heading' && topNodes[j].attrs.level <= level:
        end = topNodes[j].pos
        break
    # 隐藏 (pos + node.nodeSize) 到 end 之间的所有节点
```

### 文件 2: 修改 `src/app.mjs`
- 顶部 import：`import { headingCollapsePlugin } from "./editor/heading-collapse.mjs";`
- `DelayedHeading`（L230-L244）增加：
  - `addAttributes()`：添加 `collapsed` 属性（`default: false`，`parseHTML` 读取 `data-collapsed`，`renderHTML` 输出 `data-collapsed="true"` 仅当 true）
  - `addProseMirrorPlugins()`：返回 `[headingCollapsePlugin()]`

### 文件 3: 修改 `src/core/markdown.mjs`
- 序列化（L285-L288）：heading 节点若 `node.attrs.collapsed` 为 true，追加 ` <!--collapsed-->`
- 解析（L118-L127）：正则改为 `/^(#{1,6})\s+(.*?)(\s*<!--collapsed-->)?$/`，若捕获到标记则 `attrs.collapsed: true`，否则 `collapsed: false`

### 文件 4: 修改 `src/styles.css`
在 details 样式后添加：
- `.heading-collapse-toggle`：箭头按钮样式（display:inline-flex, align-items:center, cursor:pointer, background:transparent, border:0, padding:0, min-height:0, color:inherit, font-size:inherit, line-height:inherit, width:1em, margin-right:0.3em）
- `.heading-collapse-toggle.collapsed::before`：content "▶"，折叠状态
- `.heading-collapse-toggle:not(.collapsed)::before`：content "▼"，展开状态
- 标题容器需要 flex 布局让箭头和文字对齐：`.ProseMirror h1, .ProseMirror h2... { position: relative; }` 并通过 Decoration widget 定位

## 验证步骤
1. 创建标题，点击箭头能折叠/展开下方内容
2. 折叠后保存文件，源代码中标题行末尾有 `<!--collapsed-->`
3. 重新打开文件，标题保持折叠状态
4. 不同级别标题嵌套折叠正确（h2 折叠不影响 h1 范围）
5. 箭头与标题文字中线对齐
6. 编辑器其他功能不受影响
