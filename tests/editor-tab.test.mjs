import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { handleVisualTab, updateSourceTextForTab } from "../src/editor/editor-tab.mjs";

const extensionsSource = readFileSync(new URL("../src/editor/editor-extensions.mjs", import.meta.url), "utf8");
const tabSource = readFileSync(new URL("../src/editor/editor-tab.mjs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const codeBlockSource = readFileSync(new URL("../src/editor/code-block-actions.mjs", import.meta.url), "utf8");

test("inserts four spaces at the source editor caret", () => {
  assert.deepEqual(updateSourceTextForTab("ab", 1, 1, false), {
    value: "a    b",
    selectionStart: 5,
    selectionEnd: 5,
  });
});

test("indents and outdents selected source lines", () => {
  assert.deepEqual(updateSourceTextForTab("one\ntwo", 0, 7, false), {
    value: "    one\n    two",
    selectionStart: 0,
    selectionEnd: 15,
  });
  assert.deepEqual(updateSourceTextForTab("    one\n  two", 0, 13, true), {
    value: "one\ntwo",
    selectionStart: 0,
    selectionEnd: 7,
  });
});

test("keeps list Tab inside the editor even when the item cannot move", () => {
  const calls = [];
  let indent = 1;
  const editor = {
    isActive: (type) => type === "listItem" || type === "bulletList",
    getAttributes: () => ({ indent }),
    state: {
      selection: {
        $from: {
          depth: 2,
          node: (depth) => ({ type: { name: depth === 1 ? "bulletList" : depth === 2 ? "listItem" : "doc" } }),
        },
      },
    },
    commands: {
      sinkListItem: (type) => {
        calls.push(["sink", type]);
        return false;
      },
      liftListItem: (type) => {
        calls.push(["lift", type]);
        return false;
      },
      updateAttributes: (type, attrs) => {
        indent = attrs.indent;
        calls.push(["indent", type, attrs.indent]);
        return true;
      },
    },
  };

  assert.equal(handleVisualTab(editor, 1), true);
  assert.equal(handleVisualTab(editor, -1), true);
  assert.deepEqual(calls, [
    ["sink", "listItem"],
    ["indent", "bulletList", 2],
    ["indent", "bulletList", 1],
  ]);
});

test("lifts only nested list items when reducing indentation", () => {
  const calls = [];
  const editor = {
    isActive: (type) => type === "listItem" || type === "bulletList",
    getAttributes: () => ({ indent: 0 }),
    state: {
      selection: {
        $from: {
          depth: 4,
          node: (depth) => ({
            type: { name: ["doc", "bulletList", "listItem", "bulletList", "listItem"][depth] },
          }),
        },
      },
    },
    commands: {
      liftListItem: (type) => {
        calls.push(["lift", type]);
        return true;
      },
      updateAttributes: () => {
        calls.push(["indent"]);
        return true;
      },
    },
  };

  assert.equal(handleVisualTab(editor, -1), true);
  assert.deepEqual(calls, [["lift", "listItem"]]);
});

test("keeps contextual visual-editor Tab behavior isolated", () => {
  assert.equal(tabSource.includes('if (editor.isActive("table"))'), true);
  assert.equal(tabSource.includes('sinkListItem("taskItem")'), true);
  assert.equal(tabSource.includes('sinkListItem("listItem")'), true);
  assert.equal(tabSource.includes('updateAttributes("paragraph"'), true);
  assert.equal(tabSource.includes("'Shift-Tab'"), true);
  assert.equal(extensionsSource.includes("EditorTabBehavior"), true);
  assert.equal(extensionsSource.includes("Table.configure({ resizable: true, cellMinWidth: 80 })"), true);
  assert.equal(codeBlockSource.includes("Tab: ({ editor: currentEditor }) => handleCodeBlockIndent(currentEditor)"), true);
  assert.equal(appSource.includes('event.key !== "Tab"'), true);
  assert.equal(appSource.includes("updateSourceTextForTab("), true);
});
