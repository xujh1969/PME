# Linked Document, Save, and Image Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open local Markdown links in PME tabs, make post-save writes direct, hydrate absolute images on first open, and render the Markdown-link toolbar icon.

**Architecture:** Add narrow document-link navigation and absolute-file persistence capabilities to the existing adapter/session flow. Reuse local image preview hydration during workspace opening instead of duplicating image parsing.

**Tech Stack:** ES modules, TipTap, Tauri 2/Rust, Node test runner.

## Global Constraints

- Local Markdown links open inside PME in a new or existing tab.
- Saving a newly created document adopts the chosen location for later direct saves.
- Source files and unrelated UI behavior remain unchanged.

---

### Task 1: Persistent Saved File Session

- [x] Add failing path and adapter tests for Windows paths and adopted save destinations.
- [x] Normalize saved names and update Tauri adapter state after save dialog.
- [x] Add absolute text writing for linked external tabs.
- [x] Run focused tests.

### Task 2: Linked Markdown Tab Navigation

- [x] Add failing tests for local Markdown link detection and path resolution.
- [x] Bind editor link clicks to load, hydrate, and open documents without duplicate tabs.
- [x] Run focused tests.

### Task 3: Initial Absolute Image Hydration and Icon

- [x] Add failing workspace hydration and icon registry tests.
- [x] Hydrate local absolute images before the first editor render.
- [x] Register the FileInput Lucide icon.
- [x] Run focused tests, full tests, frontend build, and Rust check.
