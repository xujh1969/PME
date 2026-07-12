# Split Mermaid Node Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Mermaid TipTap node and its rendering interactions out of `src/app.mjs` without changing behavior.

**Architecture:** `src/editor/mermaid-node.mjs` owns Mermaid initialization, node commands, NodeView creation, rendering, fit calculations, zoom, and pointer panning. `app.mjs` imports the node and retains selection/editing orchestration.

**Tech Stack:** JavaScript ES modules, TipTap 3, Mermaid 11, Vite 8, Node test runner.

## Global Constraints

- Preserve Mermaid `securityLevel: "strict"` and `startOnLoad: false`.
- Preserve node command names and document schema.
- Preserve zoom bounds, fit behavior, error display, and pointer panning.
- Require all existing tests and production build to pass.

---

### Task 1: Establish source ownership

**Files:**
- Create: `tests/mermaid-node.test.mjs`
- Create: `src/editor/mermaid-node.mjs`

**Interfaces:**
- Produces: `MermaidDiagram` TipTap node.

- [ ] Add assertions for node commands, strict initialization, rendering, zoom, and panning in the new module.
- [ ] Verify the test fails because the module is absent.

### Task 2: Move the Mermaid implementation

**Files:**
- Create: `src/editor/mermaid-node.mjs`
- Modify: `src/app.mjs`

**Interfaces:**
- Consumes: Mermaid and browser DOM APIs.
- Produces: the unchanged `MermaidDiagram` extension consumed by `createEditorExtensions`.

- [ ] Move the node and helper functions unchanged.
- [ ] Import `MermaidDiagram` in `app.mjs` and remove obsolete Mermaid imports/state.
- [ ] Run Mermaid, Markdown, editor setup, and object-selection tests.

### Task 3: Verify

**Files:**
- Modify: imports only if orphaned by extraction.

**Interfaces:**
- Produces: no Mermaid renderer definitions remaining in `app.mjs`.

- [ ] Run syntax checks.
- [ ] Run `npm test` with zero failures.
- [ ] Run `npm run build` with exit code 0.
- [ ] Record the new `app.mjs` line count.
