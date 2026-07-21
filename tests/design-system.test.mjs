import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const stylesDir = new URL("../src/styles/", import.meta.url);
const styles = readdirSync(stylesDir)
  .filter((f) => f.endsWith(".css"))
  .sort()
  .map((f) => readFileSync(new URL(f, stylesDir), "utf8"))
  .join("\n");
const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../src/ui/modals.mjs", import.meta.url), "utf8");
const imageInsertModalSource = readFileSync(new URL("../src/ui/image-insert-modal.mjs", import.meta.url), "utf8");
const paragraphActionsSource = readFileSync(new URL("../src/editor/paragraph-actions.mjs", import.meta.url), "utf8");
const editorCommandRunnerSource = readFileSync(new URL("../src/editor/editor-command-runner.mjs", import.meta.url), "utf8");
const workspaceSessionSource = readFileSync(new URL("../src/core/workspace-session.mjs", import.meta.url), "utf8");

test("defines the Notion-inspired design tokens used by PME", () => {
  assert.equal(styles.includes("--color-primary: #292524;"), true);
  assert.equal(styles.includes("--color-surface: #f5f5f5;"), true);
  assert.equal(styles.includes("--radius-md: 8px;"), true);
  assert.equal(styles.includes("--radius-lg: 12px;"), true);
  assert.equal(styles.includes("--shadow-modal: rgba(0, 0, 0, 0.12) 0px 16px 48px -8px;"), true);
});

test("does not keep the previous blue primary color in the app theme", () => {
  assert.equal(styles.includes("#245f87"), false);
});

test("keeps document tabs light instead of black pill tabs", () => {
  const activeTabRule = styles.match(/\.tab--active\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(activeTabRule.includes("var(--color-ink-deep)"), false);
  assert.equal(activeTabRule.includes("var(--color-canvas)"), true);
});

test("keeps tab hover on the whole tab instead of the inner label button", () => {
  const tabHoverRule = styles.match(/\.tab:hover\s*\{[^}]+\}/)?.[0] || "";
  const tabSelectHoverRule = styles.match(/\.tab__select:hover\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(tabHoverRule.includes("var(--color-surface-strong)"), true);
  assert.equal(tabSelectHoverRule.includes("transparent"), true);
});

test("styles image insert modal controls with the design system", () => {
  assert.equal(styles.includes(".image-modal__url-row button"), true);
  assert.equal(styles.includes(".image-file-picker"), true);
  assert.equal(styles.includes(".image-modal__preview"), true);
  assert.equal(styles.includes(".image-modal__actions"), true);
  assert.equal(styles.includes(".image-modal__size-row"), true);
});

test("styles the generated table of contents block", () => {
  assert.equal(styles.includes(".table-of-contents"), true);
  assert.equal(styles.includes(".table-of-contents__item"), true);
  assert.equal(styles.includes(".table-of-contents__empty"), true);
});

test("keeps image insert modal focused on local and network sources", () => {
  const bodyRule = styles.match(/\.image-modal__body\s*\{[^}]+\}/)?.[0] || "";
  const sourcesRule = styles.match(/\.image-modal__sources\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(bodyRule.includes("overflow: hidden;"), true);
  assert.equal(sourcesRule.includes("min-height: 0;"), true);
  assert.equal(imageInsertModalSource.includes("data-asset-index"), false);
  assert.equal(imageInsertModalSource.includes("getImageAssetEntries"), false);
});

test("prevents button labels from wrapping", () => {
  const buttonRule = styles.match(/button\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(buttonRule.includes("white-space: nowrap;"), true);
});

test("keeps app icon sizing from leaking into rendered Mermaid SVGs", () => {
  assert.equal(/(^|})\s*svg\s*\{[^}]*width:\s*17px[^}]*\}/.test(styles), false);
  assert.equal(styles.includes(".app-menu svg"), true);
  assert.equal(styles.includes(".toolbar svg"), true);
  assert.equal(styles.includes(".ProseMirror .mermaid-diagram__content > svg"), true);
});

test("uses compact form controls inside editor dialogs", () => {
  const compactRule = styles.match(/\.image-modal__url-row input,[\s\S]+?\.code-language-modal__body select\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(compactRule.includes("min-height: 44px;"), true);
});

test("keeps the image scale dialog input at a usable size", () => {
  const imageSizeModalMarkup = modalSource.match(/function openImageSizeModal[\s\S]+?function openTextInputModal/)?.[0] || "";
  const scaleControlRule = styles.match(/\.image-size-modal \.image-modal__scale-control\s*\{[^}]+\}/)?.[0] || "";
  const scaleInputRule = styles.match(/\.image-size-modal \[data-image-scale\]\s*\{[^}]+\}/)?.[0] || "";
  const scaleBodyRule = styles.match(/\.image-size-modal__body\s*\{[^}]+\}/)?.[0] || "";
  const stackedFieldRule = styles.match(/\.image-size-modal \.image-size-field--stacked\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(imageSizeModalMarkup.includes('class="image-size-modal__body"'), true);
  assert.equal(scaleBodyRule.includes("display: grid;"), true);
  assert.equal(stackedFieldRule.includes("align-items: start;"), true);
  assert.equal(scaleControlRule.includes("width: 180px;"), true);
  assert.equal(scaleControlRule.includes("grid-template-columns: minmax(96px, 1fr) auto;"), true);
  assert.equal(scaleInputRule.includes("width: 120px;"), true);
  assert.equal(scaleInputRule.includes("min-height: 36px;"), true);
});

test("inserts paragraphs around selected block nodes instead of raw cursor offsets", () => {
  assert.equal(paragraphActionsSource.includes("function insertParagraphAroundSelection"), true);
  assert.equal(paragraphActionsSource.includes("selection instanceof NodeSelection"), true);
  assert.equal(editorCommandRunnerSource.includes('insertParagraphAroundSelection?.(editor, "above")'), true);
  assert.equal(editorCommandRunnerSource.includes('insertParagraphAroundSelection?.(editor, "below")'), true);
});

test("renders a visual hero welcome page with markdown file actions", () => {
  assert.equal(styles.includes("url(\"./assets/pme-hero.png\")"), true);
  assert.equal(styles.includes(".welcome-hero__actions"), true);
  assert.equal(styles.includes(".hero-button--primary"), true);
  assert.equal(appSource.includes('data-action="open-markdown-file"'), true);
  assert.equal(appSource.includes('data-action="open-folder"'), false);
  assert.equal(appSource.includes("createStandaloneMarkdownDocument"), true);
});

test("starts new markdown files without requiring a project directory", () => {
  assert.equal(appSource.includes("function createStandaloneMarkdownDocument()"), true);
  assert.equal(appSource.includes("state.workspaceAdapter = createWorkspaceAdapter();"), true);
  assert.equal(appSource.includes("createStandaloneMarkdownSession"), true);
  assert.equal(workspaceSessionSource.includes("showFileTree: false"), true);
});

test("keeps recent file menu inside the welcome viewport", () => {
  const recentPanelRule = styles.match(/\.recent-menu__panel\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(recentPanelRule.includes("bottom: calc(100% + 10px);"), true);
  assert.equal(recentPanelRule.includes("max-height: min(320px, calc(100dvh - 160px));"), true);
  assert.equal(recentPanelRule.includes("overflow: auto;"), true);
  assert.equal(appSource.includes("recent-menu__panel"), true);
  assert.equal(appSource.includes('data-recent-workspace="${index}"'), true);
});

test("keeps the sidebar focused on outline instead of an assets tree", () => {
  assert.equal(appSource.includes("tree-asset-preview"), false);
  assert.equal(appSource.includes('icon("Eye")'), false);
  assert.equal(appSource.includes("showFileTree: false"), true);
  assert.equal(appSource.includes("PROJECT"), false);
});

test("uses a Typora-like contextual toolbar for table editing", () => {
  assert.equal(appSource.includes("function renderTableBubbleToolbar()"), true);
  assert.equal(appSource.includes("data-table-bubble"), true);
  assert.equal(appSource.includes("data-table-more"), true);
  assert.equal(appSource.includes('data-command="table-row-before"'), true);
  assert.equal(appSource.includes('data-command="table-column-before"'), true);
  assert.equal(appSource.includes("function updateTableBubbleToolbar"), true);
  assert.equal(appSource.includes("globalThis.Node.ELEMENT_NODE"), true);
  assert.equal(styles.includes(".table-bubble__main"), true);
  assert.equal(styles.includes(".table-bubble.is-menu-open .table-bubble__menu"), true);
});

test("expands the app menus with Typora-inspired usable commands", () => {
  assert.equal(appSource.includes('menuItem("insert-paragraph-above"'), true);
  assert.equal(appSource.includes('menuItem("cut"'), true);
  assert.equal(appSource.includes('menuItem("open-markdown-file"'), true);
  assert.equal(appSource.includes('menuItem("package-document"'), true);
  assert.equal(appSource.includes('menuItem("heading-6"'), true);
  assert.equal(appSource.includes('menuItem("clear-format"'), true);
  assert.equal(appSource.includes('menuItem("toggle-sidebar"'), true);
  assert.equal(appSource.includes("function renderMenuEntry"), true);
  assert.equal(styles.includes(".app-menu__shortcut"), true);
  assert.equal(styles.includes(".app-menu__panel hr"), true);
});

test("exposes Markdown file insertion in the Insert menu and toolbar", () => {
  assert.equal(appSource.includes('menuItem("markdown-link", "Markdown 文件")'), true);
  assert.equal(appSource.includes('toolButton("markdown-link", "FileInput", "插入 Markdown 文件")'), true);
  assert.equal(appSource.includes("FileInput,"), true);
  assert.equal(appSource.includes("FileInput,"), true);
});

test("supports menu-driven view toggles and editor zoom", () => {
  assert.equal(appSource.includes("showSidebar: true"), true);
  assert.equal(appSource.includes("showFileTree: false"), true);
  assert.equal(appSource.includes("showOutline: true"), true);
  assert.equal(appSource.includes("showStatusbar: true"), true);
  assert.equal(appSource.includes("editorZoom: 1"), true);
  assert.equal(appSource.includes("function setEditorZoom"), true);
  assert.equal(styles.includes(".workspace--sidebar-hidden"), true);
  assert.equal(styles.includes(".shell--status-hidden"), true);
  assert.equal(styles.includes("--editor-zoom"), true);
});
