const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

export function getDefaultWorkspaceConfig(projectName) {
  return {
    projectName: normalizeProjectName(projectName),
    version: "1.0",
    defaultFolder: "",
    assetFolder: "assets",
    theme: "light",
    editor: {
      fontSize: 14,
      lineHeight: 1.8,
    },
  };
}

export function createWorkspaceSnapshot(projectName) {
  const config = getDefaultWorkspaceConfig(projectName);

  return {
    directories: ["assets"],
    files: {
      "README.md": `# ${config.projectName}\n\nStart writing with PME.\n`,
    },
  };
}

export function getWorkspacePaths(files, extraPaths = []) {
  return [...new Set([...Object.keys(files), ...extraPaths])];
}

export function replaceWorkspacePath(paths, oldPath, newPath) {
  return [...new Set(paths.map((path) => (path === oldPath ? newPath : path)))];
}

export function removeWorkspacePath(paths, pathToRemove) {
  return paths.filter((path) => path !== pathToRemove);
}

export function buildWorkspaceTree(paths) {
  const root = [];

  for (const filePath of paths) {
    const normalizedPath = normalizePath(filePath);
    const isExplicitFolder = normalizedPath.endsWith("/");
    const parts = normalizedPath.split("/").filter(Boolean);
    let level = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = index === parts.length - 1;
      const isFolder = !isLeaf || isExplicitFolder;
      let node = level.find((item) => item.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFolder ? "folder" : getFileType(part),
        };
        if (isFolder) {
          node.children = [];
        }
        level.push(node);
      }

      if (!isLeaf) {
        level = node.children;
      }
    });
  }

  return sortTree(root);
}

export function createMarkdownFilePath(fileName) {
  const trimmed = fileName.trim();
  if (!trimmed || /[\\/:*?"<>|]/.test(trimmed) || trimmed.includes("..")) {
    return null;
  }

  return trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`;
}

function normalizeProjectName(projectName) {
  const trimmed = projectName.trim();
  return trimmed || "Untitled Workspace";
}

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function getFileType(fileName) {
  if (fileName.toLowerCase().endsWith(".md")) {
    return "markdown";
  }

  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  return IMAGE_EXTENSIONS.has(extension) ? "image" : "file";
}

function sortTree(nodes) {
  return nodes
    .map((node) => (
      node.children
        ? { ...node, children: sortTree(node.children) }
        : node
    ))
    .sort((left, right) => {
      if (left.type === "folder" && right.type !== "folder") {
        return -1;
      }
      if (left.type !== "folder" && right.type === "folder") {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });
}
