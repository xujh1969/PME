import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const stylesDir = new URL("../src/styles/", import.meta.url);
const styles = readdirSync(stylesDir)
  .filter((f) => f.endsWith(".css"))
  .sort()
  .map((f) => readFileSync(new URL(f, stylesDir), "utf8"))
  .join("\n");
const readStylesheet = (name) => readFileSync(new URL(name, stylesDir), "utf8");
const editorStyles = readStylesheet("editor.css");
const modalStyles = readStylesheet("modals.css");
const variablesStyles = readStylesheet("variables.css");
const welcomeStyles = readStylesheet("welcome.css");
const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../src/ui/modals.mjs", import.meta.url), "utf8");
const imageInsertModalSource = readFileSync(new URL("../src/ui/image-insert-modal.mjs", import.meta.url), "utf8");
const editorPopoversSource = readFileSync(new URL("../src/ui/editor-popovers.mjs", import.meta.url), "utf8");
const configSource = readFileSync(new URL("../src/core/config.mjs", import.meta.url), "utf8");
const settingsModalSource = readFileSync(new URL("../src/ui/settings-modal.mjs", import.meta.url), "utf8");
const paragraphActionsSource = readFileSync(new URL("../src/editor/paragraph-actions.mjs", import.meta.url), "utf8");
const editorCommandRunnerSource = readFileSync(new URL("../src/editor/editor-command-runner.mjs", import.meta.url), "utf8");
const workspaceSessionSource = readFileSync(new URL("../src/core/workspace-session.mjs", import.meta.url), "utf8");
const textCursorSource = readFileSync(new URL("../src/cursors/text.svg", import.meta.url), "utf8");
const handCursorSource = readFileSync(new URL("../src/cursors/hand.svg", import.meta.url), "utf8");

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

test("keeps large editor images from stretching the shell layout", () => {
  const workspaceRule = styles.match(/\.workspace\s*\{[^}]+\}/)?.[0] || "";
  const editorAreaRule = styles.match(/\.editor-area\s*\{[^}]+\}/)?.[0] || "";
  const tabsRule = styles.match(/\.tabs\s*\{[^}]+\}/)?.[0] || "";
  const editorRule = styles.match(/\.editor\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(workspaceRule.includes("height: 100%;"), true);
  assert.equal(workspaceRule.includes("overflow: hidden;"), true);
  assert.equal(editorAreaRule.includes("grid-template-rows: 44px minmax(0, 1fr);"), true);
  assert.equal(editorAreaRule.includes("overflow: hidden;"), true);
  assert.equal(tabsRule.includes("min-height: 44px;"), true);
  assert.equal(editorRule.includes("overflow: auto;"), true);
  assert.equal(editorRule.includes("contain: layout paint;"), true);
});

test("renders color picker swatches from bundled CSS instead of inline styles", () => {
  const colorItemRule = styles.match(/\.color-item\s*\{[^}]+\}/)?.[0] || "";
  const colorItemHoverRule = styles.match(/\.color-item:hover\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(editorPopoversSource.includes('style="background-color:'), false);
  assert.equal(editorPopoversSource.includes("color-item--${index}"), true);
  assert.equal(editorPopoversSource.includes("color-item--highlight-${index}"), true);
  assert.equal(colorItemRule.includes("background: var(--color-swatch) !important;"), true);
  assert.equal(colorItemHoverRule.includes("background: var(--color-swatch) !important;"), true);
  assert.equal(styles.includes(".color-item--6 { --color-swatch: #ff0000; }"), true);
  assert.equal(styles.includes(".color-item--highlight-0 { --color-swatch: #ffff00; }"), true);
});

test("prevents button labels from wrapping", () => {
  const buttonRule = variablesStyles.match(/^button\s*\{[^}]+\}/m)?.[0] || "";

  assert.equal(buttonRule.includes("white-space: nowrap;"), true);
});

test("keeps app icon sizing from leaking into rendered Mermaid SVGs", () => {
  assert.equal(/(^|})\s*svg\s*\{[^}]*width:\s*17px[^}]*\}/.test(styles), false);
  assert.equal(styles.includes(".app-menu svg"), true);
  assert.equal(styles.includes(".toolbar svg"), true);
  assert.equal(styles.includes(".ProseMirror .mermaid-diagram__content > svg"), true);
});

test("keeps same-level outline titles aligned regardless of child toggles", () => {
  const toggleRule = styles.match(/\.outline-item-toggle\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(appSource.includes("outline-item-toggle--placeholder"), true);
  assert.equal(toggleRule.includes("flex: 0 0 16px;"), true);
  assert.equal(toggleRule.includes("min-height: 16px;"), true);
});

test("indents outline arrows together with deeper heading titles", () => {
  assert.equal(appSource.includes("outline-item-row--level-${level}"), true);
  assert.equal(styles.includes(".outline-item-row--level-2 {\n  padding-left: 16px;"), true);
  assert.equal(styles.includes(".outline-item-row--level-3 {\n  padding-left: 32px;"), true);
  assert.equal(styles.includes(".outline-item-row--level-4 {\n  padding-left: 48px;"), true);
  assert.equal(styles.includes(".outline-item-row--level-5 {\n  padding-left: 64px;"), true);
  assert.equal(styles.includes(".outline-item-row--level-6 {\n  padding-left: 80px;"), true);
  assert.equal(styles.includes(".tree .outline-group {\n  display: block;\n  margin: 0;\n  padding: 0;"), true);
  assert.equal(styles.includes(".outline-item--level-3 {\n  padding-left:"), false);
});

test("keeps outline title buttons from covering collapse arrows", () => {
  const itemRule = styles.match(/\.outline-item\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(itemRule.includes("min-width: 0;"), true);
  assert.equal(itemRule.includes("width: 100%;"), false);
});

test("preserves outline collapse state across outline refreshes", () => {
  assert.equal(appSource.includes("collapsedOutlineGroups"), true);
  assert.equal(appSource.includes("state.collapsedOutlineGroups[state.selectedPath]"), true);
  assert.equal(appSource.includes("outline-group--collapsed"), true);
  assert.equal(appSource.includes("collapsedGroups.add(groupId)"), true);
  assert.equal(appSource.includes("collapsedGroups.delete(groupId)"), true);
});

test("guards outline collapse when no document is selected", () => {
  const applyOutlineCollapse = appSource.match(/function applyOutlineCollapse\(level\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.equal(/function applyOutlineCollapse\(level\) \{\r?\n  if \(!state\.selectedPath\) return;/.test(applyOutlineCollapse), true);
});

test("refreshes only the outline after batch collapse", () => {
  const applyOutlineCollapse = appSource.match(/function applyOutlineCollapse\(level\) \{[\s\S]*?\n\}/)?.[0] || "";
  const refreshOutlineView = appSource.match(/function refreshOutlineView\(\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.equal(applyOutlineCollapse.includes("refreshOutlineView();"), true);
  assert.equal(applyOutlineCollapse.includes("render();"), false);
  assert.equal(refreshOutlineView.includes('document.querySelector(".outline-section")'), true);
  assert.equal(refreshOutlineView.includes("outline.innerHTML"), true);
  assert.equal(refreshOutlineView.includes("renderOutlineHeader()"), true);
  assert.equal(refreshOutlineView.includes("render();"), false);
});

test("lets collapsed outline groups override the default visible group rule", () => {
  assert.equal(styles.includes(".tree .outline-group--collapsed {\n  display: none;"), true);
});

test("adds numbered outline collapse buttons beside the outline title", () => {
  const renderOutlineHeader = appSource.match(/function renderOutlineHeader\(\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.equal(renderOutlineHeader.includes("outline-header"), true);
  assert.equal(renderOutlineHeader.includes("outline-collapse-toolbar"), true);
  assert.equal(renderOutlineHeader.includes("data-outline-collapse-level"), true);
  assert.equal(renderOutlineHeader.includes('level === 6 ? "all" : level'), true);
  assert.equal(renderOutlineHeader.includes("[1, 2, 3, 4, 5, 6]"), true);
  assert.equal(appSource.includes('applyOutlineCollapse(level === "all" ? null : Number(level));'), true);
  assert.equal(styles.includes(".outline-header {\n  display: flex;"), true);
  assert.equal(styles.includes("border-radius: 50%;"), true);
});

test("adds independent outline collapse controls to the Paragraph menu", () => {
  const paragraphMenu = appSource.match(/\["段落", \[[\s\S]+?\]\],\r?\n    \["格式"/)?.[0] || "";

  assert.equal(paragraphMenu.includes('menuSubmenu("折叠大纲"'), true);
  [
    "outline-collapse-1",
    "outline-collapse-2",
    "outline-collapse-3",
    "outline-collapse-4",
    "outline-collapse-5",
    "outline-expand-all",
  ].forEach((command) => assert.equal(paragraphMenu.includes(`menuItem("${command}"`), true));
});

test("keeps Mermaid and mind map blocks within the editor content column", () => {
  for (const selector of [".ProseMirror .mermaid-diagram", ".ProseMirror .mindmap-diagram"]) {
    const escapedSelector = selector.replaceAll(".", "\\.");
    const rule = editorStyles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]+\\}`))?.[0] || "";

    assert.equal(rule.includes("width: 100%;"), true);
    assert.equal(rule.includes("margin: 18px 0;"), true);
    assert.equal(rule.includes("user-select: none;"), true);
  }
});

test("uses compact form controls inside editor dialogs", () => {
  const compactRule = styles.match(/\.image-modal__url-row input,[\s\S]+?\.code-language-modal__body select\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(compactRule.includes("min-height: 44px;"), true);
});

test("preserves custom Mermaid zoom values in the editor scale selector", () => {
  assert.equal(modalSource.includes("buildTextEditorScaleOptions(scale)"), true);
  assert.equal(modalSource.includes("if (!values.includes(normalized))"), true);
  assert.equal(modalSource.includes("Math.min(250, Math.max(10, value))"), true);
});

test("keeps the image scale dialog input at a usable size", () => {
  const imageSizeModalMarkup = modalSource.match(/function openImageSizeModal[\s\S]+?function openTextInputModal/)?.[0] || "";
  const scaleInputRule = modalStyles.match(/\.image-size-modal \[data-image-scale\]\s*\{[^}]+\}/)?.[0] || "";
  const scaleBodyRule = modalStyles.match(/\.image-size-modal__body\s*\{[^}]+\}/)?.[0] || "";
  const scaleLabelRule = modalStyles.match(/\.image-size-modal__body label\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(imageSizeModalMarkup.includes('class="image-size-modal__body"'), true);
  assert.equal(scaleBodyRule.includes("display: flex;"), true);
  assert.equal(scaleBodyRule.includes("align-items: center;"), true);
  assert.equal(scaleLabelRule.includes("display: flex;"), true);
  assert.equal(scaleInputRule.includes("width: 100px;"), true);
  assert.equal(scaleInputRule.includes("min-height: 32px;"), true);
});

test("inserts paragraphs around selected block nodes instead of raw cursor offsets", () => {
  assert.equal(paragraphActionsSource.includes("function insertParagraphAroundSelection"), true);
  assert.equal(paragraphActionsSource.includes("selection instanceof NodeSelection"), true);
  assert.equal(editorCommandRunnerSource.includes('insertParagraphAroundSelection?.(editor, "above")'), true);
  assert.equal(editorCommandRunnerSource.includes('insertParagraphAroundSelection?.(editor, "below")'), true);
});

test("renders a visual hero welcome page with markdown file actions", () => {
  assert.equal(welcomeStyles.includes(".welcome__video"), true);
  assert.equal(welcomeStyles.includes(".welcome-hero__actions"), true);
  assert.equal(welcomeStyles.includes(".hero-button--primary"), true);
  assert.equal(appSource.includes('<video class="welcome__video"'), true);
  assert.equal(appSource.includes('<source src="/assets/hero.mp4"'), true);
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
  const recentPanelRule = welcomeStyles.match(/\.recent-menu__panel\s*\{[^}]+\}/)?.[0] || "";

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

test("exposes one button for each heading level in the top Text group", () => {
  const textGroupMarker = appSource.match(/<div class="tool-group">\r?\n\s*<span>文本<\/span>/);
  const textGroupStart = textGroupMarker?.index ?? -1;
  const alignGroupMarker = appSource.match(/<div class="tool-group">\r?\n\s*<span>对齐<\/span>/g)?.[0];
  const alignGroupStart = alignGroupMarker ? appSource.indexOf(alignGroupMarker, textGroupStart) : -1;
  const textGroup = appSource.slice(textGroupStart, alignGroupStart);

  assert.equal(textGroupStart >= 0, true);
  assert.equal(alignGroupStart > textGroupStart, true);
  for (let level = 1; level <= 6; level += 1) {
    const command = `toolButton("heading-${level}"`;
    assert.equal(textGroup.split(command).length - 1, 1);
  }

  const headingSixIndex = textGroup.indexOf('toolButton("heading-6"');
  const paragraphIndex = textGroup.indexOf('toolButton("paragraph"');
  const collapseIndex = textGroup.indexOf('data-command="heading-collapse"');

  assert.equal(paragraphIndex >= 0, true);
  assert.equal(collapseIndex >= 0, true);
  assert.equal(paragraphIndex > headingSixIndex, true);
  assert.equal(collapseIndex > headingSixIndex, true);
});

test("exposes block formatting controls in the floating toolbar", () => {
  const bubbleMenuStart = appSource.indexOf("function renderBubbleMenu()");
  const bubbleMenuEnd = appSource.indexOf("function updateTableBubbleToolbar", bubbleMenuStart);
  const bubbleMenu = appSource.slice(bubbleMenuStart, bubbleMenuEnd);

  assert.equal(bubbleMenu.includes('toolButton("bullet-list", "List"'), true);
  assert.equal(bubbleMenu.includes('toolButton("ordered-list", "ListOrdered"'), true);
  assert.equal(bubbleMenu.includes('toolButton("task-list", "ListChecks"'), true);
  assert.equal(bubbleMenu.includes('toolButton("blockquote", "Quote"'), true);
  assert.equal(bubbleMenu.includes('class="bubble-menu__separator"'), true);
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
  const proseMirrorRule = styles.match(/\.ProseMirror\s*\{[^}]+\}/)?.[0] || "";
  const sourceEditorRule = styles.match(/\.source-editor\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(appSource.includes("showSidebar: true"), true);
  assert.equal(appSource.includes("showFileTree: false"), true);
  assert.equal(appSource.includes("showOutline: true"), true);
  assert.equal(appSource.includes("showStatusbar: true"), true);
  assert.equal(appSource.includes("editorZoom: 1"), true);
  assert.equal(appSource.includes("function setEditorZoom"), true);
  assert.equal(appSource.includes('style.setProperty("--editor-zoom"'), true);
  assert.equal(appSource.includes("function refreshZoomMenuState"), true);
  assert.equal(styles.includes(".workspace--sidebar-hidden"), true);
  assert.equal(styles.includes(".shell--status-hidden"), true);
  assert.equal(styles.includes("--editor-zoom"), true);
  assert.equal(proseMirrorRule.includes("zoom: var(--editor-zoom);"), true);
  assert.equal(proseMirrorRule.includes("font-size: calc("), false);
  assert.equal(sourceEditorRule.includes("zoom: var(--editor-zoom);"), true);
  assert.equal(sourceEditorRule.includes("font: calc("), false);
});

test("shows an editor-scoped table column resize handle", () => {
  const handleRule = editorStyles.match(/\.ProseMirror \.column-resize-handle\s*\{[^}]+\}/)?.[0] || "";
  const cursorRule = editorStyles.match(/\.ProseMirror\.resize-cursor\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(handleRule.includes("position: absolute;"), true);
  assert.equal(handleRule.includes("cursor: col-resize;"), true);
  assert.equal(handleRule.includes("width: 4px;"), true);
  assert.equal(cursorRule.includes("cursor: col-resize;"), true);
});

test("applies selected editor fonts with English first and code isolated", () => {
  const proseMirrorRule = styles.match(/\.ProseMirror\s*\{[^}]+\}/)?.[0] || "";
  const headingRule = styles.match(/\.ProseMirror h1,[\s\S]+?\.ProseMirror h3\s*\{[^}]+\}/)?.[0] || "";
  const inlineCodeRule = styles.match(/\.ProseMirror :not\(pre\) > code\s*\{[^}]+\}/)?.[0] || "";
  const blockCodeRule = styles.match(/\.ProseMirror pre code\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(proseMirrorRule.includes("font-family: var(--font-family-editor-configured, var(--font-editor));"), true);
  assert.equal(headingRule.includes("font-family: var(--font-family-display-configured, var(--font-display));"), true);
  assert.equal(inlineCodeRule.includes("font-family: var(--font-family-code, var(--font-mono));"), true);
  assert.equal(blockCodeRule.includes("font-family: var(--font-family-code, var(--font-mono));"), true);
  assert.equal(configSource.includes("--font-family-editor-configured"), true);
  assert.equal(configSource.includes("--font-family-display-configured"), true);
  assert.equal(configSource.includes("font-family: var(--font-family-code) !important;"), true);
  assert.equal(settingsModalSource.includes("buildEditorFontStack"), true);
});

test("keeps H4 through H6 editor headings at least as large as body text", () => {
  const headingRules = [...styles.matchAll(/\.ProseMirror h[4-6]\s*\{[^}]+\}/g)]
    .map((match) => match[0]);

  assert.equal(headingRules.some((rule) => rule.includes(".ProseMirror h4") && rule.includes("font-size: 1.25rem;")), true);
  assert.equal(headingRules.some((rule) => rule.includes(".ProseMirror h5") && rule.includes("font-size: 1.125rem;")), true);
  assert.equal(headingRules.some((rule) => rule.includes(".ProseMirror h6") && rule.includes("font-size: 1rem;")), true);
});

test("uses one default weight and color for all editor heading levels", () => {
  const headingRule = styles.match(/\.ProseMirror h1,[\s\S]+?\.ProseMirror h6\s*\{[^}]+\}/)?.[0] || "";
  const individualHeadingRules = [...styles.matchAll(/([^{}]+)\{([^}]+)\}/g)]
    .filter((match) => /^\.ProseMirror h[1-6]$/.test(match[1].trim()))
    .map((match) => match[2]);

  assert.equal(headingRule.includes("font-weight: 500;"), true);
  assert.equal(headingRule.includes("color: var(--color-ink);"), true);
  assert.equal(individualHeadingRules.some((rule) => rule.includes("font-weight:")), false);
});

test("matches native cursor contrast to the active app theme", () => {
  const rootRule = styles.match(/:root\s*\{[^}]+\}/)?.[0] || "";
  const darkRule = styles.match(/\[data-theme="dark"\]\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(rootRule.includes("color-scheme: light;"), true);
  assert.equal(darkRule.includes("color-scheme: dark;"), true);
});

test("uses synchronous clipboardData for editor copy events", () => {
  const copyHandler = appSource.match(/async function handleCopy\(event\)[\s\S]+?async function handleEditorClick/)?.[0] || "";
  const selectionSerializer = appSource.match(/function serializeEditorSelection\(selection, state\)[\s\S]+?async function handleEditorClick/)?.[0] || "";
  const cutHandler = appSource.match(/async function handleCut\(event\)[\s\S]+?function handlePasteShortcut/)?.[0] || "";
  const menuCutHandler = appSource.match(/async function cutEditorSelectionAsMarkdown\(\)[\s\S]+?async function pasteMarkdown/)?.[0] || "";

  assert.equal(copyHandler.includes("event.clipboardData"), true);
  assert.equal(copyHandler.includes('event.clipboardData.setData("text/plain", markdown);'), true);
  assert.equal(copyHandler.includes("event.preventDefault();"), true);
  assert.equal(copyHandler.includes("navigator.clipboard.writeText(markdown);"), true);
  assert.equal(copyHandler.includes("serializeEditorSelection(selection, editor.state)"), true);
  assert.equal(copyHandler.includes("getNativeEditorSelectionRange()"), true);
  assert.equal(
    copyHandler.indexOf("getNativeEditorSelectionRange()") < copyHandler.indexOf("selection.empty"),
    true,
  );
  assert.equal(selectionSerializer.includes("parent?.type?.inlineContent"), true);
  assert.equal(selectionSerializer.includes("type: parent.type.name"), true);
  assert.equal(selectionSerializer.includes("function getNativeEditorSelectedText()"), true);
  assert.equal(selectionSerializer.includes("selection.anchorNode"), true);
  assert.equal(selectionSerializer.includes("selection.focusNode"), true);
  assert.equal(selectionSerializer.includes("function getNativeEditorSelectionRange()"), true);
  assert.equal(selectionSerializer.includes("editor.view.posAtDOM"), true);
  assert.equal(selectionSerializer.includes("function deleteEditorSelectionRange(range)"), true);
  assert.equal(cutHandler.includes("getNativeEditorSelectionRange()"), true);
  assert.equal(cutHandler.includes('event.clipboardData.setData("text/plain", markdown);'), true);
  assert.equal(cutHandler.includes("deleteEditorSelectionRange(nativeSelection);"), true);
  assert.equal(
    cutHandler.indexOf("getNativeEditorSelectionRange()") < cutHandler.indexOf("selection.empty"),
    true,
  );
  assert.equal(menuCutHandler.includes("serializeEditorSelection(selection, editor.state)"), true);
  assert.equal(menuCutHandler.includes("deleteEditorSelectionRange(nativeSelection);"), true);
});

test("exposes explicit plain-text copy and cut commands", () => {
  assert.equal(appSource.includes('menuItem("copy-plain", "无格式复制", "Ctrl+Shift+C")'), true);
  assert.equal(appSource.includes('menuItem("cut-plain", "无格式剪切", "Ctrl+Shift+X")'), true);
  assert.equal(appSource.includes('command === "copy-plain"'), true);
  assert.equal(appSource.includes('command === "cut-plain"'), true);
  assert.equal(appSource.includes("copyEditorSelectionAsPlainText()"), true);
  assert.equal(appSource.includes("cutEditorSelectionAsPlainText()"), true);
});

test("preserves document scroll position across tab switches and saves", () => {
  const renderFunction = appSource.match(/function render\(options = \{\}\)[\s\S]+?function renderWelcome/)?.[0] || "";
  const tabBinding = appSource.match(/document\.querySelectorAll\("\[data-tab\]"\)[\s\S]+?function bindTableBubbleEvents/)?.[0] || "";
  const addUntitledTab = appSource.match(/function addNewUntitledTab\(\)[\s\S]+?async function openRecentWorkspace/)?.[0] || "";
  const savePathAdoption = appSource.match(/function adoptSavedMarkdownPath\(savedPath\)[\s\S]+?async function createDetailsBlock/)?.[0] || "";

  assert.equal(appSource.includes("documentScrollPositions: {}"), true);
  assert.equal(appSource.includes("function saveSelectedDocumentScrollPosition()"), true);
  assert.equal(appSource.includes("function restoreSelectedDocumentScrollPosition()"), true);
  assert.equal(renderFunction.includes("saveSelectedDocumentScrollPosition();"), true);
  assert.equal(renderFunction.includes("restoreSelectedDocumentScrollPosition();"), true);
  assert.equal(tabBinding.includes("selectDocumentPath(button.dataset.tab);"), true);
  assert.equal(addUntitledTab.includes("saveSelectedDocumentScrollPosition();"), true);
  assert.equal(addUntitledTab.includes("render({ saveScroll: false });"), true);
  assert.equal(appSource.includes("render({ saveScroll: false });"), true);
  assert.equal(savePathAdoption.includes("state.documentScrollPositions[state.selectedPath] = oldPosition;"), true);
});

test("exposes SVG insertion and editing controls", () => {
  const markdownLinkButtonIndex = appSource.indexOf('toolButton("markdown-link", "FileInput"');
  const svgButtonIndex = appSource.indexOf('toolButton("svg", "SvgBox", "SVG")');
  assert.equal(appSource.includes('toolButton("svg", "SvgBox", "SVG")'), true);
  assert.equal(appSource.includes('if (name === "SvgBox")'), true);
  assert.equal(appSource.includes(">SVG</text>"), true);
  assert.equal(markdownLinkButtonIndex >= 0, true);
  assert.equal(svgButtonIndex > markdownLinkButtonIndex, true);
  assert.equal(appSource.includes('menuItem("svg", "SVG")'), true);
  assert.equal(appSource.includes("handleSvgDoubleClick"), true);
  assert.equal(appSource.includes("openSvgAiModal"), true);
  assert.equal(appSource.includes("return openSvgAiModal({ onChunk, onStart });"), true);
  assert.equal(appSource.includes("scale: node.attrs.scale || 100"), true);
  assert.equal(styles.includes("var(--svg-scale-width, 100%)"), true);
  assert.equal(styles.includes(".svg-diagram"), true);
});

test("keeps editor caret and Mermaid cursor visible on light backgrounds", () => {
  const proseMirrorRule = styles.match(/\.ProseMirror\s*\{[^}]+\}/)?.[0] || "";
  const sourceEditorRule = styles.match(/\.source-editor\s*\{[^}]+\}/)?.[0] || "";
  const mermaidViewportRule = styles.match(/\.ProseMirror \.mermaid-diagram__viewport\s*\{[^}]+\}/)?.[0] || "";
  const mermaidSvgRule = styles.match(/\.ProseMirror \.mermaid-diagram svg\s*\{[^}]+\}/)?.[0] || "";
  const mathRule = styles.match(/\.ProseMirror \.tiptap-mathematics-render\s*\{[^}]+\}/)?.[0] || "";
  const dragHandleRule = styles.match(/\.drag-handle\s*\{[^}]+\}/)?.[0] || "";
  const dragHandleActiveRule = styles.match(/\.drag-handle:active\s*\{[^}]+\}/)?.[0] || "";
  const mermaidPanningRule = styles.match(/\.ProseMirror \.mermaid-diagram__viewport\.is-panning\s*\{[^}]+\}/)?.[0] || "";
  const mindMapDragRule = styles.match(/\.ProseMirror \.mindmap-diagram\.is-drag-mode \.mindmap-diagram__viewport\s*\{[^}]+\}/)?.[0] || "";
  const mindMapDraggingRule = styles.match(/\.ProseMirror \.mindmap-diagram\.is-drag-mode \.mindmap-diagram__viewport:active\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(proseMirrorRule.includes("caret-color: var(--color-ink);"), true);
  assert.equal(styles.includes('--cursor-text: url("../cursors/text.svg") 12 12, text;'), true);
  assert.equal(styles.includes('--cursor-grab: url("../cursors/hand.svg") 12 10, grab;'), true);
  assert.equal(styles.includes('--cursor-grabbing: url("../cursors/hand.svg") 12 10, grabbing;'), true);
  assert.equal(proseMirrorRule.includes("cursor: var(--cursor-text);"), true);
  assert.equal(sourceEditorRule.includes("caret-color: var(--color-ink);"), true);
  assert.equal(sourceEditorRule.includes("cursor: var(--cursor-text);"), true);
  assert.equal(mathRule.includes("cursor: var(--cursor-text);"), true);
  assert.equal(dragHandleRule.includes("cursor: var(--cursor-grab);"), true);
  assert.equal(dragHandleActiveRule.includes("cursor: var(--cursor-grabbing);"), true);
  assert.equal(mermaidPanningRule.includes("cursor: var(--cursor-grabbing);"), true);
  assert.equal(mindMapDragRule.includes("cursor: var(--cursor-grab);"), true);
  assert.equal(mindMapDraggingRule.includes("cursor: var(--cursor-grabbing);"), true);
  assert.equal(mermaidViewportRule.includes("border: 1px solid var(--color-hairline-strong);"), true);
  assert.equal(mermaidViewportRule.includes("cursor: default;"), true);
  assert.equal(mermaidViewportRule.includes("cursor: grab;"), false);
  assert.equal(mermaidSvgRule.includes("cursor: default;"), true);
});

test("uses the requested hand silhouette and a slender text cursor", () => {
  assert.equal(handCursorSource.includes("M870.4 204.8c-18.6368"), true);
  assert.equal(handCursorSource.includes('fill="#272636"'), true);
  assert.equal(textCursorSource.includes('stroke-width="3"'), true);
  assert.equal(textCursorSource.includes('stroke-width="1.2"'), true);
  assert.equal(textCursorSource.includes("M9 4h6M12 4v16M9 20h6"), true);
});
