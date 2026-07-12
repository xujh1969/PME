import { escapeHtml } from "../core/html-utils.mjs";

export function openLinkModal(value) {
  return new Promise((resolve) => {
    const linkText = value.text || "";
    const linkHref = value.href || "";
    const urlPattern = /^(https?:\/\/|mailto:|ftp:\/\/|file:\/\/).+/i;
    const isUrlSelected = !linkHref && urlPattern.test(linkText);

    const overlay = document.createElement("div");
    overlay.className = "text-modal";
    overlay.innerHTML = `
      <div class="text-modal__dialog link-modal" role="dialog" aria-modal="true" aria-label="编辑链接">
        <header class="text-modal__header">
          <strong>编辑链接</strong>
          <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
        </header>
        <section class="link-modal__body">
          <label>
            <span>显示文字</span>
            <input data-link-text value="${escapeHtml(linkText)}" placeholder="${isUrlSelected ? '输入显示名称（默认为链接地址）' : '显示在文档里的文字'}" />
          </label>
          <label>
            <span>链接地址</span>
            <input data-link-href value="${escapeHtml(linkHref)}" placeholder="https://example.com" />
          </label>
        </section>
        <footer class="text-modal__footer">
          <span>留空并确定可取消链接。</span>
          <button data-modal-action="cancel">取消</button>
          <button class="primary" data-modal-action="apply">确定</button>
        </footer>
      </div>
    `;

    const textInput = overlay.querySelector("[data-link-text]");
    const hrefInput = overlay.querySelector("[data-link-href]");
    const close = (result) => {
      overlay.remove();
      resolve(result);
    };
    const apply = () => close({
      text: textInput.value,
      href: hrefInput.value,
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

    setTimeout(() => {
      if (isUrlSelected) {
        textInput.focus();
        textInput.select();
      } else if (!linkHref) {
        hrefInput.focus();
        hrefInput.select();
      } else {
        textInput.focus();
        textInput.select();
      }
    }, 50);

    document.body.appendChild(overlay);
    (textInput.value ? hrefInput : textInput).focus();
    (textInput.value ? hrefInput : textInput).select();
  });
}

export function openTextColorPicker(editor) {
  const colors = [
    "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#FFFFFF",
    "#FF0000", "#FF6600", "#FFCC00", "#33CC00", "#00CCFF", "#0066FF",
    "#9900FF", "#FF0099", "#FF66CC", "#CC66FF", "#66CCFF", "#00CC66",
  ];

  const overlay = document.createElement("div");
  overlay.className = "text-modal";
  overlay.innerHTML = `
    <div class="text-modal__dialog color-picker-modal" role="dialog" aria-modal="true" aria-label="选择文字颜色">
      <header class="text-modal__header">
        <strong>选择文字颜色</strong>
        <button class="icon-button" data-modal-action="cancel" title="关闭" aria-label="关闭">&times;</button>
      </header>
      <section class="color-picker-modal__body">
        <div class="color-grid">
          ${colors.map((color) => `
            <button class="color-item" data-color="${color}" style="background-color: ${color}" title="${color}"></button>
          `).join("")}
        </div>
        <label>
          <span>自定义颜色</span>
          <input type="color" data-color-input />
        </label>
      </section>
    </div>
  `;

  const close = () => {
    overlay.remove();
  };

  const applyColor = (color) => {
    const selectionTo = editor?.state.selection.to;
    close();
    editor?.chain().focus().setColor(color).setTextSelection(selectionTo).run();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
      close();
    }
    const colorButton = event.target.closest?.(".color-item");
    if (colorButton) {
      applyColor(colorButton.dataset.color);
    }
  });

  const colorInput = overlay.querySelector("[data-color-input]");
  colorInput.addEventListener("change", () => {
    applyColor(colorInput.value);
  });

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  document.body.appendChild(overlay);
}

export function openHighlightColorPicker(editor) {
  const colors = [
    "#FFFF00", "#FFCC00", "#FF9900", "#FF6600", "#FF3300",
    "#FFFF99", "#FFFFCC", "#FFCC99", "#FF9999", "#FFCCCC",
    "#99FF99", "#CCFFCC", "#99FFFF", "#CCFFFF", "#99CCFF",
    "#CC99FF", "#FF99FF", "#FFCCFF", "#CCCCFF", "#9999FF",
  ];

  const overlay = document.createElement("div");
  overlay.className = "text-modal";
  overlay.innerHTML = `
    <div class="text-modal__dialog color-picker-modal" role="dialog" aria-modal="true" aria-label="选择高亮颜色">
      <header class="text-modal__header">
        <strong>选择高亮颜色</strong>
        <button class="icon-button" data-modal-action="cancel" title="关闭" aria-label="关闭">&times;</button>
      </header>
      <section class="color-picker-modal__body">
        <div class="color-grid">
          ${colors.map((color) => `
            <button class="color-item" data-color="${color}" style="background-color: ${color}" title="${color}"></button>
          `).join("")}
        </div>
        <label>
          <span>自定义颜色</span>
          <input type="color" data-color-input />
        </label>
      </section>
    </div>
  `;

  const close = () => {
    overlay.remove();
  };

  const applyColor = (color) => {
    const selectionTo = editor?.state.selection.to;
    close();
    editor?.chain().focus().setHighlight({ color }).setTextSelection(selectionTo).run();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
      close();
    }
    const colorButton = event.target.closest?.(".color-item");
    if (colorButton) {
      applyColor(colorButton.dataset.color);
    }
  });

  const colorInput = overlay.querySelector("[data-color-input]");
  colorInput.addEventListener("change", () => {
    applyColor(colorInput.value);
  });

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  document.body.appendChild(overlay);
}

export function openEmojiPicker(editor) {
  const emojiCategories = [
    { name: "表情", emojis: ["😀", "😂", "🤣", "😍", "🥰", "🤔", "😅", "😢", "😭", "😠", "😱", "😴", "🤪", "😎", "🤗", "🤭"] },
    { name: "手势", emojis: ["👍", "👎", "👏", "🙏", "🤝", "👌", "🤞", "✌️", "🤟", "🤘", "👋", "🤙", "💪", "🙌", "✋", "👍"] },
    { name: "动物", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔"] },
    { name: "植物", emojis: ["🌸", "🌺", "🌻", "🌹", "🌷", "🌱", "🌿", "🍀", "🌵", "🌲", "🌳", "🌴", "🌰", "🌾", "🍄", "🌼"] },
    { name: "食物", emojis: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥝", "🍅", "🥑", "🍕", "🍔", "🍟", "🍦", "🍰", "🍩"] },
    { name: "物品", emojis: ["💻", "📱", "🎧", "🎮", "📚", "✏️", "📝", "📄", "💡", "🔑", "⌚", "💎", "🎁", "🎈", "🎵", "🎶"] },
    { name: "天气", emojis: ["☀️", "🌤️", "⛅", "🌧️", "⛈️", "❄️", "🌨️", "🌩️", "🌪️", "🌈", "🌙", "⭐", "🌍", "🔥", "💧", "💨"] },
  ];

  const overlay = document.createElement("div");
  overlay.className = "text-modal";
  overlay.innerHTML = `
    <div class="text-modal__dialog emoji-picker-modal" role="dialog" aria-modal="true" aria-label="选择表情">
      <header class="text-modal__header">
        <strong>选择表情</strong>
        <button class="icon-button" data-modal-action="cancel" title="取消" aria-label="取消">&times;</button>
      </header>
      <section class="emoji-picker-modal__body">
        ${emojiCategories.map((category) => `
          <div class="emoji-category">
            <span class="emoji-category__name">${escapeHtml(category.name)}</span>
            <div class="emoji-grid">
              ${category.emojis.map((emoji) => `
                <button class="emoji-item" data-emoji="${escapeHtml(emoji)}" title="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </section>
      <footer class="text-modal__footer">
        <button data-modal-action="cancel">取消</button>
      </footer>
    </div>
  `;

  const close = () => {
    overlay.remove();
  };

  const insertEmoji = (emoji) => {
    editor?.chain().focus().insertContent(emoji).run();
    close();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.dataset.modalAction === "cancel") {
      close();
    }
    const emojiButton = event.target.closest?.(".emoji-item");
    if (emojiButton) {
      insertEmoji(emojiButton.dataset.emoji);
    }
  });

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  document.body.appendChild(overlay);
}

