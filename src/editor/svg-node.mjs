import { Node } from "@tiptap/core";

const SVG_FALLBACK = `<svg viewBox="0 0 680 360" width="100%" role="img" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="40" width="600" height="280" rx="12" fill="#F8FAFC" stroke="#CBD5E1"/>
  <text x="340" y="180" text-anchor="middle" style="font-size:22px;fill:#334155">SVG</text>
</svg>`;

export const SvgDiagram = Node.create({
  name: "svgDiagram",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: {
        default: SVG_FALLBACK,
        parseHTML: (element) => element.getAttribute("data-code") || element.innerHTML || SVG_FALLBACK,
        renderHTML: (attributes) => ({ "data-code": attributes.code }),
      },
      scale: {
        default: 100,
        parseHTML: (element) => normalizeSvgScale(element.getAttribute("data-pme-scale")),
        renderHTML: (attributes) => {
          const scale = normalizeSvgScale(attributes.scale);
          return { "data-pme-scale": scale, style: `--svg-scale-width: ${scale}%` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="svg-diagram"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "svg-diagram" }];
  },

  addCommands() {
    return {
      insertSvgDiagram: (options = {}) => ({ commands }) => (
        commands.insertContent({ type: this.name, attrs: { code: options.code || SVG_FALLBACK, scale: normalizeSvgScale(options.scale) } })
      ),
      updateSvgDiagram: (options) => ({ tr }) => {
        tr.setNodeMarkup(options.pos, this.type, { code: options.code, scale: normalizeSvgScale(options.scale) });
        return true;
      },
      deleteSvgDiagram: (options) => ({ tr, editor }) => {
        const node = editor.state.doc.nodeAt(options.pos);
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
      const viewport = document.createElement("div");
      const content = document.createElement("div");

      wrapper.className = "svg-diagram";
      wrapper.dataset.type = "svg-diagram";
      wrapper.dataset.code = node.attrs.code;
      applySvgScale(wrapper, node.attrs.scale);
      viewport.className = "svg-diagram__viewport";
      content.className = "svg-diagram__content";
      viewport.appendChild(content);
      wrapper.appendChild(viewport);

      renderSvgDiagram(content, node.attrs.code);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          wrapper.dataset.code = updatedNode.attrs.code;
          applySvgScale(wrapper, updatedNode.attrs.scale);
          renderSvgDiagram(content, updatedNode.attrs.code);
          return true;
        },
      };
    };
  },
});

export function renderSvgDiagram(element, code) {
  element.innerHTML = sanitizeSvgCode(code);
  const svg = element.querySelector("svg");
  if (!svg) {
    element.innerHTML = `<div class="svg-diagram__error">Invalid SVG</div>`;
    return;
  }
  normalizeSvgElement(svg);
}

export function normalizeSvgCode(code) {
  const sanitized = sanitizeSvgCode(code);
  const template = document.createElement("template");
  template.innerHTML = sanitized;
  const svg = template.content.querySelector("svg");
  if (!svg) {
    return "";
  }
  normalizeSvgElement(svg);
  return new XMLSerializer().serializeToString(svg);
}

export function getSvgDiagramDimensions(code) {
  const template = document.createElement("template");
  template.innerHTML = sanitizeSvgCode(code);
  const svg = template.content.querySelector("svg");
  if (!svg) {
    return { width: 680, height: 360 };
  }
  const viewBox = svg.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }
  const width = Number.parseFloat(svg.getAttribute("width") || "");
  const height = Number.parseFloat(svg.getAttribute("height") || "");
  return {
    width: Number.isFinite(width) && width > 0 ? width : 680,
    height: Number.isFinite(height) && height > 0 ? height : 360,
  };
}

export function getDefaultSvgCode() {
  return SVG_FALLBACK;
}

export function normalizeSvgScale(scale) {
  const value = Number.parseInt(scale, 10);
  return [25, 50, 75, 100, 125, 150].includes(value) ? value : 100;
}

function applySvgScale(wrapper, scale) {
  const normalized = normalizeSvgScale(scale);
  wrapper.dataset.pmeScale = String(normalized);
  wrapper.style.setProperty("--svg-scale-width", `${normalized}%`);
}

function sanitizeSvgCode(code) {
  const template = document.createElement("template");
  template.innerHTML = String(code || "").trim();
  const svg = template.content.querySelector("svg");
  if (!svg) {
    return "";
  }

  svg.querySelectorAll("script, foreignObject, iframe, object, embed").forEach((element) => element.remove());
  svg.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || value.startsWith("javascript:")) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return svg.outerHTML;
}

function normalizeSvgElement(svg) {
  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  svg.removeAttribute("width");
  svg.style.width = "100%";
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";
}
