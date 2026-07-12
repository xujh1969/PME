# Split App Round Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continue shrinking `src/app.mjs` by extracting the image insertion UI and stateless image input utilities without changing editor behavior.

**Architecture:** Keep editor and workspace state in `app.mjs`. Move the image picker DOM lifecycle to `src/ui/image-insert-modal.mjs` and pure clipboard/image probing functions to `src/editor/image-input.mjs`; callers receive the same values as before.

**Tech Stack:** JavaScript ES modules, TipTap 3, Vite 8, Node test runner, Tauri 2.

## Global Constraints

- Preserve image paths, scale metadata, paste behavior, and Tauri file picking.
- Add no dependencies and introduce no application-state singleton.
- Require all 148 existing tests and the production build to pass.

---

### Task 1: Move image input utilities

**Files:**
- Create: `src/editor/image-input.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/network-image.test.mjs`

**Interfaces:**
- Produces: `getClipboardHtmlImageUrl(clipboardData)`, `decodeHtmlEntities(value)`, and `getImageIntrinsicWidth(src)`.

- [ ] Update source-ownership assertions and verify they fail before the module exists.
- [ ] Move the functions unchanged and import them from `app.mjs`.
- [ ] Run `node --test tests/network-image.test.mjs tests/clipboard-image.test.mjs`.

### Task 2: Move image insertion modal

**Files:**
- Create: `src/ui/image-insert-modal.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/design-system.test.mjs`

**Interfaces:**
- Produces: `openImageInsertModal()` resolving the existing files, URL, Tauri asset, or assets result shape.

- [ ] Update the design test to inspect the image modal module and verify failure.
- [ ] Move the modal DOM lifecycle and direct utility imports.
- [ ] Import the modal in `app.mjs` while retaining insertion orchestration there.
- [ ] Run targeted design, network image, drag, and asset tests.

### Task 3: Verify application boundaries

**Files:**
- Modify: imports affected by moved ownership only.

**Interfaces:**
- Produces: no duplicate definitions and a smaller `app.mjs` composition root.

- [ ] Search for duplicate definitions and obsolete imports.
- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Record the new `app.mjs` line count.
