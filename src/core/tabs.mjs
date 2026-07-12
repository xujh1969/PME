export function closeOpenTab(openTabs, selectedPath, closedPath) {
  const closedIndex = openTabs.findIndex((tab) => tab.path === closedPath);
  const nextTabs = openTabs.filter((tab) => tab.path !== closedPath);

  if (selectedPath !== closedPath) {
    return { openTabs: nextTabs, selectedPath };
  }

  return {
    openTabs: nextTabs,
    selectedPath: nextTabs[closedIndex]?.path || nextTabs[closedIndex - 1]?.path || "",
  };
}

export function getNextUntitledPath(files) {
  let index = 1;
  let path = "Untitled.md";
  while (files[path] !== undefined) {
    index += 1;
    path = `Untitled${index}.md`;
  }
  return path;
}

export function openTab(openTabs, path, name) {
  if (openTabs.some((tab) => tab.path === path)) {
    return { openTabs, selectedPath: path };
  }
  return {
    openTabs: [...openTabs, { name, path, modified: false }],
    selectedPath: path,
  };
}

export function setTabModified(openTabs, path, modified) {
  return openTabs.map((tab) => tab.path === path ? { ...tab, modified } : tab);
}

export function renameTabPath(openTabs, oldPath, nextPath, name) {
  return openTabs.map((tab) => (
    tab.path === oldPath ? { ...tab, path: nextPath, name } : tab
  ));
}
