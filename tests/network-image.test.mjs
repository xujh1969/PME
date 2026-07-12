import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const imageInputSource = readFileSync(new URL("../src/editor/image-input.mjs", import.meta.url), "utf8");
const imageInsertModalSource = readFileSync(new URL("../src/ui/image-insert-modal.mjs", import.meta.url), "utf8");
const exportRuntimeSource = readFileSync(new URL("../src/export/export-runtime.mjs", import.meta.url), "utf8");
const assetsSource = readFileSync(new URL("../src/core/assets.mjs", import.meta.url), "utf8");
const markdownPackageSource = readFileSync(new URL("../src/core/markdown-package.mjs", import.meta.url), "utf8");
const packageResourcesSource = readFileSync(new URL("../src/core/package-resources.mjs", import.meta.url), "utf8");

test("keeps network image URLs in the source document during editing", () => {
  const networkImageFunction = appSource.match(/async function insertNetworkImage[\s\S]+?\r?\n}\r?\n\r?\nfunction handleDragEnter/)?.[0] || "";

  assert.equal(networkImageFunction.includes("fetch(url)"), false);
  assert.equal(networkImageFunction.includes("src: url"), true);
  assert.equal(appSource.includes("getNetworkImageName,"), true);
  assert.equal(assetsSource.includes("export function getNetworkImageName"), true);
  assert.equal(appSource.includes("new globalThis.File("), false);
});

test("packages markdown images through the explicit document package flow", () => {
  assert.equal(appSource.includes("async function packageCurrentDocument()"), true);
  assert.equal(appSource.includes("buildMarkdownPackage({"), true);
  assert.equal(markdownPackageSource.includes("zipSync(zipEntries)"), true);
  assert.equal(appSource.includes('menuItem("package-document"'), true);
});

test("packages local absolute image paths through the Tauri binary reader", () => {
  assert.equal(exportRuntimeSource.includes("async function loadLocalImageResource"), true);
  assert.equal(exportRuntimeSource.includes("read_binary_file_path"), true);
  assert.equal(imageInsertModalSource.includes("pick_image_file_dialog"), true);
  assert.equal(imageInsertModalSource.includes("assetPath: image.path.replace"), true);
  assert.equal(markdownPackageSource.includes("packageImageNodes(imageNodes, loadImageResource)"), true);
  assert.equal(packageResourcesSource.includes("node.attrs.src = assetPath"), true);
});

test("embeds pasted image data without writing an assets file while editing", () => {
  assert.equal(imageInputSource.includes("function getClipboardHtmlImageUrl"), true);
  assert.equal(appSource.includes("insertNetworkImage(htmlImageUrl)"), true);
  assert.equal(appSource.includes("insertImageFiles(imageFiles, { embedDataUrl: true })"), true);
  assert.equal(appSource.includes("writeBlobFile(asset.assetPath"), false);
});
