# Outline Collapse and Toolbar Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the requested heading and floating-toolbar controls and a session-only batch collapse command for the left document outline.

**Architecture:** Extend the existing outline core module with a pure set transformation keyed by the renderer's `outline-group-N` identifiers. Route new Paragraph menu commands through the application command runner to an app callback that updates `collapsedOutlineGroups`; toolbar additions reuse existing editor commands.

**Tech Stack:** JavaScript ES modules, TipTap 3, existing string-rendered UI, Node test runner, Vite.

## Global Constraints

- Batch outline collapse affects only the left outline tree.
- It must not modify Markdown, editor heading attributes, undo history, dirty state, or exports.
- Existing editor heading collapse remains independent and unchanged.
- Reuse existing menu, toolbar, command, icon, and CSS patterns; add no global styling.
- Keep all unrelated dirty working-tree changes intact.

---

### Task 1: Pure Outline Collapse Transformation

**Files:**
- Modify: `src/core/outline.mjs`
- Test: `tests/outline.test.mjs`

**Interfaces:**
- Consumes: `outline: Array<{ index: number, level: number, text: string }>` and `collapsedGroups: Set<string>`.
- Produces: `collapseOutlineAtLevel(outline, collapsedGroups, level): Set<string>`, where `level` is `1..5` or `null` for all-expand.

- [ ] **Step 1: Write failing tests** for H1 collapse, higher-level expansion at H3, preservation of deeper states, leaf headings, and all-expand.
- [ ] **Step 2: Run `node --test tests/outline.test.mjs`** and verify failure because `collapseOutlineAtLevel` is not exported.
- [ ] **Step 3: Implement the minimal pure helper** by identifying groups whose next outline item has a deeper level, deleting group IDs above the target, adding IDs at the target, preserving deeper IDs, and returning an empty set for `null`.
- [ ] **Step 4: Run `node --test tests/outline.test.mjs`** and verify all outline tests pass.

### Task 2: Paragraph Menu Commands

**Files:**
- Modify: `src/app.mjs`
- Modify: `src/ui/app-command-runner.mjs`
- Test: `tests/app-command-runner.test.mjs`
- Test: `tests/design-system.test.mjs`

**Interfaces:**
- Consumes: commands `outline-collapse-1` through `outline-collapse-5` and `outline-expand-all`.
- Produces: application callback `applyOutlineCollapse(level: number | null)` that replaces `state.collapsedOutlineGroups[state.selectedPath]` and re-renders.

- [ ] **Step 1: Write failing command-runner tests** asserting outline commands call `applyOutlineCollapse` with the correct numeric level or `null` and do not call `runEditorCommand`.
- [ ] **Step 2: Write a failing UI source test** asserting Paragraph contains the independent `折叠大纲` submenu and six command entries.
- [ ] **Step 3: Run both focused test files** and verify the new assertions fail for missing commands and markup.
- [ ] **Step 4: Add the submenu, command routing, callback context, and app callback** using `getCurrentOutline()` plus `collapseOutlineAtLevel`; leave `heading-collapse` and `heading-expand-all` unchanged.
- [ ] **Step 5: Run both focused test files** and verify they pass.

### Task 3: Top and Floating Toolbar Controls

**Files:**
- Modify: `src/app.mjs`
- Test: `tests/design-system.test.mjs`

**Interfaces:**
- Reuses existing commands: `heading-3`, `heading-4`, `heading-5`, `heading-6`, `bullet-list`, `ordered-list`, `task-list`, and `blockquote`.

- [ ] **Step 1: Add failing source assertions** that the top Text group has exactly one H1-H6 button and `renderBubbleMenu` contains all four requested block controls.
- [ ] **Step 2: Run `node --test tests/design-system.test.mjs`** and verify failure for missing H4-H6 and floating controls.
- [ ] **Step 3: Add only the missing H4-H6 top buttons** after existing H3, then add a separator and the four existing command buttons to `renderBubbleMenu`.
- [ ] **Step 4: Run `node --test tests/design-system.test.mjs`** and verify it passes without CSS changes.

### Task 4: Regression and Runtime Verification

**Files:**
- No production files expected.

- [ ] **Step 1: Run focused tests** with `node --test tests/outline.test.mjs tests/app-command-runner.test.mjs tests/design-system.test.mjs` and fix only regressions caused by this feature.
- [ ] **Step 2: Run `npm test`** and require zero failures.
- [ ] **Step 3: Run `npm run build`** and require a successful production build.
- [ ] **Step 4: Run `git diff --check`** and require no whitespace errors.
- [ ] **Step 5: Start or reuse a Vite development server** and verify the app responds over HTTP for user testing.
