import { isLocalAbsolutePath, normalizeDocumentResourcePath } from "./package-resources.mjs";

const videoSrcCache = new Map();

let convertFileSrc;

async function getConvertFileSrc() {
  if (!convertFileSrc) {
    try {
      const { convertFileSrc: cfs } = await import("@tauri-apps/api/core");
      convertFileSrc = cfs;
    } catch {
      convertFileSrc = null;
    }
  }
  return convertFileSrc;
}

export async function hydrateLocalImagePreviews(doc, loadImageResource, options = {}) {
  try {
    return {
      ...doc,
      content: await hydrateLocalMediaNodes(doc.content || [], loadImageResource, options),
    };
  } catch (error) {
    console.warn("hydrateLocalImagePreviews failed:", error);
    return doc;
  }
}

export async function hydrateDocumentMapLocalImages(documents, loadImageResource, rootPath = "") {
  return Object.fromEntries(await Promise.all(
    Object.entries(documents).map(async ([path, doc]) => {
      const fullPath = isLocalAbsolutePath(path) ? path : (rootPath ? `${rootPath.replace(/\\/g, "/").replace(/\/$/, "")}/${path}` : path);
      return [path, await hydrateLocalImagePreviews(doc, loadImageResource, { basePath: fullPath })];
    }),
  ));
}

async function hydrateLocalMediaNodes(nodes, loadImageResource, options = {}) {
  const { basePath } = options;

  function resolvePath(resourcePath) {
    if (isLocalAbsolutePath(resourcePath)) {
      return resourcePath;
    }
    if (basePath && !resourcePath.startsWith("http")) {
      return normalizeDocumentResourcePath(resourcePath, basePath);
    }
    return null;
  }

  return Promise.all(nodes.map(async (node) => {
    const resourcePath = node.attrs?.assetSrc || node.attrs?.src;
    const resolvedPath = resolvePath(resourcePath);
    
    if (node.type === "video") {
      console.log("[VIDEO PATH DEBUG]", { nodeType: node.type, resourcePath, resolvedPath, basePath });
    }
    
    if (!resolvedPath) {
      if (node.content) {
        return {
          ...node,
          content: await hydrateLocalMediaNodes(node.content, loadImageResource, options),
        };
      }
      return node;
    }
    
    if (node.type === "image") {
      try {
        const blob = await loadImageResource(resolvedPath);
        return {
          ...node,
          attrs: {
            ...node.attrs,
            assetSrc: resolvedPath,
            src: await blobToDataUrl(blob),
          },
        };
      } catch {
        return node;
      }
    }

    if (node.type === "video") {
      try {
        if (videoSrcCache.has(resolvedPath)) {
          return {
            ...node,
            attrs: {
              ...node.attrs,
              assetSrc: resolvedPath,
              src: videoSrcCache.get(resolvedPath),
            },
          };
        }

        const nativePath = resolvedPath.replace(/\//g, "\\");
        const cfs = await getConvertFileSrc();
        if (cfs) {
          const url = cfs(nativePath);
          console.log("[VIDEO DEBUG]", { resourcePath, resolvedPath, nativePath, basePath, url });
          videoSrcCache.set(resolvedPath, url);
          return {
            ...node,
            attrs: {
              ...node.attrs,
              assetSrc: resolvedPath,
              src: url,
            },
          };
        }

        const blob = await loadImageResource(resolvedPath);
        const url = URL.createObjectURL(blob);
        videoSrcCache.set(resolvedPath, url);
        return {
          ...node,
          attrs: {
            ...node.attrs,
            assetSrc: resolvedPath,
            src: url,
          },
        };
      } catch (error) {
        console.warn("Failed to load video:", resolvedPath, error);
        return node;
      }
    }

    if (node.content) {
      return {
        ...node,
        content: await hydrateLocalMediaNodes(node.content, loadImageResource, options),
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
