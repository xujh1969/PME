import { escapeHtml } from "../core/html-utils.mjs";
import { getCurrentFonts, setFonts, saveConfig, DEFAULT_CONFIG, getCurrentTheme, setTheme } from "../core/config.mjs";
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

export function openSettingsModal() {
  return new Promise((resolve) => {
    const fonts = getCurrentFonts();
    const theme = getCurrentTheme();
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog settings-modal" role="dialog" aria-modal="true" aria-label="设置">
        <header class="text-modal__header"><strong>设置</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="settings-modal__body">
          <div class="settings-section">
            <h3>主题配置</h3>
            <label>
              <span>主题色调</span>
              ${createThemeSelect(THEMES, theme)}
            </label>
          </div>
          <div class="settings-section">
            <h3>字体配置</h3>
            <label>
              <span>中文字体</span>
              ${createFontSelect(CHINESE_FONTS, fonts.chinese, "chinese")}
            </label>
            <label>
              <span>英文字体</span>
              ${createFontSelect(ENGLISH_FONTS, fonts.english, "english")}
            </label>
            <label>
              <span>代码字体</span>
              ${createFontSelect(CODE_FONTS, fonts.code, "code")}
            </label>
          </div>
          <div class="settings-preview">
            <h3>预览效果</h3>
            <p><strong>中文示例：</strong>这是一段中文测试文字，包含标题、段落和列表。</p>
            <p><strong>English Example:</strong> This is English text for previewing font effect.</p>
            <pre><code>console.log("代码字体预览");</code></pre>
          </div>
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

    const close = (result) => {
      overlay.remove();
      showTableBubbleToolbar();
      resolve(result);
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

    const apply = async () => {
      applyThemeChange();
      applyFonts();
      await saveConfig();
      close(true);
    };

    const reset = () => {
      themeSelect.value = DEFAULT_CONFIG.theme;
      chineseSelect.value = DEFAULT_CONFIG.fonts.chinese;
      englishSelect.value = DEFAULT_CONFIG.fonts.english;
      codeSelect.value = DEFAULT_CONFIG.fonts.code;
      applyThemeChange();
      applyFonts();
    };

    themeSelect.addEventListener("change", applyThemeChange);
    chineseSelect.addEventListener("change", applyFonts);
    englishSelect.addEventListener("change", applyFonts);
    codeSelect.addEventListener("change", applyFonts);

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
    applyFonts();
    chineseSelect.focus();
  });
}
