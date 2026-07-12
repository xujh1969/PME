export async function loadLocalImageResource(source) {
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke("read_binary_file_path", { filePath: source });
  return new Blob([new Uint8Array(result.bytes)], { type: result.mimeType || "application/octet-stream" });
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

export async function getPrintableDocumentHtml() {
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
  return clone.innerHTML;
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
