# Split Editor Popovers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move link, text color, highlight, and emoji popovers out of `src/app.mjs`.

**Architecture:** A UI module owns popover DOM creation and lifecycle. The link modal resolves a value; command-based pickers receive the current TipTap editor explicitly, removing hidden access to application globals.

**Tech Stack:** JavaScript ES modules, TipTap 3, browser DOM, Node test runner, Vite 8.

## Global Constraints

- Preserve modal markup, labels, colors, emojis, focus, and keyboard behavior.
- Preserve editor selection restoration for colors and highlights.
- Add no new application state or dependency.
- Require all tests and production build to pass.

---

### Task 1: Define popover ownership

**Files:**
- Create: `tests/editor-popovers.test.mjs`
- Create: `src/ui/editor-popovers.mjs`

**Interfaces:**
- Produces: `openLinkModal(value)`, `openTextColorPicker(editor)`, `openHighlightColorPicker(editor)`, `openEmojiPicker(editor)`.

- [ ] Add source ownership and explicit editor parameter assertions.
- [ ] Verify failure because the module is absent.

### Task 2: Move the UI implementations

**Files:**
- Create: `src/ui/editor-popovers.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Consumes: `escapeHtml`, browser DOM, and an optional TipTap editor.
- Produces: unchanged modal interaction results and editor commands.

- [ ] Move all four functions and export them.
- [ ] Pass `editor` explicitly at the three picker call sites.
- [ ] Remove duplicate functions from `app.mjs`.
- [ ] Run design, menu, dialog, and popover tests.

### Task 3: Verify

**Files:**
- Modify: imports only if orphaned.

**Interfaces:**
- Produces: no popover implementations remaining in `app.mjs`.

- [ ] Run syntax checks.
- [ ] Run `npm test` with zero failures.
- [ ] Run `npm run build` with exit code 0.
- [ ] Record the new `app.mjs` line count.
