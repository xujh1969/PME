import { Node } from "@tiptap/core";
import MindElixir from "mind-elixir";
import "mind-elixir/style";
import {
  createDefaultMindMapData,
  normalizeMindMapData,
  serializeMindMapData,
} from "../core/mindmap-data.mjs";
import { escapeHtml } from "../core/html-utils.mjs";

export const MindMap = Node.create({
  name: "mindMap",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      data: {
        default: createDefaultMindMapData(),
        parseHTML: (element) => parseMindMapAttribute(element).data,
        renderHTML: (attributes) => ({
          "data-mindmap": attributes.raw || serializeMindMapData(attributes.data),
        }),
      },
      raw: {
        default: "",
        parseHTML: (element) => parseMindMapAttribute(element).raw,
      },
      error: {
        default: "",
        parseHTML: (element) => parseMindMapAttribute(element).error,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mindmap-diagram"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "mindmap-diagram" }];
  },

  addCommands() {
    return {
      insertMindMap: (options = {}) => ({ commands }) => (
        commands.insertContent({
          type: this.name,
          attrs: normalizeMindMapData(options.data || createDefaultMindMapData()),
        })
      ),
      updateMindMap: (options = {}) => ({ tr, editor }) => {
        const node = editor.state.doc.nodeAt(options.pos);
        if (!node || node.type.name !== this.name) return false;
        tr.setNodeMarkup(options.pos, this.type, normalizeMindMapData(options.data));
        return true;
      },
      deleteMindMap: (options) => ({ tr, editor }) => {
        const node = editor.state.doc.nodeAt(options.pos);
        if (!node || node.type.name !== this.name) return false;
        tr.delete(options.pos, options.pos + node.nodeSize);
        return true;
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("div");
      const viewport = document.createElement("div");
      const content = document.createElement("div");
      wrapper.className = "mindmap-diagram";
      wrapper.dataset.type = "mindmap-diagram";
      viewport.className = "mindmap-diagram__viewport";
      content.className = "mindmap-diagram__content";
      wrapper.dataset.mindmap = node.attrs.raw || serializeMindMapData(node.attrs.data);
      viewport.appendChild(content);
      wrapper.appendChild(viewport);

      let mind = null;
      let updateTimer = 0;

      const removeListeners = () => {
        content.removeEventListener("input", syncData);
        content.removeEventListener("pointerup", syncData);
        content.removeEventListener("keyup", syncData);
      };

      const clearContent = () => {
        window.clearTimeout(updateTimer);
        updateTimer = 0;
        removeListeners();
        mind = null;
        content.innerHTML = "";
      };

      const syncData = () => {
        if (!mind || !editor.isEditable) return;
        window.clearTimeout(updateTimer);
        updateTimer = window.setTimeout(() => {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos !== "number") return;
          const data = mind.getData ? mind.getData() : null;
          if (!data) return;
          wrapper.dataset.mindmap = serializeMindMapData(data);
          editor.commands.updateMindMap({ pos, data });
        }, 250);
      };

      const render = (attrs) => {
        const normalized = normalizeMindMapData(attrs.raw || attrs.data);
        wrapper.dataset.mindmap = normalized.raw || serializeMindMapData(normalized.data);
        clearContent();
        if (normalized.error) {
          content.innerHTML = `<div class="mindmap-diagram__error">${escapeHtml(normalized.error)}</div>`;
          return;
        }
        mind = new MindElixir({
          el: content,
          direction: MindElixir.RIGHT,
          draggable: true,
          contextMenu: true,
          toolBar: true,
          nodeMenu: true,
          keypress: true,
        });
        mind.init(normalized.data);
        content.addEventListener("input", syncData);
        content.addEventListener("pointerup", syncData);
        content.addEventListener("keyup", syncData);
      };

      render(node.attrs);

      return {
        dom: wrapper,
        stopEvent: (event) => Boolean(event.target.closest?.(".mindmap-diagram")),
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          render(updatedNode.attrs);
          return true;
        },
        destroy: () => {
          clearContent();
        },
      };
    };
  },
});

function parseMindMapAttribute(element) {
  return normalizeMindMapData(element.getAttribute("data-mindmap") || "");
}
