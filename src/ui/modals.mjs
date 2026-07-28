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
      if (event.target.dataset.modalAction === "cancel") close(null);
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
      if (event.target.dataset.modalAction === "cancel") close(undefined);
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
      if (event.target.dataset.modalAction === "cancel") close(null);
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

export function openTextEditorModal({ title, value, rows = 8, monospace = true, onAiGenerate, scale }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    const hasScale = scale !== undefined;
    overlay.innerHTML = `
      <div class="text-modal__dialog ${hasScale ? "text-modal__dialog--with-field" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="text-modal__header">
          <strong>${escapeHtml(title)}</strong>
          ${onAiGenerate ? `<button class="icon-button ai-magic-button" data-modal-action="ai" title="AI助手" aria-label="AI助手">${wand2Icon()}</button>` : ""}
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        ${hasScale ? `<label class="text-modal__field text-modal__field--inline"><span>显示比例</span><select data-text-editor-scale><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option></select></label>` : ""}
        <textarea class="${monospace ? "is-monospace" : ""}" rows="${rows}" spellcheck="false"></textarea>
        <footer class="text-modal__footer"><span>按 Ctrl+Enter 确定</span><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">确定</button></footer>
      </div>`;
    const textarea = overlay.querySelector("textarea");
    const scaleSelect = overlay.querySelector("[data-text-editor-scale]");
    if (scaleSelect) {
      scaleSelect.value = String(normalizeModalScale(scale));
    }
    const close = (result) => { overlay.remove(); showTableBubbleToolbar(); resolve(result); };
    overlay.addEventListener("click", (event) => {
      const targetButton = event.target.closest("[data-modal-action]");
      const action = targetButton?.dataset.modalAction;
      
      if (action === "cancel") close(null);
      if (action === "apply") close(getTextEditorResult(textarea, scaleSelect));
      if (action === "ai" && onAiGenerate) {
        textarea.value = "AI 正在生成中...";
        Promise.resolve(onAiGenerate((chunk) => {
          if (textarea.value === "AI 正在生成中...") {
            textarea.value = chunk;
          } else {
            textarea.value += chunk;
          }
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        })).then((result) => {
          if (typeof result === "string") {
            textarea.value = result;
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }).catch((error) => {
          console.error("AI generation failed:", error);
        });
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(null); }
      if (event.key === "Enter" && event.ctrlKey) { event.preventDefault(); close(getTextEditorResult(textarea, scaleSelect)); }
    });
    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    textarea.value = value;
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
  });
}

function getTextEditorResult(textarea, scaleSelect) {
  return scaleSelect ? { code: textarea.value, scale: normalizeModalScale(scaleSelect.value) } : textarea.value;
}

function normalizeModalScale(scale) {
  const value = Number.parseInt(scale, 10);
  return [25, 50, 75, 100, 125, 150].includes(value) ? value : 100;
}

const DIAGRAM_ICONS = {
  flowchart: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="2" width="12" height="8" rx="1"/><rect x="34" y="2" width="12" height="8" rx="1"/><rect x="18" y="26" width="12" height="8" rx="1"/><path d="M14 6 L34 6"/><path d="M24 10 L24 26"/></svg>`,
  sequence: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="2" width="12" height="6" rx="1"/><rect x="34" y="2" width="12" height="6" rx="1"/><rect x="18" y="2" width="12" height="6" rx="1"/><path d="M8 8 L8 34" stroke-dasharray="2 2"/><path d="M24 8 L24 34" stroke-dasharray="2 2"/><path d="M40 8 L40 34" stroke-dasharray="2 2"/><path d="M8 14 L24 14" marker-end="url(#seq-arrow)"/><path d="M24 22 L40 22" marker-end="url(#seq-arrow)"/><path d="M40 30 L24 30" marker-end="url(#seq-arrow)"/><defs><marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs></svg>`,
  gantt: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 2 L46 2 M2 2 L2 34"/><rect x="4" y="6" width="20" height="4" fill="currentColor" opacity="0.3" stroke="none"/><rect x="10" y="12" width="28" height="4" fill="currentColor" opacity="0.3" stroke="none"/><rect x="6" y="18" width="18" height="4" fill="currentColor" opacity="0.3" stroke="none"/><rect x="16" y="24" width="24" height="4" fill="currentColor" opacity="0.3" stroke="none"/></svg>`,
  journey: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="8" r="3"/><circle cx="30" cy="28" r="3"/><circle cx="42" cy="14" r="3"/><path d="M9 18 L15 10" marker-end="url(#j-arrow)"/><path d="M21 8 L27 26" marker-end="url(#j-arrow)"/><path d="M33 28 L39 16" marker-end="url(#j-arrow)"/><defs><marker id="j-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs></svg>`,
  state: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="18" r="5"/><rect x="20" y="13" width="10" height="10" rx="5"/><circle cx="40" cy="18" r="5"/><path d="M13 18 L20 18" marker-end="url(#s-arrow)"/><path d="M30 18 L35 18" marker-end="url(#s-arrow)"/><defs><marker id="s-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs></svg>`,
  er: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="13" width="12" height="10" rx="1"/><rect x="34" y="13" width="12" height="10" rx="1"/><polygon points="24,8 30,18 24,28 18,18"/><path d="M14 18 L18 18"/><path d="M30 18 L34 18"/></svg>`,
  class: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="14" y="4" width="20" height="28"/><path d="M14 12 L34 12"/><path d="M14 20 L34 20"/><path d="M18 8 L30 8"/><path d="M18 16 L30 16"/><path d="M18 24 L30 24"/></svg>`,
  git: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="18" r="3" fill="currentColor"/><circle cx="24" cy="10" r="3"/><circle cx="24" cy="26" r="3"/><circle cx="40" cy="18" r="3" fill="currentColor"/><path d="M8 18 Q16 18 24 10"/><path d="M24 10 L40 18"/><path d="M24 26 L40 18"/></svg>`,
  pie: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="24" cy="18" r="12"/><path d="M24 18 L24 6" stroke-width="1.5"/><path d="M24 18 L35 24" stroke-width="1.5"/><path d="M24 18 L13 24" stroke-width="1.5"/><path d="M24 6 A12 12 0 0 1 35 24" fill="currentColor" opacity="0.3" stroke="none"/></svg>`,
  mindmap: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="24" cy="18" r="4" fill="currentColor"/><circle cx="6" cy="8" r="3"/><circle cx="6" cy="28" r="3"/><circle cx="42" cy="8" r="3"/><circle cx="42" cy="28" r="3"/><path d="M20 18 L9 8"/><path d="M20 18 L9 28"/><path d="M28 18 L39 8"/><path d="M28 18 L39 28"/></svg>`,
  requirement: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="6" width="14" height="24" rx="7"/><rect x="32" y="6" width="14" height="24" rx="7"/><path d="M8 18 L8 14"/><path d="M16 18 L32 18" marker-end="url(#r-arrow)"/><path d="M40 18 L40 22" marker-end="url(#r-arrow)"/><defs><marker id="r-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs></svg>`,
  c4: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="2" width="44" height="32" rx="2"/><rect x="6" y="6" width="20" height="12" rx="1"/><rect x="30" y="6" width="12" height="12" rx="1"/><rect x="6" y="22" width="14" height="8" rx="1"/><rect x="24" y="22" width="18" height="8" rx="1"/></svg>`,
  kanban: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="2" width="44" height="32" rx="2"/><path d="M17 2 L17 34"/><path d="M31 2 L31 34"/><rect x="5" y="6" width="9" height="6" rx="1" fill="currentColor" opacity="0.3" stroke="none"/><rect x="5" y="14" width="9" height="6" rx="1" fill="currentColor" opacity="0.3" stroke="none"/><rect x="20" y="6" width="9" height="6" rx="1" fill="currentColor" opacity="0.3" stroke="none"/><rect x="20" y="14" width="9" height="6" rx="1" fill="currentColor" opacity="0.3" stroke="none"/><rect x="34" y="6" width="9" height="6" rx="1" fill="currentColor" opacity="0.3" stroke="none"/></svg>`,
  timeline: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 18 L44 18" marker-end="url(#t-arrow)"/><circle cx="10" cy="18" r="3" fill="currentColor"/><circle cx="22" cy="18" r="3" fill="currentColor"/><circle cx="34" cy="18" r="3" fill="currentColor"/><rect x="6" y="4" width="8" height="8" rx="1"/><rect x="18" y="24" width="8" height="8" rx="1"/><rect x="30" y="4" width="8" height="8" rx="1"/><defs><marker id="t-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs></svg>`,
  architecture: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="4" width="44" height="8" rx="1"/><rect x="2" y="16" width="20" height="8" rx="1"/><rect x="26" y="16" width="20" height="8" rx="1"/><rect x="2" y="28" width="44" height="6" rx="1"/><path d="M12 12 L12 16"/><path d="M36 12 L36 16"/><path d="M22 24 L22 28"/><path d="M26 24 L26 28"/></svg>`,
  xy: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 4 L6 30 L44 30"/><path d="M6 26 L14 20 L22 22 L30 14 L38 10" stroke-width="2"/><rect x="14" y="22" width="3" height="8" fill="currentColor" opacity="0.5" stroke="none"/><rect x="22" y="20" width="3" height="10" fill="currentColor" opacity="0.5" stroke="none"/><rect x="30" y="14" width="3" height="16" fill="currentColor" opacity="0.5" stroke="none"/></svg>`,
  network: `<svg viewBox="0 0 48 36" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="24" cy="18" r="3" fill="currentColor"/><circle cx="8" cy="8" r="3"/><circle cx="40" cy="8" r="3"/><circle cx="8" cy="28" r="3"/><circle cx="40" cy="28" r="3"/><circle cx="24" cy="4" r="2"/><circle cx="24" cy="32" r="2"/><path d="M11 8 L21 16"/><path d="M27 16 L37 8"/><path d="M11 28 L21 20"/><path d="M27 20 L37 28"/><path d="M24 7 L24 15"/><path d="M24 21 L24 30"/></svg>`,
};

const DIAGRAM_TYPES = [
  { id: "flowchart", label: "流程图", type: "flowchart" },
  { id: "sequence", label: "时序图", type: "sequenceDiagram" },
  { id: "gantt", label: "甘特图", type: "gantt" },
  { id: "journey", label: "用户旅程图", type: "journey" },
  { id: "state", label: "状态图", type: "stateDiagram-v2" },
  { id: "er", label: "ER实体关系图", type: "erDiagram" },
  { id: "class", label: "UML类图", type: "classDiagram" },
  { id: "git", label: "Git分支图", type: "gitGraph" },
  { id: "pie", label: "饼图", type: "pie" },
  { id: "mindmap", label: "思维导图", type: "mindmap" },
  { id: "requirement", label: "需求图", type: "requirementDiagram" },
  { id: "c4", label: "C4架构图", type: "C4Model" },
  { id: "kanban", label: "看板图", type: "kanban" },
  { id: "timeline", label: "时间线图", type: "timeline" },
  { id: "architecture", label: "架构图", type: "architecture" },
  { id: "xy", label: "XY数据图表", type: "xyChart" },
  { id: "network", label: "力导向网络图", type: "networkGraph" },
  { id: null, label: "", type: null },
];

function createDiagramGrid() {
  return DIAGRAM_TYPES.map((item) => {
    if (!item.id) {
      return `<div class="mermaid-ai-modal__grid-item mermaid-ai-modal__grid-item--disabled"></div>`;
    }
    const icon = DIAGRAM_ICONS[item.id] || "";
    return `<button type="button" class="mermaid-ai-modal__grid-item" data-diagram-type="${item.id}" data-diagram-syntax="${item.type}" aria-label="${item.label}">
      <span class="mermaid-ai-modal__grid-item-icon">${icon}</span>
      <span class="mermaid-ai-modal__grid-item-label">${item.label}</span>
    </button>`;
  }).join("");
}

export function openMermaidAiModal({ onChunk }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog mermaid-ai-modal" role="dialog" aria-modal="true" aria-label="AI生成Mermaid图表">
        <header class="text-modal__header"><strong>AI生成Mermaid图表</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="mermaid-ai-modal__body">
          <div class="mermaid-ai-modal__grid-section">
            <span class="mermaid-ai-modal__grid-title">选择图表类型</span>
            <div class="mermaid-ai-modal__grid">${createDiagramGrid()}</div>
          </div>
          <div class="mermaid-ai-modal__input-section">
            <label><span>图表描述</span><textarea rows="6" data-mermaid-ai-input placeholder="请输入图表描述，例如：TCP/IP的交互过程"></textarea></label>
          </div>
        </section>
        <footer class="text-modal__footer"><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">生成</button></footer>
      </div>`;

    const input = overlay.querySelector("[data-mermaid-ai-input]");
    const applyButton = overlay.querySelector("[data-modal-action='apply']");
    const gridItems = overlay.querySelectorAll("[data-diagram-type]");
    let selectedType = null;
    let selectedSyntax = null;

    const close = () => { overlay.remove(); showTableBubbleToolbar(); };

    gridItems.forEach((item) => {
      item.addEventListener("click", () => {
        gridItems.forEach((i) => i.classList.remove("is-selected"));
        item.classList.add("is-selected");
        selectedType = item.dataset.diagramType;
        selectedSyntax = item.dataset.diagramSyntax;
      });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target.dataset.modalAction === "cancel") { close(); resolve(null); }
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
      if (!selectedType) {
        return;
      }

      applyButton.disabled = true;
      close();

      try {
        const diagramTypeMap = {
          flowchart: { name: "流程图", syntax: "flowchart" },
          sequence: { name: "时序图", syntax: "sequenceDiagram" },
          gantt: { name: "甘特图", syntax: "gantt" },
          journey: { name: "用户旅程图", syntax: "journey" },
          state: { name: "状态图", syntax: "stateDiagram-v2" },
          er: { name: "ER实体关系图", syntax: "erDiagram" },
          class: { name: "UML类图", syntax: "classDiagram" },
          git: { name: "Git分支图", syntax: "gitGraph" },
          pie: { name: "饼图", syntax: "pie" },
          mindmap: { name: "思维导图", syntax: "mindmap" },
          requirement: { name: "需求图", syntax: "requirementDiagram" },
          c4: { name: "C4架构图", syntax: "C4Model" },
          kanban: { name: "看板图", syntax: "kanban" },
          timeline: { name: "时间线图", syntax: "timeline" },
          architecture: { name: "架构图", syntax: "architecture" },
          xy: { name: "XY数据图表", syntax: "xyChart" },
          network: { name: "力导向网络图", syntax: "networkGraph" },
        };

        const diagramInfo = diagramTypeMap[selectedType];
        const prompt = `你是一个专业的Mermaid图表生成助手。请根据以下描述生成标准的Mermaid${diagramInfo.name}代码。

描述：${description}

要求：
1. 必须使用${diagramInfo.syntax}语法
2. 输出完整的Mermaid代码，不包含任何解释文字或markdown代码块标记
3. 使用清晰的节点命名和连线
4. 添加适当的注释说明关键步骤
5. 确保代码可以直接复制粘贴到Mermaid编辑器中运行

示例格式：
${diagramInfo.syntax}
  %% 注释说明
  节点定义和连线`;

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

export function openSvgAiModal({ onChunk }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog text-input-modal" role="dialog" aria-modal="true" aria-label="AI生成SVG">
        <header class="text-modal__header"><strong>AI生成SVG</strong><button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button></header>
        <section class="text-input-modal__body">
          <label><span>SVG描述</span><textarea rows="6" data-svg-ai-input placeholder="描述需要生成的SVG图形"></textarea></label>
        </section>
        <footer class="text-modal__footer"><button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply">生成</button></footer>
      </div>`;

    const input = overlay.querySelector("[data-svg-ai-input]");
    const applyButton = overlay.querySelector("[data-modal-action='apply']");
    const close = () => { overlay.remove(); showTableBubbleToolbar(); };

    overlay.addEventListener("click", (event) => {
      if (event.target.dataset.modalAction === "cancel") { close(); resolve(null); }
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
        const prompt = `你是专业SVG图表生成助手。根据以下描述生成完整、可直接渲染的SVG源码。

描述：${description}

要求：
1. 只输出一个完整<svg>...</svg>，不要输出Markdown代码块或解释文字。
2. SVG必须包含viewBox，宽度使用width="100%"，高度用viewBox比例自适应。
3. 使用内联style或SVG属性表达颜色、字号、线条。
4. 不要使用script、foreignObject、外链图片、事件属性。
5. 中文文字直接写入text元素。`;

        let streamedText = "";
        const text = await generateText(buildSvgAiPrompt(description), (chunk) => {
          streamedText += chunk;
          onChunk?.(chunk);
        }, {
          systemPrompt: "You are a code generator. Always return only valid SVG code. Never include explanations, markdown fences, or natural language. If you cannot generate SVG, return nothing.",
          maxTokens: 40960,
          temperature: 0,
          timeoutSeconds: 180,
        });
        const finalText = text || streamedText;
        const svg = extractSvgFromAiText(finalText);
        resolve(svg || finalText || formatSvgAiDiagnostic(finalText));
      } catch (error) {
        console.error("AI SVG generation failed:", error);
        resolve(formatSvgAiError(error));
      }
    }

    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    input.focus();
  });
}

function extractSvgFromAiText(text) {
  const value = String(text || "").trim();
  const fenced = value.match(/```(?:svg|xml)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || value;
  return source.match(/<svg\b[\s\S]*<\/svg>/i)?.[0]?.trim() || "";
}

function buildSvgAiPrompt(description) {
  return `Generate SVG code for "${description}".

Return only raw SVG source starting with <svg and ending with </svg>. Do NOT wrap in Markdown fences. Do NOT include any text before or after. The SVG must include viewBox and width="100%". Do not use script, foreignObject, external images, or event attributes.`;
}
function formatSvgAiDiagnostic(text) {
  return [
    "<!-- SVG AI 没有提取到完整 <svg>...</svg>，以下是 AI 原始返回，方便排查：",
    String(text ?? "") || "(空返回)",
    "-->",
  ].join("\n");
}

function formatSvgAiError(error) {
  return [
    "<!-- SVG AI 调用失败，以下是错误信息：",
    error?.stack || error?.message || String(error),
    "-->",
  ].join("\n");
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
      const action = event.target.dataset.modalAction;
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
