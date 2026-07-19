import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import CharacterCount from "@tiptap/extension-character-count";
import Emoji from "@tiptap/extension-emoji";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Details, { DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import DragHandle from "@tiptap/extension-drag-handle";
import Typography from "@tiptap/extension-typography";
import { NodeSelection } from "@tiptap/pm/state";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Table, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Callout } from "./callout-extension.mjs";
import { Video } from "./video-extension.mjs";

export function createEditorExtensions(options) {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: false,
      link: false,
      underline: false,
      orderedList: false,
      listItem: false,
    }),
    options.customOrderedList,
    options.customListItem,
    options.delayedHeading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    options.smartCodeBlockLowlight.configure({
      lowlight: options.lowlight,
      defaultLanguage: "plaintext",
    }),
    LinkExtension.extend({
      renderHTML({ mark, HTMLAttributes }) {
        return ["a", { ...HTMLAttributes, href: mark.attrs.href }];
      },
    }).configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    options.alignedTableHeader,
    options.alignedTableCell,
    Mathematics.configure({ katexOptions: { throwOnError: false } }),
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    CharacterCount,
    Emoji,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Superscript,
    Subscript,
    options.footnote,
    options.tableOfContents,
    Details,
    DetailsSummary,
    DetailsContent,
    DragHandle.configure({
      nested: true,
      onNodeChange({ pos }) {
        options.onBlockDragNodeChange(pos);
      },
      onElementDragStart(event) {
        options.onBlockDragStart(event);
      },
      onElementDragEnd() {
        options.onBlockDragEnd();
      },
      render() {
        const element = document.createElement("div");
        element.classList.add("drag-handle");
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute("draggable", "false");
        element.setAttribute("aria-label", "拖动段落");
        element.setAttribute("title", "拖动段落");
        element.style.visibility = "hidden";
        return element;
      },
    }),
    Typography,
    options.mermaidDiagram,
    options.assetImage,
    Callout,
    Video,
    Placeholder.configure({ placeholder: "开始输入..." }),
    BubbleMenu.configure({
      element: options.bubbleMenuElement,
      shouldShow: ({ editor }) => {
        if (document.querySelector(".text-modal, .ai-modal")) {
          return false;
        }
        if (document.querySelector(".app-menu__item.is-open")) {
          return false;
        }
        const { selection } = editor.state;
        if (!selection || selection.empty) {
          return false;
        }
        if (selection.from === selection.to) {
          return false;
        }
        const docContent = editor.state.doc.content;
        if (!docContent || docContent.size <= 2) {
          return false;
        }
        if (selection instanceof NodeSelection) {
          const node = selection.node;
          const blockList = ["video", "image", "blockMath", "mermaidDiagram", "codeBlock"];
          if (blockList.includes(node.type.name)) {
            return false;
          }
        }
        const fromNode = editor.state.doc.nodeAt(selection.from);
        if (fromNode?.type?.name === "inlineCode" || fromNode?.type?.name === "inlineMath") {
          return false;
        }
        return true;
      },
    }),
  ];
}
