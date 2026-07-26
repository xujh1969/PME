import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";

import { parseMarkdown } from "../src/core/markdown.mjs";
import {
  WORD_MIME_TYPE,
  buildWordDocumentBlob,
  getWordExportFileName,
} from "../src/core/word-export.mjs";

test("builds a docx file with native document content", async () => {
  const doc = parseMarkdown([
    "# 标题",
    "",
    "段落 **加粗** 和 [链接](https://example.com)。",
    "",
    "- 项目一",
    "- 项目二",
    "",
    "| A | B |",
    "| - | - |",
    "| 1 | 2 |",
  ].join("\n"));

  const blob = await buildWordDocumentBlob({ doc, title: "测试" });

  assert.equal(blob.type, WORD_MIME_TYPE);
  assert.equal(blob.size > 1000, true);
});

test("embeds rendered diagram images into the docx package", async () => {
  const doc = {
    type: "doc",
    content: [
      { type: "mermaidDiagram", attrs: { code: "graph TD\nA-->B" } },
      { type: "mindMap", attrs: { data: { nodeData: { id: "root", topic: "中心", children: [] } } } },
    ],
  };

  const blob = await buildWordDocumentBlob({
    doc,
    renderMermaidDiagram: async () => ({
      data: new Uint8Array([137, 80, 78, 71]),
      width: 320,
      height: 180,
      type: "png",
    }),
    renderMindMap: async () => ({
      data: new Uint8Array([137, 80, 78, 71]),
      width: 320,
      height: 180,
      type: "png",
    }),
  });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);

  assert.equal(text.includes("word/media/"), true);
});

test("does not export Mermaid source text when rendering fails", async () => {
  const code = "flowchart TD\nA-->B";
  const doc = {
    type: "doc",
    content: [{ type: "mermaidDiagram", attrs: { code } }],
  };

  const blob = await buildWordDocumentBlob({
    doc,
    renderMermaidDiagram: async () => {
      throw new Error("render failed");
    },
  });
  const xml = await getDocumentXml(blob);

  assert.equal(xml.includes("flowchart TD"), false);
  assert.equal(xml.includes("<w:drawing>"), true);
});

test("keeps exported images at their intrinsic aspect ratio", async () => {
  const doc = {
    type: "doc",
    content: [{ type: "image", attrs: { src: "image.png" } }],
  };

  const blob = await buildWordDocumentBlob({
    doc,
    loadImageResource: async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
    getImageDimensions: async () => ({ width: 400, height: 300 }),
  });
  const xml = await getDocumentXml(blob);

  assert.equal(xml.includes("<wp:extent cx=\"3810000\" cy=\"2857500\"/>"), true);
});

test("embeds block and inline math as rendered images when a renderer is provided", async () => {
  const doc = {
    type: "doc",
    content: [
      { type: "blockMath", attrs: { latex: "E = mc^2" } },
      { type: "paragraph", content: [{ type: "inlineMath", attrs: { latex: "x = y" } }] },
    ],
  };

  const blob = await buildWordDocumentBlob({
    doc,
    renderMath: async () => ({
      data: new Uint8Array([137, 80, 78, 71]),
      width: 120,
      height: 40,
      type: "png",
    }),
  });
  const xml = await getDocumentXml(blob);

  assert.equal(xml.includes("E = mc^2"), false);
  assert.equal(xml.includes("x = y"), false);
  assert.equal((xml.match(/<w:drawing>/g) || []).length >= 2, true);
});

test("does not export formula failure text when math rendering fails", async () => {
  const doc = {
    type: "doc",
    content: [
      { type: "blockMath", attrs: { latex: "x^2+z^3" } },
      { type: "paragraph", content: [{ type: "inlineMath", attrs: { latex: "x = y" } }] },
    ],
  };

  const blob = await buildWordDocumentBlob({
    doc,
    renderMath: async () => {
      throw new Error("math failed");
    },
  });
  const xml = await getDocumentXml(blob);

  assert.equal(xml.includes("公式渲染失败"), false);
  assert.equal(xml.includes("x^2+z^3"), false);
  assert.equal((xml.match(/<w:drawing>/g) || []).length >= 2, true);
});

test("exports videos as visible links instead of dropping them", async () => {
  const doc = {
    type: "doc",
    content: [{ type: "video", attrs: { src: "movie.mp4", assetSrc: "assets/movie.mp4" } }],
  };

  const blob = await buildWordDocumentBlob({ doc });
  const xml = await getDocumentXml(blob);

  assert.equal(xml.includes("Video:"), true);
  assert.equal(xml.includes("movie.mp4"), true);
});

test("exports video poster images with a link when a poster renderer is provided", async () => {
  const doc = {
    type: "doc",
    content: [{ type: "video", attrs: { src: "movie.mp4", assetSrc: "assets/movie.mp4" } }],
  };

  const blob = await buildWordDocumentBlob({
    doc,
    renderVideo: async () => ({
      data: new Uint8Array([137, 80, 78, 71]),
      width: 320,
      height: 180,
      type: "png",
    }),
  });
  const xml = await getDocumentXml(blob);

  assert.equal(xml.includes("<w:drawing>"), true);
  assert.equal(xml.includes("movie.mp4"), true);
});

test("exports code blocks as wrapped monospace lines", async () => {
  const doc = {
    type: "doc",
    content: [{ type: "codeBlock", attrs: { language: "python" }, content: [{ type: "text", text: "import opencv\ndef func():" }] }],
  };

  const blob = await buildWordDocumentBlob({ doc });
  const xml = await getDocumentXml(blob);

  assert.equal(xml.includes("import opencv"), true);
  assert.equal(xml.includes("<w:br/>"), true);
});

test("builds docx export file names", () => {
  assert.equal(getWordExportFileName("docs/readme.md"), "readme.docx");
  assert.equal(getWordExportFileName("notes"), "notes.docx");
});

async function getDocumentXml(blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file("word/document.xml").async("string");
}
