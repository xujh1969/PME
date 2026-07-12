import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTextAlign } from "../src/core/text-align.mjs";

test("keeps supported text align values", () => {
  assert.equal(normalizeTextAlign("left"), "left");
  assert.equal(normalizeTextAlign("center"), "center");
  assert.equal(normalizeTextAlign("right"), "right");
});

test("normalizes unsupported text align values to null", () => {
  assert.equal(normalizeTextAlign("justify"), null);
  assert.equal(normalizeTextAlign(""), null);
  assert.equal(normalizeTextAlign(null), null);
});
