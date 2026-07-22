export function runEditorCommand(command, context) {
  if (command === "source-view") {
    context.toggleSourceView?.();
    return;
  }

  const { editor } = context;
  if (!editor) {
    return;
  }

  const chain = editor.chain().focus();
  if (command === "heading-1") {
    chain.toggleHeading({ level: 1 }).run();
  } else if (command === "heading-2") {
    chain.toggleHeading({ level: 2 }).run();
  } else if (command === "heading-3") {
    chain.toggleHeading({ level: 3 }).run();
  } else if (command === "heading-4") {
    chain.toggleHeading({ level: 4 }).run();
  } else if (command === "heading-5") {
    chain.toggleHeading({ level: 5 }).run();
  } else if (command === "heading-6") {
    chain.toggleHeading({ level: 6 }).run();
  } else if (command === "paragraph") {
    chain.setParagraph().run();
  } else if (command === "align-left") {
    chain.setTextAlign("left").run();
  } else if (command === "align-center") {
    chain.setTextAlign("center").run();
  } else if (command === "align-right") {
    chain.setTextAlign("right").run();
  } else if (command === "align-justify") {
    chain.setTextAlign("justify").run();
  } else if (command === "indent-more") {
    if (editor.isActive("listItem")) {
      chain.sinkListItem("listItem").run();
    } else {
      chain.updateAttributes("paragraph", { indent: Math.min(5, (editor.getAttributes("paragraph").indent || 0) + 1) }).run();
    }
  } else if (command === "indent-less") {
    if (editor.isActive("listItem")) {
      chain.liftListItem("listItem").run();
    } else {
      chain.updateAttributes("paragraph", { indent: Math.max(0, (editor.getAttributes("paragraph").indent || 0) - 1) }).run();
    }
  } else if (command === "bold") {
    chain.toggleBold().run();
  } else if (command === "italic") {
    chain.toggleItalic().run();
  } else if (command === "underline") {
    chain.toggleUnderline().run();
  } else if (command === "strike") {
    chain.toggleStrike().run();
  } else if (command === "emoji") {
    context.openEmojiPicker?.(editor);
  } else if (command === "text-color") {
    context.openTextColorPicker?.(editor);
  } else if (command === "highlight-color") {
    context.openHighlightColorPicker?.(editor);
  } else if (command === "superscript") {
    chain.toggleSuperscript().run();
  } else if (command === "subscript") {
    chain.toggleSubscript().run();
  } else if (command === "details") {
    context.createDetailsBlock?.(editor);
  } else if (command === "code") {
    chain.toggleCode().run();
  } else if (command === "clear-format") {
    chain.unsetAllMarks().clearNodes().run();
  } else if (command === "link") {
    if (editor.isActive("link")) {
      chain.unsetLink().run();
    } else {
      context.setLinkMark?.();
    }
  } else if (command === "unlink") {
    chain.unsetLink().run();
  } else if (command === "bullet-list") {
    chain.toggleBulletList().run();
  } else if (command === "ordered-list") {
    chain.toggleOrderedList().run();
  } else if (command === "ordered-list-roman") {
    chain.setOrderedListType("roman").run();
  } else if (command === "ordered-list-alpha") {
    chain.setOrderedListType("alpha").run();
  } else if (command === "ordered-list-alpha-upper") {
    chain.setOrderedListType("alpha-upper").run();
  } else if (command === "task-list") {
    chain.toggleTaskList().run();
  } else if (command === "blockquote") {
    chain.toggleBlockquote().run();
  } else if (command === "horizontal-rule") {
    chain.setHorizontalRule().run();
  } else if (command === "code-block") {
    context.setCodeBlockLanguage?.();
  } else if (command === "table") {
    context.openTableInsertModal?.().then((result) => {
      if (!result) {
        return;
      }
      editor.chain().focus().insertTable(result).run();
    });
  } else if (command === "table-row-before") {
    chain.addRowBefore().run();
  } else if (command === "table-row-after") {
    chain.addRowAfter().run();
  } else if (command === "table-column-before") {
    chain.addColumnBefore().run();
  } else if (command === "table-column-after") {
    chain.addColumnAfter().run();
  } else if (command === "table-toggle-header") {
    chain.toggleHeaderRow().run();
  } else if (command === "table-delete-row") {
    chain.deleteRow().run();
  } else if (command === "table-delete-column") {
    chain.deleteColumn().run();
  } else if (command === "table-delete") {
    chain.deleteTable().run();
  } else if (command === "table-align-left") {
    chain.setCellAttribute("textAlign", "left").run();
  } else if (command === "table-align-center") {
    chain.setCellAttribute("textAlign", "center").run();
  } else if (command === "table-align-right") {
    chain.setCellAttribute("textAlign", "right").run();
  } else if (command === "table-merge-cells") {
    chain.mergeCells().run();
  } else if (command === "table-split-cell") {
    chain.splitCell().run();
  } else if (command === "image") {
    context.openImageInsertPanel?.();
  } else if (command === "video") {
    context.openVideoInsertPanel?.();
  } else if (command === "markdown-link") {
    context.insertMarkdownLink?.();
  } else if (command === "formula") {
    chain.insertBlockMath({ latex: "E = mc^2" }).run();
  } else if (command === "inline-formula") {
    chain.insertInlineMath({ latex: "x = y" }).run();
  } else if (command === "mermaid") {
    chain.insertMermaidDiagram({ code: "graph TD\n  A-->B" }).run();
  } else if (command === "heading-up") {
    const currentLevel = editor.getAttributes("heading").level;
    if (currentLevel && currentLevel < 6) {
      chain.setHeading({ level: currentLevel + 1 }).run();
    }
  } else if (command === "heading-down") {
    const currentLevel = editor.getAttributes("heading").level;
    if (currentLevel && currentLevel > 1) {
      chain.setHeading({ level: currentLevel - 1 }).run();
    }
  } else if (command === "insert-paragraph-above") {
    context.insertParagraphAroundSelection?.(editor, "above");
  } else if (command === "insert-paragraph-below") {
    context.insertParagraphAroundSelection?.(editor, "below");
  } else if (command === "footnote") {
    context.insertFootnote?.();
  } else if (command === "table-of-contents") {
    chain.insertTableOfContents().run();
  } else if (command.startsWith("callout-")) {
    const type = command.replace("callout-", "");
    const calloutConfig = {
      note: { title: "Note", label: "提醒内容" },
      tip: { title: "Tip", label: "建议信息" },
      important: { title: "Important", label: "重要信息" },
      warning: { title: "Warning", label: "警告内容" },
      caution: { title: "Caution", label: "注意内容" },
    };
    const config = calloutConfig[type];
    if (config) {
      chain.setCallout({ type, title: config.title, text: config.label }).run();
    }
  } else if (command === "heading-collapse") {
    const { state } = editor;
    const { selection } = state;
    const $pos = selection.$anchor;
    for (let d = $pos.depth; d >= 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === "heading") {
        const headingPos = $pos.before(d);
        const tr = state.tr.setNodeMarkup(headingPos, undefined, {
          ...node.attrs,
          collapsed: !node.attrs.collapsed,
        });
        editor.view.dispatch(tr);
        break;
      }
    }
  } else if (command === "heading-expand-all") {
    const { state } = editor;
    let tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "heading" && node.attrs.collapsed) {
        tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, collapsed: false });
      }
      return true;
    });
    if (tr.docChanged) {
      editor.view.dispatch(tr);
    }
  }
}
