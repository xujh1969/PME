import { Node } from "@tiptap/core";
import MindElixir from "mind-elixir";
import "mind-elixir/style";
import {
  createDefaultMindMapData,
  normalizeMindMapData,
  serializeMindMapData,
} from "../core/mindmap-data.mjs";
import { escapeHtml } from "../core/html-utils.mjs";

const MINDMAP_MODES = [
  { id: "right", label: "右侧展开", direction: 1 },
  { id: "left", label: "左侧展开", direction: 0 },
  { id: "both", label: "两侧展开", direction: 2 },
];

export function selectMindMapMode() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog" style="width: min(400px, 95%);" role="dialog" aria-modal="true" aria-label="选择思维导图模式">
        <header class="text-modal__header"><strong>选择思维导图模式</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="text-modal__body" style="padding: var(--space-lg);">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${MINDMAP_MODES.map((mode) => `
              <button type="button" class="mindmap-mode-button" data-mode="${mode.id}" data-direction="${mode.direction}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--color-hairline); border-radius: var(--radius-md); background: var(--color-canvas); cursor: pointer; transition: all 0.2s ease; text-align: left;">
                <span style="font-size: 14px; color: var(--color-ink);">${mode.label}</span>
                <span class="mindmap-mode-arrow" style="font-size: 16px;">${mode.id === "right" ? "→" : mode.id === "left" ? "←" : "↔"}</span>
              </button>
            `).join("")}
          </div>
        </section>
        <footer class="text-modal__footer"><button data-modal-action="cancel">取消</button></footer>
      </div>`;

    const close = () => { overlay.remove(); };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close();
        resolve(null);
      }
      const modeButton = event.target.closest?.(".mindmap-mode-button");
      if (modeButton) {
        close();
        resolve({
          id: modeButton.dataset.mode,
          direction: parseInt(modeButton.dataset.direction, 10),
        });
      }
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        resolve(null);
      }
    });

    document.body.appendChild(overlay);
  });
}

const MINDMAP_ATOM_SELECTION_EVENTS = new Set(["pointerdown", "mousedown", "click"]);

export function flushMindMapEdits(root) {
  root?.querySelectorAll?.("#input-box").forEach((input) => {
    if (typeof input.blur === "function") {
      input.blur();
    }
  });
}

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
      const dragToggle = document.createElement("button");
      wrapper.className = "mindmap-diagram";
      wrapper.dataset.type = "mindmap-diagram";
      viewport.className = "mindmap-diagram__viewport";
      content.className = "mindmap-diagram__content";
      dragToggle.className = "mindmap-diagram__drag-toggle";
      dragToggle.title = "编辑模式";
      dragToggle.innerHTML = '<span aria-hidden="true">🖊</span>';
      wrapper.dataset.mindmap = node.attrs.raw || serializeMindMapData(node.attrs.data);
      viewport.appendChild(content);
      wrapper.appendChild(dragToggle);
      wrapper.appendChild(viewport);
      const stopMindMapKeydown = (event) => {
        event.stopPropagation();
      };
      wrapper.addEventListener("keydown", stopMindMapKeydown);

      let mind = null;
      let lastRenderedData = wrapper.dataset.mindmap;
      let isDragMode = false;
      let layoutFrame = 0;

      const toggleDragMode = () => {
        isDragMode = !isDragMode;
        dragToggle.classList.toggle("is-active", isDragMode);
        wrapper.classList.toggle("is-drag-mode", isDragMode);
        if (mind && typeof mind.init === "function") {
          const currentData = mind.getData();
          if (currentData) {
            mind.destroy();
            mind = new MindElixir({
              el: content,
              direction: MindElixir.RIGHT,
              draggable: true,
              contextMenu: true,
              toolBar: true,
              nodeMenu: true,
              keypress: true,
              theme: document.documentElement.getAttribute("data-theme") === "dark" ? MindElixir.DARK_THEME : MindElixir.THEME,
              overflowHidden: !isDragMode,
            });
            mind.init(currentData);
            if (mind.bus?.addListener) {
              mind.bus.addListener("operation", syncData);
            }
          }
        }
      };

      dragToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDragMode();
      });

      const removeListeners = () => {
        content.removeEventListener("input", syncData);
        content.removeEventListener("pointerup", syncData);
        content.removeEventListener("keyup", syncData);
        if (mind?.bus?.removeListener) {
          mind.bus.removeListener("operation", syncData);
        }
      };

      const destroyMind = () => {
        flushMindMapEdits(content);
        cancelAnimationFrame(layoutFrame);
        layoutFrame = 0;
        removeListeners();
        if (typeof mind?.destroy === "function") {
          mind.destroy();
        }
        mind = null;
      };

      const clearContent = () => {
        destroyMind();
        content.innerHTML = "";
      };

      const syncData = () => {
        if (!mind || !editor.isEditable) return;

        try {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos !== "number") return;
          const data = mind.getData ? mind.getData() : null;
          if (!data) return;
          const serialized = serializeMindMapData(data);
          wrapper.dataset.mindmap = serialized;
          if (lastRenderedData === serialized) return;
          lastRenderedData = serialized;
          editor.commands.updateMindMap({ pos, data });
        } catch (error) {
          console.warn("Failed to synchronize mind map data", error);
        }
      };

      const showError = (error) => {
        const message = error instanceof Error ? error.message : String(error || "Mind map initialization failed");
        content.innerHTML = `<div class="mindmap-diagram__error">${escapeHtml(message)}</div>`;
      };

      const render = (attrs) => {
        flushMindMapEdits(content);
        const normalized = normalizeMindMapData(attrs.raw || attrs.data);
        const serialized = normalized.raw || serializeMindMapData(normalized.data);
        wrapper.dataset.mindmap = serialized;
        lastRenderedData = serialized;
        clearContent();
        if (normalized.error) {
          showError(normalized.error);
          return;
        }

        try {
          const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
          const theme = currentTheme === "dark" ? MindElixir.DARK_THEME : MindElixir.THEME;

          mind = new MindElixir({
            el: content,
            direction: MindElixir.RIGHT,
            draggable: true,
            contextMenu: true,
            toolBar: true,
            nodeMenu: true,
            keypress: true,
            theme,
            overflowHidden: !isDragMode,
          });
          mind.init(normalized.data);
          layoutFrame = requestAnimationFrame(() => {
            if (!mind) return;
            mind.refresh?.();
            mind.linkDiv?.();
          });
          if (mind.bus?.addListener) {
            mind.bus.addListener("operation", syncData);
          }
          content.addEventListener("input", syncData);
          content.addEventListener("pointerup", syncData);
          content.addEventListener("keyup", syncData);
        } catch (error) {
          destroyMind();
          showError(error);
        }
      };

      render(node.attrs);

      const handleThemeChange = () => {
        if (!mind || typeof mind.changeTheme !== "function") return;
        const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
        const theme = currentTheme === "dark" ? MindElixir.DARK_THEME : MindElixir.THEME;
        mind.changeTheme(theme);
      };

      document.addEventListener("themeChange", handleThemeChange);

      return {
        dom: wrapper,
        stopEvent: (event) => {
          if (event.target.closest?.(".mindmap-diagram") !== wrapper) {
            return false;
          }
          if (!MINDMAP_ATOM_SELECTION_EVENTS.has(event.type)) {
            return true;
          }
          if (
            event.target === wrapper
            || event.target === viewport
            || event.target === content
            || event.target.matches?.(".map-container")
          ) {
            return false;
          }
          return true;
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          const normalized = normalizeMindMapData(updatedNode.attrs.raw || updatedNode.attrs.data);
          const serialized = normalized.raw || serializeMindMapData(normalized.data);
          wrapper.dataset.mindmap = serialized;
          if (lastRenderedData === serialized) return true;
          render(updatedNode.attrs);
          return true;
        },
        destroy: () => {
          document.removeEventListener("themeChange", handleThemeChange);
          wrapper.removeEventListener("keydown", stopMindMapKeydown);
          clearContent();
        },
      };
    };
  },
});

function parseMindMapAttribute(element) {
  return normalizeMindMapData(element.getAttribute("data-mindmap") || "");
}

export async function updateMindMapTheme() {
  try {
    document.dispatchEvent(new Event("themeChange"));
  } catch (error) {
    console.error("Failed to update mind map theme:", error);
  }
}
