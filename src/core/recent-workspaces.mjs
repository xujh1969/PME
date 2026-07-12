export function readRecentWorkspaces(storage, key, limit) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.projectName).slice(0, limit)
      : [];
  } catch {
    return [];
  }
}

export function rememberRecentWorkspace(storage, key, workspaceInfo, limit) {
  if (!workspaceInfo?.projectName || !workspaceInfo?.kind) {
    return;
  }

  const identity = (item) => (
    item.filePath || item.rootPath || item.displayPath || item.projectName
  );
  const recent = readRecentWorkspaces(storage, key, limit)
    .filter((item) => identity(item) !== identity(workspaceInfo));
  recent.unshift({
    kind: workspaceInfo.kind,
    projectName: workspaceInfo.projectName,
    displayName: workspaceInfo.displayName || workspaceInfo.projectName,
    filePath: workspaceInfo.filePath || "",
    rootPath: workspaceInfo.rootPath || "",
    displayPath: workspaceInfo.displayPath || workspaceInfo.filePath || workspaceInfo.rootPath || workspaceInfo.projectName,
  });
  storage.setItem(key, JSON.stringify(recent.slice(0, limit)));
}
