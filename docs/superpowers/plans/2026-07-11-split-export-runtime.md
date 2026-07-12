# Split Export Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move environment-specific export helpers and PDF options UI out of `src/app.mjs`.

**Architecture:** `src/export/export-runtime.mjs` owns local binary reads, browser downloads/printing, printable DOM cloning, image inlining, frame timing, and blob conversion. The PDF options modal moves to `src/ui/pdf-export-modal.mjs`; document-state orchestration remains in `app.mjs`.

**Tech Stack:** JavaScript ES modules, browser DOM, Tauri 2, Vite 8, Node test runner.

## Global Constraints

- Preserve PDF print timing, iframe cleanup, and error messaging.
- Preserve local image MIME types and binary conversion.
- Preserve Mermaid control removal and selected-node cleanup in printable HTML.
- Require all tests and production build to pass.

---

### Task 1: Establish export runtime ownership

**Files:**
- Create: `tests/export-runtime.test.mjs`
- Create: `src/export/export-runtime.mjs`
- Create: `src/ui/pdf-export-modal.mjs`

**Interfaces:**
- Produces: `loadLocalImageResource`, `downloadBlob`, `printPdfHtml`, `waitForNextFrame`, `waitForMilliseconds`, `getPrintableDocumentHtml`, and `blobToDataUrl`.
- Produces: `openPdfExportOptionsModal`.

- [ ] Add source ownership assertions.
- [ ] Verify failure because the modules are absent.

### Task 2: Move runtime helpers and modal

**Files:**
- Create: `src/export/export-runtime.mjs`
- Create: `src/ui/pdf-export-modal.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/network-image.test.mjs`

**Interfaces:**
- Consumes: an `onPrintError` callback for browser print failures.
- Produces: unchanged values and side effects for current callers.

- [ ] Move helpers and add explicit print error callback.
- [ ] Move the PDF options modal unchanged.
- [ ] Import functions in `app.mjs` and remove duplicates.
- [ ] Update local loader ownership assertion.

### Task 3: Verify

**Files:**
- Modify: obsolete imports only.

**Interfaces:**
- Produces: no runtime helper definitions remaining in `app.mjs`.

- [ ] Run syntax and targeted export tests.
- [ ] Run `npm test` with zero failures.
- [ ] Run `npm run build` with exit code 0.
- [ ] Record the new `app.mjs` line count.
