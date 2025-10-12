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
  if (
    !modalContainer ||
    !modalTitle ||
    !modalBody ||
    !modalFooter ||
    !progressFooter
  )
    return;
  modalTitle.innerHTML = title;
  modalBody.innerHTML = body;
  modalFooter.innerHTML = footer;

  // Hide progress bar, show standard footer
  progressFooter.classList.add("hidden");
  modalFooter.classList.remove("hidden");

  modalContainer.classList.remove("hidden");
  modalContainer.classList.add("flex");
}

export function hideModal() {
  if (!modalContainer) return;
  // Also hide predefined modals if they are open
  document.querySelectorAll("[data-modal-id]").forEach((modal) => {
    modal.classList.add("hidden");
  });
  modalContainer.classList.add("hidden");
  modalContainer.classList.remove("flex");
}

// Progress Modal Logic
export function showProgressModal(
  title: string,
  steps: string[],
  preludeHtml = "",
) {
  if (
    !modalContainer ||
    !modalTitle ||
    !modalBody ||
    !modalFooter ||
    !progressFooter
  )
    return;

  const stepsHtml = steps
    .map(
      (step, index) =>
        `<li id="progress-step-${index}" class="flex items-center gap-2 text-foreground/70"><span class="status-icon">⏳</span><span>${step}</span></li>`,
    )
    .join("");
  const body = `${preludeHtml}<ul class="space-y-2 font-mono">${stepsHtml}</ul>`;

  modalTitle.innerHTML = title;
  modalBody.innerHTML = body;

  // Show progress bar, hide standard footer
  modalFooter.classList.add("hidden");
  progressFooter.classList.remove("hidden");
  updateProgressBar(0); // Reset progress bar

  modalContainer.classList.remove("hidden");
  modalContainer.classList.add("flex");
}

export function updateProgressStep(
  index: number,
  newText: string,
  status: "success" | "error" | "loading",
) {
  const stepElement = document.getElementById(`progress-step-${index}`);
  if (!stepElement) return;
  const icon = stepElement.querySelector(".status-icon");
  const text = stepElement.querySelector("span:last-child");
  if (!icon || !text) return;

  icon.textContent =
    status === "success" ? "✅" : status === "error" ? "❌" : "⏳";
  text.textContent = newText;
  stepElement.className =
    status === "error"
      ? "flex items-center gap-2 text-red-400"
      : "flex items-center gap-2 text-foreground";
}

export function updateProgressBar(value: number) {
  if (!progressBar || !progressPercentage) return;
  // If value is between 0 and 1 (inclusive), treat it as a fraction and convert to percentage.
  // Otherwise, treat it as a percentage.
  const percentage = value >= 0 && value <= 1 ? value * 100 : value;
  const p = Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
  progressBar.style.width = `${p}%`;
  progressPercentage.textContent = `${Math.round(p)}%`;
}

// --- Multi-Progress Modal for Publish All ---

export function showMultiProgressModal(title: string, items: string[]) {
  if (
    !modalContainer ||
    !modalTitle ||
    !modalBody ||
    !modalFooter ||
    !progressFooter
  )
    return;

  const itemsHtml = items
    .map(
      (item) =>
        `<li id="multi-progress-${item}" class="flex items-center justify-between border-b border-border/20 py-2 font-mono text-foreground/70">
          <span class="capitalize">${item}</span>
          <span class="status-text flex items-center gap-2"><span class="status-icon">⏳</span> <span>Waiting...</span></span>
         </li>`,
    )
    .join("");
  const body = `<ul class="space-y-1">${itemsHtml}</ul>`;

  modalTitle.innerHTML = title;
  modalBody.innerHTML = body;

  // Use the progress footer, but we'll add our own close button later
  modalFooter.innerHTML = ""; // Clear standard footer
  modalFooter.classList.remove("hidden");
  progressFooter.classList.add("hidden"); // Hide the percentage bar footer

  modalContainer.classList.remove("hidden");
  modalContainer.classList.add("flex");
}

export function updateMultiProgressItem(
  item: string,
  status: "success" | "error" | "loading",
  message: string,
) {
  const itemElement = document.getElementById(`multi-progress-${item}`);
  if (!itemElement) return;

  const statusTextElement = itemElement.querySelector(".status-text");
  const iconElement = statusTextElement?.querySelector(".status-icon");

  if (!statusTextElement || !iconElement) return;

  iconElement.textContent =
    status === "success" ? "✅" : status === "error" ? "❌" : "⏳";

  const textElement = statusTextElement.querySelector("span:last-child");
  if (textElement) textElement.textContent = message;

  itemElement.className =
    status === "error"
      ? "flex items-center justify-between border-b border-border/20 py-2 font-mono text-red-400"
      : "flex items-center justify-between border-b border-border/20 py-2 font-mono text-foreground";
}

export function initModal() {
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", hideModal);
  }
  if (modalContainer) {
    modalContainer.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      // Close if clicking on the background overlay
      if (target === modalContainer) {
        hideModal();
      }
      // Close if clicking on an element with data-modal-close attribute
      if (target.closest("[data-modal-close]")) {
        hideModal();
      }
    });
  }
}
