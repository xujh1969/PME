import test from "node:test";
import assert from "node:assert/strict";

import {
  hydrateImagePreviews,
  parseMarkdown,
  serializeMarkdown,
} from "../src/core/markdown.mjs";

test("parses headings and paragraphs into the document model", () => {
  assert.deepEqual(parseMarkdown("# Title\n\nBody text"), {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, collapsed: false },
        content: [{ type: "text", text: "Title" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Body text" }],
      },
    ],
  });
});

test("parses bullet lists, blockquotes, code blocks, and images", () => {
  assert.deepEqual(parseMarkdown([
    "- First",
    "- Second",
    "",
    "> Note",
    "",
    "```js",
    "console.log('ok')",
    "```",
    "",
    "![Diagram](assets/diagram.png)",
  ].join("\n")), {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "First" }] },
            ],
          },
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Second" }] },
            ],
          },
        ],
      },
      {
        type: "blockquote",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Note" }] }],
      },
      {
        type: "codeBlock",
        attrs: { language: "js" },
        content: [{ type: "text", text: "console.log('ok')" }],
      },
      {
        type: "image",
        attrs: { alt: "Diagram", src: "assets/diagram.png" },
      },
    ],
  });
});

test("parses and serializes task lists", () => {
  const markdown = [
    "- [ ] Write docs",
    "- [x] Ship build",
  ].join("\n");

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Write docs" }] },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Ship build" }] },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("parses and serializes horizontal rules", () => {
  const markdown = [
    "Intro",
    "",
    "---",
    "",
    "Outro",
  ].join("\n");

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Intro" }],
      },
      {
        type: "horizontalRule",
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Outro" }],
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("serializes the supported document model back to markdown", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Design" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Portable markdown." }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Open" }] },
            ],
          },
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Save" }] },
            ],
          },
        ],
      },
      {
        type: "image",
        attrs: { alt: "Architecture", src: "assets/arch.png" },
      },
    ],
  };

  assert.equal(serializeMarkdown(doc), [
    "## Design",
    "",
    "Portable markdown.",
    "",
    "- Open",
    "- Save",
    "",
    "![Architecture](assets/arch.png)",
    "",
    "",
  ].join("\n"));
});

test("round trips table of contents blocks", () => {
  const markdown = '<div data-type="table-of-contents"></div>';
  const doc = parseMarkdown(markdown);

  assert.deepEqual(doc.content[0], { type: "tableOfContents" });
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("parses and serializes markdown tables", () => {
  const markdown = [
    "| Name | Status |",
    "| ---- | ---- |",
    "| A | Done |",
    "| B | Todo |",
  ].join("\n");

  const doc = {
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Status" }] }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
              },
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Done" }] }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }],
              },
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Todo" }] }],
              },
            ],
          },
        ],
      },
    ],
  };

  assert.deepEqual(parseMarkdown(markdown), doc);
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("preserves markdown table alignment", () => {
  const markdown = [
    "| Left | Center | Right |",
    "| :--- | :---: | ---: |",
    "| A | B | C |",
  ].join("\n");

  const doc = parseMarkdown(markdown);
  const [headerRow, bodyRow] = doc.content[0].content;
  assert.equal(headerRow.content[0].attrs.textAlign, "left");
  assert.equal(headerRow.content[1].attrs.textAlign, "center");
  assert.equal(headerRow.content[2].attrs.textAlign, "right");
  assert.equal(bodyRow.content[0].attrs.textAlign, "left");
  assert.equal(bodyRow.content[1].attrs.textAlign, "center");
  assert.equal(bodyRow.content[2].attrs.textAlign, "right");
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("parses and serializes block math", () => {
  const markdown = [
    "Before",
    "",
    "$$",
    "E = mc^2",
    "\\sum_{i=1}^{n} x_i = X",
    "$$",
    "",
    "After",
  ].join("\n");

  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Before" }],
      },
      {
        type: "blockMath",
        attrs: { latex: "E = mc^2\n\\sum_{i=1}^{n} x_i = X" },
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "After" }],
      },
    ],
  };

  assert.deepEqual(parseMarkdown(markdown), doc);
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("parses and serializes mermaid diagrams", () => {
  const markdown = [
    "```mermaid",
    "graph TD",
    "  A-->B",
    "```",
  ].join("\n");

  const doc = {
    type: "doc",
    content: [
      {
        type: "mermaidDiagram",
        attrs: { code: "graph TD\n  A-->B" },
      },
    ],
  };

  assert.deepEqual(parseMarkdown(markdown), doc);
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("round trips persisted table column widths", () => {
  const document = {
    type: "doc",
    content: [{
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", attrs: { colwidth: [180] }, content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }] },
            { type: "tableHeader", attrs: { colwidth: [320] }, content: [{ type: "paragraph", content: [{ type: "text", text: "Description" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", attrs: { colwidth: [180] }, content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] },
            { type: "tableCell", attrs: { colwidth: [320] }, content: [{ type: "paragraph", content: [{ type: "text", text: "Text" }] }] },
          ],
        },
      ],
    }],
  };

  const markdown = serializeMarkdown(document);

  assert.equal(markdown, [
    "<!-- pme-table-widths: 180,320 -->",
    "| Name | Description |",
    "| ---- | ---- |",
    "| A | Text |",
    "",
  ].join("\n"));
  assert.deepEqual(parseMarkdown(markdown), document);
});

test("ignores invalid or mismatched table width metadata", () => {
  for (const metadata of ["180,nope", "180,320,140"]) {
    const document = parseMarkdown([
      `<!-- pme-table-widths: ${metadata} -->`,
      "| Name | Description |",
      "| ---- | ---- |",
      "| A | Text |",
    ].join("\n"));

    assert.equal(document.content.length, 1);
    assert.equal(document.content[0].type, "table");
    assert.equal(document.content[0].content[0].content[0].attrs, undefined);
  }
});

test("round trips visual paragraph indentation", () => {
  const document = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { indent: 2 },
        content: [{ type: "text", text: "Indented text" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Regular text" }],
      },
    ],
  };

  const markdown = serializeMarkdown(document);

  assert.equal(markdown, "<!-- pme-indent: 2 -->\nIndented text\n\nRegular text\n");
  assert.deepEqual(parseMarkdown(markdown), document);
});

test("parses and serializes nested bullet and ordered lists", () => {
  const markdown = [
    "- Parent",
    "  - Child",
    "",
    "1. First",
    "  1. Nested",
    "2. Second",
  ].join("\n");

  const document = parseMarkdown(markdown);

  assert.equal(document.content[0].type, "bulletList");
  assert.equal(document.content[0].content[0].content[1].type, "bulletList");
  assert.equal(document.content[1].type, "orderedList");
  assert.equal(document.content[1].content[0].content[1].type, "orderedList");
  assert.equal(serializeMarkdown(document), `${markdown}\n`);
});

test("round trips whole-list indentation", () => {
  const document = {
    type: "doc",
    content: [{
      type: "bulletList",
      attrs: { indent: 2 },
      content: [{
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Only item" }] }],
      }],
    }],
  };

  const markdown = serializeMarkdown(document);

  assert.equal(markdown, "<!-- pme-list-indent: 2 -->\n- Only item\n");
  assert.deepEqual(parseMarkdown(markdown), document);
});

test("parses and serializes Mermaid display scale", () => {
  const markdown = [
    "<!-- pme-mermaid-scale: 130 -->",
    "```mermaid",
    "graph TD",
    "  A-->B",
    "```",
  ].join("\n");

  const doc = parseMarkdown(markdown);

  assert.equal(doc.content[0].type, "mermaidDiagram");
  assert.equal(doc.content[0].attrs.scale, 130);
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("parses and serializes inline SVG blocks", () => {
  const markdown = [
    '<svg viewBox="0 0 100 60" width="100%" role="img" xmlns="">',
    "  <title>Demo</title>",
    '  <rect x="10" y="10" width="80" height="40" fill="#fff"/>',
    "</svg>",
  ].join("\n");

  const doc = parseMarkdown(markdown);

  assert.equal(doc.content[0].type, "svgDiagram");
  assert.equal(doc.content[0].attrs.code, markdown);
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("parses and serializes SVG display scale", () => {
  const markdown = [
    '<div data-type="svg-diagram" data-pme-scale="75">',
    '<svg viewBox="0 0 100 60" width="100%">',
    '  <rect x="10" y="10" width="80" height="40" fill="#fff"/>',
    "</svg>",
    "</div>",
  ].join("\n");

  const doc = parseMarkdown(markdown);

  assert.equal(doc.content[0].type, "svgDiagram");
  assert.equal(doc.content[0].attrs.scale, 75);
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("parses and serializes mindmap diagrams", () => {
  const markdown = [
    "```mindmap",
    "{",
    '  "nodeData": {',
    '    "id": "root",',
    '    "topic": "Plan",',
    '    "children": []',
    "  }",
    "}",
    "```",
  ].join("\n");

  const doc = parseMarkdown(markdown);

  assert.equal(doc.content[0].type, "mindMap");
  assert.equal(doc.content[0].attrs.data.nodeData.topic, "Plan");
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("preserves invalid mindmap JSON during markdown round trip", () => {
  const markdown = "```mindmap\n{not-json\n```";
  const doc = parseMarkdown(markdown);

  assert.equal(doc.content[0].type, "mindMap");
  assert.equal(doc.content[0].attrs.raw, "{not-json");
  assert.equal(serializeMarkdown(doc), `${markdown}\n`);
});

test("parses single-line double-dollar math as block math", () => {
  assert.deepEqual(parseMarkdown("$$E=mc^2$$"), {
    type: "doc",
    content: [
      {
        type: "blockMath",
        attrs: { latex: "E=mc^2" },
      },
    ],
  });
});

test("round trips inline math nodes", () => {
  const markdown = "Area is $a^2$.";

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Area is " },
          { type: "inlineMath", attrs: { latex: "a^2" } },
          { type: "text", text: "." },
        ],
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("parses and serializes footnotes", () => {
  const markdown = [
    "This needs a note[^1].",
    "",
    "[^1]: Footnote content.",
  ].join("\n");

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "This needs a note" },
          { type: "footnote", attrs: { id: "1", text: "Footnote content." } },
          { type: "text", text: "." },
        ],
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("serializes image asset paths instead of preview object urls", () => {
  assert.equal(serializeMarkdown({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          alt: "Dragged",
          src: "blob:http://localhost/image-preview",
          assetSrc: "assets/asset_20260707_080910_a83f9.png",
        },
      },
    ],
  }), "![Dragged](assets/asset_20260707_080910_a83f9.png)\n\n");
});

test("round trips sized images as html image tags", () => {
  const markdown = '<img src="assets/a.png" alt="A" width="320" />';

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          src: "assets/a.png",
          alt: "A",
          width: 320,
        },
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n\n`);
});

test("round trips image scale metadata while exporting pixel width", () => {
  const markdown = '<img src="assets/a.png" alt="A" width="160" data-pme-scale="50" data-pme-original-width="320" />';

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          src: "assets/a.png",
          alt: "A",
          width: 160,
          scale: 50,
          originalWidth: 320,
        },
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n\n`);
});

test("round trips video scale metadata for editor and export sizing", () => {
  const markdown = '<video src="assets/movie.mp4" width="640" data-pme-scale="50" data-pme-original-width="1280" controls />';

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "video",
        attrs: {
          src: "assets/movie.mp4",
          assetSrc: null,
          controls: true,
          width: 640,
          scale: 50,
          originalWidth: 1280,
        },
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("serializes asset image paths relative to the markdown file", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          alt: "Dragged",
          src: "blob:http://localhost/image-preview",
          assetSrc: "assets/asset_20260707_080910_a83f9.png",
        },
      },
    ],
  };

  assert.equal(
    serializeMarkdown(doc, { basePath: "docs/test.md" }),
    "![Dragged](../assets/asset_20260707_080910_a83f9.png)\n\n",
  );
  assert.equal(
    serializeMarkdown(doc, { basePath: "README.md" }),
    "![Dragged](assets/asset_20260707_080910_a83f9.png)\n\n",
  );
});

test("adds a trailing blank line when the document ends with images", () => {
  assert.equal(serializeMarkdown({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { alt: "A", assetSrc: "assets/a.png" },
      },
      {
        type: "image",
        attrs: { alt: "B", assetSrc: "assets/b.png" },
      },
    ],
  }, { basePath: "docs/test.md" }), [
    "![A](../assets/a.png)",
    "",
    "![B](../assets/b.png)",
    "",
    "",
  ].join("\n"));
});

test("hydrates markdown image nodes with preview urls while preserving asset paths", () => {
  assert.deepEqual(hydrateImagePreviews({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { alt: "A", src: "assets/a.png" },
      },
    ],
  }, {
    "assets/a.png": "blob:http://localhost/a",
  }), {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          alt: "A",
          src: "blob:http://localhost/a",
          assetSrc: "assets/a.png",
        },
      },
    ],
  });
});

test("hydrates relative markdown image paths against the markdown file", () => {
  assert.deepEqual(hydrateImagePreviews({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { alt: "A", src: "../assets/a.png" },
      },
    ],
  }, {
    "assets/a.png": "blob:http://localhost/a",
  }, {
    basePath: "docs/test.md",
  }), {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          alt: "A",
          src: "blob:http://localhost/a",
          assetSrc: "assets/a.png",
        },
      },
    ],
  });
});


test("round trips inline marks for toolbar formatting", () => {
  const markdown = "This is **bold**, *italic*, ~~strike~~, and `code`.";

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "This is " },
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "text", text: ", " },
          { type: "text", text: "italic", marks: [{ type: "italic" }] },
          { type: "text", text: ", " },
          { type: "text", text: "strike", marks: [{ type: "strike" }] },
          { type: "text", text: ", and " },
          { type: "text", text: "code", marks: [{ type: "code" }] },
          { type: "text", text: "." },
        ],
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("round trips inline code language marks", () => {
  const markdown = 'Use <code class="language-javascript">const value = 1</code> here.';

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Use " },
          {
            type: "text",
            text: "const value = 1",
            marks: [{ type: "code", attrs: { language: "javascript" } }],
          },
          { type: "text", text: " here." },
        ],
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("round trips inline links", () => {
  const markdown = "Open [PME](https://example.com/pme) now.";

  assert.deepEqual(parseMarkdown(markdown), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Open " },
          {
            type: "text",
            text: "PME",
            marks: [{ type: "link", attrs: { href: "https://example.com/pme" } }],
          },
          { type: "text", text: " now." },
        ],
      },
    ],
  });
  assert.equal(serializeMarkdown(parseMarkdown(markdown)), `${markdown}\n`);
});

test("round trips PME generated markdown for supported nodes", () => {
  const markdown = [
    "# PME",
    "",
    "Start writing.",
    "",
    "- Workspace",
    "- Markdown",
    "",
    "> Keep files portable",
    "",
  ].join("\n");

  assert.equal(serializeMarkdown(parseMarkdown(markdown)), markdown);
});
