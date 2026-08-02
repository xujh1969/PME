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

  assert.match(html, /@page \{[\s\S]*size: Letter landscape;/);
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
  assert.match(html, /@page \{[\s\S]*size: A4 portrait;/);
});

test("uses configured font helpers in PDF export HTML", () => {
  const html = buildPdfExportHtml({
    title: "Doc",
    documentHtml: "<p>Body</p>",
    options: { includeTitle: false },
  });

  assert.match(html, /--font-editor:\s*"Inter"[\s\S]*Noto Sans SC/);
  assert.match(html, /--font-display:\s*"Inter"[\s\S]*Noto Sans SC/);
  assert.match(html, /--font-mono:\s*"JetBrains Mono"/);
});

test("keeps H4 through H6 PDF headings at least as large as body text", () => {
  const html = buildPdfExportHtml({
    title: "Doc",
    documentHtml: "<h4>Four</h4><h5>Five</h5><h6>Six</h6>",
    options: { includeTitle: false },
  });

  assert.match(html, /h4\s*\{\s*font-size:\s*1\.25rem;/);
  assert.match(html, /h5\s*\{\s*font-size:\s*1\.125rem;/);
  assert.match(html, /h6\s*\{\s*font-size:\s*1rem;/);
});

test("uses one default heading weight and color in PDF output", () => {
  const html = buildPdfExportHtml({
    title: "Doc",
    documentHtml: "<h1>One</h1><h6>Six</h6>",
    options: { includeTitle: false },
  });

  assert.match(html, /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?color:\s*var\(--color-ink\);[\s\S]*?font-weight:\s*500;/);
  assert.doesNotMatch(html, /h[1-6]\s*\{[^}]*font-weight:\s*300;/);
});

test("fits static PDF tables to the printable width without scrolling", () => {
  const html = buildPdfExportHtml({
    title: "Doc",
    documentHtml: '<div class="tableWrapper"><table><colgroup><col style="width: 25%"></colgroup></table></div>',
    options: { includeTitle: false },
  });

  assert.match(html, /table\s*\{[^}]*width:\s*100%;[^}]*table-layout:\s*fixed;/s);
  assert.match(html, /th, td\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  assert.match(html, /\.tableWrapper\s*\{[^}]*overflow:\s*hidden;/s);
  assert.doesNotMatch(html, /\.tableWrapper\s*\{[^}]*overflow-x:\s*auto;/s);
});
