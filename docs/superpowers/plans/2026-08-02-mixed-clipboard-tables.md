# Mixed Clipboard Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve surrounding text and multiple tables when mixed clipboard content contains HTML or regular multi-row TSV tables.

**Architecture:** Replace the single-table clipboard result with ordered `text` and `table` fragments. Keep recognition in `clipboard-table.mjs`; let `app.mjs` parse text fragments with the existing Markdown parser and insert table fragments as existing Tiptap table nodes.

**Tech Stack:** JavaScript ES modules, Tiptap document JSON, Node test runner, Vite.

## Global Constraints

- Do not modify CSS or any style file.
- Do not modify global Markdown parsing, table rendering, copy/cut, Tab shortcuts, or AI behavior.
- Preserve existing special paste targets and plain-text paste behavior.
- Recognize a TSV table only from at least two consecutive rows with the same Tab-delimited column count of at least two.

---

### Task 1: Ordered Mixed Clipboard Fragments

**Files:**
- Modify: `src/editor/clipboard-table.mjs`
- Modify: `src/app.mjs`
- Test: `tests/clipboard-table.test.mjs`

**Interfaces:**
- Consumes: clipboard `{ html, text }` and the existing `parseMarkdown(text)` function.
- Produces: `clipboardContentToFragments({ html, text })`, returning ordered `{ type: "text", text }` and `{ type: "table", rows }` fragments, plus `clipboardFragmentsToDocument(fragments, parseText)` returning Tiptap nodes.

- [x] **Step 1: Add failing mixed-content tests**

Add tests proving that `前文 + TSV + 后文` preserves all three parts, two TSV tables remain separate, single irregular Tab lines remain text, and HTML text plus multiple tables retains order without style attributes.

- [x] **Step 2: Verify the tests fail for the current single-table API**

Run: `node --test tests/clipboard-table.test.mjs`

Expected: failure because `clipboardContentToFragments` and `clipboardFragmentsToDocument` do not exist.

- [x] **Step 3: Implement line-run and HTML-order segmentation**

Implement a scanner that flushes ordinary lines into text fragments and groups only consecutive equal-width TSV rows into table fragments. Implement an HTML walker that flushes text at block boundaries, converts every valid table in order, excludes table text from surrounding text, and returns no HTML fragments when no valid HTML table exists.

- [x] **Step 4: Integrate ordered nodes into paste handling**

Replace the `clipboardTableToDocument` call in `handlePaste` with fragment conversion. Build text nodes through `parseMarkdown(fragment.text).content`, build tables through the existing table-node helper, and insert the resulting node array once.

- [x] **Step 5: Verify focused and regression behavior**

Run:

```powershell
node --test tests\clipboard-table.test.mjs
node --test --test-name-pattern "uses synchronous clipboardData|parses and serializes markdown tables|preserves markdown table alignment" tests\design-system.test.mjs tests\markdown.test.mjs
npm run build
git diff --check
```

Expected: focused tests and build pass; no style files appear in the diff.
