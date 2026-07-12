import {
  createWorkspaceOnDisk,
  isFileSystemAccessSupported,
  openWorkspaceFromDirectory,
  removeFile,
  writeBlobFile,
  writeTextFile,
} from "./browser-workspace.mjs";
import { createTauriWorkspaceAdapter, isTauriRuntime } from "./tauri-workspace.mjs";
import { createWorkspaceSnapshot, getDefaultWorkspaceConfig, getWorkspacePaths } from "./workspace.mjs";

export function createWorkspaceAdapter() {
  if (isTauriRuntime()) {
    return createTauriWorkspaceAdapter();
  }

  if (isFileSystemAccessSupported()) {
    return createBrowserWorkspaceAdapter();
  }

  return createMemoryWorkspaceAdapter();
}

export function canPersistWorkspaceAdapter(adapter) {
  return Boolean(adapter?.canPersist && adapter?.getWorkspaceInfo?.());
}

export function createBrowserWorkspaceAdapter() {
  let rootHandle = null;
  let fileHandles = {};
  let pendingParentHandle = null;
  let currentWorkspace = null;
  let singleFileHandle = null;
  let singleFilePath = "";

  function normalizeWorkspace(workspace) {
    rootHandle = workspace.rootHandle;
    fileHandles = workspace.fileHandles || {};
    currentWorkspace = {
      kind: "browser",
      projectName: workspace.projectName,
      displayPath: rootHandle?.name || workspace.projectName,
    };
    return {
      projectName: workspace.projectName,
      files: workspace.files,
      paths: workspace.paths,
      assetIndex: workspace.assetIndex || {},
    };
  }

  return {
    kind: "browser",
    canPersist: true,
    getWorkspaceInfo() {
      return currentWorkspace;
    },
    async pickDirectory() {
      pendingParentHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      return pendingParentHandle.name;
    },
    async createWorkspace(projectName) {
      const parentHandle = pendingParentHandle || await window.showDirectoryPicker({ mode: "readwrite" });
      pendingParentHandle = null;
      return normalizeWorkspace(await createWorkspaceOnDisk(parentHandle, projectName));
    },
    async openWorkspace() {
      rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      singleFileHandle = null;
      singleFilePath = "";
      return normalizeWorkspace(await openWorkspaceFromDirectory(rootHandle));
    },
    async openMarkdownFile() {
      if (!("showOpenFilePicker" in window)) {
        return null;
      }
      const [fileHandle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Markdown",
            accept: { "text/markdown": [".md", ".markdown"] },
          },
        ],
      });
      const file = await fileHandle.getFile();
      singleFileHandle = fileHandle;
      singleFilePath = file.name;
      rootHandle = null;
      fileHandles = { [file.name]: fileHandle };
      currentWorkspace = {
        kind: "browser-file",
        projectName: file.name.replace(/\.(md|markdown)$/i, ""),
        displayPath: file.name,
      };
      return {
        projectName: currentWorkspace.projectName,
        files: { [file.name]: await file.text() },
        paths: [file.name],
        assetIndex: {},
        selectedPath: file.name,
      };
    },
    async writeTextFile(path, content) {
      if (singleFileHandle && path === singleFilePath) {
        const writable = await singleFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      }
      fileHandles[path] = await writeTextFile(rootHandle, path, content);
    },
    async writeBlobFile(path, blob) {
      fileHandles[path] = await writeBlobFile(rootHandle, path, blob);
    },
    async removeFile(path) {
      await removeFile(rootHandle, path);
      delete fileHandles[path];
    },
    async openRecentWorkspace() {
      return null;
    },
    async openRecentMarkdownFile() {
      return null;
    },
    async saveTextFileDialog(defaultFileName, content) {
      if (!("showSaveFilePicker" in window)) {
        return null;
      }
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [
          {
            description: "Markdown",
            accept: { "text/markdown": [".md"] },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      singleFileHandle = fileHandle;
      singleFilePath = fileHandle.name;
      rootHandle = null;
      fileHandles = { [fileHandle.name]: fileHandle };
      currentWorkspace = {
        kind: "browser-file",
        projectName: fileHandle.name.replace(/\.(md|markdown)$/i, ""),
        displayPath: fileHandle.name,
      };
      return fileHandle.name;
    },
    async saveBlobFileDialog(defaultFileName, blob) {
      if (!("showSaveFilePicker" in window)) {
        return null;
      }
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [
          {
            description: "ZIP",
            accept: { "application/zip": [".zip"] },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return fileHandle.name;
    },
  };
}

export function createMemoryWorkspaceAdapter() {
  return {
    kind: "memory",
    canPersist: false,
    getWorkspaceInfo() {
      return null;
    },
    async pickDirectory() {
      return "";
    },
    async createWorkspace(projectName) {
      const snapshot = createWorkspaceSnapshot(projectName);
      const files = {
        ...snapshot.files,
        "Design.md": "# Design\n\nDocument your system here.\n",
      };
      return {
        projectName: getDefaultWorkspaceConfig(projectName).projectName,
        files,
        paths: getWorkspacePaths(files, ["README.md", "Design.md", "assets/"]),
        assetIndex: {},
      };
    },
    async openWorkspace() {
      return null;
    },
    async openMarkdownFile() {
      return null;
    },
    async writeTextFile() {},
    async writeBlobFile() {},
    async removeFile() {},
    async openRecentWorkspace() {
      return null;
    },
    async openRecentMarkdownFile() {
      return null;
    },
    async saveTextFileDialog() {
      return null;
    },
    async saveBlobFileDialog() {
      return null;
    },
  };
}
