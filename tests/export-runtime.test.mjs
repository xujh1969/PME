import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../src/export/export-runtime.mjs", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../src/ui/pdf-export-modal.mjs", import.meta.url), "utf8");

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
