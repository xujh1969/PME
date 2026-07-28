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
  assert.equal(mermaidSource.includes("function normalizeMermaidStyleDirectives"), true);
  assert.match(mermaidSource, /replace\(\/\^\(\\s\*\)Style\\b\/gm,\s*"\$1style"\)/);
  assert.equal(appSource.includes("const MermaidDiagram = Node.create"), false);
  assert.equal(appSource.includes("function renderMermaidDiagram"), false);
});

test("materializes Mermaid defaults before reapplying diagram-authored styles", () => {
  assert.equal(mermaidSource.includes("function applyMermaidSvgThemeFallback"), true);
  assert.equal(mermaidSource.includes("function setMermaidSvgPaint"), true);
  assert.equal(mermaidSource.includes("function hasMermaidSvgEmbeddedStyles"), false);
  assert.equal(mermaidSource.includes("function applyMermaidDirectiveStyles"), true);
  assert.equal(mermaidSource.includes("function parseMermaidStyleDirectives"), true);
  assert.equal(mermaidSource.includes("if (hasMermaidSvgEmbeddedStyles(svg))"), false);
  assert.equal(mermaidSource.includes('querySelectorAll(".node rect'), true);
  assert.equal(mermaidSource.includes('setMermaidSvgPaint(element, "fill", variables.primaryColor)'), true);
  assert.equal(mermaidSource.includes('setMermaidSvgPaint(element, "stroke", variables.lineColor)'), true);
  assert.equal(mermaidSource.includes("applyMermaidDirectiveStyles(renderedSvg, code);"), true);
  assert.equal(mermaidSource.includes('directive.styles.color || directive.styles["text-color"]'), true);
  assert.equal(mermaidSource.includes('querySelector(`g.node[data-id="${escapedId}"]`)'), true);
  assert.equal(mermaidSource.includes('svg.querySelectorAll("g.node")'), true);
  assert.equal(mermaidSource.includes('`${svg.id}-flowchart-${nodeId}-`'), true);
  assert.equal(mermaidSource.includes('`flowchart-${nodeId}-`'), true);
  assert.equal(mermaidSource.includes("idPrefixes.some((prefix) =>"), true);
  assert.equal(mermaidSource.includes("id.startsWith(prefix)"), true);
  assert.equal(mermaidSource.includes('/^\\d+$/.test(id.slice(prefix.length))'), true);
  assert.equal(mermaidSource.includes('id === `flowchart-${nodeId}-0`'), false);
  assert.equal(mermaidSource.includes(":scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path"), true);
  assert.equal(mermaidSource.includes('shape.closest(".edgePath, .edgePaths, .flowchart-link")'), true);
  assert.equal(mermaidSource.includes('node.querySelectorAll("text, tspan")'), true);
  assert.equal(mermaidSource.includes('node.querySelectorAll("foreignObject, foreignObject *")'), true);
  assert.equal(mermaidSource.includes('label.style.setProperty("color", textColor, "important")'), true);
  assert.equal(mermaidSource.includes("element.hasAttribute(property)"), true);
  assert.equal(mermaidSource.includes('style.setProperty(property, value, "important")'), false);
  assert.equal(mermaidSource.includes("applyMermaidSvgThemeFallback(renderedSvg);"), true);
});
