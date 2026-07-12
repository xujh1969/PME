import test from "node:test";
import assert from "node:assert/strict";

import { findTextMatches, isIgnoredSearchElementName } from "../src/core/search.mjs";

test("finds all literal text matches", () => {
  assert.deepEqual(findTextMatches("alpha beta alpha", "alpha"), [
    { from: 0, to: 5 },
    { from: 11, to: 16 },
  ]);
});

test("finds matches case insensitively", () => {
  assert.deepEqual(findTextMatches("PME pme", "pme"), [
    { from: 0, to: 3 },
    { from: 4, to: 7 },
  ]);
});

test("returns no matches for blank queries", () => {
  assert.deepEqual(findTextMatches("text", " "), []);
});

test("identifies non-document text containers ignored by visual search", () => {
  assert.equal(isIgnoredSearchElementName("style"), true);
  assert.equal(isIgnoredSearchElementName("title"), true);
  assert.equal(isIgnoredSearchElementName("text"), false);
  assert.equal(isIgnoredSearchElementName("p"), false);
});
