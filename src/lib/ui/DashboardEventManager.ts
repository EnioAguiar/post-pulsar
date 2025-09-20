import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";
import type { PublicationManager } from "./PublicationManager";

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "pinterest";

export class DashboardEventManager {
  private supabase: SupabaseClient;
  private publicationManager: PublicationManager;

  // DOM Elements
  private advancedSettingsToggle: HTMLElement | null;
  private advancedSettingsPanel: HTMLElement | null;
  private linkedinCharCountInput: HTMLInputElement | null;
  private twitterCharCountInput: HTMLInputElement | null;
  private instagramCharCountInput: HTMLInputElement | null;
  private threadsCharCountInput: HTMLInputElement | null;
  private facebookCharCountInput: HTMLInputElement | null;
  private pinterestCharCountInput: HTMLInputElement | null;
  private twitterPremiumCheck: HTMLInputElement | null;
  private savePrefsBtn: HTMLElement | null;
  private selectAllNetworksCheckbox: HTMLInputElement | null;
  private networkCheckboxes: NodeListOf<HTMLInputElement>;
  private outputArea: HTMLElement | null;
  private urlModeBtn: HTMLElement | null;
  private textModeBtn: HTMLElement | null;
  private urlInputContainer: HTMLElement | null;
  private textInputContainer: HTMLElement | null;
  private postUrlInput: HTMLInputElement | null;
  private rawTextInput: HTMLTextAreaElement | null;

  constructor(
    supabase: SupabaseClient,
    publicationManager: PublicationManager,
  ) {
    this.supabase = supabase;
    this.publicationManager = publicationManager;

    this.advancedSettingsToggle = document.getElementById(
      "advanced-settings-toggle",
    );
    this.advancedSettingsPanel = document.getElementById(
      "advanced-settings-panel",
    );
    this.linkedinCharCountInput = document.getElementById(
      "linkedin-char-count",
    ) as HTMLInputElement;
    this.twitterCharCountInput = document.getElementById(
      "twitter-char-count",
    ) as HTMLInputElement;
    this.instagramCharCountInput = document.getElementById(
      "instagram-char-count",
    ) as HTMLInputElement;
    this.threadsCharCountInput = document.getElementById(
      "threads-char-count",
    ) as HTMLInputElement;
    this.facebookCharCountInput = document.getElementById(
      "facebook-char-count",
    ) as HTMLInputElement;
    this.pinterestCharCountInput = document.getElementById(
      "pinterest-char-count",
    ) as HTMLInputElement;
    this.twitterPremiumCheck = document.getElementById(
      "twitter-premium-check",
    ) as HTMLInputElement;
    this.savePrefsBtn = document.getElementById("save-prefs-btn");
    this.selectAllNetworksCheckbox = document.getElementById(
      "select-all-networks",
    ) as HTMLInputElement;
    this.networkCheckboxes = document.querySelectorAll(
      ".network-select-checkbox",
    );
    this.outputArea = document.getElementById("content-output");

    // Input mode elements
    this.urlModeBtn = document.getElementById("url-mode-btn");
    this.textModeBtn = document.getElementById("text-mode-btn");
    this.urlInputContainer = document.getElementById("url-input-container");
    this.textInputContainer = document.getElementById("text-input-container");
    this.postUrlInput = document.getElementById("post-url") as HTMLInputElement;
    this.rawTextInput = document.getElementById(
      "raw-text",
    ) as HTMLTextAreaElement;
  }

  public init() {
    this.outputArea?.addEventListener("input", (e) => this.handleCharCount(e));
    this.outputArea?.addEventListener("click", (e) =>
      this.handleOutputAreaClick(e as MouseEvent),
    );
    this.twitterPremiumCheck?.addEventListener("change", () =>
      this.handleTwitterPremiumToggle(),
    );

    this.urlModeBtn?.addEventListener("click", () =>
      this._handleInputModeChange("url"),
    );
    this.textModeBtn?.addEventListener("click", () =>
      this._handleInputModeChange("text"),
    );

    if (this.advancedSettingsToggle) {
      this.advancedSettingsToggle.addEventListener("click", () => {
        if (this.advancedSettingsPanel)
          this.advancedSettingsPanel.classList.toggle("hidden");
      });
    }
    if (this.savePrefsBtn)
      this.savePrefsBtn.addEventListener("click", () => this.handleSavePrefs());

    if (this.selectAllNetworksCheckbox) {
      this.selectAllNetworksCheckbox.addEventListener("change", () =>
        this.handleSelectAllNetworks(),
      );
    }
  }

  private _handleInputModeChange(mode: "url" | "text") {
    if (mode === "url") {
      this.urlInputContainer?.classList.remove("hidden");
      this.textInputContainer?.classList.add("hidden");
      this.postUrlInput?.setAttribute("required", "true");
      this.rawTextInput?.removeAttribute("required");

      this.urlModeBtn?.classList.add("text-primary", "border-primary");
      this.urlModeBtn?.classList.remove("text-foreground/70", "border-transparent");

      this.textModeBtn?.classList.add("text-foreground/70", "border-transparent");
      this.textModeBtn?.classList.remove("text-primary", "border-primary");
    } else {
      this.urlInputContainer?.classList.add("hidden");
      this.textInputContainer?.classList.remove("hidden");
      this.postUrlInput?.removeAttribute("required");
      this.rawTextInput?.setAttribute("required", "true");

      this.textModeBtn?.classList.add("text-primary", "border-primary");
      this.textModeBtn?.classList.remove(
        "text-foreground/70",
        "border-transparent",
      );

      this.urlModeBtn?.classList.add("text-foreground/70", "border-transparent");
      this.urlModeBtn?.classList.remove("text-primary", "border-primary");
    }
  }

  private async handleSavePrefs() {
    if (!this.savePrefsBtn) return;
    const prefs = {
      linkedin_chars:
        parseInt(this.linkedinCharCountInput?.value || "0", 10) || null,
      twitter_chars:
        parseInt(this.twitterCharCountInput?.value || "0", 10) || null,
      instagram_chars:
        parseInt(this.instagramCharCountInput?.value || "0", 10) || null,
      threads_chars:
        parseInt(this.threadsCharCountInput?.value || "0", 10) || null,
      facebook_chars:
        parseInt(this.facebookCharCountInput?.value || "0", 10) || null,
      pinterest_chars:
        parseInt(this.pinterestCharCountInput?.value || "0", 10) || null,
    };
    this.savePrefsBtn.setAttribute("disabled", "true");
    this.savePrefsBtn.innerText = "Saving...";
    try {
      const { error } = await this.supabase.rpc(
        "update_char_preferences",
        prefs,
      );
      if (error) throw error;
      this.savePrefsBtn.innerText = "Saved!";
      setTimeout(() => {
        if (this.savePrefsBtn) {
          this.savePrefsBtn.innerText = "Save as Default";
          this.savePrefsBtn.removeAttribute("disabled");
        }
      }, 2000);
    } catch (err) {
      const error = err as { message: string };
      alert(`Error saving preferences: ${error.message}`);
      if (this.savePrefsBtn) {
        this.savePrefsBtn.innerText = "Save as Default";
        this.savePrefsBtn.removeAttribute("disabled");
      }
    }
  }

  public updateCharacterCount(network: "twitter" | "threads", text: string) {
    if (!this.twitterPremiumCheck) return;
    const isPremium = this.twitterPremiumCheck.checked;
    const limits = { twitter: isPremium ? 25000 : 280, threads: 500 };
    const maxChars = limits[network];
    const counter = document.getElementById(`${network}-counter`);
    const counterContainer = document.getElementById(
      `${network}-counter-container`,
    );
    const textarea = document.getElementById(
      `${network}-textarea`,
    ) as HTMLTextAreaElement;
    if (counter && counterContainer && textarea) {
      const remaining = maxChars - (text || textarea.value).length;
      counter.textContent = remaining.toString();
      counterContainer.classList.toggle("text-red-500", remaining < 0);
    }
  }

  public handleCharCount(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    if (target.id === "twitter-textarea")
      this.updateCharacterCount("twitter", target.value);
    if (target.id === "threads-textarea")
      this.updateCharacterCount("threads", target.value);
  }

  public handleTwitterPremiumToggle() {
    if (!this.twitterCharCountInput || !this.twitterPremiumCheck) return;
    const isPremium = this.twitterPremiumCheck.checked;
    const counterContainer = document.getElementById(
      "twitter-counter-container",
    );
    this.twitterCharCountInput.max = isPremium ? "25000" : "280";
    this.twitterCharCountInput.value = isPremium ? "4000" : "250";
    if (counterContainer)
      counterContainer.classList.toggle("hidden", isPremium);
    this.updateCharacterCount(
      "twitter",
      (document.getElementById("twitter-textarea") as HTMLTextAreaElement)
        ?.value || "",
    );
  }

  private handleSelectAllNetworks() {
    if (!this.selectAllNetworksCheckbox || !this.networkCheckboxes) return;
    const isChecked = this.selectAllNetworksCheckbox.checked;
    this.networkCheckboxes.forEach((checkbox) => {
      checkbox.checked = isChecked;
    });
  }

  private async handleOutputAreaClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    if (target.classList.contains("copy-btn")) {
      const relativeContainer = target.closest(".relative");
      const contentElement = relativeContainer?.querySelector("textarea");
      if (contentElement) {
        navigator.clipboard.writeText(contentElement.value);
        target.innerText = "Copied!";
        setTimeout(() => {
          target.innerText = "Copy Text";
        }, 2000);
      }
    }

    if (target.classList.contains("publish-btn")) {
      const network = (target.closest("[data-network]") as HTMLElement)?.dataset
        .network as TNetwork;

      const relativeContainer = target.closest(".relative");
      const editedText = relativeContainer?.querySelector("textarea")?.value;
      if (!network || !editedText) {
        alert("Cannot publish empty content.");
        return;
      }

      let selectedPageId: string | null = null;
      if (network === "facebook") {
        const selector = document.getElementById(
          "facebook-page-selector",
        ) as HTMLSelectElement;
        if (selector && selector.value) {
          selectedPageId = selector.value;
        } else if (selector) {
          alert("Please select a Facebook Page to post to.");
          return;
        }
      }

      const confirmButtonId = "confirm-publish-btn";
      showModal(
        `// Confirm Publication`,
        `<p class="text-foreground/80">Are you sure you want to post this content to ${network}? This will consume 1 Pulse.</p>`,
        `<button id="cancel-publish-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
             <button id="${confirmButtonId}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post</button>`,
      );

      document
        .getElementById(confirmButtonId)
        ?.addEventListener("click", async () => {
          hideModal();
          await this.publicationManager.executePublication(
            network,
            editedText,
            selectedPageId,
            target as HTMLButtonElement,
          );
        });

      const cancelBtn = document.getElementById("cancel-publish-btn");
      if (cancelBtn) cancelBtn.addEventListener("click", hideModal);
    }
  }
}
