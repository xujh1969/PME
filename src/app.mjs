import { Editor } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import { migrateMathStrings } from "@tiptap/extension-mathematics";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
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
  collectVideoNodes,
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
import { getClipboardHtmlImageUrl, getImageIntrinsicWidth, getVideoIntrinsicWidth } from "./editor/image-input.mjs";
import { createEditorExtensions } from "./editor/editor-extensions.mjs";
import { headingCollapsePlugin } from "./editor/heading-collapse.mjs";
import { AlignedTableCell, AlignedTableHeader, AssetImage } from "./editor/custom-nodes.mjs";
import { MermaidDiagram } from "./editor/mermaid-node.mjs";
import {
  SmartCodeBlockLowlight,
} from "./editor/code-block-actions.mjs";
import { openImageInsertModal } from "./ui/image-insert-modal.mjs";
import { openVideoInsertModal } from "./ui/video-insert-modal.mjs";
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
import { initConfig } from "./core/config.mjs";
import { openSettingsModal as openSettingsModalDialog } from "./ui/settings-modal.mjs";

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
  addAttributes() {
    return {
      ...this.parent?.(),
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-collapsed") === "true",
        renderHTML: (attributes) => attributes.collapsed ? { "data-collapsed": "true" } : {},
      },
    };
  },

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

  addProseMirrorPlugins() {
    return [headingCollapsePlugin()];
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
  replaceQuery: "",
  searchMatches: [],
  activeSearchIndex: -1,
  searchCaseSensitive: false,
  searchWholeWord: false,
  showReplace: false,
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

initConfig();
document.addEventListener("contextmenu", (event) => event.preventDefault());
startApp();

async function startApp() {
  await setupCommandLineFileHandler();
  render();
}

async function setupCommandLineFileHandler() {
  if (!isTauriRuntime()) return;
  
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const file_path = await invoke("get_command_line_file");
    if (file_path) {
      const adapter = createWorkspaceAdapter();
      const workspace = await adapter.openRecentMarkdownFile({ filePath: file_path });
      if (workspace) {
        Object.assign(state, createOpenedWorkspaceSession({
          projectName: workspace.projectName,
          paths: workspace.paths,
          files: workspace.files,
          workspaceAdapter: adapter,
          assetIndex: workspace.assetIndex,
          selectedPath: workspace.selectedPath,
          parseMarkdown,
          hydrateImagePreviews,
          buildWorkspaceTree,
          fileName,
        }));
        if (isTauriRuntime()) {
          state.documents = await hydrateDocumentMapLocalImages(state.documents, loadLocalImageResource);
        }
        rememberWorkspace(adapter?.getWorkspaceInfo?.());
      }
    }
  } catch (error) {
    console.error("Failed to open file from command line:", error);
  }
}

function render() {
  destroyEditor();
  app.innerHTML = state.screen === "welcome" ? renderWelcome() : renderShell();
  requestAnimationFrame(() => document.body.classList.remove("is-booting"));
  renderIcons();
  bindEvents();
  mountEditor();
  refreshToolbarState();
  updateFindState(state.searchQuery, true);
  if (state.screen !== "welcome") {
    setTimeout(() => {
      editor?.view?.dom?.focus();
    }, 300);
  }
}

function renderWelcome() {
  const recentFiles = getRecentWorkspaces();
  return `
    <main class="welcome">
      <video class="welcome__video" autoPlay loop muted playsInline preload="auto">
        <source src="/assets/hero.mp4" type="video/mp4" />
      </video>
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
              <button class="hero-button hero-button--secondary liquid-glass" data-action="open-markdown-file">
                <span>打开 Markdown</span>
              </button>
              <details class="recent-menu">
                <summary class="hero-arrow-button liquid-glass" aria-label="最近文件">${icon("ChevronDown")}</summary>
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
          <div class="find-input-wrapper">
            <input data-find-input aria-label="查找" placeholder="查找" value="${escapeHtml(state.searchQuery)}" />
            ${state.searchQuery ? `<button class="icon-button find-clear" data-find-action="clear-find" title="清除" aria-label="清除">${icon("X")}</button>` : ''}
          </div>
          <button class="icon-button" data-find-action="case-sensitive" title="区分大小写" aria-label="区分大小写" style="${state.searchCaseSensitive ? 'background:#3b82f6;color:#ffffff;border-radius:var(--radius-sm);' : ''}">
            <svg viewBox="0 0 1024 1024" width="16" height="16" fill="${state.searchCaseSensitive ? '#ffffff' : 'currentColor'}">
              <path d="M240.8704 250.31168H338.9952l217.6 552.41216H464.01024l-53.01248-142.35648H168.07424l-53.01248 142.35648H23.2704l217.6-552.41216z m-46.68416 340.42368h190.69952l-93.37344-249.9072h-3.16416l-94.1568 249.9072zM813.66016 391.89504c60.13952 0 104.448 14.69952 132.93568 44.10368 24.5248 25.52832 37.18656 62.6688 37.18656 111.4112v255.31392H906.24v-56.4736a169.58976 169.58976 0 0 1-59.3408 47.96416c-26.9056 12.38016-58.55744 19.34336-94.95552 19.34336-42.73152 0-75.96544-10.83392-99.70176-31.72352-26.112-20.8896-38.77376-47.96928-38.77376-81.23392 0-44.8768 18.2016-79.6928 54.59968-103.68 33.2288-23.20896 80.70656-34.816 140.84608-36.36224l91.78624-2.31936v-16.24576c0-55.7056-30.85824-83.5584-92.57984-83.5584-26.112 0-47.47264 4.63872-63.29856 13.9264-18.9952 10.8288-30.86336 27.07968-35.6096 49.5104l-83.08224-6.9632c8.704-43.32032 30.85824-75.81696 65.67424-95.93344 30.06976-18.57024 71.2192-27.07968 121.856-27.07968z m87.04 225.92l-86.2464 2.31936c-76.75392 1.54624-114.7392 27.8528-114.7392 77.36832 0 15.47264 6.33344 27.8528 19.78368 37.9136 12.66176 10.05568 30.06976 15.47264 51.43552 15.47264 35.60448 0 65.67424-10.83392 90.99264-31.72352 25.32352-20.8896 38.77376-47.19616 38.77376-78.14144v-23.20896z"/>
            </svg>
          </button>
          <button class="icon-button" data-find-action="whole-word" title="查找整个单词" aria-label="查找整个单词" style="${state.searchWholeWord ? 'background:#3b82f6;color:#ffffff;border-radius:var(--radius-sm);' : ''}">
            <svg viewBox="0 0 1024 1024" width="16" height="16" fill="${state.searchWholeWord ? '#ffffff' : 'currentColor'}">
              <path d="M243.7 385.6L142.8 642.9h51l21.8-58.7h100.2l22.5 58.7h54.1L288.3 385.6h-44.6z m-12.3 155l33.4-90.3 34.5 90.3h-67.9z m705.7-382.7H138c-25.7-1.1-44.3-2.6-69 4C34.8 173.8 0 211 0 243.8v542.3C0 825.8 51.6 867 91.4 867h844.3c39.7 0 88.4-42.2 88.4-81.9V240.8c-0.6-39.7-37.8-82.9-87-82.9z m43.7 605.8c0 39.7-25.3 54.8-65 54.8H111.2c-39.7 0-65.1-15-65.1-54.8l1.6-496.3c0-39.7 27.7-65 67.4-65h800.7c39.7 0 65 25.3 65 65v496.3zM579 509.3c19.2-11 28.8-28.4 28.8-52 0-22.7-8.6-40.4-25.8-52.9-17.2-12.5-39.5-18.8-67-18.8h-93.2v257.3h102.6c30.7 0 54.5-6.6 71.5-19.7s25.5-31.3 25.5-54.5c0.2-29.5-14-49.3-42.4-59.4z m-107.2-79.4h38.3c14.1 0 25.1 2.5 33 7.6 8 5 12 12.3 12 21.6 0 9.6-4 17.3-12.1 23-8.1 5.7-19 8.6-32.9 8.6h-38.3v-60.8zM556 590.2c-8.3 5.6-20.2 8.4-35.7 8.4h-48.5v-65.4H520c15.7 0 27.7 2.9 36 8.8s12.5 13.9 12.5 24.3c0 10.3-4.2 18.2-12.5 23.9z m179.8-151.9c10.3-7 22-10.5 35.2-10.5 12.4 0 23.1 3.3 32.2 9.8 9 6.6 16.2 15.7 21.6 27.4l42.5-24.6c-6.3-17.3-17.9-31.6-34.8-42.7-16.9-11.1-37-16.7-60.5-16.7-22.7 0-43.5 5.5-62.4 16.5s-33.7 26.6-44.6 46.8c-10.9 20.2-16.3 43.4-16.3 69.6s5.5 49.5 16.5 69.8c11 20.3 25.9 35.9 44.6 46.9 18.7 11 39.5 16.5 62.2 16.5 23.4 0 43.6-5.6 60.5-16.7s28.5-25.4 34.8-42.7l-42.5-24.6c-5.4 11.7-12.6 20.9-21.6 27.4-9 6.6-19.7 9.8-32.2 9.8-13.1 0-24.8-3.5-35.2-10.5-10.3-7-18.5-17.1-24.4-30.2s-9-28.4-9-45.7c0-17.3 3-32.5 9-45.5s14.1-23.1 24.4-30.1z"/>
            </svg>
          </button>
          <span data-find-count>${renderFindCount()}</span>
          <button class="icon-button" data-find-action="prev" title="上一个" aria-label="上一个">${icon("ChevronUp")}</button>
          <button class="icon-button" data-find-action="next" title="下一个" aria-label="下一个">${icon("ChevronDown")}</button>
          ${state.showReplace ? `
          <div class="find-input-wrapper">
            <input data-replace-input aria-label="替换" placeholder="替换" value="${escapeHtml(state.replaceQuery)}" />
            ${state.replaceQuery ? `<button class="icon-button find-clear" data-find-action="clear-replace" title="清除" aria-label="清除">${icon("X")}</button>` : ''}
          </div>
          <button class="icon-button" data-find-action="replace" title="替换当前" aria-label="替换当前">
            <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
              <path d="M289.109333 167.765333L149.333333 533.333333h64l33.28-91.648h153.088L432.981333 533.333333h64L357.205333 167.765333h-68.096zM264.533333 392.533333l57.856-160.256h2.048l57.344 160.256H264.533333zM590.506667 509.098667V874.666667h167.936c38.912 0 69.632-7.168 91.136-21.504C874.666667 835.754667 887.466667 808.618667 887.466667 771.754667c0-24.576-6.144-44.544-17.92-58.88-12.288-14.848-30.208-24.576-54.272-29.184 18.432-7.168 32.256-16.896 41.984-30.208 9.728-14.336 14.848-31.744 14.848-52.224 0-27.648-9.728-49.664-28.672-66.048-20.48-17.408-49.152-26.112-85.504-26.112H590.506667z m59.904 49.152h92.672c24.576 0 41.984 4.096 53.248 12.288 10.24 7.68 15.872 20.48 15.872 37.888 0 18.944-5.632 32.768-15.872 41.472-10.752 8.192-28.672 12.8-54.272 12.8h-91.648v-104.448z m0 153.6h100.864c26.624 0 46.08 4.608 58.368 13.824 11.776 9.216 17.92 24.064 17.92 45.056 0 20.48-8.192 34.816-24.576 44.032-12.8 7.168-30.72 10.752-53.248 10.752h-99.328v-113.664zM498.645333 798.613333a32 32 0 0 1-22.656 39.189334 213.226667 213.226667 0 0 1-206.101333-55.253334 213.226667 213.226667 0 0 1-55.402667-205.482666 32 32 0 0 1 61.866667 16.341333 149.226667 149.226667 0 0 0 38.784 143.893333 149.248 149.248 0 0 0 144.341333 38.677334 32 32 0 0 1 39.168 22.634666z"/>
              <path d="M576 800L384 896v-192z"/>
            </svg>
          </button>
          <button class="icon-button" data-find-action="replace-all" title="全部替换" aria-label="全部替换">
            <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
              <path d="M6.68,1 L1,15.86 L3.6,15.86 L4.95,12.13 L11.18,12.13 L12.53,15.86 L15.13,15.86 L9.45,1 L6.68,1 Z M5.68,10.14 L8.03,3.62 L8.12,3.62 L10.45,10.14 L5.68,10.14 Z M18.93,14.87 L18.93,29.73 L25.76,29.73 C27.34,29.73 28.59,29.44 29.46,28.86 C30.48,28.15 31,27.05 31,25.55 C31,24.55 30.75,23.74 30.27,23.15 C29.77,22.55 29.04,22.16 28.07,21.97 C28.82,21.68 29.38,21.28 29.77,20.74 C30.17,20.16 30.38,19.45 30.38,18.62 C30.38,17.49 29.98,16.6 29.21,15.93 C28.38,15.23 27.21,14.87 25.74,14.87 L18.93,14.87 Z M21.37,16.87 L25.13,16.87 C26.13,16.87 26.84,17.04 27.3,17.37 C27.71,17.68 27.94,18.2 27.94,18.91 C27.94,19.68 27.71,20.24 27.3,20.6 C26.86,20.93 26.13,21.12 25.09,21.12 L21.37,21.12 L21.37,16.87 Z M21.37,23.11 L25.46,23.11 C26.55,23.11 27.34,23.3 27.84,23.68 C28.32,24.05 28.57,24.65 28.57,25.51 C28.57,26.34 28.23,26.92 27.57,27.3 C27.05,27.59 26.32,27.73 25.4,27.73 L21.37,27.73 L21.37,23.11 Z M15.2,26.64 C15.38,27.33 14.97,28.05 14.28,28.23 C11.28,29.04 8.09,28.18 5.9,25.99 C3.71,23.8 2.86,20.62 3.65,17.64 C3.84,16.95 4.55,16.55 5.23,16.73 C5.92,16.91 6.33,17.61 6.16,18.3 C5.61,20.39 6.21,22.62 7.74,24.15 C9.27,25.68 11.51,26.28 13.61,25.72 C14.3,25.53 15.01,25.95 15.2,26.64 Z"/>
              <path d="M18.34,26.7L10.54,30.6L10.54,22.79z"/>
              <path d="M15.79,12.7 L19.14,3.3 L20.75,3.3 L24.1,12.7 L22.7,12.7 L21.81,10.08 L18.02,10.08 L17.12,12.7 Z M21.45,9.01 L19.92,4.58 L18.39,9.01 Z"/>
              <path d="M25.39,11.5 L27.69,4.6 L28.8,4.6 L31.1,11.5 L30.14,11.5 L29.53,9.58 L26.92,9.58 L26.3,11.5 Z M29.28,8.79 L28.23,5.54 L27.18,8.79 Z"/>
            </svg>
          </button>
          ` : ''}
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
          <button class="icon-button" data-command="video" title="视频" aria-label="视频">
            <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M624.32 484.48a32 32 0 0 1 0 55.04l-160 96A32 32 0 0 1 416 608V416a32 32 0 0 1 48.32-27.52zM480 472.64v78.72L545.92 512z"/>
              <path d="M896 768V256H128v512z m0 64H128a64 64 0 0 1-64-64V256a64 64 0 0 1 64-64h768a64 64 0 0 1 64 64v512a64 64 0 0 1-64 64z"/>
              <path d="M192 224a32 32 0 0 1 64 0v544a32 32 0 0 1-64 0z"/>
              <path d="M224 384a32 32 0 0 1 0 64H96a32 32 0 0 1 0-64z m0 192a32 32 0 0 1 0 64H96a32 32 0 0 1 0-64z m544-352a32 32 0 0 1 64 0v544a32 32 0 0 1-64 0z"/>
              <path d="M800 448a32 32 0 0 1 0-64h128a32 32 0 0 1 0 64z m0 192a32 32 0 0 1 0-64h128a32 32 0 0 1 0 64z"/>
            </svg>
          </button>
          ${toolButton("markdown-link", "FileInput", "插入 Markdown 文件")}
          ${toolButton("formula", "Sigma", "块级公式")}
          <button class="icon-button" data-command="inline-formula" title="行内公式" aria-label="行内公式">
            <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M413.866667 189.44c36.650667 0 75.264 6.656 115.797333 19.968l-23.338667 85.418667-10.453333-3.413334c-23.893333-7.424-43.562667-11.178667-59.136-11.178666-13.610667 0-23.722667 4.309333-30.421333 12.928-4.437333 5.546667-9.002667 20.138667-13.738667 43.733333l-6.656 31.274667h84.565333l-18.346666 87.466666H367.616L293.418667 810.666667H173.824l74.197333-354.986667H181.333333l18.346667-87.509333h66.645333l9.6-45.44 2.304-10.794667c6.912-31.317333 13.525333-52.864 19.754667-64.597333 9.472-17.792 23.552-31.872 42.325333-42.282667 18.730667-10.410667 43.264-15.658667 73.514667-15.658667zM555.392 512l64.426667 95.957333L683.008 512h75.093333l-99.882666 145.066667L768 810.666667h-78.208l-71.253333-103.253334L547.114667 810.666667H469.333333l109.781334-155.861334L479.616 512h75.818667z"/>
            </svg>
          </button>
          ${toolButton("mermaid", "Workflow", "Mermaid")}
          ${toolButton("emoji", "Smile", "表情")}
          <button class="icon-button" data-command="details" title="折叠块" aria-label="折叠块">
            <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M867.1 141.17H156.08c-17.67 0-32 14.33-32 32s14.33 32 32 32H867.1c17.67 0 32-14.33 32-32s-14.33-32-32-32zM867.92 367.52H403.2c-17.67 0-32 14.33-32 32s14.33 32 32 32h464.73c17.67 0 32-14.33 32-32s-14.33-32-32.01-32zM867.92 573.87H403.2c-17.67 0-32 14.33-32 32s14.33 32 32 32h464.73c17.67 0 32-14.33 32-32s-14.33-32-32.01-32zM867.92 800.22H156.9c-17.67 0-32 14.33-32 32s14.33 32 32 32h711.02c17.67 0 32-14.33 32-32 0-17.68-14.32-32-32-32zM137.47 637.87V367.52l174.54 148.15z"/>
            </svg>
          </button>
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
      menuItem("print-document", "打印", "Ctrl+P"),
      menuSeparator(),
      menuItem("settings", "配置"),
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
      menuSubmenu("查找和替换", [
        menuItem("focus-search", "查找...", "Ctrl+F"),
        menuItem("find-next", "查找下一个", "F3"),
        menuItem("find-prev", "查找上一个", "Shift+F3"),
        menuItem("focus-replace", "替换", "Ctrl+H"),
      ]),
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
      menuSubmenu("警告框", [
        menuItem("callout-note", "提醒内容"),
        menuItem("callout-tip", "建议信息"),
        menuItem("callout-important", "重要信息"),
        menuItem("callout-warning", "警告内容"),
        menuItem("callout-caution", "注意内容"),
      ]),
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
      menuItem("video", "视频"),
      menuItem("markdown-link", "Markdown 文件"),
      menuItem("table", "表格"),
      menuItem("formula", "块级公式"),
      menuItem("inline-formula", "行内公式"),
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
      menuSeparator(),
      menuItem("source-view", "源码模式", "Ctrl+/", state.editorMode === "source"),
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
  document.querySelector("[data-replace-input]")?.addEventListener("input", handleReplaceInput);
  document.querySelector("[data-replace-input]")?.addEventListener("keydown", handleReplaceKeydown);
  document.querySelectorAll("[data-find-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.findAction;
      console.log("find-action clicked:", action);
      if (action === "prev" || action === "next") {
        navigateFindResult(action === "prev" ? -1 : 1);
      } else if (action === "replace") {
        replaceCurrentMatch();
      } else if (action === "replace-all") {
        replaceAllMatches();
      } else if (action === "case-sensitive") {
        state.searchCaseSensitive = !state.searchCaseSensitive;
        updateFindState(state.searchQuery, true);
        render();
      } else if (action === "whole-word") {
        state.searchWholeWord = !state.searchWholeWord;
        updateFindState(state.searchQuery, true);
        render();
      } else if (action === "clear-find") {
        state.searchQuery = "";
        updateFindState("", true);
        render();
      } else if (action === "clear-replace") {
        state.replaceQuery = "";
        render();
      }
    });
  });
  document.addEventListener("keydown", handleGlobalEscape);
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
  document.querySelector("#tiptapEditor")?.addEventListener("dblclick", handleVideoDoubleClick, { capture: true });
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
      openSettingsModal,
      printDocument,
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

  const rootPath = state.workspaceAdapter?.getWorkspaceInfo?.()?.rootPath || "";
  const fullBasePath = isLocalAbsolutePath(state.selectedPath) 
    ? state.selectedPath 
    : (rootPath ? `${rootPath.replace(/\\/g, "/").replace(/\/$/, "")}/${state.selectedPath}` : state.selectedPath);

  if (state.editorMode === "source") {
    const markdown = getSourceText(state.selectedPath);
    const parsed = hydrateImagePreviews(parseMarkdown(markdown), state.files, {
      basePath: fullBasePath,
    });
    state.documents[state.selectedPath] = isTauriRuntime()
      ? await hydrateLocalImagePreviews(parsed, loadLocalImageResource, { basePath: fullBasePath })
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
    basePath: fullBasePath,
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
      ? await hydrateLocalImagePreviews(parsed, loadLocalImageResource, { basePath: path })
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
  if (event.key === "Escape") {
    if (state.showReplace) {
      state.showReplace = false;
      render();
      document.querySelector("[data-find-input]")?.focus();
    }
    return;
  }
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  navigateFindResult(event.shiftKey ? -1 : 1);
}

function handleReplaceInput(event) {
  state.replaceQuery = event.target.value;
}

function handleReplaceKeydown(event) {
}

function handleGlobalEscape(event) {
  if (event.key === "Escape" && state.showReplace) {
    state.showReplace = false;
    render();
    document.querySelector("[data-find-input]")?.focus();
  }
}

function replaceCurrentMatch() {
  if (!state.searchMatches.length || state.activeSearchIndex < 0) {
    return;
  }

  const sourceEditor = document.querySelector(".source-editor");
  if (sourceEditor) {
    replaceSourceMatch(sourceEditor);
    return;
  }

  replaceVisualMatch();
}

function replaceSourceMatch(sourceEditor) {
  const match = state.searchMatches[state.activeSearchIndex];
  if (!match) {
    return;
  }

  const text = sourceEditor.value;
  const before = text.slice(0, match.from);
  const after = text.slice(match.to);
  sourceEditor.value = before + state.replaceQuery + after;

  const newCursorPos = match.from + state.replaceQuery.length;
  sourceEditor.setSelectionRange(newCursorPos, newCursorPos);
  sourceEditor.focus();

  updateFindState(state.searchQuery, true);
}

function replaceVisualMatch() {
  console.log("replaceVisualMatch called");
  if (!editor) {
    console.log("replaceVisualMatch: editor is null");
    return;
  }

  let matchIndex = state.activeSearchIndex;
  if (matchIndex < 0 && state.searchMatches.length > 0) {
    matchIndex = 0;
  }

  const match = state.searchMatches[matchIndex];
  if (!match) {
    console.log("replaceVisualMatch: no match found");
    return;
  }

  const replace = state.replaceQuery;

  const tr = editor.state.tr;
  tr.deleteRange(match.from, match.to);
  tr.insertText(replace, match.from);
  editor.view.dispatch(tr);

  updateFindState(state.searchQuery, true);
}

function replaceAllMatches() {
  if (!state.searchMatches.length) {
    return;
  }

  const sourceEditor = document.querySelector(".source-editor");
  if (sourceEditor) {
    replaceAllSourceMatches(sourceEditor);
    return;
  }

  replaceAllVisualMatches();
}

function replaceAllSourceMatches(sourceEditor) {
  let text = sourceEditor.value;
  const query = state.searchQuery;
  const replace = state.replaceQuery;

  text = text.split(query).join(replace);
  sourceEditor.value = text;
  sourceEditor.focus();

  updateFindState(state.searchQuery, true);
}

function replaceAllVisualMatches() {
  console.log("replaceAllVisualMatches called");
  if (!editor || !state.searchMatches.length) {
    console.log("replaceAllVisualMatches: editor=", editor, "matches=", state.searchMatches.length);
    return;
  }

  const replace = state.replaceQuery;

  const changes = [...state.searchMatches];
  changes.sort((a, b) => b.from - a.from);
  
  console.log("replaceAllVisualMatches: found", changes.length, "changes");
  
  const tr = editor.state.tr;
  
  for (const change of changes) {
    tr.deleteRange(change.from, change.to);
    tr.insertText(replace, change.from);
  }
  
  editor.view.dispatch(tr);

  updateFindState(state.searchQuery, true);
}

function updateFindState(query, keepActive = false) {
  state.searchQuery = query;
  const sourceEditor = document.querySelector(".source-editor");
  if (sourceEditor) {
    state.searchMatches = findTextMatches(sourceEditor.value, query, {
      caseSensitive: state.searchCaseSensitive,
      wholeWord: state.searchWholeWord,
    });
  } else if (editor) {
    state.searchMatches = findMatchesInDoc(editor.state.doc, query, {
      caseSensitive: state.searchCaseSensitive,
      wholeWord: state.searchWholeWord,
    });
  } else {
    state.searchMatches = [];
  }
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

function findMatchesInDoc(doc, query, options) {
  const { caseSensitive = false, wholeWord = false } = options;
  const needle = query.trim();
  if (!needle) {
    return [];
  }

  const matches = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      let text = node.text;
      let searchText = caseSensitive ? text : text.toLowerCase();
      let searchNeedle = caseSensitive ? needle : needle.toLowerCase();
      let index = searchText.indexOf(searchNeedle);

      while (index !== -1) {
        if (wholeWord) {
          const prevChar = index > 0 ? text[index - 1] : '';
          const nextChar = index + needle.length < text.length ? text[index + needle.length] : '';
          const isWordChar = (char) => /[a-zA-Z0-9_]/.test(char);
          if (!isWordChar(prevChar) && !isWordChar(nextChar)) {
            matches.push({ from: pos + index, to: pos + index + needle.length });
          }
        } else {
          matches.push({ from: pos + index, to: pos + index + needle.length });
        }
        index = searchText.indexOf(searchNeedle, index + needle.length);
      }
    }
    return true;
  });

  return matches;
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

window.navigateFindResult = navigateFindResult;

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

  if (!editor || !("Highlight" in window) || !CSS.highlights) {
    return;
  }

  ensureFindHighlightStyles();
  const ranges = state.searchMatches
    .map((match) => createRangeFromPMPositions(match.from, match.to))
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

function createRangeFromPMPositions(from, to) {
  try {
    const $from = editor.state.doc.resolve(from);
    const $to = editor.state.doc.resolve(to);
    
    const range = document.createRange();
    
    const fromNode = editor.view.domAtPos(from);
    const toNode = editor.view.domAtPos(to);
    
    range.setStart(fromNode.node, fromNode.offset);
    range.setEnd(toNode.node, toNode.offset);
    
    return range;
  } catch (e) {
    console.warn("createRangeFromPMPositions error:", e);
    return null;
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
  const markdown = "";
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
    hydrateDocument: isTauriRuntime() ? (doc, options) => hydrateLocalImagePreviews(doc, loadLocalImageResource, options) : null,
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
    const rootPath = workspaceAdapter?.getWorkspaceInfo?.()?.rootPath || "";
    state.documents = await hydrateDocumentMapLocalImages(state.documents, loadLocalImageResource, rootPath);
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

async function createDetailsBlock(editorInstance) {
  const currentEditor = editorInstance || editor;
  if (!currentEditor) return;

  const { selection } = currentEditor.state;

  let selectedContent = [];
  if (!selection.empty) {
    const slice = currentEditor.state.doc.slice(selection.from, selection.to);
    selectedContent = slice.toJSON()?.content || [];
  }

  const summaryText = await openTextInputModal({
    title: "创建折叠详情块",
    label: "总结文字",
    placeholder: "请输入折叠行的总结文字",
  });

  if (!summaryText) return;

  const detailsNode = {
    type: "details",
    content: [
      {
        type: "detailsSummary",
        content: [{ type: "text", text: summaryText }],
      },
      {
        type: "detailsContent",
        content: selectedContent.length > 0 ? selectedContent : [{ type: "paragraph" }],
      },
    ],
  };

  if (!selection.empty) {
    currentEditor.chain().focus().deleteSelection().run();
  }

  currentEditor.commands.insertContent(detailsNode);

  const raf = globalThis.requestAnimationFrame;
  raf?.(() => {
    const detailsEls = currentEditor.view.dom.querySelectorAll('[data-type="details"]');
    const lastDetails = detailsEls[detailsEls.length - 1];
    if (lastDetails && !lastDetails.classList.contains("is-open")) {
      lastDetails.querySelector("button")?.click();
    }
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
    openVideoInsertPanel,
    insertMarkdownLink,
    insertParagraphAroundSelection,
    insertFootnote,
    requestAnimationFrame,
    createDetailsBlock,
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

  const headingEls = document.querySelectorAll("#tiptapEditor .ProseMirror h1, #tiptapEditor .ProseMirror h2, #tiptapEditor .ProseMirror h3, #tiptapEditor .ProseMirror h4, #tiptapEditor .ProseMirror h5, #tiptapEditor .ProseMirror h6");
  const targetHeading = headingEls[index];
  if (!targetHeading) {
    return;
  }

  const targetLevel = parseInt(targetHeading.tagName.charAt(1));
  let needsExpand = false;

  for (let i = 0; i < index; i++) {
    const h = headingEls[i];
    const level = parseInt(h.tagName.charAt(1));
    if (level < targetLevel) {
      const toggle = h.querySelector(".heading-collapse-toggle");
      if (toggle && toggle.classList.contains("collapsed")) {
        toggle.click();
        needsExpand = true;
      }
    }
  }

  const scrollToTarget = () => {
    const updatedHeadingEls = document.querySelectorAll("#tiptapEditor .ProseMirror h1, #tiptapEditor .ProseMirror h2, #tiptapEditor .ProseMirror h3, #tiptapEditor .ProseMirror h4, #tiptapEditor .ProseMirror h5, #tiptapEditor .ProseMirror h6");
    const updatedTarget = updatedHeadingEls[index];
    if (updatedTarget) {
      const scrollContainer = document.querySelector("article.editor");
      if (scrollContainer) {
        const scrollTarget = updatedTarget.offsetTop - scrollContainer.offsetTop - scrollContainer.clientHeight / 2 + updatedTarget.clientHeight / 2;
        scrollContainer.scrollTop = Math.max(0, scrollTarget);
      }
    }
  };

  if (needsExpand) {
    setTimeout(() => {
      scrollToTarget();
    }, 300);
  } else {
    scrollToTarget();
  }
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
  setTimeout(() => {
    editor?.view?.dom?.focus();
  }, 200);
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
  return ["blockMath", "inlineMath", "mermaidDiagram", "image", "video"].includes(node.type.name);
}

function editSelectedObject(node, pos) {
  if (node.type.name === "blockMath" || node.type.name === "inlineMath") {
    editMathNode(node.type.name, node, pos);
  } else if (node.type.name === "mermaidDiagram") {
    editMermaidNode(node, pos);
  } else if (node.type.name === "image") {
    editImageSize(node, pos, getSelectedImageElement());
  } else if (node.type.name === "video") {
    editVideoSize(node, pos, getSelectedVideoElement());
  }
}

function getSelectedImageElement() {
  return document.querySelector("#tiptapEditor .ProseMirror img.ProseMirror-selectednode");
}

function getSelectedVideoElement() {
  return document.querySelector("#tiptapEditor .ProseMirror video.ProseMirror-selectednode");
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
    title: "编辑 Mermaid 图表",
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

function handleVideoDoubleClick(event) {
  if (!editor || event.target.tagName !== "VIDEO") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (event.target.requestFullscreen) {
    event.target.requestFullscreen();
  }
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

async function editVideoSize(node, pos, videoElement = null) {
  const originalWidth = node.attrs.originalWidth || videoElement?.videoWidth || node.attrs.width || null;
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

function openSettingsModal() {
  openSettingsModalDialog().then((saved) => {
    if (saved) {
      render();
    }
  });
}

async function printDocument() {
  if (!state.selectedPath) {
    openMessageModal({ title: "无法打印", message: "请先打开一个 Markdown 文档。" });
    return;
  }

  syncSelectedDocumentToState();
  if (state.editorMode === "source") {
    state.editorMode = "visual";
    render();
    await waitForNextFrame();
    await waitForMilliseconds(250);
  }

  const documentHtml = await getPrintableDocumentHtml();
  if (!documentHtml) {
    openMessageModal({ title: "无法打印", message: "请先打开一个 Markdown 文档。" });
    return;
  }

  const title = fileName(state.selectedPath).replace(/\.md$/i, "");
  const html = buildPdfExportHtml({
    title,
    documentHtml,
    options: { includeTitle: true, paper: "A4", orientation: "portrait" },
  });

  printPdfHtml(html, () => {
    openMessageModal({ title: "打印失败", message: "无法打印文档。" });
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
  const videoNodes = collectVideoNodes(doc);
  const markdownLinks = collectLocalMarkdownLinkTargets(doc);
  const markdownName = fileName(state.selectedPath);
  const originalMarkdown = serializeMarkdown(doc, { basePath: state.selectedPath });

  if (!imageNodes.length && !videoNodes.length && !markdownLinks.length) {
    const savedPath = await saveTextExport(markdownName, originalMarkdown);
    if (savedPath) {
      await openMessageModal({ title: "导出完成", message: "Markdown 已保存到：\n" + savedPath });
    }
    return;
  }

  const confirmed = await openConfirmModal({
    title: "打包当前文档",
    message: "当前文档包含 " + imageNodes.length + " 个图片引用、" + videoNodes.length + " 个视频引用和 " + markdownLinks.length + " 个本地 Markdown 链接。PME 将递归收集关联文档、图片和视频并重写包内链接。原始文件不会被修改。",
    confirmLabel: "开始打包",
    cancelLabel: "取消",
  });
  if (!confirmed) {
    return;
  }

  const packageResult = await buildMarkdownPackage({
    doc,
    imageNodes,
    videoNodes,
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

function openVideoInsertPanel() {
  if (!editor) {
    return;
  }

  openVideoInsertModal().then(async (result) => {
    if (!result) {
      return;
    }

    if (result.kind === "files") {
      await insertVideoFiles(result.files, { scale: result.scale });
    } else if (result.kind === "url") {
      await insertNetworkVideo(result.url, { scale: result.scale });
    } else if (result.kind === "asset") {
      await insertVideoAsset(result.asset, { scale: result.scale });
    } else if (result.kind === "assets") {
      for (const asset of result.assets) {
        await insertVideoAsset(asset, { scale: result.scale });
      }
    }
  });
}

async function insertNetworkVideo(url, options = {}) {
  if (!editor) {
    return;
  }

  const scale = normalizeImageScale(options.scale);
  const originalWidth = scale ? await getVideoIntrinsicWidth(url) : null;
  const width = getScaledImageWidth(scale, originalWidth);
  editor.chain().focus().setVideo({
    src: url,
    controls: true,
    ...(width ? { width, scale, originalWidth } : {}),
  }).run();
}

async function insertVideoFiles(videoFiles, options = {}) {
  for (const file of videoFiles) {
    const previewUrl = URL.createObjectURL(file);
    const assetPath = file.path ? file.path.replace(/\\/g, "/") : (file.name || "video.mp4");
    const scale = normalizeImageScale(options.scale);
    const originalWidth = scale ? await getVideoIntrinsicWidth(previewUrl) : null;
    const width = getScaledImageWidth(scale, originalWidth);
    editor.chain().focus().setVideo({
      src: previewUrl,
      assetSrc: assetPath,
      controls: true,
      ...(width ? { width, scale, originalWidth } : {}),
    }).run();
  }
}

async function insertVideoAsset(asset, options = {}) {
  if (!editor) {
    return;
  }

  const scale = normalizeImageScale(options.scale);
  const originalWidth = scale ? await getVideoIntrinsicWidth(asset.previewUrl) : null;
  const width = getScaledImageWidth(scale, originalWidth);
  editor.chain().focus().setVideo({
    src: asset.previewUrl,
    assetSrc: asset.assetPath,
    controls: true,
    ...(width ? { width, scale, originalWidth } : {}),
  }).run();
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
  if (imageFiles.length) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    insertImageFiles(imageFiles, { embedDataUrl: true });
    return;
  }

  const text = event.clipboardData?.getData("text/plain");
  if (text) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const parsed = parseMarkdown(text);
    if (parsed.content && parsed.content.length > 0) {
      editor.chain().focus().insertContent(parsed).run();
    } else {
      editor.chain().focus().insertContent(text).run();
    }
  }
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
