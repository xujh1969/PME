import { isLocalAbsolutePath } from "./package-resources.mjs";

export function createStandaloneMarkdownSession({ path, markdown, parseMarkdown }) {
  return {
    workspaceName: "Untitled",
    tree: [],
    files: { [path]: markdown },
    paths: [path],
    collapsedFolders: new Set(),
    rootHandle: null,
    fileHandles: {},
    assetIndex: {},
    documents: {
      [path]: parseMarkdown(markdown),
    },
    sourceDrafts: {},
    editorMode: "visual",
    screen: "shell",
    selectedPath: path,
    openTabs: [{ name: path, path, modified: false }],
    showSidebar: true,
    showFileTree: false,
    showOutline: true,
  };
}

export function createOpenedWorkspaceSession({
  projectName,
  paths,
  files,
  workspaceAdapter = null,
  assetIndex = {},
  selectedPath = "",
  parseMarkdown,
  hydrateImagePreviews,
  buildWorkspaceTree,
  fileName,
}) {
  const activePath = selectedPath || paths.find((path) => path.endsWith(".md")) || "";

  return {
    workspaceName: projectName.trim() || "Untitled Workspace",
    tree: buildWorkspaceTree(paths),
    files,
    paths,
    collapsedFolders: new Set(["assets"]),
    rootHandle: null,
    fileHandles: {},
    workspaceAdapter,
    assetIndex,
    documents: Object.fromEntries(
      Object.entries(files)
        .filter(([path]) => path.endsWith(".md"))
        .map(([path, markdown]) => [
          path,
          hydrateImagePreviews(parseMarkdown(markdown), files, { basePath: path }),
        ]),
    ),
    sourceDrafts: {},
    editorMode: "visual",
    screen: "shell",
    selectedPath: activePath,
    openTabs: activePath
      ? [{ name: fileName(activePath), path: activePath, modified: false }]
      : [],
  };
}

export function addUntitledMarkdownSession(state, { getNextUntitledPath, parseMarkdown }) {
  const newPath = getNextUntitledPath(state.files);
  const markdown = "";

  state.files[newPath] = markdown;
  state.paths = [...state.paths, newPath];
  state.documents[newPath] = parseMarkdown(markdown);
  state.openTabs.push({
    name: newPath,
    path: newPath,
    modified: false,
  });
  state.selectedPath = newPath;

  return newPath;
}

export async function addMarkdownFileSession(
  state,
  workspace,
  { adapter, parseMarkdown, hydrateImagePreviews, hydrateDocument = null, buildWorkspaceTree, fileName },
) {
  if (!workspace.selectedPath || !workspace.files[workspace.selectedPath]) {
    return false;
  }

  const newPath = workspace.selectedPath;
  if (state.openTabs.some((tab) => tab.path === newPath)) {
    state.selectedPath = newPath;
    return true;
  }

  state.workspaceAdapter = adapter;
  state.files = { ...state.files, ...workspace.files };
  state.paths = [...new Set([...state.paths, ...workspace.paths])];
  state.tree = buildWorkspaceTree(state.paths);
  const document = hydrateImagePreviews(
    parseMarkdown(workspace.files[newPath]),
    state.files,
    { basePath: newPath },
  );
  state.documents[newPath] = hydrateDocument ? await hydrateDocument(document, { basePath: newPath }) : document;
  state.openTabs.push({
    name: fileName(newPath),
    path: newPath,
    modified: false,
  });
  state.selectedPath = newPath;

  return true;
}

export function canSaveMarkdownPathDirectly(path, adapter) {
  if (!path || !adapter?.canPersist || isLocalAbsolutePath(path)) {
    return false;
  }
  return Boolean(adapter.getWorkspaceInfo?.()?.rootPath);
}

export function adoptSavedMarkdownSession(
  state,
  savedPath,
  {
    getSavedMarkdownWorkspacePath,
    replaceWorkspacePath,
    renameSourceDraftPath,
    renameTabPath,
    fileName,
  },
) {
  const oldPath = state.selectedPath;
  const nextPath = getSavedMarkdownWorkspacePath(savedPath, oldPath);
  if (!nextPath) {
    return false;
  }

  state.files[nextPath] = state.files[oldPath];
  state.documents[nextPath] = state.documents[oldPath];
  delete state.files[oldPath];
  delete state.documents[oldPath];
  state.sourceDrafts = renameSourceDraftPath(state.sourceDrafts, oldPath, nextPath);
  state.paths = replaceWorkspacePath(state.paths, oldPath, nextPath);
  state.selectedPath = nextPath;
  state.openTabs = renameTabPath(state.openTabs, oldPath, nextPath, fileName(nextPath));

  return true;
}

export function createMarkdownFileSession(
  state,
  path,
  { parseMarkdown, getWorkspacePaths, buildWorkspaceTree },
) {
  const markdown = "";

  state.files[path] = markdown;
  state.documents[path] = parseMarkdown(markdown);
  state.paths = getWorkspacePaths(state.files, state.paths);
  state.tree = buildWorkspaceTree(state.paths);

  return { path, markdown };
}

export function openMarkdownDocumentSession(
  state,
  path,
  { openTab, parseMarkdown, hydrateImagePreviews, fileName },
) {
  const tabState = openTab(state.openTabs, path, fileName(path));
  state.openTabs = tabState.openTabs;
  if (!state.documents[path]) {
    state.documents[path] = hydrateImagePreviews(parseMarkdown(state.files[path] || ""), state.files, {
      basePath: path,
    });
  }
  state.selectedPath = tabState.selectedPath;

  return tabState;
}
