import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const popoverSource = readFileSync(new URL("../src/ui/editor-popovers.mjs", import.meta.url), "utf8");

test("owns editor popover UI outside the app entry", () => {
  assert.equal(popoverSource.includes("export function openLinkModal"), true);
  assert.equal(popoverSource.includes("export function openTextColorPicker(editor)"), true);
  assert.equal(popoverSource.includes("export function openHighlightColorPicker(editor)"), true);
  assert.equal(popoverSource.includes("export function openEmojiPicker(editor)"), true);
  assert.equal(appSource.includes("function openLinkModal"), false);
  assert.equal(appSource.includes("function openTextColorPicker"), false);
  assert.equal(appSource.includes("function openEmojiPicker"), false);
});
