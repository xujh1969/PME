export function openPdfExportOptionsModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog pdf-export-modal" role="dialog" aria-modal="true" aria-label="导出 PDF">
        <header class="text-modal__header">
          <strong>导出 PDF</strong>
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        <section class="pdf-export-modal__body">
          <label>
            <span>纸张</span>
            <select data-pdf-paper>
              <option value="A4">A4</option>
            </select>
          </label>
          <label>
            <span>方向</span>
            <select data-pdf-orientation>
              <option value="portrait">纵向</option>
              <option value="landscape">横向</option>
            </select>
          </label>
          <label class="pdf-export-modal__checkbox">
            <input data-pdf-title type="checkbox" checked />
            <span>包含文档标题</span>
          </label>
          <p>桌面版会直接生成并保存 PDF 文件，不会添加打印页眉页脚。</p>
        </section>
        <footer class="text-modal__footer">
          <button data-modal-action="cancel">取消</button>
          <button class="primary" data-modal-action="apply">导出 PDF</button>
        </footer>
      </div>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close(null);
      }
      if (event.target.dataset.modalAction === "apply") {
        close({
          paper: overlay.querySelector("[data-pdf-paper]").value,
          orientation: overlay.querySelector("[data-pdf-orientation]").value,
          includeTitle: overlay.querySelector("[data-pdf-title]").checked,
        });
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        overlay.querySelector("[data-modal-action='apply']")?.click();
      }
    });

    document.body.appendChild(overlay);
    overlay.querySelector("[data-pdf-orientation]")?.focus();
  });
}

