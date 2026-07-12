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
