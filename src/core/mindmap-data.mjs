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

export function buildMindMapFallbackSvg(data) {
  const normalized = normalizeMindMapData(data);
  const topic = normalized.data?.nodeData?.topic || "思维导图";
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">',
    '<rect width="800" height="480" fill="#ffffff"/>',
    '<rect x="300" y="205" width="200" height="70" rx="10" fill="#f8f8f8" stroke="#d6d3d1"/>',
    `<text x="400" y="247" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="20" fill="#0c0a09">${escapeXml(topic)}</text>`,
    "</svg>",
  ].join("");
}

function ensureMindMapShape(value) {
  const nodeData = value?.nodeData || value;
  return {
    ...value,
    nodeData: ensureMindMapNode(nodeData, "root"),
  };
}

function ensureMindMapNode(node, fallbackId) {
  return {
    id: String(node?.id || fallbackId),
    topic: String(node?.topic || "中心主题"),
    children: Array.isArray(node?.children)
      ? node.children.map((child, index) => ensureMindMapNode(child, `${fallbackId}-${index + 1}`))
      : [],
  };
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
