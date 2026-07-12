import test from "node:test";
import assert from "node:assert/strict";

import {
  createImageAsset,
  getBlobFingerprint,
  getImageExtension,
  getImageFilesFromFileList,
  getImageFilesFromItems,
  getNetworkImageName,
  hasImageFileItem,
  resolveInsertedImageAssetPath,
  isSupportedImageName,
} from "../src/core/assets.mjs";

test("detects supported image file names", () => {
  assert.equal(isSupportedImageName("diagram.png"), true);
  assert.equal(isSupportedImageName("photo.JPG"), true);
  assert.equal(isSupportedImageName("vector.svg"), true);
  assert.equal(isSupportedImageName("notes.md"), false);
});

test("extracts normalized image extensions", () => {
  assert.equal(getImageExtension("diagram.PNG"), "png");
  assert.equal(getImageExtension("archive.tar.gz"), "gz");
  assert.equal(getImageExtension("no-extension"), "");
});

test("creates a traceable asset path", () => {
  const asset = createImageAsset({
    originalName: "Architecture Diagram.PNG",
    now: new Date("2026-07-07T08:09:10Z"),
    id: "a83f9",
  });

  assert.deepEqual(asset, {
    alt: "Architecture Diagram",
    originalName: "Architecture Diagram.PNG",
    assetPath: "assets/asset_20260707_080910_a83f9.png",
  });
});

test("extracts image files from dropped or pasted files", () => {
  const image = { name: "paste.png", type: "image/png" };
  const text = { name: "notes.txt", type: "text/plain" };

  assert.deepEqual(getImageFilesFromFileList([image, text]), [image]);
});

test("extracts image files from clipboard items", () => {
  const image = { name: "clipboard.png", type: "image/png" };
  const items = [
    { kind: "string", type: "text/plain", getAsFile: () => null },
    { kind: "file", type: "image/png", getAsFile: () => image },
  ];

  assert.deepEqual(getImageFilesFromItems(items), [image]);
});

test("detects image file drag items", () => {
  assert.equal(hasImageFileItem([{ kind: "file", type: "image/png" }]), true);
  assert.equal(hasImageFileItem([{ kind: "file", type: "text/plain" }]), false);
  assert.equal(hasImageFileItem([{ kind: "string", type: "image/png" }]), false);
});

test("creates stable fingerprints for identical image blobs", async () => {
  const first = new Blob(["same image bytes"], { type: "image/png" });
  const second = new Blob(["same image bytes"], { type: "image/png" });
  const different = new Blob(["different image bytes"], { type: "image/png" });

  assert.equal(await getBlobFingerprint(first), await getBlobFingerprint(second));
  assert.notEqual(await getBlobFingerprint(first), await getBlobFingerprint(different));
});

test("uses the URL file name for supported network images", () => {
  assert.equal(
    getNetworkImageName("https://example.com/images/photo%20one.JPG?token=abc", "image/png"),
    "photo one.JPG",
  );
});

test("falls back to MIME type for network images without a supported URL name", () => {
  assert.equal(getNetworkImageName("https://example.com/image?id=1", "image/jpeg"), "network-image.jpg");
  assert.equal(getNetworkImageName("not a url", "image/svg+xml"), "network-image.svg");
});

test("keeps native file paths for inserted local image files", () => {
  assert.equal(
    resolveInsertedImageAssetPath({
      file: { name: "photo.png", path: "C:\\Users\\A\\photo.png" },
      generatedAsset: { originalName: "photo.png", assetPath: "assets/generated.png" },
      embedDataUrl: false,
    }),
    "C:/Users/A/photo.png",
  );
});

test("uses file names for browser inserted image files and no asset path for embedded data URLs", () => {
  assert.equal(
    resolveInsertedImageAssetPath({
      file: { name: "photo.png" },
      generatedAsset: { originalName: "photo.png", assetPath: "assets/generated.png" },
      embedDataUrl: false,
    }),
    "photo.png",
  );
  assert.equal(
    resolveInsertedImageAssetPath({
      file: { name: "photo.png", path: "C:\\Users\\A\\photo.png" },
      generatedAsset: { originalName: "photo.png", assetPath: "assets/generated.png" },
      embedDataUrl: true,
    }),
    null,
  );
});
