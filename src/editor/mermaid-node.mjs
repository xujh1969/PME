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
  const initConfig = {
    theme: "base",
    themeVariables: variables,
  };
  return `%%{init: ${JSON.stringify(initConfig)}}%%\n${normalizeMermaidStyleDirectives(code)}`;
}

function normalizeMermaidStyleDirectives(code) {
  return String(code || "").replace(/^(\s*)Style\b/gm, "$1style");
}

function parseMermaidStyleDirectives(code) {
  const directives = [];
  const normalizedCode = normalizeMermaidStyleDirectives(code);
  for (const line of normalizedCode.split(/\r?\n/)) {
    const match = line.match(/^\s*style\s+([^\s]+)\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    const styles = parseMermaidStyleProperties(match[2]);
    if (Object.keys(styles).length) {
      directives.push({ id: match[1], styles });
    }
  }
  return directives;
}

function parseMermaidClassDirectives(code) {
  const classStyles = new Map();
  const directives = [];
  const normalizedCode = normalizeMermaidStyleDirectives(code);

  for (const line of normalizedCode.split(/\r?\n/)) {
    const classDefMatch = line.match(/^\s*classDef\s+([^\s]+)\s+(.+?)\s*$/);
    if (classDefMatch) {
      const styles = parseMermaidStyleProperties(classDefMatch[2]);
      if (Object.keys(styles).length) {
        classStyles.set(classDefMatch[1], styles);
      }
      continue;
    }

    const classMatch = line.match(/^\s*class\s+([^\s]+)\s+([^\s]+)\s*$/);
    if (!classMatch) {
      continue;
    }
    const nodeIds = classMatch[1].split(",").map((id) => id.trim()).filter(Boolean);
    const classNames = classMatch[2].split(",").map((name) => name.trim()).filter(Boolean);
    for (const id of nodeIds) {
      for (const className of classNames) {
        const styles = classStyles.get(className);
        if (styles) {
          directives.push({ id, styles });
        }
      }
    }
  }

  return directives;
}

function parseMermaidStyleProperties(value) {
  const styles = {};
  for (const part of String(value || "").split(",")) {
    const separator = part.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const property = part.slice(0, separator).trim();
    const styleValue = part.slice(separator + 1).trim();
    if (property && styleValue) {
      styles[property] = styleValue;
    }
  }
  return styles;
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
        const scale = normalizeMermaidScale(diagram.dataset.pmeScale);
        if (scale !== null) {
          const viewport = diagram.querySelector(".mermaid-diagram__viewport");
          applyMermaidZoom(element, scale / 100);
          if (viewport) {
            const fitZoom = getMermaidFitZoom(viewport, element);
            fitMermaidViewportHeight(viewport, element, Math.min(scale / 100, fitZoom), scale / 100);
          }
        }
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
      scale: {
        default: null,
        parseHTML: (element) => normalizeMermaidScale(element.getAttribute("data-pme-scale")),
        renderHTML: (attributes) => {
          const scale = normalizeMermaidScale(attributes.scale);
          return scale === null ? {} : { "data-pme-scale": scale };
        },
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
      insertMermaidDiagram: (options = {}) => ({ commands }) => (
        commands.insertContent({
          type: this.name,
          attrs: { code: options.code, scale: normalizeMermaidScale(options.scale) },
        })
      ),
      updateMermaidDiagram: (options) => ({ tr }) => {
        tr.setNodeMarkup(options.pos, this.type, {
          code: options.code,
          scale: normalizeMermaidScale(options.scale),
        });
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
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement("div");
      const controls = document.createElement("div");
      const viewport = document.createElement("div");
      const diagram = document.createElement("div");
      const zoomOut = createMermaidZoomButton("-", "Zoom out");
      const zoomLevel = createMermaidZoomButton("100%", "Fit to frame");
      const zoomIn = createMermaidZoomButton("+", "Zoom in");
      let currentNode = node;
      let zoom = (normalizeMermaidScale(node.attrs.scale) || 100) / 100;

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

      const persistZoom = () => {
        const pos = getPos();
        const scale = Math.round(zoom * 100);
        if (!Number.isInteger(pos) || currentNode.attrs.scale === scale) {
          return;
        }
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          scale,
        }));
      };

      const setZoom = (nextZoom, resetScroll = false, persist = false) => {
        zoom = Math.round(Math.min(2.5, Math.max(0.1, nextZoom)) * 100) / 100;
        const scale = Math.round(zoom * 100);
        zoomLevel.textContent = `${scale}%`;
        wrapper.dataset.pmeScale = String(scale);
        applyMermaidZoom(diagram, zoom);
        const fitZoom = getMermaidFitZoom(viewport, diagram);
        fitMermaidViewportHeight(viewport, diagram, Math.min(zoom, fitZoom), zoom);
        if (resetScroll) {
          viewport.scrollLeft = 0;
          viewport.scrollTop = 0;
        }
        if (persist) {
          persistZoom();
        }
      };

      const fitToFrame = (persist = false) => {
        requestAnimationFrame(() => {
          setZoom(getMermaidFitZoom(viewport, diagram), true, persist);
        });
      };

      const applyStoredZoom = () => {
        const scale = normalizeMermaidScale(currentNode.attrs.scale);
        if (scale === null) {
          fitToFrame();
          return;
        }
        requestAnimationFrame(() => setZoom(scale / 100, true));
      };

      zoomOut.addEventListener("click", () => setZoom(zoom - 0.1, false, true));
      zoomLevel.addEventListener("click", () => fitToFrame(true));
      zoomIn.addEventListener("click", () => setZoom(zoom + 0.1, false, true));

      bindMermaidPan(viewport, wrapper);
      renderMermaidDiagram(diagram, node.attrs.code).then(applyStoredZoom);
      return {
        dom: wrapper,
        stopEvent: (event) => Boolean(event.target.closest?.(".mermaid-diagram__controls")),
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          const codeChanged = updatedNode.attrs.code !== currentNode.attrs.code;
          const scaleChanged = updatedNode.attrs.scale !== currentNode.attrs.scale;
          currentNode = updatedNode;
          wrapper.dataset.code = updatedNode.attrs.code;
          if (codeChanged) {
            renderMermaidDiagram(diagram, updatedNode.attrs.code).then(applyStoredZoom);
          } else if (scaleChanged) {
            setZoom((normalizeMermaidScale(updatedNode.attrs.scale) || 100) / 100);
          }
          return true;
        },
      };
    };
  },
});

function normalizeMermaidScale(scale) {
  const value = Number.parseInt(scale, 10);
  return Number.isFinite(value) ? Math.min(250, Math.max(10, value)) : null;
}

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
      applyMermaidDirectiveStyles(renderedSvg, code);
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

export async function renderMermaidStaticSvg(code) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  document.body.appendChild(container);
  try {
    await renderMermaidDiagram(container, code);
    const svg = container.querySelector("svg");
    if (!svg) {
      throw new Error("Mermaid SVG was not generated.");
    }
    const baseSize = getSvgBaseSize(svg);
    if (!svg.getAttribute("viewBox")) {
      svg.setAttribute("viewBox", `0 0 ${baseSize.width} ${baseSize.height}`);
    }
    return {
      svg: new XMLSerializer().serializeToString(svg),
      width: baseSize.width,
      height: baseSize.height,
    };
  } finally {
    container.remove();
  }
}



function applyMermaidSvgThemeFallback(svg) {
  const variables = getMermaidThemeVariables();

  svg.querySelectorAll(".node rect, .node circle, .node ellipse, .node polygon, .node path, .cluster rect, .cluster path").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.primaryColor);
    setMermaidSvgPaint(element, "stroke", variables.primaryBorderColor);
  });

  svg.querySelectorAll(".flowchart-link, .relation, .edgePath path, .edgeLabel path").forEach((element) => {
    setMermaidSvgPaint(element, "fill", "none");
    setMermaidSvgPaint(element, "stroke", variables.lineColor);
  });

  svg.querySelectorAll(".messageLine0, .messageLine1").forEach((element) => {
    setMermaidSvgPaint(element, "fill", "none");
    setMermaidSequenceLineStroke(element, variables.lineColor);
  });

  svg.querySelectorAll("marker path").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.lineColor);
    setMermaidSvgPaint(element, "stroke", variables.lineColor);
  });

  svg.querySelectorAll('marker[id$="-sequencenumber"] circle').forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.lineColor);
  });

  svg.querySelectorAll("text, tspan").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.textColor);
  });

  svg.querySelectorAll(".nodeLabel, .edgeLabel, .label, foreignObject span, foreignObject div").forEach((element) => {
    element.style.color = variables.primaryTextColor;
  });

  svg.querySelectorAll(".nodeLabel text, .edgeLabel text, .label text").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.primaryTextColor);
  });

  svg.querySelectorAll(".state rect, .state path, .activity rect").forEach((element) => {
    setMermaidSvgPaint(element, "fill", variables.primaryColor);
    setMermaidSvgPaint(element, "stroke", variables.primaryBorderColor);
  });

  materializeMermaidTextStyles(svg);
  centerMermaidActorLabels(svg);
  materializeMermaidSequenceNumbers(svg, variables);
}

function setMermaidSvgPaint(element, property, value) {
  if (element.hasAttribute(property) || element.style.getPropertyValue(property)) {
    return;
  }
  element.setAttribute(property, value);
  element.style.setProperty(property, value);
}

function setMermaidSequenceLineStroke(element, value) {
  if (element.style.getPropertyValue("stroke")) {
    return;
  }
  const attributeStroke = (element.getAttribute("stroke") || "").trim().toLowerCase();
  if (attributeStroke === "none" || attributeStroke === "transparent") {
    element.removeAttribute("stroke");
  }
  setMermaidSvgPaint(element, "stroke", value);
}

function materializeMermaidTextStyles(svg) {
  const fontFamily = getMermaidThemeVariables().fontFamily;
  svg.querySelectorAll("text").forEach((element) => {
    for (const property of ["text-anchor", "font-family", "font-size", "font-weight"]) {
      const value = element.style.getPropertyValue(property).trim()
        || (property === "font-family" ? fontFamily : "");
      if (value && !element.hasAttribute(property)) {
        element.setAttribute(property, value);
      }
    }
    const textAnchor = element.getAttribute("text-anchor");
    if (textAnchor) {
      element.querySelectorAll("tspan").forEach((tspan) => {
        tspan.setAttribute("text-anchor", textAnchor);
        tspan.style.setProperty("text-anchor", textAnchor);
      });
    }
  });
}

function centerMermaidActorLabels(svg) {
  svg.querySelectorAll("text.actor").forEach((text) => {
    const rect = text.parentElement?.querySelector("rect.actor");
    const rectX = Number.parseFloat(rect?.getAttribute("x") || "");
    const rectWidth = Number.parseFloat(rect?.getAttribute("width") || "");
    if (!Number.isFinite(rectX) || !Number.isFinite(rectWidth)) {
      return;
    }
    const rectCenter = rectX + rectWidth / 2;
    const lines = text.querySelectorAll("tspan");
    const targets = lines.length ? Array.from(lines) : [text];
    for (const target of targets) {
      let textWidth = 0;
      try {
        textWidth = target.getComputedTextLength();
      } catch {
        textWidth = target.getBBox?.().width || 0;
      }
      if (!Number.isFinite(textWidth) || textWidth <= 0) {
        continue;
      }
      target.setAttribute("x", String(rectCenter - textWidth / 2));
      target.setAttribute("text-anchor", "start");
      target.style.setProperty("text-anchor", "start");
    }
    text.setAttribute("text-anchor", "start");
    text.style.setProperty("text-anchor", "start");
  });
}

function materializeMermaidSequenceNumbers(svg, variables) {
  svg.querySelectorAll('line[marker-start*="-sequencenumber"]').forEach((line) => {
    line.removeAttribute("marker-start");
  });

  svg.querySelectorAll("text.sequenceNumber").forEach((text) => {
    if (text.previousElementSibling?.classList.contains("pme-mermaid-sequence-number")) {
      return;
    }
    const x = Number.parseFloat(text.getAttribute("x") || "");
    const y = Number.parseFloat(text.getAttribute("y") || "");
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    const circle = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.classList.add("pme-mermaid-sequence-number");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y - 4));
    circle.setAttribute("r", "6");
    applySvgStyles(circle, {
      fill: variables.secondaryColor,
      stroke: variables.lineColor,
      "stroke-width": "1",
    });
    text.parentNode?.insertBefore(circle, text);
    applySvgStyles(text, { fill: variables.textColor });
  });
}

function applyMermaidDirectiveStyles(svg, code) {
  for (const directive of [
    ...parseMermaidStyleDirectives(code),
    ...parseMermaidClassDirectives(code),
  ]) {
    const node = findMermaidSvgNode(svg, directive.id);
    if (!node) {
      continue;
    }
    const shapeStyles = {
      fill: directive.styles.fill,
      stroke: directive.styles.stroke,
      "stroke-width": directive.styles["stroke-width"],
    };
    node.querySelectorAll(":scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path").forEach((shape) => {
      if (shape.closest(".edgePath, .edgePaths, .flowchart-link")) {
        return;
      }
      applySvgStyles(shape, shapeStyles);
    });

    const textColor = directive.styles.color || directive.styles["text-color"];
    if (textColor) {
      node.querySelectorAll("text, tspan").forEach((text) => {
        applySvgStyles(text, { fill: textColor, color: textColor });
      });
      node.querySelectorAll("foreignObject, foreignObject *").forEach((label) => {
        label.style.setProperty("color", textColor, "important");
        label.style.setProperty("fill", textColor, "important");
      });
    }
  }
}

function findMermaidSvgNode(svg, nodeId) {
  const escapedId = cssEscape(nodeId);
  const idPrefixes = [
    ...(svg.id ? [`${svg.id}-flowchart-${nodeId}-`] : []),
    `flowchart-${nodeId}-`,
  ];
  return svg.querySelector(`g.node[data-id="${escapedId}"]`)
    || svg.querySelector(`g.node#${escapedId}`)
    || Array.from(svg.querySelectorAll("g.node")).find((node) => {
      const id = node.getAttribute("id") || "";
      const dataId = node.getAttribute("data-id") || "";
      const className = node.getAttribute("class") || "";
      return dataId === nodeId
        || idPrefixes.some((prefix) => (
          id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length))
        ))
        || id === nodeId
        || className.split(/\s+/).includes(nodeId);
    });
}

function applySvgStyles(element, styles, priority = "") {
  for (const [property, value] of Object.entries(styles)) {
    if (!value) {
      continue;
    }
    element.setAttribute(property, value);
    element.style.setProperty(property, value, priority);
  }
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }
  return String(value).replace(/["\\]/g, "\\$&");
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
