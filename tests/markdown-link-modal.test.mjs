import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modalSource = readFileSync(new URL("../src/ui/markdown-link-modal.mjs", import.meta.url), "utf8");
const adapterSource = readFileSync(new URL("../src/core/tauri-workspace.mjs", import.meta.url), "utf8");

test("provides a local markdown picker with custom display text", () => {
  assert.equal(modalSource.includes("export function openMarkdownLinkModal"), true);
  assert.equal(modalSource.includes("data-markdown-link-path"), true);
  assert.equal(modalSource.includes("data-markdown-link-label"), true);
  assert.equal(modalSource.includes("pickMarkdownLinkFile"), true);
});

test("exposes absolute markdown selection and text loading through the adapter", () => {
  assert.equal(adapterSource.includes("async pickMarkdownLinkFile()"), true);
  assert.equal(adapterSource.includes('invokeCommand("pick_markdown_link_dialog")'), true);
  assert.equal(adapterSource.includes("async readTextFilePath(filePath)"), true);
  assert.equal(adapterSource.includes('invokeCommand("read_text_file_path"'), true);
  assert.equal(adapterSource.includes("adoptSavedFile"), true);
  assert.equal(adapterSource.includes("async writeTextFilePath(filePath, content)"), true);
});
