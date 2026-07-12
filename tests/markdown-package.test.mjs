import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";

import { buildMarkdownPackage, getMarkdownPackageFileName } from "../src/core/markdown-package.mjs";

test("builds a markdown zip package with assets and rewritten image paths", async () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Doc" }] },
      { type: "image", attrs: { src: "C:/Users/A/photo.png", alt: "Photo" } },
    ],
  };
  const imageNodes = [doc.content[1]];

  const result = await buildMarkdownPackage({
    doc,
    imageNodes,
    markdownName: "note.md",
    loadImageResource: async () => new Blob(["image-bytes"], { type: "image/png" }),
  });

  const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
  assert.deepEqual(Object.keys(entries).sort(), ["assets/001-photo.png", "note.md"]);
  assert.equal(strFromU8(entries["note.md"]).includes("![Photo](assets/001-photo.png)"), true);
  assert.equal(strFromU8(entries["assets/001-photo.png"]), "image-bytes");
  assert.deepEqual(result.missing, []);
});

test("records missing package images while still generating markdown", async () => {
  const doc = {
    type: "doc",
    content: [{ type: "image", attrs: { src: "missing.png", alt: "Missing" } }],
  };

  const result = await buildMarkdownPackage({
    doc,
    imageNodes: [doc.content[0]],
    markdownName: "note.md",
    loadImageResource: async () => {
      throw new Error("missing");
    },
  });

  const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
  assert.equal(strFromU8(entries["note.md"]).includes("![Missing](missing.png)"), true);
  assert.deepEqual(result.missing, ["missing.png"]);
});

test("builds default markdown package zip file names", () => {
  assert.equal(getMarkdownPackageFileName("note.md"), "note.zip");
  assert.equal(getMarkdownPackageFileName("note.markdown"), "note.zip");
  assert.equal(getMarkdownPackageFileName(".md"), "document.zip");
});

test("builds a recursive package when linked Markdown loading is available", async () => {
  const doc = {
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{ type: "text", text: "Child", marks: [{ type: "link", attrs: { href: "C:/docs/child.md" } }] }],
    }],
  };

  const result = await buildMarkdownPackage({
    doc,
    markdownName: "root.md",
    rootSourcePath: "C:/root.md",
    loadText: async () => "# Child\n",
    loadImageResource: async () => { throw new Error("unused"); },
  });
  const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));

  assert.equal(Object.keys(entries).some((path) => path.startsWith("documents/child-")), true);
  assert.equal(strFromU8(entries["root.md"]).includes("documents/child-"), true);
});
