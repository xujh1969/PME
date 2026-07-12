import { Node } from "@tiptap/core";

export function getTableOfContentsItems(doc) {
  const items = [];

  doc?.content?.forEach?.((node) => {
    if (node.type?.name !== "heading" && node.type !== "heading") {
      return;
    }

    const text = getNodeText(node).trim();
    if (!text) {
      return;
    }

    items.push({
      index: items.length,
      level: node.attrs?.level || 1,
      text,
    });
  });

  return items;
}

function getNodeText(node) {
  if (node.text) {
    return node.text;
  }

  if (typeof node.childCount === "number" && typeof node.child === "function") {
    let text = "";
    for (let index = 0; index < node.childCount; index += 1) {
      text += getNodeText(node.child(index));
    }
    return text;
  }

  return (node.content || []).map(getNodeText).join("");
}

function renderTableOfContents(dom, editor) {
  const items = getTableOfContentsItems(editor.state.doc);
  dom.replaceChildren();

  const title = document.createElement("div");
  title.className = "table-of-contents__title";
  title.textContent = "目录";
  dom.appendChild(title);

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "table-of-contents__empty";
    empty.textContent = "暂无标题";
    dom.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "table-of-contents__list";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-of-contents__item";
    button.dataset.tocIndex = String(item.index);
    button.style.setProperty("--toc-depth", String(Math.max(0, item.level - 1)));
    button.textContent = item.text;
    list.appendChild(button);
  });
  dom.appendChild(list);
}

export const TableOfContents = Node.create({
  name: "tableOfContents",

  group: "block",

  content: "",

  atom: true,

  selectable: true,

  parseHTML() {
    return [{ tag: "div[data-type='table-of-contents']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "table-of-contents", class: "table-of-contents" }, "目录"];
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement("nav");
      dom.className = "table-of-contents";
      dom.dataset.type = "table-of-contents";
      dom.contentEditable = "false";

      const update = () => renderTableOfContents(dom, editor);
      const handleClick = (event) => {
        const button = event.target.closest?.("[data-toc-index]");
        if (!button) {
          return;
        }

        event.preventDefault();
        const headings = editor.view.dom.querySelectorAll("h1, h2, h3, h4, h5, h6");
        headings[Number(button.dataset.tocIndex)]?.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      };

      dom.addEventListener("click", handleClick);
      editor.on("update", update);
      update();

      return {
        dom,
        update() {
          update();
          return true;
        },
        destroy() {
          dom.removeEventListener("click", handleClick);
          editor.off("update", update);
        },
      };
    };
  },

  addCommands() {
    return {
      insertTableOfContents: () => ({ chain }) => {
        return chain().insertContent({ type: this.name }).run();
      },
    };
  },
});
