export function findTextMatches(text, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }

  const haystack = text.toLowerCase();
  const matches = [];
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    matches.push({ from: index, to: index + needle.length });
    index = haystack.indexOf(needle, index + needle.length);
  }

  return matches;
}

export function isIgnoredSearchElementName(name) {
  return ["script", "style", "title", "desc", "noscript", "template"].includes(
    String(name).toLowerCase(),
  );
}
