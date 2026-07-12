import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWorkspaceTree,
  createWorkspaceSnapshot,
  createMarkdownFilePath,
  getDefaultWorkspaceConfig,
  getWorkspacePaths,
  removeWorkspacePath,
  replaceWorkspacePath,
} from "../src/core/workspace.mjs";

test("creates the default PME workspace snapshot", () => {
  const snapshot = createWorkspaceSnapshot("MyProject");

  assert.deepEqual(snapshot.directories, ["assets"]);
  assert.deepEqual(Object.keys(snapshot.files), ["README.md"]);
  assert.equal(snapshot.files["README.md"], "# MyProject\n\nStart writing with PME.\n");
});

test("normalizes blank project names", () => {
  assert.equal(getDefaultWorkspaceConfig("  ").projectName, "Untitled Workspace");
});

test("builds a sorted project tree from workspace paths", () => {
  const tree = buildWorkspaceTree([
    "Design.md",
    "assets/image001.png",
    "README.md",
  ]);

  assert.deepEqual(tree, [
    {
      name: "assets",
      path: "assets",
      type: "folder",
      children: [
        { name: "image001.png", path: "assets/image001.png", type: "image" },
      ],
    },
    { name: "Design.md", path: "Design.md", type: "markdown" },
    { name: "README.md", path: "README.md", type: "markdown" },
  ]);
});

test("deduplicates workspace file paths", () => {
  assert.deepEqual(getWorkspacePaths({
    "README.md": "# Readme",
    "assets/a.png": "blob:url",
  }, ["README.md"]), [
    "README.md",
    "assets/a.png",
  ]);
});

test("keeps explicit empty folders in the project tree", () => {
  assert.deepEqual(buildWorkspaceTree(["assets/", "README.md"]), [
    {
      name: "assets",
      path: "assets",
      type: "folder",
      children: [],
    },
    { name: "README.md", path: "README.md", type: "markdown" },
  ]);
});

test("normalizes markdown file names for new documents", () => {
  assert.equal(createMarkdownFilePath("Notes"), "Notes.md");
  assert.equal(createMarkdownFilePath("Notes.md"), "Notes.md");
  assert.equal(createMarkdownFilePath("  Meeting Notes  "), "Meeting Notes.md");
});

test("rejects unsafe markdown file names", () => {
  assert.equal(createMarkdownFilePath(""), null);
  assert.equal(createMarkdownFilePath("../Notes"), null);
  assert.equal(createMarkdownFilePath("folder/Notes"), null);
  assert.equal(createMarkdownFilePath("bad:name"), null);
});

test("replaces a workspace path without duplicating entries", () => {
  assert.deepEqual(replaceWorkspacePath([
    "README.md",
    "assets/",
    "assets/a.png",
    "Notes.md",
  ], "README.md", "Notes.md"), [
    "Notes.md",
    "assets/",
    "assets/a.png",
  ]);
});

test("removes a workspace path while keeping asset entries", () => {
  assert.deepEqual(removeWorkspacePath([
    "README.md",
    "assets/",
    "assets/a.png",
    "Notes.md",
  ], "README.md"), [
    "assets/",
    "assets/a.png",
    "Notes.md",
  ]);
});
