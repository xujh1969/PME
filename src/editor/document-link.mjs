import { isLocalAbsolutePath, normalizeDocumentResourcePath } from "../core/package-resources.mjs";

export function resolveLocalMarkdownLink(href, currentDocumentPath) {
  const decodedHref = decodeURIComponent(String(href || ""));
  const path = decodedHref.split(/[?#]/, 1)[0];
  if (!path || !/\.(md|markdown)$/i.test(path) || /^(https?:|data:|blob:)/i.test(path)) {
    return null;
  }
  const resolved = isLocalAbsolutePath(path)
    ? path
    : normalizeDocumentResourcePath(path, currentDocumentPath);
  return resolved.replaceAll("\\", "/");
}
