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

export function getVideoIntrinsicWidth(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => {
      resolve(null);
    }, 5000);

    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      resolve(video.videoWidth || null);
    };
    video.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    video.src = src;
  });
}
