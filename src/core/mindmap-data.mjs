const STATIC_PADDING = 32;
const STATIC_HORIZONTAL_GAP = 72;
const STATIC_VERTICAL_GAP = 24;
const STATIC_BRANCH_COLORS = ["#2563eb", "#dc2626", "#059669", "#7c3aed", "#d97706", "#0891b2"];

export function createDefaultMindMapData() {
  return {
    nodeData: {
      id: "root",
      topic: "中心主题",
      children: [
        { id: "topic-1", topic: "主题 1", children: [] },
        { id: "topic-2", topic: "主题 2", children: [] },
      ],
    },
  };
}

export function normalizeMindMapData(value) {
  if (typeof value === "object" && value !== null) {
    return { data: ensureMindMapShape(value), raw: "", error: "" };
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return { data: createDefaultMindMapData(), raw: "", error: "" };
  }

  try {
    return { data: ensureMindMapShape(JSON.parse(raw)), raw: "", error: "" };
  } catch {
    return { data: null, raw, error: "Invalid mind map JSON" };
  }
}

export function serializeMindMapData(data) {
  if (typeof data === "string") {
    return data.trim();
  }
  return JSON.stringify(ensureMindMapShape(data), null, 2);
}

export function getStaticMindMapDimensions(size, maxWidth, maxHeight = Number.POSITIVE_INFINITY) {
  const sourceWidth = positiveNumber(size?.width) || 800;
  const sourceHeight = positiveNumber(size?.height) || 480;
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    sourceWidth,
    sourceHeight,
    targetWidth: Math.round(sourceWidth * scale),
    targetHeight: Math.round(sourceHeight * scale),
  };
}

export function buildMindMapStaticSvg(data) {
  const normalized = normalizeMindMapData(data);
  if (!normalized.data?.nodeData) {
    throw new Error(normalized.error || "Invalid mind map data");
  }

  const layout = layoutMindMap(normalized.data);
  const naturalWidth = Math.ceil(layout.bounds.maxX - layout.bounds.minX + STATIC_PADDING * 2);
  const naturalHeight = Math.ceil(layout.bounds.maxY - layout.bounds.minY + STATIC_PADDING * 2);
  const width = Math.max(240, naturalWidth);
  const height = Math.max(120, naturalHeight);
  const offsetX = STATIC_PADDING - layout.bounds.minX + (width - naturalWidth) / 2;
  const offsetY = STATIC_PADDING - layout.bounds.minY + (height - naturalHeight) / 2;
  const connectors = layout.nodes
    .filter((item) => item.parent)
    .map((item) => renderConnector(item, offsetX, offsetY))
    .join("");
  const nodes = layout.nodes
    .map((item) => renderStaticNode(item, offsetX, offsetY))
    .join("");

  return {
    width,
    height,
    svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
      connectors,
      nodes,
      "</svg>",
    ].join(""),
  };
}

export function buildMindMapFallbackSvg(data) {
  return buildMindMapStaticSvg(data).svg;
}

function ensureMindMapShape(value) {
  const hasWrapper = isObject(value) && Object.prototype.hasOwnProperty.call(value, "nodeData");
  const nodeData = hasWrapper ? value.nodeData : value;
  const cleanValue = hasWrapper ? cloneSerializable(value) : {};

  return {
    ...(isObject(cleanValue) ? cleanValue : {}),
    nodeData: ensureMindMapNode(nodeData, "root"),
  };
}

function ensureMindMapNode(node, fallbackId) {
  const cleanNode = cloneSerializable(isObject(node) ? node : {});
  const children = Array.isArray(node?.children) ? node.children : [];

  return {
    ...(isObject(cleanNode) ? cleanNode : {}),
    id: String(node?.id || fallbackId),
    topic: String(node?.topic || "中心主题"),
    children: children.map((child, index) => ensureMindMapNode(child, `${fallbackId}-${index + 1}`)),
  };
}

function cloneSerializable(value, seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "object") {
    return undefined;
  }
  if (seen.has(value)) {
    return undefined;
  }

  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => {
      const cloned = cloneSerializable(item, seen);
      return cloned === undefined ? null : cloned;
    });
    seen.delete(value);
    return result;
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "parent" && typeof item !== "string") continue;
    const cloned = cloneSerializable(item, seen);
    if (cloned !== undefined) {
      result[key] = cloned;
    }
  }
  seen.delete(value);
  return result;
}

function layoutMindMap(data) {
  const root = createLayoutNode(data.nodeData, true, 0);
  const rootChildren = Array.isArray(data.nodeData.children) ? data.nodeData.children : [];
  const mapDirection = Number(data.direction);
  const sides = { left: [], right: [] };

  rootChildren.forEach((child, index) => {
    const direction = getBranchDirection(child, mapDirection, index);
    const branch = layoutBranch(child, direction, 1);
    setBranchColor(branch, child.branchColor || STATIC_BRANCH_COLORS[index % STATIC_BRANCH_COLORS.length]);
    sides[direction === -1 ? "left" : "right"].push(branch);
  });

  const leftHeight = getLayoutGroupHeight(sides.left);
  const rightHeight = getLayoutGroupHeight(sides.right);
  const groupHeight = Math.max(root.height, leftHeight, rightHeight);
  root.y = (groupHeight - root.height) / 2;
  const nodes = [root];

  placeRootBranches(sides.left, -1, root, groupHeight, nodes);
  placeRootBranches(sides.right, 1, root, groupHeight, nodes);

  return { nodes, bounds: getBounds(nodes) };
}

function layoutBranch(node, direction, depth) {
  const root = createLayoutNode(node, false, depth);
  const childLayouts = (Array.isArray(node.children) ? node.children : [])
    .map((child) => layoutBranch(child, direction, depth + 1));
  const nodes = [root];
  let cursorY = 0;

  childLayouts.forEach((childLayout) => {
    const childRoot = childLayout.root;
    const targetX = direction === 1
      ? root.width + STATIC_HORIZONTAL_GAP
      : -STATIC_HORIZONTAL_GAP - childRoot.width;
    const shiftX = targetX - childRoot.x;
    const shiftY = cursorY - childLayout.bounds.minY;
    shiftLayout(childLayout, shiftX, shiftY);
    childRoot.parent = root;
    nodes.push(...childLayout.nodes);
    cursorY += childLayout.bounds.maxY - childLayout.bounds.minY + STATIC_VERTICAL_GAP;
  });

  if (childLayouts.length) {
    const first = childLayouts[0].root;
    const last = childLayouts.at(-1).root;
    root.y = ((first.y + first.height / 2) + (last.y + last.height / 2)) / 2 - root.height / 2;
  }

  return { root, nodes, bounds: getBounds(nodes) };
}

function placeRootBranches(branches, direction, root, groupHeight, nodes) {
  const branchesHeight = getLayoutGroupHeight(branches);
  let cursorY = (groupHeight - branchesHeight) / 2;

  branches.forEach((branch) => {
    const targetX = direction === 1
      ? root.x + root.width + STATIC_HORIZONTAL_GAP
      : root.x - STATIC_HORIZONTAL_GAP - branch.root.width;
    const shiftX = targetX - branch.root.x;
    const shiftY = cursorY - branch.bounds.minY;
    shiftLayout(branch, shiftX, shiftY);
    branch.root.parent = root;
    nodes.push(...branch.nodes);
    cursorY += branch.bounds.maxY - branch.bounds.minY + STATIC_VERTICAL_GAP;
  });
}

function createLayoutNode(node, isRoot, depth) {
  const style = isObject(node.style) ? node.style : {};
  const fontSize = clamp(positiveNumber(String(style.fontSize || "").replace("px", "")) || (isRoot ? 18 : 15), 10, 36);
  const requestedWidth = positiveNumber(String(style.width || "").replace("px", ""));
  const preferredWidth = requestedWidth ? clamp(requestedWidth, 60, 360) : 0;
  const label = getNodeLabel(node);
  const maxTextWidth = preferredWidth || (isRoot ? 180 : 150);
  const lines = wrapLabel(label, maxTextWidth, fontSize);
  const textWidth = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize)), 40);
  const width = Math.ceil(Math.max(preferredWidth, textWidth + 28));
  const lineHeight = Math.ceil(fontSize * 1.35);
  const height = Math.ceil(lines.length * lineHeight + 20);

  return {
    node,
    isRoot,
    depth,
    x: 0,
    y: 0,
    width,
    height,
    fontSize,
    lineHeight,
    lines,
    parent: null,
    branchColor: "",
  };
}

function getBranchDirection(node, mapDirection, index) {
  if (Number(node.direction) === 0) return -1;
  if (Number(node.direction) === 1) return 1;
  if (mapDirection === 0) return -1;
  if (mapDirection === 2) return index % 2 === 0 ? 1 : -1;
  return 1;
}

function setBranchColor(layout, color) {
  layout.nodes.forEach((item) => {
    item.branchColor = item.node.branchColor || color;
  });
}

function getLayoutGroupHeight(layouts) {
  if (!layouts.length) return 0;
  return layouts.reduce((total, layout) => total + layout.bounds.maxY - layout.bounds.minY, 0)
    + STATIC_VERTICAL_GAP * (layouts.length - 1);
}

function shiftLayout(layout, x, y) {
  layout.nodes.forEach((item) => {
    item.x += x;
    item.y += y;
  });
  layout.bounds = getBounds(layout.nodes);
}

function getBounds(nodes) {
  return nodes.reduce((bounds, node) => ({
    minX: Math.min(bounds.minX, node.x),
    minY: Math.min(bounds.minY, node.y),
    maxX: Math.max(bounds.maxX, node.x + node.width),
    maxY: Math.max(bounds.maxY, node.y + node.height),
  }), {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });
}

function renderConnector(item, offsetX, offsetY) {
  const parent = item.parent;
  const onRight = item.x >= parent.x;
  const startX = (onRight ? parent.x + parent.width : parent.x) + offsetX;
  const endX = (onRight ? item.x : item.x + item.width) + offsetX;
  const startY = parent.y + parent.height / 2 + offsetY;
  const endY = item.y + item.height / 2 + offsetY;
  const controlX = startX + (endX - startX) / 2;
  const color = item.branchColor || "#64748b";

  return `<path d="M ${round(startX)} ${round(startY)} C ${round(controlX)} ${round(startY)}, ${round(controlX)} ${round(endY)}, ${round(endX)} ${round(endY)}" fill="none" stroke="${escapeXml(color)}" stroke-width="2"/>`;
}

function renderStaticNode(item, offsetX, offsetY) {
  const style = isObject(item.node.style) ? item.node.style : {};
  const x = round(item.x + offsetX);
  const y = round(item.y + offsetY);
  const fill = style.background || style.backgroundColor || (item.isRoot ? "#1f2937" : "#ffffff");
  const color = style.color || (item.isRoot ? "#ffffff" : "#111827");
  const stroke = getBorderColor(style.border) || item.branchColor || "#d1d5db";
  const fontFamily = style.fontFamily || "Microsoft YaHei, Arial, sans-serif";
  const fontWeight = style.fontWeight || (item.isRoot ? "600" : "400");
  const textDecoration = style.textDecoration || "none";
  const textStartY = y + 10 + item.fontSize;
  const tspans = item.lines.map((line, index) => (
    `<tspan x="${round(x + item.width / 2)}" y="${round(textStartY + index * item.lineHeight)}">${escapeXml(line)}</tspan>`
  )).join("");

  return [
    `<g data-node-id="${escapeXml(item.node.id)}">`,
    `<rect x="${x}" y="${y}" width="${item.width}" height="${item.height}" rx="${item.isRoot ? 10 : 6}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}"/>`,
    `<text text-anchor="middle" font-family="${escapeXml(fontFamily)}" font-size="${item.fontSize}" font-weight="${escapeXml(fontWeight)}" text-decoration="${escapeXml(textDecoration)}" fill="${escapeXml(color)}">${tspans}</text>`,
    "</g>",
  ].join("");
}

function getNodeLabel(node) {
  const icons = Array.isArray(node.icons) ? node.icons.join(" ") : "";
  const tags = Array.isArray(node.tags)
    ? node.tags.map((tag) => typeof tag === "string" ? tag : tag?.text || "").filter(Boolean)
    : [];
  return [icons, String(node.topic || ""), tags.length ? `[${tags.join(", ")}]` : ""]
    .filter(Boolean)
    .join(" ");
}

function wrapLabel(label, maxWidth, fontSize) {
  const maxUnits = Math.max(4, Math.floor(maxWidth / (fontSize * 0.72)));
  const lines = [];

  String(label || "").split(/\r?\n/).forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let line = "";
    let units = 0;
    for (const character of paragraph) {
      const characterUnits = character.codePointAt(0) > 255 ? 2 : 1;
      if (line && units + characterUnits > maxUnits) {
        lines.push(line);
        line = "";
        units = 0;
      }
      line += character;
      units += characterUnits;
    }
    lines.push(line);
  });

  return lines.length ? lines : [""];
}

function estimateTextWidth(text, fontSize) {
  let units = 0;
  for (const character of text) {
    units += character.codePointAt(0) > 255 ? 1 : 0.58;
  }
  return units * fontSize;
}

function getBorderColor(border) {
  if (!border) return "";
  const match = String(border).match(/(#[\da-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)\s*$/i);
  return match?.[1] || "";
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
