import test from "node:test";
import assert from "node:assert/strict";

import { parseMarkdownHeadingShortcut } from "../src/core/markdown-shortcuts.mjs";

test("detects markdown heading shortcuts", () => {
  assert.deepEqual(parseMarkdownHeadingShortcut("## 测试标题"), {
    level: 2,
    text: "测试标题",
  });
});

test("ignores incomplete heading shortcuts", () => {
  assert.equal(parseMarkdownHeadingShortcut("## "), null);
  assert.equal(parseMarkdownHeadingShortcut("####### title"), null);
  assert.equal(parseMarkdownHeadingShortcut("plain text"), null);
});
