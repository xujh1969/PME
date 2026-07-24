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

