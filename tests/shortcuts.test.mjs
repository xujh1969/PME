import test from "node:test";
import assert from "node:assert/strict";

import { getAppShortcutCommand } from "../src/core/shortcuts.mjs";

test("maps primary file shortcuts to app commands", () => {
  assert.equal(getAppShortcutCommand({ key: "s", ctrlKey: true }), "save-document");
  assert.equal(getAppShortcutCommand({ key: "n", metaKey: true, altKey: true }), "new-markdown-file");
  assert.equal(getAppShortcutCommand({ key: "w", ctrlKey: true, altKey: true }), "close-current-tab");
});

test("maps shifted copy and cut to plain-text commands", () => {
  assert.equal(getAppShortcutCommand({ key: "c", ctrlKey: true, shiftKey: true }), "copy-plain");
  assert.equal(getAppShortcutCommand({ key: "x", metaKey: true, shiftKey: true }), "cut-plain");
  assert.equal(getAppShortcutCommand({
    key: "c",
    ctrlKey: true,
    shiftKey: true,
    target: { matches: (selector) => selector === ".source-editor" },
  }), "copy-plain");
});

test("maps function-key shortcuts without requiring modifiers", () => {
  assert.equal(getAppShortcutCommand({ key: "F2" }), "rename-markdown-file");
});

test("maps app view zoom shortcuts", () => {
  assert.equal(getAppShortcutCommand({ key: "9", ctrlKey: true, shiftKey: true }), "zoom-reset");
  assert.equal(getAppShortcutCommand({ key: "=", ctrlKey: true, shiftKey: true }), "zoom-in");
  assert.equal(getAppShortcutCommand({ key: "+", code: "NumpadAdd", ctrlKey: true, shiftKey: true }), "zoom-in");
  assert.equal(getAppShortcutCommand({ key: "-", ctrlKey: true, shiftKey: true }), "zoom-out");
  assert.equal(getAppShortcutCommand({ key: "_", code: "Minus", ctrlKey: true, shiftKey: true }), "zoom-out");
  assert.equal(getAppShortcutCommand({ key: "Subtract", code: "NumpadSubtract", ctrlKey: true, shiftKey: true }), "zoom-out");
});

test("does not map shortcuts from modal text fields except save", () => {
  const target = { matches: (selector) => selector.includes("input") };

  assert.equal(getAppShortcutCommand({ key: "n", ctrlKey: true, altKey: true, target }), null);
  assert.equal(getAppShortcutCommand({ key: "s", ctrlKey: true, target }), "save-document");
  assert.equal(getAppShortcutCommand({ key: "c", ctrlKey: true, shiftKey: true, target }), null);
});

test("does not take browser-reserved new and close shortcuts", () => {
  assert.equal(getAppShortcutCommand({ key: "n", ctrlKey: true }), null);
  assert.equal(getAppShortcutCommand({ key: "w", ctrlKey: true }), null);
});
