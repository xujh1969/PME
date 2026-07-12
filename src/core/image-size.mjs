export function normalizeImageWidth(value) {
  const width = Number.parseInt(value, 10);
  return Number.isFinite(width) && width > 0 ? width : null;
}

export function normalizeImageScale(value) {
  const scale = Number.parseInt(value, 10);
  return Number.isFinite(scale) && scale > 0 ? scale : null;
}

export function getRenderedImageWidth(attributes) {
  if (attributes.scale && attributes.originalWidth) {
    return getScaledImageWidth(attributes.scale, attributes.originalWidth);
  }
  return attributes.width || null;
}

export function getScaledImageWidth(scale, originalWidth) {
  return scale && originalWidth ? Math.round(originalWidth * scale / 100) : null;
}
