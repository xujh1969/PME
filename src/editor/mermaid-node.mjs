import { Node } from "@tiptap/core";
import mermaid from "mermaid";

let mermaidRenderId = 0;

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
});

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
    const { svg } = await mermaid.render(id, code);
    element.innerHTML = svg;
    element.closest(".mermaid-diagram")?.classList.remove("mermaid-diagram--error");
  } catch (error) {
    element.textContent = error.message || "Invalid Mermaid diagram";
    element.closest(".mermaid-diagram")?.classList.add("mermaid-diagram--error");
  }
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

