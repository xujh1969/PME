import { Node } from "@tiptap/core";
import { normalizeImageScale, normalizeImageWidth } from "../core/image-size.mjs";

export const Video = Node.create({
  name: "video",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      assetSrc: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-asset-src"),
        renderHTML: (attributes) => attributes.assetSrc ? { "data-asset-src": attributes.assetSrc } : {},
      },
      controls: {
        default: true,
        parseHTML: (element) => element.hasAttribute("controls"),
        renderHTML: () => ({ controls: "" }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = Number.parseInt(element.getAttribute("width") || "", 10);
          return Number.isFinite(width) && width > 0 ? width : null;
        },
        renderHTML: (attributes) => attributes.scale ? {} : (attributes.width ? { width: attributes.width } : {}),
      },
      scale: {
        default: null,
        parseHTML: (element) => normalizeImageScale(element.getAttribute("data-pme-scale")),
        renderHTML: (attributes) => attributes.scale ? {
          "data-pme-scale": attributes.scale,
          style: `width: min(100%, ${attributes.scale}%)`,
        } : {},
      },
      originalWidth: {
        default: null,
        parseHTML: (element) => normalizeImageWidth(element.getAttribute("data-pme-original-width")),
        renderHTML: (attributes) => attributes.originalWidth ? { "data-pme-original-width": attributes.originalWidth } : {},
      },
    };
  },

  parseHTML() {
    return [
      { tag: "video" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", { ...HTMLAttributes, controls: "" }];
  },

  addCommands() {
    return {
      setVideo: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement("div");
      const controls = document.createElement("div");
      const video = document.createElement("video");
      const zoomOut = createVideoScaleButton("-", "缩小视频");
      const zoomLevel = createVideoScaleButton("100%", "恢复实际大小");
      const zoomIn = createVideoScaleButton("+", "放大视频");
      let currentNode = node;

      wrapper.className = "video-node";
      controls.className = "video-node__controls";
      video.controls = true;
      controls.append(zoomOut, zoomLevel, zoomIn);
      wrapper.append(controls, video);

      const applyNodeAttributes = () => {
        const scale = normalizeVideoScale(currentNode.attrs.scale);
        zoomLevel.textContent = `${scale || 100}%`;
        wrapper.dataset.pmeScale = String(scale || 100);
        wrapper.style.width = scale
          ? `min(100%, ${scale}%)`
          : (currentNode.attrs.width ? `min(100%, ${currentNode.attrs.width}px)` : "100%");

        setOptionalAttribute(video, "src", currentNode.attrs.src);
        setOptionalAttribute(video, "data-asset-src", currentNode.attrs.assetSrc);
        setOptionalAttribute(video, "data-pme-scale", scale);
        setOptionalAttribute(video, "data-pme-original-width", currentNode.attrs.originalWidth);
        if (!scale) {
          setOptionalAttribute(video, "width", currentNode.attrs.width);
        } else {
          video.removeAttribute("width");
        }
      };

      const persistScale = (nextScale) => {
        const pos = getPos();
        const scale = normalizeVideoScale(nextScale);
        if (!Number.isInteger(pos) || scale === null || currentNode.attrs.scale === scale) {
          return;
        }
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          width: null,
          scale,
          originalWidth: currentNode.attrs.originalWidth || video.videoWidth || null,
        }));
      };

      zoomOut.addEventListener("click", () => persistScale((normalizeVideoScale(currentNode.attrs.scale) || 100) - 10));
      zoomLevel.addEventListener("click", () => persistScale(100));
      zoomIn.addEventListener("click", () => persistScale((normalizeVideoScale(currentNode.attrs.scale) || 100) + 10));
      wrapper.addEventListener("mousedown", (event) => {
        if (event.target.closest?.(".video-node__controls")) {
          return;
        }
        const pos = getPos();
        if (Number.isInteger(pos)) {
          editor.commands.setNodeSelection(pos);
        }
      });

      applyNodeAttributes();
      return {
        dom: wrapper,
        stopEvent: (event) => Boolean(event.target.closest?.(".video-node__controls")),
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          currentNode = updatedNode;
          applyNodeAttributes();
          return true;
        },
      };
    };
  },
});

function normalizeVideoScale(value) {
  const scale = normalizeImageScale(value);
  return scale === null ? null : Math.min(300, Math.max(10, scale));
}

function createVideoScaleButton(label, title) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
}

function setOptionalAttribute(element, name, value) {
  if (value === null || value === undefined || value === "") {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, String(value));
  }
}
