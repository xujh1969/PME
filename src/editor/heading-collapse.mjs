import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const headingCollapseKey = new PluginKey("headingCollapse");

function buildDecorations(doc) {
  const decorations = [];
  const topNodes = [];

  doc.forEach((node, offset) => {
    topNodes.push({ node, pos: offset });
  });

  for (let i = 0; i < topNodes.length; i++) {
    const { node, pos } = topNodes[i];
    if (node.type.name !== "heading") continue;

    const isCollapsed = !!node.attrs.collapsed;

    const arrow = document.createElement("span");
    arrow.className = "heading-collapse-toggle" + (isCollapsed ? " collapsed" : "");
    arrow.contentEditable = "false";
    arrow.textContent = isCollapsed ? "▶" : "▼";

    decorations.push(Decoration.widget(pos + 1, arrow, { side: -1 }));

    if (isCollapsed) {
      const level = node.attrs.level;
      for (let j = i + 1; j < topNodes.length; j++) {
        const nextEntry = topNodes[j];
        if (nextEntry.node.type.name === "heading" && nextEntry.node.attrs.level <= level) {
          break;
        }
        decorations.push(Decoration.node(
          nextEntry.pos,
          nextEntry.pos + nextEntry.node.nodeSize,
          { style: "display: none;" }
        ));
      }
    }
  }

  return DecorationSet.create(doc, decorations);
}

export function headingCollapsePlugin() {
  return new Plugin({
    key: headingCollapseKey,
    state: {
      init(_, state) {
        return buildDecorations(state.doc);
      },
      apply(tr, oldDecorations, oldState, newState) {
        if (tr.docChanged) {
          return buildDecorations(newState.doc);
        }
        return oldDecorations;
      },
    },
    props: {
      decorations: (state) => headingCollapseKey.getState(state),
      handleDOMEvents: {
        click: (view, event) => {
          const target = event.target;
          const toggle = target.classList?.contains("heading-collapse-toggle")
            ? target
            : target.closest?.(".heading-collapse-toggle");
          if (!toggle) return false;

          const headingEl = toggle.closest("h1, h2, h3, h4, h5, h6");
          if (!headingEl) return false;

          const domPos = view.posAtDOM(headingEl, 0);
          const $pos = view.state.doc.resolve(domPos);
          const headingNode = $pos.parent;
          if (!headingNode || headingNode.type.name !== "heading") return false;
          const headingPos = $pos.before($pos.depth);

          const tr = view.state.tr.setNodeMarkup(headingPos, undefined, {
            ...headingNode.attrs,
            collapsed: !headingNode.attrs.collapsed,
          });
          view.dispatch(tr);
          return true;
        },
      },
    },
  });
}
