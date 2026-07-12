const SUPPORTED_TEXT_ALIGN = new Set(["left", "center", "right"]);

export function normalizeTextAlign(value) {
  return SUPPORTED_TEXT_ALIGN.has(value) ? value : null;
}
