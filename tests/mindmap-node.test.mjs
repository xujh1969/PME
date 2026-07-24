import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/editor/mindmap-node.mjs", import.meta.url), "utf8");

test("defines the MindMap TipTap node outside the app entry", () => {
  assert.equal(source.includes("export const MindMap"), true);
  assert.equal(source.includes('name: "mindMap"'), true);
  assert.equal(source.includes("insertMindMap"), true);
  assert.equal(source.includes("updateMindMap"), true);
  assert.equal(source.includes("deleteMindMap"), true);
  assert.equal(source.includes("MindElixir"), true);
});

test("renders mindmap export markers for PDF and HTML static conversion", () => {
  assert.equal(source.includes("mindmap-diagram"), true);
  assert.equal(source.includes("mindmap-diagram__viewport"), true);
  assert.equal(source.includes("mindmap-diagram__content"), true);
  assert.equal(source.includes("data-mindmap"), true);
});
