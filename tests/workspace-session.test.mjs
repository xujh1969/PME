import test from "node:test";
import assert from "node:assert/strict";

import {
  addMarkdownFileSession,
  addUntitledMarkdownSession,
  adoptSavedMarkdownSession,
  canSaveMarkdownPathDirectly,
  createMarkdownFileSession,
  createOpenedWorkspaceSession,
  createStandaloneMarkdownSession,
  openMarkdownDocumentSession,
} from "../src/core/workspace-session.mjs";

const parseMarkdown = (markdown) => ({ type: "doc", markdown });
const hydrateImagePreviews = (doc, files, options) => ({
  ...doc,
  hydratedFrom: options.basePath,
  fileCount: Object.keys(files).length,
});
const buildWorkspaceTree = (paths) => paths.map((path) => ({ path }));
const fileName = (path) => path.split("/").pop();

test("creates standalone markdown shell state", () => {
  const session = createStandaloneMarkdownSession({
    path: "Untitled.md",
    markdown: "# Untitled\n\n",
    parseMarkdown,
  });

  assert.equal(session.workspaceName, "Untitled");
  assert.equal(session.selectedPath, "Untitled.md");
  assert.deepEqual(session.files, { "Untitled.md": "# Untitled\n\n" });
  assert.deepEqual(session.documents["Untitled.md"], { type: "doc", markdown: "# Untitled\n\n" });
  assert.deepEqual(session.openTabs, [{ name: "Untitled.md", path: "Untitled.md", modified: true }]);
});

test("creates opened workspace shell state with hydrated markdown documents", () => {
  const session = createOpenedWorkspaceSession({
    projectName: " Docs ",
    paths: ["README.md", "assets/image.png"],
    files: {
      "README.md": "# Readme",
      "assets/image.png": "blob:data",
    },
    workspaceAdapter: { canPersist: true },
    assetIndex: { "assets/image.png": "C:/image.png" },
    selectedPath: "",
    parseMarkdown,
    hydrateImagePreviews,
    buildWorkspaceTree,
    fileName,
  });

  assert.equal(session.workspaceName, "Docs");
  assert.equal(session.selectedPath, "README.md");
  assert.deepEqual(session.tree, [{ path: "README.md" }, { path: "assets/image.png" }]);
  assert.deepEqual(session.collapsedFolders, new Set(["assets"]));
  assert.deepEqual(session.documents["README.md"], {
    type: "doc",
    markdown: "# Readme",
    hydratedFrom: "README.md",
    fileCount: 2,
  });
  assert.deepEqual(session.openTabs, [{ name: "README.md", path: "README.md", modified: false }]);
});

test("adds an untitled markdown tab to an existing shell state", () => {
  const state = {
    files: { "Untitled.md": "# Untitled\n\n" },
    paths: ["Untitled.md"],
    documents: { "Untitled.md": { type: "doc" } },
    openTabs: [{ name: "Untitled.md", path: "Untitled.md", modified: true }],
    selectedPath: "Untitled.md",
  };

  addUntitledMarkdownSession(state, {
    getNextUntitledPath: () => "Untitled2.md",
    parseMarkdown,
  });

  assert.equal(state.selectedPath, "Untitled2.md");
  assert.equal(state.files["Untitled2.md"], "# Untitled2\n\n");
  assert.deepEqual(state.paths, ["Untitled.md", "Untitled2.md"]);
  assert.deepEqual(state.openTabs.at(-1), { name: "Untitled2.md", path: "Untitled2.md", modified: true });
});

test("adds an opened markdown file into the current workspace", async () => {
  const state = {
    files: { "README.md": "# Readme" },
    paths: ["README.md"],
    documents: { "README.md": { type: "doc" } },
    openTabs: [{ name: "README.md", path: "README.md", modified: false }],
    selectedPath: "README.md",
  };

  const added = await addMarkdownFileSession(state, {
    selectedPath: "Notes.md",
    files: { "Notes.md": "# Notes" },
    paths: ["Notes.md"],
  }, {
    adapter: { kind: "memory" },
    parseMarkdown,
    hydrateImagePreviews,
    buildWorkspaceTree,
    fileName,
  });

  assert.equal(added, true);
  assert.equal(state.workspaceAdapter.kind, "memory");
  assert.equal(state.selectedPath, "Notes.md");
  assert.deepEqual(state.paths, ["README.md", "Notes.md"]);
  assert.deepEqual(state.tree, [{ path: "README.md" }, { path: "Notes.md" }]);
  assert.deepEqual(state.openTabs.at(-1), { name: "Notes.md", path: "Notes.md", modified: false });
});

test("adds an opened markdown file with async document hydration", async () => {
  const state = {
    files: { "README.md": "# Readme" },
    paths: ["README.md"],
    documents: { "README.md": { type: "doc" } },
    openTabs: [{ name: "README.md", path: "README.md", modified: false }],
    selectedPath: "README.md",
  };

  await addMarkdownFileSession(state, {
    selectedPath: "Notes.md",
    files: { "Notes.md": "![Photo](C:/demo/photo.png)" },
    paths: ["Notes.md"],
  }, {
    adapter: { kind: "memory" },
    parseMarkdown,
    hydrateImagePreviews,
    hydrateDocument: async (doc) => ({ ...doc, localImagesHydrated: true }),
    buildWorkspaceTree,
    fileName,
  });

  assert.equal(state.documents["Notes.md"].localImagesHydrated, true);
});

test("selects existing tab instead of duplicating an opened markdown file", async () => {
  const state = {
    files: { "Notes.md": "# Notes" },
    paths: ["Notes.md"],
    documents: { "Notes.md": { type: "doc" } },
    openTabs: [{ name: "Notes.md", path: "Notes.md", modified: false }],
    selectedPath: "README.md",
  };

  const added = await addMarkdownFileSession(state, {
    selectedPath: "Notes.md",
    files: { "Notes.md": "# Notes" },
    paths: ["Notes.md"],
  }, {
    adapter: { kind: "memory" },
    parseMarkdown,
    hydrateImagePreviews,
    buildWorkspaceTree,
    fileName,
  });

  assert.equal(added, true);
  assert.equal(state.selectedPath, "Notes.md");
  assert.equal(state.openTabs.length, 1);
});

test("only saves directly when a persisted workspace root exists", () => {
  assert.equal(canSaveMarkdownPathDirectly("Untitled.md", { canPersist: true }), false);
  assert.equal(canSaveMarkdownPathDirectly("Untitled.md", {
    canPersist: true,
    getWorkspaceInfo: () => ({ rootPath: "C:/Users/AYOU/Desktop" }),
  }), true);
  assert.equal(canSaveMarkdownPathDirectly("C:/Users/AYOU/Desktop/Notes.md", {
    canPersist: true,
    getWorkspaceInfo: () => ({ rootPath: "C:/Users/AYOU/Desktop" }),
  }), false);
});

test("adopts a saved markdown path across files documents drafts paths and tabs", () => {
  const state = {
    selectedPath: "Untitled.md",
    files: { "Untitled.md": "# Draft" },
    documents: { "Untitled.md": { type: "doc" } },
    sourceDrafts: { "Untitled.md": "# Draft source" },
    paths: ["Untitled.md", "assets/image.png"],
    openTabs: [{ name: "Untitled.md", path: "Untitled.md", modified: true }],
  };

  const adopted = adoptSavedMarkdownSession(state, "C:/Users/AYOU/Desktop/Notes.md", {
    getSavedMarkdownWorkspacePath: () => "Notes.md",
    replaceWorkspacePath: (paths, oldPath, nextPath) => paths.map((path) => path === oldPath ? nextPath : path),
    renameSourceDraftPath: (drafts, oldPath, nextPath) => ({ [nextPath]: drafts[oldPath] }),
    renameTabPath: (tabs, oldPath, nextPath, name) => tabs.map((tab) => (
      tab.path === oldPath ? { ...tab, path: nextPath, name } : tab
    )),
    fileName,
  });

  assert.equal(adopted, true);
  assert.equal(state.selectedPath, "Notes.md");
  assert.equal(state.files["Notes.md"], "# Draft");
  assert.equal(state.files["Untitled.md"], undefined);
  assert.deepEqual(state.sourceDrafts, { "Notes.md": "# Draft source" });
  assert.deepEqual(state.paths, ["Notes.md", "assets/image.png"]);
  assert.deepEqual(state.openTabs, [{ name: "Notes.md", path: "Notes.md", modified: true }]);
});

test("creates a named markdown document in the current workspace", () => {
  const state = {
    files: { "README.md": "# Readme" },
    paths: ["README.md"],
    documents: { "README.md": { type: "doc" } },
    tree: [],
  };

  const created = createMarkdownFileSession(state, "Notes.md", {
    parseMarkdown,
    getWorkspacePaths: (files, paths) => [...paths, ...Object.keys(files).filter((path) => !paths.includes(path))],
    buildWorkspaceTree,
  });

  assert.equal(created.markdown, "# Notes\n\n");
  assert.equal(state.files["Notes.md"], "# Notes\n\n");
  assert.deepEqual(state.documents["Notes.md"], { type: "doc", markdown: "# Notes\n\n" });
  assert.deepEqual(state.paths, ["README.md", "Notes.md"]);
  assert.deepEqual(state.tree, [{ path: "README.md" }, { path: "Notes.md" }]);
});

test("opens a markdown document tab and hydrates missing document state", () => {
  const state = {
    files: { "README.md": "# Readme", "Notes.md": "# Notes" },
    documents: { "README.md": { type: "doc" } },
    openTabs: [{ name: "README.md", path: "README.md", modified: false }],
    selectedPath: "README.md",
  };

  openMarkdownDocumentSession(state, "Notes.md", {
    openTab: (tabs, path, name) => ({
      openTabs: [...tabs, { name, path, modified: false }],
      selectedPath: path,
    }),
    parseMarkdown,
    hydrateImagePreviews,
    fileName,
  });

  assert.equal(state.selectedPath, "Notes.md");
  assert.deepEqual(state.documents["Notes.md"], {
    type: "doc",
    markdown: "# Notes",
    hydratedFrom: "Notes.md",
    fileCount: 2,
  });
  assert.deepEqual(state.openTabs.at(-1), { name: "Notes.md", path: "Notes.md", modified: false });
});
