import { Extension } from "@tiptap/core";

function changeParagraphIndent(editor, delta) {
  const indent = editor.getAttributes("paragraph").indent || 0;
  return editor.commands.updateAttributes("paragraph", {
    indent: Math.max(0, Math.min(5, indent + delta)),
  });
}

function changeListIndent(editor, delta) {
  const listType = editor.isActive("orderedList") ? "orderedList" : "bulletList";
  const indent = editor.getAttributes(listType).indent || 0;
  const nextIndent = Math.max(0, Math.min(5, indent + delta));
  if (nextIndent === indent) {
    return true;
  }
  return editor.commands.updateAttributes(listType, {
    indent: nextIndent,
  });
}

function isNestedListItem(editor) {
  const $from = editor.state.selection.$from;
  let listDepth = 0;
  for (let depth = 0; depth <= $from.depth; depth += 1) {
    if (["bulletList", "orderedList", "taskList"].includes($from.node(depth).type.name)) {
      listDepth += 1;
    }
  }
  return listDepth > 1;
}

export function handleVisualTab(editor, delta) {
  if (editor.isActive("table")) {
    return false;
  }
  if (editor.isActive("taskItem")) {
    if (delta < 0 && !isNestedListItem(editor)) {
      return true;
    }
    if (delta > 0) {
      editor.commands.sinkListItem("taskItem");
    } else {
      editor.commands.liftListItem("taskItem");
    }
    return true;
  }
  if (editor.isActive("listItem")) {
    if (delta < 0) {
      if (isNestedListItem(editor)) {
        editor.commands.liftListItem("listItem");
        return true;
      }
      return changeListIndent(editor, delta);
    }
    return editor.commands.sinkListItem("listItem") || changeListIndent(editor, delta);
  }
  if (editor.isActive("paragraph")) {
    return changeParagraphIndent(editor, delta);
  }
  return false;
}

export const EditorTabBehavior = Extension.create({
  name: "editorTabBehavior",
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => handleVisualTab(editor, 1),
      'Shift-Tab': ({ editor }) => handleVisualTab(editor, -1),
    };
  },
});

export function updateSourceTextForTab(value, selectionStart, selectionEnd, outdent) {
  if (!outdent && selectionStart === selectionEnd) {
    return {
      value: `${value.slice(0, selectionStart)}    ${value.slice(selectionEnd)}`,
      selectionStart: selectionStart + 4,
      selectionEnd: selectionEnd + 4,
    };
  }

  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", selectionEnd);
  const lineEnd = nextLineBreak < 0 ? value.length : nextLineBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const removals = lines.map((line) => outdent ? Math.min(line.match(/^ {0,4}/)?.[0].length || 0, 4) : -4);
  const changed = lines.map((line, index) => outdent ? line.slice(removals[index]) : `    ${line}`);
  const firstAdjustment = selectionStart === lineStart
    ? 0
    : -Math.min(removals[0], selectionStart - lineStart);
  const totalAdjustment = -removals.reduce((sum, amount) => sum + amount, 0);

  return {
    value: `${value.slice(0, lineStart)}${changed.join("\n")}${value.slice(lineEnd)}`,
    selectionStart: selectionStart + firstAdjustment,
    selectionEnd: selectionEnd + totalAdjustment,
  };
}
