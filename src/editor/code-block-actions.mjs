import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { getCodeIndentUnit, getNextCodeLineIndent } from "../core/code-indent.mjs";

export const SmartCodeBlockLowlight = CodeBlockLowlight.extend({
  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() || {};
    return {
      ...parentShortcuts,
      Enter: ({ editor: currentEditor }) => (
        parentShortcuts.Enter?.({ editor: currentEditor }) || handleCodeBlockEnter(currentEditor)
      ),
      Tab: ({ editor: currentEditor }) => handleCodeBlockIndent(currentEditor),
      "Shift-Tab": ({ editor: currentEditor }) => handleCodeBlockOutdent(currentEditor),
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const language = node.attrs.language || "plaintext";
    return [
      "pre",
      HTMLAttributes,
      ["code", { class: `language-${language}` }, 0],
    ];
  },
});

export function handleCodeBlockEnter(currentEditor) {
  const { selection } = currentEditor.state;
  const { $from, empty } = selection;
  if (!empty || $from.parent.type.name !== "codeBlock") {
    return false;
  }

  const blockStart = $from.start();
  const textBeforeCursor = currentEditor.state.doc.textBetween(blockStart, $from.pos, "\n", "\n");
  const previousLine = textBeforeCursor.split("\n").at(-1) || "";
  const indent = getNextCodeLineIndent({
    language: $from.parent.attrs.language,
    previousLine,
  });
  return currentEditor.commands.insertContent(`\n${indent}`);
}

export function handleCodeBlockIndent(currentEditor) {
  const { selection } = currentEditor.state;
  const { $from, empty } = selection;
  if ($from.parent.type.name !== "codeBlock") {
    return false;
  }

  const indent = getCodeIndentUnit($from.parent.attrs.language);
  if (empty) {
    return currentEditor.commands.insertContent(indent);
  }

  return replaceSelectedCodeLines(currentEditor, (line) => `${indent}${line}`);
}

export function handleCodeBlockOutdent(currentEditor) {
  const { selection } = currentEditor.state;
  const { $from, empty } = selection;
  if ($from.parent.type.name !== "codeBlock") {
    return false;
  }

  const indentSize = getCodeIndentUnit($from.parent.attrs.language).length;
  if (empty) {
    return outdentCurrentCodeLine(currentEditor, indentSize);
  }

  return replaceSelectedCodeLines(currentEditor, (line) => removeCodeLineIndent(line, indentSize));
}

function replaceSelectedCodeLines(currentEditor, transformLine) {
  const { state } = currentEditor;
  const { from, to } = state.selection;
  const text = state.doc.textBetween(from, to, "\n", "\n");
  const nextText = text.split("\n").map(transformLine).join("\n");
  return currentEditor.commands.command(({ tr }) => {
    tr.replaceWith(from, to, state.schema.text(nextText));
    return true;
  });
}

function outdentCurrentCodeLine(currentEditor, indentSize) {
  const { state } = currentEditor;
  const { $from } = state.selection;
  const blockStart = $from.start();
  const textBeforeCursor = state.doc.textBetween(blockStart, $from.pos, "\n", "\n");
  const lineStart = $from.pos - (textBeforeCursor.split("\n").at(-1)?.length || 0);
  const lineEnd = Math.min(lineStart + indentSize, $from.end());
  const removableText = state.doc.textBetween(lineStart, lineEnd, "\n", "\n");
  const spacesToRemove = removableText.match(/^ */)?.[0].length || 0;
  if (!spacesToRemove) {
    return true;
  }
  return currentEditor.commands.command(({ tr }) => {
    tr.delete(lineStart, lineStart + spacesToRemove);
    return true;
  });
}

function removeCodeLineIndent(line, indentSize) {
  const spacesToRemove = Math.min(line.match(/^ */)?.[0].length || 0, indentSize);
  return line.slice(spacesToRemove);
}

