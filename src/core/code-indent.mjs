const twoSpaceLanguages = new Set([
  "bash",
  "css",
  "html",
  "javascript",
  "js",
  "json",
  "jsx",
  "markdown",
  "md",
  "scss",
  "sh",
  "shell",
  "tsx",
  "typescript",
  "ts",
  "xml",
  "yaml",
  "yml",
]);

const fourSpaceLanguages = new Set([
  "c",
  "cpp",
  "csharp",
  "cs",
  "go",
  "java",
  "php",
  "python",
  "py",
  "rust",
  "rs",
]);

export function getCodeIndentUnit(language) {
  const normalizedLanguage = String(language || "").trim().toLowerCase();
  if (fourSpaceLanguages.has(normalizedLanguage)) {
    return "    ";
  }
  if (twoSpaceLanguages.has(normalizedLanguage)) {
    return "  ";
  }
  return "  ";
}

export function getNextCodeLineIndent({ language, previousLine }) {
  const baseIndent = previousLine.match(/^\s*/)?.[0] || "";
  const trimmedLine = previousLine.trimEnd();
  if (!shouldIncreaseIndent(language, trimmedLine)) {
    return baseIndent;
  }
  return `${baseIndent}${getCodeIndentUnit(language)}`;
}

function shouldIncreaseIndent(language, line) {
  const normalizedLanguage = String(language || "").trim().toLowerCase();
  if (!line) {
    return false;
  }
  if (["python", "py"].includes(normalizedLanguage)) {
    return /:\s*(#.*)?$/.test(line);
  }
  if (["bash", "sh", "shell"].includes(normalizedLanguage)) {
    return /\b(then|do)\s*$/.test(line);
  }
  return /[{\[(]\s*$/.test(line);
}
