import test from "node:test";
import assert from "node:assert/strict";

import { collapseOutlineAtLevel, extractOutline } from "../src/core/outline.mjs";

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

const outline = [
  { index: 0, level: 1, text: "Introduction" },
  { index: 1, level: 2, text: "Context" },
  { index: 2, level: 3, text: "Details" },
  { index: 3, level: 2, text: "Approach" },
  { index: 4, level: 3, text: "Implementation" },
  { index: 5, level: 4, text: "Nested section" },
  { index: 6, level: 5, text: "Nested" },
  { index: 7, level: 6, text: "Deep detail" },
  { index: 8, level: 4, text: "Leaf" },
  { index: 9, level: 1, text: "Conclusion" },
];

const leafOutline = [
  { index: 0, level: 4, text: "Leaf" },
  { index: 1, level: 1, text: "Conclusion" },
];

test("collapses every H1 outline group with descendants", () => {
  assert.deepEqual(
    collapseOutlineAtLevel(outline, new Set(["outline-group-6"]), 1),
    new Set(["outline-group-0", "outline-group-6"]),
  );
});

test("expanding higher levels at H3 clears H1 and H2 groups", () => {
  assert.deepEqual(
    collapseOutlineAtLevel(outline, new Set(["outline-group-0", "outline-group-1", "outline-group-6"]), 3),
    new Set(["outline-group-4", "outline-group-6"]),
  );
});

test("preserves deeper collapsed groups while changing the selected level", () => {
  assert.deepEqual(
    collapseOutlineAtLevel(outline, new Set(["outline-group-6"]), 2),
    new Set(["outline-group-1", "outline-group-3", "outline-group-6"]),
  );
});

test("collapses the real H5 group when level 5 is selected", () => {
  assert.deepEqual(
    collapseOutlineAtLevel(outline, new Set(), 5),
    new Set(["outline-group-6"]),
  );
});

test("collapses the H4 group that has descendants", () => {
  assert.deepEqual(
    collapseOutlineAtLevel(outline, new Set(), 4),
    new Set(["outline-group-5"]),
  );
});

test("does not create a group for a leaf H4", () => {
  assert.deepEqual(
    collapseOutlineAtLevel(leafOutline, new Set(), 4),
    new Set(),
  );
});

test("all-expand clears every collapsed outline group", () => {
  assert.deepEqual(
    collapseOutlineAtLevel(outline, new Set(["outline-group-0", "outline-group-5", "outline-group-6"]), null),
    new Set(),
  );
});
