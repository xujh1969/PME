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

export function collapseOutlineAtLevel(outline, collapsedGroups, level) {
  if (level === null) {
    return new Set();
  }

  const result = new Set(collapsedGroups);
  for (let index = 0; index < outline.length; index += 1) {
    const item = outline[index];
    const hasChildren = index + 1 < outline.length && outline[index + 1].level > item.level;
    if (!hasChildren) {
      continue;
    }

    const groupId = `outline-group-${index}`;
    if (item.level < level) {
      result.delete(groupId);
    } else if (item.level === level) {
      result.add(groupId);
    }
  }

  return result;
}

function plainText(node) {
  if (node.text) {
    return node.text;
  }
  return (node.content || []).map(plainText).join("");
}
