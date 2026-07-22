import { strToU8, zipSync } from "fflate";

import {
  buildPackagedImageName,
  buildPackagedVideoName,
  isLocalAbsolutePath,
  normalizeDocumentResourcePath,
} from "./package-resources.mjs";
import { getTableOfContentsItems } from "./toc-extension.mjs";

export async function buildHtmlPackage({
  doc,
  documentHtml,
  documentTitle,
  imageNodes,
  videoNodes,
  htmlName,
  rootSourcePath,
  loadImageResource,
}) {
  const entries = {};
  const missing = [];
  const pathMappings = new Map();
  let imageIndex = 1;
  let videoIndex = 1;

  async function packageImages() {
    for (const node of imageNodes) {
      const originalSrc = node.attrs?.assetSrc || node.attrs?.src;
      const previewSrc = node.attrs?.src;
      if (!originalSrc) continue;
      const resolvedSource = resolveResourcePath(originalSrc, rootSourcePath);

      if (!pathMappings.has(resolvedSource)) {
        try {
          const blob = await loadImageResource(resolvedSource);
          const assetPath = `assets/${buildPackagedImageName(resolvedSource, blob.type, imageIndex)}`;
          imageIndex += 1;
          entries[assetPath] = new Uint8Array(await blob.arrayBuffer());
          pathMappings.set(resolvedSource, assetPath);
          pathMappings.set(originalSrc, assetPath);
          if (previewSrc && previewSrc !== originalSrc) {
            pathMappings.set(previewSrc, assetPath);
          }
        } catch {
          missing.push(resolvedSource);
          continue;
        }
      }
    }
  }

  async function packageVideos() {
    for (const node of videoNodes) {
      const originalSrc = node.attrs?.assetSrc || node.attrs?.src;
      const previewSrc = node.attrs?.src;
      if (!originalSrc) continue;
      const resolvedSource = resolveResourcePath(originalSrc, rootSourcePath);

      if (!pathMappings.has(resolvedSource)) {
        try {
          const blob = await loadImageResource(resolvedSource);
          const assetPath = `assets/${buildPackagedVideoName(resolvedSource, blob.type, videoIndex)}`;
          videoIndex += 1;
          entries[assetPath] = new Uint8Array(await blob.arrayBuffer());
          pathMappings.set(resolvedSource, assetPath);
          pathMappings.set(originalSrc, assetPath);
          if (previewSrc && previewSrc !== originalSrc) {
            pathMappings.set(previewSrc, assetPath);
          }
        } catch {
          missing.push(resolvedSource);
          continue;
        }
      }
    }
  }

  await packageImages();
  await packageVideos();

  let processedHtml = documentHtml;
  for (const [source, assetPath] of pathMappings) {
    processedHtml = processedHtml.split(source).join(assetPath);
  }

  const tocItems = getTableOfContentsItems(doc);
  if (tocItems.length > 0) {
    const tocHtml = renderTableOfContentsHtml(tocItems);
    processedHtml = processedHtml.replace(
      /<nav\s+class="table-of-contents"[^>]*><\/nav>/gi,
      tocHtml
    );
    processedHtml = processedHtml.replace(
      /<div\s+class="table-of-contents"[^>]*>[^<]*<\/div>/gi,
      tocHtml
    );
  }

  const htmlContent = buildHtmlExportHtml({
    title: documentTitle || "Document",
    documentHtml: processedHtml,
  });

  entries[htmlName] = strToU8(htmlContent);

  return {
    blob: new Blob([zipSync(entries)], { type: "application/zip" }),
    missing,
  };
}

export function getHtmlPackageFileName(markdownName) {
  return `${markdownName.replace(/\.(md|markdown)$/i, "") || "document"}_html.zip`;
}

function renderTableOfContentsHtml(items) {
  const itemsHtml = items.map((item) => {
    const indent = (item.level - 1) * 18;
    return `<div class="table-of-contents__item" style="padding-left: ${indent + 6}px;">${escapeHtml(item.text)}</div>`;
  }).join("");
  return `<nav class="table-of-contents"><div class="table-of-contents__title">目录</div><div class="table-of-contents__list">${itemsHtml}</div></nav>`;
}

function buildHtmlExportHtml({ title, documentHtml }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --color-ink: #0c0a09;
      --color-slate: #4e4e4e;
      --color-stone: #777169;
      --color-canvas: #ffffff;
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
      --font-display: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif;
      --font-editor: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif;
      --font-mono: "JetBrains Mono", "Fira Code", "Consolas", monospace;
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

    .document {
      width: min(920px, 100%);
      margin: 0 auto;
      padding: 64px 72px;
    }

    h1, h2, h3, h4, h5, h6 {
      line-height: 1.2;
      color: var(--color-ink);
      font-weight: 500;
      font-family: var(--font-display);
      letter-spacing: -0.32px;
      margin: 1.5em 0 0.5em;
    }

    h1 { font-size: 2.5rem; font-weight: 300; letter-spacing: -0.96px; }
    h2 { font-size: 1.875rem; font-weight: 300; letter-spacing: -0.36px; }
    h3 { font-size: 1.5rem; font-weight: 300; letter-spacing: -0.24px; }
    h4 { font-size: 1.25rem; }
    h5 { font-size: 1.125rem; }
    h6 { font-size: 1rem; }

    p { margin: 1em 0; }

    a {
      color: #2563eb;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }

    ul, ol {
      margin: 1em 0;
      padding-left: 1.5em;
    }

    li { margin: 0.3em 0; }

    blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 3px solid var(--color-hairline-strong);
      background: var(--color-canvas-soft);
      color: var(--color-stone);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }

    code {
      font-family: var(--font-mono);
      font-size: 0.875em;
      background: var(--color-surface-soft);
      padding: 0.15em 0.35em;
      border-radius: 4px;
    }

    pre {
      margin: 1em 0;
      padding: 1em;
      background: var(--color-surface-strong);
      border-radius: var(--radius-sm);
      overflow-x: auto;
    }

    pre code {
      background: none;
      padding: 0;
      font-size: 0.875rem;
      line-height: 1.6;
    }

    hr {
      margin: 2em 0;
      border: none;
      border-top: 1px solid var(--color-hairline);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 0.875rem;
    }

    th, td {
      border: 1px solid var(--color-hairline);
      padding: 0.5em 0.75em;
      text-align: left;
    }

    th {
      background: var(--color-canvas-soft);
      font-weight: 600;
      color: var(--color-ink);
    }

    tr:nth-child(even) {
      background: var(--color-canvas-soft);
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-sm);
    }

    video {
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-sm);
    }

    .mermaid-diagram {
      width: 100%;
      margin: 16px 0;
      overflow: visible;
    }

    .mermaid-diagram__viewport {
      height: auto !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0;
      padding: 10px 0;
    }

    .mermaid-diagram__content {
      width: 100% !important;
      min-width: 0 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: flex-start !important;
    }

    .mermaid-diagram svg {
      width: auto !important;
      max-width: 100% !important;
      height: auto !important;
    }

    .mermaid-diagram img {
      display: block !important;
      max-width: 100% !important;
      height: auto !important;
      margin: 0 auto !important;
    }

    .callout {
      margin: 1em 0;
      padding: 1em;
      border-radius: var(--radius-sm);
      border-left: 4px solid;
      background: var(--color-canvas-soft);
    }

    .callout__title {
      font-weight: 600;
      margin-bottom: 0.5em;
    }

    .callout--note { border-color: #2563eb; }
    .callout--warning { border-color: #d97706; }
    .callout--error { border-color: #dc2626; }
    .callout--success { border-color: #16a34a; }

    .table-of-contents {
      display: grid;
      gap: 8px;
      margin: 1em 0;
      padding: 12px;
      border: 1px solid var(--color-hairline);
      border-radius: var(--radius-sm);
      background: var(--color-canvas-soft);
    }

    .table-of-contents__title {
      color: var(--color-ink);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .table-of-contents__list {
      display: grid;
      gap: 2px;
    }

    .table-of-contents__item {
      min-height: 28px;
      border: 0;
      background: transparent;
      color: var(--color-slate);
      padding: 4px 6px;
      text-align: left;
      white-space: normal;
      font-size: 0.875rem;
    }

    .table-of-contents__item:hover {
      background: var(--color-canvas);
      color: var(--color-ink);
    }

    @media (max-width: 768px) {
      .document {
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <main class="document">
    ${documentHtml}
  </main>
</body>
</html>`;
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function resolveResourcePath(path, sourcePath) {
  if (/^(https?:|data:|blob:)/i.test(path) || isLocalAbsolutePath(path) || !sourcePath) {
    return canonicalPath(path);
  }
  return canonicalPath(normalizeDocumentResourcePath(path, canonicalPath(sourcePath)));
}

function canonicalPath(path) {
  const normalized = String(path).replaceAll("\\", "/");
  const prefix = normalized.match(/^[a-zA-Z]:/)?.[0] || (normalized.startsWith("/") ? "/" : "");
  const body = prefix === "/" ? normalized.slice(1) : normalized.slice(prefix.length);
  const parts = [];
  for (const part of body.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `${prefix}${prefix && prefix !== "/" ? "/" : ""}${parts.join("/")}`;
}
