import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const mermaidSource = readFileSync(new URL("../src/editor/mermaid-node.mjs", import.meta.url), "utf8");

test("owns the Mermaid node and rendering interactions outside the app entry", () => {
  assert.equal(mermaidSource.includes("export const MermaidDiagram"), true);
  assert.equal(mermaidSource.includes('securityLevel: "strict"'), true);
  assert.equal(mermaidSource.includes("insertMermaidDiagram"), true);
  assert.equal(mermaidSource.includes("renderMermaidDiagram"), true);
  assert.equal(mermaidSource.includes("getMermaidFitZoom"), true);
  assert.equal(mermaidSource.includes("bindMermaidPan"), true);
  assert.equal(appSource.includes("const MermaidDiagram = Node.create"), false);
  assert.equal(appSource.includes("function renderMermaidDiagram"), false);
});
