# Split Workspace Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move workspace/document state transitions out of `src/app.mjs` into a smaller independently tested module.

**Architecture:** Add `src/core/workspace-session.mjs` for pure state construction and immutable path adoption helpers. Keep UI, Tauri/browser adapters, editor serialization, and rendering in `src/app.mjs`.

**Tech Stack:** Node test runner, ES modules, existing PME core helpers.

## Global Constraints

- Use the smallest refactor that lowers `src/app.mjs` size and improves module independence.
- Do not change runtime behavior for opening, creating, saving, or tabbing documents.
- Write failing tests before production code and verify with targeted tests, full `npm test`, and `npm run build`.

---

### Task 1: Workspace Session Helpers

**Files:**
- Create: `src/core/workspace-session.mjs`
- Create: `tests/workspace-session.test.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Produces: `createStandaloneMarkdownSession({ markdown, path, parseMarkdown })`
- Produces: `createOpenedWorkspaceSession({ projectName, paths, files, workspaceAdapter, assetIndex, selectedPath, parseMarkdown, hydrateImagePreviews, fileName, buildWorkspaceTree })`
- Produces: `addUntitledMarkdownSession(state, { getNextUntitledPath, parseMarkdown })`
- Produces: `addMarkdownFileSession(state, workspace, { adapter, parseMarkdown, hydrateImagePreviews, buildWorkspaceTree })`
- Produces: `adoptSavedMarkdownSession(state, savedPath, { getSavedMarkdownWorkspacePath, replaceWorkspacePath, renameSourceDraftPath, renameTabPath, fileName })`

- [x] **Step 1: Write failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  addMarkdownFileSession,
  addUntitledMarkdownSession,
  adoptSavedMarkdownSession,
  createOpenedWorkspaceSession,
  createStandaloneMarkdownSession,
} from "../src/core/workspace-session.mjs";
```

- [x] **Step 2: Run targeted test to verify missing module failure**

Run: `node --test tests/workspace-session.test.mjs`
Expected: FAIL because `src/core/workspace-session.mjs` does not exist.

- [x] **Step 3: Implement pure helpers**

Create focused helpers that return state patches or next state objects without touching DOM, localStorage, editor, or file dialogs.

- [x] **Step 4: Integrate app.mjs**

Replace inline state mutation blocks in `createStandaloneMarkdownDocument`, `addNewUntitledTab`, `addMarkdownFileToWorkspace`, `openWorkspace`, and `adoptSavedMarkdownPath` with helper calls.

- [x] **Step 5: Verify**

Run: `node --test tests/workspace-session.test.mjs`, `npm test`, `npm run build`.
