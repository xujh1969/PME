import assert from "node:assert/strict";
import test from "node:test";

import {
  getCodeIndentUnit,
  getNextCodeLineIndent,
} from "../src/core/code-indent.mjs";

test("chooses indentation size by code language", () => {
  assert.equal(getCodeIndentUnit("js"), "  ");
  assert.equal(getCodeIndentUnit("json"), "  ");
  assert.equal(getCodeIndentUnit("python"), "    ");
  assert.equal(getCodeIndentUnit("java"), "    ");
});

test("keeps current indentation on a new code line", () => {
  assert.equal(getNextCodeLineIndent({
    language: "js",
    previousLine: "  const value = 1;",
  }), "  ");
});

test("adds language-specific indentation after block openers", () => {
  assert.equal(getNextCodeLineIndent({
    language: "js",
    previousLine: "  if (ready) {",
  }), "    ");
  assert.equal(getNextCodeLineIndent({
    language: "python",
    previousLine: "    if ready:",
  }), "        ");
});
