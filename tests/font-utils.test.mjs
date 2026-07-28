import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDisplayFontStack,
  buildEditorFontStack,
  getPrimaryFontFamily,
  stripGenericFontFallbacks,
} from "../src/core/font-utils.mjs";

test("builds editor font stack without generic fallback before Chinese fonts", () => {
  const stack = buildEditorFontStack({
    english: '"Times New Roman", Georgia, serif',
    chinese: '"KaiTi", "Microsoft YaHei", serif',
  });

  assert.equal(stack, '"Times New Roman", Georgia, "KaiTi", "Microsoft YaHei", sans-serif');
  assert.equal(stack.indexOf("KaiTi") < stack.indexOf("sans-serif"), true);
});

test("builds display font stack from configured English and Chinese fonts", () => {
  const stack = buildDisplayFontStack({
    english: '"Georgia", "Times New Roman", serif',
    chinese: '"FangSong", "Microsoft YaHei", serif',
  });

  assert.equal(stack.includes('"Georgia"'), true);
  assert.equal(stack.includes('"FangSong"'), true);
  assert.equal(stack.endsWith("serif"), true);
});

test("extracts primary font family for Word export", () => {
  assert.equal(getPrimaryFontFamily('"JetBrains Mono", "Consolas", monospace'), "JetBrains Mono");
  assert.equal(stripGenericFontFallbacks('"Inter", sans-serif'), '"Inter"');
});
