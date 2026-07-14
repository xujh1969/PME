import {
  isLocalAbsolutePath,
  normalizeDocumentResourcePath,
} from "./package-resources.mjs";

export async function loadImageResource(source, options = {}) {
  const {
    files = {},
    fetchResource = fetch,
    isTauri = false,
    loadLocalImageResource = null,
    selectedPath = "",
  } = options;

  if (source.startsWith("data:") || source.startsWith("blob:") || /^https?:\/\//i.test(source)) {
    const response = await fetchResource(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const allowedTypes = ["image/", "video/", "application/octet-stream"];
    if (!allowedTypes.some(type => blob.type.startsWith(type))) {
      throw new Error("Not an image or video");
    }
    return blob;
  }

  if (isLocalAbsolutePath(source) && isTauri && loadLocalImageResource) {
    return loadLocalImageResource(source);
  }

  const normalized = normalizeDocumentResourcePath(source, selectedPath);
  const preview = files[normalized] || files[source];
  if (!preview) {
    throw new Error("Resource unavailable");
  }
  const response = await fetchResource(preview);
  return response.blob();
}
