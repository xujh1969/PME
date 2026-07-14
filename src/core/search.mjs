export function findTextMatches(text, query, options = {}) {
  const { caseSensitive = false, wholeWord = false } = options;
  const needle = query.trim();
  if (!needle) {
    return [];
  }

  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchNeedle = caseSensitive ? needle : needle.toLowerCase();
  const matches = [];
  let index = searchText.indexOf(searchNeedle);

  while (index !== -1) {
    if (wholeWord) {
      const prevChar = index > 0 ? searchText[index - 1] : '';
      const nextChar = index + searchNeedle.length < searchText.length ? searchText[index + searchNeedle.length] : '';
      const isWordChar = (char) => /[a-zA-Z0-9_]/.test(char);
      if (!isWordChar(prevChar) && !isWordChar(nextChar)) {
        matches.push({ from: index, to: index + searchNeedle.length });
      }
    } else {
      matches.push({ from: index, to: index + searchNeedle.length });
    }
    index = searchText.indexOf(searchNeedle, index + searchNeedle.length);
  }

  return matches;
}

export function isIgnoredSearchElementName(name) {
  return ["script", "style", "title", "desc", "noscript", "template"].includes(
    String(name).toLowerCase(),
  );
}
