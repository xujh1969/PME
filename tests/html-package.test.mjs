import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";

import { buildHtmlPackage } from "../src/core/html-package.mjs";

test("preserves complete remote URLs while collecting HTML package resources", async () => {
  const imageUrl = "https://example.com/images/photo.jpg";
  const videoUrl = "https://example.com/videos/demo.mp4";
  const loadedSources = [];

  const result = await buildHtmlPackage({
    doc: { type: "doc", content: [] },
    documentHtml: `<img src="${imageUrl}"><video src="${videoUrl}"></video>`,
    documentTitle: "Remote resources",
    imageNodes: [{ attrs: { src: imageUrl } }],
    videoNodes: [{ attrs: { src: videoUrl } }],
    htmlName: "document.html",
    rootSourcePath: "C:/docs/document.md",
    loadImageResource: async (source) => {
      loadedSources.push(source);
      const type = source.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
      return new Blob([source], { type });
    },
  });

  assert.deepEqual(loadedSources, [imageUrl, videoUrl]);
  assert.deepEqual(result.missing, []);
});

test("keeps original remote URLs when HTML package downloads fail", async () => {
  const imageUrl = "https://example.com/images/photo.jpg";
  const videoUrl = "https://example.com/videos/demo.mp4";

  const result = await buildHtmlPackage({
    doc: { type: "doc", content: [] },
    documentHtml: '<img src="blob:image-preview"><video src="blob:video-preview"></video>',
    documentTitle: "Remote fallback",
    imageNodes: [{ attrs: { assetSrc: imageUrl, src: "blob:image-preview" } }],
    videoNodes: [{ attrs: { assetSrc: videoUrl, src: "blob:video-preview" } }],
    htmlName: "document.html",
    rootSourcePath: "C:/docs/document.md",
    loadImageResource: async () => {
      throw new Error("network unavailable");
    },
  });

  const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
  const html = strFromU8(entries["document.html"]);
  assert.deepEqual(result.missing, []);
  assert.equal(html.includes(`src="${imageUrl}"`), true);
  assert.equal(html.includes(`src="${videoUrl}"`), true);
  assert.equal(html.includes("blob:image-preview"), false);
  assert.equal(html.includes("blob:video-preview"), false);
});
