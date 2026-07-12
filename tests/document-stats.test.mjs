import test from "node:test";
import assert from "node:assert/strict";

import { getDocumentStats } from "../src/core/document-stats.mjs";

test("counts words and characters in document text", () => {
  assert.deepEqual(getDocumentStats("Hello PME\n中文 text"), {
    characters: 17,
    words: 4,
  });
});

test("treats blank document text as zero words", () => {
  assert.deepEqual(getDocumentStats("   \n\t"), {
    characters: 5,
    words: 0,
  });
});
