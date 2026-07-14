export async function loadLocalImageResource(source) {
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke("read_binary_file_path", { filePath: source });
  
  let mimeType = result.mimeType || "application/octet-stream";
  if (mimeType === "application/octet-stream") {
    const ext = source.split(".").pop().toLowerCase();
    const mimeTypes = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
    };
    if (mimeTypes[ext]) {
      mimeType = mimeTypes[ext];
    }
  }
  
  return new Blob([new Uint8Array(result.bytes)], { type: mimeType });
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printPdfHtml(html, onPrintError) {
  const frame = document.createElement("iframe");
  frame.className = "pdf-print-frame";
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument || frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    frame.remove();
    onPrintError?.();
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  frameWindow.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  }, 250);
}

export function waitForNextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function waitForMilliseconds(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function getPrintableDocumentHtml(doc) {
  const documentElement = document.querySelector("#tiptapEditor .ProseMirror");
  if (!documentElement) {
    return "";
  }

  const clone = documentElement.cloneNode(true);
  clone.querySelectorAll(".mermaid-diagram__controls").forEach((element) => element.remove());
  clone.querySelectorAll(".ProseMirror-selectednode").forEach((element) => {
    element.classList.remove("ProseMirror-selectednode");
  });
  await inlinePrintableImages(clone);
  if (doc) {
    renderTableOfContentsForPrint(clone, doc);
  }
  return clone.innerHTML;
}

function renderTableOfContentsForPrint(root, doc) {
  const tocElements = root.querySelectorAll(".table-of-contents");
  if (tocElements.length === 0) return;

  const items = getTableOfContentsItems(doc);
  if (items.length === 0) return;

  const itemsHtml = items.map((item) => {
    const indent = (item.level - 1) * 18;
    return `<div class="table-of-contents__item" style="padding-left: ${indent + 6}px;">${escapeHtml(item.text)}</div>`;
  }).join("");

  const tocHtml = `<div class="table-of-contents__title">目录</div><div class="table-of-contents__list">${itemsHtml}</div>`;

  tocElements.forEach((toc) => {
    toc.innerHTML = tocHtml;
  });
}

function getTableOfContentsItems(doc) {
  const items = [];

  doc?.content?.forEach?.((node) => {
    if (node.type?.name !== "heading" && node.type !== "heading") {
      return;
    }

    const text = getNodeText(node).trim();
    if (!text) {
      return;
    }

    items.push({
      index: items.length,
      level: node.attrs?.level || 1,
      text,
    });
  });

  return items;
}

function getNodeText(node) {
  if (node.text) {
    return node.text;
  }

  if (typeof node.childCount === "number" && typeof node.child === "function") {
    let text = "";
    for (let index = 0; index < node.childCount; index += 1) {
      text += getNodeText(node.child(index));
    }
    return text;
  }

  return (node.content || []).map(getNodeText).join("");
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

async function inlinePrintableImages(root) {
  await Promise.all([...root.querySelectorAll("img")].map(async (image) => {
    const src = image.getAttribute("src");
    if (!src || src.startsWith("data:")) {
      return;
    }
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      image.setAttribute("src", await blobToDataUrl(blob));
    } catch (error) {
      console.warn("Failed to inline image for PDF export", error);
    }
  }));
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}
