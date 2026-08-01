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

test("stores Mermaid zoom in the node and writes control changes back", () => {
  assert.equal(mermaidSource.includes("scale: {"), true);
  assert.equal(mermaidSource.includes('"data-pme-scale"'), true);
  assert.equal(mermaidSource.includes("persistZoom"), true);
  assert.equal(mermaidSource.includes("wrapper.dataset.pmeScale"), true);
  assert.equal(appSource.includes("updateMermaidDiagram({ code, scale, pos })"), true);
});

test("reapplies stored Mermaid zoom after theme rendering", () => {
  const themeUpdate = mermaidSource.match(/export async function updateMermaidTheme\(\)[\s\S]+?\n\}/)?.[0] || "";

  assert.equal(themeUpdate.includes("diagram.dataset.pmeScale"), true);
  assert.equal(themeUpdate.includes("applyMermaidZoom(element"), true);
});

test("materializes Mermaid defaults before reapplying diagram-authored styles", () => {
  assert.equal(mermaidSource.includes("function applyMermaidSvgThemeFallback"), true);
  assert.equal(mermaidSource.includes("function setMermaidSvgPaint"), true);
  assert.equal(mermaidSource.includes("function hasMermaidSvgEmbeddedStyles"), false);
  assert.equal(mermaidSource.includes("function applyMermaidDirectiveStyles"), true);
  assert.equal(mermaidSource.includes("function parseMermaidStyleDirectives"), true);
  assert.equal(mermaidSource.includes("function parseMermaidClassDirectives"), true);
  assert.equal(mermaidSource.includes("if (hasMermaidSvgEmbeddedStyles(svg))"), false);
  assert.equal(mermaidSource.includes('querySelectorAll(".node rect'), true);
  assert.equal(mermaidSource.includes('setMermaidSvgPaint(element, "fill", variables.primaryColor)'), true);
  assert.equal(mermaidSource.includes('setMermaidSvgPaint(element, "stroke", variables.lineColor)'), true);
  assert.equal(mermaidSource.includes("applyMermaidDirectiveStyles(renderedSvg, code);"), true);
  assert.equal(mermaidSource.includes("parseMermaidClassDirectives(code)"), true);
  assert.match(mermaidSource, /line\.match\([^)]*classDef/);
  assert.match(mermaidSource, /line\.match\([^)]*class/);
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

test("restores sequence message strokes hidden by Mermaid presentation attributes", () => {
  assert.equal(mermaidSource.includes('querySelectorAll(".messageLine0, .messageLine1")'), true);
  assert.equal(mermaidSource.includes("function setMermaidSequenceLineStroke"), true);
  assert.equal(mermaidSource.includes('attributeStroke === "none"'), true);
  assert.equal(mermaidSource.includes('element.style.getPropertyValue("stroke")'), true);
  assert.equal(mermaidSource.includes('setMermaidSvgPaint(element, "stroke", variables.lineColor)'), true);
});

test("materializes Mermaid text alignment and sequence number markers for WebView SVGs", () => {
  assert.equal(mermaidSource.includes("function materializeMermaidTextStyles"), true);
  assert.equal(mermaidSource.includes("safeVariables.fontFamily.replace"), false);
  assert.equal(mermaidSource.includes('"text-anchor"'), true);
  assert.equal(mermaidSource.includes('"font-family"'), true);
  assert.equal(mermaidSource.includes('"font-size"'), true);
  assert.equal(mermaidSource.includes('"font-weight"'), true);
  assert.equal(mermaidSource.includes('marker[id$="-sequencenumber"] circle'), true);
  assert.equal(mermaidSource.includes("materializeMermaidTextStyles(svg);"), true);
  assert.equal(mermaidSource.includes('element.querySelectorAll("tspan")'), true);
  assert.equal(mermaidSource.includes('tspan.setAttribute("text-anchor", textAnchor)'), true);
  assert.equal(mermaidSource.includes("function centerMermaidActorLabels"), true);
  assert.equal(mermaidSource.includes('querySelectorAll("text.actor")'), true);
  assert.equal(mermaidSource.includes("rectCenter - textWidth / 2"), true);
  assert.equal(mermaidSource.includes("centerMermaidActorLabels(svg);"), true);
});

test("renders sequence numbers as explicit circles instead of zero-length markers", () => {
  assert.equal(mermaidSource.includes("function materializeMermaidSequenceNumbers"), true);
  assert.equal(mermaidSource.includes('"circle"'), true);
  assert.equal(mermaidSource.includes('circle.setAttribute("r", "6")'), true);
  assert.equal(mermaidSource.includes('querySelectorAll(\'line[marker-start*="-sequencenumber"]\')'), true);
  assert.equal(mermaidSource.includes('line.removeAttribute("marker-start")'), true);
  assert.equal(mermaidSource.includes("materializeMermaidSequenceNumbers(svg, variables);"), true);
});
