import test from "node:test";
import assert from "node:assert/strict";

import { loadImageResource } from "../src/core/image-resource-loader.mjs";

test("loads remote image resources through fetch", async () => {
  const blob = await loadImageResource("https://example.com/a.png", {
    fetchResource: async (source) => ({
      ok: true,
      blob: async () => new Blob([source], { type: "image/png" }),
    }),
  });

  assert.equal(blob.type, "image/png");
  assert.equal(await blob.text(), "https://example.com/a.png");
});

test("rejects fetched non-image resources", async () => {
  await assert.rejects(
    () => loadImageResource("https://example.com/a.txt", {
      fetchResource: async () => ({
        ok: true,
        blob: async () => new Blob(["text"], { type: "text/plain" }),
      }),
    }),
    /Not an image/,
  );
});

test("loads Tauri local absolute image resources through the local loader", async () => {
  const blob = await loadImageResource("C:/Users/A/photo.png", {
    isTauri: true,
    loadLocalImageResource: async (source) => new Blob([source], { type: "image/png" }),
  });

  assert.equal(await blob.text(), "C:/Users/A/photo.png");
});

test("loads relative document resources from hydrated preview URLs", async () => {
  const blob = await loadImageResource("../assets/a.png", {
    selectedPath: "docs/post.md",
    files: {
      "assets/a.png": "blob:asset-preview",
    },
    fetchResource: async (source) => ({
      ok: true,
      blob: async () => new Blob([source], { type: "image/png" }),
    }),
  });

  assert.equal(await blob.text(), "blob:asset-preview");
});

test("reports unavailable document resources", async () => {
  await assert.rejects(
    () => loadImageResource("assets/missing.png", {
      selectedPath: "post.md",
      files: {},
    }),
    /Resource unavailable/,
  );
});
