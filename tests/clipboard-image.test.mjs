import test from "node:test";
import assert from "node:assert/strict";

import { getClipboardHtmlImageUrlFromHtml } from "../src/core/clipboard-image.mjs";

test("extracts HTTP image URLs from pasted HTML", () => {
  assert.equal(
    getClipboardHtmlImageUrlFromHtml('<p><img src="https://example.com/a.png"></p>'),
    "https://example.com/a.png",
  );
});

test("extracts data image URLs from pasted HTML", () => {
  assert.equal(
    getClipboardHtmlImageUrlFromHtml("<img alt='x' src='data:image/png;base64,abc'>"),
    "data:image/png;base64,abc",
  );
});

test("decodes HTML entities before validating the pasted image URL", () => {
  assert.equal(
    getClipboardHtmlImageUrlFromHtml('<img src="https://example.com/a.png?x=1&amp;y=2">', (value) => (
      value.replaceAll("&amp;", "&")
    )),
    "https://example.com/a.png?x=1&y=2",
  );
});

test("ignores non-remote pasted image URLs", () => {
  assert.equal(getClipboardHtmlImageUrlFromHtml('<img src="file:///tmp/a.png">'), "");
  assert.equal(getClipboardHtmlImageUrlFromHtml("<p>No image</p>"), "");
});
