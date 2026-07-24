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

