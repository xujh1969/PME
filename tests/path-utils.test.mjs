import test from "node:test";
import assert from "node:assert/strict";

import {
  computeRelativePath,
  fileName,
  getSavedMarkdownWorkspacePath,
} from "../src/core/path-utils.mjs";

test("extracts a slash-separated file name", () => {
  assert.equal(fileName("docs/notes/readme.md"), "readme.md");
  assert.equal(fileName("readme.md"), "readme.md");
});

test("extracts a Windows file name", () => {
  assert.equal(fileName("C:\\Users\\A\\Notes.md"), "Notes.md");
});

test("computes relative paths between workspace paths", () => {
  assert.equal(computeRelativePath("docs/images/a.png", "docs"), "images/a.png");
  assert.equal(computeRelativePath("assets/a.png", "docs/post"), "../../assets/a.png");
  assert.equal(computeRelativePath("docs/post/a.png", "docs/post"), "a.png");
});

test("returns target path when relative path inputs are incomplete", () => {
  assert.equal(computeRelativePath("assets/a.png", ""), "assets/a.png");
  assert.equal(computeRelativePath("", "docs"), "");
});

test("normalizes saved markdown paths to workspace markdown file names", () => {
  assert.equal(getSavedMarkdownWorkspacePath("C:/Users/A/Notes.md"), "Notes.md");
  assert.equal(getSavedMarkdownWorkspacePath("C:/Users/A/Notes"), "Notes.md");
  assert.equal(getSavedMarkdownWorkspacePath("C:/Users/A/Notes.markdown"), "Notes.markdown");
});

test("keeps unchanged saved markdown paths from being adopted again", () => {
  assert.equal(getSavedMarkdownWorkspacePath("Draft.md", "Draft.md"), "");
  assert.equal(getSavedMarkdownWorkspacePath("", "Draft.md"), "");
});
