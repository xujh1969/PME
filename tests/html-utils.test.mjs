import test from "node:test";
import assert from "node:assert/strict";

import {
  cssEscape,
  escapeHtml,
} from "../src/core/html-utils.mjs";

test("escapes HTML text and attribute values", () => {
  assert.equal(escapeHtml('<button title="A&B">'), "&lt;button title=&quot;A&amp;B&quot;&gt;");
  assert.equal(escapeHtml(null), "");
});

test("escapes strings used inside quoted CSS selectors", () => {
  assert.equal(cssEscape('a\\b"c'), 'a\\\\b\\"c');
});
