import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPackagedImageName,
  collectImageNodes,
  isLocalAbsolutePath,
  normalizeDocumentResourcePath,
  packageImageNodes,
} from "../src/core/package-resources.mjs";

test("detects local absolute image paths", () => {
  assert.equal(isLocalAbsolutePath("C:/Users/A/image.png"), true);
  assert.equal(isLocalAbsolutePath("C:\\Users\\A\\image.png"), true);
  assert.equal(isLocalAbsolutePath("/Users/a/image.png"), true);
  assert.equal(isLocalAbsolutePath("assets/image.png"), false);
});

test("normalizes relative image paths against the markdown document", () => {
  assert.equal(
    normalizeDocumentResourcePath("../assets/a.png", "docs/post.md"),
    "assets/a.png",
  );
  assert.equal(
    normalizeDocumentResourcePath("images/a.png", "docs/post.md"),
    "docs/images/a.png",
  );
});

test("builds stable package image names from sources", () => {
  assert.equal(buildPackagedImageName("https://example.com/a photo.jpeg?x=1", "image/jpeg", 2), "002-a_20photo.jpg");
  assert.equal(buildPackagedImageName("data:image/png;base64,abc", "image/png", 3), "003-png;base64,abc.png");
});

test("collects image nodes recursively", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "image", attrs: { src: "one.png" } }] },
      { type: "image", attrs: { src: "two.png" } },
    ],
  };

  assert.deepEqual(
    collectImageNodes(doc).map((node) => node.attrs.src),
    ["one.png", "two.png"],
  );
});

test("packages image nodes once per source and rewrites nodes to assets paths", async () => {
  const nodes = [
    { attrs: { src: "C:/Users/A/photo.png" } },
    { attrs: { src: "C:/Users/A/photo.png" } },
    { attrs: { assetSrc: "https://example.com/remote.jpg", src: "preview://remote" } },
  ];

  const result = await packageImageNodes(nodes, async (source) => (
    new Blob([`bytes:${source}`], { type: source.endsWith(".jpg") ? "image/jpeg" : "image/png" })
  ));

  assert.deepEqual(result.missing, []);
  assert.deepEqual(Object.keys(result.entries), [
    "assets/001-photo.png",
    "assets/002-remote.jpg",
  ]);
  assert.equal(nodes[0].attrs.src, "assets/001-photo.png");
  assert.equal(nodes[0].attrs.assetSrc, "assets/001-photo.png");
  assert.equal(nodes[1].attrs.src, "assets/001-photo.png");
  assert.equal(nodes[2].attrs.src, "assets/002-remote.jpg");
});

test("records missing image sources without rewriting the failed node", async () => {
  const nodes = [
    { attrs: { src: "missing.png" } },
    { attrs: { src: "ok.png" } },
  ];

  const result = await packageImageNodes(nodes, async (source) => {
    if (source === "missing.png") {
      throw new Error("missing");
    }
    return new Blob(["ok"], { type: "image/png" });
  });

  assert.deepEqual(result.missing, ["missing.png"]);
  assert.deepEqual(Object.keys(result.entries), ["assets/001-ok.png"]);
  assert.equal(nodes[0].attrs.src, "missing.png");
  assert.equal(nodes[1].attrs.src, "assets/001-ok.png");
});
