import { serializeMarkdown } from "./markdown.mjs";

export function getSourceText(path, { sourceDrafts = {}, documents = {} }) {
  if (Object.hasOwn(sourceDrafts, path)) {
    return sourceDrafts[path];
  }
  const doc = documents[path] || { type: "doc", content: [] };
  return serializeMarkdown(doc, { basePath: path });
}

export function renameSourceDraftPath(sourceDrafts, oldPath, nextPath) {
  if (!Object.hasOwn(sourceDrafts, oldPath)) {
    return sourceDrafts;
  }
  const nextDrafts = { ...sourceDrafts, [nextPath]: sourceDrafts[oldPath] };
  delete nextDrafts[oldPath];
  return nextDrafts;
}
