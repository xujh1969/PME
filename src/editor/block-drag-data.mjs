import { NodeSelection } from "@tiptap/pm/state";

export function moveTopLevelBlock(state, from, target) {
  const node = state.doc.nodeAt(from);
  if (!node || target === from || target === from + node.nodeSize) {
    return state.tr;
  }

  const transaction = state.tr.delete(from, from + node.nodeSize);
  const insertionPos = target > from ? target - node.nodeSize : target;
  transaction.insert(insertionPos, node);
  transaction.setSelection(NodeSelection.create(transaction.doc, insertionPos));
  return transaction.scrollIntoView();
}

function topLevelStart(doc, pos) {
  const resolved = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  return resolved.depth > 0 ? resolved.before(1) : resolved.pos;
}

function dropBoundaryAt(editor, clientX, clientY) {
  const result = editor.view.posAtCoords({ left: clientX, top: clientY });
  if (!result) return null;

  const start = topLevelStart(editor.state.doc, result.pos);
  const node = editor.state.doc.nodeAt(start);
  if (!node) return editor.state.doc.content.size;

  const dom = editor.view.nodeDOM(start);
  const rect = dom?.getBoundingClientRect?.();
  return rect && clientY >= rect.top + rect.height / 2 ? start + node.nodeSize : start;
}

export function bindPointerBlockDrag(handle, editor, getSourcePos) {
  if (!handle) return;

  let sourcePos = null;
  let targetPos = null;
  let indicator = null;

  const cleanup = () => {
    sourcePos = null;
    targetPos = null;
    indicator?.remove();
    indicator = null;
    handle.removeAttribute("data-pointer-dragging");
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const pos = getSourcePos();
    if (!Number.isInteger(pos) || pos < 0) return;

    event.preventDefault();
    sourcePos = topLevelStart(editor.state.doc, pos);
    handle.setPointerCapture?.(event.pointerId);
    handle.setAttribute("data-pointer-dragging", "true");
  });

  handle.addEventListener("pointermove", (event) => {
    if (sourcePos === null) return;
    event.preventDefault();
    targetPos = dropBoundaryAt(editor, event.clientX, event.clientY);
    if (targetPos === null) return;

    const coords = editor.view.coordsAtPos(targetPos);
    indicator ||= document.body.appendChild(Object.assign(document.createElement("div"), {
      className: "block-drop-indicator",
    }));
    Object.assign(indicator.style, {
      left: `${coords.left}px`,
      top: `${coords.top}px`,
      width: `${Math.max(40, coords.right - coords.left)}px`,
    });
  });

  handle.addEventListener("pointerup", (event) => {
    if (sourcePos === null) return;
    event.preventDefault();
    if (targetPos !== null) {
      editor.view.dispatch(moveTopLevelBlock(editor.state, sourcePos, targetPos));
    }
    cleanup();
  });
  handle.addEventListener("pointercancel", cleanup);
}
