export function sanitizePdfFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "PME";
}

export function buildPdfExportHtml({ title, documentHtml, options }) {
  const pageSize = `${options.paper || "A4"} ${options.orientation || "portrait"}`;
  const titleHtml = options.includeTitle ? `<h1 class="pdf-title">${escapeHtml(title)}</h1>` : "";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - PDF</title>
  <style>
    @page { size: ${pageSize}; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1a1a1a;
      background: #ffffff;
      font-family: "Notion Sans", Inter, "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.72;
    }
    .pdf-document { max-width: 100%; }
    .pdf-title {
      margin: 0 0 22px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e3df;
      font-size: 28px;
      line-height: 1.25;
    }
    h1, h2, h3, h4, h5, h6 { break-after: avoid; line-height: 1.28; }
    p, ul, ol, blockquote, table, pre, .mermaid-diagram, img { break-inside: avoid; }
    img { max-width: 100%; height: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
    }
    th, td {
      border: 1px solid #d8d5cf;
      padding: 6px 8px;
      vertical-align: top;
    }
    pre {
      overflow: visible;
      white-space: pre-wrap;
      border: 1px solid #e5e3df;
      border-radius: 8px;
      padding: 12px;
      background: #f6f5f4;
    }
    code, pre {
      font-family: "Cascadia Mono", "SFMono-Regular", Consolas, "Microsoft YaHei UI", monospace;
    }
    blockquote {
      margin-left: 0;
      padding-left: 14px;
      border-left: 3px solid #c8c4be;
      color: #5d5b54;
    }
    .mermaid-diagram {
      width: 100%;
      margin: 16px 0;
      overflow: visible;
    }
    .mermaid-diagram__viewport {
      height: auto !important;
      overflow: visible !important;
      border: 1px solid #e5e3df;
      border-radius: 8px;
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
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
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
