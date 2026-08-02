import assert from "node:assert/strict";
import test from "node:test";

import {
  clipboardContentToFragments,
  clipboardFragmentsToDocument,
  clipboardTableToDocument,
  clipboardTableToMarkdown,
  extractHtmlClipboardFragments,
  tableRowsToMarkdown,
  tsvToMarkdown,
} from "../src/editor/clipboard-table.mjs";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");

function textNode(value) {
  return { nodeType: 3, nodeValue: value, textContent: value };
}

function elementNode(tagName, children = []) {
  return {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: children,
    textContent: children.map((child) => child.textContent || "").join(""),
  };
}

function tableNode(rows) {
  return {
    ...elementNode("table"),
    rows: rows.map((row) => ({
      cells: row.map((value) => ({
        cloneNode: () => ({
          textContent: value,
          querySelectorAll: () => [],
        }),
      })),
    })),
  };
}

test("converts regular multi-row TSV into a Markdown table", () => {
  assert.equal(
    tsvToMarkdown("场景\t技能\n网站展示\twebsite-video\n知识讲解\texplainer"),
    "| 场景 | 技能 |\n| --- | --- |\n| 网站展示 | website-video |\n| 知识讲解 | explainer |",
  );
});

test("leaves ambiguous Tab text unchanged", () => {
  assert.equal(tsvToMarkdown("只有一行\t不应转换"), "");
  assert.equal(tsvToMarkdown("甲\t乙\n列数不一致"), "");
  assert.equal(tsvToMarkdown("普通段落\n没有制表符"), "");
});

test("escapes Markdown table delimiters and preserves cell line breaks", () => {
  assert.equal(
    tableRowsToMarkdown([["名称", "说明"], ["A | B", "第一行\n第二行"]]),
    "| 名称 | 说明 |\n| --- | --- |\n| A \\| B | 第一行<br>第二行 |",
  );
});

test("prefers an HTML table over degraded plain clipboard text", () => {
  const markdown = clipboardTableToMarkdown(
    { html: "<table></table>", text: "场景\t技能场景\t技能" },
    () => [["场景", "技能"], ["网站展示", "website-video"]],
  );

  assert.equal(
    markdown,
    "| 场景 | 技能 |\n| --- | --- |\n| 网站展示 | website-video |",
  );
});

test("builds editor table content without reparsing cell delimiters", () => {
  const document = clipboardTableToDocument(
    { text: "名称\t说明\nA | B\t第一行\n第二行\t内容" },
    () => [["名称", "说明"], ["A | B", "第一行\n第二行"]],
  );

  assert.equal(document.type, "table");
  assert.equal(document.content[0].content[0].type, "tableHeader");
  assert.deepEqual(document.content[1].content[0].content[0].content, [
    { type: "text", text: "A | B" },
  ]);
  assert.deepEqual(document.content[1].content[1].content[0].content, [
    { type: "text", text: "第一行" },
    { type: "hardBreak" },
    { type: "text", text: "第二行" },
  ]);
});

test("preserves text around a TSV table", () => {
  assert.deepEqual(
    clipboardContentToFragments({
      text: "前文第一段\n前文第二段\n\n名称\t说明\nA\tAlpha\n\n结尾段落",
    }),
    [
      { type: "text", text: "前文第一段\n前文第二段" },
      { type: "table", rows: [["名称", "说明"], ["A", "Alpha"]] },
      { type: "text", text: "结尾段落" },
    ],
  );
});

test("preserves text between multiple TSV tables", () => {
  assert.deepEqual(
    clipboardContentToFragments({
      text: "开始\n甲\t乙\n1\t2\n中间\n甲\t乙\t丙\n3\t4\t5\n结束",
    }),
    [
      { type: "text", text: "开始" },
      { type: "table", rows: [["甲", "乙"], ["1", "2"]] },
      { type: "text", text: "中间" },
      { type: "table", rows: [["甲", "乙", "丙"], ["3", "4", "5"]] },
      { type: "text", text: "结束" },
    ],
  );
});

test("does not intercept mixed text without a regular TSV table", () => {
  assert.deepEqual(
    clipboardContentToFragments({ text: "前文\n只有一行\tTab\n后文" }),
    [],
  );
});

test("preserves indentation, hard-break spaces, and blank lines in surrounding text", () => {
  const fragments = clipboardContentToFragments({
    text: "    缩进段落\n保留硬换行  \n\n名称\t说明\nA\tAlpha\n\n结尾",
  });

  assert.equal(fragments[0].text, "    缩进段落\n保留硬换行  ");
  assert.equal(fragments[2].text, "结尾");
});

test("does not convert Tab-delimited lines inside fenced or indented code", () => {
  assert.deepEqual(
    clipboardContentToFragments({ text: "```text\nname\tvalue\none\ttwo\n```" }),
    [],
  );
  assert.deepEqual(
    clipboardContentToFragments({ text: "\tname\tvalue\n\tone\ttwo" }),
    [],
  );
});

test("extracts surrounding text and multiple HTML tables in order", () => {
  const body = elementNode("body", [
    elementNode("p", [textNode("前文")]),
    tableNode([["名称", "技能"], ["网站", "website-video"]]),
    elementNode("div", [textNode("中间段落")]),
    tableNode([["项目", "状态"], ["测试", "完成"]]),
    elementNode("p", [textNode("后文")]),
  ]);

  assert.deepEqual(
    extractHtmlClipboardFragments("<ignored>", () => ({ body })),
    [
      { type: "text", text: "前文" },
      { type: "table", rows: [["名称", "技能"], ["网站", "website-video"]] },
      { type: "text", text: "中间段落" },
      { type: "table", rows: [["项目", "状态"], ["测试", "完成"]] },
      { type: "text", text: "后文" },
    ],
  );
});

test("preserves block breaks inside HTML cells", () => {
  const blockCell = {
    cloneNode: () => elementNode("td", [
      elementNode("p", [textNode("第一段")]),
      elementNode("div", [textNode("第二段")]),
    ]),
  };
  const body = elementNode("body", [{
    ...elementNode("table"),
    rows: [
      { cells: [blockCell, blockCell] },
      { cells: [blockCell, blockCell] },
    ],
  }]);

  const fragments = extractHtmlClipboardFragments("<ignored>", () => ({ body }));
  assert.equal(fragments[0].rows[0][0], "第一段\n第二段");
});

test("rejects the HTML representation when any table is irregular", () => {
  const body = elementNode("body", [
    tableNode([["名称", "技能"], ["网站", "website-video"]]),
    tableNode([["合并", "表格"], ["不规则"]]),
  ]);

  assert.deepEqual(extractHtmlClipboardFragments("<ignored>", () => ({ body })), []);
});

test("builds ordered editor nodes from mixed clipboard fragments", () => {
  let parsedText = "";
  const nodes = clipboardFragmentsToDocument([
    { type: "text", text: "前文" },
    { type: "table", rows: [["名称", "技能"], ["网站", "website-video"]] },
    { type: "text", text: "后文" },
  ], (text) => {
    parsedText = text;
    return {
      content: text.split("\n\n").map((value) => ({
        type: "paragraph",
        content: [{ type: "text", text: value }],
      })),
    };
  });

  assert.equal(nodes.length, 3);
  assert.equal(nodes[0].content[0].text, "前文");
  assert.equal(nodes[1].type, "table");
  assert.equal(nodes[2].content[0].text, "后文");
  assert.equal(parsedText.startsWith("前文\n\n"), true);
  assert.equal(parsedText.endsWith("\n\n后文"), true);
  assert.equal(appSource.includes("clipboardContentToFragments({"), true);
  assert.equal(appSource.includes("clipboardFragmentsToDocument("), true);
});
