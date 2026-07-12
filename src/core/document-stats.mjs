export function getDocumentStats(text) {
  return {
    characters: text.length,
    words: text.trim().split(/\s+/).filter(Boolean).length,
  };
}
