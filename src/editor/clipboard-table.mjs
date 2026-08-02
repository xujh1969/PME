function normalizeCellText(value) {
  return String(value || "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .trim()
    .replace(/\s*\n\s*/g, "\n")
    .replaceAll("|", "\\|")
    .replaceAll("\n", "<br>");
}

function isTableRows(rows) {
  const columnCount = rows?.[0]?.length || 0;
  return Array.isArray(rows)
    && rows.length >= 2
    && columnCount >= 2
    && rows.every((row) => row.length === columnCount);
}

function getTsvRows(text) {
  const lines = String(text || "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  while (lines.at(-1) === "") {
    lines.pop();
  }
  const rows = lines.map((line) => line.split("\t"));
  return isTableRows(rows) ? rows : [];
}

function normalizeFragmentText(value) {
  return String(value || "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/^\n+|\n+$/g, "");
}

function getProtectedTsvLines(lines) {
  let fenceCharacter = "";
  return lines.map((line) => {
    if (fenceCharacter) {
      const isClosingFence = new RegExp(`^ {0,3}\\${fenceCharacter}{3,}\\s*$`).test(line);
      if (isClosingFence) {
        fenceCharacter = "";
      }
      return true;
    }

    const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (openingFence) {
      fenceCharacter = openingFence[1][0];
      return true;
    }
    return /^(?:\t| {4})/.test(line);
  });
}

function getTsvFragments(text) {
  const lines = String(text || "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const protectedLines = getProtectedTsvLines(lines);
  const fragments = [];
  let textLines = [];

  const flushText = () => {
    const value = normalizeFragmentText(textLines.join("\n"));
    if (value) {
      fragments.push({ type: "text", text: value });
    }
    textLines = [];
  };

  for (let index = 0; index < lines.length;) {
    const columnCount = protectedLines[index] ? 0 : lines[index].split("\t").length;
    let end = index;
    if (columnCount >= 2) {
      while (end < lines.length
        && !protectedLines[end]
        && lines[end].split("\t").length === columnCount) {
        end += 1;
      }
    }

    if (end - index >= 2) {
      flushText();
      fragments.push({
        type: "table",
        rows: lines.slice(index, end).map((line) => line.split("\t")),
      });
      index = end;
    } else {
      textLines.push(lines[index]);
      index += 1;
    }
  }

  flushText();
  return fragments.some((fragment) => fragment.type === "table") ? fragments : [];
}

export function tableRowsToMarkdown(rows) {
  if (!isTableRows(rows)) {
    return "";
  }

  const columnCount = rows[0].length;
  const normalizedRows = rows.map((row) => row.map(normalizeCellText));
  const serializeRow = (row) => `| ${row.join(" | ")} |`;
  return [
    serializeRow(normalizedRows[0]),
    serializeRow(Array(columnCount).fill("---")),
    ...normalizedRows.slice(1).map(serializeRow),
  ].join("\n");
}

export function tsvToMarkdown(text) {
  return tableRowsToMarkdown(getTsvRows(text));
}

export function extractHtmlTableRows(html) {
  if (!html || typeof DOMParser === "undefined") {
    return [];
  }

  const table = new DOMParser().parseFromString(html, "text/html").querySelector("table");
  if (!table) {
    return [];
  }

  return Array.from(table.rows, (row) => Array.from(row.cells, (cell) => {
    const clone = cell.cloneNode(true);
    clone.querySelectorAll("br").forEach((breakElement) => breakElement.replaceWith("\n"));
    return clone.textContent || "";
  }));
}

const CELL_BLOCK_ELEMENTS = new Set(["ADDRESS", "ARTICLE", "BLOCKQUOTE", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "P", "PRE", "SECTION"]);

function extractCellText(cell) {
  const clone = cell.cloneNode(true);
  if (!clone.childNodes?.length) {
    return clone.textContent || "";
  }

  let text = "";
  const walk = (node) => {
    if (node.nodeType === 3) {
      text += node.nodeValue || "";
      return;
    }
    if (node.nodeType !== 1) {
      return;
    }
    if (node.tagName === "BR") {
      text += "\n";
      return;
    }
    Array.from(node.childNodes || []).forEach(walk);
    if (CELL_BLOCK_ELEMENTS.has(node.tagName) && text && !text.endsWith("\n")) {
      text += "\n";
    }
  };

  Array.from(clone.childNodes).forEach(walk);
  return normalizeFragmentText(text);
}

function extractTableRows(table) {
  return Array.from(table.rows || [], (row) => Array.from(row.cells || [], (cell) => {
    return extractCellText(cell);
  }));
}

function hasMergedTableCells(table) {
  return Array.from(table.rows || []).some((row) => Array.from(row.cells || []).some((cell) => {
    const rowSpan = Number(cell.rowSpan || cell.getAttribute?.("rowspan") || 1);
    const colSpan = Number(cell.colSpan || cell.getAttribute?.("colspan") || 1);
    return rowSpan > 1 || colSpan > 1;
  }));
}

function parseClipboardHtml(html) {
  if (typeof DOMParser === "undefined") {
    return null;
  }
  return new DOMParser().parseFromString(html, "text/html");
}

const BLOCK_ELEMENTS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6",
  "HEADER", "LI", "MAIN", "NAV", "P", "PRE", "SECTION",
]);

export function extractHtmlClipboardFragments(html, parseDocument = parseClipboardHtml) {
  if (!html) {
    return [];
  }

  const body = parseDocument(html)?.body;
  if (!body) {
    return [];
  }

  const fragments = [];
  let hasInvalidTable = false;
  let text = "";
  const flushText = () => {
    const value = normalizeFragmentText(text);
    if (value) {
      fragments.push({ type: "text", text: value });
    }
    text = "";
  };
  const appendLineBreak = () => {
    if (text && !text.endsWith("\n")) {
      text += "\n";
    }
  };
  const walk = (node) => {
    if (node.nodeType === 3) {
      text += node.nodeValue || "";
      return;
    }
    if (node.nodeType !== 1) {
      return;
    }

    if (node.tagName === "TABLE") {
      const rows = extractTableRows(node);
      if (isTableRows(rows) && !hasMergedTableCells(node)) {
        flushText();
        fragments.push({ type: "table", rows });
      } else {
        hasInvalidTable = true;
      }
      return;
    }
    if (node.tagName === "SCRIPT" || node.tagName === "STYLE") {
      return;
    }
    if (node.tagName === "BR") {
      text += "\n";
      return;
    }

    Array.from(node.childNodes || []).forEach(walk);
    if (BLOCK_ELEMENTS.has(node.tagName)) {
      appendLineBreak();
    }
  };

  Array.from(body.childNodes || []).forEach(walk);
  flushText();
  if (hasInvalidTable) {
    return [];
  }
  return fragments.some((fragment) => fragment.type === "table") ? fragments : [];
}

export function clipboardContentToFragments({ html = "", text = "" } = {}) {
  const htmlFragments = extractHtmlClipboardFragments(html);
  return htmlFragments.length ? htmlFragments : getTsvFragments(text);
}

export function clipboardTableToMarkdown({ html = "", text = "" } = {}, getHtmlRows = extractHtmlTableRows) {
  const htmlMarkdown = tableRowsToMarkdown(getHtmlRows(html));
  return htmlMarkdown || tsvToMarkdown(text);
}

function cellInlineContent(value) {
  return String(value || "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .flatMap((line, index) => [
      ...(index ? [{ type: "hardBreak" }] : []),
      ...(line ? [{ type: "text", text: line }] : []),
    ]);
}

function tableRowsToDocument(rows) {
  if (!isTableRows(rows)) {
    return null;
  }

  return {
    type: "table",
    content: rows.map((row, rowIndex) => ({
      type: "tableRow",
      content: row.map((cell) => {
        const content = cellInlineContent(cell);
        return {
          type: rowIndex === 0 ? "tableHeader" : "tableCell",
          content: [{
            type: "paragraph",
            ...(content.length ? { content } : {}),
          }],
        };
      }),
    })),
  };
}

export function clipboardFragmentsToDocument(fragments, parseText) {
  const allText = fragments
    .filter((fragment) => fragment.type === "text")
    .map((fragment) => fragment.text)
    .join("\n");
  let placeholderPrefix = "PMECLIPBOARDTABLE";
  while (allText.includes(placeholderPrefix)) {
    placeholderPrefix += "X";
  }

  const tables = new Map();
  const markdown = fragments.map((fragment, index) => {
    if (fragment.type !== "table") {
      return fragment.type === "text" ? fragment.text : "";
    }
    const placeholder = `${placeholderPrefix}${index}`;
    const table = tableRowsToDocument(fragment.rows);
    if (table) {
      tables.set(placeholder, table);
    }
    return placeholder;
  }).join("\n\n");

  let replacementCount = 0;
  const content = (parseText(markdown)?.content || []).flatMap((node) => {
    const placeholder = node.type === "paragraph"
      && node.content?.length === 1
      && node.content[0].type === "text"
      ? node.content[0].text
      : "";
    const table = tables.get(placeholder);
    if (!table) {
      return [node];
    }
    replacementCount += 1;
    return [table];
  });

  if (replacementCount === tables.size) {
    return content;
  }
  return fragments.flatMap((fragment) => fragment.type === "text"
    ? (parseText(fragment.text)?.content || [])
    : [tableRowsToDocument(fragment.rows)].filter(Boolean));
}

export function clipboardTableToDocument({ html = "", text = "" } = {}, getHtmlRows = extractHtmlTableRows) {
  const htmlRows = getHtmlRows(html);
  const rows = isTableRows(htmlRows) ? htmlRows : getTsvRows(text);
  return tableRowsToDocument(rows);
}
