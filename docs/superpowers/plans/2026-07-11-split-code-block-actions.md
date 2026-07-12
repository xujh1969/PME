# Split Code Block Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move stateless code-block keyboard behavior and the custom lowlight extension out of `src/app.mjs`.

**Architecture:** `src/editor/code-block-actions.mjs` owns Enter indentation, Tab, Shift-Tab, selected-line transforms, and the custom `CodeBlockLowlight` extension. Language dialogs and DOM event orchestration remain in `app.mjs` because they depend on application editor state.

**Tech Stack:** JavaScript ES modules, TipTap 3, lowlight, Node test runner, Vite 8.

## Global Constraints

- Preserve language-aware indentation behavior.
- Preserve code block HTML language classes and default plaintext behavior.
- Preserve menu and double-click language editing behavior.
- Require all tests and production build to pass.

---

### Task 1: Establish module ownership

**Files:**
- Create: `tests/code-block-actions.test.mjs`
- Create: `src/editor/code-block-actions.mjs`

**Interfaces:**
- Produces: `SmartCodeBlockLowlight`, `handleCodeBlockEnter`, `handleCodeBlockIndent`, and `handleCodeBlockOutdent`.

- [ ] Add source ownership assertions.
- [ ] Verify failure because the module is absent.

### Task 2: Move keyboard behavior

**Files:**
- Create: `src/editor/code-block-actions.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Consumes: TipTap editor command APIs and existing code-indent helpers.
- Produces: the same keyboard shortcut behavior consumed by the extension factory.

- [ ] Move the custom extension and keyboard helper functions.
- [ ] Import `SmartCodeBlockLowlight` in `app.mjs` and remove obsolete imports.
- [ ] Run code indentation and editor setup tests.

### Task 3: Verify

**Files:**
- Modify: imports only if made obsolete.

**Interfaces:**
- Produces: no code-block keyboard implementation remaining in `app.mjs`.

- [ ] Run syntax checks.
- [ ] Run `npm test` with zero failures.
- [ ] Run `npm run build` with exit code 0.
- [ ] Record the new `app.mjs` line count.
