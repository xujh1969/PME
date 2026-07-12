import test from "node:test";
import assert from "node:assert/strict";

import { extractOutline } from "../src/core/outline.mjs";

test("extracts heading levels and text from a document", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Intro" }] },
      { type: "paragraph", content: [{ type: "text", text: "Body" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Details" }] },
    ],
  };

  assert.deepEqual(extractOutline(doc), [
    { index: 0, level: 1, text: "Intro" },
    { index: 1, level: 3, text: "Details" },
  ]);
});

test("ignores blank headings", () => {
  assert.deepEqual(extractOutline({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [] },
    ],
  }), []);
});
