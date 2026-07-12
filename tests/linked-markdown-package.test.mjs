import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8 } from "fflate";

import { collectLinkedMarkdownPackage } from "../src/core/linked-markdown-package.mjs";
import { parseMarkdown } from "../src/core/markdown.mjs";

test("recursively packages linked markdown, images, anchors, and cycles", async () => {
  const files = new Map([
    ["C:/notes/a.md", "[Read B](sub/b.md#part)\n\n![Chart](images/chart.png)\n"],
    ["C:/notes/sub/b.md", "[Back to A](../a.md)\n"],
  ]);

  const result = await collectLinkedMarkdownPackage({
    rootDoc: parseMarkdown("[Read A](C:/notes/a.md#intro)\n"),
    rootName: "root.md",
    rootSourcePath: "D:/work/root.md",
    loadText: async (path) => {
      if (!files.has(path)) throw new Error("missing");
      return files.get(path);
    },
    loadImageResource: async (path) => {
      assert.equal(path, "C:/notes/images/chart.png");
      return new Blob(["chart"], { type: "image/png" });
    },
  });

  const paths = Object.keys(result.entries).sort();
  const documents = paths.filter((path) => path.startsWith("documents/"));
  assert.equal(documents.length, 2);
  assert.equal(paths.some((path) => path === "assets/001-chart.png"), true);
  assert.equal(strFromU8(result.entries["root.md"]).includes(`](${documents.find((path) => path.includes("a-"))}#intro)`), true);

  const aPath = documents.find((path) => path.includes("a-"));
  const bPath = documents.find((path) => path.includes("b-"));
  const aText = strFromU8(result.entries[aPath]);
  const bText = strFromU8(result.entries[bPath]);
  assert.equal(aText.includes(`](${bPath.split("/").at(-1)}#part)`), true);
  assert.equal(aText.includes("![Chart](../assets/001-chart.png)"), true);
  assert.equal(bText.includes(`](${aPath.split("/").at(-1)})`), true);
  assert.deepEqual(result.missing, []);
});

test("uses stable distinct names for same-name documents and reports missing links", async () => {
  const result = await collectLinkedMarkdownPackage({
    rootDoc: parseMarkdown("[One](C:/one/readme.md) [Two](D:/two/readme.md) [Missing](C:/none.md)\n"),
    rootName: "root.md",
    rootSourcePath: "C:/root.md",
    loadText: async (path) => {
      if (path === "C:/none.md") throw new Error("missing");
      return `# ${path}`;
    },
    loadImageResource: async () => { throw new Error("unexpected"); },
  });

  const documents = Object.keys(result.entries).filter((path) => path.startsWith("documents/"));
  assert.equal(documents.length, 2);
  assert.equal(new Set(documents).size, 2);
  assert.deepEqual(result.missing, ["C:/none.md"]);
  assert.equal(strFromU8(result.entries["root.md"]).includes("[Missing](C:/none.md)"), true);
});
