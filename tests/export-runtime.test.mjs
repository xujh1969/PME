import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSvgPrintDimensions } from "../src/export/export-runtime.mjs";

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
  assert.equal(appSource.includes("function openPdfExportOptionsModal"), false);
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

test("prepares mindmaps for static export before printable HTML is returned", () => {
  assert.equal(runtimeSource.includes("prepareMindMapsForPrint"), true);
  assert.equal(runtimeSource.includes('querySelectorAll(".mindmap-diagram")'), true);
  assert.equal(runtimeSource.includes("getStaticMindMapDimensions"), true);
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
  }
});
