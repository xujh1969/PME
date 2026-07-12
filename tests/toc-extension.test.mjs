import test from "node:test";
import assert from "node:assert/strict";

import { getTableOfContentsItems } from "../src/core/toc-extension.mjs";

test("builds table-of-contents items from document headings", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Intro" }] },
      { type: "paragraph", content: [{ type: "text", text: "Body" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Deep" }] },
      { type: "heading", attrs: { level: 2 }, content: [] },
    ],
  };

  assert.deepEqual(getTableOfContentsItems(doc), [
    { index: 0, level: 1, text: "Intro" },
    { index: 1, level: 3, text: "Deep" },
  ]);
});
