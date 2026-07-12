export function fileName(path) {
  return path.split(/[\\/]/).at(-1);
}

export function getSavedMarkdownWorkspacePath(savedPath, currentPath = "") {
  const savedFileName = fileName(savedPath || "");
  if (!savedFileName) {
    return "";
  }
  const nextPath = /\.(md|markdown)$/i.test(savedFileName)
    ? savedFileName
    : `${savedFileName}.md`;
  return nextPath && nextPath !== currentPath ? nextPath : "";
}

export function computeRelativePath(targetPath, baseDir) {
  if (!baseDir || !targetPath) {
    return targetPath;
  }

  const baseParts = baseDir.split("/").filter(Boolean);
  const targetParts = targetPath.split("/").filter(Boolean);

  while (
    baseParts.length &&
    targetParts.length &&
    baseParts[0] === targetParts[0]
  ) {
    baseParts.shift();
    targetParts.shift();
  }

  return [
    ...baseParts.map(() => ".."),
    ...targetParts,
  ].join("/") || ".";
}
