export const DEFAULT_CONFIG = {
  fonts: {
    chinese: "Noto Sans SC, \"Microsoft YaHei\", \"PingFang SC\", sans-serif",
    english: "\"Inter\", \"SF Pro Display\", \"Segoe UI\", sans-serif",
    code: "\"JetBrains Mono\", \"Fira Code\", \"Consolas\", monospace",
  },
  theme: "light",
  ai: {
    enabled: true,
    provider: "cloud",
    cloud: {
      platform: "doubao",
      apiKey: "",
      endpoint: "",
      model: "",
      timeout: 30,
      maxContext: 4000,
    },
    ollama: {
      endpoint: "http://localhost:11434",
      model: "",
      timeout: 60,
      maxContext: 4000,
    },
    actions: [
      { id: "polish", label: "智能润色", description: "提升表达质量和流畅度", prompt: "【角色】你是一位拥有10年以上经验的资深文字编辑，擅长新闻、商务和学术写作。\n【任务】对以下文本进行深度润色。\n【核心原则】\n1. 原意零改动：不得增删、改变任何事实、数据、逻辑关系或情感倾向。\n2. 流畅度提升：优化句式结构，修正拗口、啰嗦或生硬的表达，使读起来一气呵成。\n3. 专业度增强：根据上下文，将口语化或模糊词汇替换为更精准、更有分量的书面语。\n4. 说服力强化：适当调整语序或措辞，突出核心论点，增强因果/递进关系，使逻辑更清晰有力。\n【输出格式】直接输出润色后的完整文本，并在文末用【修改说明】列出3条关键改动及理由（不超过50字/条）。\n【待润色文本】：\n{{text}}" },
      { id: "shorten", label: "精简压缩", description: "去除冗余，保留核心信息", prompt: "【角色】你是一位顶级商业报告摘要专家，擅长信息提纯和极简表达。\n【任务】对以下文本进行高强度精简压缩，目标字数不超过原文的60%。\n【操作准则】\n1. 删除所有重复表述、举例说明、背景铺垫和过渡句。\n2. 合并同类项：将相似观点合并为一句概括性陈述。\n3. 保留骨干：仅保留「核心结论」「关键数据」「重要因果关系」「行动建议」四类信息。\n4. 避免碎片化：即使精简，句子间仍要保持逻辑衔接，不能变成关键词堆砌。\n【输出格式】直接输出精简后的连续段落（不分点），末尾标注“压缩后字数/原字数”。\n【待精简文本】：\n{{text}}" },
      { id: "expand", label: "内容扩写", description: "补充细节，丰富内容", prompt: "【角色】你是一位擅长深度报道的专栏作家，善于用细节和案例让观点落地。\n【任务】在不偏离原文主旨和逻辑框架的前提下，将以下文本扩写至原字数的150%左右。\n【扩写方向】（请根据内容选择至少2项）：\n- 增加具体实例或场景化描写，让抽象概念具象化。\n- 补充背景信息或行业现状，说明“为什么这很重要”。\n- 插入权威数据或引用（可合理虚构，但要符合常识）。\n- 扩展论证链条，补充“如何做”或“会怎样”的推演。\n【约束】不得改变原文的核心观点、结构顺序和关键数据；新增内容需与原文风格自然融合。\n【输出格式】直接输出扩写后的完整文章，并在末尾用【扩写说明】列出你补充了哪几类内容。\n【待扩写文本】：\n{{text}}" },
      { id: "formalize", label: "正式化", description: "适合商务、学术文档", prompt: "【角色】你是一位严谨的学术期刊审稿人或企业战略文件起草者。\n【任务】将以下文本改写为正式、专业的商务/学术风格。\n【改写规则】：\n1. 词汇替换：将所有口语词（如“搞”、“挺”、“不错”）替换为书面语（如“开展”、“颇为”、“优良/显著”）。\n2. 术语注入：在合适位置引入领域内专业术语，提升权威感。\n3. 句式调整：避免短句堆砌，使用复合句、名词化结构和被动语态。\n4. 语气客观：删除“我觉得”、“大家知道”等主观表述，改用“数据显示”、“据分析”或“可见”。\n5. 格式规范：如有需要，可使用“首先/其次/最后”或“1. 2. 3.”等逻辑标记。\n【输出格式】直接输出正式化后的文本。\n【待改写文本】：\n{{text}}" },
      { id: "casualize", label: "口语化", description: "更自然、亲切", prompt: "【角色】你是一位受欢迎的知识类播客主播，善于用最接地气的方式把复杂事情讲明白。\n【任务】将以下文本改写为自然流畅的口语化表达。\n【技巧要求】：\n1. 用短句和主动语态，避免长定语和嵌套从句。\n2. 加入口语词：适当使用“其实”、“怎么说呢”、“你想想”、“说白了”等过渡词。\n3. 人称互动：多用“你”、“我们”，营造对话感。\n4. 修辞生动：用比喻、反问、感叹等，增加趣味性。\n5. 简化概念：用生活化的类比解释专业术语，但要保证准确。\n【保留】核心事实和逻辑不能丢失，但可以用更随意的方式串联。\n【输出格式】直接输出口语化文本，并标注【适合场景】如“播客脚本/短视频文案/内部闲聊版”。\n【待改写文本】：\n{{text}}" },
      { id: "translate", label: "文本翻译", description: "中英日韩互译", prompt: "【角色】你是一位拥有CATTI一级证书的资深翻译，专攻[商务/技术/文学/法律]领域。\n【任务】将以下文本翻译为[目标语言]。\n【翻译准则】：\n1. 准确性第一：专有名词、数字、日期、术语必须100%正确，不得意译。\n2. 自然流畅：译文需符合目标语言的表达习惯，避免“翻译腔”。\n3. 风格一致：原文如果是正式文体，译文保持正式；原文是口语，译文也需口语化。\n4. 文化适配：处理俚语、典故时采用功能对等译法，让目标读者能无障碍理解。\n【输出格式】分三段输出：① 译文正文；② 关键术语对照表（3-5个）；③ 翻译难点说明（如有）。\n【待翻译文本】：\n{{text}}" },
      { id: "summary", label: "生成摘要", description: "提取核心要点", prompt: "【角色】你是一位专业的信息提炼师，擅长用最少的字数覆盖最全的要点。\n【任务】为以下文本生成一篇高度浓缩的摘要，严格控制在150字左右（±10字）。\n【摘要结构】（必须包含）：\n- 背景/目的：为什么要做这件事或写这份材料。\n- 核心内容：主要发现了什么、提出了什么或发生了什么。\n- 结论/意义：最终结果或后续影响。\n【写作要求】：\n- 用客观陈述句，不出现“本文”、“笔者”等提示词。\n- 不引用具体例子、不展开论证过程。\n- 句子之间要有逻辑连接词，不能是散装信息。\n【输出格式】仅输出摘要正文，末尾用括号标注字数。\n【待摘要文本】：\n{{text}}" },
      { id: "continue", label: "智能续写", description: "承接前文逻辑续写", prompt: "【角色】你是一位擅长模仿风格的同人作者/专栏代笔人。\n【任务】阅读以下文本，分析其风格（语气、词汇偏好、句式长短、情感基调），然后进行智能续写，续写部分约200-300字。\n【续写方向】（请选择最合适的一项）：\nA. 逻辑深化：继续阐述上一个论点的影响或应对方案。\nB. 自然过渡：如果原文已近结尾，则负责写出总结升华或呼吁行动。\nC. 例证补充：如果原文提出观点但缺少实例，续写可补1-2个具体案例。\n【风格强制匹配】：\n- 原文字均长度若短，续写也用短句；原文字均若长，续写用长句。\n- 原文若偏正式，续写不得出现口语词；反之亦然。\n【输出格式】直接输出续写内容（不加“续写如下”等前缀），并在文末用【风格匹配说明】简述你抓取到的3个风格特征。\n【待续写文本】：\n{{text}}" },
      { id: "template", label: "生成模板", description: "一键生成文档模板", prompt: "【角色】你是一位资深文档架构师，精通各类商务、技术和管理文档的范式。\n【任务】阅读以下内容，识别其所属的文档类型（如项目方案、会议纪要、调研报告、合作协议、工作计划等），然后生成一份该类型的标准模板。\n【模板要求】：\n1. 完整结构：包含该类型文档应有的全部一级章节（如背景、目标、范围、方法、时间表、预算、风险等）。\n2. 层级合理：使用多级标题（# / ## / ###），并附上各章节的填表说明或写作指引（用括号斜体注明）。\n3. 通用性：模板内容尽量通用，避免过度依赖原文细节，但需保留原文提到的关键字段（如项目名称可保留为占位符【项目名称】）。\n4. 附加提示：在模板末尾附上“填写注意事项”（如哪些部分需多方确认、常见遗漏项等）。\n【输出格式】纯Markdown格式，可直接复制使用。\n【参考内容】：\n{{text}}" },
      { id: "table", label: "生成表格", description: "自然语言生成表格", prompt: "【角色】你是一位数据可视化与信息整理专家。\n【任务】从以下文本中提取可结构化的信息，将其整理为一个或多个Markdown表格。\n【制表原则】：\n1. 识别维度：判断最适合表格化的维度——是“特征对比”、“时间进度”、“问题-对策”、“成员-职责”还是“数据统计”。\n2. 设计列头：选择最精炼、最直观的列名，每列属性一致。\n3. 提炼行项：每行代表一个独立实体或阶段，内容不重复。\n4. 合并/拆分：如果信息复杂，可拆分为多个小表，每个表聚焦一个主题。\n5. 补充说明：若原文信息不足，可合理推断填充，但需用*斜体*标注为“推断内容”。\n【输出格式】直接输出一个或多个Markdown表格，表前用一句话说明“本表格展示了…”。\n【待整理文本】：\n{{text}}" },
    ],
    customActions: [],
  },
};

let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

export async function initConfig() {
  try {
    const configContent = await readConfigFile();
    if (configContent) {
      const saved = JSON.parse(configContent);
      config = mergeConfig(DEFAULT_CONFIG, saved);
      if (config.ai?.cloud?.apiKey) {
        config.ai.cloud.apiKey = decryptValue(config.ai.cloud.apiKey);
      }
    }
  } catch {
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  
  // 默认 AI 功能始终从代码加载，不使用配置文件中的值
  delete config.ai.actions;
  
  try {
    await import("@tauri-apps/api/core");
  } catch {
    config.ai.enabled = true;
  }
  
  applyFontsToEditor();
  applyTheme();
  applyAiEnabledState();
}

function mergeConfig(defaults, saved) {
  const result = { ...defaults };
  for (const key of Object.keys(saved || {})) {
    if (
      defaults[key] &&
      typeof defaults[key] === "object" &&
      !Array.isArray(defaults[key]) &&
      saved[key] &&
      typeof saved[key] === "object"
    ) {
      result[key] = mergeConfig(defaults[key], saved[key]);
    } else {
      result[key] = saved[key];
    }
  }
  return result;
}

export async function saveConfig() {
  try {
    const snapshot = JSON.parse(JSON.stringify(config));
    if (snapshot.ai?.cloud?.apiKey) {
      snapshot.ai.cloud.apiKey = encryptValue(snapshot.ai.cloud.apiKey);
    }
    // 默认 AI 功能始终从代码加载，不持久化到配置文件
    if (snapshot.ai) {
      delete snapshot.ai.actions;
    }
    await writeConfigFile(JSON.stringify(snapshot, null, 2));
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

let tauriInvoke = null;

async function ensureTauri() {
  if (tauriInvoke) return true;
  if (typeof window !== "undefined") {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      tauriInvoke = invoke;
      return true;
    } catch {
      console.warn("[PME Config] Tauri API not available");
    }
  }
  return false;
}

async function readConfigFile() {
  if (await ensureTauri()) {
    try {
      const result = await tauriInvoke("read_config_file");
      return result;
    } catch (error) {
      console.error("[PME Config] Failed to read config via Tauri:", error);
      return null;
    }
  }
  try {
    const response = await fetch("./.pme/config.json");
    if (response.ok) {
      return await response.text();
    }
  } catch {
  }
  return null;
}

async function writeConfigFile(content) {
  if (await ensureTauri()) {
    try {
      console.log("[PME Config] Writing config via Tauri...");
      await tauriInvoke("write_config_file", { content });
      console.log("[PME Config] Config written successfully");
      return;
    } catch (error) {
      console.error("[PME Config] Failed to write config via Tauri:", error);
      console.error("[PME Config] Error stack:", error?.stack);
    }
  }
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ".pme/config.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getConfig() {
  return { ...config };
}

export function setFonts(fonts) {
  config.fonts = { ...DEFAULT_CONFIG.fonts, ...fonts };
  applyFontsToEditor();
}

function applyFontsToEditor() {
  document.documentElement.style.setProperty("--font-family-chinese", config.fonts.chinese);
  document.documentElement.style.setProperty("--font-family-english", config.fonts.english);
  document.documentElement.style.setProperty("--font-family-code", config.fonts.code);
  
  let style = document.getElementById("pme-font-styles");
  if (!style) {
    style = document.createElement("style");
    style.id = "pme-font-styles";
    document.head.appendChild(style);
  }
  style.textContent = `
    .ProseMirror {
      font-family: var(--font-family-chinese), var(--font-family-english) !important;
    }
    .ProseMirror code,
    .ProseMirror pre {
      font-family: var(--font-family-code) !important;
    }
    .ProseMirror h1,
    .ProseMirror h2,
    .ProseMirror h3,
    .ProseMirror h4,
    .ProseMirror h5,
    .ProseMirror h6 {
      font-family: var(--font-family-chinese), var(--font-family-english) !important;
    }
    .ProseMirror th,
    .ProseMirror td {
      font-family: var(--font-family-chinese), var(--font-family-english) !important;
    }
  `;
}

export function getCurrentFonts() {
  return { ...config.fonts };
}

export function setTheme(theme) {
  config.theme = theme;
  applyTheme();
}

export function getCurrentTheme() {
  return config.theme;
}

function applyTheme() {
  const theme = config.theme;
  document.documentElement.setAttribute("data-theme", theme);
}

/* ===== AI 配置 ===== */

export function getAiConfig() {
  return JSON.parse(JSON.stringify(config.ai));
}

export function setAiConfig(aiConfig) {
  config.ai = mergeConfig(DEFAULT_CONFIG.ai, aiConfig);
  delete config.ai.actions;
  applyAiEnabledState();
}

export function isAiEnabled() {
  return Boolean(config.ai?.enabled);
}

export function getActiveAiProvider() {
  return config.ai?.provider === "ollama" ? "ollama" : "cloud";
}

export function getActiveAiSettings() {
  const provider = getActiveAiProvider();
  return config.ai?.[provider] || {};
}

export function getAiActions() {
  const defaultActions = DEFAULT_CONFIG.ai.actions.filter(a => !a.id.startsWith("custom_"));
  const customActions = config.ai?.customActions || [];
  return JSON.parse(JSON.stringify([...defaultActions, ...customActions]));
}

export async function saveAiActions(actions) {
  const customActions = actions.filter(a => a.id.startsWith("custom_"));
  config.ai.customActions = customActions;
  await saveConfig();
}

function applyAiEnabledState() {
  const enabled = isAiEnabled();
  document.documentElement.classList.toggle("ai-disabled", !enabled);
}

/* ===== 简易本地加密（Base64 + XOR）=====
   仅用于防止明文泄露，非高强度加密；密钥与数据同机存储。 */

const ENCRYPTION_KEY = "pme-ai-config-v1";

function encryptValue(plain) {
  if (!plain) return "";
  try {
    const bytes = new TextEncoder().encode(plain);
    const output = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
      output[i] = bytes[i] ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    }
    let binary = "";
    output.forEach((byte) => { binary += String.fromCharCode(byte); });
    return "enc:" + btoa(binary);
  } catch (error) {
    console.error("[PME Config] encryptValue failed:", error);
    return "";
  }
}

function decryptValue(cipher) {
  if (!cipher || typeof cipher !== "string") return "";
  if (!cipher.startsWith("enc:")) return cipher;
  try {
    const binary = atob(cipher.slice(4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    }
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.error("[PME Config] decryptValue failed:", error);
    return "";
  }
}
