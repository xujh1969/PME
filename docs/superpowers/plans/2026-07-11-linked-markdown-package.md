# Linked Markdown Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert custom-label local Markdown links and recursively package their document/image dependency graph.

**Architecture:** Keep UI selection, native filesystem access, Markdown dependency traversal, and app orchestration in separate modules. Reuse the existing Markdown parser/serializer and ZIP/image resource helpers.

**Tech Stack:** ES modules, TipTap/ProseMirror, fflate, Tauri 2/Rust, Node test runner.

## Global Constraints

- Permit linked files outside the current directory and on other drives.
- Do not modify source files.
- Preserve network links and anchors.
- Detect cycles and deduplicate canonical source paths.

---

### Task 1: Recursive Document Graph

**Files:** Create `src/core/linked-markdown-package.mjs`; create `tests/linked-markdown-package.test.mjs`.

**Interfaces:** Produce `collectLinkedMarkdownPackage({ rootDoc, rootName, rootSourcePath, loadText, loadImageResource })` returning ZIP entries and missing resources.

- [x] Write failing traversal, cycle, rewrite, image, anchor, and collision tests.
- [x] Run the focused tests and observe the missing-module failure.
- [x] Implement deterministic recursive traversal and rewriting.
- [x] Run focused tests until green.

### Task 2: Native File Access and Insert Dialog

**Files:** Create `src/ui/markdown-link-modal.mjs`; modify `src/core/tauri-workspace.mjs`; modify `src-tauri/src/main.rs`; create `tests/markdown-link-modal.test.mjs`; modify `tests/tauri.test.mjs`.

**Interfaces:** Adapter produces `pickMarkdownLinkFile()` and `readTextFilePath(path)`; modal produces `{ label, path } | null`.

- [x] Write failing UI and native command contract tests.
- [x] Implement the native picker/reader and adapter methods.
- [x] Implement the custom-label insertion dialog.
- [x] Run focused tests until green.

### Task 3: Editor, Menu, Toolbar, and Packaging Integration

**Files:** Modify `src/app.mjs`; modify `src/ui/app-command-runner.mjs`; modify `src/core/markdown-package.mjs`; modify `src/styles.css`; modify related tests.

**Interfaces:** Add command `insert-markdown-link`; package export invokes recursive graph collection.

- [x] Write failing command/menu/toolbar/package integration tests.
- [x] Add menu and toolbar entry points.
- [x] Insert a standard link mark with the selected label/path.
- [x] Replace single-document ZIP collection with recursive collection.
- [x] Run focused tests, `npm test`, `npm run build`, and Rust checks where available.
