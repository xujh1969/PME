import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMindMapFallbackSvg,
  buildMindMapStaticSvg,
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

test("preserves serializable Mind Elixir fields while removing parent references", () => {
  const result = normalizeMindMapData({
    direction: 2,
    meta: { owner: "PME" },
    nodeData: {
      id: "root",
      topic: "Root",
      style: { color: "#123456", fontWeight: "700" },
      tags: ["plan"],
      icons: ["star"],
      hyperLink: "https://example.com",
      expanded: false,
      direction: 1,
      image: { url: "image.png", width: 80, height: 40 },
      branchColor: "#ff0000",
      note: "note",
      metadata: { priority: 1 },
      parent: { id: "runtime-parent" },
      children: [
        {
          id: "child",
          topic: "Child",
          style: { background: "#eeeeee" },
          parent: { id: "root" },
        },
      ],
    },
  });

  assert.equal(result.data.direction, 2);
  assert.deepEqual(result.data.meta, { owner: "PME" });
  assert.deepEqual(result.data.nodeData.style, { color: "#123456", fontWeight: "700" });
  assert.deepEqual(result.data.nodeData.tags, ["plan"]);
  assert.deepEqual(result.data.nodeData.icons, ["star"]);
  assert.equal(result.data.nodeData.hyperLink, "https://example.com");
  assert.equal(result.data.nodeData.expanded, false);
  assert.equal(result.data.nodeData.direction, 1);
  assert.deepEqual(result.data.nodeData.image, { url: "image.png", width: 80, height: 40 });
  assert.equal(result.data.nodeData.branchColor, "#ff0000");
  assert.equal(result.data.nodeData.note, "note");
  assert.deepEqual(result.data.nodeData.metadata, { priority: 1 });
  assert.equal("parent" in result.data.nodeData, false);
  assert.equal("parent" in result.data.nodeData.children[0], false);
  assert.deepEqual(result.data.nodeData.children[0].style, { background: "#eeeeee" });
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

test("builds a full static SVG with child topics, connectors, styles, and calculated bounds", () => {
  const simple = buildMindMapStaticSvg({
    nodeData: { id: "root", topic: "Root", children: [] },
  });
  const tree = buildMindMapStaticSvg({
    nodeData: {
      id: "root",
      topic: "Root",
      children: [
        {
          id: "child-1",
          topic: "Child & One",
          branchColor: "#ff0000",
          style: { background: "#ffeeee", color: "#550000" },
          children: [
            { id: "grandchild", topic: "Grandchild", children: [] },
          ],
        },
        { id: "child-2", topic: "Child Two", children: [] },
      ],
    },
  });

  assert.equal(tree.svg.includes("Child &amp; One"), true);
  assert.equal(tree.svg.includes("Grandchild"), true);
  assert.equal(tree.svg.includes('stroke="#ff0000"'), true);
  assert.equal(tree.svg.includes('fill="#ffeeee"'), true);
  assert.equal((tree.svg.match(/<path /g) || []).length, 3);
  assert.match(tree.svg, new RegExp(`<svg[^>]+width="${tree.width}"[^>]+height="${tree.height}"`));
  assert.equal(tree.width > simple.width, true);
  assert.equal(tree.height > simple.height, true);
});
