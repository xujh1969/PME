export function isTauriRuntime() {
  return typeof window !== "undefined" && (Boolean(window.__TAURI__) || Boolean(window.__TAURI_INTERNALS__));
}

export function createTauriWorkspaceAdapter() {
  let rootPath = "";
  let currentWorkspace = null;

  async function invokeCommand(command, args = {}) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke(command, args);
    } catch (error) {
      throw error;
    }
  }

  function normalizeWorkspace(workspace) {
    if (!workspace) {
      return null;
    }
    rootPath = workspace.rootPath;
    currentWorkspace = {
      kind: workspace.kind || "tauri",
      projectName: workspace.projectName,
      rootPath,
      filePath: workspace.filePath || "",
      displayName: workspace.displayName || workspace.projectName,
      displayPath: workspace.filePath || rootPath,
    };
    return {
      projectName: workspace.projectName,
      rootPath,
      displayPath: workspace.filePath || rootPath,
      selectedPath: workspace.selectedPath || "",
      files: workspace.files || {},
      paths: workspace.paths || [],
      assetIndex: workspace.assetIndex || {},
    };
  }

  function adoptSavedFile(savedPath) {
    if (!savedPath) return;
    const normalized = savedPath.replaceAll("\\", "/");
    const fileName = normalized.split("/").at(-1);
    rootPath = normalized.slice(0, -(fileName.length + 1));
    currentWorkspace = {
      kind: "tauri-file",
      projectName: fileName.replace(/\.(md|markdown)$/i, ""),
      rootPath,
      filePath: normalized,
      displayName: fileName,
      displayPath: normalized,
    };
  }

  return {
    kind: "tauri",
    canPersist: true,
    getWorkspaceInfo() {
      return currentWorkspace;
    },
    async pickDirectory() {
      return invokeCommand("pick_workspace_parent_dialog");
    },
    async createWorkspace(projectName, options = {}) {
      return normalizeWorkspace(await invokeCommand("create_workspace_dialog", {
        projectName,
        parentPath: options.parentPath || "",
      }));
    },
    async openWorkspace() {
      return normalizeWorkspace(await invokeCommand("open_workspace_dialog"));
    },
    async openMarkdownFile() {
      const workspace = normalizeWorkspace(await invokeCommand("open_markdown_file_dialog"));
      return workspace;
    },
    async pickMarkdownLinkFile() {
      return invokeCommand("pick_markdown_link_dialog");
    },
    async readTextFilePath(filePath) {
      return invokeCommand("read_text_file_path", { filePath });
    },
    async openRecentWorkspace(recentWorkspace) {
      return normalizeWorkspace(await invokeCommand("open_workspace_path", {
        rootPath: recentWorkspace.rootPath,
      }));
    },
    async openRecentMarkdownFile(recentFile) {
      return normalizeWorkspace(await invokeCommand("open_markdown_file_path", {
        filePath: recentFile.filePath,
      }));
    },
    async writeTextFile(path, content) {
      await invokeCommand("write_text_file", { rootPath, path, content });
    },
    async writeTextFilePath(filePath, content) {
      await invokeCommand("write_text_file_path", { filePath, content });
    },
    async writeBlobFile(path, blob) {
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      await invokeCommand("write_binary_file", { rootPath, path, bytes });
    },
    async removeFile(path) {
      await invokeCommand("remove_file", { rootPath, path });
    },
    async saveTextFileDialog(defaultFileName, content) {
      const savedPath = await invokeCommand("export_markdown_file_dialog", { defaultFileName, content });
      adoptSavedFile(savedPath);
      return savedPath;
    },
    async saveBlobFileDialog(defaultFileName, blob) {
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      return invokeCommand("export_binary_file_dialog", { defaultFileName, bytes });
    },
  };
}
