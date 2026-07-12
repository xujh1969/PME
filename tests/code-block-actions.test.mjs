import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const actionsSource = readFileSync(new URL("../src/editor/code-block-actions.mjs", import.meta.url), "utf8");
const languageModalSource = readFileSync(new URL("../src/ui/code-language-modal.mjs", import.meta.url), "utf8");

test("owns code block keyboard behavior outside the app entry", () => {
  assert.equal(actionsSource.includes("export const SmartCodeBlockLowlight"), true);
  assert.equal(actionsSource.includes("export function handleCodeBlockEnter"), true);
  assert.equal(actionsSource.includes("export function handleCodeBlockIndent"), true);
  assert.equal(actionsSource.includes("export function handleCodeBlockOutdent"), true);
  assert.equal(actionsSource.includes("getNextCodeLineIndent"), true);
  assert.equal(appSource.includes("CodeBlockLowlight.extend"), false);
  assert.equal(appSource.includes("function handleCodeBlockEnter"), false);
});

test("owns the code language picker outside the app entry", () => {
  assert.equal(languageModalSource.includes("export function openCodeLanguageModal"), true);
  assert.equal(languageModalSource.includes('["javascript", "JavaScript"]'), true);
  assert.equal(appSource.includes("function openCodeLanguageModal"), false);
  assert.equal(appSource.includes("const codeLanguageOptions"), false);
});
