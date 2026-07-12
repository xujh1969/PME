# Split Editor Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move TipTap extension registration out of `src/app.mjs` while preserving editor behavior.

**Architecture:** Add a factory that owns third-party extension imports and configuration. `app.mjs` supplies project-specific extensions, the bubble menu element, and drag lifecycle callbacks, then continues to own editor state and update handlers.

**Tech Stack:** JavaScript ES modules, TipTap 3, Vite 8, Node test runner.

## Global Constraints

- Preserve the exact extension order and configuration.
- Preserve drag handle data transfer behavior and DOM attributes.
- Do not move application state into the setup module.
- Require all existing tests and the production build to pass.

---

### Task 1: Define the extension factory contract

**Files:**
- Create: `tests/editor-setup.test.mjs`
- Create: `src/editor/editor-extensions.mjs`

**Interfaces:**
- Produces: `createEditorExtensions({ customOrderedList, customListItem, delayedHeading, smartCodeBlockLowlight, lowlight, alignedTableHeader, alignedTableCell, footnote, tableOfContents, mermaidDiagram, assetImage, bubbleMenuElement, onBlockDragStart, onBlockDragEnd })`.

- [ ] Write a source ownership test and verify it fails because the module is absent.
- [ ] Implement the factory with the existing extension order and options.
- [ ] Verify the targeted test passes.

### Task 2: Integrate the factory

**Files:**
- Modify: `src/app.mjs`
- Modify: `tests/drag-handle.test.mjs`

**Interfaces:**
- Consumes: the extension factory from Task 1.
- Produces: the same TipTap editor configuration with callbacks supplied by `app.mjs`.

- [ ] Replace the inline extension array with one factory call.
- [ ] Remove third-party imports no longer used by `app.mjs`.
- [ ] Update drag source assertions to inspect the setup module.
- [ ] Run editor menu, drag, markdown, footnote, and TOC tests.

### Task 3: Verify

**Files:**
- Modify: no files beyond import cleanup.

**Interfaces:**
- Produces: no duplicate extension registration.

- [ ] Run syntax checks.
- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Record the new `app.mjs` line count.
