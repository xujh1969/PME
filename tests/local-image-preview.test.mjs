import test from "node:test";
import assert from "node:assert/strict";

import { hydrateDocumentMapLocalImages, hydrateLocalImagePreviews } from "../src/core/local-image-preview.mjs";

test("hydrates local absolute image paths with preview URLs while preserving asset paths", async () => {
  const doc = {
    type: "doc",
    content: [
      { type: "image", attrs: { src: "C:/Users/A/demo/photo.jpeg", alt: "Photo" } },
    ],
  };

  const hydrated = await hydrateLocalImagePreviews(doc, async (source) => (
    new Blob([source], { type: "image/jpeg" })
  ));

  assert.equal(hydrated.content[0].attrs.assetSrc, "C:/Users/A/demo/photo.jpeg");
  assert.equal(hydrated.content[0].attrs.src.startsWith("data:image/jpeg;base64,"), true);
});

test("hydrates every opened document before the first editor render", async () => {
  const documents = {
    "a.md": { type: "doc", content: [{ type: "image", attrs: { src: "C:/a.png" } }] },
    "b.md": { type: "doc", content: [{ type: "paragraph" }] },
  };

  const hydrated = await hydrateDocumentMapLocalImages(documents, async () => (
    new Blob(["a"], { type: "image/png" })
  ));

  assert.equal(hydrated["a.md"].content[0].attrs.assetSrc, "C:/a.png");
  assert.match(hydrated["a.md"].content[0].attrs.src, /^data:image\/png;base64,/);
  assert.deepEqual(hydrated["b.md"], documents["b.md"]);
});

test("leaves non-local and failed local image previews unchanged", async () => {
  const doc = {
    type: "doc",
    content: [
      { type: "image", attrs: { src: "assets/a.png" } },
      { type: "image", attrs: { src: "C:/Users/A/missing.png" } },
    ],
  };

  const hydrated = await hydrateLocalImagePreviews(doc, async () => {
    throw new Error("missing");
  });

  assert.deepEqual(hydrated, doc);
});
