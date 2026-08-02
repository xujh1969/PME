# Table Paste, Tab, and AI Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve external table structure on paste, keep Tab useful inside the editor, and make built-in AI actions return only usable final content.

**Architecture:** Put clipboard-table recognition and Tab editing rules in small editor modules with pure helpers. Keep `app.mjs` as the event integration layer and route built-in AI actions through the existing prompt builders instead of the verbose configurable prompt records.

**Tech Stack:** JavaScript ES modules, Tiptap/ProseMirror, Node test runner, Vite.

## Global Constraints

- Do not modify CSS or visual styling.
- Preserve existing table-cell Tab navigation and clipboard copy/cut fixes.
- Convert only HTML tables or regular multi-row TSV; leave ambiguous text unchanged.
- Apply final-output-only instructions to built-in AI actions, not user-defined custom actions.

---

### Task 1: Clipboard Table Recognition

**Files:**
- Create: `src/editor/clipboard-table.mjs`
- Create: `tests/clipboard-table.test.mjs`
- Modify: `src/app.mjs`

- [ ] Write tests for HTML-table priority, regular multi-row TSV conversion, escaping, and ambiguous-text rejection.
- [ ] Run `node --test tests/clipboard-table.test.mjs` and confirm failure because the module is absent.
- [ ] Implement `clipboardTableToMarkdown` and call it from `handlePaste` before ordinary Markdown parsing.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Contextual Tab Behavior

**Files:**
- Create: `src/editor/editor-tab.mjs`
- Create: `tests/editor-tab.test.mjs`
- Modify: `src/editor/editor-extensions.mjs`
- Modify: `src/app.mjs`

- [ ] Write tests for source-text indentation and static integration assertions for paragraph, list, code-block, and table behavior.
- [ ] Run `node --test tests/editor-tab.test.mjs` and confirm failure.
- [ ] Add contextual Tiptap shortcuts, enable code-block indentation, and handle Tab in source mode.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Built-in AI Final Output

**Files:**
- Modify: `src/core/config.mjs`
- Modify: `src/ui/ai-modal.mjs`
- Modify: `tests/ai-service.test.mjs`

- [ ] Write assertions that built-in actions use prompt builders, append a final-output-only constraint, and expose “转为表格”.
- [ ] Run the focused AI test and confirm failure.
- [ ] Reduce default action records to metadata and correct built-in/custom prompt dispatch order.
- [ ] Re-run the focused AI test and confirm it passes.

### Task 4: Verification

**Files:**
- Verify all modified files.

- [ ] Run focused tests for clipboard tables, Tab behavior, AI prompts, and prior clipboard fixes.
- [ ] Run `npm test`, recording any unrelated pre-existing failures separately.
- [ ] Run `npm run build`.
- [ ] Review `git diff --check`, `git diff --stat`, and the final diff for scope and style isolation.
