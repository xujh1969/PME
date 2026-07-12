export function runAppCommand(command, context) {
  const { state, editor, document } = context;

  if (command === "new-workspace") {
    context.createStandaloneMarkdownDocument();
  } else if (command === "new-markdown-file") {
    context.createStandaloneMarkdownDocument();
  } else if (command === "open-markdown-file") {
    return context.openMarkdownFile();
  } else if (command === "save-document") {
    return context.saveDocument();
  } else if (command === "save-as-document") {
    return context.saveAsDocument();
  } else if (command === "package-document") {
    return context.packageCurrentDocument();
  } else if (command === "export-pdf") {
    return context.openPdfExportModal();
  } else if (command === "close-current-tab") {
    return context.closeDocumentTab(state.selectedPath);
  } else if (command === "cut" || command === "copy" || command === "paste") {
    context.runClipboardMenuCommand(command);
  } else if (command === "select-all") {
    context.selectCurrentDocument();
  } else if (command === "undo") {
    editor ? editor.chain().focus().undo().run() : document.execCommand?.("undo");
  } else if (command === "redo") {
    editor ? editor.chain().focus().redo().run() : document.execCommand?.("redo");
  } else if (command === "toggle-sidebar") {
    state.showSidebar = !state.showSidebar;
    context.render();
  } else if (command === "toggle-outline") {
    state.showOutline = !state.showOutline;
    state.showSidebar = state.showSidebar || state.showOutline;
    context.render();
  } else if (command === "toggle-file-tree") {
    state.showFileTree = !state.showFileTree;
    state.showSidebar = state.showSidebar || state.showFileTree;
    context.render();
  } else if (command === "toggle-statusbar") {
    state.showStatusbar = !state.showStatusbar;
    context.render();
  } else if (command === "zoom-reset") {
    context.setEditorZoom(1);
  } else if (command === "zoom-in") {
    context.setEditorZoom(state.editorZoom + 0.1);
  } else if (command === "zoom-out") {
    context.setEditorZoom(state.editorZoom - 0.1);
  } else if (command === "focus-search") {
    document.querySelector("[data-find-input]")?.focus();
  } else if (command === "about") {
    context.openMessageModal({
      title: "关于 PME",
      message: "PME - Portable Markdown Editor",
    });
  } else if (command === "settings") {
    context.openSettingsModal();
  } else if (command === "print-document") {
    context.printDocument();
  } else {
    context.runEditorCommand(command);
  }
}
