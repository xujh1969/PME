import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractMermaidFromAiText } from "../src/ui/modals.mjs";

const aiServiceSource = readFileSync(new URL("../src/core/ai-service.mjs", import.meta.url), "utf8");
const modalsSource = readFileSync(new URL("../src/ui/modals.mjs", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.mjs", import.meta.url), "utf8");
const aiModalSource = readFileSync(new URL("../src/ui/ai-modal.mjs", import.meta.url), "utf8");
const configSource = readFileSync(new URL("../src/core/config.mjs", import.meta.url), "utf8");

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

test("built-in AI actions return only final usable content", () => {
  assert.equal(configSource.includes('label: "转为表格"'), true);
  assert.equal(aiModalSource.includes("function buildDefaultActionPrompt("), true);
  assert.equal(aiModalSource.includes("DEFAULT_FINAL_OUTPUT_INSTRUCTION"), true);
  assert.equal(aiModalSource.includes("不要输出分析、解释、修改说明、前导语、总结、字数统计或代码围栏"), true);
  assert.equal(aiModalSource.includes('customAction?.id.startsWith("custom_")'), true);
  assert.equal(
    aiModalSource.indexOf("buildDefaultActionPrompt(") < aiModalSource.indexOf('customAction?.id.startsWith("custom_")'),
    true,
  );
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

test("Mermaid AI requests readable semantic colors with a large output budget", () => {
  const mermaidModalSource = modalsSource.slice(
    modalsSource.indexOf("export function openMermaidAiModal"),
    modalsSource.indexOf("export function openSvgAiModal"),
  );

  assert.equal(mermaidModalSource.includes("classDef"), true);
  assert.equal(mermaidModalSource.includes("避免只使用灰白色"), true);
  assert.equal(mermaidModalSource.includes("保证文字与背景有足够对比度"), true);
  assert.equal(mermaidModalSource.includes("maxTokens: 40960"), true);
  assert.equal(mermaidModalSource.includes("timeoutSeconds: 180"), true);
});

test("strips Markdown fences from Mermaid AI responses", () => {
  assert.equal(
    extractMermaidFromAiText("```mermaid\nflowchart TD\n  A-->B\n```"),
    "flowchart TD\n  A-->B",
  );
  assert.equal(
    extractMermaidFromAiText("```\nsequenceDiagram\n  A->>B: Hello\n```"),
    "sequenceDiagram\n  A->>B: Hello",
  );
});

test("cancelling Mermaid AI preserves the existing editor content", () => {
  const textEditorModalSource = modalsSource.slice(
    modalsSource.indexOf("export function openTextEditorModal"),
    modalsSource.indexOf("const DIAGRAM_ICONS"),
  );

  assert.equal(textEditorModalSource.includes('textarea.value = "AI 正在生成中...";'), false);
  assert.equal(textEditorModalSource.includes("let hasReceivedAiChunk = false;"), true);
  assert.equal(textEditorModalSource.includes("if (!hasReceivedAiChunk)"), true);
  assert.equal(textEditorModalSource.includes("const originalValue = textarea.value;"), true);
  assert.equal(textEditorModalSource.includes("onStart?.("), false);
  assert.equal(
    appSource.includes("onAiGenerate: (onChunk, onStart) => openMermaidAiModal({ onChunk, onStart }),"),
    true,
  );
});

test("confirmed Mermaid generation shows progress and returns cleaned source", () => {
  const mermaidModalSource = modalsSource.slice(
    modalsSource.indexOf("export function openMermaidAiModal"),
    modalsSource.indexOf("export function openSvgAiModal"),
  );

  assert.equal(mermaidModalSource.includes('onStart?.("AI 正在生成 Mermaid 代码...")'), true);
  assert.equal(mermaidModalSource.includes("let streamedText = \"\";"), true);
  assert.equal(mermaidModalSource.includes("extractMermaidFromAiText(finalText)"), true);
  assert.equal(mermaidModalSource.includes("resolve(mermaid || finalText)"), true);
  assert.equal(mermaidModalSource.includes("Never include Markdown fences"), true);
});

test("cancelling SVG AI preserves the existing editor content", () => {
  const svgAiModalSource = modalsSource.slice(
    modalsSource.indexOf("export function openSvgAiModal"),
    modalsSource.indexOf("function extractSvgFromAiText"),
  );
  const svgEditorSource = appSource.slice(
    appSource.indexOf("async function editSvgNode"),
    appSource.indexOf("function handleImageClick"),
  );

  assert.equal(svgAiModalSource.includes("resolve(null);"), true);
  assert.equal(svgAiModalSource.includes('onStart?.("AI 正在生成 SVG 代码...")'), true);
  assert.equal(svgEditorSource.includes("return openSvgAiModal({ onChunk, onStart });"), true);
  assert.equal(modalsSource.includes('textarea.value = "AI 正在生成中...";'), false);
});
