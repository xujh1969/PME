import { getAiConfig, isAiEnabled, getActiveAiProvider, getActiveAiSettings } from "./config.mjs";

export async function generateText(prompt, onChunk, options = {}) {
  if (!isAiEnabled()) {
    throw new Error("AI功能未启用，请在配置中开启。");
  }

  const config = getAiConfig();
  const provider = getActiveAiProvider();
  const settings = getActiveAiSettings();

  if (provider === "cloud") {
    if (!settings.apiKey) {
      throw new Error("请配置API密钥。");
    }
    return await callCloudApi(prompt, onChunk, settings, options);
  }

  if (provider === "ollama") {
    if (!settings.model) {
      throw new Error("请配置Ollama模型名称。");
    }
    return await callOllamaApi(prompt, onChunk, settings, options);
  }

  throw new Error("未知的AI模型提供者。");
}

async function callCloudApi(prompt, onChunk, settings, options) {
  const { apiKey, endpoint, model, timeout } = settings;
  const baseUrl = endpoint || getDefaultEndpoint(settings.platform);
  const finalModel = model || getDefaultModel(settings.platform);

  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    if (settings.platform === "openai") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
  }

  const body = buildCloudRequestBody(prompt, finalModel, settings.platform, options);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), (timeout || 30) * 1000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = `API请求失败 (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        message = errorData.error?.message || message;
      } catch {
        message = errorText || message;
      }
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const result = await response.json();
      const text = extractCloudResponse(result, settings.platform);
      onChunk?.(text);
      return text;
    }

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const chunk = extractCloudStreamChunk(parsed, settings.platform);
          if (chunk) {
            fullText += chunk;
            onChunk?.(chunk);
          }
        } catch {
        }
      }
    }

    return fullText;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("请求超时，请检查网络或增加超时时间。");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOllamaApi(prompt, onChunk, settings, options) {
  const { endpoint, model, timeout } = settings;
  const baseUrl = endpoint || "http://localhost:11434";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), (timeout || 60) * 1000);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        options: {
          num_ctx: settings.maxContext || 4000,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = `Ollama请求失败 (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        message = errorData.error || message;
      } catch {
        message = errorText || message;
      }
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const result = await response.json();
      const text = result.message?.content || "";
      onChunk?.(text);
      return text;
    }

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message?.content) {
            fullText += parsed.message.content;
            onChunk?.(parsed.message.content);
          }
        } catch {
        }
      }
    }

    return fullText;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Ollama请求超时，请检查服务是否正常运行。");
    }
    if (error.message?.includes("fetch") || error.message?.includes("network")) {
      throw new Error("无法连接Ollama服务，请确保Ollama已启动并运行。");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getDefaultEndpoint(platform) {
  switch (platform) {
    case "openai":
      return "https://api.openai.com/v1";
    case "tongyi":
      return "https://dashscope.aliyuncs.com/api/v1";
    case "doubao":
    default:
      return "https://api.doubao.com/v1";
  }
}

function getDefaultModel(platform) {
  switch (platform) {
    case "openai":
      return "gpt-4o-mini";
    case "tongyi":
      return "qwen-turbo";
    case "doubao":
    default:
      return "doubao-pro-32k";
  }
}

function buildCloudRequestBody(prompt, model, platform, options) {
  const baseBody = {
    model,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.7,
  };

  if (platform === "tongyi") {
    return {
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
      },
      parameters: {
        result_format: "message",
        stream: true,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      },
    };
  }

  return baseBody;
}

function extractCloudResponse(result, platform) {
  if (platform === "tongyi") {
    return result.output?.choices?.[0]?.message?.content || "";
  }
  return result.choices?.[0]?.message?.content || "";
}

function extractCloudStreamChunk(parsed, platform) {
  if (platform === "tongyi") {
    return parsed.output?.choices?.[0]?.message?.content || "";
  }
  return parsed.choices?.[0]?.delta?.content || "";
}

export async function testConnection(settings) {
  const { provider, cloud, ollama } = settings;

  if (provider === "cloud") {
    if (!cloud.apiKey) {
      return { success: false, message: "请输入API密钥" };
    }
    const { apiKey, endpoint, model, timeout } = cloud;
    const baseUrl = endpoint || getDefaultEndpoint(cloud.platform || "doubao");
    const finalModel = model || getDefaultModel(cloud.platform || "doubao");

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    const body = buildCloudRequestBody("你好，请用一句话介绍自己", finalModel, cloud.platform || "doubao", { maxTokens: 50 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (timeout || 30) * 1000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `连接失败 (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          message = errorData.error?.message || message;
        } catch {
          message = errorText || message;
        }
        return { success: false, message };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const result = await response.json();
        const text = extractCloudResponse(result, cloud.platform || "doubao");
        return { success: !!text, message: text ? "连接成功！" : "连接成功，但未返回有效响应" };
      }

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done || fullText.length > 100) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const chunk = extractCloudStreamChunk(parsed, cloud.platform || "doubao");
            if (chunk) {
              fullText += chunk;
            }
          } catch {
          }
        }
      }

      return { success: !!fullText, message: fullText ? "连接成功！" : "连接成功，但未返回有效响应" };
    } catch (error) {
      if (error.name === "AbortError") {
        return { success: false, message: "请求超时，请检查网络或增加超时时间" };
      }
      return { success: false, message: error.message || "连接失败" };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (provider === "ollama") {
    if (!ollama.model) {
      return { success: false, message: "请输入Ollama模型名称" };
    }
    const { endpoint, model, timeout } = ollama;
    const baseUrl = endpoint || "http://localhost:11434";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (timeout || 60) * 1000);

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "你好" }],
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Ollama连接失败 (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          message = errorData.error || message;
        } catch {
          message = errorText || message;
        }
        return { success: false, message };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const result = await response.json();
        const text = result.message?.content || "";
        return { success: !!text, message: text ? "连接成功！" : "连接成功，但未返回有效响应" };
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done || fullText.length > 50) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              fullText += parsed.message.content;
            }
          } catch {
          }
        }
      }

      return { success: !!fullText, message: fullText ? "连接成功！" : "连接成功，但未返回有效响应" };
    } catch (error) {
      if (error.name === "AbortError") {
        return { success: false, message: "请求超时，请检查Ollama服务是否运行" };
      }
      if (error.message?.includes("fetch") || error.message?.includes("network")) {
        return { success: false, message: "无法连接Ollama服务，请确保Ollama已启动" };
      }
      return { success: false, message: error.message || "连接失败" };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { success: false, message: "未知的模型提供者" };
}

export function buildPolishPrompt(text, action) {
  const actionDescriptions = {
    polish: "请对以下文本进行智能润色，提升表达质量和流畅度，保持原文核心意思不变。",
    shorten: "请精简压缩以下文本，去除冗余内容，保留核心信息。",
    expand: "请对以下文本进行内容扩写，补充细节和背景信息，使内容更丰富。",
    formalize: "请将以下文本改写为正式风格，适合商务、学术或正式文档使用。",
    casualize: "请将以下文本改写为口语化风格，使其更自然、亲切。",
  };

  return `${actionDescriptions[action] || actionDescriptions.polish}\n\n文本内容：\n${text}`;
}

export function buildTranslatePrompt(text, targetLang) {
  const langNames = {
    zh: "中文",
    en: "英文",
    ja: "日文",
    ko: "韩文",
  };

  return `请将以下文本翻译成${langNames[targetLang] || targetLang}，保留原文的段落结构和排版格式，输出标准Markdown文本。

文本内容：
${text}`;
}

export function buildSummaryPrompt(text, length) {
  const lengthConfig = {
    short: { name: "简短", words: 100 },
    medium: { name: "中等", words: 300 },
    long: { name: "详细", words: 500 },
  };

  const config = lengthConfig[length] || lengthConfig.medium;

  return `请对以下文本生成${config.name}摘要，控制在约${config.words}字左右，提取核心要点和关键信息，保持逻辑连贯，输出标准Markdown文本。

文本内容：
${text}`;
}

export function buildContinuePrompt(text, length) {
  const lengthConfig = {
    short: { name: "短句补充", description: "补充少量内容" },
    medium: { name: "常规段落", description: "生成一个完整段落" },
    long: { name: "长文拓展", description: "展开多个段落" },
  };

  const config = lengthConfig[length] || lengthConfig.medium;

  return `请根据以下文本的上下文，以${config.name}的方式继续续写内容。保持与原文一致的文风、逻辑和语气，确保续写内容自然流畅，与前文衔接紧密。

上文内容：
${text}`;
}

export function buildTemplatePrompt(templateType, text) {
  const templateConfigs = {
    software_doc: {
      name: "软件说明书",
      description: "完整的软件产品使用说明文档",
      structure: "1.产品概述 2.功能介绍 3.安装指南 4.使用教程 5.常见问题 6.更新日志",
    },
    tech_doc: {
      name: "技术文档",
      description: "技术方案设计文档",
      structure: "1.需求分析 2.技术选型 3.架构设计 4.接口说明 5.数据库设计 6.部署方案",
    },
    weekly_report: {
      name: "周报",
      description: "工作周报模板",
      structure: "1.本周工作完成情况 2.工作中遇到的问题 3.下周工作计划",
    },
    meeting_minutes: {
      name: "会议纪要",
      description: "会议记录模板",
      structure: "1.会议信息 2.会议议程 3.讨论内容 4.决议事项 5.待办事项",
    },
    reading_notes: {
      name: "读书笔记",
      description: "阅读笔记模板",
      structure: "1.书籍信息 2.核心观点 3.精彩摘录 4.个人感悟 5.行动计划",
    },
    prd: {
      name: "PRD方案",
      description: "产品需求文档",
      structure: "1.产品背景 2.用户需求 3.功能描述 4.交互设计 5.非功能需求 6.优先级",
    },
  };

  const config = templateConfigs[templateType] || templateConfigs.tech_doc;

  return `请将以下文本内容按照${config.name}的格式进行结构化整理和重写。

原始文本内容：
${text}

要求：
1. 使用标准Markdown格式，包含完整的层级标题结构（#、##、###）
2. 按照以下结构组织内容：${config.structure}
3. 将原始文本中的相关信息提取并填充到对应的章节中
4. 保持文档结构清晰，逻辑连贯
5. 输出标准Markdown纯文本，无多余格式

请直接输出整理后的文档内容：`;
}

export function buildTablePrompt(text, action) {
  if (action === "convert") {
    return `请将以下文本内容转换为标准的Markdown表格。

原始文本：
${text}

要求：
1. 分析文本中的结构化数据，提取表头和数据行
2. 使用标准Markdown表格语法，包含表头和表格内容
3. 表格对齐方式使用标准语法（:--- 左对齐，:---: 居中，---: 右对齐）
4. 根据内容自动选择合适的对齐方式
5. 输出完整的表格代码，无需其他解释文字`;
  }

  if (action === "generate") {
    return `请根据以下描述生成一个标准的Markdown表格。

描述：
${text}

要求：
1. 使用标准Markdown表格语法，包含表头和表格内容
2. 表格对齐方式使用标准语法（:--- 左对齐，:---: 居中，---: 右对齐）
3. 根据内容自动选择合适的对齐方式
4. 输出完整的表格代码，无需其他解释文字`;
  }

  const actionConfigs = {
    optimize: "优化表格布局、对齐方式和内容格式",
    addRow: "在表格末尾添加一行新数据",
    addCol: "在表格末尾添加一列新数据",
    translate: "将表格内容翻译成中文（保留表头结构）",
  };

  const actionDesc = actionConfigs[action] || actionConfigs.optimize;

  return `请${actionDesc}。

当前表格内容：
${text}

要求：
1. 保持表格结构完整，不丢失原有数据
2. 使用标准Markdown表格语法
3. 输出优化后的完整表格代码，无需其他解释文字`;
}