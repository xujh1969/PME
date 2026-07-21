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

test("applies critical Mermaid colors after render for packaged WebView reliability", () => {
  assert.equal(mermaidSource.includes("function applyMermaidSvgThemeFallback"), true);
  assert.equal(mermaidSource.includes("function setMermaidSvgPaint"), true);
  assert.equal(mermaidSource.includes('querySelectorAll(".node rect'), true);
  assert.equal(mermaidSource.includes('setMermaidSvgPaint(element, "fill", variables.primaryColor)'), true);
  assert.equal(mermaidSource.includes('setMermaidSvgPaint(element, "stroke", variables.lineColor)'), true);
  assert.equal(mermaidSource.includes('style.setProperty(property, value, "important")'), true);
  assert.equal(mermaidSource.includes("applyMermaidSvgThemeFallback(renderedSvg);"), true);
});
