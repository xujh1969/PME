import { strToU8, zipSync } from "fflate";

import { serializeMarkdown } from "./markdown.mjs";
import { packageImageNodes } from "./package-resources.mjs";
import { collectLinkedMarkdownPackage } from "./linked-markdown-package.mjs";

export async function buildMarkdownPackage({
  doc,
  imageNodes,
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

  const packageResult = await packageImageNodes(imageNodes, loadImageResource);
  const zipEntries = { ...packageResult.entries };

  zipEntries[markdownName] = strToU8(serializeMarkdown(doc, { basePath: markdownName }));
  return {
    blob: new Blob([zipSync(zipEntries)], { type: "application/zip" }),
    missing: packageResult.missing,
  };
}

export function getMarkdownPackageFileName(markdownName) {
  return `${markdownName.replace(/\.(md|markdown)$/i, "") || "document"}.zip`;
}
