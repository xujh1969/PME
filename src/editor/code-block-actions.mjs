import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Code from "@tiptap/extension-code";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { getCodeIndentUnit, getNextCodeLineIndent } from "../core/code-indent.mjs";

const inlineCodeHighlightKey = new PluginKey("inlineCodeHighlight");

export const InlineCodeLanguage = Code.extend({
  addAttributes() {
    return {
      language: {
        default: "plaintext",
        parseHTML: (element) => (
          element.getAttribute("data-language")
          || [...element.classList].find((className) => className.startsWith("language-"))?.replace("language-", "")
          || "plaintext"
        ),
        renderHTML: (attributes) => {
          const language = attributes.language || "plaintext";
          return {
            "data-inline-code": "true",
            "data-language": language,
            class: `language-${language}`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      setCode: (attributes = {}) => ({ commands }) => commands.setMark(this.name, normalizeCodeAttributes(attributes)),
      toggleCode: (attributes = {}) => ({ commands }) => commands.toggleMark(this.name, normalizeCodeAttributes(attributes)),
      unsetCode: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },

  addProseMirrorPlugins() {
    const lowlight = this.options.lowlight;
    return [
      new Plugin({
        key: inlineCodeHighlightKey,
        state: {
          init: (_, state) => buildInlineCodeDecorations(state.doc, lowlight),
          apply: (tr, decorations, _oldState, newState) => (
            tr.docChanged ? buildInlineCodeDecorations(newState.doc, lowlight) : decorations
          ),
        },
        props: {
          decorations: (state) => inlineCodeHighlightKey.getState(state),
        },
      }),
    ];
  },
});

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

function normalizeCodeAttributes(attributes) {
  return {
    ...attributes,
    language: attributes.language || "plaintext",
  };
}

function buildInlineCodeDecorations(doc, lowlight) {
  if (!lowlight) {
    return DecorationSet.empty;
  }

  const decorations = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    const mark = node.marks.find((candidate) => candidate.type.name === "code");
    const language = mark?.attrs?.language || "plaintext";
    if (!mark || language === "plaintext") {
      return;
    }

    const tokens = getInlineCodeTokens(node.text, language, lowlight);
    tokens.forEach((token) => {
      if (!token.className || token.from >= token.to) {
        return;
      }
      decorations.push(Decoration.inline(
        pos + token.from,
        pos + token.to,
        { class: token.className },
      ));
    });
  });

  return DecorationSet.create(doc, decorations);
}

function getInlineCodeTokens(text, language, lowlight) {
  try {
    const tree = lowlight.highlight(language, text);
    const tokens = [];
    collectLowlightTokens(tree.children || [], 0, "", tokens);
    return tokens;
  } catch {
    return [];
  }
}

function collectLowlightTokens(nodes, offset, inheritedClassName, tokens) {
  let cursor = offset;
  nodes.forEach((node) => {
    if (node.type === "text") {
      const value = node.value || "";
      tokens.push({
        from: cursor,
        to: cursor + value.length,
        className: inheritedClassName,
      });
      cursor += value.length;
      return;
    }

    if (node.type !== "element") {
      return;
    }

    const className = getLowlightClassName(node) || inheritedClassName;
    cursor = collectLowlightTokens(node.children || [], cursor, className, tokens);
  });
  return cursor;
}

function getLowlightClassName(node) {
  const className = node.properties?.className;
  return Array.isArray(className) ? className.join(" ") : "";
}

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
