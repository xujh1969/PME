import { normalizeMindMapData, serializeMindMapData } from "./mindmap-data.mjs";

export function parseMarkdown(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const footnotes = collectFootnoteDefinitions(lines);
  const content = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isFootnoteDefinition(line)) {
      index += 1;
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const paragraphIndentComment = line.match(/^\s*<!--\s*pme-indent:\s*([1-5])\s*-->\s*$/i);
    if (paragraphIndentComment && lines[index + 1]?.trim()) {
      content.push({
        type: "paragraph",
        attrs: { indent: Number.parseInt(paragraphIndentComment[1], 10) },
        content: parseInline(lines[index + 1], footnotes),
      });
      index += 2;
      continue;
    }

    const listIndentComment = line.match(/^\s*<!--\s*pme-list-indent:\s*([1-5])\s*-->\s*$/i);
    if (listIndentComment && parseListItemLine(lines[index + 1] || "")) {
      const parsedList = parseListBlock(lines, index + 1, footnotes);
      parsedList.list.attrs = {
        ...parsedList.list.attrs,
        indent: Number.parseInt(listIndentComment[1], 10),
      };
      content.push(parsedList.list);
      index = parsedList.nextIndex;
      continue;
    }

    const tableWidthsComment = line.match(/^\s*<!--\s*pme-table-widths:\s*([^>]+?)\s*-->\s*$/i);
    if (tableWidthsComment) {
      if (isTableStart(lines, index + 1)) {
        const columnCount = splitTableRow(lines[index + 1]).length;
        const widths = parseTableWidths(tableWidthsComment[1], columnCount);
        const { table, nextIndex } = parseTable(lines, index + 1, widths);
        content.push(table);
        index = nextIndex;
      } else {
        index += 1;
      }
      continue;
    }

    const mermaidScaleComment = line.match(/^\s*<!--\s*pme-mermaid-scale:\s*(\d+)\s*-->\s*$/i);
    if (mermaidScaleComment) {
      let fenceIndex = index + 1;
      while (fenceIndex < lines.length && lines[fenceIndex].trim() === "") {
        fenceIndex += 1;
      }
      if (/^```mermaid\s*$/i.test(lines[fenceIndex] || "")) {
        const codeLines = [];
        index = fenceIndex + 1;
        while (index < lines.length && lines[index] !== "```") {
          codeLines.push(lines[index]);
          index += 1;
        }
        content.push({
          type: "mermaidDiagram",
          attrs: {
            code: codeLines.join("\n"),
            scale: normalizeMermaidScale(mermaidScaleComment[1]),
          },
        });
        index += 1;
        continue;
      }
    }

    if (isTableOfContentsBlock(line)) {
      content.push({ type: "tableOfContents" });
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      content.push({ type: "horizontalRule" });
      index += 1;
      continue;
    }

    if (/^\s*<div\b[^>]*data-type=["']svg-diagram["']/i.test(line)) {
      const { code, scale, nextIndex } = collectSvgDiagramBlock(lines, index);
      content.push({
        type: "svgDiagram",
        attrs: { code, scale },
      });
      index = nextIndex;
      continue;
    }

    if (/^\s*<svg\b/i.test(line)) {
      const { svg, nextIndex } = collectSvgBlock(lines, index);
      content.push({
        type: "svgDiagram",
        attrs: { code: svg, scale: 100 },
      });
      index = nextIndex;
      continue;
    }

    if (isTableStart(lines, index)) {
      const { table, nextIndex } = parseTable(lines, index);
      content.push(table);
      index = nextIndex;
      continue;
    }

    const singleLineMath = line.match(/^\$\$(.+)\$\$$/);
    if (singleLineMath) {
      content.push({
        type: "blockMath",
        attrs: { latex: singleLineMath[1].trim() },
      });
      index += 1;
      continue;
    }

    const singleLineBracketMath = line.match(/^\\\[(.+)\\\]$/);
    if (singleLineBracketMath) {
      content.push({
        type: "blockMath",
        attrs: { latex: singleLineBracketMath[1].trim() },
      });
      index += 1;
      continue;
    }

    const bracketMathFence = line.match(/^\s*\\\[\s*$/);
    if (bracketMathFence) {
      const latexLines = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "\\]") {
        latexLines.push(lines[index]);
        index += 1;
      }
      content.push({
        type: "blockMath",
        attrs: { latex: latexLines.join("\n").trim() },
      });
      index += 1;
      continue;
    }

    const mathFence = line.match(/^\$\$\s*$/);
    if (mathFence) {
      const latexLines = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "$$") {
        latexLines.push(lines[index]);
        index += 1;
      }
      content.push({
        type: "blockMath",
        attrs: { latex: latexLines.join("\n").trim() },
      });
      index += 1;
      continue;
    }

    const codeFence = line.match(/^```(.*)$/);
    if (codeFence) {
      const codeLines = [];
      const language = codeFence[1].trim();
      index += 1;
      while (index < lines.length && lines[index] !== "```") {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (language.toLowerCase() === "mermaid") {
        content.push({
          type: "mermaidDiagram",
          attrs: { code: codeLines.join("\n") },
        });
        index += 1;
        continue;
      }
      if (language.toLowerCase() === "mindmap") {
        const normalized = normalizeMindMapData(codeLines.join("\n"));
        content.push({
          type: "mindMap",
          attrs: normalized,
        });
        index += 1;
        continue;
      }
      const codeText = codeLines.join("\n");
      content.push({
        type: "codeBlock",
        attrs: { language },
        content: codeText ? [{ type: "text", text: codeText }] : [],
      });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*?)(\s*<!--collapsed-->)?$/);
    if (heading) {
      content.push({
        type: "heading",
        attrs: { level: heading[1].length, collapsed: !!heading[3] },
        content: parseInline(heading[2], footnotes),
      });
      index += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      content.push({
        type: "image",
        attrs: { alt: image[1], src: image[2] },
      });
      index += 1;
      continue;
    }

    const htmlImage = parseHtmlImage(line);
    if (htmlImage) {
      content.push({
        type: "image",
        attrs: htmlImage,
      });
      index += 1;
      continue;
    }

    const htmlVideo = parseHtmlVideo(line);
    if (htmlVideo) {
      content.push({
        type: "video",
        attrs: htmlVideo,
      });
      index += 1;
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: parseInline(quote[1], footnotes) }],
      });
      index += 1;
      continue;
    }

    const calloutMatch = line.match(/^<div\s+class="callout\s+callout--([^"]+)"\s+data-type="([^"]+)"\s+data-title="([^"]+)">([^<]*)<\/div>$/);
    if (calloutMatch) {
      content.push({
        type: "callout",
        attrs: { type: calloutMatch[2], title: calloutMatch[3] },
        content: calloutMatch[4].trim() ? [{ type: "paragraph", content: parseInline(calloutMatch[4].trim(), footnotes) }] : [],
      });
      index += 1;
      continue;
    }

    if (/^<details>\s*$/.test(line)) {
      index += 1;
      let summaryText = "";
      const contentLines = [];

      while (index < lines.length && !/^<\/details>\s*$/.test(lines[index])) {
        const summaryMatch = lines[index].match(/^<summary>(.*)<\/summary>$/);
        if (summaryMatch) {
          summaryText = summaryMatch[1];
        } else {
          contentLines.push(lines[index]);
        }
        index += 1;
      }

      const parsedContent = parseMarkdown(contentLines.join("\n"));
      const detailsContent = parsedContent.content?.length > 0
        ? parsedContent.content
        : [{ type: "paragraph" }];

      content.push({
        type: "details",
        content: [
          {
            type: "detailsSummary",
            content: summaryText ? [{ type: "text", text: summaryText }] : [],
          },
          {
            type: "detailsContent",
            content: detailsContent,
          },
        ],
      });
      index += 1;
      continue;
    }

    if (parseListItemLine(line)) {
      const parsedList = parseListBlock(lines, index, footnotes);
      content.push(parsedList.list);
      index = parsedList.nextIndex;
      continue;
    }

    content.push({
      type: "paragraph",
      content: parseInline(line, footnotes),
    });
    index += 1;
  }

  return { type: "doc", content };
}

export function serializeMarkdown(doc, options = {}) {
  const nodes = doc.content || [];
  const footnotes = [];
  const serializeOptions = { ...options, footnotes };
  const body = nodes.map((node) => serializeNode(node, serializeOptions)).filter(Boolean).join("\n\n");
  if (footnotes.length) {
    const definitions = footnotes.map((footnote) => `[^${footnote.id}]: ${footnote.text || ""}`).join("\n");
    return [body, definitions].filter(Boolean).join("\n\n") + "\n";
  }
  const trailingNewline = getLastSerializableNode(nodes)?.type === "image" ? "\n\n" : "\n";
  return `${body}${trailingNewline}`;
}

export function hydrateImagePreviews(doc, files, options = {}) {
  return {
    ...doc,
    content: hydrateNodes(doc.content || [], files, options),
  };
}

function serializeNode(node, options) {
  if (node.type === "heading") {
    const text = `${"#".repeat(node.attrs.level)} ${plainText(node, options)}`;
    return node.attrs.collapsed ? `${text} <!--collapsed-->` : text;
  }

  if (node.type === "paragraph") {
    const text = plainText(node, options);
    const indent = Math.max(0, Math.min(5, Number.parseInt(node.attrs?.indent || 0, 10) || 0));
    return indent ? `<!-- pme-indent: ${indent} -->\n${text}` : text;
  }

  if (node.type === "horizontalRule") {
    return "---";
  }

  if (node.type === "tableOfContents") {
    return '<div data-type="table-of-contents"></div>';
  }

  if (["bulletList", "orderedList", "taskList"].includes(node.type)) {
    const list = serializeList(node, options);
    const indent = Math.max(0, Math.min(5, Number.parseInt(node.attrs?.indent || 0, 10) || 0));
    return indent ? `<!-- pme-list-indent: ${indent} -->\n${list}` : list;
  }

  if (node.type === "table") {
    return serializeTable(node);
  }

  if (node.type === "blockMath") {
    return [
      "$$",
      node.attrs?.latex || "",
      "$$",
    ].join("\n");
  }

  if (node.type === "mermaidDiagram") {
    const diagram = [
      "```mermaid",
      node.attrs?.code || "",
      "```",
    ].join("\n");
    const scale = normalizeMermaidScale(node.attrs?.scale);
    return scale === null ? diagram : `<!-- pme-mermaid-scale: ${scale} -->\n${diagram}`;
  }

  if (node.type === "mindMap") {
    return [
      "```mindmap",
      node.attrs?.raw || serializeMindMapData(node.attrs?.data),
      "```",
    ].join("\n");
  }

  if (node.type === "svgDiagram") {
    const scale = normalizeSvgScale(node.attrs?.scale);
    if (scale === 100) {
      return node.attrs?.code || "";
    }
    return `<div data-type="svg-diagram" data-pme-scale="${scale}">\n${node.attrs?.code || ""}\n</div>`;
  }

  if (node.type === "blockquote") {
    return `> ${plainText(node, options)}`;
  }

  if (node.type === "codeBlock") {
    return [
      `\`\`\`${node.attrs.language || ""}`,
      plainText(node, options),
      "```",
    ].join("\n");
  }

  if (node.type === "image") {
    const imagePath = node.attrs.assetSrc || node.attrs.src;
    const src = toMarkdownRelativePath(imagePath, options.basePath);
    const width = node.attrs.width || (
      node.attrs.scale && node.attrs.originalWidth
        ? Math.round(node.attrs.originalWidth * node.attrs.scale / 100)
        : null
    );
    if (width || node.attrs.scale || node.attrs.originalWidth) {
      const attrs = [
        `src="${escapeHtmlAttribute(src)}"`,
        `alt="${escapeHtmlAttribute(node.attrs.alt || "")}"`,
        width ? `width="${width}"` : "",
        node.attrs.scale ? `data-pme-scale="${node.attrs.scale}"` : "",
        node.attrs.originalWidth ? `data-pme-original-width="${node.attrs.originalWidth}"` : "",
      ].filter(Boolean);
      return `<img ${attrs.join(" ")} />`;
    }
    return `![${node.attrs.alt || ""}](${src})`;
  }

  if (node.type === "video") {
    const videoPath = node.attrs.assetSrc || node.attrs.src;
    const src = toMarkdownRelativePath(videoPath, options.basePath);
    const attrs = [
      `src="${escapeHtmlAttribute(src)}"`,
      node.attrs.assetSrc ? `data-asset-src="${escapeHtmlAttribute(node.attrs.assetSrc)}"` : "",
      node.attrs.width ? `width="${node.attrs.width}"` : "",
      node.attrs.scale ? `data-pme-scale="${node.attrs.scale}"` : "",
      node.attrs.originalWidth ? `data-pme-original-width="${node.attrs.originalWidth}"` : "",
      "controls",
    ].filter(Boolean);
    return `<video ${attrs.join(" ")} />`;
  }

  if (node.type === "details") {
    const summary = node.content?.find((child) => child.type === "detailsSummary");
    const content = node.content?.find((child) => child.type === "detailsContent");
    const summaryText = summary ? plainText(summary) : "";
    const contentText = content ? content.content?.map((c) => serializeNode(c, options)).join("\n") : "";
    return `<details>\n<summary>${summaryText}</summary>\n${contentText}\n</details>`;
  }

  if (node.type === "detailsSummary") {
    return `<summary>${plainText(node)}</summary>`;
  }

  if (node.type === "detailsContent") {
    return node.content?.map((c) => serializeNode(c, options)).join("\n") || "";
  }

  if (node.type === "callout") {
    const type = node.attrs?.type || "note";
    const title = node.attrs?.title || "Note";
    const contentText = node.content ? node.content.map((c) => plainText(c, options)).join("\n") : "";
    return `<div class="callout callout--${type}" data-type="${type}" data-title="${title}">${contentText}</div>`;
  }

  return "";
}

function collectSvgBlock(lines, startIndex) {
  const svgLines = [];
  let index = startIndex;

  while (index < lines.length) {
    svgLines.push(lines[index]);
    if (/<\/svg>\s*$/i.test(lines[index])) {
      index += 1;
      break;
    }
    index += 1;
  }

  return { svg: svgLines.join("\n").trim(), nextIndex: index };
}

function collectSvgDiagramBlock(lines, startIndex) {
  const blockLines = [];
  let index = startIndex;

  while (index < lines.length) {
    blockLines.push(lines[index]);
    if (/<\/div>\s*$/i.test(lines[index])) {
      index += 1;
      break;
    }
    index += 1;
  }

  const block = blockLines.join("\n").trim();
  const scale = normalizeSvgScale(block.match(/\bdata-pme-scale=["']([^"']+)["']/i)?.[1]);
  const svg = block.match(/<svg\b[\s\S]*<\/svg>/i)?.[0]?.trim() || "";
  return { code: svg, scale, nextIndex: index };
}

function normalizeSvgScale(scale) {
  const value = Number.parseInt(scale, 10);
  return [25, 50, 75, 100, 125, 150].includes(value) ? value : 100;
}

function normalizeMermaidScale(scale) {
  const value = Number.parseInt(scale, 10);
  return Number.isFinite(value) ? Math.min(250, Math.max(10, value)) : null;
}

function getLastSerializableNode(nodes) {
  return [...nodes].reverse().find((node) => serializeNode(node, {}).trim());
}

function toMarkdownRelativePath(assetPath, basePath) {
  if (!basePath || isExternalPath(assetPath)) {
    return assetPath;
  }

  let normalizedAssetPath = assetPath.replace(/\\/g, "/");
  let normalizedBasePath = basePath.replace(/\\/g, "/");

  const assetHasDrive = /^[A-Za-z]:\//.test(normalizedAssetPath);
  const baseHasDrive = /^[A-Za-z]:\//.test(normalizedBasePath);

  if (assetHasDrive && !baseHasDrive) {
    return assetPath;
  }

  normalizedAssetPath = normalizedAssetPath.replace(/^[A-Za-z]:\//, "");
  normalizedBasePath = normalizedBasePath.replace(/^[A-Za-z]:\//, "");

  if (normalizedAssetPath.startsWith("/")) {
    return assetPath;
  }

  const baseDirectory = normalizedBasePath.includes("/")
    ? normalizedBasePath.split("/").slice(0, -1)
    : [];
  const assetParts = normalizedAssetPath.split("/").filter(Boolean);

  while (
    baseDirectory.length &&
    assetParts.length &&
    baseDirectory[0] === assetParts[0]
  ) {
    baseDirectory.shift();
    assetParts.shift();
  }

  return [
    ...baseDirectory.map(() => ".."),
    ...assetParts,
  ].join("/") || ".";
}

function isHorizontalRule(line) {
  return /^(?:\s*[-*_]\s*){3,}$/.test(line.trim());
}

function collectFootnoteDefinitions(lines) {
  const footnotes = {};
  lines.forEach((line) => {
    const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (match) {
      footnotes[match[1]] = match[2];
    }
  });
  return footnotes;
}

function isFootnoteDefinition(line) {
  return /^\[\^([^\]]+)\]:\s*(.*)$/.test(line.trim());
}

function isTableOfContentsBlock(line) {
  return /^<div\s+data-type=["']table-of-contents["'][^>]*>(?:目录)?<\/div>$/.test(line.trim());
}

function parseListItemLine(line) {
  const match = line.match(/^([ \t]*)([-+*]|(\d+)[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/);
  if (!match) {
    return null;
  }

  const indent = [...match[1]].reduce((total, character) => total + (character === "\t" ? 4 : 1), 0);
  const checked = match[4] === undefined ? null : match[4].toLowerCase() === "x";
  return {
    indent,
    type: checked !== null ? "taskList" : match[3] ? "orderedList" : "bulletList",
    start: match[3] ? Number.parseInt(match[3], 10) : 1,
    checked,
    text: match[5],
  };
}

function parseListBlock(lines, startIndex, footnotes) {
  const first = parseListItemLine(lines[startIndex]);
  const list = {
    type: first.type,
    ...(first.type === "orderedList" ? { attrs: { start: first.start, type: null } } : {}),
    content: [],
  };
  let index = startIndex;

  while (index < lines.length) {
    const itemLine = parseListItemLine(lines[index]);
    if (!itemLine || itemLine.indent !== first.indent || itemLine.type !== first.type) {
      break;
    }

    const item = {
      type: itemLine.type === "taskList" ? "taskItem" : "listItem",
      ...(itemLine.type === "taskList" ? { attrs: { checked: itemLine.checked } } : {}),
      content: [{ type: "paragraph", content: parseInline(itemLine.text, footnotes) }],
    };
    index += 1;

    while (index < lines.length) {
      const nestedLine = parseListItemLine(lines[index]);
      if (!nestedLine || nestedLine.indent <= first.indent) {
        break;
      }
      const nested = parseListBlock(lines, index, footnotes);
      item.content.push(nested.list);
      index = nested.nextIndex;
    }

    list.content.push(item);
  }

  return { list, nextIndex: index };
}

function serializeList(node, options, depth = 0) {
  const indent = "  ".repeat(depth);
  const start = Number.parseInt(node.attrs?.start || 1, 10) || 1;
  const lines = [];

  (node.content || []).forEach((item, index) => {
    const paragraph = item.content?.find((child) => child.type === "paragraph");
    const marker = node.type === "orderedList"
      ? `${start + index}.`
      : node.type === "taskList"
        ? `- [${item.attrs?.checked ? "x" : " "}]`
        : "-";
    lines.push(`${indent}${marker} ${paragraph ? plainText(paragraph, options) : ""}`);
    item.content?.filter((child) => ["bulletList", "orderedList", "taskList"].includes(child.type))
      .forEach((child) => lines.push(serializeList(child, options, depth + 1)));
  });

  return lines.join("\n");
}

function isTableStart(lines, index) {
  return isTableRow(lines[index]) && isTableSeparator(lines[index + 1] || "");
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSeparator(line) {
  if (!isTableRow(line)) {
    return false;
  }
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function parseTable(lines, startIndex, widths = null) {
  const headerCells = splitTableRow(lines[startIndex]);
  const alignments = splitTableRow(lines[startIndex + 1]).map(parseTableAlignment);
  const rows = [
    tableRow(headerCells, "tableHeader", alignments, widths),
  ];
  let index = startIndex + 2;

  while (index < lines.length && isTableRow(lines[index])) {
    rows.push(tableRow(splitTableRow(lines[index]), "tableCell", alignments, widths));
    index += 1;
  }

  return {
    table: { type: "table", content: rows },
    nextIndex: index,
  };
}

function tableRow(cells, cellType, alignments = [], widths = null) {
  return {
    type: "tableRow",
    content: cells.map((cell, index) => ({
      type: cellType,
      ...tableCellAttrs(alignments[index], widths?.[index]),
      content: [
        {
          type: "paragraph",
          content: parseInline(cell.trim()),
        },
      ],
    })),
  };
}

function tableCellAttrs(textAlign, width) {
  const attrs = {
    ...(textAlign ? { textAlign } : {}),
    ...(width ? { colwidth: [width] } : {}),
  };
  return Object.keys(attrs).length ? { attrs } : {};
}

function parseTableWidths(value, columnCount) {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== columnCount || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }
  const widths = parts.map((part) => Number.parseInt(part, 10));
  return widths.some((width) => width > 0) ? widths : null;
}

function parseTableAlignment(cell) {
  const value = cell.trim();
  const left = value.startsWith(":");
  const right = value.endsWith(":");
  if (left && right) {
    return "center";
  }
  if (right) {
    return "right";
  }
  if (left) {
    return "left";
  }
  return null;
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
}

function serializeTable(node) {
  const rows = node.content || [];
  if (!rows.length) {
    return "";
  }

  const header = rows[0].content || [];
  const body = rows.slice(1);
  const table = [
    serializeTableRow(header),
    serializeTableRow(header.map((cell) => ({ type: "tableCell", content: textContent(tableAlignmentMarker(cell)) }))),
    ...body.map((row) => serializeTableRow(row.content || [])),
  ].join("\n");
  const widths = getTableColumnWidths(header);
  return widths ? `<!-- pme-table-widths: ${widths.join(",")} -->\n${table}` : table;
}

function getTableColumnWidths(row) {
  const widths = [];
  let hasExplicitWidth = false;
  for (const cell of row) {
    const colspan = Number.parseInt(cell.attrs?.colspan || 1, 10) || 1;
    const cellWidths = cell.attrs?.colwidth;
    if (cellWidths == null) {
      widths.push(...Array(colspan).fill(0));
      continue;
    }
    if (!Array.isArray(cellWidths) || cellWidths.length !== colspan) {
      return null;
    }
    for (const width of cellWidths) {
      if (!Number.isFinite(width) || width < 0) {
        return null;
      }
      hasExplicitWidth = hasExplicitWidth || width > 0;
      widths.push(Math.round(width));
    }
  }
  return hasExplicitWidth ? widths : null;
}

function tableAlignmentMarker(cell) {
  if (cell.attrs?.textAlign === "center") {
    return ":---:";
  }
  if (cell.attrs?.textAlign === "right") {
    return "---:";
  }
  if (cell.attrs?.textAlign === "left") {
    return ":---";
  }
  return "----";
}

function serializeTableRow(cells) {
  return `| ${cells.map((cell) => plainText(cell).trim()).join(" | ")} |`;
}

function isExternalPath(path) {
  return /^(blob:|https?:|data:)/.test(path);
}

function parseHtmlImage(line) {
  const match = line.match(/^<img\s+([^>]*?)\s*\/?>$/i);
  if (!match) {
    return null;
  }

  const attrs = {};
  for (const attr of match[1].matchAll(/([a-zA-Z:-]+)=["']([^"']*)["']/g)) {
    attrs[attr[1].toLowerCase()] = attr[2];
  }
  if (!attrs.src) {
    return null;
  }

  const width = normalizeImageSize(attrs.width);
  const scale = normalizeImageSize(attrs["data-pme-scale"]);
  const originalWidth = normalizeImageSize(attrs["data-pme-original-width"]);
  return {
    src: attrs.src,
    alt: attrs.alt || "",
    ...(width ? { width } : {}),
    ...(scale ? { scale } : {}),
    ...(originalWidth ? { originalWidth } : {}),
  };
}

function parseHtmlVideo(line) {
  const match = line.match(/^<video\s+([^>]*?)\s*\/?>$/i);
  if (!match) {
    return null;
  }

  const attrs = {};
  for (const attr of match[1].matchAll(/([a-zA-Z:-]+)=["']([^"']*)["']/g)) {
    attrs[attr[1].toLowerCase()] = attr[2];
  }
  if (!attrs.src) {
    return null;
  }

  const width = normalizeImageSize(attrs.width);
  const scale = normalizeImageSize(attrs["data-pme-scale"]);
  const originalWidth = normalizeImageSize(attrs["data-pme-original-width"]);
  return {
    src: attrs.src,
    assetSrc: attrs["data-asset-src"] || null,
    controls: /\bcontrols(?:\s|\/?>|$)/i.test(match[1]),
    ...(width ? { width } : {}),
    ...(scale ? { scale } : {}),
    ...(originalWidth ? { originalWidth } : {}),
  };
}

function normalizeImageSize(value) {
  const size = Number.parseInt(value, 10);
  return Number.isFinite(size) && size > 0 ? size : null;
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hydrateNodes(nodes, files, options) {
  return nodes.map((node) => {
    const assetPath = normalizeMarkdownImagePath(node.attrs?.src, options.basePath);
    if (node.type === "image" && files[assetPath]) {
      return {
        ...node,
        attrs: {
          ...node.attrs,
          assetSrc: assetPath,
          src: files[assetPath],
        },
      };
    }

    if (node.type === "video") {
      const videoPath = node.attrs?.assetSrc || normalizeMarkdownImagePath(node.attrs?.src, options.basePath);
      return {
        ...node,
        attrs: {
          ...node.attrs,
          assetSrc: videoPath,
        },
      };
    }

    if (node.content) {
      return {
        ...node,
        content: hydrateNodes(node.content, files, options),
      };
    }

    return node;
  });
}

function normalizeMarkdownImagePath(imagePath, basePath) {
  if (!imagePath || !basePath || isExternalPath(imagePath) || imagePath.startsWith("/")) {
    return imagePath;
  }

  const normalizedBasePath = basePath.replace(/\\/g, "/");
  const normalizedImagePath = imagePath.replace(/\\/g, "/");

  const driveMatch = normalizedBasePath.match(/^([A-Za-z]:)/);
  const drive = driveMatch ? driveMatch[1] : "";
  
  const baseWithoutDrive = normalizedBasePath.replace(/^[A-Za-z]:/, "");

  const baseDirectory = baseWithoutDrive.startsWith("/") 
    ? baseWithoutDrive.slice(1).split("/").slice(0, -1)
    : baseWithoutDrive.includes("/")
      ? baseWithoutDrive.split("/").slice(0, -1)
      : [];
  
  const parts = [...baseDirectory, ...normalizedImagePath.split("/")];
  const normalized = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      normalized.pop();
    } else {
      normalized.push(part);
    }
  }

  const path = normalized.join("/");
  return drive ? drive + "/" + path : path;
}

function textContent(text) {
  return text ? [{ type: "text", text }] : [];
}

function plainText(node, options = {}) {
  return (node.content || []).map((child) => {
    if (child.type === "text") {
      return serializeText(child);
    }
    if (child.type === "inlineMath") {
      return `$${child.attrs?.latex || ""}$`;
    }
    if (child.type === "footnote") {
      const id = child.attrs?.id || getNextSerializedFootnoteId(options);
      const text = child.attrs?.text || "";
      if (options.footnotes && !options.footnotes.some((item) => item.id === id)) {
        options.footnotes.push({ id, text });
      }
      return `[^${id}]`;
    }
    return plainText(child, options);
  }).join("");
}

function getNextSerializedFootnoteId(options) {
  return String((options.footnotes?.length || 0) + 1);
}

function parseInline(text, footnotes = {}) {
  const nodes = [];
  let index = 0;
  const pattern = /(\[\^([^\]]+)\]|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|~~([^~]+)~~|<code\s+(?:class="language-([^"]+)"|data-language="([^"]+)")[^>]*>([^<]+)<\/code>|`([^`]+)`|\\\((.+?)\\\)|\$([^$\n]+)\$|\*([^*]+)\*|<span\s+style="([^"]+)">([^<]+)<\/span>|<mark\s+style="([^"]+)">([^<]+)<\/mark>|<u>([^<]+)<\/u>|<sup>([^<]+)<\/sup>|<sub>([^<]+)<\/sub>)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > index) {
      nodes.push({ type: "text", text: text.slice(index, match.index) });
    }

    if (match[2]) {
      nodes.push({ type: "footnote", attrs: { id: match[2], text: footnotes[match[2]] || "" } });
    } else if (match[3]) {
      console.log("DEBUG: parseInline found link match:", match[0], ", text:", match[3], ", href:", match[4]);
      nodes.push(linkedText(match[3], match[4]));
    } else if (match[5]) {
      nodes.push(markedText(match[5], "bold"));
    } else if (match[6]) {
      nodes.push(markedText(match[6], "strike"));
    } else if (match[9]) {
      nodes.push(codeText(match[9], match[7] || match[8]));
    } else if (match[10]) {
      nodes.push(markedText(match[10], "code"));
    } else if (match[11]) {
      nodes.push({ type: "inlineMath", attrs: { latex: match[11].trim() } });
    } else if (match[12]) {
      nodes.push({ type: "inlineMath", attrs: { latex: match[12].trim() } });
    } else if (match[13]) {
      nodes.push(markedText(match[13], "italic"));
    } else if (match[15]) {
      const styles = parseInlineStyles(match[14]);
      nodes.push({ type: "text", text: match[15], marks: styles });
    } else if (match[17]) {
      const styles = parseHighlightStyles(match[16]);
      nodes.push({ type: "text", text: match[17], marks: styles });
    } else if (match[18]) {
      nodes.push(markedText(match[18], "underline"));
    } else if (match[19]) {
      nodes.push(markedText(match[19], "superscript"));
    } else if (match[20]) {
      nodes.push(markedText(match[20], "subscript"));
    }

    index = pattern.lastIndex;
  }

  if (index < text.length) {
    nodes.push({ type: "text", text: text.slice(index) });
  }

  return nodes;
}

function parseInlineStyles(styleString) {
  const marks = [];
  const styleMap = {};
  styleString.split(";").forEach((style) => {
    const [key, value] = style.trim().split(":").map((s) => s.trim());
    if (key && value) {
      styleMap[key.toLowerCase()] = value;
    }
  });

  if (styleMap.color) {
    marks.push({ type: "textStyle", attrs: { color: styleMap.color } });
  }
  if (styleMap["font-size"]) {
    marks.push({ type: "textStyle", attrs: { fontSize: styleMap["font-size"] } });
  }
  if (styleMap["vertical-align"] === "super") {
    marks.push({ type: "superscript" });
  }
  if (styleMap["vertical-align"] === "sub") {
    marks.push({ type: "subscript" });
  }

  return marks;
}

function parseHighlightStyles(styleString) {
  const marks = [];
  const styleMap = {};
  styleString.split(";").forEach((style) => {
    const [key, value] = style.trim().split(":").map((s) => s.trim());
    if (key && value) {
      styleMap[key.toLowerCase()] = value;
    }
  });

  if (styleMap["background-color"]) {
    marks.push({ type: "highlight", attrs: { color: styleMap["background-color"] } });
  }

  return marks;
}

function markedText(text, type) {
  return { type: "text", text, marks: [{ type }] };
}

function codeText(text, language = "plaintext") {
  return {
    type: "text",
    text,
    marks: [{ type: "code", attrs: { language: language || "plaintext" } }],
  };
}

function linkedText(text, href) {
  console.log("DEBUG: linkedText called, text:", text, ", href:", href);
  return { type: "text", text, marks: [{ type: "link", attrs: { href } }] };
}

function serializeText(node) {
  if (node.type === "inlineMath") {
    return `$${node.attrs?.latex || ""}$`;
  }

  return (node.marks || []).reduce((text, mark) => {
    if (mark.type === "bold") {
      return `**${text}**`;
    }
    if (mark.type === "italic") {
      return `*${text}*`;
    }
    if (mark.type === "strike") {
      return `~~${text}~~`;
    }
    if (mark.type === "code") {
      const language = mark.attrs?.language || "plaintext";
      if (language !== "plaintext") {
        return `<code class="language-${escapeHtmlAttribute(language)}">${escapeHtml(text)}</code>`;
      }
      return `\`${text}\``;
    }
    if (mark.type === "link") {
      return `[${text}](${mark.attrs?.href || ""})`;
    }
    if (mark.type === "underline") {
      return `<u>${text}</u>`;
    }
    if (mark.type === "superscript") {
      return `<sup>${text}</sup>`;
    }
    if (mark.type === "subscript") {
      return `<sub>${text}</sub>`;
    }
    if (mark.type === "highlight") {
      const color = mark.attrs?.color;
      if (color) {
        return `<mark style="background-color: ${color}; color: inherit;">${text}</mark>`;
      }
      return `==${text}==`;
    }
    if (mark.type === "textStyle") {
      const styles = [];
      const attrs = mark.attrs || {};
      if (attrs.color) {
        styles.push(`color: ${attrs.color}`);
      }
      if (attrs.fontSize) {
        styles.push(`font-size: ${attrs.fontSize}`);
      }
      if (attrs.verticalAlign === "super") {
        styles.push("vertical-align: super; font-size: 0.75em");
      }
      if (attrs.verticalAlign === "sub") {
        styles.push("vertical-align: sub; font-size: 0.75em");
      }
      if (styles.length > 0) {
        return `<span style="${styles.join("; ")}">${text}</span>`;
      }
    }
    if (mark.type === "color") {
      if (mark.attrs?.color) {
        return `<span style="color: ${mark.attrs.color}">${text}</span>`;
      }
    }
    return text;
  }, node.text || "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
