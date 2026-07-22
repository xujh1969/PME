import ImageExtension from "@tiptap/extension-image";
import Paragraph from "@tiptap/extension-paragraph";
import { TableCell, TableHeader } from "@tiptap/extension-table";
import { getRenderedImageWidth, normalizeImageScale, normalizeImageWidth } from "../core/image-size.mjs";
import { normalizeTextAlign } from "../core/text-align.mjs";

const tableCellAlignment = {
  default: null,
  parseHTML: (element) => normalizeTextAlign(element.style.textAlign || element.getAttribute("data-text-align")),
  renderHTML: (attributes) => {
    const textAlign = normalizeTextAlign(attributes.textAlign);
    return textAlign ? { "data-text-align": textAlign, style: `text-align: ${textAlign}` } : {};
  },
};

export const AlignedTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), textAlign: tableCellAlignment };
  },
});

export const AlignedTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), textAlign: tableCellAlignment };
  },
});

export const AssetImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetSrc: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-asset-src"),
        renderHTML: (attributes) => attributes.assetSrc ? { "data-asset-src": attributes.assetSrc } : {},
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
});

export const ParagraphWithIndent = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: (element) => Number.parseInt(element.getAttribute("data-indent") || "0", 10) || 0,
        renderHTML: (attributes) => attributes.indent ? { "data-indent": attributes.indent } : {},
      },
    };
  },
});
