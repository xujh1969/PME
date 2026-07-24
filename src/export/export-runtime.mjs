import { buildMindMapStaticSvg, getStaticMindMapDimensions } from "../core/mindmap-data.mjs";

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
  document.querySelectorAll('.pdf-print-frame').forEach(f => f.remove());
  
  const frame = document.createElement("iframe");
  frame.className = "pdf-print-frame";
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "absolute";
  frame.style.top = "-9999px";
  frame.style.width = "100%";
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument || frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    frame.remove();
    onPrintError?.();
    return;
  }

  let printed = false;
  const cleanup = () => {
    try {
      frame.remove();
    } catch (e) {}
  };

  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch (e) {
      cleanup();
      onPrintError?.();
    }
  };

  frameWindow.onafterprint = cleanup;
  window.setTimeout(cleanup, 10000);
  
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  
  frame.onload = () => {
    frameWindow.setTimeout(doPrint, 500);
  };
  
  frameWindow.setTimeout(doPrint, 1000);
}

export function waitForNextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function waitForMilliseconds(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function getPrintableDocumentHtml(doc, { inlineImages = true } = {}) {
  const documentElement = document.querySelector("#tiptapEditor .ProseMirror");
  if (!documentElement) {
    return "";
  }

  const clone = documentElement.cloneNode(true);
  clone.querySelectorAll(".mermaid-diagram__controls").forEach((element) => element.remove());
  clone.querySelectorAll(".ProseMirror-selectednode").forEach((element) => {
    element.classList.remove("ProseMirror-selectednode");
  });
  await prepareMermaidDiagramsForPrint(clone);
  await prepareMindMapsForPrint(clone);
  cleanupMathElementsForPrint(clone);
  if (inlineImages) {
    await inlinePrintableImages(clone);
  }
  if (doc) {
    renderTableOfContentsForPrint(clone, doc);
  }
  return clone.innerHTML;
}

async function prepareMermaidDiagramsForPrint(root) {
  const diagrams = root.querySelectorAll(".mermaid-diagram");
  const promises = [];

  diagrams.forEach((diagram) => {
    const viewport = diagram.querySelector(".mermaid-diagram__viewport");
    const content = diagram.querySelector(".mermaid-diagram__content");
    const svg = content?.querySelector("svg");

    if (viewport) {
      viewport.style.height = "auto";
      viewport.style.overflow = "visible";
      viewport.style.transform = "none";
    }

    if (content) {
      content.style.width = "100%";
      content.style.minWidth = "0";
      content.style.transform = "none";
    }

    if (svg) {
      const promise = new Promise((resolve) => {
        const pageMaxWidth = 600;
        const pageMaxHeight = 760;
        const {
          sourceWidth: svgWidth,
          sourceHeight: svgHeight,
          targetWidth,
          targetHeight,
        } = getSvgPrintDimensions(svg, pageMaxWidth, pageMaxHeight);

        if (!svg.getAttribute("viewBox")) {
          svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
        }

        const dpr = 2;

        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = targetWidth * dpr;
          canvas.height = targetHeight * dpr;
          ctx.scale(dpr, dpr);

          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);

          const img = new Image();
          const timeout = setTimeout(() => {
            URL.revokeObjectURL(url);
            fallbackToSvg(svg, content, svgWidth, svgHeight, pageMaxWidth, pageMaxHeight);
            resolve();
          }, 5000);

          img.onload = () => {
            clearTimeout(timeout);
            try {
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
              URL.revokeObjectURL(url);

              const dataUrl = canvas.toDataURL("image/png");
              const imgElement = document.createElement("img");
              imgElement.src = dataUrl;
              imgElement.setAttribute("width", targetWidth);
              imgElement.setAttribute("height", targetHeight);
              imgElement.style.width = `${targetWidth}px`;
              imgElement.style.maxWidth = "100%";
              imgElement.style.height = "auto";
              imgElement.style.borderRadius = "8px";

              content.innerHTML = "";
              content.appendChild(imgElement);
            } catch {
              fallbackToSvg(svg, content, svgWidth, svgHeight, pageMaxWidth, pageMaxHeight);
            }
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            fallbackToSvg(svg, content, svgWidth, svgHeight, pageMaxWidth, pageMaxHeight);
            resolve();
          };
          img.src = url;
        } catch {
          fallbackToSvg(svg, content, svgWidth, svgHeight, pageMaxWidth, pageMaxHeight);
          resolve();
        }
      });
      promises.push(promise);
    }
  });

  await Promise.all(promises);
}

export async function prepareMindMapsForPrint(root) {
  const maps = root.querySelectorAll(".mindmap-diagram");
  maps.forEach((map) => {
    const dragToggle = map.querySelector(".mindmap-diagram__drag-toggle");
    if (dragToggle) {
      dragToggle.remove();
    }
    const content = map.querySelector(".mindmap-diagram__content");
    if (!content) return;

    try {
      const staticMap = buildMindMapStaticSvg(map.dataset.mindmap || "");
      const dimensions = getStaticMindMapDimensions(
        { width: staticMap.width, height: staticMap.height },
        600,
        760,
      );
      const encoded = encodeURIComponent(staticMap.svg)
        .replaceAll("'", "%27")
        .replaceAll('"', "%22");
      const image = document.createElement("img");
      image.src = `data:image/svg+xml;charset=utf-8,${encoded}`;
      image.setAttribute("width", String(dimensions.targetWidth));
      image.setAttribute("height", String(dimensions.targetHeight));
      image.style.width = `${dimensions.targetWidth}px`;
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      image.style.margin = "0 auto";
      image.style.display = "block";
      content.innerHTML = "";
      content.appendChild(image);
    } catch (error) {
      console.warn("Failed to export mind map", error);
      const message = error instanceof Error ? error.message : "Mind map export failed";
      content.innerHTML = `<div class="mindmap-diagram__error">${escapeHtml(message)}</div>`;
    }
  });
}

export function getSvgPrintDimensions(svg, maxWidth, maxHeight = Number.POSITIVE_INFINITY) {
  const viewBox = parseSvgViewBox(svg.getAttribute("viewBox"));
  const sourceWidth = getSvgLength(svg.getAttribute("width")) || getSvgLength(svg.style.width) || viewBox?.width || 800;
  const sourceHeight = getSvgLength(svg.getAttribute("height")) || getSvgLength(svg.style.height) || viewBox?.height || 600;
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);

  return {
    sourceWidth,
    sourceHeight,
    targetWidth: Math.round(sourceWidth * scale),
    targetHeight: Math.round(sourceHeight * scale),
  };
}

function parseSvgViewBox(value) {
  if (!value) {
    return null;
  }

  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  return {
    width: parts[2],
    height: parts[3],
  };
}

function getSvgLength(value) {
  if (!value || String(value).includes("%")) {
    return 0;
  }

  const length = Number.parseFloat(value);
  return Number.isFinite(length) && length > 0 ? length : 0;
}

function fallbackToSvg(svg, content, svgWidth, svgHeight, maxWidth, maxHeight = Number.POSITIVE_INFINITY) {
  if (!svg.getAttribute("viewBox")) {
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  }

  const scale = Math.min(1, maxWidth / svgWidth, maxHeight / svgHeight);
  const targetWidth = Math.round(svgWidth * scale);
  const targetHeight = Math.round(svgHeight * scale);

  svg.setAttribute("width", targetWidth.toString());
  svg.setAttribute("height", targetHeight.toString());
  svg.style.width = `${targetWidth}px`;
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  svg.style.transform = "none";

  content.innerHTML = "";
  content.appendChild(svg);
}

function cleanupMathElementsForPrint(root) {
  root.querySelectorAll(".tiptap-mathematics-render").forEach((mathElement) => {
    const katexDisplayElement = mathElement.querySelector(".katex-display");
    const katexElement = mathElement.querySelector(".katex");
    
    if (katexDisplayElement) {
      mathElement.innerHTML = "";
      mathElement.appendChild(katexDisplayElement.cloneNode(true));
    } else if (katexElement) {
      mathElement.innerHTML = "";
      mathElement.appendChild(katexElement.cloneNode(true));
    } else {
      const katexError = mathElement.querySelector(".katex-error");
      if (katexError) {
        mathElement.innerHTML = "";
        mathElement.appendChild(katexError.cloneNode(true));
      } else {
        mathElement.innerHTML = "";
      }
    }
    
    mathElement.setAttribute("data-type", mathElement.dataset.type || "inline-math");
  });
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
