import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getMermaidPrintDimensions,
  getSvgPrintDimensions,
  getVideoPrintDimensions,
  markPrintableImagesForPagination,
  prepareMindMapsForPrint,
  prepareVideosForPrint,
} from "../src/export/export-runtime.mjs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../src/export/export-runtime.mjs", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../src/ui/pdf-export-modal.mjs", import.meta.url), "utf8");
const pdfExportSource = readFileSync(new URL("../src/core/pdf-export.mjs", import.meta.url), "utf8");
const htmlPackageSource = readFileSync(new URL("../src/core/html-package.mjs", import.meta.url), "utf8");

test("owns environment-specific export helpers outside the app entry", () => {
  assert.equal(runtimeSource.includes("export async function loadLocalImageResource"), true);
  assert.equal(runtimeSource.includes("export function downloadBlob"), true);
  assert.equal(runtimeSource.includes("export function printPdfHtml"), true);
  assert.equal(runtimeSource.includes("export async function getPrintableDocumentHtml"), true);
  assert.equal(runtimeSource.includes("export function blobToDataUrl"), true);
  assert.equal(appSource.includes("function downloadBlob"), false);
  assert.equal(appSource.includes("function blobToDataUrl"), false);
});

test("owns the PDF options modal outside the app entry", () => {
  assert.equal(modalSource.includes("export function openPdfExportOptionsModal"), true);
  assert.equal(modalSource.includes("data-pdf-orientation"), true);
  assert.equal(modalSource.includes("data-pdf-title"), false);
  assert.equal(modalSource.includes("includeTitle"), false);
  assert.equal(appSource.includes("function openPdfExportOptionsModal"), false);
});

test("uses one default heading weight and color in HTML output", () => {
  assert.match(htmlPackageSource, /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?color:\s*var\(--color-ink\);[\s\S]*?font-weight:\s*500;/);
  assert.doesNotMatch(htmlPackageSource, /h[1-6]\s*\{[^}]*font-weight:\s*300;/);
});

test("derives Mermaid PDF dimensions from viewBox when svg width is percentage", () => {
  const svg = {
    getAttribute(name) {
      return {
        width: "100%",
        height: "240",
        viewBox: "0 0 960 240",
      }[name] || null;
    },
    style: {},
  };

  assert.deepEqual(getSvgPrintDimensions(svg, 600), {
    sourceWidth: 960,
    sourceHeight: 240,
    targetWidth: 600,
    targetHeight: 150,
  });
});

test("constrains tall Mermaid PDF dimensions to printable page height", () => {
  const svg = {
    getAttribute(name) {
      return {
        width: "600",
        height: "2400",
        viewBox: "0 0 600 2400",
      }[name] || null;
    },
    style: {},
  };

  assert.deepEqual(getSvgPrintDimensions(svg, 600, 760), {
    sourceWidth: 600,
    sourceHeight: 2400,
    targetWidth: 190,
    targetHeight: 760,
  });
});

test("applies saved Mermaid scale before constraining it to the page", () => {
  const svg = {
    getAttribute(name) {
      return name === "viewBox" ? "0 0 400 200" : null;
    },
    style: {},
  };

  assert.deepEqual(getMermaidPrintDimensions(svg, 50, 600, 760), {
    sourceWidth: 400,
    sourceHeight: 200,
    targetWidth: 200,
    targetHeight: 100,
  });
  assert.deepEqual(getMermaidPrintDimensions(svg, 200, 600, 760), {
    sourceWidth: 400,
    sourceHeight: 200,
    targetWidth: 600,
    targetHeight: 300,
  });
});

test("does not force Mermaid SVG fallbacks to fill PDF page width", () => {
  const mermaidSvgRule = pdfExportSource.match(/\.mermaid-diagram svg\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(mermaidSvgRule.includes("width: auto !important;"), true);
  assert.equal(/(^|\n)\s*width:\s*100%\s*!important;/.test(mermaidSvgRule), false);
});

test("centers exported Mermaid diagrams without viewport borders", () => {
  for (const source of [pdfExportSource, htmlPackageSource]) {
    const viewportRule = source.match(/\.mermaid-diagram__viewport\s*\{[^}]+\}/)?.[0] || "";
    const contentRule = source.match(/\.mermaid-diagram__content\s*\{[^}]+\}/)?.[0] || "";
    const svgRule = source.match(/\.mermaid-diagram svg\s*\{[^}]+\}/)?.[0] || "";
    const imageRule = source.match(/\.mermaid-diagram img\s*\{[^}]+\}/)?.[0] || "";

    assert.equal(viewportRule.includes("border: 0 !important;"), true);
    assert.equal(contentRule.includes("display: flex !important;"), true);
    assert.equal(contentRule.includes("justify-content: center !important;"), true);
    assert.equal(svgRule.includes("width: auto !important;"), true);
    assert.equal(/(^|\n)\s*width:\s*100%\s*!important;/.test(svgRule), false);
    assert.equal(imageRule.includes("display: block !important;"), true);
    assert.equal(imageRule.includes("margin: 0 auto !important;"), true);
  }
});

test("does not force PDF Mermaid containers to avoid page breaks", () => {
  const diagramRule = pdfExportSource.match(/\.mermaid-diagram\s*\{[^}]+\}/)?.[0] || "";
  const viewportRule = pdfExportSource.match(/\.mermaid-diagram__viewport\s*\{[^}]+\}/)?.[0] || "";
  const contentRule = pdfExportSource.match(/\.mermaid-diagram__content\s*\{[^}]+\}/)?.[0] || "";

  assert.equal(diagramRule.includes("break-inside: avoid !important;"), false);
  assert.equal(diagramRule.includes("page-break-inside: avoid !important;"), false);
  assert.equal(viewportRule.includes("break-inside: avoid !important;"), false);
  assert.equal(contentRule.includes("break-inside: avoid !important;"), false);
});

test("marks printable images to avoid splitting unless they are clearly long", () => {
  assert.equal(runtimeSource.includes("markPrintableImagesForPagination(clone);"), true);
  assert.equal(runtimeSource.includes("const pageHeight = 760;"), true);
  assert.equal(runtimeSource.includes("const nearPageHeight = pageHeight * 1.2;"), true);
  assert.equal(pdfExportSource.includes(".pdf-avoid-split"), true);
  assert.equal(pdfExportSource.includes("page-break-inside: avoid;"), true);
  assert.equal(pdfExportSource.includes(".pdf-fit-single-page"), true);
  assert.equal(pdfExportSource.includes("max-height: 760px;"), true);
  assert.equal(pdfExportSource.includes(".pdf-allow-split"), true);

  const shortBlock = createPaginationBlock();
  const nearPageBlock = createPaginationBlock();
  const longBlock = createPaginationBlock();
  const shortImage = createPaginationImage("500", shortBlock);
  const nearPageImage = createPaginationImage("780", nearPageBlock);
  const longImage = createPaginationImage("1200", longBlock);

  markPrintableImagesForPagination({
    querySelectorAll(selector) {
      return selector === "img" ? [shortImage, nearPageImage, longImage] : [];
    },
  });

  assert.equal(shortImage.classList.has("pdf-avoid-split"), true);
  assert.equal(shortBlock.classList.has("pdf-avoid-split"), true);
  assert.equal(nearPageImage.classList.has("pdf-fit-single-page"), true);
  assert.equal(nearPageBlock.classList.has("pdf-avoid-split"), true);
  assert.equal(longImage.classList.has("pdf-allow-split"), true);
  assert.equal(longBlock.classList.has("pdf-allow-split"), true);
});

test("prepares mindmaps for static export before printable HTML is returned", () => {
  assert.equal(runtimeSource.includes("prepareMindMapsForPrint"), true);
  assert.equal(runtimeSource.includes('querySelectorAll(".mindmap-diagram")'), true);
  assert.equal(runtimeSource.includes("getStaticMindMapDimensions"), true);
  assert.equal(runtimeSource.includes("buildMindMapStaticSvg"), true);
  assert.equal(runtimeSource.includes("staticMap.width"), true);
  assert.equal(runtimeSource.includes("staticMap.height"), true);
  assert.equal(runtimeSource.includes("getBoundingClientRect"), false);
});

test("prepares videos as poster images before printable HTML is returned", () => {
  assert.equal(runtimeSource.includes("await prepareVideosForPrint(clone);"), true);
  assert.equal(runtimeSource.includes("export async function prepareVideosForPrint"), true);
  assert.equal(runtimeSource.includes('root.querySelectorAll("video")'), true);
  assert.equal(runtimeSource.includes('querySelectorAll(".video-node__controls")'), true);
  assert.equal(runtimeSource.includes("context.drawImage(video"), true);
  assert.equal(runtimeSource.includes('canvas.toDataURL("image/png")'), true);
});

test("applies saved video scale to PDF and static HTML poster dimensions", () => {
  assert.deepEqual(getVideoPrintDimensions(1280, 720, 50, 600), {
    width: 300,
    height: 169,
  });
  assert.deepEqual(getVideoPrintDimensions(1280, 720, 150, 600), {
    width: 600,
    height: 338,
  });
  for (const source of [pdfExportSource, htmlPackageSource]) {
    const videoRule = source.match(/\.video-node\s*\{[^}]+\}/)?.[0] || "";
    assert.equal(videoRule.includes("margin: 16px auto"), true);
    assert.equal(videoRule.includes("max-width: 100%"), true);
  }
  assert.equal(appSource.includes("async function renderVideoWordPoster(source, node = {})"), true);
  assert.equal(appSource.includes("node.attrs?.scale"), true);
});

test("routes packaged HTML through the staticized clone without inlining package assets", () => {
  assert.equal(
    appSource.includes("await getPrintableDocumentHtml(doc, { inlineImages: false })"),
    true,
  );
  assert.equal(
    appSource.includes('const documentHtml = editor?.view?.dom?.innerHTML || "";'),
    false,
  );
  assert.equal(runtimeSource.includes("if (inlineImages)"), true);
});

test("uses configured font stacks in packaged HTML export", () => {
  assert.equal(htmlPackageSource.includes("getCurrentFonts"), true);
  assert.equal(htmlPackageSource.includes("buildEditorFontStack(fonts)"), true);
  assert.equal(htmlPackageSource.includes("buildDisplayFontStack(fonts)"), true);
  assert.equal(htmlPackageSource.includes("--font-mono: ${fonts.code};"), true);
});

test("replaces Mind Elixir custom DOM with a static image", async () => {
  const previousDocument = globalThis.document;
  const content = {
    innerHTML: "<me-nodes><me-tpc>Interactive</me-tpc></me-nodes>",
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
  };
  const map = {
    dataset: {
      mindmap: JSON.stringify({
        nodeData: { id: "root", topic: "Static", children: [] },
      }),
    },
    querySelector(selector) {
      return selector === ".mindmap-diagram__content" ? content : null;
    },
  };
  globalThis.document = {
    createElement(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        style: {},
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
      };
    },
  };

  try {
    await prepareMindMapsForPrint({
      querySelectorAll(selector) {
        return selector === ".mindmap-diagram" ? [map] : [];
      },
    });
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(content.innerHTML, "");
  assert.equal(content.children.length, 1);
  assert.equal(content.children[0].tagName, "IMG");
  assert.match(content.children[0].src, /^data:image\/svg\+xml/);
  assert.equal(content.children[0].src.includes("<me-"), false);
});

test("isolates mindmap export failures and emits an escaped placeholder", () => {
  assert.equal(runtimeSource.includes('console.warn("Failed to export mind map"'), true);
  assert.equal(runtimeSource.includes("mindmap-diagram__error"), true);
  assert.equal(runtimeSource.includes("escapeHtml(message)"), true);
});

test("exports static mindmaps with centered borderless styles", () => {
  for (const source of [pdfExportSource, htmlPackageSource]) {
    const viewportRule = source.match(/\.mindmap-diagram__viewport\s*\{[^}]+\}/)?.[0] || "";
    const contentRule = source.match(/\.mindmap-diagram__content\s*\{[^}]+\}/)?.[0] || "";
    const imageRule = source.match(/\.mindmap-diagram img\s*\{[^}]+\}/)?.[0] || "";

    assert.equal(viewportRule.includes("border: 0 !important;"), true);
    assert.equal(contentRule.includes("justify-content: center !important;"), true);
    assert.equal(imageRule.includes("margin: 0 auto !important;"), true);
    assert.equal(imageRule.includes("max-width: 100% !important;"), true);
    assert.equal(imageRule.includes("border: 0 !important;"), true);
    assert.equal(imageRule.includes("border-radius: 0 !important;"), true);
  }
});

function createPaginationBlock() {
  return {
    classList: new Set(),
    parentElement: null,
  };
}

function createPaginationImage(height, block) {
  return {
    naturalHeight: 0,
    parentElement: block,
    style: {},
    classList: new Set(),
    getAttribute(name) {
      return name === "height" ? height : null;
    },
    closest() {
      return block;
    },
  };
}
