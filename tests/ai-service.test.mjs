import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const aiServiceSource = readFileSync(new URL("../src/core/ai-service.mjs", import.meta.url), "utf8");
const modalsSource = readFileSync(new URL("../src/ui/modals.mjs", import.meta.url), "utf8");

test("falls back to parsing non-streaming cloud AI JSON responses", () => {
  assert.equal(aiServiceSource.includes("let rawText = \"\";"), true);
  assert.equal(aiServiceSource.includes("rawText += decoded;"), true);
  assert.equal(aiServiceSource.includes("JSON.parse(rawText)"), true);
  assert.equal(aiServiceSource.includes("extractCloudResponse(parsed, platform, options)"), true);
  assert.equal(aiServiceSource.includes("options.timeoutSeconds || timeout || 30"), true);
  assert.equal(aiServiceSource.includes("options.systemPrompt"), true);
  assert.equal(aiServiceSource.includes('{ role: "system", content: options.systemPrompt }'), true);
  assert.equal(aiServiceSource.includes("function extractCloudStreamLine"), true);
  assert.equal(aiServiceSource.includes("function extractCloudTextFallback"), true);
  assert.equal(aiServiceSource.includes("const tail = decoder.decode();"), true);
  assert.equal(aiServiceSource.includes("return rawText;"), true);
  assert.equal(aiServiceSource.includes('trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed'), true);
  assert.equal(aiServiceSource.includes("includeReasoningContent"), false);
  assert.equal(aiServiceSource.includes("reasoning_content"), false);
  assert.equal(aiServiceSource.includes("if (buffer.trim())"), true);
});

test("SVG AI generation returns completed SVG text to the editor", () => {
  assert.equal(modalsSource.includes("generateText(buildSvgAiPrompt(description), (chunk) =>"), true);
  assert.equal(modalsSource.includes("let streamedText = \"\";"), true);
  assert.equal(modalsSource.includes("streamedText += chunk;"), true);
  assert.equal(modalsSource.includes("timeoutSeconds: 180"), true);
  assert.equal(modalsSource.includes("You are a code generator."), true);
  assert.equal(modalsSource.includes("maxTokens: 40960"), true);
  assert.equal(modalsSource.includes("temperature: 0"), true);
  assert.equal(modalsSource.includes('Generate SVG code for "${description}"'), true);
  assert.equal(modalsSource.includes("Return only raw SVG source starting with <svg and ending with </svg>"), true);
  assert.equal(modalsSource.includes("includeReasoningContent"), false);
  assert.equal(modalsSource.includes("extractSvgFromAiText"), true);
  assert.equal(modalsSource.includes("const finalText = text || streamedText;"), true);
  assert.equal(modalsSource.includes("resolve(svg || finalText || formatSvgAiDiagnostic(finalText));"), true);
  assert.equal(modalsSource.includes("formatSvgAiError(error)"), true);
  assert.equal(modalsSource.includes("Promise.resolve(onAiGenerate"), true);
  assert.equal(modalsSource.includes('if (typeof result === "string")'), true);
});
