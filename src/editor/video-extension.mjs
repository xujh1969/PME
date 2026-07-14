import { Node } from "@tiptap/core";
import { getRenderedImageWidth, normalizeImageScale, normalizeImageWidth } from "../core/image-size.mjs";

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
        renderHTML: (attributes) => getRenderedImageWidth(attributes) ? { width: getRenderedImageWidth(attributes) } : {},
      },
      scale: {
        default: null,
        parseHTML: (element) => normalizeImageScale(element.getAttribute("data-pme-scale")),
        renderHTML: (attributes) => attributes.scale ? { "data-pme-scale": attributes.scale } : {},
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
});