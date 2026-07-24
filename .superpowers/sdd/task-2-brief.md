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

