import { NodeSelection, TextSelection } from "@tiptap/pm/state";

export function insertParagraphAroundSelection(currentEditor, direction) {
  const { state: editorState, view } = currentEditor;
  const paragraphType = editorState.schema.nodes.paragraph;
  if (!paragraphType) {
    return false;
  }

  const { selection } = editorState;
  const insertAt = getParagraphInsertPosition(selection, direction);
  const paragraph = paragraphType.create();
  const tr = editorState.tr.insert(insertAt, paragraph);
  const cursorPos = Math.min(insertAt + 1, tr.doc.content.size);

  tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos), 1));
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

export function getParagraphInsertPosition(selection, direction) {
  if (selection instanceof NodeSelection) {
    return direction === "above" ? selection.from : selection.to;
  }

  if (direction === "above") {
    return selection.$from.depth > 0 ? selection.$from.before(1) : selection.from;
  }
  return selection.$to.depth > 0 ? selection.$to.after(1) : selection.to;
}
