# Split Editor Command Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the long editor command dispatcher out of `src/app.mjs` into an independently tested editor module.

**Architecture:** Create `src/editor/editor-command-runner.mjs` with one exported `runEditorCommand(command, context)` function. `src/app.mjs` keeps the same local `runEditorCommand(command)` wrapper and passes editor/UI callbacks into the module.

**Tech Stack:** ES modules, TipTap command-chain style objects, Node test runner.

## Global Constraints

- Keep existing command behavior unchanged while moving code.
- Preserve UI side effects through injected callbacks from `app.mjs`.
- Verify with a failing test first, then targeted tests, full `npm test`, and `npm run build`.

---

### Task 1: Extract Editor Command Runner

**Files:**
- Create: `src/editor/editor-command-runner.mjs`
- Create: `tests/editor-command-runner.test.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Produces: `runEditorCommand(command, context)` where `context` contains `editor`, `toggleSourceView`, popover callbacks, insert callbacks, modal callbacks, and `requestAnimationFrame`.

- [x] **Step 1: Write failing tests**

Create tests for source-view without editor, heading command, link toggle, table modal insertion, and injected callbacks.

- [x] **Step 2: Run targeted test**

Run: `node --test tests/editor-command-runner.test.mjs`
Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement command runner**

Move the command if/else logic into the new module and use context callbacks for app-specific side effects.

- [x] **Step 4: Replace app wrapper**

Replace the large body in `src/app.mjs` with a thin call into the new module.

- [x] **Step 5: Verify**

Run targeted tests, full tests, and build.
