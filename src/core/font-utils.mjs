const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
]);

export function buildEditorFontStack(fonts = {}) {
  return joinFontStacks(
    stripGenericFontFallbacks(fonts.english || ""),
    stripGenericFontFallbacks(fonts.chinese || ""),
    "sans-serif",
  );
}

export function buildDisplayFontStack(fonts = {}) {
  return joinFontStacks(
    stripGenericFontFallbacks(fonts.english || ""),
    stripGenericFontFallbacks(fonts.chinese || ""),
    '"EB Garamond"',
    '"Times New Roman"',
    "serif",
  );
}

export function getPrimaryFontFamily(fontStack, fallback = "Arial") {
  const first = splitFontStack(fontStack).find((family) => !isGenericFamily(family));
  return unquoteFontFamily(first || fallback);
}

export function stripGenericFontFallbacks(fontStack) {
  return splitFontStack(fontStack)
    .filter((family) => !isGenericFamily(family))
    .join(", ");
}

function joinFontStacks(...stacks) {
  return stacks
    .flatMap((stack) => splitFontStack(stack))
    .filter(Boolean)
    .join(", ");
}

function splitFontStack(fontStack) {
  const result = [];
  let token = "";
  let quote = "";
  for (const char of String(fontStack || "")) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      token += char;
      continue;
    }
    if (char === quote) {
      quote = "";
      token += char;
      continue;
    }
    if (char === "," && !quote) {
      addToken(result, token);
      token = "";
      continue;
    }
    token += char;
  }
  addToken(result, token);
  return result;
}

function addToken(result, token) {
  const value = String(token || "").trim();
  if (value) {
    result.push(value);
  }
}

function isGenericFamily(family) {
  return GENERIC_FAMILIES.has(unquoteFontFamily(family).toLowerCase());
}

function unquoteFontFamily(family) {
  return String(family || "").trim().replace(/^["']|["']$/g, "");
}
