import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");

test("keeps object node selection while clicking app menu commands", () => {
  assert.equal(appSource.includes("function handleGlobalObjectDeselect"), true);
  assert.equal(appSource.includes(".app-menu"), true);
  assert.equal(appSource.includes('button.addEventListener("mousedown", (event) => {'), true);
  assert.equal(appSource.includes("event.preventDefault();"), true);
});

test("marks internal block drags as move operations instead of file drops", () => {
  assert.equal(appSource.includes("let isBlockDragInProgress = false;"), true);
  assert.equal(appSource.includes("isBlockDragInProgress = true;"), true);
  assert.equal(appSource.includes("isBlockDragInProgress = false;"), true);
  assert.equal(appSource.includes('event.dataTransfer.dropEffect = "move";'), true);
});

test("opens dropped Markdown files through the shared document drop path", () => {
  assert.equal(appSource.includes("async function openDroppedMarkdownFiles"), true);
  assert.equal(appSource.includes("function bindDocumentFileDropEvents"), true);
  assert.equal(appSource.includes('document.addEventListener("drop", handleDrop, { capture: true });'), true);
  assert.equal(appSource.includes("getMarkdownFilesFromFileList(event.dataTransfer?.files)"), true);
  assert.equal(appSource.includes("await openDroppedMarkdownFiles(markdownFiles);"), true);
  assert.equal(appSource.includes('state.screen = "shell";'), true);
  assert.equal(appSource.includes("state.tree = buildWorkspaceTree(state.paths);"), true);
});

test("opens Markdown files dropped through Tauri native file events", () => {
  assert.equal(appSource.includes("function setupTauriFileDropHandler"), true);
  assert.equal(appSource.includes("getCurrentWindow().onDragDropEvent"), true);
  assert.equal(appSource.includes('payload?.type !== "drop"'), true);
  assert.equal(appSource.includes("(payload.paths || []).filter(isMarkdownPath)"), true);
  assert.equal(appSource.includes("handleCliFileOpen(filePath);"), true);
});

test("saves absolute Markdown tabs through the native file path command before close", () => {
  const saveAllBlock = appSource.match(/async function saveAllModifiedTabs\(\) \{[\s\S]+?\n\}/)?.[0] || "";
  assert.equal(appSource.includes("function getPersistedMarkdownFilePath"), true);
  assert.equal(appSource.includes("async function trySaveMarkdownPath"), true);
  assert.equal(appSource.includes('workspaceInfo?.kind === "tauri-file"'), true);
  assert.equal(appSource.includes("path === fileName(workspaceInfo.filePath)"), true);
  assert.equal(appSource.includes("writeTextFilePath(persistedFilePath"), true);
  assert.equal(appSource.includes("writeTextFile(path"), true);
  assert.equal(saveAllBlock.includes("trySaveMarkdownPath(tab.path"), true);
});

test("does not close modals by clicking the backdrop", () => {
  assert.equal(appSource.includes("event.target === overlay"), false);
});

test("shows a clear permission message when saving is denied", () => {
  assert.equal(appSource.includes("function formatSaveFailureMessage"), true);
  assert.equal(appSource.includes("没有权限写入这个 Markdown 文件。"), true);
  assert.equal(appSource.includes("os error 5"), true);
  assert.equal(appSource.includes("文件 > 另存为"), true);
});

test("keeps unsaved state when the Tauri save dialog is cancelled", () => {
  const saveTextExportBlock = appSource.match(
    /async function saveTextExport[\s\S]+?(?=\nasync function saveBlobExport)/,
  )?.[0] || "";

  assert.equal(saveTextExportBlock.includes('adapter.kind === "tauri"'), true);
  assert.equal(saveTextExportBlock.includes("return null;"), true);
  assert.equal(
    saveTextExportBlock.indexOf("return null;") < saveTextExportBlock.indexOf("downloadBlob("),
    true,
  );
});

test("bundles the help manual through Vite instead of loading a loose runtime asset", () => {
  assert.equal(appSource.includes('import helpManualMarkdown from "./assets/PME使用说明书.md?raw";'), true);
  assert.equal(appSource.includes("const markdown = helpManualMarkdown.trim()"), true);
  assert.equal(appSource.includes('fetch("asset:///assets/PME使用说明书.md")'), false);
  assert.equal(appSource.includes('fetch("assets/PME使用说明书.md")'), false);
  assert.equal(appSource.includes('invoke("read_readme_file")'), false);
});

test("closes toolbar dropdown panels after running panel commands", () => {
  assert.equal(appSource.includes("function closeToolbarDropdownPanel"), true);
  assert.equal(appSource.includes("closeToolbarDropdownPanel(button);"), true);
});

test("normalizes Mermaid foreignObject labels before Word export", () => {
  assert.equal(appSource.includes("function normalizeMermaidSvgForWord"), true);
  assert.equal(appSource.includes('querySelectorAll("foreignObject")'), true);
  assert.equal(appSource.includes('createElementNS("http://www.w3.org/2000/svg", "text")'), true);
  assert.equal(appSource.includes("foreignObject.replaceWith(text);"), true);
});
