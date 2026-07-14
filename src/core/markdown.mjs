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
        content: parseInline(quote[1], footnotes),
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

    if (/^-\s+/.test(line)) {
      if (/^-\s+\[[ xX]\]\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^-\s+\[[ xX]\]\s+/.test(lines[index])) {
          const match = lines[index].match(/^-\s+\[([ xX])\]\s+(.*)$/);
          items.push({
            type: "taskItem",
            attrs: { checked: match[1].toLowerCase() === "x" },
            content: [
              {
                type: "paragraph",
                content: parseInline(match[2], footnotes),
              },
            ],
          });
          index += 1;
        }
        content.push({ type: "taskList", content: items });
        continue;
      }

      const items = [];
      while (index < lines.length && /^-\s+/.test(lines[index])) {
        items.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInline(lines[index].replace(/^-\s+/, ""), footnotes),
            },
          ],
        });
        index += 1;
      }
      content.push({ type: "bulletList", content: items });
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
    return plainText(node, options);
  }

  if (node.type === "horizontalRule") {
    return "---";
  }

  if (node.type === "tableOfContents") {
    return '<div data-type="table-of-contents"></div>';
  }

  if (node.type === "bulletList") {
    return node.content.map((item) => `- ${plainText(item, options)}`).join("\n");
  }

  if (node.type === "taskList") {
    return node.content.map((item) => (
      `- [${item.attrs?.checked ? "x" : " "}] ${plainText(item, options)}`
    )).join("\n");
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
    return [
      "```mermaid",
      node.attrs?.code || "",
      "```",
    ].join("\n");
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

function parseTable(lines, startIndex) {
  const headerCells = splitTableRow(lines[startIndex]);
  const alignments = splitTableRow(lines[startIndex + 1]).map(parseTableAlignment);
  const rows = [
    tableRow(headerCells, "tableHeader", alignments),
  ];
  let index = startIndex + 2;

  while (index < lines.length && isTableRow(lines[index])) {
    rows.push(tableRow(splitTableRow(lines[index]), "tableCell", alignments));
    index += 1;
  }

  return {
    table: { type: "table", content: rows },
    nextIndex: index,
  };
}

function tableRow(cells, cellType, alignments = []) {
  return {
    type: "tableRow",
    content: cells.map((cell, index) => ({
      type: cellType,
      ...tableCellAttrs(alignments[index]),
      content: [
        {
          type: "paragraph",
          content: parseInline(cell.trim()),
        },
      ],
    })),
  };
}

function tableCellAttrs(textAlign) {
  return textAlign ? { attrs: { textAlign } } : {};
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
  return [
    serializeTableRow(header),
    serializeTableRow(header.map((cell) => ({ type: "tableCell", content: textContent(tableAlignmentMarker(cell)) }))),
    ...body.map((row) => serializeTableRow(row.content || [])),
  ].join("\n");
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
  return {
    src: attrs.src,
    assetSrc: attrs["data-asset-src"] || null,
    controls: attrs.controls !== undefined,
    ...(width ? { width } : {}),
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
  const pattern = /(\[\^([^\]]+)\]|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|~~([^~]+)~~|`([^`]+)`|\\\((.+?)\\\)|\$([^$\n]+)\$|\*([^*]+)\*|<span\s+style="([^"]+)">([^<]+)<\/span>|<mark\s+style="([^"]+)">([^<]+)<\/mark>|<u>([^<]+)<\/u>|<sup>([^<]+)<\/sup>|<sub>([^<]+)<\/sub>)/g;
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
    } else if (match[7]) {
      nodes.push(markedText(match[7], "code"));
    } else if (match[8]) {
      nodes.push({ type: "inlineMath", attrs: { latex: match[8].trim() } });
    } else if (match[9]) {
      nodes.push({ type: "inlineMath", attrs: { latex: match[9].trim() } });
    } else if (match[10]) {
      nodes.push(markedText(match[10], "italic"));
    } else if (match[12]) {
      const styles = parseInlineStyles(match[11]);
      nodes.push({ type: "text", text: match[12], marks: styles });
    } else if (match[14]) {
      const styles = parseHighlightStyles(match[13]);
      nodes.push({ type: "text", text: match[14], marks: styles });
    } else if (match[15]) {
      nodes.push(markedText(match[15], "underline"));
    } else if (match[16]) {
      nodes.push(markedText(match[16], "superscript"));
    } else if (match[17]) {
      nodes.push(markedText(match[17], "subscript"));
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
