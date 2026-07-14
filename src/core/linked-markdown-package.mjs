import { strToU8 } from "fflate";

import { parseMarkdown, serializeMarkdown } from "./markdown.mjs";
import {
  buildPackagedImageName,
  buildPackagedVideoName,
  collectImageNodes,
  collectVideoNodes,
  isLocalAbsolutePath,
  normalizeDocumentResourcePath,
} from "./package-resources.mjs";

export async function collectLinkedMarkdownPackage({
  rootDoc,
  rootName,
  rootSourcePath,
  loadText,
  loadImageResource,
}) {
  const entries = {};
  const missing = [];
  const documentPaths = new Map();
  const visited = new Set();
  const imagePaths = new Map();
  const videoPaths = new Map();
  let imageIndex = 1;
  let videoIndex = 1;

  if (rootSourcePath) {
    documentPaths.set(canonicalPath(rootSourcePath), rootName);
  }

  async function packageImages(doc, sourcePath) {
    for (const node of collectImageNodes(doc)) {
      const original = node.attrs?.assetSrc || node.attrs?.src;
      if (!original) continue;
      const source = resolveResourcePath(original, sourcePath);

      if (!imagePaths.has(source)) {
        try {
          const blob = await loadImageResource(source);
          const assetPath = `assets/${buildPackagedImageName(source, blob.type, imageIndex)}`;
          imageIndex += 1;
          entries[assetPath] = new Uint8Array(await blob.arrayBuffer());
          imagePaths.set(source, assetPath);
        } catch {
          missing.push(source);
          continue;
        }
      }

      node.attrs.assetSrc = imagePaths.get(source);
      node.attrs.src = imagePaths.get(source);
    }
  }

  async function packageVideos(doc, sourcePath) {
    for (const node of collectVideoNodes(doc)) {
      const original = node.attrs?.assetSrc || node.attrs?.src;
      if (!original) continue;
      const source = resolveResourcePath(original, sourcePath);

      if (!videoPaths.has(source)) {
        try {
          const blob = await loadImageResource(source);
          const assetPath = `assets/${buildPackagedVideoName(source, blob.type, videoIndex)}`;
          videoIndex += 1;
          entries[assetPath] = new Uint8Array(await blob.arrayBuffer());
          videoPaths.set(source, assetPath);
        } catch {
          missing.push(source);
          continue;
        }
      }

      node.attrs.assetSrc = videoPaths.get(source);
      node.attrs.src = videoPaths.get(source);
    }
  }

  async function visit(doc, sourcePath, packagePath) {
    const sourceKey = sourcePath ? canonicalPath(sourcePath) : packagePath;
    if (visited.has(sourceKey)) return;
    visited.add(sourceKey);

    for (const mark of collectLinkMarks(doc)) {
      const href = mark.attrs?.href || "";
      const { path, suffix } = splitLinkTarget(href);
      if (!isLocalMarkdownPath(path)) continue;

      const resolvedPath = resolveResourcePath(path, sourcePath);
      const key = canonicalPath(resolvedPath);
      let linkedPackagePath = documentPaths.get(key);

      if (!linkedPackagePath) {
        linkedPackagePath = buildDocumentPackagePath(resolvedPath);
        documentPaths.set(key, linkedPackagePath);
        try {
          const markdown = await loadText(resolvedPath);
          const linkedDoc = parseMarkdown(markdown);
          await visit(linkedDoc, resolvedPath, linkedPackagePath);
        } catch {
          documentPaths.delete(key);
          missing.push(resolvedPath);
          continue;
        }
      }

      mark.attrs.href = relativePackagePath(packagePath, linkedPackagePath) + suffix;
    }

    await packageImages(doc, sourcePath);
    await packageVideos(doc, sourcePath);
    entries[packagePath] = strToU8(serializeMarkdown(doc, { basePath: packagePath }));
  }

  await visit(structuredClone(rootDoc), rootSourcePath, rootName);
  return { entries, missing };
}

export function collectLocalMarkdownLinkTargets(doc) {
  return collectLinkMarks(doc)
    .map((mark) => splitLinkTarget(mark.attrs?.href || "").path)
    .filter(isLocalMarkdownPath);
}

function collectLinkMarks(node, output = []) {
  for (const mark of node?.marks || []) {
    if (mark.type === "link") output.push(mark);
  }
  for (const child of node?.content || []) {
    collectLinkMarks(child, output);
  }
  return output;
}

function splitLinkTarget(href) {
  const indexes = [href.indexOf("?"), href.indexOf("#")].filter((index) => index >= 0);
  const splitAt = indexes.length ? Math.min(...indexes) : href.length;
  return { path: href.slice(0, splitAt), suffix: href.slice(splitAt) };
}

function isLocalMarkdownPath(path) {
  return Boolean(path) && !/^[a-z][a-z0-9+.-]*:/i.test(path.replace(/^[a-zA-Z]:[\\/]/, ""))
    && /\.(md|markdown)$/i.test(path);
}

function resolveResourcePath(path, sourcePath) {
  if (/^(https?:|data:|blob:)/i.test(path) || isLocalAbsolutePath(path) || !sourcePath) {
    return canonicalPath(path);
  }
  return canonicalPath(normalizeDocumentResourcePath(path, canonicalPath(sourcePath)));
}

function canonicalPath(path) {
  const normalized = String(path).replaceAll("\\", "/");
  const prefix = normalized.match(/^[a-zA-Z]:/)?.[0] || (normalized.startsWith("/") ? "/" : "");
  const body = prefix === "/" ? normalized.slice(1) : normalized.slice(prefix.length);
  const parts = [];
  for (const part of body.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `${prefix}${prefix && prefix !== "/" ? "/" : ""}${parts.join("/")}`;
}

function buildDocumentPackagePath(source) {
  const fileName = source.split("/").at(-1) || "document.md";
  const extension = fileName.toLowerCase().endsWith(".markdown") ? ".markdown" : ".md";
  const base = fileName.replace(/\.(md|markdown)$/i, "")
    .replace(/[\\/:*?"<>|#%&{}$!'@+=`]/g, "_")
    .trim()
    .slice(0, 40) || "document";
  return `documents/${base}-${shortHash(canonicalPath(source))}${extension}`;
}

function shortHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

function relativePackagePath(from, to) {
  const fromParts = from.split("/").slice(0, -1);
  const toParts = to.split("/");
  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return [...fromParts.map(() => ".."), ...toParts].join("/") || ".";
}
