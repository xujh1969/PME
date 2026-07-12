import test from "node:test";
import assert from "node:assert/strict";

import {
  closeOpenTab,
  getNextUntitledPath,
  openTab,
  renameTabPath,
  setTabModified,
} from "../src/core/tabs.mjs";

const tabs = [
  { name: "A.md", path: "A.md", modified: false },
  { name: "B.md", path: "B.md", modified: false },
  { name: "C.md", path: "C.md", modified: false },
];

test("closing an inactive tab keeps the current selected tab", () => {
  assert.deepEqual(closeOpenTab(tabs, "B.md", "A.md"), {
    openTabs: [tabs[1], tabs[2]],
    selectedPath: "B.md",
  });
});

test("closing the active tab selects the next tab when available", () => {
  assert.deepEqual(closeOpenTab(tabs, "B.md", "B.md"), {
    openTabs: [tabs[0], tabs[2]],
    selectedPath: "C.md",
  });
});

test("closing the last open tab clears the selection", () => {
  assert.deepEqual(closeOpenTab([tabs[0]], "A.md", "A.md"), {
    openTabs: [],
    selectedPath: "",
  });
});

test("creates the next available untitled markdown path", () => {
  assert.equal(getNextUntitledPath({}), "Untitled.md");
  assert.equal(getNextUntitledPath({ "Untitled.md": "", "Untitled2.md": "" }), "Untitled3.md");
});

test("opens a tab once and selects it", () => {
  assert.deepEqual(openTab(tabs, "D.md", "D.md"), {
    openTabs: [...tabs, { name: "D.md", path: "D.md", modified: false }],
    selectedPath: "D.md",
  });
  assert.deepEqual(openTab(tabs, "B.md", "B.md"), { openTabs: tabs, selectedPath: "B.md" });
});

test("updates and renames tab state immutably", () => {
  assert.equal(setTabModified(tabs, "B.md", true)[1].modified, true);
  assert.deepEqual(renameTabPath(tabs, "B.md", "Notes.md", "Notes.md")[1], {
    name: "Notes.md", path: "Notes.md", modified: false,
  });
});
