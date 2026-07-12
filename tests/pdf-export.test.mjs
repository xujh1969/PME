import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPdfExportHtml,
  sanitizePdfFileName,
} from "../src/core/pdf-export.mjs";

test("sanitizes PDF file names with the existing replacement behavior", () => {
  assert.equal(sanitizePdfFileName('a/b:c*?"<>|.pdf'), "a_b_c______.pdf");
  assert.equal(sanitizePdfFileName('  \\/:*?"<>|  '), "_________");
  assert.equal(sanitizePdfFileName("   "), "PME");
});

test("builds escaped PDF export HTML with requested page options", () => {
  const html = buildPdfExportHtml({
    title: "<Doc>",
    documentHtml: "<p>Body</p>",
    options: {
      includeTitle: true,
      paper: "Letter",
      orientation: "landscape",
    },
  });

  assert.match(html, /@page \{ size: Letter landscape;/);
  assert.match(html, /<title>&lt;Doc&gt; - PDF<\/title>/);
  assert.match(html, /<h1 class="pdf-title">&lt;Doc&gt;<\/h1>/);
  assert.match(html, /<p>Body<\/p>/);
});

test("omits PDF title heading when includeTitle is false", () => {
  const html = buildPdfExportHtml({
    title: "Doc",
    documentHtml: "<p>Body</p>",
    options: { includeTitle: false },
  });

  assert.equal(html.includes('<h1 class="pdf-title">'), false);
  assert.match(html, /@page \{ size: A4 portrait;/);
});
