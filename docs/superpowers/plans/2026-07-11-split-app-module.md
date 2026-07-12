# Split App Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `src/app.mjs` by moving cohesive, reusable behavior into focused modules without changing editor behavior.

**Architecture:** Keep `app.mjs` as the composition root that owns application state and lifecycle. Extract stateless editor operations, generic DOM modals, and image input helpers behind explicit imports; leave state-heavy orchestration in the entry module.

**Tech Stack:** JavaScript ES modules, TipTap 3, Vite 8, Node test runner, Tauri 2.

## Global Constraints

- Preserve all current application behavior and UI copy.
- Add no runtime dependencies.
- Keep application state and lifecycle ownership in `src/app.mjs`.
- Run the complete test suite and production build after extraction.

---

### Task 1: Establish the refactor baseline

**Files:**
- Test: existing `tests/*.test.mjs`

**Interfaces:**
- Consumes: current application behavior and static source assertions.
- Produces: a known passing baseline before structural edits.

- [ ] **Step 1: Run `npm test` and record the pass count.**
- [ ] **Step 2: Run `npm run build` and confirm the current bundle builds.**

### Task 2: Extract paragraph selection operations

**Files:**
- Create: `src/editor/paragraph-actions.mjs`
- Modify: `src/app.mjs`
- Modify: source-structure tests that currently inspect `src/app.mjs`

**Interfaces:**
- Consumes: a TipTap editor and direction `"above" | "below"`.
- Produces: `insertParagraphAroundSelection(editor, direction)` and `getParagraphInsertPosition(selection, direction)`.

- [ ] **Step 1: Update the structural test to expect the operation in its own module.**
- [ ] **Step 2: Run the targeted test and verify it fails.**
- [ ] **Step 3: Move the two functions and ProseMirror selection imports unchanged.**
- [ ] **Step 4: Import the public operation from `app.mjs` and remove obsolete imports.**
- [ ] **Step 5: Run the targeted test and verify it passes.**

### Task 3: Extract generic modal views

**Files:**
- Create: `src/ui/modals.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/design-system.test.mjs`
- Modify: `tests/dialogs.test.mjs`

**Interfaces:**
- Consumes: modal labels, initial values, and simple options.
- Produces: Promise-based modal helpers for tables, image size, text input/editor, messages, confirmations, and save-changes decisions.

- [ ] **Step 1: Update structural tests to inspect `src/ui/modals.mjs`.**
- [ ] **Step 2: Run the targeted tests and verify they fail.**
- [ ] **Step 3: Move only generic modal DOM implementations and their direct utility imports.**
- [ ] **Step 4: Import those helpers from `app.mjs`; retain workflow-specific modals in `app.mjs`.**
- [ ] **Step 5: Run targeted dialog and design tests.**

### Task 4: Extract image input helpers

**Files:**
- Create: `src/editor/image-input.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/network-image.test.mjs`
- Modify: `tests/drag-handle.test.mjs`

**Interfaces:**
- Consumes: clipboard data, HTML entities, and image source URLs.
- Produces: `getClipboardHtmlImageUrl`, `decodeHtmlEntities`, and `getImageIntrinsicWidth` without application state.

- [ ] **Step 1: Add direct behavior tests for the pure clipboard decoder where DOM support permits, otherwise update source ownership assertions.**
- [ ] **Step 2: Move stateless helpers and keep editor/state orchestration in `app.mjs`.**
- [ ] **Step 3: Run targeted image and drag tests.**

### Task 5: Full verification and boundary review

**Files:**
- Modify: only imports or tests required by extracted ownership.

**Interfaces:**
- Consumes: all extracted modules.
- Produces: a smaller composition root with no circular imports.

- [ ] **Step 1: Search for duplicate or orphaned function definitions and imports.**
- [ ] **Step 2: Run `npm test`; require zero failures.**
- [ ] **Step 3: Run `npm run build`; require exit code 0.**
- [ ] **Step 4: Compare `src/app.mjs` line count and report the resulting module map.**
