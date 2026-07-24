import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/editor/mindmap-node.mjs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");

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

test("cleans up node view listeners before rerendering or destroying", () => {
  assert.equal(source.includes('content.removeEventListener("input", syncData)'), true);
  assert.equal(source.includes('content.removeEventListener("pointerup", syncData)'), true);
  assert.equal(source.includes('content.removeEventListener("keyup", syncData)'), true);
  assert.equal(source.includes('mind.bus.removeListener("operation", syncData)'), true);
  assert.equal(source.includes("mind.destroy()"), true);
});

test("preserves malformed persisted mindmap data and guards replacements", () => {
  assert.equal(source.includes('raw: {\n        default: "",\n        parseHTML:'), true);
  assert.equal(source.includes('error: {\n        default: "",\n        parseHTML:'), true);
  assert.equal(source.includes('attributes.raw || serializeMindMapData(attributes.data)'), true);
  assert.equal(source.includes("editor.state.doc.nodeAt(options.pos)"), true);
});

test("synchronizes operations immediately and does not blindly rerender self-originated updates", () => {
  assert.equal(source.includes('mind.bus.addListener("operation", syncData)'), true);
  assert.equal(source.includes("window.setTimeout"), false);
  assert.equal(source.includes("lastRenderedData === serialized"), true);
});

test("flushes active Mind Elixir editors before save, source switch, rerender, and destruction", () => {
  assert.equal(source.includes("export function flushMindMapEdits"), true);
  assert.equal(source.includes('querySelectorAll?.("#input-box")'), true);
  assert.equal(source.includes("input.blur()"), true);
  assert.match(source, /const destroyMind = \(\) => \{\s+flushMindMapEdits\(content\);\s+removeListeners\(\);/);
  assert.match(source, /const render = \(attrs\) => \{\s+flushMindMapEdits\(content\);/);
  assert.match(appSource, /function syncSelectedDocumentToState\(\)[\s\S]+?flushMindMapEdits\(editor\.view\.dom\);[\s\S]+?editor\.getJSON\(\)/);
  assert.match(appSource, /async function toggleSourceView\(\)[\s\S]+?flushMindMapEdits\(editor\.view\.dom\);[\s\S]+?editor\.getJSON\(\)/);
  assert.match(appSource, /function destroyEditor\(\)[\s\S]+?flushMindMapEdits\(editor\.view\.dom\);[\s\S]+?editor\.destroy\(\)/);
});

test("allows only mindmap pointer backgrounds to reach TipTap atom selection", () => {
  assert.equal(source.includes("MINDMAP_ATOM_SELECTION_EVENTS.has(event.type)"), true);
  assert.equal(source.includes("if (!MINDMAP_ATOM_SELECTION_EVENTS.has(event.type))"), true);
  assert.equal(source.includes("event.target === wrapper"), true);
  assert.equal(source.includes("event.target === viewport"), true);
  assert.equal(source.includes("event.target === content"), true);
  assert.equal(source.includes('event.target.matches?.(".map-container")'), true);
  assert.match(source, /if \(!MINDMAP_ATOM_SELECTION_EVENTS\.has\(event\.type\)\) \{\s+return true;\s+\}/);
});

test("shows escaped initialization errors without leaking a partial instance", () => {
  assert.equal(source.includes("try {"), true);
  assert.equal(source.includes("mind.init(normalized.data)"), true);
  assert.equal(source.includes("mindmap-diagram__error"), true);
  assert.equal(source.includes("escapeHtml(message)"), true);
  assert.equal(source.includes("destroyMind()"), true);
});
