export function getAppShortcutCommand(event) {
  const key = event.key?.toLowerCase();
  const primary = Boolean(event.ctrlKey || event.metaKey);
  const fromTextInput = isTextInputTarget(event.target);

  if (primary && key === "s" && event.shiftKey) {
    return "save-as-document";
  }
  if (primary && key === "s") {
    return "save-document";
  }
  if (primary && key === "f") {
    return "focus-search";
  }
  if (primary && key === "h") {
    return "focus-replace";
  }
  if (primary && event.shiftKey && key === "a") {
    return "ai-assistant";
  }
  if (primary && key === "/") {
    return "source-view";
  }
  if (fromTextInput) {
    return null;
  }
  if (key === "f2") {
    return "rename-markdown-file";
  }
  if (primary && event.altKey && key === "n") {
    return "new-markdown-file";
  }
  if (primary && key === "o") {
    return "open-markdown-file";
  }
  if (primary && event.altKey && key === "w") {
    return "close-current-tab";
  }
  if (primary && key === "0") {
    return "paragraph";
  }
  if (primary && key === "1") {
    return "heading-1";
  }
  if (primary && key === "2") {
    return "heading-2";
  }
  if (primary && key === "3") {
    return "heading-3";
  }
  if (primary && key === "4") {
    return "heading-4";
  }
  if (primary && key === "5") {
    return "heading-5";
  }
  if (primary && key === "6") {
    return "heading-6";
  }
  if (primary && event.shiftKey && key === "m") {
    return "formula";
  }
  if (primary && event.shiftKey && key === "k") {
    return "code-block";
  }
  if (primary && event.shiftKey && key === "5") {
    return "strike";
  }
  if (primary && key === "u") {
    return "underline";
  }
  if (primary && event.shiftKey && key === "c") {
    return "text-color";
  }
  if (primary && event.shiftKey && key === "h") {
    return "highlight-color";
  }
  if (primary && event.shiftKey && event.altKey && (key === "=" || key === "+")) {
    return "superscript";
  }
  if (primary && event.shiftKey && event.altKey && key === "-") {
    return "subscript";
  }
  if (primary && key === "[") {
    return "indent-less";
  }
  if (primary && key === "]") {
    return "indent-more";
  }
  if (primary && event.shiftKey && key === "9") {
    return "zoom-reset";
  }
  if (primary && event.shiftKey && (key === "=" || key === "+")) {
    return "zoom-in";
  }
  if (primary && event.shiftKey && key === "-") {
    return "zoom-out";
  }
  if (primary && key === "\\") {
    return "clear-format";
  }
  if (key === "f3") {
    return "find-next";
  }
  if (event.shiftKey && key === "f3") {
    return "find-prev";
  }

  return null;
}

function isTextInputTarget(target) {
  return Boolean(target?.matches?.("input, textarea, select"));
}
