import { getClipboardHtmlImageUrlFromHtml } from "../core/clipboard-image.mjs";

export function getClipboardHtmlImageUrl(clipboardData) {
  const html = clipboardData?.getData?.("text/html") || "";
  return getClipboardHtmlImageUrlFromHtml(html, decodeHtmlEntities);
}

export function decodeHtmlEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function getImageIntrinsicWidth(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image.naturalWidth || null);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
