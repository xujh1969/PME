import { isSupportedImageName } from "./assets.mjs";

export function isLocalAbsolutePath(path) {
  if (!path || typeof path !== "string") {
    return false;
  }
  return /^[a-zA-Z]:[\\/]/.test(path) || path.startsWith("/") || path.startsWith("\\\\");
}

export function normalizeDocumentResourcePath(resourcePath, basePath) {
  if (!resourcePath || !basePath) {
    return resourcePath;
  }
  if (resourcePath.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(resourcePath)) {
    return resourcePath;
  }

  const driveMatch = basePath.match(/^([A-Za-z]:)/);
  const drive = driveMatch ? driveMatch[1] : "";
  
  const normalizedBasePath = basePath.replace(/^[A-Za-z]:/, "").replace(/\\/g, "/");
  const normalizedResourcePath = resourcePath.replace(/\\/g, "/");

  const baseDirectory = normalizedBasePath.startsWith("/") 
    ? normalizedBasePath.slice(1).split("/").slice(0, -1)
    : normalizedBasePath.includes("/")
      ? normalizedBasePath.split("/").slice(0, -1)
      : [];
  
  const normalized = [];
  for (const part of [...baseDirectory, ...normalizedResourcePath.split("/")]) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      normalized.pop();
    } else {
      normalized.push(part);
    }
  }
  const path = normalized.join("/");
  return drive ? drive + "/" + path : path;
}

export function buildPackagedImageName(source, mimeType, index) {
  const extension = getPackagedImageExtension(source, mimeType);
  const baseName = getPackagedImageBaseName(source) || `image${String(index).padStart(3, "0")}`;
  return `${String(index).padStart(3, "0")}-${baseName}.${extension}`;
}

export async function packageImageNodes(imageNodes, loadImageResource) {
  const entries = {};
  const missing = [];
  const sourceToAsset = new Map();
  let imageIndex = 1;

  for (const node of imageNodes) {
    const source = node.attrs?.assetSrc || node.attrs?.src;
    if (!source) {
      continue;
    }
    if (sourceToAsset.has(source)) {
      node.attrs.assetSrc = sourceToAsset.get(source);
      node.attrs.src = sourceToAsset.get(source);
      continue;
    }

    try {
      const blob = await loadImageResource(source);
      const assetPath = `assets/${buildPackagedImageName(source, blob.type, imageIndex)}`;
      imageIndex += 1;
      entries[assetPath] = new Uint8Array(await blob.arrayBuffer());
      sourceToAsset.set(source, assetPath);
      node.attrs.assetSrc = assetPath;
      node.attrs.src = assetPath;
    } catch {
      missing.push(source);
    }
  }

  return { entries, missing };
}

export function collectImageNodes(node, output = []) {
  if (node?.type === "image") {
    output.push(node);
  }
  for (const child of node?.content || []) {
    collectImageNodes(child, output);
  }
  return output;
}

export function collectVideoNodes(node, output = []) {
  if (node?.type === "video") {
    output.push(node);
  }
  for (const child of node?.content || []) {
    collectVideoNodes(child, output);
  }
  return output;
}

export async function packageVideoNodes(videoNodes, loadResource) {
  const entries = {};
  const missing = [];
  const sourceToAsset = new Map();
  let videoIndex = 1;

  for (const node of videoNodes) {
    const source = node.attrs?.assetSrc || node.attrs?.src;
    if (!source) {
      continue;
    }
    if (sourceToAsset.has(source)) {
      node.attrs.assetSrc = sourceToAsset.get(source);
      node.attrs.src = sourceToAsset.get(source);
      continue;
    }

    try {
      const blob = await loadResource(source);
      const assetPath = `assets/${buildPackagedVideoName(source, blob.type, videoIndex)}`;
      videoIndex += 1;
      entries[assetPath] = new Uint8Array(await blob.arrayBuffer());
      sourceToAsset.set(source, assetPath);
      node.attrs.assetSrc = assetPath;
      node.attrs.src = assetPath;
    } catch {
      missing.push(source);
    }
  }

  return { entries, missing };
}

export function buildPackagedVideoName(source, mimeType, index) {
  const extension = getPackagedVideoExtension(source, mimeType);
  const baseName = getPackagedVideoBaseName(source) || `video${String(index).padStart(3, "0")}`;
  return `${String(index).padStart(3, "0")}-${baseName}.${extension}`;
}

export function getPackagedVideoBaseName(source) {
  try {
    const pathname = /^https?:\/\//i.test(source) ? new URL(source).pathname : source;
    return getFileName(pathname)
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|#%&{}$!'@+=`]/g, "_")
      .trim()
      .slice(0, 40);
  } catch {
    return "";
  }
}

export function getPackagedVideoExtension(source, mimeType = "") {
  const sourceExtension = source.split(/[?#]/)[0].split(".").at(-1)?.toLowerCase();
  const supportedExtensions = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
  if (sourceExtension && supportedExtensions.includes(sourceExtension)) {
    return sourceExtension;
  }
  return mimeType.split("/")[1] || "mp4";
}

export function getPackagedImageBaseName(source) {
  try {
    const pathname = /^https?:\/\//i.test(source) ? new URL(source).pathname : source;
    return getFileName(pathname)
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|#%&{}$!'@+=`]/g, "_")
      .trim()
      .slice(0, 40);
  } catch {
    return "";
  }
}

export function getPackagedImageExtension(source, mimeType = "") {
  const sourceExtension = source.split(/[?#]/)[0].split(".").at(-1)?.toLowerCase();
  if (sourceExtension && isSupportedImageName(`image.${sourceExtension}`)) {
    return sourceExtension === "jpeg" ? "jpg" : sourceExtension;
  }
  return (mimeType.split("/")[1] || "png")
    .replace("jpeg", "jpg")
    .replace("svg+xml", "svg");
}

function getFileName(path) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) || "";
}
