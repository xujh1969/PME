import { escapeHtml } from "../core/html-utils.mjs";
import { normalizeImageScale } from "../core/image-size.mjs";
import { generateText } from "../core/ai-service.mjs";

function wand2Icon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>`;
}

export function hideTableBubbleToolbar() {
  const bubble = document.querySelector("[data-table-bubble]");
  bubble?.classList.remove("is-visible");
}

export function showTableBubbleToolbar() {
  const bubble = document.querySelector("[data-table-bubble]");
  const editorElement = document.querySelector("#tiptapEditor");
  if (bubble && editorElement) {
    const contentElement = editorElement.querySelector(".ProseMirror");
    if (contentElement) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const cell = range.commonAncestorContainer?.closest?.("td, th");
        if (cell) {
          bubble.classList.add("is-visible");
          return;
        }
      }
    }
  }
  bubble?.classList.remove("is-visible");
}

export function openTableInsertModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog table-insert-modal" role="dialog" aria-modal="true" aria-label="插入表格">
        <header class="text-modal__header"><strong>插入表格</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="table-insert-modal__body">
          <label><span>行数</span><input data-table-rows type="number" min="1" max="30" step="1" value="3" /></label>
          <label><span>列数</span><input data-table-cols type="number" min="1" max="20" step="1" value="3" /></label>
          <label class="table-insert-modal__checkbox"><input data-table-header type="checkbox" checked /><span>包含表头</span></label>
        </section>
        <footer class="text-modal__footer"><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">确定</button></footer>
      </div>`;
    const rowsInput = overlay.querySelector("[data-table-rows]");
    const colsInput = overlay.querySelector("[data-table-cols]");
    const headerInput = overlay.querySelector("[data-table-header]");
    const close = (result) => { overlay.remove(); showTableBubbleToolbar(); resolve(result); };
    const apply = () => close({
      rows: clampInteger(rowsInput.value, 1, 30, 3),
      cols: clampInteger(colsInput.value, 1, 20, 3),
      withHeaderRow: headerInput.checked,
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") close(null);
      if (event.target.dataset.modalAction === "apply") apply();
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(null); }
      if (event.key === "Enter") { event.preventDefault(); apply(); }
    });
    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    rowsInput.focus();
    rowsInput.select();
  });
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function openImageSizeModal(value) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog image-size-modal" role="dialog" aria-modal="true" aria-label="图片大小">
        <header class="text-modal__header"><strong>图片大小</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="image-size-modal__body">
          <label><span>原图百分比</span><input data-image-scale type="number" min="10" max="300" step="5" placeholder="自动" value="${escapeHtml(value)}" /></label>
        </section>
        <footer class="text-modal__footer"><span>100=原图，留空=自动</span><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">确定</button></footer>
      </div>`;
    const input = overlay.querySelector("[data-image-scale]");
    const close = (result) => { overlay.remove(); showTableBubbleToolbar(); resolve(result); };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") close(undefined);
      if (event.target.dataset.modalAction === "apply") close(normalizeImageScale(input.value));
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(undefined); }
      if (event.key === "Enter") { event.preventDefault(); close(normalizeImageScale(input.value)); }
    });
    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}

export function openTextInputModal({ title, label, value = "", placeholder = "" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog text-input-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="text-modal__header"><strong>${escapeHtml(title)}</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="text-input-modal__body"><label><span>${escapeHtml(label)}</span><input data-text-input value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" /></label></section>
        <footer class="text-modal__footer"><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">确定</button></footer>
      </div>`;
    const input = overlay.querySelector("[data-text-input]");
    const close = (result) => { overlay.remove(); showTableBubbleToolbar(); resolve(result); };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") close(null);
      if (event.target.dataset.modalAction === "apply") close(input.value);
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(null); }
      if (event.key === "Enter") { event.preventDefault(); close(input.value); }
    });
    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}

export function openTextEditorModal({ title, value, rows = 8, monospace = true, onAiGenerate }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="text-modal__header">
          <strong>${escapeHtml(title)}</strong>
          ${onAiGenerate ? `<button class="icon-button ai-magic-button" data-modal-action="ai" title="AI助手" aria-label="AI助手">${wand2Icon()}</button>` : ""}
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        <textarea class="${monospace ? "is-monospace" : ""}" rows="${rows}" spellcheck="false"></textarea>
        <footer class="text-modal__footer"><span>按 Ctrl+Enter 确定</span><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">确定</button></footer>
      </div>`;
    const textarea = overlay.querySelector("textarea");
    const close = (result) => { overlay.remove(); showTableBubbleToolbar(); resolve(result); };
    overlay.addEventListener("click", (event) => {
      const targetButton = event.target.closest("[data-modal-action]");
      const action = targetButton?.dataset.modalAction;
      
      if (event.target === overlay || action === "cancel") close(null);
      if (action === "apply") close(textarea.value);
      if (action === "ai" && onAiGenerate) {
        textarea.value = "AI 正在生成中...";
        onAiGenerate((chunk) => {
          if (textarea.value === "AI 正在生成中...") {
            textarea.value = chunk;
          } else {
            textarea.value += chunk;
          }
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(null); }
      if (event.key === "Enter" && event.ctrlKey) { event.preventDefault(); close(textarea.value); }
    });
    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    textarea.value = value;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
  });
}

export function openMermaidAiModal({ onChunk }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog mermaid-ai-modal" role="dialog" aria-modal="true" aria-label="AI生成Mermaid图表">
        <header class="text-modal__header"><strong>AI生成Mermaid图表</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="mermaid-ai-modal__body">
          <label><span>图表描述</span><textarea rows="4" data-mermaid-ai-input placeholder="TCP/IP建立连接发送数据再断开连接的交互流程(序列图)"></textarea></label>
        </section>
        <footer class="text-modal__footer"><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">确定</button></footer>
      </div>`;

    const input = overlay.querySelector("[data-mermaid-ai-input]");
    const applyButton = overlay.querySelector("[data-modal-action='apply']");

    const close = () => { overlay.remove(); showTableBubbleToolbar(); };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") { close(); resolve(null); }
      if (event.target.dataset.modalAction === "apply") {
        handleApply();
      }
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); resolve(null); }
      if (event.key === "Enter" && event.ctrlKey) { event.preventDefault(); handleApply(); }
    });

    async function handleApply() {
      const description = input.value.trim();
      if (!description) return;

      applyButton.disabled = true;
      close();

      try {
        const prompt = `请根据以下描述生成Mermaid流程图代码，输出标准的Mermaid语法，不需要任何解释文字，直接输出代码内容。

描述：${description}

要求：
1. 输出标准的Mermaid流程图代码（推荐使用graph TD或flowchart TD）
2. 使用清晰的节点命名和连线
3. 添加适当的注释说明关键步骤
4. 直接输出代码，不要包含markdown代码块标记（如\`\`\`mermaid）`;

        await generateText(prompt, (chunk) => {
          onChunk?.(chunk);
        });

        resolve(true);
      } catch (error) {
        console.error("AI生成失败:", error);
        resolve(null);
      }
    }

    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    input.focus();
  });
}

export function openMessageModal({ title, message, confirmLabel = "确定" }) {
  return openDecisionModal({ title, message, buttons: [{ action: "apply", label: confirmLabel, primary: true }], resolveAction: () => undefined });
}

export function openWaitModal({ title, message }) {
  const overlay = document.createElement("div");
  overlay.className = "text-modal";
  overlay.innerHTML = `
    <div class="text-modal__dialog wait-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="wait-modal__spinner"></div>
      <header class="text-modal__header"><strong>${escapeHtml(title)}</strong></header>
      <section class="message-modal__body">${escapeHtml(message)}</section>
    </div>`;
  hideTableBubbleToolbar();
  document.body.appendChild(overlay);
  return () => { overlay.remove(); showTableBubbleToolbar(); };
}

export function openConfirmModal({ title, message, confirmLabel = "确定", cancelLabel = "取消" }) {
  return openDecisionModal({
    title, message,
    buttons: [{ action: "cancel", label: cancelLabel }, { action: "apply", label: confirmLabel, primary: true }],
    resolveAction: (action) => action === "apply",
    defaultAction: "cancel",
    enterAction: "apply",
  });
}

export function openSaveChangesModal({ title, message, saveLabel = "保存", discardLabel = "不保存", cancelLabel = "取消" }) {
  return openDecisionModal({
    title, message,
    buttons: [{ action: "cancel", label: cancelLabel }, { action: "discard", label: discardLabel }, { action: "save", label: saveLabel, primary: true }],
    resolveAction: (action) => action,
    defaultAction: "cancel",
    focusAction: "save",
  });
}

function openDecisionModal({ title, message, buttons, resolveAction, defaultAction = "apply", enterAction, focusAction }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog message-modal" role="alertdialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="text-modal__header"><strong>${escapeHtml(title)}</strong><button class="icon-button" data-modal-action="${defaultAction}" title="关闭" aria-label="关闭">&times;</button></header>
        <section class="message-modal__body">${escapeHtml(message)}</section>
        <footer class="text-modal__footer">${buttons.map(({ action, label, primary }) => `<button class="${primary ? "primary" : ""}" data-modal-action="${action}">${escapeHtml(label)}</button>`).join("")}</footer>
      </div>`;
    const close = (action) => { overlay.remove(); showTableBubbleToolbar(); resolve(resolveAction(action)); };
    overlay.addEventListener("click", (event) => {
      const action = event.target === overlay ? defaultAction : event.target.dataset.modalAction;
      if (action) close(action);
    });
    overlay.addEventListener("keydown", (event) => {
      const action = event.key === "Escape" ? defaultAction : event.key === "Enter" ? enterAction : null;
      if (action) { event.preventDefault(); close(action); }
    });
    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    overlay.querySelector(`[data-modal-action='${focusAction || buttons[0].action}']`)?.focus();
  });
}
