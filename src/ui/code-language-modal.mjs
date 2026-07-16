import { escapeHtml } from "../core/html-utils.mjs";
import { hideTableBubbleToolbar, showTableBubbleToolbar } from "./modals.mjs";

const codeLanguageOptions = [
  ["", "无"],
  ["plaintext", "纯文本"],
  ["markdown", "Markdown"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["json", "JSON"],
  ["python", "Python"],
  ["bash", "Bash"],
  ["java", "Java"],
  ["c", "C"],
  ["cpp", "C++"],
  ["csharp", "C#"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["sql", "SQL"],
  ["yaml", "YAML"],
  ["xml", "XML"],
];

export function openCodeLanguageModal(value) {
  return new Promise((resolve) => {
    const normalizedValue = value.trim();
    const knownLanguage = codeLanguageOptions.some(([code]) => code === normalizedValue);
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog code-language-modal" role="dialog" aria-modal="true" aria-label="代码语言">
        <header class="text-modal__header">
          <strong>代码语言</strong>
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        <section class="code-language-modal__body">
          <label>
            <span>常用语言</span>
            <select data-code-language-select>
              ${codeLanguageOptions.map(([code, label]) => (
                `<option value="${escapeHtml(code)}" ${knownLanguage && code === normalizedValue ? "selected" : ""}>${escapeHtml(label)}</option>`
              )).join("")}
              <option value="custom" ${knownLanguage ? "" : "selected"}>自定义</option>
            </select>
          </label>
          <label>
            <span>语言标识</span>
            <input data-code-language-input value="${escapeHtml(normalizedValue)}" placeholder="例如 js、python、bash" />
          </label>
        </section>
        <footer class="text-modal__footer">
          <span>会保存为 Markdown 代码块后的语言名。</span>
          <button data-modal-action="cancel">取消</button>
          <button class="primary" data-modal-action="apply">确定</button>
        </footer>
      </div>
    `;

    const select = overlay.querySelector("[data-code-language-select]");
    const input = overlay.querySelector("[data-code-language-input]");
    const close = (result) => {
      overlay.remove();
      showTableBubbleToolbar();
      resolve(result);
    };
    const apply = () => close(input.value.trim());

    select.addEventListener("change", () => {
      if (select.value !== "custom") {
        input.value = select.value;
      }
      input.focus();
      input.select();
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close(null);
      }
      if (event.target.dataset.modalAction === "apply") {
        apply();
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        apply();
      }
    });

    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}

