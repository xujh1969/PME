# Resizable Table Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make table column dividers mouse-draggable, persist pixel widths in Markdown, and fit those widths safely in HTML, PDF, and Word exports.

**Architecture:** Keep TipTap's enabled column-resizing plugin as the interaction engine and expose its handle with editor-scoped CSS. Store logical column widths in an optional `pme-table-widths` comment, hydrate them into cell `colwidth` attributes, and derive export-only fitted widths without mutating the document.

**Tech Stack:** TipTap 3 table extension, ProseMirror table `colwidth`, ESM, Node test runner, docx, Vite.

## Global Constraints

- Standard Markdown table syntax remains unchanged.
- Width metadata uses positive integer pixels and is omitted for automatic-layout tables.
- Invalid or mismatched metadata falls back to automatic layout.
- Editor and HTML may scroll horizontally; PDF and Word must fit printable width.
- Export fitting must never overwrite source document widths.
- All resize styles must be scoped to editor tables.

---

### Task 1: Markdown Width Persistence

**Files:**
- Modify: `src/core/markdown.mjs`
- Test: `tests/markdown.test.mjs`

**Interfaces:**
- Consumes: TipTap table cell `attrs.colwidth: number[] | null`.
- Produces: `<!-- pme-table-widths: 180,320,140 -->` and matching parsed cell attributes.

- [ ] Add failing tests for valid width round trips, invalid metadata, mismatched column counts, and tables without metadata.
- [ ] Run `node --test tests/markdown.test.mjs`; expect the new width round-trip test to fail because `serializeTable` omits widths.
- [ ] Parse a width comment only when the next block is a table and the width count matches logical columns; apply each width to all cells in that logical column.
- [ ] Serialize widths from the first row only when every logical column has one positive finite width.
- [ ] Run `node --test tests/markdown.test.mjs`; expect all tests to pass.

### Task 2: Mouse Resize Interaction

**Files:**
- Modify: `src/editor/editor-extensions.mjs`
- Modify: `src/styles/editor.css`
- Test: `tests/editor-tab.test.mjs`
- Test: `tests/design-system.test.mjs`

**Interfaces:**
- Consumes: TipTap `Table.configure({ resizable: true })` and generated `.column-resize-handle` elements.
- Produces: an editor-scoped divider hit target and visible resize cursor.

- [ ] Add failing assertions for `resizable: true`, an explicit cell minimum width, `.ProseMirror .column-resize-handle`, and `.ProseMirror.resize-cursor`.
- [ ] Run the focused tests; expect missing resize-handle CSS assertions to fail.
- [ ] Configure a stable `cellMinWidth` and add a narrow absolute handle centered on the right cell boundary with `col-resize` cursor and no layout width.
- [ ] Ensure table width follows TipTap's generated `<colgroup>` while `.tableWrapper` remains the only horizontal overflow boundary.
- [ ] Run focused editor and design tests; expect all to pass.

### Task 3: Static Export Width Fitting

**Files:**
- Modify: `src/export/export-runtime.mjs`
- Modify: `src/core/pdf-export.mjs`
- Modify: `src/core/html-package.mjs`
- Test: `tests/export-runtime.test.mjs`
- Test: `tests/pdf-export.test.mjs`
- Test: `tests/html-package.test.mjs`

**Interfaces:**
- Produces: `fitPrintableTableWidths(root, availableWidth)` for export clones.
- Consumes: rendered table `<colgroup><col style="width: Npx">` values.

- [ ] Add failing tests showing HTML retains fixed widths and overflow, while printable tables receive proportional widths totaling at most 100%.
- [ ] Run focused export tests; expect width fitting assertions to fail.
- [ ] In the export clone, read positive column pixel widths, convert them to percentages, and apply those percentages to `<col>` elements without changing editor DOM.
- [ ] Make PDF table CSS use the fitted colgroup, `width: 100%`, fixed layout, wrapping text, and hidden overflow rather than interactive scrolling.
- [ ] Keep HTML package wrappers horizontally scrollable and preserve pixel colgroup widths.
- [ ] Run focused export tests; expect all to pass.

### Task 4: Word Proportional Column Widths

**Files:**
- Modify: `src/core/word-export.mjs`
- Test: `tests/word-export.test.mjs`

**Interfaces:**
- Consumes: table cell `attrs.colwidth` values.
- Produces: docx table cells with percentage widths preserving relative proportions.

- [ ] Add a failing test that builds a table with widths `200,400,200` and inspects the DOCX XML for `25%,50%,25%`-equivalent cell widths.
- [ ] Run `node --test tests/word-export.test.mjs`; expect the width assertion to fail.
- [ ] Derive logical widths from the first row, normalize them to the Word table's usable 100% width, and set each `TableCell` width; leave tables without complete widths unchanged.
- [ ] Run the Word export tests; expect all to pass.

### Task 5: Final Verification

**Files:**
- Verify only; no production changes unless a regression is found.

- [ ] Run focused Markdown, editor, HTML, PDF, and Word tests.
- [ ] Run `npm test`; expect zero failures.
- [ ] Run `npm run build`; expect Vite production build success.
- [ ] Run `git diff --check`; expect no whitespace errors.
- [ ] Inspect the final diff to confirm no unrelated style selectors or files changed.
