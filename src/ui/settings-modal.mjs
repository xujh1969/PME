import { escapeHtml } from "../core/html-utils.mjs";
import {
  getCurrentFonts,
  setFonts,
  saveConfig,
  DEFAULT_CONFIG,
  getCurrentTheme,
  setTheme,
  getAiConfig,
  setAiConfig,
} from "../core/config.mjs";
import { testConnection } from "../core/ai-service.mjs";
import { hideTableBubbleToolbar, showTableBubbleToolbar } from "./modals.mjs";

const THEMES = [
  { value: "light", label: "浅色主题" },
  { value: "dark", label: "深色主题" },
];

const CHINESE_FONTS = [
  { value: "Noto Sans SC, \"Microsoft YaHei\", \"PingFang SC\", sans-serif", label: "Noto Sans SC" },
  { value: "\"Microsoft YaHei\", \"PingFang SC\", sans-serif", label: "Microsoft YaHei" },
  { value: "\"PingFang SC\", \"Microsoft YaHei\", sans-serif", label: "PingFang SC" },
  { value: "\"Source Han Sans SC\", \"Microsoft YaHei\", sans-serif", label: "Source Han Sans SC" },
  { value: "\"WenQuanYi Micro Hei\", \"Microsoft YaHei\", sans-serif", label: "WenQuanYi Micro Hei" },
  { value: "\"SimSun\", \"Microsoft YaHei\", serif", label: "SimSun" },
  { value: "\"SimHei\", \"Microsoft YaHei\", sans-serif", label: "SimHei" },
  { value: "\"KaiTi\", \"KaiTi_GB2312\", serif", label: "KaiTi" },
  { value: "\"FangSong\", \"FangSong_GB2312\", serif", label: "FangSong" },
];

const ENGLISH_FONTS = [
  { value: "\"Inter\", \"SF Pro Display\", \"Segoe UI\", sans-serif", label: "Inter" },
  { value: "\"SF Pro Display\", \"Segoe UI\", sans-serif", label: "SF Pro Display" },
  { value: "\"Segoe UI\", \"Inter\", sans-serif", label: "Segoe UI" },
  { value: "\"Roboto\", \"Segoe UI\", sans-serif", label: "Roboto" },
  { value: "\"Helvetica Neue\", Arial, sans-serif", label: "Helvetica Neue" },
  { value: "\"Times New Roman\", Georgia, serif", label: "Times New Roman" },
  { value: "\"Georgia\", \"Times New Roman\", serif", label: "Georgia" },
];

const CODE_FONTS = [
  { value: "\"JetBrains Mono\", \"Fira Code\", \"Consolas\", monospace", label: "JetBrains Mono" },
  { value: "\"Fira Code\", \"JetBrains Mono\", \"Consolas\", monospace", label: "Fira Code" },
  { value: "\"Consolas\", \"JetBrains Mono\", \"Fira Code\", monospace", label: "Consolas" },
  { value: "\"Cascadia Mono\", \"JetBrains Mono\", \"Consolas\", monospace", label: "Cascadia Mono" },
  { value: "\"SF Mono\", \"JetBrains Mono\", \"Consolas\", monospace", label: "SF Mono" },
  { value: "\"Monaco\", \"JetBrains Mono\", \"Consolas\", monospace", label: "Monaco" },
  { value: "\"Source Code Pro\", \"JetBrains Mono\", \"Consolas\", monospace", label: "Source Code Pro" },
];

const SETTING_TABS = [
  { value: "general", label: "通用" },
  { value: "ai", label: "AI 助手" },
];

function createFontSelect(options, currentValue, dataAttr) {
  const html = options.map(opt =>
    `<option value="${escapeHtml(opt.value)}" ${opt.value === currentValue ? "selected" : ""}>${escapeHtml(opt.label)}</option>`
  ).join("");
  return `<select data-font-${dataAttr}>${html}</select>`;
}

function createThemeSelect(options, currentValue) {
  const html = options.map(opt =>
    `<option value="${escapeHtml(opt.value)}" ${opt.value === currentValue ? "selected" : ""}>${escapeHtml(opt.label)}</option>`
  ).join("");
  return `<select data-theme-select>${html}</select>`;
}

function renderGeneralTab(fonts, theme) {
  return `
    <div class="settings-tab-panel" data-tab-panel="general">
      <div class="settings-section">
        <label>
          <span>主题色调</span>
          ${createThemeSelect(THEMES, theme)}
        </label>
      </div>
      <div class="settings-section">
        <div class="settings-row">
          <label>
            <span>中文字体</span>
            ${createFontSelect(CHINESE_FONTS, fonts.chinese, "chinese")}
          </label>
          <label>
            <span>英文字体</span>
            ${createFontSelect(ENGLISH_FONTS, fonts.english, "english")}
          </label>
        </div>
        <label>
          <span>代码字体</span>
          ${createFontSelect(CODE_FONTS, fonts.code, "code")}
        </label>
      </div>
      <div class="settings-preview">
        <p><strong>中文示例：</strong>这是一段中文测试文字，包含标题、段落和列表。</p>
        <p><strong>English Example:</strong> This is English text for previewing font effect.</p>
        <pre><code>console.log("代码字体预览");</code></pre>
      </div>
    </div>`;
}

function renderAiTab(ai) {
  const cloud = ai.cloud || {};
  const ollama = ai.ollama || {};
  return `
    <div class="settings-tab-panel" data-tab-panel="ai">
      <div class="settings-section">
        <label class="settings-toggle">
          <span class="toggle-label">启用 AI 助手功能</span>
          <input type="checkbox" data-ai-enabled ${ai.enabled ? "checked" : ""} />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </label>
        <p class="settings-hint">关闭后工具栏与悬浮条的 AI 按钮将置灰不可点击。</p>
      </div>
      <div class="settings-section">
        <label>
          <span>模型来源</span>
          <select data-ai-provider>
            <option value="cloud" ${ai.provider === "cloud" ? "selected" : ""}>云端模型</option>
            <option value="ollama" ${ai.provider === "ollama" ? "selected" : ""}>本地 Ollama 离线模型</option>
          </select>
        </label>
      </div>
      <div class="settings-section" data-ai-section="cloud">
        <label>
          <span>API 密钥</span>
          <input type="password" data-ai-api-key value="${escapeHtml(cloud.apiKey || "")}" placeholder="sk-..." autocomplete="off" />
        </label>
        <label>
          <span>接口地址</span>
          <input type="text" data-ai-endpoint value="${escapeHtml(cloud.endpoint || "")}" placeholder="https://api.example.com/v1" />
        </label>
        <label>
          <span>模型名称</span>
          <input type="text" data-ai-model value="${escapeHtml(cloud.model || "")}" placeholder="doubao-pro-32k" />
        </label>
        <div class="settings-row">
          <label>
            <span>请求超时（秒）</span>
            <input type="number" data-ai-timeout value="${cloud.timeout || 30}" min="5" max="300" step="5" />
          </label>
          <label>
            <span>最大上下文字数</span>
            <input type="number" data-ai-max-context value="${cloud.maxContext || 4000}" min="500" max="32000" step="100" />
          </label>
        </div>
      </div>
      <div class="settings-section" data-ai-section="ollama" style="display:none;">
        <label>
          <span>接口地址</span>
          <input type="text" data-ai-ollama-endpoint value="${escapeHtml(ollama.endpoint || "http://localhost:11434")}" placeholder="http://localhost:11434" />
        </label>
        <label>
          <span>模型名称</span>
          <input type="text" data-ai-ollama-model value="${escapeHtml(ollama.model || "")}" placeholder="llama3.1" />
        </label>
        <div class="settings-row">
          <label>
            <span>请求超时（秒）</span>
            <input type="number" data-ai-ollama-timeout value="${ollama.timeout || 60}" min="5" max="600" step="5" />
          </label>
          <label>
            <span>最大上下文字数</span>
            <input type="number" data-ai-ollama-max-context value="${ollama.maxContext || 4000}" min="500" max="32000" step="100" />
          </label>
        </div>
        <p class="settings-hint">需先在本地安装并运行 Ollama，默认端口 11434。</p>
      </div>
      <div class="settings-section">
        <button class="primary" data-ai-test-connection>测试连接</button>
        <div class="settings-hint" data-ai-test-result style="min-height:24px;"></div>
      </div>
    </div>`;
}

export function openSettingsModal() {
  return new Promise((resolve) => {
    const fonts = getCurrentFonts();
    const theme = getCurrentTheme();
    const ai = getAiConfig();
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog settings-modal" role="dialog" aria-modal="true" aria-label="设置">
        <header class="text-modal__header settings-modal__header">
          <strong>设置</strong>
          <div class="settings-modal__tabs">
            ${SETTING_TABS.map(tab => `<button class="settings-tab" data-settings-tab="${tab.value}">${escapeHtml(tab.label)}</button>`).join("")}
          </div>
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消" style="margin-left:auto">&times;</button>
        </header>
        <section class="settings-modal__body">
          ${renderGeneralTab(fonts, theme)}
          ${renderAiTab(ai)}
        </section>
        <footer class="text-modal__footer">
          <button data-modal-action="reset">恢复默认</button>
          <button data-modal-action="cancel">取消</button>
          <button class="primary" data-modal-action="apply">确定</button>
        </footer>
      </div>`;

    const themeSelect = overlay.querySelector("[data-theme-select]");
    const chineseSelect = overlay.querySelector("[data-font-chinese]");
    const englishSelect = overlay.querySelector("[data-font-english]");
    const codeSelect = overlay.querySelector("[data-font-code]");
    const previewSection = overlay.querySelector(".settings-preview");
    const tabButtons = overlay.querySelectorAll("[data-settings-tab]");
    const tabPanels = overlay.querySelectorAll("[data-tab-panel]");
    const aiEnabledInput = overlay.querySelector("[data-ai-enabled]");
    const aiProviderSelect = overlay.querySelector("[data-ai-provider]");
    const cloudSection = overlay.querySelector('[data-ai-section="cloud"]');
    const ollamaSection = overlay.querySelector('[data-ai-section="ollama"]');
    const testConnectionButton = overlay.querySelector("[data-ai-test-connection]");
    const testResultDiv = overlay.querySelector("[data-ai-test-result]");

    const close = (result) => {
      overlay.remove();
      showTableBubbleToolbar();
      resolve(result);
    };

    const switchTab = (tabValue) => {
      tabButtons.forEach(btn => btn.classList.toggle("is-active", btn.dataset.settingsTab === tabValue));
      tabPanels.forEach(panel => {
        panel.style.display = panel.dataset.tabPanel === tabValue ? "" : "none";
      });
    };

    const applyThemeChange = () => {
      setTheme(themeSelect.value);
    };

    const applyFonts = () => {
      setFonts({
        chinese: chineseSelect.value,
        english: englishSelect.value,
        code: codeSelect.value,
      });
      previewSection.style.fontFamily = `${chineseSelect.value}, ${englishSelect.value}`;
      previewSection.querySelectorAll("code, pre").forEach(el => {
        el.style.fontFamily = codeSelect.value;
      });
    };

    const applyProviderToggle = () => {
      const provider = aiProviderSelect.value;
      cloudSection.style.display = provider === "cloud" ? "" : "none";
      ollamaSection.style.display = provider === "ollama" ? "" : "none";
    };

    const collectAiConfig = () => ({
      enabled: aiEnabledInput.checked,
      provider: aiProviderSelect.value,
      cloud: {
        apiKey: overlay.querySelector("[data-ai-api-key]").value.trim(),
        endpoint: overlay.querySelector("[data-ai-endpoint]").value.trim(),
        model: overlay.querySelector("[data-ai-model]").value.trim(),
        timeout: Number(overlay.querySelector("[data-ai-timeout]").value) || 30,
        maxContext: Number(overlay.querySelector("[data-ai-max-context]").value) || 4000,
      },
      ollama: {
        endpoint: overlay.querySelector("[data-ai-ollama-endpoint]").value.trim(),
        model: overlay.querySelector("[data-ai-ollama-model]").value.trim(),
        timeout: Number(overlay.querySelector("[data-ai-ollama-timeout]").value) || 60,
        maxContext: Number(overlay.querySelector("[data-ai-ollama-max-context]").value) || 4000,
      },
    });

    const apply = async () => {
      applyThemeChange();
      applyFonts();
      setAiConfig(collectAiConfig());
      await saveConfig();
      close(true);
    };

    const reset = () => {
      themeSelect.value = DEFAULT_CONFIG.theme;
      chineseSelect.value = DEFAULT_CONFIG.fonts.chinese;
      englishSelect.value = DEFAULT_CONFIG.fonts.english;
      codeSelect.value = DEFAULT_CONFIG.fonts.code;
      aiEnabledInput.checked = DEFAULT_CONFIG.ai.enabled;
      aiProviderSelect.value = DEFAULT_CONFIG.ai.provider;
      overlay.querySelector("[data-ai-api-key]").value = "";
      overlay.querySelector("[data-ai-endpoint]").value = DEFAULT_CONFIG.ai.cloud.endpoint;
      overlay.querySelector("[data-ai-model]").value = DEFAULT_CONFIG.ai.cloud.model;
      overlay.querySelector("[data-ai-timeout]").value = DEFAULT_CONFIG.ai.cloud.timeout;
      overlay.querySelector("[data-ai-max-context]").value = DEFAULT_CONFIG.ai.cloud.maxContext;
      overlay.querySelector("[data-ai-ollama-endpoint]").value = DEFAULT_CONFIG.ai.ollama.endpoint;
      overlay.querySelector("[data-ai-ollama-model]").value = DEFAULT_CONFIG.ai.ollama.model;
      overlay.querySelector("[data-ai-ollama-timeout]").value = DEFAULT_CONFIG.ai.ollama.timeout;
      overlay.querySelector("[data-ai-ollama-max-context]").value = DEFAULT_CONFIG.ai.ollama.maxContext;
      applyThemeChange();
      applyFonts();
      applyProviderToggle();
    };

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.settingsTab));
    });
    themeSelect.addEventListener("change", applyThemeChange);
    chineseSelect.addEventListener("change", applyFonts);
    englishSelect.addEventListener("change", applyFonts);
    codeSelect.addEventListener("change", applyFonts);
    aiProviderSelect.addEventListener("change", applyProviderToggle);

    testConnectionButton.addEventListener("click", async () => {
      testResultDiv.textContent = "";
      testResultDiv.style.color = "";
      testConnectionButton.disabled = true;
      testConnectionButton.textContent = "测试中...";

      const testConfig = collectAiConfig();
      const result = await testConnection(testConfig);

      if (result.success) {
        testResultDiv.textContent = `✓ ${result.message}`;
        testResultDiv.style.color = "#10b981";
      } else {
        testResultDiv.textContent = `✗ ${result.message}`;
        testResultDiv.style.color = "#ef4444";
      }

      testConnectionButton.disabled = false;
      testConnectionButton.textContent = "测试连接";
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close(false);
      }
      if (event.target.dataset.modalAction === "apply") {
        apply();
      }
      if (event.target.dataset.modalAction === "reset") {
        reset();
      }
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        apply();
      }
    });

    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    switchTab("general");
    applyFonts();
    applyProviderToggle();
    chineseSelect.focus();
  });
}
