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
