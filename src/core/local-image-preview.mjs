import { isLocalAbsolutePath } from "./package-resources.mjs";

export async function hydrateLocalImagePreviews(doc, loadImageResource) {
  return {
    ...doc,
    content: await hydrateLocalImageNodes(doc.content || [], loadImageResource),
  };
}

export async function hydrateDocumentMapLocalImages(documents, loadImageResource) {
  return Object.fromEntries(await Promise.all(
    Object.entries(documents).map(async ([path, doc]) => [
      path,
      await hydrateLocalImagePreviews(doc, loadImageResource),
    ]),
  ));
}

async function hydrateLocalImageNodes(nodes, loadImageResource) {
  return Promise.all(nodes.map(async (node) => {
    const imagePath = node.attrs?.assetSrc || node.attrs?.src;
    if (node.type === "image" && imagePath && isLocalAbsolutePath(imagePath)) {
      try {
        const blob = await loadImageResource(imagePath);
        return {
          ...node,
          attrs: {
            ...node.attrs,
            assetSrc: imagePath,
            src: await blobToDataUrl(blob),
          },
        };
      } catch {
        return node;
      }
    }

    if (node.content) {
      return {
        ...node,
        content: await hydrateLocalImageNodes(node.content, loadImageResource),
      };
    }

    return node;
  }));
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(bytes).toString("base64");
  return `data:${blob.type || "application/octet-stream"};base64,${base64}`;
}
