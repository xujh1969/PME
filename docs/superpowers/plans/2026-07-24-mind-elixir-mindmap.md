# Mind Elixir Mindmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mind Elixir powered interactive mind map blocks to PME, with Markdown persistence and static PDF/HTML export.

**Architecture:** Implement mind maps as a TipTap atom node parallel to the existing Mermaid node. Store data in fenced `mindmap` Markdown code blocks, render interactively in the editor with Mind Elixir, and replace interactive DOM with static images for PDF/HTML export using the same width/height fit logic as Mermaid.

**Tech Stack:** TipTap custom node, Mind Elixir, Vite, Markdown fenced code parsing, DOM-to-static export helpers, Node test runner.

## Global Constraints

- Markdown storage format is fenced code block language `mindmap`.
- HTML export must be static image only, with no Mind Elixir runtime script.
- PDF and HTML exported mind maps must be centered, borderless, and only shrink, not enlarge.
- PDF export must constrain mind map static images by maximum width and maximum height, like Mermaid export.
- First version does not implement XMind import/export, interactive HTML export, full-screen editor, or automatic heading/list-to-mindmap conversion.

---

## File Structure

- `package.json` / `package-lock.json`: add `mind-elixir`.
- `src/core/mindmap-data.mjs`: pure helpers for default data, normalization, stable serialization, static image dimension calculation, and fallback SVG generation.
- `src/editor/mindmap-node.mjs`: TipTap `mindMap` atom node and Mind Elixir NodeView.
- `src/core/markdown.mjs`: parse and serialize fenced `mindmap` blocks.
- `src/editor/editor-command-runner.mjs`: run the new insert command.
- `src/editor/editor-extensions.mjs`: include mind maps where atom block behavior applies.
- `src/app.mjs`: import/register node, add menu/toolbar entry, handle selection/double-click behavior only where needed.
- `src/export/export-runtime.mjs`: prepare `.mindmap-diagram` blocks for print/static export.
- `src/core/pdf-export.mjs`: exported static mind map CSS.
- `src/core/html-package.mjs`: exported static mind map CSS.
- `src/styles/editor.css`: editor canvas styling.
- `tests/mindmap-data.test.mjs`: pure data helper tests.
- `tests/markdown.test.mjs`: parse/serialize tests.
- `tests/mindmap-node.test.mjs`: structural node tests.
- `tests/export-runtime.test.mjs`: export sizing/static-style tests.
- Existing command/design tests: update string assertions for the new entry where applicable.

---

### Task 1: Dependency and Mind Map Data Helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/core/mindmap-data.mjs`
- Create: `tests/mindmap-data.test.mjs`

**Interfaces:**
- Produces: `createDefaultMindMapData(): object`
- Produces: `normalizeMindMapData(value: unknown): { data: object | null, raw: string, error: string }`
- Produces: `serializeMindMapData(data: object | string): string`
- Produces: `getStaticMindMapDimensions(size: { width: number, height: number }, maxWidth: number, maxHeight?: number): { sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number }`
- Produces: `buildMindMapFallbackSvg(data: object | string): string`

- [ ] **Step 1: Install dependency**

Run:

```powershell
npm install mind-elixir
```

Expected: `package.json` and `package-lock.json` include `mind-elixir`.

- [ ] **Step 2: Write failing data helper tests**

Create `tests/mindmap-data.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMindMapFallbackSvg,
  createDefaultMindMapData,
  getStaticMindMapDimensions,
  normalizeMindMapData,
  serializeMindMapData,
} from "../src/core/mindmap-data.mjs";

test("creates default Mind Elixir data with a root and children", () => {
  const data = createDefaultMindMapData();

  assert.equal(data.nodeData.id, "root");
  assert.equal(data.nodeData.topic, "中心主题");
  assert.equal(data.nodeData.children.length, 2);
});

test("normalizes valid mindmap JSON", () => {
  const result = normalizeMindMapData('{"nodeData":{"id":"root","topic":"A","children":[]}}');

  assert.equal(result.error, "");
  assert.equal(result.raw, "");
  assert.equal(result.data.nodeData.topic, "A");
});

test("preserves invalid mindmap JSON as raw text", () => {
  const result = normalizeMindMapData("{not-json");

  assert.equal(result.data, null);
  assert.equal(result.raw, "{not-json");
  assert.match(result.error, /Invalid mind map JSON/);
});

test("serializes mindmap data with stable indentation", () => {
  const markdown = serializeMindMapData({ nodeData: { id: "root", topic: "A", children: [] } });

  assert.equal(markdown, '{\n  "nodeData": {\n    "id": "root",\n    "topic": "A",\n    "children": []\n  }\n}');
});

test("constrains static mindmap dimensions by width and height", () => {
  assert.deepEqual(getStaticMindMapDimensions({ width: 600, height: 2400 }, 600, 760), {
    sourceWidth: 600,
    sourceHeight: 2400,
    targetWidth: 190,
    targetHeight: 760,
  });
});

test("builds a fallback SVG containing the root topic", () => {
  const svg = buildMindMapFallbackSvg({ nodeData: { id: "root", topic: "Root", children: [] } });

  assert.equal(svg.includes("<svg"), true);
  assert.equal(svg.includes("Root"), true);
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```powershell
npm test -- tests/mindmap-data.test.mjs
```

Expected: FAIL because `src/core/mindmap-data.mjs` does not exist.

- [ ] **Step 4: Implement data helpers**

Create `src/core/mindmap-data.mjs` with:

```js
export function createDefaultMindMapData() {
  return {
    nodeData: {
      id: "root",
      topic: "中心主题",
      children: [
        { id: "topic-1", topic: "主题 1", children: [] },
        { id: "topic-2", topic: "主题 2", children: [] },
      ],
    },
  };
}

export function normalizeMindMapData(value) {
  if (typeof value === "object" && value !== null) {
    return { data: ensureMindMapShape(value), raw: "", error: "" };
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return { data: createDefaultMindMapData(), raw: "", error: "" };
  }

  try {
    return { data: ensureMindMapShape(JSON.parse(raw)), raw: "", error: "" };
  } catch {
    return { data: null, raw, error: "Invalid mind map JSON" };
  }
}

export function serializeMindMapData(data) {
  if (typeof data === "string") {
    return data.trim();
  }
  return JSON.stringify(ensureMindMapShape(data), null, 2);
}

export function getStaticMindMapDimensions(size, maxWidth, maxHeight = Number.POSITIVE_INFINITY) {
  const sourceWidth = positiveNumber(size?.width) || 800;
  const sourceHeight = positiveNumber(size?.height) || 480;
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    sourceWidth,
    sourceHeight,
    targetWidth: Math.round(sourceWidth * scale),
    targetHeight: Math.round(sourceHeight * scale),
  };
}

export function buildMindMapFallbackSvg(data) {
  const normalized = normalizeMindMapData(data);
  const topic = normalized.data?.nodeData?.topic || "思维导图";
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">',
    '<rect width="800" height="480" fill="#ffffff"/>',
    '<rect x="300" y="205" width="200" height="70" rx="10" fill="#f8f8f8" stroke="#d6d3d1"/>',
    `<text x="400" y="247" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="20" fill="#0c0a09">${escapeXml(topic)}</text>`,
    "</svg>",
  ].join("");
}

function ensureMindMapShape(value) {
  const nodeData = value?.nodeData || value;
  return {
    ...value,
    nodeData: ensureMindMapNode(nodeData, "root"),
  };
}

function ensureMindMapNode(node, fallbackId) {
  return {
    id: String(node?.id || fallbackId),
    topic: String(node?.topic || "中心主题"),
    children: Array.isArray(node?.children)
      ? node.children.map((child, index) => ensureMindMapNode(child, `${fallbackId}-${index + 1}`))
      : [],
  };
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
```

- [ ] **Step 5: Verify tests pass**

Run:

```powershell
npm test -- tests/mindmap-data.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add package.json package-lock.json src/core/mindmap-data.mjs tests/mindmap-data.test.mjs
git commit -m "feat: add mindmap data helpers"
```

Expected: commit succeeds.

---

### Task 2: Markdown Parse and Serialize Support

**Files:**
- Modify: `src/core/markdown.mjs`
- Modify: `tests/markdown.test.mjs`

**Interfaces:**
- Consumes: `serializeMindMapData(data)`
- Produces: Markdown parser maps fenced `mindmap` blocks to `{ type: "mindMap", attrs: { data, raw, error } }`
- Produces: serializer emits fenced `mindmap` blocks from `mindMap` nodes

- [ ] **Step 1: Add failing Markdown tests**

Append to `tests/markdown.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- tests/markdown.test.mjs
```

Expected: the new mindmap tests fail because `mindmap` currently parses as `codeBlock`.

- [ ] **Step 3: Implement Markdown support**

Modify `src/core/markdown.mjs`:

```js
import { normalizeMindMapData, serializeMindMapData } from "./mindmap-data.mjs";
```

In the fenced code block branch, after the Mermaid check, add:

```js
      if (language.toLowerCase() === "mindmap") {
        const normalized = normalizeMindMapData(codeLines.join("\n"));
        content.push({
          type: "mindMap",
          attrs: normalized,
        });
        index += 1;
        continue;
      }
```

In `serializeNode`, after the Mermaid branch, add:

```js
  if (node.type === "mindMap") {
    return [
      "```mindmap",
      node.attrs?.raw || serializeMindMapData(node.attrs?.data),
      "```",
    ].join("\n");
  }
```

- [ ] **Step 4: Verify Markdown tests**

Run:

```powershell
npm test -- tests/markdown.test.mjs
```

Expected: mindmap tests pass. Existing unrelated tests may still reflect current repo baseline; inspect output and ensure no new failure is caused by mindmap changes.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/core/markdown.mjs tests/markdown.test.mjs
git commit -m "feat: persist mindmaps in markdown"
```

Expected: commit succeeds.

---

### Task 3: TipTap MindMap Node and Editor Styling

**Files:**
- Create: `src/editor/mindmap-node.mjs`
- Modify: `src/styles/editor.css`
- Create: `tests/mindmap-node.test.mjs`

**Interfaces:**
- Consumes: `createDefaultMindMapData`, `normalizeMindMapData`, `serializeMindMapData`
- Produces: `export const MindMap`
- Produces commands: `insertMindMap({ data })`, `updateMindMap({ data, pos })`, `deleteMindMap({ pos })`

- [ ] **Step 1: Write failing structural test**

Create `tests/mindmap-node.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/editor/mindmap-node.mjs", import.meta.url), "utf8");

test("defines the MindMap TipTap node outside the app entry", () => {
  assert.equal(source.includes("export const MindMap"), true);
  assert.equal(source.includes('name: "mindMap"'), true);
  assert.equal(source.includes("insertMindMap"), true);
  assert.equal(source.includes("updateMindMap"), true);
  assert.equal(source.includes("deleteMindMap"), true);
  assert.equal(source.includes("MindElixir"), true);
});

test("renders mindmap export markers for PDF and HTML static conversion", () => {
  assert.equal(source.includes("mindmap-diagram"), true);
  assert.equal(source.includes("mindmap-diagram__viewport"), true);
  assert.equal(source.includes("mindmap-diagram__content"), true);
  assert.equal(source.includes("data-mindmap"), true);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm test -- tests/mindmap-node.test.mjs
```

Expected: FAIL because the node file does not exist.

- [ ] **Step 3: Implement the node**

Create `src/editor/mindmap-node.mjs`:

```js
import { Node } from "@tiptap/core";
import MindElixir from "mind-elixir";
import "mind-elixir/style";
import {
  createDefaultMindMapData,
  normalizeMindMapData,
  serializeMindMapData,
} from "../core/mindmap-data.mjs";
import { escapeHtml } from "../core/html-utils.mjs";

export const MindMap = Node.create({
  name: "mindMap",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      data: {
        default: createDefaultMindMapData(),
        parseHTML: (element) => normalizeMindMapData(element.getAttribute("data-mindmap") || "").data,
        renderHTML: (attributes) => ({ "data-mindmap": serializeMindMapData(attributes.data) }),
      },
      raw: {
        default: "",
      },
      error: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mindmap-diagram"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "mindmap-diagram" }];
  },

  addCommands() {
    return {
      insertMindMap: (options = {}) => ({ commands }) => (
        commands.insertContent({
          type: this.name,
          attrs: normalizeMindMapData(options.data || createDefaultMindMapData()),
        })
      ),
      updateMindMap: (options) => ({ tr }) => {
        tr.setNodeMarkup(options.pos, this.type, normalizeMindMapData(options.data));
        return true;
      },
      deleteMindMap: (options) => ({ tr, editor }) => {
        const node = editor.state.doc.nodeAt(options.pos);
        if (!node || node.type.name !== this.name) return false;
        tr.delete(options.pos, options.pos + node.nodeSize);
        return true;
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("div");
      const viewport = document.createElement("div");
      const content = document.createElement("div");
      wrapper.className = "mindmap-diagram";
      wrapper.dataset.type = "mindmap-diagram";
      viewport.className = "mindmap-diagram__viewport";
      content.className = "mindmap-diagram__content";
      wrapper.dataset.mindmap = node.attrs.raw || serializeMindMapData(node.attrs.data);
      viewport.appendChild(content);
      wrapper.appendChild(viewport);

      let mind = null;
      let updateTimer = 0;

      const syncData = () => {
        if (!mind || !editor.isEditable) return;
        window.clearTimeout(updateTimer);
        updateTimer = window.setTimeout(() => {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos !== "number") return;
          const data = mind.getData ? mind.getData() : null;
          if (!data) return;
          wrapper.dataset.mindmap = serializeMindMapData(data);
          editor.commands.updateMindMap({ pos, data });
        }, 250);
      };

      const render = (attrs) => {
        const normalized = normalizeMindMapData(attrs.raw || attrs.data);
        wrapper.dataset.mindmap = normalized.raw || serializeMindMapData(normalized.data);
        content.innerHTML = "";
        if (normalized.error) {
          content.innerHTML = `<div class="mindmap-diagram__error">${escapeHtml(normalized.error)}</div>`;
          return;
        }
        mind = new MindElixir({
          el: content,
          direction: MindElixir.RIGHT,
          draggable: true,
          contextMenu: true,
          toolBar: true,
          nodeMenu: true,
          keypress: true,
        });
        mind.init(normalized.data);
        content.addEventListener("input", syncData);
        content.addEventListener("pointerup", syncData);
        content.addEventListener("keyup", syncData);
      };

      render(node.attrs);

      return {
        dom: wrapper,
        stopEvent: (event) => Boolean(event.target.closest?.(".mindmap-diagram")),
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          render(updatedNode.attrs);
          return true;
        },
        destroy: () => {
          window.clearTimeout(updateTimer);
          content.innerHTML = "";
        },
      };
    };
  },
});
```

- [ ] **Step 4: Add editor styles**

Append near the Mermaid styles in `src/styles/editor.css`:

```css
.ProseMirror .mindmap-diagram {
  position: relative;
  width: calc(100% + 96px);
  margin: 18px -48px;
  user-select: none;
}

.ProseMirror .mindmap-diagram__viewport {
  min-height: 360px;
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  background: var(--color-surface-soft);
}

.ProseMirror .mindmap-diagram__content {
  width: 100%;
  height: 520px;
}

.ProseMirror .mindmap-diagram__error {
  padding: var(--space-md);
  color: var(--color-error);
  font-family: var(--font-mono);
}
```

- [ ] **Step 5: Verify structural test**

Run:

```powershell
npm test -- tests/mindmap-node.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/editor/mindmap-node.mjs src/styles/editor.css tests/mindmap-node.test.mjs
git commit -m "feat: add mindmap editor node"
```

Expected: commit succeeds.

---

### Task 4: Register Node and Add Insert Entry

**Files:**
- Modify: `src/app.mjs`
- Modify: `src/editor/editor-command-runner.mjs`
- Modify: `src/editor/editor-extensions.mjs`
- Modify: existing command/menu tests as needed

**Interfaces:**
- Consumes: `MindMap`
- Consumes: command `insertMindMap`
- Produces: menu/toolbar command id `mindmap`

- [ ] **Step 1: Add failing registration tests**

Add to `tests/editor-command-runner.test.mjs` or a new focused source assertion:

```js
test("runs the mindmap insert command", () => {
  const calls = [];
  const chain = {
    focus: () => chain,
    insertMindMap: () => {
      calls.push("mindmap");
      return chain;
    },
    run: () => calls.push("run"),
  };

  runEditorCommand("mindmap", { editor: { chain: () => chain } });

  assert.deepEqual(calls, ["mindmap", "run"]);
});
```

If the local test harness for `runEditorCommand` differs, adapt only the setup to match existing tests in that file.

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm test -- tests/editor-command-runner.test.mjs
```

Expected: FAIL because `mindmap` is not handled.

- [ ] **Step 3: Wire command runner**

In `src/editor/editor-command-runner.mjs`, add alongside the Mermaid command:

```js
  } else if (command === "mindmap") {
    chain.insertMindMap().run();
```

- [ ] **Step 4: Register extension**

In `src/app.mjs`, import:

```js
import { MindMap } from "./editor/mindmap-node.mjs";
```

In the editor extension options where `mermaidDiagram: MermaidDiagram` is registered, add:

```js
      mindMap: MindMap,
```

In `src/editor/editor-extensions.mjs`, include `"mindMap"` in atom block lists that currently include `"mermaidDiagram"`.

- [ ] **Step 5: Add UI entry**

In `src/app.mjs`, add toolbar/menu item next to Mermaid:

```js
${toolButton("mindmap", "Workflow", "思维导图")}
```

and insert menu item:

```js
menuItem("mindmap", "思维导图"),
```

Use the exact local helpers and surrounding syntax already present in `src/app.mjs`.

- [ ] **Step 6: Verify command and build**

Run:

```powershell
npm test -- tests/editor-command-runner.test.mjs
npm run build
```

Expected: command test and build pass.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/app.mjs src/editor/editor-command-runner.mjs src/editor/editor-extensions.mjs tests/editor-command-runner.test.mjs
git commit -m "feat: add mindmap insert entry"
```

Expected: commit succeeds.

---

### Task 5: Static PDF and HTML Export

**Files:**
- Modify: `src/export/export-runtime.mjs`
- Modify: `src/core/pdf-export.mjs`
- Modify: `src/core/html-package.mjs`
- Modify: `tests/export-runtime.test.mjs`

**Interfaces:**
- Consumes: `getStaticMindMapDimensions`, `buildMindMapFallbackSvg`
- Produces: `prepareMindMapsForPrint(root)` called by `getPrintableDocumentHtml`
- Produces: shared static exported `.mindmap-diagram` CSS in PDF and HTML templates

- [ ] **Step 1: Add failing export tests**

Append to `tests/export-runtime.test.mjs`:

```js
test("prepares mindmaps for static export before printable HTML is returned", () => {
  assert.equal(runtimeSource.includes("prepareMindMapsForPrint"), true);
  assert.equal(runtimeSource.includes('querySelectorAll(".mindmap-diagram")'), true);
  assert.equal(runtimeSource.includes("getStaticMindMapDimensions"), true);
});

test("exports static mindmaps with centered borderless styles", () => {
  for (const source of [pdfExportSource, htmlPackageSource]) {
    const viewportRule = source.match(/\.mindmap-diagram__viewport\s*\{[^}]+\}/)?.[0] || "";
    const contentRule = source.match(/\.mindmap-diagram__content\s*\{[^}]+\}/)?.[0] || "";
    const imageRule = source.match(/\.mindmap-diagram img\s*\{[^}]+\}/)?.[0] || "";

    assert.equal(viewportRule.includes("border: 0 !important;"), true);
    assert.equal(contentRule.includes("justify-content: center !important;"), true);
    assert.equal(imageRule.includes("margin: 0 auto !important;"), true);
    assert.equal(imageRule.includes("max-width: 100% !important;"), true);
  }
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm test -- tests/export-runtime.test.mjs
```

Expected: FAIL because mind map export logic and CSS do not exist.

- [ ] **Step 3: Implement static export preparation**

In `src/export/export-runtime.mjs`, import:

```js
import { buildMindMapFallbackSvg, getStaticMindMapDimensions } from "../core/mindmap-data.mjs";
```

Call after Mermaid preparation:

```js
  await prepareMindMapsForPrint(clone);
```

Add:

```js
async function prepareMindMapsForPrint(root) {
  const maps = root.querySelectorAll(".mindmap-diagram");
  maps.forEach((map) => {
    const content = map.querySelector(".mindmap-diagram__content");
    if (!content) return;

    const rect = content.getBoundingClientRect?.() || { width: 800, height: 480 };
    const dimensions = getStaticMindMapDimensions(
      { width: rect.width || 800, height: rect.height || 480 },
      600,
      760,
    );
    const data = map.dataset.mindmap || "";
    const svg = buildMindMapFallbackSvg(data);
    const encoded = encodeURIComponent(svg)
      .replaceAll("'", "%27")
      .replaceAll('"', "%22");
    const image = document.createElement("img");
    image.src = `data:image/svg+xml;charset=utf-8,${encoded}`;
    image.setAttribute("width", String(dimensions.targetWidth));
    image.setAttribute("height", String(dimensions.targetHeight));
    image.style.width = `${dimensions.targetWidth}px`;
    image.style.maxWidth = "100%";
    image.style.height = "auto";
    image.style.margin = "0 auto";
    image.style.display = "block";
    content.innerHTML = "";
    content.appendChild(image);
  });
}
```

This first implementation uses the fallback SVG to guarantee static export. A later refinement can call Mind Elixir's native export API.

- [ ] **Step 4: Add PDF and HTML static styles**

Add matching CSS blocks to both `src/core/pdf-export.mjs` and `src/core/html-package.mjs`:

```css
    .mindmap-diagram {
      width: 100%;
      margin: 16px 0;
      overflow: visible;
    }

    .mindmap-diagram__viewport {
      height: auto !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0;
      padding: 10px 0;
    }

    .mindmap-diagram__content {
      width: 100% !important;
      min-width: 0 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: flex-start !important;
    }

    .mindmap-diagram img {
      display: block !important;
      max-width: 100% !important;
      height: auto !important;
      margin: 0 auto !important;
    }
```

- [ ] **Step 5: Verify export tests**

Run:

```powershell
npm test -- tests/export-runtime.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/export/export-runtime.mjs src/core/pdf-export.mjs src/core/html-package.mjs tests/export-runtime.test.mjs
git commit -m "feat: export mindmaps as static images"
```

Expected: commit succeeds.

---

### Task 6: Verification and Polish

**Files:**
- Modify only files touched by earlier tasks if verification exposes small issues.

**Interfaces:**
- Consumes all earlier tasks.
- Produces final verified feature.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npm test -- tests/mindmap-data.test.mjs tests/mindmap-node.test.mjs tests/export-runtime.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run Markdown tests**

Run:

```powershell
npm test -- tests/markdown.test.mjs
```

Expected: mindmap-specific tests pass. If existing baseline tests fail, record them separately and do not change unrelated behavior.

- [ ] **Step 3: Build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual smoke test in app**

Run:

```powershell
npm run dev
```

Expected: Vite dev server starts. In the app/browser:

- Insert a思维导图 block.
- Edit the root text and add a child node.
- Save/source view shows a ` ```mindmap ` block.
- Reopen or reparse restores the diagram.
- Export PDF shows static centered image.
- Export HTML ZIP contains no Mind Elixir runtime and displays static image.

- [ ] **Step 5: Check git diff**

Run:

```powershell
git status --short
git diff --stat
```

Expected: only intended files have changes since the last task commit.

- [ ] **Step 6: Final commit if polish changes were needed**

If Step 4 required fixes:

```powershell
git add <changed-files>
git commit -m "fix: polish mindmap integration"
```

Expected: commit succeeds. If no changes were needed, skip this step.

---

## Self-Review

- Spec coverage: insertion, Markdown persistence, interactive editor rendering, static PDF/HTML export, sizing constraints, tests, and non-goals are covered.
- Completeness scan: no unfinished sections are present.
- Type consistency: the plan consistently uses `mindMap` for the TipTap node, `mindmap` for Markdown fence language and command id, and `.mindmap-diagram` for DOM/export selectors.
