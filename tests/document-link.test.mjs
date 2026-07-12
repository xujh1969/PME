import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { resolveLocalMarkdownLink } from "../src/editor/document-link.mjs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");

test("resolves absolute and relative local Markdown links", () => {
  assert.equal(resolveLocalMarkdownLink("C:/docs/a.md#intro", "D:/root.md"), "C:/docs/a.md");
  assert.equal(resolveLocalMarkdownLink("../notes/a.markdown", "C:/docs/root.md"), "C:/notes/a.markdown");
});

test("ignores web links, anchors, and non-Markdown files", () => {
  assert.equal(resolveLocalMarkdownLink("https://example.com/a.md", "C:/root.md"), null);
  assert.equal(resolveLocalMarkdownLink("#intro", "C:/root.md"), null);
  assert.equal(resolveLocalMarkdownLink("file.txt", "C:/root.md"), null);
});

test("claims local Markdown link clicks before the editor marks content modified", () => {
  assert.equal(appSource.includes("event.preventDefault();"), true);
  assert.equal(appSource.includes("event.stopPropagation();"), true);
  assert.equal(appSource.includes("event.stopImmediatePropagation?.();"), true);
  assert.equal(appSource.includes('addEventListener("click", handleDocumentLinkClick, { capture: true })'), true);
  assert.equal(appSource.includes('addEventListener("pointerdown", handleDocumentLinkPress, { capture: true })'), true);
  assert.equal(appSource.includes('addEventListener("mousedown", handleDocumentLinkPress, { capture: true })'), true);
  assert.match(appSource, /function claimDocumentLinkPressEvent\(event\)\s*\{\s*event\.preventDefault\(\);/);
  assert.equal(appSource.includes("documentLinkPressTabState"), true);
  assert.equal(appSource.includes("restoreDocumentLinkPressTabState();"), true);
});

test("imports the local absolute path helper used by save and linked file resolution", () => {
  assert.match(appSource, /import\s*\{[\s\S]*isLocalAbsolutePath[\s\S]*\}\s*from "\.\/core\/package-resources\.mjs";/);
});
