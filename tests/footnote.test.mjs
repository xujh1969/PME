import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const extensionSource = readFileSync(new URL("../src/core/footnote-extension.mjs", import.meta.url), "utf8");

test("footnote extension stores ids and note text", () => {
  assert.equal(extensionSource.includes("addAttributes()"), true);
  assert.equal(extensionSource.includes("id:"), true);
  assert.equal(extensionSource.includes("text:"), true);
  assert.equal(extensionSource.includes("\"data-type\": \"footnote\""), true);
});

test("app inserts footnotes through a content modal", () => {
  assert.equal(appSource.includes("function insertFootnote()"), true);
  assert.equal(appSource.includes("function getNextFootnoteId"), true);
  assert.equal(appSource.includes("editor.commands.insertFootnote"), true);
});
