export function getClipboardHtmlImageUrlFromHtml(html, decodeHtmlEntities = (value) => value) {
  const match = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (!match) {
    return "";
  }
  const src = decodeHtmlEntities(match[1].trim());
  return /^(https?:|data:)/i.test(src) ? src : "";
}
