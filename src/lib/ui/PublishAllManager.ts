import { showModal, hideModal } from "../modal";

export class PublishAllManager {
  private modalBody: HTMLElement | null;
  private modalFooter: HTMLElement | null;

  constructor() {
    this.modalBody = document.getElementById("modal-body");
    this.modalFooter = document.getElementById("modal-footer");
  }

  public show(networks: string[]) {
    const warnings = `
      <div class="mb-4 border border-yellow-400/50 bg-yellow-400/10 p-3 font-mono text-sm text-yellow-300">
        <p><strong>// Heads Up:</strong></p>
        <p class="mt-1 text-yellow-300/80">Posts with images and especially videos can take several minutes to publish due to processing times on social media platforms. <strong>Instagram and Threads in particular may experience longer delays.</strong> Please do not close this window.</p>
      </div>
    `;

    const itemsHtml = networks
      .map(
        (network) => `
        <li id="publish-all-status-${network}" class="flex items-center justify-between border-b border-border/20 py-2 font-mono text-foreground/70">
          <span class="capitalize">${network}</span>
          <span class="status-text flex items-center gap-2"><span class="status-icon">⏳</span> <span>Waiting...</span></span>
        </li>
      `,
      )
      .join("");

    const bodyHtml = `${warnings}<ul class="space-y-1">${itemsHtml}</ul>`;
    const footerHtml = `
      <button id="publish-all-close-btn" class="w-full border border-border px-8 py-3 font-mono text-lg uppercase transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-500/20 disabled:text-foreground/50" disabled>
        Close
      </button>
    `;

    showModal("// Publishing All Posts", bodyHtml, footerHtml);

    // Add event listener to the new close button
    document
      .getElementById("publish-all-close-btn")
      ?.addEventListener("click", hideModal);
  }

  public updateStatus(
    network: string,
    status: "loading" | "success" | "error",
    message: string,
  ) {
    const itemElement = document.getElementById(`publish-all-status-${network}`);
    if (!itemElement) return;

    const statusTextElement = itemElement.querySelector(".status-text");
    const iconElement = statusTextElement?.querySelector(".status-icon");

    if (!statusTextElement || !iconElement) return;

    iconElement.textContent =
      status === "success" ? "✅" : status === "error" ? "❌" : "⏳";

    const textElement = statusTextElement.querySelector("span:last-child");
    if (textElement) textElement.textContent = message;

    const baseClass =
      "flex items-center justify-between border-b border-border/20 py-2 font-mono";
    const colorClass =
      status === "success"
        ? "text-green-400"
        : status === "error"
        ? "text-red-400"
        : "text-foreground";
    itemElement.className = `${baseClass} ${colorClass}`;
  }

  public enableCloseButton() {
    const closeButton = document.getElementById("publish-all-close-btn");
    if (closeButton) {
      closeButton.removeAttribute("disabled");
      closeButton.classList.remove(
        "disabled:cursor-not-allowed",
        "disabled:bg-gray-500/20",
        "disabled:text-foreground/50",
      );
      closeButton.classList.add("hover:bg-primary", "hover:text-background");
    }
  }
}