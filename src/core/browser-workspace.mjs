import { createWorkspaceSnapshot, getDefaultWorkspaceConfig } from "./workspace.mjs";
import { getBlobFingerprint, isSupportedImageName } from "./assets.mjs";

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function createWorkspaceOnDisk(parentHandle, projectName) {
  const snapshot = createWorkspaceSnapshot(projectName);
  const config = getDefaultWorkspaceConfig(projectName);
  const rootHandle = await parentHandle.getDirectoryHandle(config.projectName, { create: true });

  for (const directoryPath of snapshot.directories) {
    await ensureDirectory(rootHandle, directoryPath);
  }

  for (const [path, content] of Object.entries(snapshot.files)) {
    await writeTextFile(rootHandle, path, content);
  }

  return openWorkspaceFromDirectory(rootHandle);
}

export async function openWorkspaceFromDirectory(rootHandle) {
  const files = {};
  const fileHandles = {};
  const assetIndex = {};
  const paths = [];

  await collectFiles(rootHandle, "", async (path, fileHandle) => {
    paths.push(path);
    if (!fileHandle) {
      return;
    }
    fileHandles[path] = fileHandle;

    if (path.endsWith(".md")) {
      files[path] = await readTextFile(fileHandle);
    } else if (isSupportedImageName(path)) {
      const file = await fileHandle.getFile();
      files[path] = URL.createObjectURL(file);
      assetIndex[await getBlobFingerprint(file)] = {
        alt: getBaseName(file.name),
        assetPath: path,
        previewUrl: files[path],
      };
    }
  });

  return {
    projectName: getDefaultWorkspaceConfig(rootHandle.name).projectName,
    files,
    fileHandles,
    assetIndex,
    paths,
    rootHandle,
  };
}

export async function writeTextFile(rootHandle, path, content) {
  const fileHandle = await getFileHandle(rootHandle, path, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  return fileHandle;
}

export async function writeBlobFile(rootHandle, path, blob) {
  const fileHandle = await getFileHandle(rootHandle, path, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return fileHandle;
}

export async function removeFile(rootHandle, path) {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop();
  let directory = rootHandle;

  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part);
  }

  await directory.removeEntry(fileName);
}

async function collectFiles(directoryHandle, basePath, onFile) {
  for await (const [name, handle] of directoryHandle.entries()) {
    const path = basePath ? `${basePath}/${name}` : name;
    if (handle.kind === "directory") {
      await onFile(`${path}/`, null);
      await collectFiles(handle, path, onFile);
    } else {
      await onFile(path, handle);
    }
  }
}

async function readTextFile(fileHandle) {
  return (await fileHandle.getFile()).text();
}

async function getFileHandle(rootHandle, path, options) {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop();
  let directory = rootHandle;

  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: options.create });
  }

  return directory.getFileHandle(fileName, options);
}

async function ensureDirectory(rootHandle, path) {
  const parts = path.split("/").filter(Boolean);
  let directory = rootHandle;

  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: true });
  }

  return directory;
}

function getBaseName(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
}
