import { Editor } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import { migrateMathStrings } from "@tiptap/extension-mathematics";
import { NodeSelection } from "@tiptap/pm/state";
import { Footnote } from "./core/footnote-extension.mjs";
import { TableOfContents } from "./core/toc-extension.mjs";
import { CustomOrderedList, CustomListItem } from "./core/ordered-list-extension.mjs";
import "katex/dist/katex.min.css";
import { common, createLowlight } from "lowlight";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Columns2,
  Columns3,
  File as FileIcon,
  FileCode,
  FileInput,
  FileText,
  Folder,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link,
  ListChecks,
  List,
  ListOrdered,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Minus,
  Pilcrow,
  Quote,
  Rows2,
  Rows3,
  Save,
  Sigma,
  Palette,
  Highlighter,
  ArrowUpCircle,
  ArrowDownCircle,
  Smile,
  Strikethrough,
  Underline as UnderlineIcon,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Table as TableIcon,
  PanelTop,
  Pencil,
  Trash2,
  Unlink,
  Workflow,
  X,
  createIcons,
} from "lucide";

import {
  createImageAsset,
  getImageFilesFromFileList,
  getImageFilesFromItems,
  getNetworkImageName,
  hasImageFileItem,
  resolveInsertedImageAssetPath,
} from "./core/assets.mjs";
import { isTauriRuntime } from "./core/tauri-workspace.mjs";
import { createWorkspaceAdapter } from "./core/workspace-adapter.mjs";
import { hydrateImagePreviews, parseMarkdown, serializeMarkdown } from "./core/markdown.mjs";
import { parseMarkdownHeadingShortcut } from "./core/markdown-shortcuts.mjs";
import { extractOutline } from "./core/outline.mjs";
import { findTextMatches, isIgnoredSearchElementName } from "./core/search.mjs";
import { getAppShortcutCommand } from "./core/shortcuts.mjs";
import {
  closeOpenTab,
  getNextUntitledPath,
  openTab,
  renameTabPath,
  setTabModified,
} from "./core/tabs.mjs";
import {
  addMarkdownFileSession,
  addUntitledMarkdownSession,
  adoptSavedMarkdownSession,
  canSaveMarkdownPathDirectly,
  createMarkdownFileSession,
  createOpenedWorkspaceSession,
  createStandaloneMarkdownSession,
  openMarkdownDocumentSession,
} from "./core/workspace-session.mjs";
import { readRecentWorkspaces, rememberRecentWorkspace } from "./core/recent-workspaces.mjs";
import { cssEscape, escapeHtml } from "./core/html-utils.mjs";
import {
  getScaledImageWidth,
  normalizeImageScale,
} from "./core/image-size.mjs";
import {
  collectImageNodes,
  isLocalAbsolutePath,
} from "./core/package-resources.mjs";
import { buildPdfExportHtml, sanitizePdfFileName } from "./core/pdf-export.mjs";
import { fileName, getSavedMarkdownWorkspacePath } from "./core/path-utils.mjs";
import { buildMarkdownPackage, getMarkdownPackageFileName } from "./core/markdown-package.mjs";
import { collectLocalMarkdownLinkTargets } from "./core/linked-markdown-package.mjs";
import { loadImageResource } from "./core/image-resource-loader.mjs";
import { hydrateDocumentMapLocalImages, hydrateLocalImagePreviews } from "./core/local-image-preview.mjs";
import {
  getSourceText as getSourceDocumentText,
  renameSourceDraftPath,
} from "./core/source-mode.mjs";
import { normalizeTextAlign } from "./core/text-align.mjs";
import { getDocumentStats } from "./core/document-stats.mjs";
import {
  buildWorkspaceTree,
  createMarkdownFilePath,
  createWorkspaceSnapshot,
  getWorkspacePaths,
  removeWorkspacePath,
  replaceWorkspacePath,
} from "./core/workspace.mjs";
import { insertParagraphAroundSelection } from "./editor/paragraph-actions.mjs";
import { runEditorCommand as runEditorCommandWithContext } from "./editor/editor-command-runner.mjs";
import { getClipboardHtmlImageUrl, getImageIntrinsicWidth } from "./editor/image-input.mjs";
import { createEditorExtensions } from "./editor/editor-extensions.mjs";
import { AlignedTableCell, AlignedTableHeader, AssetImage } from "./editor/custom-nodes.mjs";
import { MermaidDiagram } from "./editor/mermaid-node.mjs";
import {
  SmartCodeBlockLowlight,
} from "./editor/code-block-actions.mjs";
import { openImageInsertModal } from "./ui/image-insert-modal.mjs";
import { openMarkdownLinkModal } from "./ui/markdown-link-modal.mjs";
import { openCodeLanguageModal } from "./ui/code-language-modal.mjs";
import { runAppCommand } from "./ui/app-command-runner.mjs";
import { bindPointerBlockDrag } from "./editor/block-drag-data.mjs";
import { resolveLocalMarkdownLink } from "./editor/document-link.mjs";
import { openPdfExportOptionsModal } from "./ui/pdf-export-modal.mjs";
import {
  blobToDataUrl,
  downloadBlob,
  getPrintableDocumentHtml,
  loadLocalImageResource,
  printPdfHtml,
  waitForMilliseconds,
  waitForNextFrame,
} from "./export/export-runtime.mjs";
import {
  openEmojiPicker,
  openHighlightColorPicker,
  openLinkModal,
  openTextColorPicker,
} from "./ui/editor-popovers.mjs";
import {
  openConfirmModal,
  openImageSizeModal,
  openMessageModal,
  openSaveChangesModal,
  openTableInsertModal,
  openTextEditorModal,
  openTextInputModal,
} from "./ui/modals.mjs";

const initialFiles = [
  "README.md",
  "Design.md",
  "assets/",
  "assets/image001.png",
];
const RECENT_WORKSPACES_KEY = "pme.recentWorkspaces";
const MAX_RECENT_WORKSPACES = 6;

const lucideIcons = {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Bold,
  Highlighter,
  Palette,
  Smile,
  Code,
  Columns2,
  Columns3,
  File: FileIcon,
  FileCode,
  FileInput,
  FileText,
  Folder,
  Heading1,
  Heading2,
  Heading3,
  Image: ImageIcon,
  Italic,
  Link,
  ListChecks,
  List,
  ListOrdered,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Minus,
  Pilcrow,
  Quote,
  Rows2,
  Rows3,
  Save,
  Sigma,
  Strikethrough,
  Table: TableIcon,
  PanelTop,
  Pencil,
  Trash2,
  Unlink,
  Workflow,
  X,
  Underline: UnderlineIcon,
  Superscript: SuperscriptIcon,
  Subscript: SubscriptIcon,
};

const lowlight = createLowlight(common);
const DelayedHeading = Heading.extend({
  addInputRules() {
    return [];
  },

  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() || {};
    return {
      ...parentShortcuts,
      Enter: ({ editor: currentEditor }) => (
        commitCurrentMarkdownHeadingShortcut(currentEditor, { insertParagraph: true }) || false
      ),
    };
  },
});

const state = {
  workspaceName: "",
  screen: "welcome",
  selectedPath: "",
  openTabs: [],
  tree: [],
  files: {},
  documents: {},
  sourceDrafts: {},
  editorMode: "visual",
  searchQuery: "",
  searchMatches: [],
  activeSearchIndex: -1,
  fileHandles: {},
  assetIndex: {},
  rootHandle: null,
  workspaceAdapter: null,
  paths: [],
  collapsedFolders: new Set(["assets"]),
  showSidebar: true,
  showFileTree: false,
  showOutline: true,
  showStatusbar: true,
  editorZoom: 1,
};

const app = document.querySelector("#app");
let editor = null;
let dragDepth = 0;
let isBlockDragInProgress = false;
let blockDragNodePos = -1;
let isMigratingMath = false;
let objectDeselectBound = false;
let menuCloseBound = false;
let globalShortcutsBound = false;
let tableBubbleCloseBound = false;
let lastSelectionBlockPos = null;
let documentLinkPressTabState = null;

render();

function render() {
  destroyEditor();
  app.innerHTML = state.screen === "welcome" ? renderWelcome() : renderShell();
  requestAnimationFrame(() => document.body.classList.remove("is-booting"));
  renderIcons();
  bindEvents();
  mountEditor();
  refreshToolbarState();
  updateFindState(state.searchQuery, true);
}

function renderWelcome() {
  const recentFiles = getRecentWorkspaces();
  return `
    <main class="welcome">
      <section class="welcome-hero">
        <div class="welcome-hero__content">
          <p class="welcome-hero__kicker">Portable Markdown Editor</p>
          <h1>PME</h1>
          <p class="welcome-hero__copy">为长文档、图表、公式和素材而生的本地 Markdown 工作台。</p>
          <div class="welcome-hero__actions">
            <button class="hero-button hero-button--primary" data-action="create-workspace">
              <span>新建文件</span>
            </button>
            <div class="hero-split-action">
              <button class="hero-button hero-button--secondary" data-action="open-markdown-file">
                <span>打开 Markdown</span>
              </button>
              <details class="recent-menu">
                <summary class="hero-arrow-button" aria-label="最近文件">${icon("ChevronDown")}</summary>
                <div class="recent-menu__panel">
                  <strong>最近文件</strong>
                  ${recentFiles.length ? recentFiles.map((workspace, index) => `
                    <button data-recent-workspace="${index}" title="${escapeHtml(workspace.displayPath || workspace.projectName)}">
                      <span>${escapeHtml(workspace.displayName || workspace.projectName)}</span>
                      <small>${escapeHtml(workspace.displayPath || "本地文件")}</small>
                    </button>
                  `).join("") : `<p>暂无最近文件</p>`}
                </div>
              </details>
            </div>
          </div>
        </div>
        <div class="welcome-hero__note">Typora 风格编辑体验，保留 Markdown 的开放文件结构。</div>
      </section>
    </main>
  `;
}

function renderShell() {
  const documentText = getDocumentText();
  const words = documentText.trim().split(/\s+/).filter(Boolean).length;
  const shellClasses = [
    "shell",
    state.showStatusbar ? "" : "shell--status-hidden",
  ].filter(Boolean).join(" ");
  const workspaceClasses = [
    "workspace",
    state.showSidebar ? "" : "workspace--sidebar-hidden",
  ].filter(Boolean).join(" ");

  return `
    <main class="${shellClasses}" style="--editor-zoom: ${state.editorZoom};">
      <header class="menubar">
        <strong>PME</strong>
        ${renderAppMenu()}
        <div class="find-box">
          <input data-find-input aria-label="搜索" placeholder="搜索" value="${escapeHtml(state.searchQuery)}" />
          <span data-find-count>${renderFindCount()}</span>
          <button class="icon-button" data-find-action="prev" title="上一个" aria-label="上一个">${icon("ChevronUp")}</button>
          <button class="icon-button" data-find-action="next" title="下一个" aria-label="下一个">${icon("ChevronDown")}</button>
        </div>
      </header>
      <section class="toolbar" aria-label="编辑工具栏">
        <div class="tool-group">
          <span>文本</span>
          ${toolButton("heading-1", "Heading1", "一级标题")}
          ${toolButton("heading-2", "Heading2", "二级标题")}
          ${toolButton("heading-3", "Heading3", "三级标题")}
          ${toolButton("paragraph", "Pilcrow", "正文")}
        </div>
        <div class="tool-group">
          <span>对齐</span>
          ${toolButton("align-left", "AlignLeft", "左对齐")}
          ${toolButton("align-center", "AlignCenter", "居中对齐")}
          ${toolButton("align-right", "AlignRight", "右对齐")}
          ${toolButton("align-justify", "AlignJustify", "两端对齐")}
        </div>
        <div class="tool-group">
          <span>格式</span>
          ${toolButton("bold", "Bold", "加粗")}
          ${toolButton("italic", "Italic", "斜体")}
          ${toolButton("underline", "Underline", "下划线")}
          ${toolButton("strike", "Strikethrough", "删除线")}
          ${toolButton("text-color", "Palette", "文字颜色")}
          ${toolButton("highlight-color", "Highlighter", "高亮")}
          ${toolButton("superscript", "Superscript", "上标")}
          ${toolButton("subscript", "Subscript", "下标")}
          ${toolButton("link", "Link", editor?.isActive("link") ? "取消链接" : "链接", editor?.isActive("link") || false)}
        </div>
        <div class="tool-group">
          <span>插入</span>
          ${toolButton("bullet-list", "List", "无序列表")}
          ${toolButton("ordered-list", "ListOrdered", "有序列表")}
          ${toolButton("task-list", "ListChecks", "任务列表")}
          ${toolButton("blockquote", "Quote", "引用")}
          ${toolButton("horizontal-rule", "Minus", "分割线")}
          ${toolButton("code-block", "FileCode", "代码块")}
          ${toolButton("code", "Code", "行内代码")}
          ${toolButton("table", "Table", "表格")}
          ${toolButton("image", "Image", "图片")}
          ${toolButton("markdown-link", "FileInput", "插入 Markdown 文件")}
          ${toolButton("formula", "Sigma", "公式")}
          ${toolButton("mermaid", "Workflow", "Mermaid")}
          ${toolButton("emoji", "Smile", "表情")}
          ${toolButton("details", "ChevronDown", "折叠块")}
        </div>
        <button class="icon-button save-button" data-action="save-document" title="保存" aria-label="保存">
          ${icon("Save")}
        </button>
      </section>
      <section class="${workspaceClasses}">
        ${state.showSidebar ? `<aside class="tree">
          ${renderSidebar()}
        </aside>` : ""}
        <section class="editor-area">
          <div class="tabs">${renderTabs()}</div>
          <article class="editor">
            ${renderEditor()}
          </article>
          ${renderTableBubbleToolbar()}
          <div class="drop-overlay">
            <div>
              ${icon("Image")}
              <span>拖入图片，插入图片引用</span>
            </div>
          </div>
        </section>
      </section>
      ${state.showStatusbar ? `<footer class="statusbar">
        <span>${state.selectedPath || "未打开文档"}</span>
        <span>Words: ${words}</span>
        <span>Chars: ${editor?.storage.characterCount?.characters() || documentText.length}</span>
        <span>Chars(no spaces): ${editor?.storage.characterCount?.charactersWithoutSpaces() || documentText.replace(/\s/g, "").length}</span>
        <span>UTF-8</span>
        <span>${state.editorMode === "source" ? "Markdown 源码" : "所见即所得"}</span>
      </footer>` : ""}
    </main>
  `;
}

function renderFindCount() {
  if (!state.searchQuery.trim()) {
    return "";
  }
  if (!state.searchMatches.length) {
    return "0/0";
  }
  return `${state.activeSearchIndex + 1}/${state.searchMatches.length}`;
}

function renderAppMenu() {
  const menus = [
    ["文件", [
      menuItem("new-markdown-file", "新建文件", "Ctrl+N"),
      menuSeparator(),
      menuItem("open-markdown-file", "打开文件", "Ctrl+O"),
      menuSeparator(),
      menuItem("save-document", "保存", "Ctrl+S"),
      menuItem("save-as-document", "另存为", "Ctrl+Shift+S"),
      menuSeparator(),
      menuItem("package-document", "打包当前文档"),
      menuItem("export-pdf", "导出 PDF"),
    ]],
    ["编辑", [
      menuItem("undo", "撤销", "Ctrl+Z"),
      menuItem("redo", "重做", "Ctrl+Y"),
      menuSeparator(),
      menuItem("cut", "剪切", "Ctrl+X"),
      menuItem("copy", "复制", "Ctrl+C"),
      menuItem("paste", "粘贴", "Ctrl+V"),
      menuSeparator(),
      menuItem("select-all", "全选", "Ctrl+A"),
      menuItem("focus-search", "查找", "Ctrl+F"),
    ]],
    ["段落", [
      menuItem("paragraph", "正文", "Ctrl+0"),
      menuSeparator(),
      menuSubmenu("标题", [
        menuItem("heading-1", "一级标题", "Ctrl+1"),
        menuItem("heading-2", "二级标题", "Ctrl+2"),
        menuItem("heading-3", "三级标题", "Ctrl+3"),
        menuItem("heading-4", "四级标题", "Ctrl+4"),
        menuItem("heading-5", "五级标题", "Ctrl+5"),
        menuItem("heading-6", "六级标题", "Ctrl+6"),
        menuSeparator(),
        menuItem("heading-up", "提升标题级别", "Ctrl+="),
        menuItem("heading-down", "降低标题级别", "Ctrl+-"),
      ]),
      menuSubmenu("对齐", [
        menuItem("align-left", "左对齐"),
        menuItem("align-center", "居中对齐"),
        menuItem("align-right", "右对齐"),
        menuItem("align-justify", "两端对齐"),
      ]),
      menuSubmenu("列表", [
        menuSubmenu("有序列表", [
          menuItem("ordered-list", "数字编号"),
          menuItem("ordered-list-roman", "罗马数字"),
          menuItem("ordered-list-alpha", "小写字母"),
          menuItem("ordered-list-alpha-upper", "大写字母"),
        ]),
        menuItem("bullet-list", "无序列表"),
        menuItem("task-list", "任务列表"),
      ]),
      menuItem("blockquote", "引用"),
      menuSubmenu("缩进", [
        menuItem("indent-more", "增加缩进", "Ctrl+]"),
        menuItem("indent-less", "减少缩进", "Ctrl+["),
      ]),
      menuSeparator(),
      menuItem("insert-paragraph-above", "在上方插入段落"),
      menuItem("insert-paragraph-below", "在下方插入段落"),
      menuItem("footnote", "脚注"),
      menuItem("table-of-contents", "内容目录"),
    ]],
    ["格式", [
      menuItem("bold", "加粗", "Ctrl+B"),
      menuItem("italic", "斜体", "Ctrl+I"),
      menuItem("underline", "下划线", "Ctrl+U"),
      menuItem("strike", "删除线", "Ctrl+Shift+5"),
      menuItem("code", "行内代码"),
      menuSeparator(),
      menuItem("text-color", "文字颜色", "Ctrl+Shift+C"),
      menuItem("highlight-color", "背景高亮", "Ctrl+Shift+H"),
      menuItem("superscript", "上标", "Ctrl+Shift+Alt++"),
      menuItem("subscript", "下标", "Ctrl+Shift+Alt+-"),
      menuSeparator(),
      menuItem("link", "超链接", "Ctrl+K", editor?.isActive("link") || false),
      menuSeparator(),
      menuItem("clear-format", "清除格式", "Ctrl+\\"),
    ]],
    ["插入", [
      menuItem("link", "链接"),
      menuItem("image", "图片"),
      menuItem("markdown-link", "Markdown 文件"),
      menuItem("table", "表格"),
      menuItem("formula", "公式"),
      menuItem("mermaid", "Mermaid"),
      menuItem("code-block", "代码块"),
      menuItem("details", "折叠详情块"),
      menuItem("horizontal-rule", "分割线"),
      menuItem("task-list", "任务列表"),
    ]],
    ["视图", [
      menuItem("toggle-sidebar", "显示侧边栏", null, state.showSidebar),
      menuItem("toggle-outline", "显示大纲", null, state.showOutline),
      menuItem("toggle-file-tree", "显示文件列表", null, state.showFileTree),
      menuItem("focus-search", "搜索", "Ctrl+F"),
      menuSeparator(),
      menuItem("source-view", "源码模式", null, state.editorMode === "source"),
      menuSeparator(),
      menuItem("toggle-statusbar", "显示状态栏", null, state.showStatusbar),
      menuSeparator(),
      menuItem("zoom-reset", "实际大小", "Ctrl+Shift+9", state.editorZoom === 1),
      menuItem("zoom-in", "放大", "Ctrl+Shift+="),
      menuItem("zoom-out", "缩小", "Ctrl+Shift+-"),
    ]],
    ["帮助", [
      menuItem("about", "关于 PME"),
    ]],
  ];

  return `
    <nav class="app-menu" aria-label="应用菜单">
      ${menus.map(([label, items]) => `
        <div class="app-menu__item">
          <button type="button" data-menu-button>${label}</button>
          <div class="app-menu__panel">
            ${items.map(renderMenuEntry).join("")}
          </div>
        </div>
      `).join("")}
    </nav>
  `;
}

function menuItem(command, label, shortcut = "", checked = false) {
  return { command, label, shortcut, checked };
}

function menuSubmenu(label, items) {
  return { label, items, submenu: true };
}

function menuSeparator() {
  return { separator: true };
}

function renderMenuEntry(item) {
  if (item.separator) {
    return `<hr />`;
  }

  if (item.submenu) {
    return `
      <div class="app-menu__submenu">
        <button type="button" class="app-menu__submenu-trigger">
          <span class="app-menu__check"></span>
          <span class="app-menu__label">${escapeHtml(item.label)}</span>
          <span class="app-menu__arrow">›</span>
        </button>
        <div class="app-menu__submenu-panel">
          ${item.items.map(renderMenuEntry).join("")}
        </div>
      </div>
    `;
  }

  return `
    <button type="button" data-menu-command="${item.command}" class="${item.checked ? "is-checked" : ""}">
      <span class="app-menu__check">${item.checked ? "✓" : ""}</span>
      <span class="app-menu__label">${escapeHtml(item.label)}</span>
      ${item.shortcut ? `<span class="app-menu__shortcut">${escapeHtml(item.shortcut)}</span>` : ""}
    </button>
  `;
}

function toolButton(command, iconName, label) {
  return `
    <button class="icon-button" data-command="${command}" title="${label}" aria-label="${label}">
      ${icon(iconName)}
    </button>
  `;
}

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function renderTableBubbleToolbar() {
  return `
    <div class="table-bubble" data-table-bubble aria-label="表格工具">
      <div class="table-bubble__main">
        <div class="table-bubble__group">
          ${tableBubbleButton("table-align-left", "AlignLeft", "左对齐")}
          ${tableBubbleButton("table-align-center", "AlignCenter", "居中对齐")}
          ${tableBubbleButton("table-align-right", "AlignRight", "右对齐")}
        </div>
        <div class="table-bubble__group">
          <button class="icon-button table-bubble__more" data-table-more title="更多操作" aria-label="更多操作">
            ${icon("MoreVertical")}
          </button>
          ${tableBubbleButton("table-delete", "Trash2", "删除表格")}
        </div>
      </div>
      <div class="table-bubble__menu" data-table-menu>
        <button data-command="table-row-before">上方插入行</button>
        <button data-command="table-row-after">下方插入行</button>
        <button data-command="table-column-before">左侧插入列</button>
        <button data-command="table-column-after">右侧插入列</button>
        <hr />
        <button data-command="table-merge-cells">合并单元格</button>
        <button data-command="table-split-cell">拆分单元格</button>
        <hr />
        <button data-command="table-delete-row">删除行</button>
        <button data-command="table-delete-column">删除列</button>
        <button data-command="table-toggle-header">切换表头</button>
      </div>
    </div>
  `;
}

function tableBubbleButton(command, iconName, label) {
  return `
    <button class="icon-button" data-command="${command}" title="${label}" aria-label="${label}">
      ${icon(iconName)}
    </button>
  `;
}

function renderSidebar() {
  return `
    ${state.showFileTree ? `<section class="file-tree-section">
      <div class="tree__title">FILES</div>
      ${renderTree(state.tree)}
    </section>` : ""}
    ${state.showOutline ? `<section class="outline-section">
      <div class="tree__title">OUTLINE</div>
      ${renderOutline()}
    </section>` : ""}
  `;
}

function renderTree(nodes) {
  if (!nodes.length) {
    return "";
  }

  const items = nodes.map((node) => {
    const isFolder = node.type === "folder";
    const isCollapsed = isFolder && state.collapsedFolders.has(node.path);
    const childTree = isFolder && !isCollapsed ? renderTree(node.children || []) : "";
    return `
      <li>
        <div class="tree-row ${isFolder ? "tree-row--folder" : ""}">
          <button class="tree-item" data-path="${node.path}" data-type="${node.type}" title="${node.path}">
            <span class="tree-icon">${icon(fileIcon(node.type))}</span>
            <span>${node.name}</span>
          </button>
          ${node.type === "markdown" ? `
            <button class="tree-file-action icon-button" data-file-action="rename" data-path="${node.path}" title="重命名" aria-label="重命名 ${escapeHtml(node.name)}">
              ${icon("Pencil")}
            </button>
            <button class="tree-file-action icon-button" data-file-action="delete" data-path="${node.path}" title="删除" aria-label="删除 ${escapeHtml(node.name)}">
              ${icon("Trash2")}
            </button>
          ` : ""}
        </div>
        ${childTree}
      </li>
    `;
  }).join("");

  return `<ul>${items}</ul>`;
}

function renderOutline() {
  const outline = getCurrentOutline();
  if (!outline.length) {
    return "";
  }

  return `
    <ol class="outline-list">
      ${outline.map((item) => `
        <li>
          <button class="outline-item outline-item--level-${Math.min(item.level, 6)}" data-outline-index="${item.index}" title="${escapeHtml(item.text)}">
            ${escapeHtml(item.text)}
          </button>
        </li>
      `).join("")}
    </ol>
  `;
}

function renderTabs() {
  if (!state.openTabs.length) {
    return `<span class="tab tab--empty">没有打开的文档</span>`;
  }

  return state.openTabs.map((tab) => `
    <div class="tab ${tab.path === state.selectedPath ? "tab--active" : ""}">
      <button class="tab__select" data-tab="${tab.path}" title="${tab.path}">
        ${icon("FileText")}
        <span class="tab__label">${tab.name}${tab.modified ? " *" : ""}</span>
      </button>
      <button class="tab__close icon-button" data-tab-close="${tab.path}" title="关闭" aria-label="关闭 ${escapeHtml(tab.name)}">
        ${icon("X")}
      </button>
    </div>
  `).join("");
}

function renderEditor() {
  if (!state.selectedPath) {
    return `
      <div class="empty-editor">
        <h2>欢迎使用 PME Markdown 编辑器</h2>
        <p>支持 Markdown、Workspace 文件树和多文档标签页。</p>
      </div>
    `;
  }

  if (state.editorMode === "source") {
    return `
      <div class="source-document">
        <textarea class="source-editor" spellcheck="false">${escapeHtml(getSourceText(state.selectedPath))}</textarea>
      </div>
    `;
  }

  return `
    <div class="document">
      <div id="tiptapEditor" class="tiptap-editor"></div>
      <div id="bubble-menu" class="bubble-menu"></div>
    </div>
  `;
}

function bindEvents() {
  bindGlobalObjectDeselect();
  bindGlobalShortcuts();
  bindMenuEvents();
  document.querySelector("[data-action='create-workspace']")?.addEventListener("click", createStandaloneMarkdownDocument);
  document.querySelector("[data-action='open-markdown-file']")?.addEventListener("click", openMarkdownFile);
  document.querySelectorAll("[data-recent-workspace]").forEach((button) => {
    button.addEventListener("click", () => openRecentWorkspace(Number(button.dataset.recentWorkspace)));
  });
  document.querySelector("[data-action='save-document']")?.addEventListener("click", handleSaveDocumentRequest);
  document.querySelector("[data-find-input]")?.addEventListener("input", handleFindInput);
  document.querySelector("[data-find-input]")?.addEventListener("keydown", handleFindKeydown);
  document.querySelectorAll("[data-find-action]").forEach((button) => {
    button.addEventListener("click", () => navigateFindResult(button.dataset.findAction === "prev" ? -1 : 1));
  });
  document.querySelector(".editor-area")?.addEventListener("dragenter", handleDragEnter);
  document.querySelector(".editor-area")?.addEventListener("dragover", handleDragOver);
  document.querySelector(".editor-area")?.addEventListener("dragleave", handleDragLeave);
  document.querySelector(".editor-area")?.addEventListener("drop", handleDrop);
  document.querySelector(".editor-area")?.addEventListener("paste", handlePaste, { capture: true });
  document.querySelector(".editor")?.addEventListener("scroll", () => updateTableBubbleToolbar());
  document.querySelector(".source-editor")?.addEventListener("input", handleSourceInput);
  document.querySelector("#tiptapEditor")?.addEventListener("click", handleMathClick, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("click", handleMermaidClick, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("click", handleImageClick, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("dblclick", handleMathDoubleClick, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("dblclick", handleMermaidDoubleClick, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("dblclick", handleImageDoubleClick, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("dblclick", handleCodeBlockDoubleClick, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("keydown", handleObjectKeydown, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("change", handleCodeBlockLanguageChange, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("click", handleCodeBlockCopy, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("mousedown", handleDocumentLinkPress, { capture: true });
  document.querySelector("#tiptapEditor")?.addEventListener("click", handleDocumentLinkClick, { capture: true });
  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", () => {
      runEditorCommand(button.dataset.command);
      if (button.closest("[data-table-bubble]")) {
        closeTableBubbleMenu();
        requestAnimationFrame(() => updateTableBubbleToolbar());
      }
    });
  });
  bindTableBubbleEvents();

  bindSidebarEvents();

  document.querySelectorAll("[data-tab-close]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      closeDocumentTab(button.dataset.tabClose);
    });
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPath = button.dataset.tab;
      render();
    });
  });
}

function bindTableBubbleEvents() {
  const bubble = document.querySelector("[data-table-bubble]");
  if (!bubble) {
    return;
  }
  if (!tableBubbleCloseBound) {
    document.addEventListener("click", closeTableBubbleMenu);
    tableBubbleCloseBound = true;
  }
  bubble.addEventListener("mousedown", (event) => event.preventDefault());
  bubble.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest("[data-table-more]")) {
      bubble.classList.toggle("is-menu-open");
    }
  });
}

function bindMenuEvents() {
  if (!menuCloseBound) {
    document.addEventListener("click", closeAppMenus);
    menuCloseBound = true;
  }

  document.querySelectorAll("[data-menu-button]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const item = button.closest(".app-menu__item");
      const shouldOpen = !item.classList.contains("is-open");
      closeAppMenus();
      item.classList.toggle("is-open", shouldOpen);
    });
  });

  document.querySelectorAll("[data-menu-command]").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      closeAppMenus();
      runMenuCommand(button.dataset.menuCommand);
    });
  });
}

function bindGlobalShortcuts() {
  if (globalShortcutsBound) {
    return;
  }

  document.addEventListener("keydown", (event) => {
    const command = getAppShortcutCommand(event);
    if (!command || state.screen !== "shell") {
      return;
    }

    event.preventDefault();
    closeAppMenus();
    runMenuCommand(command);
  });
  globalShortcutsBound = true;
}

function closeAppMenus() {
  document.querySelectorAll(".app-menu__item.is-open").forEach((item) => {
    item.classList.remove("is-open");
  });
}

async function runMenuCommand(command) {
  try {
    await runAppCommand(command, {
      state,
      editor,
      document,
      createStandaloneMarkdownDocument,
      openMarkdownFile,
      saveDocument,
      saveAsDocument,
      packageCurrentDocument,
      openPdfExportModal,
      closeDocumentTab,
      runClipboardMenuCommand,
      selectCurrentDocument,
      render,
      setEditorZoom,
      openMessageModal,
      runEditorCommand,
    });
  } catch (error) {
    console.error(error);
    await openMessageModal({
      title: "操作失败",
      message: error?.message || "命令执行失败，请稍后重试。",
    });
  }
}

async function handleSaveDocumentRequest() {
  try {
    await saveDocument();
  } catch (error) {
    console.error(error);
    await openMessageModal({
      title: "保存失败",
      message: error?.message || "无法保存当前 Markdown 文件。",
    });
  }
}

function getLocalMarkdownLinkPathFromEvent(event) {
  const anchor = event.target.closest?.("a[href]");
  if (!anchor) return "";
  return resolveLocalMarkdownLink(anchor.getAttribute("href"), getSelectedDocumentAbsolutePath()) || "";
}

function claimDocumentLinkEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function claimDocumentLinkPressEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function runClipboardMenuCommand(command) {
  focusCurrentEditable();
  const succeeded = document.execCommand?.(command);
  if (!succeeded && command === "paste") {
    openMessageModal({
      title: "无法粘贴",
      message: "浏览器限制了菜单粘贴操作，请使用 Ctrl+V 粘贴内容。",
    });
  }
}

function selectCurrentDocument() {
  const sourceEditor = document.querySelector(".source-editor");
  if (sourceEditor) {
    sourceEditor.focus();
    sourceEditor.select();
    return;
  }
  editor?.chain().focus().selectAll().run();
}

function focusCurrentEditable() {
  const sourceEditor = document.querySelector(".source-editor");
  if (sourceEditor) {
    sourceEditor.focus();
    return;
  }
  editor?.chain().focus().run();
}

function setEditorZoom(value) {
  state.editorZoom = Math.min(1.6, Math.max(0.7, Number(value.toFixed(2))));
  render();
}

function handleSourceInput(event) {
  if (!state.selectedPath) {
    return;
  }

  state.sourceDrafts[state.selectedPath] = event.target.value;
  markSelectedTabModified(true);
  refreshEditorMetadata();
  refreshOutlineView();
  updateFindState(state.searchQuery, true);
}

function getSourceText(path) {
  return getSourceDocumentText(path, {
    documents: state.documents,
    sourceDrafts: state.sourceDrafts,
  });
}

async function toggleSourceView() {
  if (!state.selectedPath) {
    return;
  }

  if (state.editorMode === "source") {
    const markdown = getSourceText(state.selectedPath);
    const parsed = hydrateImagePreviews(parseMarkdown(markdown), state.files, {
      basePath: state.selectedPath,
    });
    state.documents[state.selectedPath] = isTauriRuntime()
      ? await hydrateLocalImagePreviews(parsed, loadLocalImageResource)
      : parsed;
    state.editorMode = "visual";
    render();
    return;
  }

  if (editor) {
    state.documents[state.selectedPath] = editor.getJSON();
  }
  const currentDoc = getCurrentDocument();
  const serialized = serializeMarkdown(currentDoc, {
    basePath: state.selectedPath,
  });
  state.sourceDrafts[state.selectedPath] = serialized;
  state.editorMode = "source";
  render();
}

async function handleDocumentLinkClick(event) {
  console.log("DEBUG: handleDocumentLinkClick fired");
  const anchor = event.target.closest?.("a[href]");
  console.log("DEBUG: anchor:", anchor);
  console.log("DEBUG: anchor href:", anchor?.getAttribute("href"));
  
  const currentPath = getSelectedDocumentAbsolutePath();
  console.log("DEBUG: current document path:", currentPath);
  
  const path = getLocalMarkdownLinkPathFromEvent(event);
  console.log("DEBUG: resolved path:", path);

  if (anchor) {
    claimDocumentLinkEvent(event);
  }

  if (!path) return;

  restoreDocumentLinkPressTabState();
  if (state.openTabs.some((tab) => tab.path === path)) {
    state.selectedPath = path;
    render();
    return;
  }

  const adapter = state.workspaceAdapter || createWorkspaceAdapter();
  try {
    const markdown = await adapter.readTextFilePath(path);
    const parsed = parseMarkdown(markdown);
    state.files[path] = markdown;
    state.documents[path] = isTauriRuntime()
      ? await hydrateLocalImagePreviews(parsed, loadLocalImageResource)
      : parsed;
    state.paths = [...new Set([...state.paths, path])];
    state.openTabs.push({ name: fileName(path), path, modified: false });
    state.selectedPath = path;
    render();
  } catch {
    await openMessageModal({ title: "无法打开链接", message: "无法读取 Markdown 文件：\n" + path });
  }
}

function handleDocumentLinkPress(event) {
  const anchor = event.target.closest?.("a[href]");
  const path = getLocalMarkdownLinkPathFromEvent(event);

  if (!path) return;
  
  if (anchor) {
    claimDocumentLinkPressEvent(event);
  }
  
  rememberDocumentLinkPressTabState();
}

function rememberDocumentLinkPressTabState() {
  const tab = state.openTabs.find((item) => item.path === state.selectedPath);
  documentLinkPressTabState = tab
    ? { path: tab.path, modified: tab.modified }
    : null;
}

function restoreDocumentLinkPressTabState() {
  if (!documentLinkPressTabState) return;
  const { path, modified } = documentLinkPressTabState;
  state.openTabs = setTabModified(state.openTabs, path, modified);
  documentLinkPressTabState = null;
}

function handleFindInput(event) {
  updateFindState(event.target.value);
}

function handleFindKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  navigateFindResult(event.shiftKey ? -1 : 1);
}

function updateFindState(query, keepActive = false) {
  state.searchQuery = query;
  state.searchMatches = findTextMatches(getSearchText(), query);
  if (!state.searchMatches.length) {
    state.activeSearchIndex = -1;
  } else if (!keepActive || state.activeSearchIndex < 0) {
    state.activeSearchIndex = 0;
  } else {
    state.activeSearchIndex = Math.min(state.activeSearchIndex, state.searchMatches.length - 1);
  }
  updateFindCount();
  applyFindHighlights();
}

function navigateFindResult(direction) {
  if (!state.searchMatches.length) {
    return;
  }

  state.activeSearchIndex = (
    state.activeSearchIndex + direction + state.searchMatches.length
  ) % state.searchMatches.length;
  updateFindCount();
  applyFindHighlights();
}

function updateFindCount() {
  const count = document.querySelector("[data-find-count]");
  if (count) {
    count.textContent = renderFindCount();
  }
}

function getSearchText() {
  const sourceEditor = document.querySelector(".source-editor");
  if (sourceEditor) {
    return sourceEditor.value;
  }

  const editorRoot = document.querySelector("#tiptapEditor .ProseMirror");
  if (!editorRoot) {
    return "";
  }
  return collectSearchText(editorRoot).text;
}

function applyFindHighlights() {
  clearFindHighlights();
  if (!state.searchMatches.length) {
    return;
  }

  const sourceEditor = document.querySelector(".source-editor");
  if (sourceEditor) {
    selectSourceMatch(sourceEditor);
    return;
  }

  const editorRoot = document.querySelector("#tiptapEditor .ProseMirror");
  if (!editorRoot || !("Highlight" in window) || !CSS.highlights) {
    return;
  }

  ensureFindHighlightStyles();
  const { textNodes } = collectSearchText(editorRoot);
  const ranges = state.searchMatches
    .map((match) => createRangeFromTextOffsets(textNodes, match.from, match.to))
    .filter(Boolean);
  const activeRange = ranges[state.activeSearchIndex];

  if (ranges.length) {
    CSS.highlights.set("pme-find", new Highlight(...ranges));
  }
  if (activeRange) {
    CSS.highlights.set("pme-find-active", new Highlight(activeRange));
    scrollRangeIntoView(activeRange);
  }
}

function ensureFindHighlightStyles() {
  if (document.querySelector("#pme-find-highlight-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "pme-find-highlight-styles";
  style.textContent = `
    ::highlight(pme-find) {
      background: rgba(255, 213, 102, 0.52);
    }
    ::highlight(pme-find-active) {
      background: rgba(255, 172, 64, 0.72);
    }
  `;
  document.head.appendChild(style);
}

function clearFindHighlights() {
  if (CSS.highlights) {
    CSS.highlights.delete("pme-find");
    CSS.highlights.delete("pme-find-active");
  }
}

function collectSearchText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (
      node.nodeValue.trim() && isSearchableTextNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    ),
  });
  const textNodes = [];
  let text = "";
  let node = walker.nextNode();

  while (node) {
    textNodes.push({ node, start: text.length, end: text.length + node.nodeValue.length });
    text += node.nodeValue;
    node = walker.nextNode();
  }

  return { text, textNodes };
}

function isSearchableTextNode(node) {
  const parent = node.parentElement;
  if (!parent) {
    return false;
  }

  if (parent.closest("[aria-hidden='true'], .mermaid-diagram__controls")) {
    return false;
  }

  for (let element = parent; element; element = element.parentElement) {
    if (isIgnoredSearchElementName(element.localName || element.tagName)) {
      return false;
    }
  }

  return true;
}

function createRangeFromTextOffsets(textNodes, from, to) {
  const start = textNodes.find((item) => from >= item.start && from < item.end);
  const end = textNodes.find((item) => to > item.start && to <= item.end);
  if (!start || !end) {
    return null;
  }

  const range = document.createRange();
  range.setStart(start.node, from - start.start);
  range.setEnd(end.node, to - end.start);
  return range;
}

function scrollRangeIntoView(range) {
  const element = range.startContainer.parentElement;
  element?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
}

function selectSourceMatch(sourceEditor) {
  const match = state.searchMatches[state.activeSearchIndex];
  if (!match) {
    return;
  }

  sourceEditor.focus();
  sourceEditor.setSelectionRange(match.from, match.to);
}

function bindGlobalObjectDeselect() {
  if (objectDeselectBound) {
    return;
  }

  document.addEventListener("pointerdown", handleGlobalObjectDeselect, { capture: true });
  objectDeselectBound = true;
}

function handleGlobalObjectDeselect(event) {
  if (!editor || event.target.closest?.(".text-modal, .app-menu, .bubble-menu, [data-table-bubble], .drag-handle")) {
    return;
  }

  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || !isEditableObjectNode(selection.node)) {
    return;
  }

  if (isObjectInteractionTarget(event.target)) {
    return;
  }

  clearObjectSelection(selection.from);
}

function isObjectInteractionTarget(target) {
  return Boolean(target.closest?.([
    ".ProseMirror-selectednode",
    ".tiptap-mathematics-render",
    ".mermaid-diagram",
    ".mermaid-diagram__controls",
    "#tiptapEditor .ProseMirror img",
  ].join(",")));
}

function clearObjectSelection() {
  const { state, view } = editor;
  view.dispatch(state.tr.setSelection(TextSelection.atEnd(state.doc)));
}

async function createWorkspace(options = {}) {
  const name = options.name || "MyProject";
  const adapter = options.adapter || createWorkspaceAdapter();

  try {
    const workspace = await adapter.createWorkspace(name, { parentPath: options.parentPath });
    if (workspace) {
      openWorkspace(
        workspace.projectName,
        getWorkspacePaths(workspace.files, workspace.paths),
        workspace.files,
        adapter,
        workspace.assetIndex,
        workspace.selectedPath,
      );
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    console.error(error);
    if (adapter.canPersist) {
      await openMessageModal({ title: "创建失败", message: "无法创建项目，请检查目录权限后重试。" });
      return;
    }
  }
  if (adapter.canPersist) {
    return;
  }

  const snapshot = createWorkspaceSnapshot(name);
  const files = {
    ...snapshot.files,
    "Design.md": "# Design\n\nDocument your system here.\n",
  };
  const paths = getWorkspacePaths(files, initialFiles);
  openWorkspace(name, paths, files);
}

function createStandaloneMarkdownDocument() {
  if (state.screen === "shell" && state.selectedPath && state.openTabs.length > 0) {
    addNewUntitledTab();
    return;
  }

  const path = "Untitled.md";
  const markdown = "# Untitled\n\n";
  Object.assign(state, createStandaloneMarkdownSession({ path, markdown, parseMarkdown }));
  state.workspaceAdapter = createWorkspaceAdapter();
  render();
}

function addNewUntitledTab() {
  addUntitledMarkdownSession(state, { getNextUntitledPath, parseMarkdown });
  render();
}

async function openRecentWorkspace(index) {
  const recentWorkspace = getRecentWorkspaces()[index];
  if (!recentWorkspace) {
    return;
  }

  const adapter = createWorkspaceAdapter();
  try {
    const workspace = recentWorkspace.kind === "tauri-file"
      ? await adapter.openRecentMarkdownFile?.(recentWorkspace)
      : await adapter.openRecentWorkspace(recentWorkspace);
    if (workspace) {
      openWorkspace(
        workspace.projectName,
        getWorkspacePaths(workspace.files, workspace.paths),
        workspace.files,
        adapter,
        workspace.assetIndex,
        workspace.selectedPath,
      );
      return;
    }
    await openMessageModal({
      title: "无法直接打开",
      message: "浏览器版无法记住真实文件路径，请点击打开 Markdown 重新选择文件。",
    });
  } catch (error) {
    console.error(error);
    await openMessageModal({
      title: "打开失败",
      message: "最近文件可能已经移动或删除，请重新选择 Markdown 文件。",
    });
  }
}

function openSampleWorkspace() {
  const snapshot = createWorkspaceSnapshot("MyProject");
  openWorkspace("MyProject", initialFiles, {
    "README.md": "# MyProject\n\nStart writing with PME.\n\n- Workspace\n- Markdown\n",
    "Design.md": "# Design\n\n> Keep files portable\n\n![Architecture](assets/image001.png)\n",
  });
}

async function openFolder() {
  const adapter = createWorkspaceAdapter();

  try {
    const workspace = await adapter.openWorkspace();
    if (workspace) {
      openWorkspace(
        workspace.projectName,
        getWorkspacePaths(workspace.files, workspace.paths),
        workspace.files,
        adapter,
        workspace.assetIndex,
        workspace.selectedPath,
      );
      return;
    }
    if (adapter.canPersist) {
      return;
    }
    openSampleWorkspace();
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
    }
  }
}

async function openMarkdownFile() {
  const adapter = createWorkspaceAdapter();
  try {
    const workspace = await adapter.openMarkdownFile();
    if (!workspace) {
      return;
    }
    if (state.screen === "shell" && state.selectedPath && state.openTabs.length > 0) {
      await addMarkdownFileToWorkspace(workspace, adapter);
    } else {
      openWorkspace(
        workspace.projectName,
        getWorkspacePaths(workspace.files, workspace.paths),
        workspace.files,
        adapter,
        workspace.assetIndex,
        workspace.selectedPath,
      );
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      await openMessageModal({ title: "打开失败", message: "无法打开 Markdown 文件。" });
    }
  }
}

async function addMarkdownFileToWorkspace(workspace, adapter) {
  const added = await addMarkdownFileSession(state, workspace, {
    adapter,
    parseMarkdown,
    hydrateImagePreviews,
    hydrateDocument: isTauriRuntime() ? (doc) => hydrateLocalImagePreviews(doc, loadLocalImageResource) : null,
    buildWorkspaceTree,
    fileName,
  });
  if (!added) {
    return;
  }
  rememberWorkspace(adapter?.getWorkspaceInfo?.());
  render();
}

async function createMarkdownDocument() {
  if (state.screen !== "shell") {
    return;
  }

  const fileName = await openTextInputModal({
    title: "鏂板缓 Markdown",
    label: "文件名",
    value: "Untitled.md",
    placeholder: "Notes.md",
  });
  if (fileName === null) {
    return;
  }

  const path = createMarkdownFilePath(fileName);
  if (!path) {
    await openMessageModal({ title: "文件名无效", message: "请不要使用路径或特殊字符。" });
    return;
  }
  if (state.files[path] !== undefined) {
    await openMessageModal({ title: "无法创建", message: "已存在同名文件。" });
    return;
  }

  const { markdown } = createMarkdownFileSession(state, path, {
    parseMarkdown,
    getWorkspacePaths,
    buildWorkspaceTree,
  });
  if (state.workspaceAdapter?.canPersist) {
    await state.workspaceAdapter.writeTextFile(path, markdown);
  }
  openDocument(path);
}

async function saveAsDocument() {
  if (!state.selectedPath) {
    await openMessageModal({ title: "无法保存", message: "请先打开一个 Markdown 文件。" });
    return;
  }

  syncSelectedDocumentToState();
  const savedPath = await saveTextExport(fileName(state.selectedPath), state.files[state.selectedPath]);
  if (!savedPath) {
    return;
  }
  adoptSavedMarkdownPath(savedPath);
  render();
}

function syncSelectedDocumentToState() {
  if (!state.selectedPath) {
    return;
  }

  if (state.editorMode === "source") {
    state.files[state.selectedPath] = getSourceText(state.selectedPath);
    state.documents[state.selectedPath] = hydrateImagePreviews(parseMarkdown(state.files[state.selectedPath]), state.files, {
      basePath: state.selectedPath,
    });
  } else if (editor) {
    state.documents[state.selectedPath] = editor.getJSON();
    state.files[state.selectedPath] = serializeMarkdown(getCurrentDocument(), {
      basePath: state.selectedPath,
    });
  }
}

async function openWorkspace(projectName, paths, files, workspaceAdapter = null, assetIndex = {}, selectedPath = "") {
  Object.assign(state, createOpenedWorkspaceSession({
    projectName,
    paths,
    files,
    workspaceAdapter,
    assetIndex,
    selectedPath,
    parseMarkdown,
    hydrateImagePreviews,
    buildWorkspaceTree,
    fileName,
  }));
  if (isTauriRuntime()) {
    state.documents = await hydrateDocumentMapLocalImages(state.documents, loadLocalImageResource);
  }
  rememberWorkspace(workspaceAdapter?.getWorkspaceInfo?.());
  render();
}

function getRecentWorkspaces() {
  return readRecentWorkspaces(localStorage, RECENT_WORKSPACES_KEY, MAX_RECENT_WORKSPACES);
}

function rememberWorkspace(workspaceInfo) {
  rememberRecentWorkspace(localStorage, RECENT_WORKSPACES_KEY, workspaceInfo, MAX_RECENT_WORKSPACES);
}

function openDocument(path) {
  openMarkdownDocumentSession(state, path, {
    openTab,
    parseMarkdown,
    hydrateImagePreviews,
    fileName,
  });
  render();
}

async function closeDocumentTab(path) {
  console.log("DEBUG: closeDocumentTab called for path", path);
  const tab = state.openTabs.find((item) => item.path === path);
  console.log("DEBUG: found tab", tab);
  console.log("DEBUG: tab.modified", tab?.modified);
  if (!tab) {
    return;
  }
  if (tab.modified && !await openConfirmModal({
    title: "关闭标签页",
    message: `“${tab.name}”尚未保存，确定关闭这个标签页吗？`,
    confirmLabel: "关闭",
  })) {
    return;
  }

  if (state.selectedPath === path) {
    syncSelectedDocumentToState();
  }

  const result = closeOpenTab(state.openTabs, state.selectedPath, path);
  state.openTabs = result.openTabs;
  state.selectedPath = result.selectedPath;
  render();
}

async function saveDocument() {
  if (!state.selectedPath) {
    return;
  }

  syncSelectedDocumentToState();
  if (isLocalAbsolutePath(state.selectedPath) && state.workspaceAdapter?.writeTextFilePath) {
    await state.workspaceAdapter.writeTextFilePath(state.selectedPath, state.files[state.selectedPath]);
  } else if (canSaveSelectedPathDirectly()) {
    await state.workspaceAdapter.writeTextFile(state.selectedPath, state.files[state.selectedPath]);
  } else {
    const savedPath = await saveTextExport(fileName(state.selectedPath), state.files[state.selectedPath]);
    if (!savedPath) {
      return;
    }
    adoptSavedMarkdownPath(savedPath);
  }
  markSelectedTabModified(false);
  render();
}

function canSaveSelectedPathDirectly() {
  return canSaveMarkdownPathDirectly(state.selectedPath, state.workspaceAdapter);
}

function adoptSavedMarkdownPath(savedPath) {
  adoptSavedMarkdownSession(state, savedPath, {
    getSavedMarkdownWorkspacePath,
    replaceWorkspacePath,
    renameSourceDraftPath,
    renameTabPath,
    fileName,
  });
}

function runEditorCommand(command) {
  runEditorCommandWithContext(command, {
    editor,
    toggleSourceView,
    openEmojiPicker,
    openTextColorPicker,
    openHighlightColorPicker,
    setLinkMark,
    setCodeBlockLanguage,
    openTableInsertModal,
    openImageInsertPanel,
    insertMarkdownLink,
    insertParagraphAroundSelection,
    insertFootnote,
    requestAnimationFrame,
  });
}

async function insertMarkdownLink() {
  if (!editor) return;
  const adapter = state.workspaceAdapter || createWorkspaceAdapter();
  const result = await openMarkdownLinkModal(adapter);
  if (!result) return;
  editor.chain().focus().insertContent({
    type: "text",
    text: result.label,
    marks: [{ type: "link", attrs: { href: result.path } }],
  }).run();
}

async function insertFootnote() {
  if (!editor) {
    return;
  }

  const text = await openTextInputModal({
    title: "鎻掑叆鑴氭敞",
    label: "鑴氭敞鍐呭",
    placeholder: "琛ュ厖璇存槑銆佸嚭澶勬垨閾炬帴",
  });
  if (text === null) {
    return;
  }

  const id = getNextFootnoteId(editor);
  editor.commands.insertFootnote({ id, text: text.trim() });
}

function getNextFootnoteId(currentEditor) {
  let maxId = 0;
  currentEditor.state.doc.descendants((node) => {
    if (node.type.name !== "footnote") {
      return;
    }
    const id = Number.parseInt(node.attrs?.id, 10);
    if (Number.isFinite(id)) {
      maxId = Math.max(maxId, id);
    }
  });
  return String(maxId + 1);
}

function markSelectedTabModified(modified) {
  state.openTabs = setTabModified(state.openTabs, state.selectedPath, modified);
}

function getCurrentDocument() {
  return state.documents[state.selectedPath] || { type: "doc", content: [] };
}

function getCurrentOutline() {
  if (!state.selectedPath) {
    return [];
  }
  if (state.editorMode === "source") {
    return extractOutline(parseMarkdown(getSourceText(state.selectedPath)));
  }
  return extractOutline(getCurrentDocument());
}

function getDocumentText() {
  if (!state.selectedPath) {
    return "";
  }
  if (state.editorMode === "source") {
    return getSourceText(state.selectedPath);
  }
  return serializeMarkdown(getCurrentDocument());
}

function navigateToOutlineItem(index) {
  if (!Number.isFinite(index)) {
    return;
  }

  if (state.editorMode === "source") {
    navigateToSourceHeading(index);
    return;
  }

  const headings = document.querySelectorAll("#tiptapEditor .ProseMirror h1, #tiptapEditor .ProseMirror h2, #tiptapEditor .ProseMirror h3, #tiptapEditor .ProseMirror h4, #tiptapEditor .ProseMirror h5, #tiptapEditor .ProseMirror h6");
  headings[index]?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
}

function navigateToSourceHeading(index) {
  const sourceEditor = document.querySelector(".source-editor");
  if (!sourceEditor) {
    return;
  }

  const headingOffsets = [];
  const headingPattern = /^(#{1,6})\s+(.+)$/gm;
  let match = headingPattern.exec(sourceEditor.value);
  while (match) {
    headingOffsets.push({ from: match.index, to: match.index + match[0].length });
    match = headingPattern.exec(sourceEditor.value);
  }

  const target = headingOffsets[index];
  if (!target) {
    return;
  }

  sourceEditor.focus();
  sourceEditor.setSelectionRange(target.from, target.to);
}

function mountEditor() {
  const element = document.querySelector("#tiptapEditor");
  if (!element || !state.selectedPath || state.editorMode === "source") {
    return;
  }

  try {
    let isEditorInitializing = true;
    
    editor = new Editor({
    element,
    extensions: createEditorExtensions({
      customOrderedList: CustomOrderedList,
      customListItem: CustomListItem,
      delayedHeading: DelayedHeading,
      smartCodeBlockLowlight: SmartCodeBlockLowlight,
      lowlight,
      alignedTableHeader: AlignedTableHeader,
      alignedTableCell: AlignedTableCell,
      footnote: Footnote,
      tableOfContents: TableOfContents,
      mermaidDiagram: MermaidDiagram,
      assetImage: AssetImage,
      bubbleMenuElement: document.querySelector("#bubble-menu") || createBubbleMenuElement(),
      onBlockDragStart: () => { isBlockDragInProgress = true; },
      onBlockDragEnd: () => { isBlockDragInProgress = false; },
      onBlockDragNodeChange: (pos) => { blockDragNodePos = pos; },
    }),
    content: getCurrentDocument(),
    onUpdate: ({ editor: currentEditor, transaction }) => {
      const prevDoc = state.documents[state.selectedPath];
      const prevContent = prevDoc ? JSON.stringify(prevDoc) : "";
      
      migrateTypedMath(currentEditor);
      const newDoc = currentEditor.getJSON();
      state.documents[state.selectedPath] = newDoc;
      
      if (!isEditorInitializing && transaction && transaction.steps && transaction.steps.length > 0) {
        const newContent = JSON.stringify(newDoc);
        if (prevContent !== newContent) {
          markSelectedTabModified(true);
        }
      }
      
      refreshEditorMetadata();
      refreshOutlineView();
      updateFindState(state.searchQuery, true);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => handleEditorSelectionUpdate(currentEditor),
  });
  
  setTimeout(() => { 
    isEditorInitializing = false; 
    console.log("DEBUG: isEditorInitializing set to false after setTimeout");
    console.log("DEBUG: editor document:", JSON.stringify(editor?.getJSON?.()));
  }, 0);
  
  bindPointerBlockDrag(document.querySelector(".drag-handle"), editor, () => blockDragNodePos);
  lastSelectionBlockPos = getCurrentTextBlockPos(editor);
  refreshToolbarState();
  updateTableBubbleToolbar(editor);
  renderBubbleMenu();
  renderIcons();
  setupFileDragAndDrop();
  } catch (error) {
    element.innerHTML = '<div style="padding: 20px; color: red;">编辑器初始化失败: '
      + escapeHtml(error.message)
      + '</div>';
  }
}

function createBubbleMenuElement() {
  const element = document.createElement("div");
  element.id = "bubble-menu";
  element.className = "bubble-menu";
  document.querySelector(".document")?.appendChild(element);
  return element;
}

function setupFileDragAndDrop() {
  const documentArea = document.querySelector(".document");
  if (!documentArea) return;

  documentArea.addEventListener("dragover", (e) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    documentArea.style.borderColor = "#10B981";
    documentArea.style.backgroundColor = "rgba(16, 185, 129, 0.05)";
  });

  documentArea.addEventListener("dragleave", () => {
    documentArea.style.borderColor = "";
    documentArea.style.backgroundColor = "";
  });

  documentArea.addEventListener("drop", async (e) => {
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    documentArea.style.borderColor = "";
    documentArea.style.backgroundColor = "";

    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
        if (isTauriRuntime()) {
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("open_markdown_file_path", { filePath: file.path }).then((result) => {
              if (result) {
                const workspace = result;
                if (state.screen === "shell" && state.selectedPath && state.openTabs.length > 0) {
                  addMarkdownFileToWorkspace(workspace, createWorkspaceAdapter());
                } else {
                  openWorkspace(
                    workspace.projectName,
                    getWorkspacePaths(workspace.files, workspace.paths),
                    workspace.files,
                    workspace.paths,
                    workspace.assetIndex || {}
                  );
                  if (workspace.filePath) {
                    state.filePath = workspace.filePath;
                  }
                }
              }
            });
          });
        }
      }
    }
  });
}

function renderBubbleMenu() {
  const menu = document.querySelector("#bubble-menu");
  if (!menu) return;
  menu.innerHTML = [
    '<div class="bubble-menu__content">',
    toolButton("bold", "Bold", "加粗"),
    toolButton("italic", "Italic", "斜体"),
    toolButton("underline", "Underline", "下划线"),
    toolButton("strike", "Strikethrough", "删除线"),
    '<span class="bubble-menu__separator"></span>',
    toolButton("text-color", "Palette", "文字颜色"),
    toolButton("highlight-color", "Highlighter", "高亮"),
    '<span class="bubble-menu__separator"></span>',
    toolButton("link", "Link", "链接"),
    '</div>',
  ].join("");
  menu.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      runEditorCommand(button.dataset.command);
    });
  });
}

function handleEditorSelectionUpdate(currentEditor) {
  const currentBlockPos = getCurrentTextBlockPos(currentEditor);
  if (
    lastSelectionBlockPos !== null &&
    currentBlockPos !== lastSelectionBlockPos
  ) {
    commitMarkdownHeadingShortcutAt(currentEditor, lastSelectionBlockPos);
  }
  lastSelectionBlockPos = getCurrentTextBlockPos(currentEditor);
  refreshToolbarState();
  updateTableBubbleToolbar(currentEditor);
}

function updateTableBubbleToolbar(currentEditor = editor) {
  const bubble = document.querySelector("[data-table-bubble]");
  const editorArea = document.querySelector(".editor-area");
  if (!bubble || !editorArea || !currentEditor?.isActive("table")) {
    closeTableBubbleMenu();
    bubble?.classList.remove("is-visible");
    return;
  }

  const cell = getSelectionTableCell(currentEditor);
  const table = cell?.closest("table");
  if (!table) {
    closeTableBubbleMenu();
    bubble.classList.remove("is-visible");
    return;
  }

  const tableRect = table.getBoundingClientRect();
  const areaRect = editorArea.getBoundingClientRect();
  const left = Math.max(8, tableRect.left - areaRect.left);
  const top = Math.max(42, tableRect.top - areaRect.top - 34);

  bubble.style.left = left + "px";
  bubble.style.top = top + "px";
  bubble.style.width = Math.max(180, tableRect.width) + "px";
  bubble.classList.add("is-visible");
}

function getSelectionTableCell(currentEditor) {
  const { node } = currentEditor.view.domAtPos(currentEditor.state.selection.from);
  const element = node?.nodeType === globalThis.Node.ELEMENT_NODE ? node : node?.parentElement;
  return element?.closest?.("td, th") || null;
}

function closeTableBubbleMenu() {
  document.querySelector("[data-table-bubble]")?.classList.remove("is-menu-open");
}

function commitCurrentMarkdownHeadingShortcut(currentEditor, options = {}) {
  const pos = getCurrentTextBlockPos(currentEditor);
  return pos !== null
    ? commitMarkdownHeadingShortcutAt(currentEditor, pos, options)
    : false;
}

function getCurrentTextBlockPos(currentEditor) {
  const { selection } = currentEditor.state;
  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    const node = selection.$from.node(depth);
    if (node.isTextblock) {
      return selection.$from.before(depth);
    }
  }
  return null;
}

function commitMarkdownHeadingShortcutAt(currentEditor, pos, options = {}) {
  const { state: editorState, view } = currentEditor;
  const node = editorState.doc.nodeAt(pos);
  if (!node || node.type.name !== "paragraph") {
    return false;
  }

  const shortcut = parseMarkdownHeadingShortcut(node.textContent);
  if (!shortcut) {
    return false;
  }

  const prefix = node.textContent.match(/^#{1,6}\s+/)?.[0] || "";
  if (!prefix) {
    return false;
  }

  const { schema } = editorState;
  const headingType = schema.nodes.heading;
  const paragraphType = schema.nodes.paragraph;
  let tr = editorState.tr
    .delete(pos + 1, pos + 1 + prefix.length)
    .setNodeMarkup(pos, headingType, { level: shortcut.level });

  if (options.insertParagraph) {
    const heading = tr.doc.nodeAt(pos);
    const insertAt = pos + heading.nodeSize;
    tr = tr
      .insert(insertAt, paragraphType.create())
      .setSelection(TextSelection.create(tr.doc, insertAt + 1));
  }

  view.dispatch(tr.scrollIntoView());
  return true;
}

function migrateTypedMath(currentEditor) {
  if (isMigratingMath) {
    return;
  }

  isMigratingMath = true;
  migrateBlockMathStrings(currentEditor);
  if (documentHasTextMath(currentEditor)) {
    migrateMathStrings(currentEditor);
    migrateBlockMathStrings(currentEditor);
  }
  isMigratingMath = false;
}

function documentHasTextMath(currentEditor) {
  let hasTextMath = false;
  currentEditor.state.doc.descendants((node) => {
    if (hasTextMath || !node.isText || !node.text?.includes("$")) {
      return;
    }
    hasTextMath = /\$(?!\d+\$).+?\$(?!\d)/.test(node.text);
  });
  return hasTextMath;
}

function migrateBlockMathStrings(currentEditor) {
  const { blockMath } = currentEditor.schema.nodes;
  if (!blockMath) {
    return;
  }

  const tr = currentEditor.state.tr;
  const replacements = [];
  currentEditor.state.doc.descendants((node, pos) => {
    if (!node.isTextblock || node.type.name === "codeBlock") {
      return;
    }

    const text = textBlockMarkdown(node).trim();
    const match = text.match(/^\$\$(.+)\$\$$/);
    if (match) {
      replacements.push({
        pos,
        size: node.nodeSize,
        latex: match[1].trim(),
      });
    }
  });

  replacements.reverse().forEach(({ pos, size, latex }) => {
    tr.replaceWith(pos, pos + size, blockMath.create({ latex }));
  });

  if (replacements.length) {
    tr.setMeta("addToHistory", false);
    currentEditor.view.dispatch(tr);
  }
}

function textBlockMarkdown(node) {
  const parts = [];
  node.descendants((child) => {
    if (child.type.name === "text") {
      parts.push(child.text || "");
    } else if (child.type.name === "inlineMath") {
      parts.push("$" + (child.attrs.latex || "") + "$");
    }
  });
  return parts.join("");
}

async function setCodeBlockLanguage() {
  if (!editor) {
    return;
  }

  const activeCodeBlock = getActiveCodeBlock();
  const currentLanguage = activeCodeBlock?.node.attrs.language || "";
  const language = await openCodeLanguageModal(currentLanguage || "js");
  if (language === null) {
    return;
  }

  const normalizedLanguage = language.trim();
  if (activeCodeBlock) {
    updateCodeBlockLanguage(activeCodeBlock.pos, normalizedLanguage);
    return;
  }

  editor.chain().focus().toggleCodeBlock({ language: normalizedLanguage }).run();
}

async function setLinkMark() {
  if (!editor) {
    return;
  }

  const { from, to, empty } = editor.state.selection;
  const selectedText = empty ? "" : editor.state.doc.textBetween(from, to, " ");
  const currentHref = editor.getAttributes("link").href || "";

  let defaultHref = currentHref;
  let defaultText = selectedText;

  const urlPattern = /^(https?:\/\/|mailto:|ftp:\/\/|file:\/\/).+/i;
  if (selectedText && !currentHref && urlPattern.test(selectedText.trim())) {
    defaultHref = selectedText.trim();
    defaultText = "";
  }

  const result = await openLinkModal({
    href: defaultHref,
    text: defaultText,
  });
  if (result === null) {
    return;
  }

  const normalizedHref = result.href.trim();
  if (!normalizedHref) {
    editor.chain().focus().setTextSelection({ from, to }).unsetLink().run();
    return;
  }

  const linkText = result.text.trim() || normalizedHref;
  editor.chain().focus().command(({ tr, state }) => {
    const linkMark = state.schema.marks.link.create({ href: normalizedHref });
    tr.replaceWith(from, to, state.schema.text(linkText, [linkMark]));
    return true;
  }).run();
}

async function handleCodeBlockDoubleClick(event) {
  if (!editor) {
    return;
  }

  const codeBlock = event.target.closest?.(".ProseMirror pre");
  if (!codeBlock) {
    return;
  }

  const codeInfo = findCodeBlockPosition(codeBlock);
  if (!codeInfo) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const language = await openCodeLanguageModal(codeInfo.node.attrs.language || "js");
  if (language === null) {
    return;
  }
  updateCodeBlockLanguage(codeInfo.pos, language.trim());
}

function handleCodeBlockLanguageChange(event) {
  const select = event.target?.closest?.(".code-block-language-select");
  if (!select || !editor) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const codeBlockElement = select.closest(".code-block-wrapper")?.querySelector("pre");
  if (!codeBlockElement) {
    return;
  }
  const codeInfo = findCodeBlockPosition(codeBlockElement);
  if (!codeInfo) {
    return;
  }
  updateCodeBlockLanguage(codeInfo.pos, select.value);
}

function handleCodeBlockCopy(event) {
  const button = event.target?.closest?.(".code-block-copy-btn");
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const codeBlockElement = button.closest(".code-block-wrapper")?.querySelector("pre");
  if (!codeBlockElement) {
    return;
  }
  const text = codeBlockElement.textContent || "";
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = "已复制";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  });
}

function findCodeBlockPosition(codeBlockElement) {
  const blocks = [...document.querySelectorAll("#tiptapEditor .ProseMirror pre")];
  const targetIndex = blocks.indexOf(codeBlockElement);
  if (targetIndex < 0) {
    return null;
  }

  let currentIndex = -1;
  let result = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "codeBlock") {
      return;
    }

    currentIndex += 1;
    if (currentIndex === targetIndex) {
      result = { node, pos };
      return false;
    }
  });
  return result;
}

function updateCodeBlockLanguage(pos, language) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "codeBlock") {
    return;
  }

  editor.chain().focus().command(({ tr }) => {
    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      language,
    });
    return true;
  }).run();
}

function getActiveCodeBlock() {
  if (!editor) {
    return null;
  }

  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.node.type.name === "codeBlock") {
    return { node: selection.node, pos: selection.from };
  }

  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    const node = selection.$from.node(depth);
    if (node.type.name === "codeBlock") {
      return { node, pos: selection.$from.before(depth) };
    }
  }
  return null;
}

function selectEditorNode(pos) {
  if (!editor) {
    return;
  }

  const { state, view } = editor;
  try {
    const selection = NodeSelection.create(state.doc, pos);
    view.dispatch(state.tr.setSelection(selection));
  } catch {
    const node = state.doc.nodeAt(pos);
    if (node) {
      editor.commands.setTextSelection({ from: pos, to: pos + node.nodeSize });
    }
  }
  view.focus();
}

function handleObjectKeydown(event) {
  if (!editor || (event.key !== "Enter" && event.key !== "F2")) {
    return;
  }

  const { selection } = editor.state;
  const node = selection instanceof NodeSelection ? selection.node : null;
  if (!node || !isEditableObjectNode(node)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  editSelectedObject(node, selection.from);
}

function isEditableObjectNode(node) {
  return ["blockMath", "inlineMath", "mermaidDiagram", "image"].includes(node.type.name);
}

function editSelectedObject(node, pos) {
  if (node.type.name === "blockMath" || node.type.name === "inlineMath") {
    editMathNode(node.type.name, node, pos);
  } else if (node.type.name === "mermaidDiagram") {
    editMermaidNode(node, pos);
  } else if (node.type.name === "image") {
    editImageSize(node, pos, getSelectedImageElement());
  }
}

function getSelectedImageElement() {
  return document.querySelector("#tiptapEditor .ProseMirror img.ProseMirror-selectednode");
}

function handleMathClick(event) {
  if (!editor) {
    return;
  }

  const mathElement = getMathElementAtEvent(event);
  if (!mathElement) {
    return;
  }

  const type = mathElement.dataset.type === "block-math" ? "blockMath" : "inlineMath";
  const pos = findMathNodePosition(mathElement, type);
  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  if (!node) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectEditorNode(pos);
}

function handleMathDoubleClick(event) {
  if (!editor) {
    return;
  }

  const mathElement = getMathElementAtEvent(event);
  if (!mathElement) {
    return;
  }

  const type = mathElement.dataset.type === "block-math" ? "blockMath" : "inlineMath";
  const pos = findMathNodePosition(mathElement, type);
  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  if (!node) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  editMathNode(type, node, pos);
}

function getMathElementAtEvent(event) {
  const directTarget = event.target.closest?.(".tiptap-mathematics-render");
  if (directTarget && isMathTextHit(directTarget, event)) {
    return directTarget;
  }

  return [...document.querySelectorAll(".tiptap-mathematics-render")]
    .find((element) => isMathTextHit(element, event)) || null;
}

function isMathTextHit(mathElement, event) {
  const renderedMath = mathElement.querySelector(".katex, .katex-error") || mathElement;
  return [...renderedMath.getClientRects()].some((rect) => (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  ));
}

function findMathNodePosition(mathElement, type) {
  const orderedPos = findMathNodePositionByOrder(mathElement, type);
  if (orderedPos !== null) {
    return orderedPos;
  }

  const pos = editor.view.posAtDOM(mathElement, 0);
  for (let offset = -2; offset <= 2; offset += 1) {
    const candidate = pos + offset;
    if (candidate < 0 || candidate > editor.state.doc.content.size) {
      continue;
    }
    const node = editor.state.doc.nodeAt(candidate);
    if (node?.type.name === type) {
      return candidate;
    }
  }

  const latex = mathElement.getAttribute("data-latex") || "";
  const matches = [];
  editor.state.doc.descendants((node, candidate) => {
    if (node.type.name === type && node.attrs.latex === latex) {
      matches.push(candidate);
    }
  });

  return matches.sort((first, second) => (
    Math.abs(first - pos) - Math.abs(second - pos)
  ))[0] ?? null;
}

function findMathNodePositionByOrder(mathElement, type) {
  const dataType = type === "blockMath" ? "block-math" : "inline-math";
  const mathElements = [...document.querySelectorAll(
    '.tiptap-mathematics-render[data-type="' + dataType + '"]',
  )];
  const targetIndex = mathElements.indexOf(mathElement);
  if (targetIndex < 0) {
    return null;
  }

  let currentIndex = -1;
  let position = null;
  editor.state.doc.descendants((node, candidate) => {
    if (node.type.name !== type) {
      return;
    }

    currentIndex += 1;
    if (currentIndex === targetIndex) {
      position = candidate;
      return false;
    }
  });

  return position;
}

async function editMathNode(type, node, pos) {
  const latex = await openTextEditorModal({
    title: type === "blockMath" ? "编辑块公式" : "编辑行内公式",
    value: node.attrs.latex || "",
    rows: type === "blockMath" ? 8 : 4,
  });
  if (latex === null) {
    return;
  }

  const trimmedLatex = latex.trim();
  if (!trimmedLatex) {
    const deleteCommand = type === "blockMath" ? "deleteBlockMath" : "deleteInlineMath";
    editor.chain().focus()[deleteCommand]({ pos }).run();
    return;
  }

  const command = type === "blockMath" ? "updateBlockMath" : "updateInlineMath";
  editor.chain().focus()[command]({ latex: trimmedLatex, pos }).run();
}

function handleMermaidClick(event) {
  if (!editor) {
    return;
  }
  if (event.target.closest?.(".mermaid-diagram__controls")) {
    return;
  }

  const diagramElement = event.target.closest?.(".mermaid-diagram");
  if (!diagramElement) {
    return;
  }
  if (diagramElement.dataset.suppressEdit === "true") {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const pos = findMermaidNodePosition(diagramElement);
  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  if (!node) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectEditorNode(pos);
}

function handleMermaidDoubleClick(event) {
  if (!editor || event.target.closest?.(".mermaid-diagram__controls")) {
    return;
  }

  const diagramElement = event.target.closest?.(".mermaid-diagram");
  if (!diagramElement || diagramElement.dataset.suppressEdit === "true") {
    return;
  }

  const pos = findMermaidNodePosition(diagramElement);
  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  if (!node) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  editMermaidNode(node, pos);
}

function findMermaidNodePosition(diagramElement) {
  const diagrams = [...document.querySelectorAll(".mermaid-diagram")];
  const targetIndex = diagrams.indexOf(diagramElement);
  if (targetIndex < 0) {
    return null;
  }

  let currentIndex = -1;
  let position = null;
  editor.state.doc.descendants((node, candidate) => {
    if (node.type.name !== "mermaidDiagram") {
      return;
    }

    currentIndex += 1;
    if (currentIndex === targetIndex) {
      position = candidate;
      return false;
    }
  });
  return position;
}

async function editMermaidNode(node, pos) {
  const code = await openTextEditorModal({
    title: "缂栬緫 Mermaid 鍥捐〃",
    value: node.attrs.code || "",
    rows: 18,
    monospace: true,
  });
  if (code === null) {
    return;
  }

  if (!code.trim()) {
    editor.chain().focus().deleteMermaidDiagram({ pos }).run();
    return;
  }

  editor.chain().focus().updateMermaidDiagram({ code, pos }).run();
}

function handleImageClick(event) {
  if (!editor || event.target.tagName !== "IMG") {
    return;
  }

  const pos = findImageNodePosition(event.target);
  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "image") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectEditorNode(pos);
}

function handleImageDoubleClick(event) {
  if (!editor || event.target.tagName !== "IMG") {
    return;
  }

  const pos = findImageNodePosition(event.target);
  const node = pos === null ? null : editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "image") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  editImageSize(node, pos, event.target);
}

function findImageNodePosition(imageElement) {
  const images = [...document.querySelectorAll("#tiptapEditor .ProseMirror img")];
  const targetIndex = images.indexOf(imageElement);
  if (targetIndex < 0) {
    return null;
  }

  let currentIndex = -1;
  let position = null;
  editor.state.doc.descendants((node, candidate) => {
    if (node.type.name !== "image") {
      return;
    }

    currentIndex += 1;
    if (currentIndex === targetIndex) {
      position = candidate;
      return false;
    }
  });
  return position;
}

async function editImageSize(node, pos, imageElement = null) {
  const originalWidth = node.attrs.originalWidth || imageElement?.naturalWidth || node.attrs.width || null;
  const currentScale = node.attrs.scale || (
    node.attrs.width && originalWidth ? Math.round(node.attrs.width / originalWidth * 100) : null
  );
  const scale = await openImageSizeModal(currentScale || "");
  if (scale === undefined) {
    return;
  }

  editor.chain().focus().command(({ tr }) => {
    const nextAttrs = {
      ...node.attrs,
      width: null,
      scale: null,
      originalWidth: null,
    };
    if (scale && originalWidth) {
      nextAttrs.scale = scale;
      nextAttrs.originalWidth = originalWidth;
      nextAttrs.width = getScaledImageWidth(scale, originalWidth);
    }
    tr.setNodeMarkup(pos, undefined, {
      ...nextAttrs,
    });
    return true;
  }).run();
}

function openCreateWorkspaceModal() {
  const adapter = createWorkspaceAdapter();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = [
      '<div class="text-modal__dialog create-workspace-modal" role="dialog" aria-modal="true" aria-label="新建项目">',
      '<header class="text-modal__header">',
      '<strong>新建项目</strong>',
      '<button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>',
      '</header>',
      '<section class="create-workspace-modal__body">',
      '<label class="field"><span>项目名称</span><input data-project-name value="MyProject" placeholder="例如 学习笔记" autocomplete="off" /></label>',
      '<label class="field"><span>存放目录</span><div class="directory-picker-row"><input data-project-directory placeholder="选择父目录" readonly /><button data-pick-directory type="button">选择目录</button></div></label>',
      '<p class="create-workspace-modal__hint">PME 会在所选目录下创建同名项目文件夹，并在其中保存 Markdown 文件和 assets 图片目录。</p>',
      '</section>',
      '<footer class="text-modal__footer">',
      '<span data-create-workspace-status>请选择项目名称和存放目录</span>',
      '<button data-modal-action="cancel">取消</button>',
      '<button class="primary" data-modal-action="apply">创建项目</button>',
      '</footer>',
      '</div>',
    ].join("");

    const nameInput = overlay.querySelector("[data-project-name]");
    const directoryInput = overlay.querySelector("[data-project-directory]");
    const status = overlay.querySelector("[data-create-workspace-status]");
    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector("[data-pick-directory]").addEventListener("click", async () => {
      try {
        const directory = await adapter.pickDirectory();
        if (directory) {
          directoryInput.value = directory;
          status.textContent = "目录已选择";
        }
      } catch (error) {
        console.error(error);
        status.textContent = "目录选择失败";
      }
    });

    overlay.addEventListener("click", async (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close(null);
      }
      if (event.target.dataset.modalAction === "apply") {
        const name = nameInput.value.trim();
        if (!name) {
          status.textContent = "请输入项目名称";
          nameInput.focus();
          return;
        }
        close({ name, parentPath: directoryInput.value.trim(), adapter });
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
      if (event.key === "Enter" && event.ctrlKey) {
        event.preventDefault();
        overlay.querySelector("[data-modal-action='apply']").click();
      }
    });

    document.body.appendChild(overlay);
    nameInput.focus();
    nameInput.select();
  }).then((result) => {
    if (result) {
      return createWorkspace(result);
    }
    return null;
  });
}

function openPdfExportModal() {
  if (!state.selectedPath) {
    openMessageModal({ title: "无法导出", message: "请先打开一个 Markdown 文档。" });
    return;
  }

  openPdfExportOptionsModal().then((options) => {
    if (options) {
      exportCurrentDocumentToPdf(options).catch((error) => {
        console.error(error);
        const detail = error?.message || String(error || "");
        openMessageModal({
          title: "导出失败",
          message: detail
            ? "无法生成 PDF 文件。\n\n" + detail
            : "无法生成 PDF 文件，请检查保存位置后重试。",
        });
      });
    }
  });
}

async function exportCurrentDocumentToPdf(options) {
  syncSelectedDocumentToState();
  if (state.editorMode === "source") {
    state.editorMode = "visual";
    render();
    await waitForNextFrame();
    await waitForMilliseconds(250);
  }
  await waitForNextFrame();

  const documentHtml = await getPrintableDocumentHtml();
  if (!documentHtml) {
    openMessageModal({ title: "无法导出", message: "请先打开一个 Markdown 文档。" });
    return;
  }

  const title = fileName(state.selectedPath).replace(/\.md$/i, "");
  const html = buildPdfExportHtml({
    title,
    documentHtml,
    options,
  });

  if (isTauriRuntime()) {
    await savePdfHtmlWithTauri(html, sanitizePdfFileName(title || "PME") + ".pdf");
    return;
  }

  printPdfHtml(html, () => {
    openMessageModal({ title: "无法导出", message: "请先打开一个 Markdown 文档。" });
  });
}

async function packageCurrentDocument() {
  if (!state.selectedPath) {
    openMessageModal({ title: "无法打包", message: "请先打开一个 Markdown 文档。" });
    return;
  }

  syncSelectedDocumentToState();
  const doc = structuredClone(getCurrentDocument());
  const imageNodes = collectImageNodes(doc);
  const markdownLinks = collectLocalMarkdownLinkTargets(doc);
  const markdownName = fileName(state.selectedPath);
  const originalMarkdown = serializeMarkdown(doc, { basePath: state.selectedPath });

  if (!imageNodes.length && !markdownLinks.length) {
    const savedPath = await saveTextExport(markdownName, originalMarkdown);
    if (savedPath) {
      await openMessageModal({ title: "导出完成", message: "Markdown 已保存到：\n" + savedPath });
    }
    return;
  }

  const confirmed = await openConfirmModal({
    title: "打包当前文档",
    message: "当前文档包含 " + imageNodes.length + " 个图片引用和 " + markdownLinks.length + " 个本地 Markdown 链接。PME 将递归收集关联文档与图片并重写包内链接。原始文件不会被修改。",
    confirmLabel: "开始打包",
    cancelLabel: "取消",
  });
  if (!confirmed) {
    return;
  }

  const packageResult = await buildMarkdownPackage({
    doc,
    markdownName,
    rootSourcePath: getSelectedDocumentAbsolutePath(),
    loadText: async (path) => {
      const adapter = state.workspaceAdapter || createWorkspaceAdapter();
      if (!adapter.readTextFilePath) throw new Error("Local Markdown loading is unavailable.");
      return adapter.readTextFilePath(path);
    },
    loadImageResource: (source) => loadImageResource(source, {
      files: state.files,
      isTauri: isTauriRuntime(),
      loadLocalImageResource,
      selectedPath: state.selectedPath,
    }),
  });
  if (packageResult.missing.length) {
    const shouldContinue = await openConfirmModal({
      title: "部分资源无法收集",
      message: "有 " + packageResult.missing.length + " 个文档或图片资源无法读取。是否继续生成 ZIP？\n\n"
        + packageResult.missing.slice(0, 5).join("\n"),
      confirmLabel: "继续生成",
      cancelLabel: "鍙栨秷",
    });
    if (!shouldContinue) {
      return;
    }
  }

  const savedPath = await saveBlobExport(
    getMarkdownPackageFileName(markdownName),
    packageResult.blob,
  );
  if (savedPath) {
    await openMessageModal({ title: "打包完成", message: "ZIP 已保存到：\n" + savedPath });
  }
}

function getSelectedDocumentAbsolutePath() {
  if (isLocalAbsolutePath(state.selectedPath)) return state.selectedPath.replaceAll("\\", "/");
  const rootPath = state.workspaceAdapter?.getWorkspaceInfo?.()?.rootPath;
  if (rootPath) {
    return `${rootPath.replaceAll("\\", "/").replace(/\/$/, "")}/${state.selectedPath}`;
  }
  return state.selectedPath.replaceAll("\\", "/");
}

async function saveTextExport(defaultFileName, content) {
  const adapter = state.workspaceAdapter || createWorkspaceAdapter();
  if (adapter.saveTextFileDialog) {
    const savedPath = await adapter.saveTextFileDialog(defaultFileName, content);
    if (savedPath) {
      return savedPath;
    }
  }
  downloadBlob(new Blob([content], { type: "text/markdown;charset=utf-8" }), defaultFileName);
  return defaultFileName;
}

async function saveBlobExport(defaultFileName, blob) {
  const adapter = state.workspaceAdapter || createWorkspaceAdapter();
  if (adapter.saveBlobFileDialog) {
    const savedPath = await adapter.saveBlobFileDialog(defaultFileName, blob);
    if (savedPath) {
      return savedPath;
    }
  }
  downloadBlob(blob, defaultFileName);
  return defaultFileName;
}

async function savePdfHtmlWithTauri(html, defaultFileName) {
  const { invoke } = await import("@tauri-apps/api/core");
  const savedPath = await invoke("export_html_to_pdf_dialog", {
    defaultFileName,
    html,
  });
  if (savedPath) {
    await openMessageModal({ title: "导出完成", message: "PDF 已保存到：\n" + savedPath });
  }
}

function openImageInsertPanel() {
  if (!editor) {
    return;
  }

  openImageInsertModal().then(async (result) => {
    if (!result) {
      return;
    }

    if (result.kind === "files") {
      await insertImageFiles(result.files, { scale: result.scale });
    } else if (result.kind === "url") {
      await insertNetworkImage(result.url, { scale: result.scale });
    } else if (result.kind === "asset") {
      await insertImageAsset(result.asset, { scale: result.scale });
    } else if (result.kind === "assets") {
      for (const asset of result.assets) {
        await insertImageAsset(asset, { scale: result.scale });
      }
    }
  });
}

async function insertNetworkImage(url, options = {}) {
  if (!editor) {
    return;
  }

  const scale = normalizeImageScale(options.scale);
  const originalWidth = scale ? await getImageIntrinsicWidth(url) : null;
  const width = getScaledImageWidth(scale, originalWidth);
  editor.chain().focus().setImage({
    src: url,
    alt: getNetworkImageName(url, "image/png").replace(/\.[^.]+$/, ""),
    ...(width ? { width, scale, originalWidth } : {}),
  }).run();
}

function handleDragEnter(event) {
  if (isBlockDragInProgress) {
    return;
  }
  if (!hasImageFileItem(event.dataTransfer?.items)) {
    return;
  }
  dragDepth += 1;
  document.querySelector(".editor-area")?.classList.add("is-dragging-image");
}

function handleDragOver(event) {
  if (isBlockDragInProgress) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    return;
  }
  if (!hasImageFileItem(event.dataTransfer?.items)) {
    return;
  }
  event.preventDefault();
}

function handleDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    document.querySelector(".editor-area")?.classList.remove("is-dragging-image");
  }
}

function handleDrop(event) {
  if (isBlockDragInProgress) {
    isBlockDragInProgress = false;
    return;
  }
  if (!editor) {
    return;
  }

  const imageFiles = getImageFilesFromFileList(event.dataTransfer.files);
  if (!imageFiles.length) {
    return;
  }

  event.preventDefault();
  dragDepth = 0;
  document.querySelector(".editor-area")?.classList.remove("is-dragging-image");
  insertImageFiles(imageFiles);
}

function handlePaste(event) {
  if (!editor) {
    return;
  }

  const htmlImageUrl = getClipboardHtmlImageUrl(event.clipboardData);
  if (htmlImageUrl) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    insertNetworkImage(htmlImageUrl);
    return;
  }

  const imageFiles = getImageFilesFromItems(event.clipboardData?.items);
  if (!imageFiles.length) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  insertImageFiles(imageFiles, { embedDataUrl: true });
}

async function insertImageFiles(imageFiles, options = {}) {
  for (const file of imageFiles) {
    const source = options.embedDataUrl ? await blobToDataUrl(file) : URL.createObjectURL(file);
    const asset = createImageAsset({ originalName: file.name || "clipboard.png" });
    const assetPath = resolveInsertedImageAssetPath({
      file,
      generatedAsset: asset,
      embedDataUrl: options.embedDataUrl,
    });

    await insertImageAsset({
      src: source,
      alt: asset.alt,
      assetPath,
      originalWidth: await getImageIntrinsicWidth(source),
    }, { ...options, revokeSrcAfterLoad: !options.embedDataUrl });
  }
}

async function insertImageAsset(asset, options = {}) {
  if (!editor) {
    return;
  }

  const originalWidth = asset.originalWidth || await getImageIntrinsicWidth(asset.previewUrl || asset.src);
  const scale = normalizeImageScale(options.scale);
  const width = getScaledImageWidth(scale, originalWidth);
  editor.chain().focus().setImage({
    src: asset.previewUrl || asset.src,
    alt: asset.alt || (asset.assetPath ? fileName(asset.assetPath).replace(/\.[^.]+$/, "") : "image"),
    ...(asset.assetPath ? { assetSrc: asset.assetPath } : {}),
    ...(width ? { width, scale, originalWidth } : {}),
  }).run();
}

function destroyEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }
  lastSelectionBlockPos = null;
}

function refreshEditorMetadata() {
  const activeTab = document.querySelector('.tab--active [data-tab="' + cssEscape(state.selectedPath) + '"] .tab__label');
  if (activeTab) {
    const tab = state.openTabs.find((item) => item.path === state.selectedPath);
    activeTab.textContent = tab.name + (tab.modified ? " *" : "");
  }

  const statusItems = document.querySelectorAll(".statusbar span");
  const stats = getDocumentStats(getDocumentText());
  if (statusItems[1]) {
    statusItems[1].textContent = "Words: " + stats.words;
  }
  if (statusItems[2]) {
    statusItems[2].textContent = "Characters: " + stats.characters;
  }
  refreshToolbarState();
}

function refreshTreeView() {
  const tree = document.querySelector(".tree");
  if (!tree) {
    return;
  }

  tree.innerHTML = renderSidebar();
  renderIcons();
  bindSidebarEvents();
}

function refreshOutlineView() {
  const outline = document.querySelector(".outline-section");
  if (!outline) {
    return;
  }

  outline.innerHTML = '<div class="tree__title">OUTLINE</div>' + renderOutline();
  bindOutlineEvents();
}

function bindSidebarEvents() {
  document.querySelectorAll("[data-file-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (button.dataset.fileAction === "rename") {
        renameCurrentMarkdownDocument(button.dataset.path);
      } else if (button.dataset.fileAction === "delete") {
        deleteCurrentMarkdownDocument(button.dataset.path);
      }
    });
  });
  document.querySelectorAll(".tree-item").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.type === "markdown") {
        openDocument(button.dataset.path);
      } else if (button.dataset.type === "folder") {
        toggleFolder(button.dataset.path);
      }
    });
  });
  bindOutlineEvents();
}

function toggleFolder(path) {
  if (state.collapsedFolders.has(path)) {
    state.collapsedFolders.delete(path);
  } else {
    state.collapsedFolders.add(path);
  }
  refreshTreeView();
}

function bindOutlineEvents() {
  document.querySelectorAll("[data-outline-index]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateToOutlineItem(Number(button.dataset.outlineIndex));
    });
  });
}

function refreshToolbarState() {
  document.querySelectorAll("[data-command='source-view']").forEach((button) => {
    button.classList.toggle("is-active", state.editorMode === "source");
  });

  if (!editor) {
    return;
  }

  const inTable = editor.isActive("table");
  const activeTableAlign = normalizeTextAlign(
    editor.getAttributes("tableCell").textAlign || editor.getAttributes("tableHeader").textAlign,
  );
  const activeCommands = {
    "source-view": state.editorMode === "source",
    paragraph: editor.isActive("paragraph"),
    "heading-1": editor.isActive("heading", { level: 1 }),
    "heading-2": editor.isActive("heading", { level: 2 }),
    "heading-3": editor.isActive("heading", { level: 3 }),
    "heading-4": editor.isActive("heading", { level: 4 }),
    "heading-5": editor.isActive("heading", { level: 5 }),
    "heading-6": editor.isActive("heading", { level: 6 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    code: editor.isActive("code"),
    "align-left": editor.isActive({ textAlign: "left" }),
    "align-center": editor.isActive({ textAlign: "center" }),
    "align-right": editor.isActive({ textAlign: "right" }),
    "align-justify": editor.isActive({ textAlign: "justify" }),
    link: editor.isActive("link"),
    "bullet-list": editor.isActive("bulletList"),
    "ordered-list": editor.isActive("orderedList"),
    "task-list": editor.isActive("taskList"),
    blockquote: editor.isActive("blockquote"),
    "code-block": editor.isActive("codeBlock"),
    table: inTable,
    "table-align-left": activeTableAlign === "left",
    "table-align-center": activeTableAlign === "center",
    "table-align-right": activeTableAlign === "right",
  };
  const tableCommands = new Set([
    "table-row-after",
    "table-row-before",
    "table-column-after",
    "table-column-before",
    "table-toggle-header",
    "table-align-left",
    "table-align-center",
    "table-align-right",
    "table-delete-row",
    "table-delete-column",
    "table-delete",
    "table-merge-cells",
    "table-split-cell",
  ]);

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.classList.toggle("is-active", Boolean(activeCommands[button.dataset.command]));
    if (button.dataset.command === "unlink") {
      button.disabled = !editor.isActive("link");
    }
    if (tableCommands.has(button.dataset.command)) {
      button.disabled = !inTable;
    }
  });
}

function renderIcons() {
  createIcons({ icons: lucideIcons });
}

function fileIcon(type) {
  if (type === "folder") {
    return "Folder";
  }
  if (type === "markdown") {
    return "FileText";
  }
  if (type === "image") {
    return "Image";
  }
  return "File";
}

window.addEventListener("beforeunload", (event) => {
  const modifiedTabs = state.openTabs.filter((tab) => tab.modified);
  if (modifiedTabs.length > 0) {
    event.preventDefault();
    event.returnValue = "";
  }
});

async function saveAllModifiedTabs() {
  syncSelectedDocumentToState();
  const modifiedTabs = state.openTabs.filter((tab) => tab.modified);
  const canPersist = Boolean(state.workspaceAdapter?.canPersist && state.workspaceAdapter?.getWorkspaceInfo?.());
  for (const tab of modifiedTabs) {
    try {
      if (canPersist) {
        await state.workspaceAdapter.writeTextFile(tab.path, state.files[tab.path]);
        tab.modified = false;
      } else {
        if (tab.path === state.selectedPath) {
          const savedPath = await saveTextExport(fileName(tab.path), state.files[tab.path]);
          if (savedPath) {
            tab.modified = false;
          } else {
            return false;
          }
        }
      }
    } catch (e) {
      return false;
    }
  }
  return true;
}

if (isTauriRuntime()) {
  let isHandlingClose = false;
  import("@tauri-apps/api/window")
    .then(({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      win.onCloseRequested(async (event) => {
        if (isHandlingClose) {
          return;
        }
        syncSelectedDocumentToState();
        const modifiedTabs = state.openTabs.filter((tab) => tab.modified);
        if (modifiedTabs.length === 0) {
          return;
        }
        event.preventDefault();
        isHandlingClose = true;
        const names = modifiedTabs.map((t) => t.name).join("、");
        const result = await openSaveChangesModal({
          title: "保存更改",
          message: "以下文件尚未保存：" + names + "。是否保存更改？",
        });
        if (result === "save") {
          const success = await saveAllModifiedTabs();
          if (success) {
            await win.destroy();
          } else {
            isHandlingClose = false;
          }
        } else if (result === "discard") {
          await win.destroy();
        } else {
          isHandlingClose = false;
        }
      });
    })
    .catch((error) => {
      console.error("Failed to register close handler:", error);
    });
}

async function handleCliFileOpen(filePath) {
  const adapter = createWorkspaceAdapter();
  try {
    const workspace = await adapter.openRecentMarkdownFile({ filePath });
    if (workspace) {
      if (state.screen === "shell" && state.selectedPath && state.openTabs.length > 0) {
        addMarkdownFileToWorkspace(workspace, adapter);
      } else {
        openWorkspace(
          workspace.projectName,
          getWorkspacePaths(workspace.files, workspace.paths),
          workspace.files,
          adapter,
          workspace.assetIndex,
          workspace.selectedPath,
        );
      }
    }
  } catch (error) {
    console.error("Failed to open file from CLI:", error);
  }
}

if (isTauriRuntime()) {
  import("@tauri-apps/api/event").then(({ listen }) => {
    listen("open-file-from-cli", ({ payload }) => {
      if (typeof payload === "string") {
        handleCliFileOpen(payload);
      }
    });
  });

  import("@tauri-apps/api/core").then(({ invoke }) => {
    invoke("get_command_line_file").then((result) => {
      if (result) {
        handleCliFileOpen(result);
      }
    });
  });
}
