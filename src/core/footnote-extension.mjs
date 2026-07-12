import { Node } from "@tiptap/core";

export const Footnote = Node.create({
  name: "footnote",

  group: "inline",

  inline: true,

  atom: true,

  selectable: true,

  addAttributes() {
    return {
      id: {
        default: "1",
      },
      text: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-type='footnote']" }, { tag: "footnote" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = node.attrs.id || "1";
    return [
      "sup",
      {
        ...HTMLAttributes,
        "data-type": "footnote",
        "data-footnote-id": id,
        title: node.attrs.text || "",
      },
      `[${id}]`,
    ];
  },

  addCommands() {
    return {
      insertFootnote: (attrs = {}) => ({ chain }) => {
        return chain().insertContent({ type: this.name, attrs }).focus().run();
      },
    };
  },
});
