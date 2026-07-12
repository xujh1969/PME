import test from "node:test";
import assert from "node:assert/strict";

import { runAppCommand } from "../src/ui/app-command-runner.mjs";

function createContext(overrides = {}) {
  const calls = [];
  const state = {
    selectedPath: "README.md",
    showSidebar: true,
    showOutline: true,
    showFileTree: false,
    showStatusbar: true,
    editorZoom: 1,
  };

  return {
    calls,
    state,
    createStandaloneMarkdownDocument: () => calls.push("new"),
    openMarkdownFile: () => calls.push("open"),
    saveDocument: () => calls.push("save"),
    saveAsDocument: () => calls.push("save-as"),
    packageCurrentDocument: () => calls.push("package"),
    openPdfExportModal: () => calls.push("pdf"),
    closeDocumentTab: (path) => calls.push(`close:${path}`),
    runClipboardMenuCommand: (command) => calls.push(`clipboard:${command}`),
    selectCurrentDocument: () => calls.push("select-all"),
    render: () => calls.push("render"),
    setEditorZoom: (zoom) => calls.push(`zoom:${zoom.toFixed(1)}`),
    runEditorCommand: (command) => calls.push(`editor:${command}`),
    document: {
      execCommand: (command) => {
        calls.push(`exec:${command}`);
        return true;
      },
      querySelector: (selector) => {
        calls.push(`query:${selector}`);
        return { focus: () => calls.push("focus") };
      },
    },
    openMessageModal: (options) => calls.push(`modal:${options.title}`),
    ...overrides,
  };
}

test("dispatches file and export menu commands to callbacks", () => {
  const context = createContext();

  [
    "new-workspace",
    "new-markdown-file",
    "open-markdown-file",
    "save-document",
    "save-as-document",
    "package-document",
    "export-pdf",
    "close-current-tab",
  ].forEach((command) => runAppCommand(command, context));

  assert.deepEqual(context.calls, [
    "new",
    "new",
    "open",
    "save",
    "save-as",
    "package",
    "pdf",
    "close:README.md",
  ]);
});

test("returns async save and open command work so callers can await errors", async () => {
  const context = createContext({
    openMarkdownFile: async () => {
      context.calls.push("open-start");
      await Promise.resolve();
      context.calls.push("open-end");
    },
    saveDocument: async () => {
      context.calls.push("save-start");
      await Promise.resolve();
      context.calls.push("save-end");
    },
    saveAsDocument: async () => {
      context.calls.push("save-as-start");
      await Promise.resolve();
      context.calls.push("save-as-end");
    },
  });

  const openResult = runAppCommand("open-markdown-file", context);
  assert.equal(typeof openResult?.then, "function");
  await openResult;
  const saveResult = runAppCommand("save-document", context);
  assert.equal(typeof saveResult?.then, "function");
  await saveResult;
  const saveAsResult = runAppCommand("save-as-document", context);
  assert.equal(typeof saveAsResult?.then, "function");
  await saveAsResult;

  assert.deepEqual(context.calls, [
    "open-start",
    "open-end",
    "save-start",
    "save-end",
    "save-as-start",
    "save-as-end",
  ]);
});

test("dispatches clipboard and selection commands", () => {
  const context = createContext();

  ["cut", "copy", "paste", "select-all"].forEach((command) => runAppCommand(command, context));

  assert.deepEqual(context.calls, [
    "clipboard:cut",
    "clipboard:copy",
    "clipboard:paste",
    "select-all",
  ]);
});

test("uses editor undo redo when an editor is available", () => {
  const calls = [];
  const chain = {
    focus: () => chain,
    undo: () => {
      calls.push("undo");
      return chain;
    },
    redo: () => {
      calls.push("redo");
      return chain;
    },
    run: () => calls.push("run"),
  };
  const context = createContext({
    calls,
    editor: { chain: () => chain },
  });

  runAppCommand("undo", context);
  runAppCommand("redo", context);

  assert.deepEqual(calls, ["undo", "run", "redo", "run"]);
});

test("falls back to document execCommand for undo redo without an editor", () => {
  const context = createContext({ editor: null });

  runAppCommand("undo", context);
  runAppCommand("redo", context);

  assert.deepEqual(context.calls, ["exec:undo", "exec:redo"]);
});

test("toggles view state and renders", () => {
  const context = createContext();

  runAppCommand("toggle-sidebar", context);
  runAppCommand("toggle-outline", context);
  runAppCommand("toggle-file-tree", context);
  runAppCommand("toggle-statusbar", context);

  assert.equal(context.state.showSidebar, true);
  assert.equal(context.state.showOutline, false);
  assert.equal(context.state.showFileTree, true);
  assert.equal(context.state.showStatusbar, false);
  assert.deepEqual(context.calls, ["render", "render", "render", "render"]);
});

test("dispatches zoom search about and unknown editor commands", () => {
  const context = createContext();

  runAppCommand("zoom-reset", context);
  runAppCommand("zoom-in", context);
  runAppCommand("zoom-out", context);
  runAppCommand("focus-search", context);
  runAppCommand("about", context);
  runAppCommand("bold", context);

  assert.deepEqual(context.calls, [
    "zoom:1.0",
    "zoom:1.1",
    "zoom:0.9",
    "query:[data-find-input]",
    "focus",
    "modal:鍏充簬 PME",
    "editor:bold",
  ]);
});
