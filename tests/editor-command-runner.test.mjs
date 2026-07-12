import test from "node:test";
import assert from "node:assert/strict";

import { runEditorCommand } from "../src/editor/editor-command-runner.mjs";

function createEditorStub(options = {}) {
  const calls = [];
  const chain = new Proxy({}, {
    get(_target, property) {
      if (property === "run") {
        return () => {
          calls.push(["run"]);
          return true;
        };
      }
      return (...args) => {
        calls.push([property, ...args]);
        return chain;
      };
    },
  });

  return {
    calls,
    chain: () => chain,
    getAttributes: (name) => options.attributes?.[name] || {},
    isActive: (name) => Boolean(options.active?.[name]),
    view: {
      dom: {
        querySelectorAll: () => options.detailsElements || [],
      },
    },
  };
}

test("runs source view command without requiring an editor", () => {
  const calls = [];

  runEditorCommand("source-view", {
    editor: null,
    toggleSourceView: () => calls.push("source"),
  });

  assert.deepEqual(calls, ["source"]);
});

test("runs basic TipTap chain commands", () => {
  const editor = createEditorStub();

  runEditorCommand("heading-2", { editor });
  runEditorCommand("align-center", { editor });
  runEditorCommand("bold", { editor });

  assert.deepEqual(editor.calls, [
    ["focus"],
    ["toggleHeading", { level: 2 }],
    ["run"],
    ["focus"],
    ["setTextAlign", "center"],
    ["run"],
    ["focus"],
    ["toggleBold"],
    ["run"],
  ]);
});

test("delegates link creation when the current selection is not a link", () => {
  const editor = createEditorStub();
  const calls = [];

  runEditorCommand("link", {
    editor,
    setLinkMark: () => calls.push("link"),
  });

  assert.deepEqual(calls, ["link"]);
  assert.deepEqual(editor.calls, [["focus"]]);
});

test("unsets active links through the command chain", () => {
  const editor = createEditorStub({ active: { link: true } });

  runEditorCommand("link", {
    editor,
    setLinkMark: () => assert.fail("setLinkMark should not run for active links"),
  });

  assert.deepEqual(editor.calls, [
    ["focus"],
    ["unsetLink"],
    ["run"],
  ]);
});

test("inserts a table after the table modal resolves", async () => {
  const editor = createEditorStub();

  runEditorCommand("table", {
    editor,
    openTableInsertModal: async () => ({ rows: 2, cols: 3, withHeaderRow: true }),
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(editor.calls, [
    ["focus"],
    ["focus"],
    ["insertTable", { rows: 2, cols: 3, withHeaderRow: true }],
    ["run"],
  ]);
});

test("uses injected callbacks for non-chain editor actions", () => {
  const editor = createEditorStub();
  const calls = [];

  runEditorCommand("emoji", { editor, openEmojiPicker: () => calls.push("emoji") });
  runEditorCommand("image", { editor, openImageInsertPanel: () => calls.push("image") });
  runEditorCommand("markdown-link", { editor, insertMarkdownLink: () => calls.push("markdown-link") });
  runEditorCommand("insert-paragraph-above", {
    editor,
    insertParagraphAroundSelection: (_editor, placement) => calls.push(`paragraph:${placement}`),
  });
  runEditorCommand("footnote", { editor, insertFootnote: () => calls.push("footnote") });

  assert.deepEqual(calls, ["emoji", "image", "markdown-link", "paragraph:above", "footnote"]);
});
