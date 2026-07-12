import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const extensionsSource = readFileSync(new URL("../src/editor/editor-extensions.mjs", import.meta.url), "utf8");

test("lets TipTap initialize dragging before PME adds compatibility data", () => {
  const dragHandleConfig = extensionsSource.match(/DragHandle\.configure\(\{[\s\S]+?\n    \}\),/)?.[0] || "";

  assert.equal(dragHandleConfig.includes("onElementDragStart"), true);
  assert.equal(dragHandleConfig.includes("setData("), false);
});

test("renders the drag handle as a pointer-driven non-button element", () => {
  const dragHandleConfig = extensionsSource.match(/DragHandle\.configure\(\{[\s\S]+?\n    \}\),/)?.[0] || "";

  assert.equal(dragHandleConfig.includes('document.createElement("div")'), true);
  assert.equal(dragHandleConfig.includes('setAttribute("draggable", "false")'), true);
  assert.equal(dragHandleConfig.includes('setAttribute("role", "button")'), true);
  assert.equal(dragHandleConfig.includes('document.createElement("button")'), false);
});
