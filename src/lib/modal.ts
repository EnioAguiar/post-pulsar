// --- Modal Logic ---
const modalContainer = document.getElementById("modal-container");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalFooter = document.getElementById("modal-footer");
const modalCloseBtn = document.getElementById("modal-close-btn");

export function showModal(title: string, body: string, footer: string) {
  if (!modalContainer || !modalTitle || !modalBody || !modalFooter) return;
  modalTitle.innerHTML = title;
  modalBody.innerHTML = body;
  modalFooter.innerHTML = footer;
  modalContainer.classList.remove("hidden");
}

export function hideModal() {
  if (!modalContainer) return;
  modalContainer.classList.add("hidden");
}

// Progress Modal Logic
export function showProgressModal(title: string, steps: string[]) {
  const stepsHtml = steps.map((step, index) => `<li id="progress-step-${index}" class="flex items-center gap-2 text-foreground/70"><span class="status-icon">⏳</span><span>${step}</span></li>`).join('');
  const body = `<ul class="space-y-2 font-mono">${stepsHtml}</ul>`;
  const footer = `<div class="h-2 w-full bg-border rounded-full overflow-hidden"><div class="h-full bg-primary animate-pulse w-full"></div></div>`;
  showModal(title, body, footer);
}

export function updateProgressStep(index: number, newText: string, status: 'success' | 'error' | 'loading') {
  const stepElement = document.getElementById(`progress-step-${index}`);
  if (!stepElement) return;
  const icon = stepElement.querySelector('.status-icon');
  const text = stepElement.querySelector('span:last-child');
  if (!icon || !text) return;

  icon.textContent = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
  text.textContent = newText;
  stepElement.className = status === 'error' ? 'flex items-center gap-2 text-red-400' : 'flex items-center gap-2 text-foreground';
}

export function initModal() {
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener("click", hideModal);
    }
    if (modalContainer) {
        modalContainer.addEventListener("click", (e) => {
            if (e.target === modalContainer) {
                hideModal();
            }
        });
    }
}
