export function extractOutline(doc) {
  const outline = [];

  for (const node of doc.content || []) {
    if (node.type !== "heading") {
      continue;
    }

    const text = plainText(node).trim();
    if (!text) {
      continue;
    }

    outline.push({
      index: outline.length,
      level: node.attrs?.level || 1,
      text,
    });
  }

  return outline;
}

function plainText(node) {
  if (node.text) {
    return node.text;
  }
  return (node.content || []).map(plainText).join("");
}
