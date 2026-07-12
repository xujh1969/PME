import test from "node:test";
import assert from "node:assert/strict";

import {
  canPersistWorkspaceAdapter,
  createMemoryWorkspaceAdapter,
  createWorkspaceAdapter,
} from "../src/core/workspace-adapter.mjs";
import { isTauriRuntime } from "../src/core/tauri-workspace.mjs";

test("falls back to a memory workspace adapter outside browser and Tauri", () => {
  const adapter = createWorkspaceAdapter();

  assert.equal(adapter.kind, "memory");
  assert.equal(adapter.canPersist, false);
});

test("memory adapter creates a runnable starter workspace", async () => {
  const adapter = createMemoryWorkspaceAdapter();
  const workspace = await adapter.createWorkspace("Docs");

  assert.equal(workspace.projectName, "Docs");
  assert.equal(workspace.files["README.md"], "# Docs\n\nStart writing with PME.\n");
  assert.equal(workspace.files["Design.md"], "# Design\n\nDocument your system here.\n");
  assert.deepEqual(workspace.paths, ["README.md", "Design.md", "assets/"]);
});

test("memory adapter exposes single-file and export no-op methods", async () => {
  const adapter = createMemoryWorkspaceAdapter();

  assert.equal(await adapter.openMarkdownFile(), null);
  assert.equal(await adapter.saveTextFileDialog("a.md", "# A\n"), null);
  assert.equal(await adapter.saveBlobFileDialog("a.zip", new Blob(["zip"])), null);
});

test("Tauri runtime detection is false in node tests", () => {
  assert.equal(isTauriRuntime(), false);
});

test("detects workspace adapters that can persist directly", () => {
  assert.equal(canPersistWorkspaceAdapter({
    canPersist: true,
    getWorkspaceInfo: () => ({ projectName: "PME" }),
  }), true);
  assert.equal(canPersistWorkspaceAdapter({
    canPersist: true,
    getWorkspaceInfo: () => null,
  }), false);
  assert.equal(canPersistWorkspaceAdapter(null), false);
});
