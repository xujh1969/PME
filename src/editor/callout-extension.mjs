import { Node } from "@tiptap/core";

const iconSvgMap = {
  note: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></svg>',
  tip: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12" y2="17"/></svg>',
  important: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg>',
  caution: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg>',
};

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-type") || "note",
        renderHTML: (attributes) => ({ "data-type": attributes.type }),
      },
      title: {
        default: "Note",
        parseHTML: (element) => element.getAttribute("data-title") || "Note",
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.callout" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.type || "note";
    const title = node.attrs.title || "Note";
    return [
      "div",
      {
        ...HTMLAttributes,
        class: "callout callout--" + type,
        "data-type": type,
        "data-title": title,
      },
      0,
    ];
  },

  addNodeView() {
    return ({ node, getPos }) => {
      const type = node.attrs.type || "note";
      const title = node.attrs.title || "Note";
      const icon = iconSvgMap[type] || iconSvgMap.note;

      const wrapper = document.createElement("div");
      wrapper.className = "callout callout--" + type;
      wrapper.dataset.type = type;
      wrapper.dataset.title = title;

      const iconContainer = document.createElement("div");
      iconContainer.className = "callout__icon";
      iconContainer.innerHTML = icon;

      const contentContainer = document.createElement("div");
      contentContainer.className = "callout__content";

      const titleElement = document.createElement("div");
      titleElement.className = "callout__title";
      titleElement.textContent = title;

      const contentElement = document.createElement("div");
      contentElement.className = "callout__body";

      contentContainer.appendChild(titleElement);
      contentContainer.appendChild(contentElement);
      wrapper.appendChild(iconContainer);
      wrapper.appendChild(contentContainer);

      const contentDOM = document.createElement("div");
      contentElement.appendChild(contentDOM);

      return {
        dom: wrapper,
        contentDOM: contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "callout") {
            return false;
          }
          const newType = updatedNode.attrs.type || "note";
          const newTitle = updatedNode.attrs.title || "Note";
          if (newType !== type || newTitle !== title) {
            wrapper.className = "callout callout--" + newType;
            wrapper.dataset.type = newType;
            wrapper.dataset.title = newTitle;
            titleElement.textContent = newTitle;
            iconContainer.innerHTML = iconSvgMap[newType] || iconSvgMap.note;
          }
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setCallout: ({ type, title, text }) => ({ chain }) => {
        return chain().insertContent({
          type: "callout",
          attrs: { type: type || "note", title: title || "Note" },
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: text || "" }],
          }],
        });
      },
    };
  },
});

export { Callout };
