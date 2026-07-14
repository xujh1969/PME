import { strToU8, zipSync } from "fflate";

import { serializeMarkdown } from "./markdown.mjs";
import { packageImageNodes, packageVideoNodes } from "./package-resources.mjs";
import { collectLinkedMarkdownPackage } from "./linked-markdown-package.mjs";

export async function buildMarkdownPackage({
  doc,
  imageNodes,
  videoNodes,
  markdownName,
  rootSourcePath,
  loadText,
  loadImageResource,
}) {
  if (loadText) {
    const packageResult = await collectLinkedMarkdownPackage({
      rootDoc: doc,
      rootName: markdownName,
      rootSourcePath,
      loadText,
      loadImageResource,
    });
    return {
      blob: new Blob([zipSync(packageResult.entries)], { type: "application/zip" }),
      missing: packageResult.missing,
    };
  }

  const imageResult = await packageImageNodes(imageNodes, loadImageResource);
  const videoResult = videoNodes ? await packageVideoNodes(videoNodes, loadImageResource) : { entries: {}, missing: [] };
  const zipEntries = { ...imageResult.entries, ...videoResult.entries };

  zipEntries[markdownName] = strToU8(serializeMarkdown(doc, { basePath: markdownName }));
  return {
    blob: new Blob([zipSync(zipEntries)], { type: "application/zip" }),
    missing: [...imageResult.missing, ...videoResult.missing],
  };
}

export function getMarkdownPackageFileName(markdownName) {
  return `${markdownName.replace(/\.(md|markdown)$/i, "") || "document"}.zip`;
}
