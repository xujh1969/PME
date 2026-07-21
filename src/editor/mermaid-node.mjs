import { Node } from "@tiptap/core";
import mermaid from "mermaid";
import { escapeHtml } from "../core/html-utils.mjs";

let mermaidRenderId = 0;

function getMermaidThemeVariables() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  if (theme === "dark") {
    return {
      darkMode: true,
      background: "#1e1e1e",
      fontFamily: "'Inter', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, sans-serif",
      primaryColor: "#2d2d30",
      primaryTextColor: "#e4e4e7",
      primaryBorderColor: "#4a4a4f",
      secondaryColor: "#37373d",
      secondaryTextColor: "#e4e4e7",
      secondaryBorderColor: "#4a4a4f",
      tertiaryColor: "#37373d",
      tertiaryTextColor: "#e4e4e7",
      tertiaryBorderColor: "#4a4a4f",
      lineColor: "#52525b",
      nodeBorder: "#4a4a4f",
      edgeColor: "#52525b",
      signalColor: "#52525b",
      textColor: "#e4e4e7",
    };
  }
  return {
    darkMode: false,
    background: "#f5f5f5",
    fontFamily: "'Inter', 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, sans-serif",
    primaryColor: "#ffffff",
    primaryTextColor: "#1f2937",
    primaryBorderColor: "#d1d5db",
    secondaryColor: "#f9fafb",
    secondaryTextColor: "#1f2937",
    secondaryBorderColor: "#d1d5db",
    tertiaryColor: "#f3f4f6",
    tertiaryTextColor: "#1f2937",
    tertiaryBorderColor: "#d1d5db",
    lineColor: "#6b7280",
    nodeBorder: "#d1d5db",
    edgeColor: "#6b7280",
    signalColor: "#6b7280",
    textColor: "#1f2937",
  };
}

function initMermaidTheme() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: getMermaidThemeVariables(),
  });
}

function wrapMermaidCodeWithTheme(code) {
  const variables = getMermaidThemeVariables();
  const safeVariables = { ...variables };
  if (safeVariables.fontFamily) {
    safeVariables.fontFamily = safeVariables.fontFamily.replace(/', '/g, ' ').replace(/['"]/g, '');
  }
  const initConfig = {
    theme: "base",
    themeVariables: safeVariables,
  };
  return `%%{init: ${JSON.stringify(initConfig)}}%%\n${code}`;
}

initMermaidTheme();

export async function updateMermaidTheme() {
  try {
    mermaid.reset();
    initMermaidTheme();
    const diagrams = document.querySelectorAll(".mermaid-diagram__content");
    for (const element of diagrams) {
      const diagram = element.closest(".mermaid-diagram");
      if (diagram && diagram.dataset.code) {
        element.textContent = "";
        await renderMermaidDiagram(element, diagram.dataset.code);
      }
    }
  } catch (error) {
    console.error("Failed to update Mermaid theme:", error);
  }
}

export const MermaidDiagram = Node.create({
  name: "mermaidDiagram",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: {
        default: "graph TD\n  A-->B",
        parseHTML: (element) => element.getAttribute("data-code") || "",
        renderHTML: (attributes) => ({ "data-code": attributes.code }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid-diagram"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "mermaid-diagram" }];
  },

  addCommands() {
    return {
      insertMermaidDiagram: (options) => ({ commands }) => (
        commands.insertContent({ type: this.name, attrs: { code: options.code } })
      ),
      updateMermaidDiagram: (options) => ({ tr }) => {
        tr.setNodeMarkup(options.pos, this.type, { code: options.code });
        return true;
      },
      deleteMermaidDiagram: (options) => ({ tr, editor: currentEditor }) => {
        const node = currentEditor.state.doc.nodeAt(options.pos);
        if (!node || node.type.name !== this.name) {
          return false;
        }
        tr.delete(options.pos, options.pos + node.nodeSize);
        return true;
      },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement("div");
      const controls = document.createElement("div");
      const viewport = document.createElement("div");
      const diagram = document.createElement("div");
      const zoomOut = createMermaidZoomButton("-", "Zoom out");
      const zoomLevel = createMermaidZoomButton("100%", "Fit to frame");
      const zoomIn = createMermaidZoomButton("+", "Zoom in");
      let zoom = 1;

      wrapper.className = "mermaid-diagram";
      wrapper.dataset.type = "mermaid-diagram";
      wrapper.dataset.code = node.attrs.code;
      controls.className = "mermaid-diagram__controls";
      viewport.className = "mermaid-diagram__viewport";
      diagram.className = "mermaid-diagram__content";
      controls.append(zoomOut, zoomLevel, zoomIn);
      wrapper.appendChild(controls);
      viewport.appendChild(diagram);
      wrapper.appendChild(viewport);

      const setZoom = (nextZoom, resetScroll = false) => {
        zoom = Math.min(2.5, Math.max(0.1, nextZoom));
        zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
        applyMermaidZoom(diagram, zoom);
        const fitZoom = getMermaidFitZoom(viewport, diagram);
        fitMermaidViewportHeight(viewport, diagram, Math.min(zoom, fitZoom), zoom);
        if (resetScroll) {
          viewport.scrollLeft = 0;
          viewport.scrollTop = 0;
        }
      };

      const fitToFrame = () => {
        requestAnimationFrame(() => {
          setZoom(getMermaidFitZoom(viewport, diagram), true);
        });
      };

      zoomOut.addEventListener("click", () => setZoom(zoom - 0.1));
      zoomLevel.addEventListener("click", fitToFrame);
      zoomIn.addEventListener("click", () => setZoom(zoom + 0.1));

      bindMermaidPan(viewport, wrapper);
      renderMermaidDiagram(diagram, node.attrs.code).then(fitToFrame);
      return {
        dom: wrapper,
        stopEvent: (event) => Boolean(event.target.closest?.(".mermaid-diagram__controls")),
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          wrapper.dataset.code = updatedNode.attrs.code;
          renderMermaidDiagram(diagram, updatedNode.attrs.code).then(fitToFrame);
          return true;
        },
      };
    };
  },
});

async function renderMermaidDiagram(element, code) {
  const id = `pme-mermaid-${mermaidRenderId}`;
  mermaidRenderId += 1;

  try {
    element.textContent = "";
    const themedCode = wrapMermaidCodeWithTheme(code);
    const { svg } = await mermaid.render(id, themedCode);
    
    element.innerHTML = svg;
    const renderedSvg = element.querySelector("svg");
    if (renderedSvg) {
      applyMermaidSvgThemeFallback(renderedSvg);
      renderedSvg.style.setProperty("max-width", "none", "important");
    }
    element.closest(".mermaid-diagram")?.classList.remove("mermaid-diagram--error");
  } catch (error) {
    console.error("Mermaid rendering error:", error);
    mermaid.reset();
    initMermaidTheme();
    element.innerHTML = `<div class="mermaid-diagram__error">
      <div class="mermaid-diagram__error-icon">⚠</div>
      <div class="mermaid-diagram__error-message">${escapeHtml(error.message || "Mermaid 图表渲染错误")}</div>
    </div>`;
    element.closest(".mermaid-diagram")?.classList.add("mermaid-diagram--error");
  }
}



function applyMermaidSvgThemeFallback(svg) {
  const variables = getMermaidThemeVariables();

  svg.querySelectorAll(".node rect, .node circle, .node ellipse, .node polygon, .node path").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.primaryColor);
    setMermaidSvgPaint(element, "stroke", variables.primaryBorderColor);
  });

  svg.querySelectorAll(".flowchart-link, .messageLine0, .messageLine1, .relation").forEach((element) => {
    setMermaidSvgPaint(element, "fill", "none");
    setMermaidSvgPaint(element, "stroke", variables.lineColor);
  });

  svg.querySelectorAll("marker path").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.lineColor);
    setMermaidSvgPaint(element, "stroke", variables.lineColor);
  });

  svg.querySelectorAll("text, tspan").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.textColor);
  });

  svg.querySelectorAll(".nodeLabel, .edgeLabel, .label, foreignObject span, foreignObject div").forEach((element) => {
    element.style.color = variables.primaryTextColor;
  });
}

function setMermaidSvgPaint(element, property, value) {
  element.setAttribute(property, value);
  element.style.setProperty(property, value, "important");
}

function createMermaidZoomButton(label, title) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
}

function applyMermaidZoom(element, zoom) {
  const svg = element.querySelector("svg");
  if (!svg) {
    return;
  }

  const baseSize = getSvgBaseSize(svg);
  if (baseSize.width) {
    svg.style.width = `${Math.round(baseSize.width * zoom)}px`;
  }
  svg.style.maxWidth = "none";
  svg.style.height = "auto";
}

function getMermaidFitZoom(viewport, element) {
  const svg = element.querySelector("svg");
  if (!svg) {
    return 1;
  }

  const baseSize = getSvgBaseSize(svg);
  if (!baseSize.width || !baseSize.height) {
    return 1;
  }

  if (viewport.clientWidth < 50) {
    return 1;
  }

  const style = getComputedStyle(viewport);
  const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  const availableWidth = Math.max(1, viewport.clientWidth - horizontalPadding);
  const scrollbarAllowance = 18;
  const fitZoom = Math.min(1, (availableWidth - scrollbarAllowance) / baseSize.width);
  return Math.max(0.1, fitZoom * 0.98);
}

function fitMermaidViewportHeight(viewport, element, heightZoom, renderedZoom = heightZoom) {
  const svg = element.querySelector("svg");
  if (!svg) {
    return;
  }

  const baseSize = getSvgBaseSize(svg);
  if (!baseSize.height || !renderedZoom) {
    return;
  }

  const style = getComputedStyle(viewport);
  const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  const borderHeight = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);
  const renderedHeight = element.getBoundingClientRect().height;
  const scaledHeight = Math.ceil(renderedHeight * heightZoom / renderedZoom);
  const heightAllowance = 6;
  viewport.style.height = `${scaledHeight + verticalPadding + borderHeight + heightAllowance}px`;
}

function getSvgBaseSize(svg) {
  const viewBoxWidth = svg.viewBox?.baseVal?.width;
  const viewBoxHeight = svg.viewBox?.baseVal?.height;
  if (viewBoxWidth && viewBoxHeight) {
    return { width: viewBoxWidth, height: viewBoxHeight };
  }

  const width = Number.parseFloat(svg.getAttribute("width") || "");
  const height = Number.parseFloat(svg.getAttribute("height") || "");
  if (width && height) {
    return { width, height };
  }

  const rect = svg.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
  };
}

function bindMermaidPan(viewport, wrapper) {
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;
  let isPanning = false;

  const movePanning = (event) => {
    if (!isPanning) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      wrapper.dataset.suppressEdit = "true";
    }
    viewport.scrollLeft = scrollLeft - deltaX;
    viewport.scrollTop = scrollTop - deltaY;
  };

  const stopPanning = (event) => {
    if (!isPanning) {
      return;
    }

    isPanning = false;
    viewport.classList.remove("is-panning");
    window.removeEventListener("pointermove", movePanning);
    window.removeEventListener("pointerup", stopPanning);
    window.removeEventListener("pointercancel", stopPanning);
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      delete wrapper.dataset.suppressEdit;
    }, 0);
  };

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest?.(".mermaid-diagram__controls")) {
      return;
    }

    event.preventDefault();
    isPanning = true;
    startX = event.clientX;
    startY = event.clientY;
    scrollLeft = viewport.scrollLeft;
    scrollTop = viewport.scrollTop;
    viewport.classList.add("is-panning");
    viewport.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", movePanning);
    window.addEventListener("pointerup", stopPanning);
    window.addEventListener("pointercancel", stopPanning);
  });
}
