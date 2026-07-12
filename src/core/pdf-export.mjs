import { getCurrentFonts } from "./config.mjs";

export function sanitizePdfFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "PME";
}

export function buildPdfExportHtml({ title, documentHtml, options }) {
  const fonts = getCurrentFonts();
  const pageSize = `${options.paper || "A4"} ${options.orientation || "portrait"}`;
  const titleHtml = options.includeTitle ? `<h1 class="pdf-title">${escapeHtml(title)}</h1>` : "";
  
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - PDF</title>
  <style>
    :root {
      --color-ink: #0c0a09;
      --color-slate: #4e4e4e;
      --color-stone: #777169;
      --color-canvas: #f5f5f5;
      --color-canvas-soft: #fafafa;
      --color-surface-soft: #fafafa;
      --color-surface-strong: #f0efed;
      --color-hairline: #e7e5e4;
      --color-hairline-strong: #d6d3d1;
      --color-code-keyword: #7c3aed;
      --color-code-number: #c2410c;
      --color-code-string: #16a34a;
      --color-code-title: #2563eb;
      --color-code-type: #0d9488;
      --color-code-tag: #dc2626;
      --radius-sm: 6px;
      --radius-xl: 16px;
      --font-display: ${fonts.chinese}, "EB Garamond", "Times New Roman", serif;
      --font-editor: ${fonts.chinese}, ${fonts.english};
      --font-mono: ${fonts.code};
    }
    
    @page {
      size: ${pageSize};
      margin: 0;
    }
    
    * { box-sizing: border-box; }
    
    body {
      margin: 0;
      color: var(--color-slate);
      background: var(--color-canvas);
      font: 1rem / 1.7 var(--font-editor);
      letter-spacing: 0.16px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .pdf-document {
      width: min(920px, 100%);
      margin: 0 auto;
      padding: 64px 72px 96px;
      background: var(--color-canvas);
    }
    
    .pdf-title {
      font-size: 2.5rem;
      font-weight: 300;
      letter-spacing: -0.96px;
      line-height: 1.2;
      color: var(--color-ink);
      font-family: var(--font-display);
      margin: 0 0 22px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--color-hairline-strong);
    }
    
    h1, h2, h3 {
      line-height: 1.2;
      color: var(--color-ink);
      font-weight: 500;
      font-family: var(--font-display);
      letter-spacing: -0.32px;
      break-after: avoid;
    }
    
    h1 {
      font-size: 2.5rem;
      font-weight: 300;
      letter-spacing: -0.96px;
    }
    
    h2 {
      font-size: 1.875rem;
      font-weight: 300;
      letter-spacing: -0.36px;
    }
    
    h3 {
      font-size: 1.5rem;
      font-weight: 300;
      letter-spacing: -0.24px;
    }
    
    h4, h5, h6 {
      line-height: 1.28;
      color: var(--color-ink);
      font-weight: 500;
      font-family: var(--font-display);
      letter-spacing: -0.32px;
      break-after: avoid;
    }
    
    p {
      margin: 0.6em 0;
    }
    
    p[data-indent="1"] { padding-left: 2em; }
    p[data-indent="2"] { padding-left: 4em; }
    p[data-indent="3"] { padding-left: 6em; }
    p[data-indent="4"] { padding-left: 8em; }
    p[data-indent="5"] { padding-left: 10em; }
    
    ul, ol {
      margin: 0.6em 0;
      padding-left: 1.65em;
      break-inside: avoid;
    }
    
    ol[data-type="roman"] { list-style-type: upper-roman; }
    ol[data-type="roman-lower"] { list-style-type: lower-roman; }
    ol[data-type="alpha"] { list-style-type: lower-alpha; }
    ol[data-type="alpha-upper"] { list-style-type: upper-alpha; }
    
    li {
      margin: 0.25em 0;
    }
    
    li > p {
      margin: 0;
    }
    
    ul[data-type="taskList"] {
      padding-left: 0 !important;
      list-style: none !important;
    }
    
    li[data-type="taskItem"] {
      display: inline-flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      gap: 0.55em !important;
      align-items: flex-start !important;
      margin: 0.25em 0 !important;
      width: 100% !important;
    }
    
    li[data-type="taskItem"] > label {
      width: auto !important;
      flex: 0 0 auto !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      margin-top: 0.25em !important;
      margin-right: 0 !important;
      margin-bottom: 0 !important;
      margin-left: 0 !important;
      user-select: none !important;
    }
    
    li[data-type="taskItem"] input[type="checkbox"] {
      width: 1em !important;
      height: 1em !important;
      margin: 0 !important;
      display: inline-block !important;
      vertical-align: middle !important;
    }
    
    blockquote {
      margin-left: 0;
      border-left: 2px solid var(--color-hairline-strong);
      padding-left: 16px;
      color: var(--color-stone);
      font-style: italic;
      break-inside: avoid;
    }
    
    hr {
      margin: 32px 0;
      border: 0;
      border-top: 1px solid var(--color-hairline);
    }
    
    :not(pre) > code {
      border: 1px solid var(--color-hairline);
      border-radius: var(--radius-sm);
      background: var(--color-surface-soft);
      padding: 0.15em 0.4em;
      color: var(--color-ink);
      font-family: var(--font-mono);
      font-size: 0.9em;
    }
    
    a {
      color: var(--color-ink);
      text-decoration: underline;
      text-decoration-color: var(--color-hairline-strong);
      text-underline-offset: 0.2em;
    }
    
    .code-block-wrapper {
      border-radius: var(--radius-xl);
      border: 1px solid var(--color-hairline);
      overflow: hidden;
      margin: 16px 0;
      break-inside: avoid;
    }
    
    pre {
      padding: 20px 24px;
      background: var(--color-canvas-soft);
      color: var(--color-ink);
      overflow: auto;
      margin: 0;
      border-radius: 0;
      white-space: pre-wrap;
      break-inside: avoid;
    }
    
    pre code {
      font-family: var(--font-mono);
      font-size: 0.9rem;
      line-height: 1.6;
    }
    
    .hljs-comment, .hljs-quote {
      color: var(--color-stone);
      font-style: italic;
    }
    
    .hljs-keyword, .hljs-selector-tag, .hljs-subst {
      color: var(--color-code-keyword);
      font-weight: 600;
    }
    
    .hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable, .hljs-tag .hljs-attr {
      color: var(--color-code-number);
    }
    
    .hljs-string, .hljs-doctag {
      color: var(--color-code-string);
    }
    
    .hljs-title, .hljs-section, .hljs-selector-id {
      color: var(--color-code-title);
    }
    
    .hljs-type, .hljs-class .hljs-title {
      color: var(--color-code-type);
    }
    
    .hljs-tag, .hljs-name, .hljs-attribute {
      color: var(--color-code-tag);
    }
    
    img {
      max-width: 100%;
      height: auto;
      border: 1px solid var(--color-hairline);
      border-radius: var(--radius-xl);
      break-inside: avoid;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 24px 0;
      break-inside: avoid;
    }
    
    th, td {
      position: relative;
      min-width: 80px;
      border: 1px solid var(--color-hairline);
      padding: 8px 12px;
      line-height: 1.5;
      vertical-align: top;
      font-family: var(--font-editor);
    }
    
    th {
      background: var(--color-surface-strong);
      font-weight: 500;
      color: var(--color-ink);
    }
    
    .tableWrapper {
      overflow-x: auto;
    }
    
    .mermaid-diagram {
      width: 100%;
      margin: 16px 0;
      overflow: visible;
      break-inside: avoid;
    }
    
    .mermaid-diagram__viewport {
      height: auto !important;
      overflow: visible !important;
      border: 1px solid var(--color-hairline);
      border-radius: var(--radius-xl);
      padding: 10px;
    }
    
    .mermaid-diagram__content {
      width: 100% !important;
      min-width: 0 !important;
    }
    
    .mermaid-diagram svg {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
    }
    
    .katex-display { overflow: visible; }
    .katex { font-family: KaTeX_Main, ${fonts.english}; }
    
    @media print {
      @page { margin: 0; }
      body {
        margin: 0;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .pdf-document {
        padding: 64px 72px 96px;
        margin: 0 auto;
        width: min(920px, 100%);
      }
      header, footer { display: none !important; }
      ::-webkit-print-color-adjust { exact; }
    }
  </style>
</head>
<body>
  <main class="pdf-document">
    ${titleHtml}
    ${documentHtml}
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
