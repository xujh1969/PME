import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const headingCollapseKey = new PluginKey("headingCollapse");

const collapseIconSvg = `<svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M112.064 896a48 48 0 1 1 0-96h800a48 48 0 0 1 0 96z m678.08-199.616l-224-143.872a47.936 47.936 0 0 1 0-80.896l224-143.872a47.04 47.04 0 0 1 25.92-7.616 48.704 48.704 0 0 1 22.976 5.824 48.064 48.064 0 0 1 25.024 42.112v288a47.872 47.872 0 0 1-25.024 42.048 48.512 48.512 0 0 1-23.104 5.888 46.784 46.784 0 0 1-25.792-7.68z m-109.312-184.256l87.104 56V456z m-495.808 185.984a47.936 47.936 0 0 1-24.96-42.048v-288a47.872 47.872 0 0 1 73.856-40.32l224 143.872a48.064 48.064 0 0 1 0 80.896l-224 143.872a47.936 47.936 0 0 1-48.96 1.728z m70.912-129.984l87.36-56-87.36-56.128zM112.064 224a48 48 0 1 1 0-96h800a48 48 0 0 1 0 96z" fill="currentColor"></path></svg>`;

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

    if (isCollapsed) {
      const arrow = document.createElement("span");
      arrow.className = "heading-collapse-toggle";
      arrow.contentEditable = "false";
      arrow.innerHTML = collapseIconSvg;

      decorations.push(Decoration.widget(pos + 1, arrow, { side: -1 }));

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
