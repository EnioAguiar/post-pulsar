import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";
import type { PublicationManager } from "./PublicationManager";
import type { DashboardManager } from "./DashboardManager";

const TRUNCATE_PREF_KEY = "postpulsar_truncate_pref";

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
  private dashboardManager: DashboardManager;

  // DOM Elements
  private advancedSettingsToggle: HTMLElement | null;
  private advancedSettingsPanel: HTMLElement | null;
  private linkedinCharCountInput: HTMLInputElement | null;
  private twitterCharCountInput: HTMLInputElement | null;
  private instagramCharCountInput: HTMLInputElement | null;
  private threadsCharCountInput: HTMLInputElement | null;
  private facebookCharCountInput: HTMLInputElement | null;
  private pinterestCharCountInput: HTMLInputElement | null;
  private discordCharCountInput: HTMLInputElement | null;
  private telegramCharCountInput: HTMLInputElement | null;
  private twitterPremiumCheck: HTMLInputElement | null;
  private telegramMediaCheck: HTMLInputElement | null;
  private truncateTextCheck: HTMLInputElement | null;
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
    dashboardManager: DashboardManager,
  ) {
    this.supabase = supabase;
    this.publicationManager = publicationManager;
    this.dashboardManager = dashboardManager;

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
    this.discordCharCountInput = document.getElementById(
      "discord-char-count",
    ) as HTMLInputElement;
    this.telegramCharCountInput = document.getElementById(
      "telegram-char-count",
    ) as HTMLInputElement;
    this.twitterPremiumCheck = document.getElementById(
      "twitter-premium-check",
    ) as HTMLInputElement;
    this.telegramMediaCheck = document.getElementById(
      "telegram-media-check",
    ) as HTMLInputElement;
    this.truncateTextCheck = document.getElementById(
      "truncate-text-check",
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
    this.telegramMediaCheck?.addEventListener("change", () =>
      this.handleTelegramMediaToggle(),
    );
    this.truncateTextCheck?.addEventListener("change", () => {
      localStorage.setItem(
        TRUNCATE_PREF_KEY,
        this.truncateTextCheck?.checked ? "true" : "false",
      );
    });

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

    this.synchronizeUIWithState();
  }

  public synchronizeUIWithState(prefs: any = {}) {
    if (this.truncateTextCheck) {
      const truncatePref = localStorage.getItem(TRUNCATE_PREF_KEY);
      // Unchecked by default if no preference is stored
      this.truncateTextCheck.checked = truncatePref === "true";
    }

    if (this.twitterPremiumCheck) {
      this.twitterPremiumCheck.checked = prefs.prefers_twitter_premium || false;
      this.handleTwitterPremiumToggle(); // Apply UI changes
    }

    if (this.telegramMediaCheck) {
      this.telegramMediaCheck.checked =
        prefs.prefers_telegram_media_limit || false;
      this.handleTelegramMediaToggle(); // Update counter and input based on loaded pref
    }
  }

  public isTwitterPremium(): boolean {
    return this.twitterPremiumCheck?.checked || false;
  }

  public isTelegramMedia(): boolean {
    return this.telegramMediaCheck?.checked || false;
  }

  private _handleInputModeChange(mode: "url" | "text") {
    if (mode === "url") {
      this.urlInputContainer?.classList.remove("hidden");
      this.textInputContainer?.classList.add("hidden");
      this.postUrlInput?.setAttribute("required", "true");
      this.rawTextInput?.removeAttribute("required");

      this.urlModeBtn?.classList.add("text-primary", "border-primary");
      this.urlModeBtn?.classList.remove(
        "text-foreground/70",
        "border-transparent",
      );

      this.textModeBtn?.classList.add(
        "text-foreground/70",
        "border-transparent",
      );
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

      this.urlModeBtn?.classList.add(
        "text-foreground/70",
        "border-transparent",
      );
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
      discord_chars:
        parseInt(this.discordCharCountInput?.value || "0", 10) || null,
      telegram_chars:
        parseInt(this.telegramCharCountInput?.value || "0", 10) || null,
      twitter_premium: this.twitterPremiumCheck?.checked || false,
      telegram_media: this.telegramMediaCheck?.checked || false,
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

  public updateCharacterCount(
    network: "twitter" | "threads" | "telegram",
    text: string,
  ) {
    const isTwitterPremium = this.twitterPremiumCheck?.checked || false;
    const isTelegramMedia = this.telegramMediaCheck?.checked || false;

    const limits = {
      twitter: isTwitterPremium ? 25000 : 280,
      threads: 500,
      telegram: isTelegramMedia ? 1024 : 4096,
    };

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
    if (target.id === "telegram-textarea")
      this.updateCharacterCount("telegram", target.value);
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

  public handleTelegramMediaToggle() {
    if (!this.telegramCharCountInput || !this.telegramMediaCheck) return;
    const isMedia = this.telegramMediaCheck.checked;
    this.telegramCharCountInput.value = isMedia ? "800" : "2000"; // Default to 2000 as a sensible non-media value
    this.updateCharacterCount(
      "telegram",
      (document.getElementById("telegram-textarea") as HTMLTextAreaElement)
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

      // Character limit validation
      if (
        network === "twitter" ||
        network === "threads" ||
        network === "telegram"
      ) {
        const isTwitterPremium = this.twitterPremiumCheck?.checked || false;
        const isTelegramMedia = this.telegramMediaCheck?.checked || false;
        const limits = {
          twitter: isTwitterPremium ? 25000 : 280,
          threads: 500,
          telegram: isTelegramMedia ? 1024 : 4096,
        };
        const maxChars = limits[network as keyof typeof limits];
        if (editedText && editedText.length > maxChars) {
          showModal(
            `// Character Limit Exceeded`,
            `<p class="text-foreground/80">Your post for <strong>${network}</strong> is over the character limit. Please shorten it before publishing.</p>`,
            `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
          );
          return;
        }
      }

      if (!network || !editedText) {
        showModal(
          `// Empty Content`,
          `<p class="text-foreground/80">Cannot publish a post with no content.</p>`,
          `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
        );
        return;
      }

      let targets: (string | null)[] = [];
      if (network === "facebook") {
        const pageId = this.dashboardManager.selectedFacebookPage?.id;
        if (!pageId) {
          showModal("// Action Required", `<p>Please select a Facebook Page to publish to.</p>`, `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`);
          return;
        }
        targets = [pageId];
      } else if (network === "telegram" || network === "discord") {
        const selectedConnections = network === "telegram" ? this.dashboardManager.selectedTelegramConnections : this.dashboardManager.selectedDiscordConnections;
        if (selectedConnections.length > 0) {
          targets = selectedConnections;
        } else {
          const singleId = (target as HTMLButtonElement).dataset.connectionId;
          if (singleId) {
            targets = [singleId];
          } else {
            this.dashboardManager.showDestinationSelectionModal(network as "telegram" | "discord");
            return;
          }
        }
      } else {
        targets = [null]; // For networks without special targets
      }

      if (targets.length === 0) {
        showModal("// No Destination Selected", `<p>Please select at least one destination to publish to.</p>`, `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`);
        return;
      }

      const confirmButtonId = "confirm-publish-btn";
      const pulseCost = targets.length;
      showModal(
        `// Confirm Publication`,
        `<p class="text-foreground/80">Are you sure you want to post this content to ${targets.length} destination(s)? This will consume ${pulseCost} Pulse(s).</p>`,
        `<button id="cancel-publish-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
         <button id="${confirmButtonId}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post</button>`,
      );

      document.getElementById(confirmButtonId)?.addEventListener("click", async () => {
        hideModal();
        // TODO: Add a proper multi-publication progress modal
        for (const targetId of targets) {
          await this.publicationManager.executePublication(
            network,
            editedText,
            targetId,
            target as HTMLButtonElement,
          );
        }
      });

      const cancelBtn = document.getElementById("cancel-publish-btn");
      if (cancelBtn) cancelBtn.addEventListener("click", hideModal);
    }
  }
}
