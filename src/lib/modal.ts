// --- Modal Logic ---
const modalContainer = document.getElementById("modal-container");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalFooter = document.getElementById("modal-footer");
const progressFooter = document.getElementById("progress-footer");
const progressBar = document.getElementById("progress-bar");
const progressPercentage = document.getElementById("progress-percentage");
const modalCloseBtn = document.getElementById("modal-close-btn");

export function showModal(title: string, body: string, footer: string) {
  if (!modalContainer || !modalTitle || !modalBody || !modalFooter || !progressFooter) return;
  modalTitle.innerHTML = title;
  modalBody.innerHTML = body;
  modalFooter.innerHTML = footer;

  // Hide progress bar, show standard footer
  progressFooter.classList.add("hidden");
  modalFooter.classList.remove("hidden");

  modalContainer.classList.remove("hidden");
}

export function hideModal() {
  if (!modalContainer) return;
  modalContainer.classList.add("hidden");
}

// Progress Modal Logic
export function showProgressModal(title: string, steps: string[]) {
  if (!modalContainer || !modalTitle || !modalBody || !modalFooter || !progressFooter) return;

  const stepsHtml = steps
    .map(
      (step, index) =>
        `<li id="progress-step-${index}" class="flex items-center gap-2 text-foreground/70"><span class="status-icon">⏳</span><span>${step}</span></li>`
    )
    .join("");
  const body = `<ul class="space-y-2 font-mono">${stepsHtml}</ul>`;

  modalTitle.innerHTML = title;
  modalBody.innerHTML = body;

  // Show progress bar, hide standard footer
  modalFooter.classList.add("hidden");
  progressFooter.classList.remove("hidden");
  updateProgressBar(0); // Reset progress bar

  modalContainer.classList.remove("hidden");
}

export function updateProgressStep(
  index: number,
  newText: string,
  status: "success" | "error" | "loading"
) {
  const stepElement = document.getElementById(`progress-step-${index}`);
  if (!stepElement) return;
  const icon = stepElement.querySelector(".status-icon");
  const text = stepElement.querySelector("span:last-child");
  if (!icon || !text) return;

  icon.textContent = status === "success" ? "✅" : status === "error" ? "❌" : "⏳";
  text.textContent = newText;
  stepElement.className =
    status === "error"
      ? "flex items-center gap-2 text-red-400"
      : "flex items-center gap-2 text-foreground";
}

export function updateProgressBar(percentage: number) {
    if (!progressBar || !progressPercentage) return;
    const p = Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
    progressBar.style.width = `${p}%`;
    progressPercentage.textContent = `${Math.round(p)}%`;
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
