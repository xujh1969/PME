# Split Tab And Recent Workspace State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move tab state transitions and recent-workspace persistence rules out of `src/app.mjs`.

**Architecture:** Extend the existing pure tab module with open, modify, rename, and untitled-name transitions. Add a storage-agnostic recent-workspace module; `app.mjs` supplies `localStorage` and retains UI rendering and confirmation workflows.

**Tech Stack:** JavaScript ES modules, Node test runner, browser localStorage, Vite 8.

## Global Constraints

- Preserve active-tab selection when closing tabs.
- Preserve untitled file numbering and modified flags.
- Preserve recent-workspace deduplication order and maximum of six entries.
- Require all tests and production build to pass.

---

### Task 1: Add pure tab transitions

**Files:**
- Modify: `src/core/tabs.mjs`
- Modify: `tests/tabs.test.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Produces: `getNextUntitledPath`, `openTab`, `setTabModified`, `renameTabPath`.

- [ ] Add failing behavior tests for all transitions.
- [ ] Implement minimal pure functions.
- [ ] Replace inline tab mutations in `app.mjs`.

### Task 2: Extract recent workspace persistence

**Files:**
- Create: `src/core/recent-workspaces.mjs`
- Create: `tests/recent-workspaces.test.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Produces: `readRecentWorkspaces(storage, key, limit)` and `rememberRecentWorkspace(storage, key, workspaceInfo, limit)`.

- [ ] Add failing tests for parsing, filtering, deduplication, ordering, and truncation.
- [ ] Implement storage-agnostic helpers.
- [ ] Replace localStorage logic in `app.mjs`.

### Task 3: Verify

**Files:**
- Modify: imports and obsolete constants only.

**Interfaces:**
- Produces: no duplicated tab or recent persistence rules in `app.mjs`.

- [ ] Run targeted state tests.
- [ ] Run `npm test` with zero failures.
- [ ] Run `npm run build` with exit code 0.
- [ ] Record the new `app.mjs` line count.
