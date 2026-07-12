import { getImageFilesFromFileList } from "../core/assets.mjs";
import { escapeHtml } from "../core/html-utils.mjs";
import { normalizeImageScale } from "../core/image-size.mjs";
import { isTauriRuntime } from "../core/tauri-workspace.mjs";

export function openImageInsertModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog image-modal" role="dialog" aria-modal="true" aria-label="插入图片">
        <header class="text-modal__header">
          <strong>插入图片</strong>
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        <section class="image-modal__body">
          <div class="image-modal__sources">
            <div class="image-modal__section image-modal__section--compact">
              <div><h3>本地图片</h3><p>插入本地图片引用，打包时再收集资源。</p></div>
              <label class="image-file-picker"><input type="file" accept="image/*" multiple data-image-files /><span>选择本地图片</span></label>
            </div>
            <div class="image-modal__section image-modal__section--compact image-modal__section--url">
              <div><h3>网络图片</h3><p>保留原始网络地址。</p></div>
              <div class="image-modal__url-row"><input data-image-url placeholder="https://example.com/image.png" /><button data-image-url-select>选择链接</button></div>
            </div>
          </div>
          <aside class="image-modal__preview" aria-live="polite">
            <div class="image-modal__preview-frame" data-image-preview><p class="image-modal__preview-empty">先选择一张图片</p></div>
            <div class="image-modal__meta" data-image-meta>选择本地文件或网络地址后，可在这里确认效果。</div>
            <label class="image-modal__size-row">
              <span>尺寸比例</span><span class="image-modal__scale-control"><input data-image-scale type="number" min="10" max="300" step="5" placeholder="自动" /><span>%</span></span>
              <small>留空为自动大小，输入 50 表示原图 50%。</small>
            </label>
          </aside>
        </section>
        <footer class="text-modal__footer">
          <div class="image-modal__actions"><span data-image-status>尚未选择图片</span></div>
          <button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply" disabled>插入图片</button>
        </footer>
      </div>`;

    const scaleInput = overlay.querySelector("[data-image-scale]");
    const imageFiles = overlay.querySelector("[data-image-files]");
    const imageUrl = overlay.querySelector("[data-image-url]");
    const preview = overlay.querySelector("[data-image-preview]");
    const meta = overlay.querySelector("[data-image-meta]");
    const status = overlay.querySelector("[data-image-status]");
    const applyButton = overlay.querySelector('[data-modal-action="apply"]');
    let selection = null;

    const disposePreviewUrl = () => {
      if (selection?.previewUrl && selection.revokePreview) URL.revokeObjectURL(selection.previewUrl);
    };
    const close = (result) => {
      disposePreviewUrl();
      overlay.remove();
      resolve(result);
    };
    const describeSelection = (nextSelection) => {
      if (!nextSelection) return "尚未选择图片";
      if (nextSelection.kind === "files") {
        return nextSelection.files.length === 1
          ? nextSelection.files[0].name
          : `${nextSelection.files[0].name} 等 ${nextSelection.files.length} 张图片`;
      }
      return nextSelection.kind === "url" ? nextSelection.url : "";
    };
    const updateSelection = (nextSelection) => {
      disposePreviewUrl();
      selection = nextSelection;
      const description = describeSelection(selection);
      applyButton.disabled = !selection;
      status.textContent = selection ? `已选择：${description}` : "尚未选择图片";
      meta.textContent = selection ? "确认尺寸比例后点击“插入图片”。" : "选择本地文件或网络地址后，可在这里确认效果。";
      preview.innerHTML = selection
        ? `<img src="${escapeHtml(selection.previewUrl)}" alt="${escapeHtml(description)}" />`
        : `<p class="image-modal__preview-empty">先选择一张图片</p>`;
    };
    const useImageUrl = () => {
      const url = imageUrl?.value.trim();
      if (url) updateSelection({ kind: "url", url, previewUrl: url });
    };
    const pickTauriImageFiles = async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const images = await invoke("pick_image_file_dialog");
      if (!images.length) return;
      const toAsset = (image) => ({
        alt: image.name.replace(/\.[^.]+$/, ""),
        assetPath: image.path.replace(/\\/g, "/"),
        previewUrl: image.previewUrl,
        src: image.previewUrl,
      });
      if (images.length === 1) {
        updateSelection({ kind: "asset", asset: toAsset(images[0]), previewUrl: images[0].previewUrl });
      } else {
        updateSelection({ kind: "assets", assets: images.map(toAsset), previewUrl: images[0].previewUrl });
      }
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close(null);
      } else if (event.target.matches?.("[data-image-url-select]")) {
        useImageUrl();
      } else if (event.target.matches?.('[data-modal-action="apply"]') && selection) {
        close({ ...selection, scale: normalizeImageScale(scaleInput?.value) });
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      } else if (event.key === "Enter" && event.target === imageUrl) {
        event.preventDefault();
        useImageUrl();
      }
    });
    imageFiles?.addEventListener("change", () => {
      const files = getImageFilesFromFileList(imageFiles.files);
      if (files.length) {
        updateSelection({ kind: "files", files, previewUrl: URL.createObjectURL(files[0]), revokePreview: true });
      }
    });
    imageFiles?.addEventListener("click", async (event) => {
      if (isTauriRuntime()) {
        event.preventDefault();
        await pickTauriImageFiles();
      }
    });

    document.body.appendChild(overlay);
    (imageUrl || imageFiles)?.focus();
  });
}
