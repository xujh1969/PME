import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { buildMindMapStaticSvg, getStaticMindMapDimensions } from "./mindmap-data.mjs";
import { getCurrentFonts } from "./config.mjs";
import { getPrimaryFontFamily } from "./font-utils.mjs";

export const WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_IMAGE_WIDTH = 520;
const MAX_IMAGE_HEIGHT = 720;

export async function buildWordDocumentBlob(options) {
  const wordDocument = await buildWordDocument(options);
  const blob = await Packer.toBlob(wordDocument);
  return new Blob([blob], { type: WORD_MIME_TYPE });
}

export function getWordExportFileName(markdownPath) {
  const name = String(markdownPath || "document").replaceAll("\\", "/").split("/").pop() || "document";
  return `${name.replace(/\.(md|markdown)$/i, "") || "document"}.docx`;
}

export async function buildWordDocument({
  doc,
  title = "Document",
  loadImageResource,
  getImageDimensions,
  renderMath,
  renderVideo,
  renderMermaidDiagram,
  renderMindMap,
  renderSvg,
} = {}) {
  const wordFonts = getWordFonts();
  const children = [];
  if (title) {
    children.push(new Paragraph({
      children: [new TextRun({ text: title, font: pickTextFont(title, wordFonts) })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
    }));
  }

  for (const node of doc?.content || []) {
    children.push(...await renderBlock(node, {
      loadImageResource,
      getImageDimensions,
      renderMath,
      renderVideo,
      renderMermaidDiagram,
      renderMindMap,
      renderSvg,
      wordFonts,
    }));
  }

  return new Document({
    numbering: {
      config: [
        {
          reference: "pme-bullet",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT }],
        },
        {
          reference: "pme-number",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT }],
        },
      ],
    },
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: children.length ? children : [new Paragraph("")],
    }],
  });
}

async function renderBlock(node, context) {
  if (!node) return [];

  if (node.type === "heading") {
    return [new Paragraph({
      heading: headingLevel(node.attrs?.level),
      children: await renderInlineChildren(node, context),
      spacing: { before: 240, after: 120 },
    })];
  }

  if (node.type === "paragraph") {
    return [new Paragraph({ children: await renderInlineChildren(node, context), spacing: { after: 120 } })];
  }

  if (node.type === "blockquote") {
    return [new Paragraph({
      children: await renderInlineChildren(node, context),
      indent: { left: 360 },
      border: { left: { style: BorderStyle.SINGLE, size: 8, color: "D6D3D1" } },
      shading: { type: ShadingType.CLEAR, fill: "FAFAFA" },
      spacing: { before: 120, after: 120 },
    })];
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const reference = node.type === "orderedList" ? "pme-number" : "pme-bullet";
    const items = [];
    for (const item of node.content || []) {
      items.push(new Paragraph({
        children: await renderInlineChildren(item, context),
      numbering: { reference, level: 0 },
      spacing: { after: 80 },
      }));
    }
    return items;
  }

  if (node.type === "taskList") {
    const items = [];
    for (const item of node.content || []) {
      items.push(new Paragraph({
        children: [
          new TextRun(`${item.attrs?.checked ? "☑" : "☐"} `),
          ...await renderInlineChildren(item, context),
        ],
        spacing: { after: 80 },
      }));
    }
    return items;
  }

  if (node.type === "table") {
    return [await renderTable(node, context)];
  }

  if (node.type === "codeBlock") {
    return [new Paragraph({
      children: renderCodeBlockRuns(getNodeText(node), context),
      shading: { type: ShadingType.CLEAR, fill: "F0EFED" },
      spacing: { before: 120, after: 120 },
    })];
  }

  if (node.type === "horizontalRule") {
    return [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E7E5E4" } },
      spacing: { before: 180, after: 180 },
    })];
  }

  if (node.type === "image") {
    const image = await loadDocumentImage(node, context);
    return image ? [image] : [fallbackParagraph(`[图片: ${node.attrs?.alt || node.attrs?.src || ""}]`)];
  }

  if (node.type === "video") {
    const source = node.attrs?.assetSrc || node.attrs?.src || "";
    const poster = await renderVideoPoster(node, context);
    return poster ? [poster, renderVideoReference(source)] : [renderVideoReference(source)];
  }

  if (node.type === "mermaidDiagram") {
    const image = await renderDiagramImage(
      () => context.renderMermaidDiagram?.(node.attrs?.code || "", { scale: node.attrs?.scale }),
      createTextSvgImage("Mermaid render failed"),
    );
    return [image];
  }

  if (node.type === "mindMap") {
    const image = await renderDiagramImage(
      () => context.renderMindMap?.(node.attrs?.data || node.attrs?.raw || node.attrs),
      "Mind Map",
    );
    return [image];
  }

  if (node.type === "svgDiagram") {
    const image = await renderDiagramImage(
      () => context.renderSvg?.(node.attrs?.code || "", { scale: node.attrs?.scale }),
      createTextSvgImage("SVG render failed"),
    );
    return [image];
  }

  if (node.type === "blockMath") {
    const image = await renderDiagramImage(
      () => context.renderMath?.(node.attrs?.latex || "", { displayMode: true }),
      createTextSvgImage("Formula render failed"),
    );
    return [image];
  }

  if (node.type === "callout" || node.type === "details" || node.type === "detailsContent") {
    const blocks = [];
    for (const child of node.content || []) {
      blocks.push(...await renderBlock(child, context));
    }
    return blocks.length ? blocks : [fallbackParagraph(getNodeText(node))];
  }

  if (node.type === "tableOfContents") {
    return [fallbackParagraph("目录")];
  }

  return getNodeText(node) ? [fallbackParagraph(getNodeText(node))] : [];
}

async function renderInlineChildren(node, context) {
  const children = [];
  for (const child of node.content || []) {
    if (child.type === "text") {
      children.push(renderTextRun(child, context));
    } else if (child.type === "inlineMath") {
      const image = await renderInlineMath(child, context);
      children.push(image || imageRun(createTextSvgImage("Formula")));
    } else {
      children.push(...await renderInlineChildren(child, context));
    }
  }
  return children.length ? children : [new TextRun({ text: "", font: context.wordFonts?.english })];
}

async function renderInlineMath(node, context) {
  try {
    const result = await context.renderMath?.(node.attrs?.latex || "", { displayMode: false });
    return result?.data ? imageRun(result) : null;
  } catch {
    return imageRun(createTextSvgImage("Formula"));
  }
}

function renderTextRun(node, context = {}) {
  const wordFonts = context.wordFonts || getWordFonts();
  const options = { text: node.text || "", font: pickTextFont(node.text || "", wordFonts) };
  for (const mark of node.marks || []) {
    if (mark.type === "bold") options.bold = true;
    if (mark.type === "italic") options.italics = true;
    if (mark.type === "underline") options.underline = {};
    if (mark.type === "strike") options.strike = true;
    if (mark.type === "code") options.font = wordFonts.code;
    if (mark.type === "link" && mark.attrs?.href) {
      return new ExternalHyperlink({
        link: mark.attrs.href,
        children: [new TextRun({ ...options, style: "Hyperlink" })],
      });
    }
  }
  return new TextRun(options);
}

async function renderTable(node, context) {
  const columnWidths = getTableColumnWidths(node);
  const totalWidth = columnWidths?.reduce((sum, width) => sum + width, 0) || 0;
  const rows = [];
  for (const row of node.content || []) {
    const cells = [];
    let columnIndex = 0;
    for (const cell of row.content || []) {
      const columnSpan = Math.max(1, Number(cell.attrs?.colspan) || 1);
      const cellWidth = columnWidths
        ? columnWidths.slice(columnIndex, columnIndex + columnSpan).reduce((sum, width) => sum + width, 0)
        : 0;
      cells.push(new TableCell({
        children: [new Paragraph({ children: await renderInlineChildren(cell, context) })],
        shading: cell.type === "tableHeader" ? { type: ShadingType.CLEAR, fill: "FAFAFA" } : undefined,
        width: cellWidth ? { size: cellWidth / totalWidth * 100, type: WidthType.PERCENTAGE } : undefined,
      }));
      columnIndex += columnSpan;
    }
    rows.push(new TableRow({ children: cells }));
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function getTableColumnWidths(node) {
  const firstRow = node.content?.[0];
  if (!firstRow?.content?.length) return null;
  const widths = firstRow.content.flatMap((cell) => cell.attrs?.colwidth || []);
  const columnCount = firstRow.content.reduce((count, cell) => count + Math.max(1, Number(cell.attrs?.colspan) || 1), 0);
  return widths.length === columnCount && widths.every((width) => Number.isFinite(width) && width > 0)
    ? widths
    : null;
}

async function loadDocumentImage(node, context) {
  const source = node.attrs?.assetSrc || node.attrs?.src;
  if (!source || !context.loadImageResource) return null;
  try {
    const blob = await context.loadImageResource(source);
    const data = new Uint8Array(await blob.arrayBuffer());
    const dimensions = await getDocumentImageDimensions(node, blob, context);
    return imageParagraph({ data, ...dimensions, type: imageType(blob.type) });
  } catch {
    return null;
  }
}

async function getDocumentImageDimensions(node, blob, context) {
  const explicitWidth = Number(node.attrs?.width) || 0;
  const explicitHeight = Number(node.attrs?.height) || 0;
  if (explicitWidth && explicitHeight) {
    return { width: explicitWidth, height: explicitHeight };
  }
  let intrinsic = null;
  if (context.getImageDimensions) {
    try {
      intrinsic = await context.getImageDimensions(blob, node);
    } catch {
      intrinsic = null;
    }
  }
  const intrinsicWidth = Number(node.attrs?.originalWidth) || Number(intrinsic?.width) || explicitWidth || MAX_IMAGE_WIDTH;
  const intrinsicHeight = Number(node.attrs?.originalHeight) || Number(intrinsic?.height) || explicitHeight || Math.round(intrinsicWidth * 0.62);
  if (explicitWidth) {
    return { width: explicitWidth, height: Math.round(explicitWidth * intrinsicHeight / intrinsicWidth) };
  }
  return { width: intrinsicWidth, height: intrinsicHeight };
}

async function renderDiagramImage(render, fallbackText) {
  try {
    const result = await render?.();
    if (result?.data) {
      return imageParagraph(result);
    }
  } catch {
    // Fall through to a graphical fallback so source text is not exported.
  }
  return imageParagraph(isImageDescriptor(fallbackText) ? fallbackText : createTextSvgImage(String(fallbackText || "Render failed")));
}

export async function renderMindMapToSvgImage(data) {
  const staticMap = buildMindMapStaticSvg(data);
  const dimensions = getStaticMindMapDimensions(staticMap, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT);
  return {
    data: new TextEncoder().encode(staticMap.svg),
    width: dimensions.targetWidth,
    height: dimensions.targetHeight,
    type: "svg",
  };
}

function imageParagraph({ data, width, height, type = "png" }) {
  const dimensions = constrainDimensions(width || MAX_IMAGE_WIDTH, height || Math.round((width || MAX_IMAGE_WIDTH) * 0.62));
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [imageRun({ data, type, ...dimensions })],
    spacing: { before: 120, after: 120 },
  });
}

function imageRun({ data, width, height, type = "png" }) {
  const dimensions = constrainDimensions(width || MAX_IMAGE_WIDTH, height || Math.round((width || MAX_IMAGE_WIDTH) * 0.62));
  const options = {
    data,
    type,
    transformation: dimensions,
  };
  if (type === "svg") {
    options.fallback = {
      type: "png",
      data: TRANSPARENT_PNG,
      transformation: dimensions,
    };
  }
  return new ImageRun(options);
}

function constrainDimensions(width, height) {
  const scale = Math.min(1, MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function fallbackParagraph(text) {
  return new Paragraph({ children: [new TextRun(String(text || ""))], spacing: { after: 120 } });
}

function renderVideoReference(source) {
  const children = [new TextRun({ text: "Video: " })];
  if (source) {
    children.push(new ExternalHyperlink({
      link: source,
      children: [new TextRun({ text: fileNameFromPath(source), style: "Hyperlink" })],
    }));
  } else {
    children.push(new TextRun("Unavailable"));
  }
  return new Paragraph({
    children,
    spacing: { before: 120, after: 120 },
  });
}

async function renderVideoPoster(node, context) {
  try {
    const source = node.attrs?.assetSrc || node.attrs?.src || "";
    const result = await context.renderVideo?.(source, node);
    return result?.data ? imageParagraph(result) : null;
  } catch {
    return null;
  }
}

const TRANSPARENT_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0,
  0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78,
  68, 174, 66, 96, 130,
]);

function createTextSvgImage(label) {
  const text = escapeXml(label);
  const width = Math.max(180, Math.min(520, String(label || "").length * 9 + 32));
  const height = 42;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" rx="6" fill="#f8fafc" stroke="#d1d5db"/>`,
    `<text x="16" y="27" font-family="Arial, sans-serif" font-size="14" fill="#374151">${text}</text>`,
    `</svg>`,
  ].join("");
  return {
    data: new TextEncoder().encode(svg),
    width,
    height,
    type: "svg",
  };
}

function isImageDescriptor(value) {
  return Boolean(value && typeof value === "object" && value.data);
}

function getWordFonts() {
  const fonts = getCurrentFonts();
  return {
    chinese: getPrimaryFontFamily(fonts.chinese, "Microsoft YaHei"),
    english: getPrimaryFontFamily(fonts.english, "Arial"),
    code: getPrimaryFontFamily(fonts.code, "Consolas"),
  };
}

function pickTextFont(text, fonts) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(String(text || "")) ? fonts.chinese : fonts.english;
}

function renderCodeBlockRuns(code, context = {}) {
  const codeFont = context.wordFonts?.code || getWordFonts().code;
  const lines = String(code || "").split(/\r?\n/);
  const runs = [];
  lines.forEach((line, index) => {
    runs.push(new TextRun({
      text: line || " ",
      font: codeFont,
      size: 20,
      color: codeColor(line),
    }));
    if (index < lines.length - 1) {
      runs.push(new TextRun({ break: 1 }));
    }
  });
  return runs;
}

function codeColor(line) {
  if (/^\s*(import|from|def|class|const|let|var|function|return)\b/.test(line)) return "2563EB";
  if (/["']/.test(line)) return "16A34A";
  return "111827";
}

function fileNameFromPath(path) {
  return String(path || "video").replaceAll("\\", "/").split("/").pop() || "video";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function headingLevel(level) {
  return {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  }[level] || HeadingLevel.HEADING_1;
}

function imageType(mimeType) {
  if (/svg/i.test(mimeType || "")) return "svg";
  if (/jpe?g/i.test(mimeType || "")) return "jpg";
  if (/gif/i.test(mimeType || "")) return "gif";
  if (/bmp/i.test(mimeType || "")) return "bmp";
  return "png";
}

function getNodeText(node) {
  if (node?.text) return node.text;
  return (node?.content || []).map(getNodeText).join("");
}
