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

