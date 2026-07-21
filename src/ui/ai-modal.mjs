﻿﻿﻿import { escapeHtml } from "../core/html-utils.mjs";
import { generateText, buildPolishPrompt, buildTranslatePrompt, buildSummaryPrompt, buildContinuePrompt, buildTemplatePrompt, buildTablePrompt } from "../core/ai-service.mjs";
import { isAiEnabled, getAiConfig, getAiActions, saveAiActions } from "../core/config.mjs";
import { parseMarkdown } from "../core/markdown.mjs";

const TRANSLATE_LANGS = [
  { value: "en", label: "英文" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日文" },
  { value: "ko", label: "韩文" },
];

const SUMMARY_LENGTHS = [
  { value: "short", label: "简短", description: "约100字" },
  { value: "medium", label: "中等", description: "约300字" },
  { value: "long", label: "详细", description: "约500字" },
];

const CONTINUE_LENGTHS = [
  { value: "short", label: "短句补充", description: "补充少量内容" },
  { value: "medium", label: "常规段落", description: "生成一个完整段落" },
  { value: "long", label: "长文拓展", description: "展开多个段落" },
];

const DOC_TEMPLATES = [
  { value: "software_doc", label: "软件说明书", description: "产品使用说明" },
  { value: "tech_doc", label: "技术文档", description: "技术方案设计" },
  { value: "weekly_report", label: "周报", description: "工作周报模板" },
  { value: "meeting_minutes", label: "会议纪要", description: "会议记录" },
  { value: "reading_notes", label: "读书笔记", description: "阅读心得" },
  { value: "prd", label: "PRD方案", description: "产品需求文档" },
];

const DEFAULT_ACTION_IDS = ["polish", "shorten", "expand", "formalize", "casualize", "translate", "summary", "continue", "template", "table"];

export function openAiModal({ title = "AI 助手", selectedText = "", editor = null } = {}) {
  return new Promise((resolve) => {
    if (!isAiEnabled()) {
      resolve({ action: "config" });
      return;
    }

    const config = getAiConfig();
    if (!config.enabled) {
      resolve({ action: "config" });
      return;
    }

    let aiActions = getAiActions();
    let currentAction = selectedText ? (aiActions[0]?.id || "polish") : "continue";
    let targetLang = "en";
    let summaryLength = "medium";
    let continueLength = "medium";
    let generatedText = "";
    let isGenerating = false;
    let selectedTemplate = "tech_doc";

    const overlay = document.createElement("div");
    overlay.className = "ai-modal";
    overlay.innerHTML = `
      <div class="ai-modal__panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="ai-modal__header">
          <strong>${escapeHtml(title)}</strong>
          <button class="icon-button" data-ai-action="config" title="配置" aria-label="配置">⚙️</button>
          <button class="icon-button" data-ai-action="cancel" title="关闭" aria-label="关闭">&times;</button>
        </header>
        <section class="ai-modal__body">
          ${renderActionSelector()}
          <div class="ai-modal__lang-section is-hidden" data-ai-lang-section>
            <label><span>目标语言</span></label>
            <div class="ai-modal__lang-grid">
              ${TRANSLATE_LANGS.map((lang) => `
                <button class="ai-modal__lang-button ${lang.value === targetLang ? "is-active" : ""}" 
                  data-ai-lang="${lang.value}">
                  ${escapeHtml(lang.label)}
                </button>
              `).join("")}
            </div>
          </div>
          <div class="ai-modal__summary-section is-hidden" data-ai-summary-section>
            <label><span>摘要长度</span></label>
            <div class="ai-modal__summary-grid">
              ${SUMMARY_LENGTHS.map((len) => `
                <button class="ai-modal__summary-button ${len.value === summaryLength ? "is-active" : ""}" 
                  data-ai-summary-length="${len.value}"
                  title="${escapeHtml(len.description)}">
                  <span class="ai-modal__summary-label">${escapeHtml(len.label)}</span>
                  <span class="ai-modal__summary-desc">${escapeHtml(len.description)}</span>
                </button>
              `).join("")}
            </div>
          </div>
          <div class="ai-modal__continue-section is-hidden" data-ai-continue-section>
            <label><span>续写长度</span></label>
            <div class="ai-modal__continue-grid">
              ${CONTINUE_LENGTHS.map((len) => `
                <button class="ai-modal__continue-button ${len.value === continueLength ? "is-active" : ""}" 
                  data-ai-continue-length="${len.value}"
                  title="${escapeHtml(len.description)}">
                  <span class="ai-modal__continue-label">${escapeHtml(len.label)}</span>
                  <span class="ai-modal__continue-desc">${escapeHtml(len.description)}</span>
                </button>
              `).join("")}
            </div>
          </div>
          <div class="ai-modal__template-section is-hidden" data-ai-template-section>
            <label><span>选择模板</span></label>
            <div class="ai-modal__template-grid">
              ${DOC_TEMPLATES.map((tpl) => `
                <button class="ai-modal__template-button ${tpl.value === selectedTemplate ? "is-active" : ""}" 
                  data-ai-template="${tpl.value}"
                  title="${escapeHtml(tpl.description)}">
                  <span class="ai-modal__template-label">${escapeHtml(tpl.label)}</span>
                  <span class="ai-modal__template-desc">${escapeHtml(tpl.description)}</span>
                </button>
              `).join("")}
            </div>
          </div>
          ${selectedText ? `
          <div class="ai-modal__input-info">
            <span class="ai-modal__input-count">已选中 ${selectedText.length} 字</span>
            <button class="ai-modal__input-toggle" data-ai-toggle-input>查看文本</button>
          </div>
          <div class="ai-modal__input-section is-hidden" data-ai-input-section>
            <textarea class="ai-modal__input" data-ai-input>${escapeHtml(selectedText)}</textarea>
          </div>
          ` : ""}
          <div class="ai-modal__command-section">
            <label><span>补充命令</span></label>
            <input class="ai-modal__command-input" data-ai-command-input placeholder="输入额外的指令，如：使用简洁的语言表达..." />
          </div>
          <div class="ai-modal__preview-section is-hidden" data-ai-preview-section>
            <div class="ai-modal__preview-header">
              <span data-ai-preview-title>输出内容</span>
              <button class="ai-modal__preview-toggle" data-ai-preview-toggle title="隐藏">隐藏</button>
            </div>
            <div class="ai-modal__preview" data-ai-preview></div>
          </div>
        </section>
        <footer class="ai-modal__footer">
          <button data-ai-action="cancel">取消</button>
          <button data-ai-action="copy" disabled>复制</button>
          <button data-ai-action="insert-below" disabled>插入下方</button>
          <button data-ai-action="replace" disabled>替换原文</button>
          <button class="primary" data-ai-action="generate">开始生成</button>
        </footer>
      </div>`;

    const langSection = overlay.querySelector("[data-ai-lang-section]");
    const langButtons = overlay.querySelectorAll("[data-ai-lang]");
    const summarySection = overlay.querySelector("[data-ai-summary-section]");
    const summaryButtons = overlay.querySelectorAll("[data-ai-summary-length]");
    const continueSection = overlay.querySelector("[data-ai-continue-section]");
    const continueButtons = overlay.querySelectorAll("[data-ai-continue-length]");
    const templateSection = overlay.querySelector("[data-ai-template-section]");
    const templateButtons = overlay.querySelectorAll("[data-ai-template]");
    const inputInfo = overlay.querySelector("[data-ai-input-info]");
    const inputSection = overlay.querySelector("[data-ai-input-section]");
    const inputToggle = overlay.querySelector("[data-ai-toggle-input]");
    const inputTextarea = overlay.querySelector("[data-ai-input]");
    const commandInput = overlay.querySelector("[data-ai-command-input]");
    const previewSection = overlay.querySelector("[data-ai-preview-section]");
    const previewTitle = overlay.querySelector("[data-ai-preview-title]");
    const previewDiv = overlay.querySelector("[data-ai-preview]");
    const previewToggle = overlay.querySelector("[data-ai-preview-toggle]");
    const actionSection = overlay.querySelector("[data-ai-action-section]");
    const cancelButton = overlay.querySelector('[data-ai-action="cancel"]');
    const configButton = overlay.querySelector('[data-ai-action="config"]');
    const copyButton = overlay.querySelector('[data-ai-action="copy"]');
    const insertBelowButton = overlay.querySelector('[data-ai-action="insert-below"]');
    const replaceButton = overlay.querySelector('[data-ai-action="replace"]');
    const generateButton = overlay.querySelector('[data-ai-action="generate"]');

    function renderActionSelector() {
      const customAction = { id: "custom", label: "自由命令", description: "输入自由指令" };
      const actionsToRender = [...aiActions, customAction];
      
      return `
        <div class="ai-modal__action-section" data-ai-action-section>
          <div class="ai-modal__action-grid">
            ${actionsToRender.map((action) => {
              const isDefault = DEFAULT_ACTION_IDS.includes(action.id);
              const isCustom = action.id !== "custom" && !isDefault;
              return `
              <button class="ai-modal__action-button ${action.id === currentAction ? "is-active" : ""} ${isCustom ? "ai-modal__action-button--custom" : ""}" 
                data-ai-polish-action="${action.id}" 
                title="${escapeHtml(action.description || action.label)}">
                ${escapeHtml(action.label)}
              </button>
              `;
            }).join("")}
          </div>
        </div>`;
    }

    function updateActionButtons() {
      const newActionSelector = renderActionSelector();
      actionSection.innerHTML = newActionSelector;
      bindActionButtons();
    }

    function bindActionButtons() {
      const actionButtons = overlay.querySelectorAll("[data-ai-polish-action]");
      actionButtons.forEach((button) => {
        button.addEventListener("click", () => {
          overlay.querySelectorAll("[data-ai-polish-action]").forEach(b => b.classList.remove("is-active"));
          button.classList.add("is-active");
          currentAction = button.dataset.aiPolishAction;
          
          if (currentAction === "translate") {
            langSection.classList.remove("is-hidden");
            summarySection.classList.add("is-hidden");
            continueSection.classList.add("is-hidden");
            templateSection.classList.add("is-hidden");
          } else if (currentAction === "summary") {
            langSection.classList.add("is-hidden");
            summarySection.classList.remove("is-hidden");
            continueSection.classList.add("is-hidden");
            templateSection.classList.add("is-hidden");
          } else if (currentAction === "continue") {
            langSection.classList.add("is-hidden");
            summarySection.classList.add("is-hidden");
            continueSection.classList.remove("is-hidden");
            templateSection.classList.add("is-hidden");
          } else if (currentAction === "template") {
            langSection.classList.add("is-hidden");
            summarySection.classList.add("is-hidden");
            continueSection.classList.add("is-hidden");
            templateSection.classList.remove("is-hidden");
          } else if (currentAction === "table") {
            langSection.classList.add("is-hidden");
            summarySection.classList.add("is-hidden");
            continueSection.classList.add("is-hidden");
            templateSection.classList.add("is-hidden");
          } else {
            langSection.classList.add("is-hidden");
            summarySection.classList.add("is-hidden");
            continueSection.classList.add("is-hidden");
            templateSection.classList.add("is-hidden");
          }
        });
      });
    }

    bindActionButtons();

    function setLoading(loading) {
      isGenerating = loading;
      generateButton.textContent = loading ? "生成中..." : "重新生成";
      generateButton.disabled = loading;
      overlay.querySelectorAll("[data-ai-polish-action]").forEach(btn => btn.disabled = loading);
      if (inputTextarea) inputTextarea.disabled = loading;
      if (commandInput) commandInput.disabled = loading;
      
      if (loading) {
        const currentActionObj = aiActions.find(a => a.id === currentAction) 
          || (currentAction === "custom" ? { label: "自由命令" } : null);
        if (previewTitle && currentActionObj) {
          previewTitle.textContent = currentActionObj.label;
        }
        previewDiv.innerHTML = '<div class="ai-modal__loading"><div class="ai-modal__spinner"></div><span>AI正在思考中...</span></div>';
        copyButton.disabled = true;
        insertBelowButton.disabled = true;
        replaceButton.disabled = true;
        actionSection.classList.add("is-hidden");
        langSection.classList.add("is-hidden");
        summarySection.classList.add("is-hidden");
        continueSection.classList.add("is-hidden");
        templateSection.classList.add("is-hidden");
        if (inputInfo) inputInfo.classList.add("is-hidden");
        if (inputSection) inputSection.classList.add("is-hidden");
        if (commandInput) commandInput.parentElement.classList.add("is-hidden");
        previewSection.classList.remove("is-hidden");
        previewDiv.classList.remove("is-hidden");
        if (previewToggle) previewToggle.textContent = "隐藏";
      }
    }

    function showError(message) {
      previewDiv.innerHTML = `<div class="ai-modal__error"><strong>错误</strong><p>${escapeHtml(message)}</p></div>`;
      setLoading(false);
    }

    async function handleGenerate() {
      let text = inputTextarea?.value.trim() || "";
      const command = commandInput?.value.trim() || "";
      
      if (!text && editor) {
        const { selection } = editor.state;
        if (!selection.empty) {
          text = editor.state.doc.textBetween(selection.from, selection.to, "\n") || "";
        }
      }
      
      if (currentAction === "continue" && !text && editor) {
        const doc = editor.state.doc;
        const cursorPos = editor.state.selection.main.head;
        const startPos = Math.max(0, cursorPos - 2000);
        text = doc.sliceString(startPos, cursorPos);
      }

      if (!text && editor) {
        const { selection } = editor.state;
        if (!selection.empty) {
          text = editor.state.doc.textBetween(selection.from, selection.to, "\n") || "";
        }
      }
      
      if (currentAction !== "continue" && currentAction !== "custom" && !text) {
        previewDiv.innerHTML = '<div class="ai-modal__hint">请先选择要处理的文本。</div>';
        return;
      }

      if (currentAction === "custom" && !command) {
        previewDiv.innerHTML = '<div class="ai-modal__hint">请输入补充命令。</div>';
        return;
      }

      setLoading(true);
      generatedText = "";

      try {
        let prompt;
        const customAction = aiActions.find(a => a.id === currentAction);
        
        if (currentAction === "custom") {
          prompt = text ? `${text}\n\n用户指令：${command}` : command;
        } else if (customAction && customAction.prompt) {
          prompt = customAction.prompt.replace(/\{\{text\}\}/g, text);
        } else if (currentAction === "translate") {
          prompt = buildTranslatePrompt(text, targetLang);
        } else if (currentAction === "summary") {
          prompt = buildSummaryPrompt(text, summaryLength);
        } else if (currentAction === "continue") {
          prompt = buildContinuePrompt(text, continueLength);
        } else if (currentAction === "template") {
          prompt = buildTemplatePrompt(selectedTemplate, text);
        } else if (currentAction === "table") {
          prompt = buildTablePrompt(text, "convert");
        } else {
          prompt = buildPolishPrompt(text, currentAction);
        }
        
        if (command && currentAction !== "custom") {
          prompt += `\n\n额外要求：${command}`;
        }
        
        await generateText(prompt, (chunk) => {
          generatedText += chunk;
          previewDiv.innerHTML = escapeHtml(generatedText).replace(/\n/g, "<br>");
        });
        
        copyButton.disabled = false;
        insertBelowButton.disabled = !editor;
        replaceButton.disabled = !editor || !selectedText;
      } catch (error) {
        showError(error.message);
      } finally {
        setLoading(false);
      }
    }

    async function handleCopy() {
      if (!generatedText) return;
      try {
        await navigator.clipboard.writeText(generatedText);
        copyButton.textContent = "已复制";
        setTimeout(() => copyButton.textContent = "复制", 2000);
      } catch {
        showError("复制失败，请手动复制。");
      }
    }

    function handleReplace() {
      if (!editor || !generatedText) return;
      try {
        const parsed = parseMarkdown(generatedText);
        const content = parsed.content || [];
        if (content.length > 0) {
          editor.chain().focus().deleteSelection().insertContent(content).run();
        } else {
          editor.chain().focus().deleteSelection().insertContent(generatedText).run();
        }
      } catch {
        editor.chain().focus().deleteSelection().insertContent(generatedText).run();
      }
      resolve({ action: "replace", text: generatedText });
      overlay.remove();
    }

    function handleInsertBelow() {
      if (!editor || !generatedText) return;
      try {
        const parsed = parseMarkdown(generatedText);
        const content = parsed.content || [];
        if (content.length > 0) {
          editor.chain()
            .focus()
            .setTextSelection(editor.state.selection.to)
            .insertContent({ type: "paragraph" })
            .insertContent(content)
            .run();
        } else {
          editor.chain()
            .focus()
            .setTextSelection(editor.state.selection.to)
            .insertContent("\n\n" + generatedText)
            .run();
        }
      } catch {
        editor.chain()
          .focus()
          .setTextSelection(editor.state.selection.to)
          .insertContent("\n\n" + generatedText)
          .run();
      }
      resolve({ action: "insert", text: generatedText });
      overlay.remove();
    }

    function openConfigModal() {
      const customActions = aiActions.filter(action => !DEFAULT_ACTION_IDS.includes(action.id));
      
      const configOverlay = document.createElement("div");
      configOverlay.className = "ai-modal";
      configOverlay.innerHTML = `
        <div class="ai-modal__panel" role="dialog" aria-modal="true" aria-label="功能配置">
          <header class="ai-modal__header">
            <strong>自定义功能配置</strong>
            <button class="icon-button" data-ai-config-action="cancel" title="关闭" aria-label="关闭">&times;</button>
          </header>
          <section class="ai-modal__body">
            <div class="ai-modal__config-list" data-ai-config-list>
              ${customActions.length > 0 ? customActions.map(action => renderConfigItem(action.label, action.prompt)).join("") : '<div class="ai-modal__config-empty">暂无自定义功能，点击下方按钮添加</div>'}
            </div>
            <button class="ai-modal__config-add" data-ai-config-add>➕ 添加功能</button>
          </section>
          <footer class="ai-modal__footer">
            <button data-ai-config-action="cancel">取消</button>
            <button class="primary" data-ai-config-action="save">保存</button>
          </footer>
        </div>`;

      function renderConfigItem(label, prompt) {
        return `
          <div class="ai-modal__config-item">
            <div class="ai-modal__config-row">
              <input class="ai-modal__config-label" value="${escapeHtml(label || "")}" placeholder="功能名称" />
              <button class="ai-modal__config-delete" title="删除">&times;</button>
            </div>
            <textarea class="ai-modal__config-prompt" placeholder="输入提示词模板，使用 {{text}} 表示选中文本">${escapeHtml(prompt || "")}</textarea>
          </div>`;
      }

      const configList = configOverlay.querySelector("[data-ai-config-list]");
      const addButton = configOverlay.querySelector("[data-ai-config-add]");
      const saveButton = configOverlay.querySelector('[data-ai-config-action="save"]');
      const cancelButton = configOverlay.querySelector('[data-ai-config-action="cancel"]');

      addButton.addEventListener("click", () => {
        const emptyHint = configList.querySelector(".ai-modal__config-empty");
        if (emptyHint) emptyHint.remove();
        const item = document.createElement("div");
        item.innerHTML = renderConfigItem("", "");
        const itemEl = item.firstElementChild;
        itemEl.querySelector(".ai-modal__config-delete").addEventListener("click", () => {
          itemEl.remove();
          if (!configList.querySelector(".ai-modal__config-item")) {
            configList.innerHTML = '<div class="ai-modal__config-empty">暂无自定义功能，点击下方按钮添加</div>';
          }
        });
        configList.appendChild(itemEl);
      });

      configOverlay.querySelectorAll(".ai-modal__config-delete").forEach((button) => {
        button.addEventListener("click", () => {
          button.closest(".ai-modal__config-item")?.remove();
          if (!configList.querySelector(".ai-modal__config-item")) {
            configList.innerHTML = '<div class="ai-modal__config-empty">暂无自定义功能，点击下方按钮添加</div>';
          }
        });
      });

      saveButton.addEventListener("click", async () => {
        const items = configList.querySelectorAll(".ai-modal__config-item");
        const defaultActions = aiActions.filter(a => DEFAULT_ACTION_IDS.includes(a.id));
        const newCustomActions = [];
        
        items.forEach((item) => {
          const label = item.querySelector(".ai-modal__config-label")?.value.trim() || "";
          const prompt = item.querySelector(".ai-modal__config-prompt")?.value.trim() || "";
          
          if (label) {
            const existingAction = aiActions.find(a => a.label === label && !DEFAULT_ACTION_IDS.includes(a.id));
            const id = existingAction?.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            
            newCustomActions.push({
              id,
              label,
              description: prompt.substring(0, 30) + (prompt.length > 30 ? "..." : ""),
              prompt
            });
          }
        });
        
        aiActions = [...defaultActions, ...newCustomActions];
        await saveAiActions(aiActions);
        updateActionButtons();
        
        if (!aiActions.find(a => a.id === currentAction)) {
          currentAction = aiActions[0].id;
        }
        
        configOverlay.remove();
      });

      cancelButton.addEventListener("click", () => {
        configOverlay.remove();
      });

      configOverlay.addEventListener("click", (event) => {
        if (event.target === configOverlay || event.target.dataset.aiConfigAction === "cancel") {
          configOverlay.remove();
        }
      });

      configOverlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          configOverlay.remove();
        }
      });

      document.body.appendChild(configOverlay);
    }

    const close = (result) => {
      overlay.remove();
      if (editor) {
        editor.view.dispatch(editor.state.tr);
      }
      resolve(result);
    };

    langButtons.forEach((button) => {
      button.addEventListener("click", () => {
        langButtons.forEach(b => b.classList.remove("is-active"));
        button.classList.add("is-active");
        targetLang = button.dataset.aiLang;
      });
    });

    summaryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        summaryButtons.forEach(b => b.classList.remove("is-active"));
        button.classList.add("is-active");
        summaryLength = button.dataset.aiSummaryLength;
      });
    });

    continueButtons.forEach((button) => {
      button.addEventListener("click", () => {
        continueButtons.forEach(b => b.classList.remove("is-active"));
        button.classList.add("is-active");
        continueLength = button.dataset.aiContinueLength;
      });
    });

    templateButtons.forEach((button) => {
      button.addEventListener("click", () => {
        templateButtons.forEach(b => b.classList.remove("is-active"));
        button.classList.add("is-active");
        selectedTemplate = button.dataset.aiTemplate;
      });
    });

    if (inputToggle) {
      inputToggle.addEventListener("click", () => {
        if (inputSection) {
          const isHidden = inputSection.classList.contains("is-hidden");
          inputSection.classList.toggle("is-hidden", !isHidden);
          inputToggle.textContent = isHidden ? "隐藏文本" : "查看文本";
        }
      });
    }

    if (previewToggle) {
      previewToggle.addEventListener("click", () => {
        const isHidden = previewSection.classList.contains("is-hidden");
        previewSection.classList.toggle("is-hidden", !isHidden);
        previewToggle.textContent = isHidden ? "隐藏" : "展开";
        if (!isHidden) {
          actionSection.classList.remove("is-hidden");
          if (currentAction === "translate") langSection.classList.remove("is-hidden");
          if (currentAction === "summary") summarySection.classList.remove("is-hidden");
          if (currentAction === "continue") continueSection.classList.remove("is-hidden");
          if (currentAction === "template") templateSection.classList.remove("is-hidden");
          commandInput?.parentElement?.classList.remove("is-hidden");
          if (inputInfo) inputInfo.classList.remove("is-hidden");
          copyButton.disabled = true;
          insertBelowButton.disabled = true;
          replaceButton.disabled = true;
          generateButton.textContent = "开始生成";
        } else {
          actionSection.classList.add("is-hidden");
          langSection.classList.add("is-hidden");
          summarySection.classList.add("is-hidden");
          continueSection.classList.add("is-hidden");
          templateSection.classList.add("is-hidden");
          commandInput?.parentElement?.classList.add("is-hidden");
          if (inputInfo) inputInfo.classList.add("is-hidden");
          if (inputSection) inputSection.classList.add("is-hidden");
        }
      });
    }

    configButton.addEventListener("click", openConfigModal);
    generateButton.addEventListener("click", handleGenerate);
    copyButton.addEventListener("click", handleCopy);
    replaceButton.addEventListener("click", handleReplace);
    insertBelowButton.addEventListener("click", handleInsertBelow);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.dataset.aiAction === "cancel") {
        close(null);
      }
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
    });

    document.body.appendChild(overlay);
    
    if (inputTextarea) {
      inputTextarea.focus();
    } else {
      generateButton.focus();
    }
  });
}