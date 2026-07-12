const SUPPORTED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

export function isSupportedImageName(fileName) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(getImageExtension(fileName));
}

export function getImageExtension(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
}

export function createImageAsset({ originalName, now = new Date(), id = createShortId() }) {
  const extension = getImageExtension(originalName);
  const timestamp = formatTimestamp(now);

  return {
    alt: getBaseName(originalName),
    originalName,
    assetPath: `assets/asset_${timestamp}_${id}.${extension}`,
  };
}

export function getImageFilesFromFileList(files = []) {
  return [...files].filter((file) => (
    file.type?.startsWith("image/") || isSupportedImageName(file.name || "")
  ));
}

export function getImageFilesFromItems(items = []) {
  return [...items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
}

export function hasImageFileItem(items = []) {
  return [...items].some((item) => item.kind === "file" && item.type.startsWith("image/"));
}

export async function getBlobFingerprint(blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getNetworkImageName(url, mimeType) {
  try {
    const pathName = new URL(url).pathname;
    const name = decodeURIComponent(pathName.split("/").filter(Boolean).at(-1) || "");
    if (isSupportedImageName(name)) {
      return name;
    }
  } catch {
    // Fall through to the MIME fallback.
  }

  const extension = (mimeType.split("/")[1] || "png")
    .replace("jpeg", "jpg")
    .replace("svg+xml", "svg");
  return `network-image.${extension}`;
}

export function resolveInsertedImageAssetPath({ file, generatedAsset, embedDataUrl = false }) {
  if (embedDataUrl) {
    return null;
  }
  if (file.path) {
    return file.path.replace(/\\/g, "/");
  }
  return file.name || generatedAsset.originalName;
}

function getBaseName(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
}

function formatTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function createShortId() {
  return crypto.randomUUID().slice(0, 8);
}
