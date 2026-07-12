# Split App Command Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move application-level menu command dispatch out of `src/app.mjs`.

**Architecture:** Add `src/ui/app-command-runner.mjs` exporting `runAppCommand(command, context)`. The module maps menu commands to injected callbacks and small state toggles, while `src/app.mjs` keeps the existing local `runMenuCommand` wrapper.

**Tech Stack:** ES modules and Node test runner.

## Global Constraints

- Preserve current menu command behavior exactly.
- Keep dependencies injected so the module remains testable without DOM bootstrapping.
- Verify with targeted red-green tests, full `npm test`, and `npm run build`.

---

### Task 1: Extract App Command Runner

**Files:**
- Create: `src/ui/app-command-runner.mjs`
- Create: `tests/app-command-runner.test.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Produces: `runAppCommand(command, context)` where context includes `state`, `editor`, callbacks, `document`, and `openMessageModal`.

- [x] **Step 1: Write failing tests**
- [x] **Step 2: Run targeted test and observe missing module failure**
- [x] **Step 3: Implement app command runner**
- [x] **Step 4: Replace app wrapper**
- [x] **Step 5: Verify targeted tests, full tests, and build**
