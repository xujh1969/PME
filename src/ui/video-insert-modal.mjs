import { escapeHtml } from "../core/html-utils.mjs";
import { normalizeImageScale } from "../core/image-size.mjs";
import { isTauriRuntime } from "../core/tauri-workspace.mjs";
import { hideTableBubbleToolbar, showTableBubbleToolbar } from "./modals.mjs";

let convertFileSrc;

async function getConvertFileSrc() {
  if (!convertFileSrc) {
    try {
      const { convertFileSrc: cfs } = await import("@tauri-apps/api/core");
      convertFileSrc = cfs;
    } catch {
      convertFileSrc = null;
    }
  }
  return convertFileSrc;
}

export function openVideoInsertModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog image-modal" role="dialog" aria-modal="true" aria-label="插入视频">
        <header class="text-modal__header">
          <strong>插入视频</strong>
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        <section class="image-modal__body">
          <div class="image-modal__sources">
            <div class="image-modal__section image-modal__section--compact">
              <div><h3>本地视频</h3><p>插入本地视频引用，打包时再收集资源。</p></div>
              <label class="image-file-picker"><input type="file" accept="video/*" multiple data-video-files /><span>选择本地视频</span></label>
            </div>
            <div class="image-modal__section image-modal__section--url">
              <h3>网络视频</h3>
              <input data-video-url placeholder="https://example.com/video.mp4" />
              <button data-video-url-select>选择链接</button>
            </div>
          </div>
          <aside class="image-modal__preview" aria-live="polite">
            <div class="image-modal__preview-frame" data-video-preview><p class="image-modal__preview-empty">先选择一个视频</p></div>
            <div class="image-modal__meta" data-video-meta>选择本地文件或网络地址后，可在这里确认效果。</div>
            <label class="image-modal__size-row">
              <span>尺寸比例</span><span class="image-modal__scale-control"><input data-video-scale type="number" min="10" max="300" step="5" placeholder="自动" /><span>%</span></span>
              <small>留空为自动大小，输入 50 表示原图 50%。</small>
            </label>
          </aside>
        </section>
        <footer class="text-modal__footer">
          <div class="image-modal__actions"><span data-video-status>尚未选择视频</span></div>
          <button data-modal-action="cancel">取消</button><button class="primary" data-modal-action="apply" disabled>插入视频</button>
        </footer>
      </div>`;

    const scaleInput = overlay.querySelector("[data-video-scale]");
    const videoFiles = overlay.querySelector("[data-video-files]");
    const videoUrl = overlay.querySelector("[data-video-url]");
    const preview = overlay.querySelector("[data-video-preview]");
    const meta = overlay.querySelector("[data-video-meta]");
    const status = overlay.querySelector("[data-video-status]");
    const applyButton = overlay.querySelector('[data-modal-action="apply"]');
    let selection = null;

    const disposePreviewUrl = () => {
      if (selection?.previewUrl && selection.revokePreview) URL.revokeObjectURL(selection.previewUrl);
    };
    const close = (result) => {
      disposePreviewUrl();
      overlay.remove();
      showTableBubbleToolbar();
      resolve(result);
    };
    const describeSelection = (nextSelection) => {
      if (!nextSelection) return "尚未选择视频";
      if (nextSelection.kind === "files") {
        return nextSelection.files.length === 1
          ? nextSelection.files[0].name
          : `${nextSelection.files[0].name} 等 ${nextSelection.files.length} 个视频`;
      }
      return nextSelection.kind === "url" ? nextSelection.url : "";
    };
    const updateSelection = (nextSelection) => {
      disposePreviewUrl();
      selection = nextSelection;
      const description = describeSelection(selection);
      applyButton.disabled = !selection;
      status.textContent = selection ? `已选择：${description}` : "尚未选择视频";
      meta.textContent = selection ? "确认后点击“插入视频”。" : "选择本地文件或网络地址后，可在这里确认效果。";
      preview.innerHTML = selection
        ? `<video src="${escapeHtml(selection.previewUrl)}" controls style="max-width: 100%; max-height: 300px;" />`
        : `<p class="image-modal__preview-empty">先选择一个视频</p>`;
    };
    const useVideoUrl = () => {
      const url = videoUrl?.value.trim();
      if (url) updateSelection({ kind: "url", url, previewUrl: url });
    };
    const pickTauriVideoFiles = async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const videos = await invoke("pick_video_file_dialog");
      if (!videos.length) return;
      const cfs = await getConvertFileSrc();
      const toAsset = (video) => {
        const nativePath = video.previewUrl.replace(/\//g, "\\");
        const previewUrl = cfs ? cfs(nativePath) : video.previewUrl;
        return {
          alt: video.name.replace(/\.[^.]+$/, ""),
          assetPath: video.path.replace(/\\/g, "/"),
          previewUrl,
          src: previewUrl,
        };
      };
      if (videos.length === 1) {
        const asset = toAsset(videos[0]);
        updateSelection({ kind: "asset", asset, previewUrl: asset.previewUrl });
      } else {
        const assets = videos.map(toAsset);
        updateSelection({ kind: "assets", assets, previewUrl: assets[0].previewUrl });
      }
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
        close(null);
      } else if (event.target.matches?.("[data-video-url-select]")) {
        useVideoUrl();
      } else if (event.target.matches?.('[data-modal-action="apply"]') && selection) {
        close({ ...selection, scale: normalizeImageScale(scaleInput?.value) });
      }
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      } else if (event.key === "Enter" && event.target === videoUrl) {
        event.preventDefault();
        useVideoUrl();
      }
    });
    videoFiles?.addEventListener("change", () => {
      const files = Array.from(videoFiles.files);
      if (files.length) {
        updateSelection({ kind: "files", files, previewUrl: URL.createObjectURL(files[0]), revokePreview: true });
      }
    });
    const filePicker = overlay.querySelector(".image-file-picker");
    filePicker?.addEventListener("click", async (event) => {
      if (isTauriRuntime()) {
        event.preventDefault();
        await pickTauriVideoFiles();
      }
    });

    hideTableBubbleToolbar();
    document.body.appendChild(overlay);
    (videoUrl || videoFiles)?.focus();
  });
}