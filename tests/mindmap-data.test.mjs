import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMindMapFallbackSvg,
  createDefaultMindMapData,
  getStaticMindMapDimensions,
  normalizeMindMapData,
  serializeMindMapData,
} from "../src/core/mindmap-data.mjs";

test("creates default Mind Elixir data with a root and children", () => {
  const data = createDefaultMindMapData();

  assert.equal(data.nodeData.id, "root");
  assert.equal(data.nodeData.topic, "中心主题");
  assert.equal(data.nodeData.children.length, 2);
});

test("normalizes valid mindmap JSON", () => {
  const result = normalizeMindMapData('{"nodeData":{"id":"root","topic":"A","children":[]}}');

  assert.equal(result.error, "");
  assert.equal(result.raw, "");
  assert.equal(result.data.nodeData.topic, "A");
});

test("preserves invalid mindmap JSON as raw text", () => {
  const result = normalizeMindMapData("{not-json");

  assert.equal(result.data, null);
  assert.equal(result.raw, "{not-json");
  assert.match(result.error, /Invalid mind map JSON/);
});

test("serializes mindmap data with stable indentation", () => {
  const markdown = serializeMindMapData({ nodeData: { id: "root", topic: "A", children: [] } });

  assert.equal(markdown, '{\n  "nodeData": {\n    "id": "root",\n    "topic": "A",\n    "children": []\n  }\n}');
});

test("constrains static mindmap dimensions by width and height", () => {
  assert.deepEqual(getStaticMindMapDimensions({ width: 600, height: 2400 }, 600, 760), {
    sourceWidth: 600,
    sourceHeight: 2400,
    targetWidth: 190,
    targetHeight: 760,
  });
});

test("builds a fallback SVG containing the root topic", () => {
  const svg = buildMindMapFallbackSvg({ nodeData: { id: "root", topic: "Root", children: [] } });

  assert.equal(svg.includes("<svg"), true);
  assert.equal(svg.includes("Root"), true);
});
