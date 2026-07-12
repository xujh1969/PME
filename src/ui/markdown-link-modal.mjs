export function openMarkdownLinkModal(adapter) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog markdown-link-modal" role="dialog" aria-modal="true" aria-label="插入 Markdown 文件">
        <header class="text-modal__header">
          <strong>插入 Markdown 文件</strong>
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        <section class="markdown-link-modal__body">
          <label><span>本地文件</span><span class="markdown-link-modal__path-row"><input data-markdown-link-path readonly placeholder="请选择 .md 或 .markdown 文件" /><button data-markdown-link-pick>选择文件</button></span></label>
          <label><span>显示文字</span><input data-markdown-link-label placeholder="例如：项目说明" /></label>
          <p>编辑时保留本地绝对路径，打包时会递归收集关联文档和图片。</p>
        </section>
        <footer class="text-modal__footer">
          <button data-modal-action="cancel">取消</button>
          <button class="primary" data-modal-action="apply" disabled>插入</button>
        </footer>
      </div>`;

    const pathInput = overlay.querySelector("[data-markdown-link-path]");
    const labelInput = overlay.querySelector("[data-markdown-link-label]");
    const applyButton = overlay.querySelector('[data-modal-action="apply"]');
    const updateApplyState = () => {
      applyButton.disabled = !pathInput.value.trim() || !labelInput.value.trim();
    };
    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.addEventListener("click", async (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close(null);
      } else if (event.target.matches?.("[data-markdown-link-pick]")) {
        const path = await adapter.pickMarkdownLinkFile?.();
        if (!path) return;
        pathInput.value = path.replaceAll("\\", "/");
        if (!labelInput.value.trim()) {
          labelInput.value = path.split(/[\\/]/).at(-1).replace(/\.(md|markdown)$/i, "");
        }
        updateApplyState();
        labelInput.focus();
      } else if (event.target.matches?.('[data-modal-action="apply"]') && !applyButton.disabled) {
        close({ label: labelInput.value.trim(), path: pathInput.value.trim() });
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
    });
    labelInput.addEventListener("input", updateApplyState);

    document.body.appendChild(overlay);
    overlay.querySelector("[data-markdown-link-pick]").focus();
  });
}
