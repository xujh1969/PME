import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const extensionsSource = readFileSync(new URL("../src/editor/editor-extensions.mjs", import.meta.url), "utf8");
const customNodesSource = readFileSync(new URL("../src/editor/custom-nodes.mjs", import.meta.url), "utf8");

test("keeps third-party TipTap extension registration outside the app entry", () => {
  assert.equal(extensionsSource.includes("export function createEditorExtensions"), true);
  assert.equal(extensionsSource.includes("StarterKit.configure"), true);
  assert.equal(extensionsSource.includes("DragHandle.configure"), true);
  assert.equal(appSource.includes("extensions: createEditorExtensions({"), true);
  assert.equal(appSource.includes("StarterKit.configure"), false);
});

test("keeps stateless image and table node extensions outside the app entry", () => {
  assert.equal(customNodesSource.includes("export const AssetImage"), true);
  assert.equal(customNodesSource.includes("export const AlignedTableCell"), true);
  assert.equal(customNodesSource.includes("export const AlignedTableHeader"), true);
  assert.equal(appSource.includes("ImageExtension.extend"), false);
  assert.equal(appSource.includes("TableCell.extend"), false);
});
