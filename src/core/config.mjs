export const DEFAULT_CONFIG = {
  fonts: {
    chinese: "Noto Sans SC, \"Microsoft YaHei\", \"PingFang SC\", sans-serif",
    english: "\"Inter\", \"SF Pro Display\", \"Segoe UI\", sans-serif",
    code: "\"JetBrains Mono\", \"Fira Code\", \"Consolas\", monospace",
  },
  theme: "light",
};

let config = { ...DEFAULT_CONFIG };

export async function initConfig() {
  try {
    const configContent = await readConfigFile();
    if (configContent) {
      const saved = JSON.parse(configContent);
      config = { ...DEFAULT_CONFIG, ...saved };
    }
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
  applyFontsToEditor();
  applyTheme();
}

export async function saveConfig() {
  try {
    await writeConfigFile(JSON.stringify(config, null, 2));
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
