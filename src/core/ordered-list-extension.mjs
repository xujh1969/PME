import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";

const typeMap = {
  number: "1",
  roman: "I",
  "roman-lower": "i",
  alpha: "a",
  "alpha-upper": "A",
};

const CustomOrderedList = OrderedList.extend({
  addCommands() {
    return {
      toggleOrderedList:
        (options = {}) =>
        ({ commands, chain }) => {
          const { listType = null } = options;
          if (listType) {
            return chain()
              .toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
              .updateAttributes(this.name, { type: typeMap[listType] || "1" })
              .run();
          }
          if (this.options.keepAttributes) {
            return chain()
              .toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
              .updateAttributes("listItem", this.editor.getAttributes("textStyle"))
              .run();
          }
          return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
        },
      setOrderedListType:
        (type) =>
        ({ chain, editor }) => {
          if (editor.isActive("orderedList")) {
            return chain().updateAttributes(this.name, { type: typeMap[type] || "1" }).run();
          }
          return chain()
            .toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
            .updateAttributes(this.name, { type: typeMap[type] || "1" })
            .run();
        },
    };
  },
});

const CustomListItem = ListItem.extend({});

export { CustomOrderedList, CustomListItem };
