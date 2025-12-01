import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";
import { createSocialPostCard } from "./SocialPostCard";
import { PromptManager } from "./PromptManager";
import { MediaManager } from "./MediaManager";
import { DashboardEventManager } from "./DashboardEventManager";
import { PublicationManager } from "./PublicationManager";
import { PulsarFormManager } from "./PulsarFormManager";
import {
  getReferralCode,
  getReopenPost,
  getTempPost,
  removeReferralCode,
  removeReopenPost,
  removeTempPost,
  saveTempPost,
} from "./storageManager";

// Type Definitions
interface IProfile {
  monthly_pulses_remaining: number;
  weekly_transcriptions_remaining: number;
  plan_type: string;
  default_linkedin_chars?: number;
  default_twitter_chars?: number;
  default_instagram_chars?: number;
  default_threads_chars?: number;
  default_facebook_chars?: number;
  default_discord_chars?: number;
  default_telegram_chars?: number;
  prefers_twitter_premium?: boolean;
  prefers_telegram_media_limit?: boolean;
}

interface IGeneratedContent {
  [key: string]: string;
}

export interface IPage {
  provider_user_id: string;
  provider_user_name: string;
}

interface IReopenPayload {
  generatedContent: IGeneratedContent;
  mediaMap: { [key: string]: string[] };
  sourceUrl?: string;
  generatedImageUrl?: string;
}

interface ITempPost {
  sourceUrl?: string;
  rawText?: string;
  generatedContent?: IGeneratedContent;
  generatedImageUrl?: string;
}

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "telegram"
  | "discord";

export class DashboardManager {
  private supabase: SupabaseClient;
  private pulseCountDisplay: HTMLElement | null;
  private planDisplay: HTMLElement | null;
  private transcriptionCountDisplay: HTMLElement | null;
  private pulsarForm: HTMLElement | null;
  private outputArea: HTMLElement | null;
  private urlInput: HTMLInputElement | null;
  private rawTextInput: HTMLTextAreaElement | null;
  private linkedinCharCountInput: HTMLInputElement | null;
  private twitterCharCountInput: HTMLInputElement | null;
  private instagramCharCountInput: HTMLInputElement | null;
  private threadsCharCountInput: HTMLInputElement | null;
  private facebookCharCountInput: HTMLInputElement | null;
  private generateImageBtn: HTMLElement | null;
  private imageTemplateSelector: HTMLSelectElement | null;
  private imageColorSelector: HTMLInputElement | null;
  private fontFamilySelector: HTMLSelectElement | null;
  private backgroundColorSelector: HTMLInputElement | null;

  private promptManager: PromptManager | null = null;
  private mediaManager: MediaManager | null = null;
  private eventManager: DashboardEventManager | null = null;
  private publicationManager: PublicationManager | null = null;
  private pulsarFormManager: PulsarFormManager | null = null;

  private currentPulseCount = 0;
  private userId: string | null = null;
  private userPlan = "free";
  private userProfile: IProfile | null = null;
  public selectedFacebookPage: { id: string; name: string } | null = null;
  public telegramConnections: IPage[] = [];
  public discordConnections: IPage[] = [];
  public facebookPages: IPage[] = [];
  public selectedTelegramConnections: string[] = [];
  public selectedDiscordConnections: string[] = [];

  private reopenPayload: IReopenPayload | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.pulseCountDisplay = document.getElementById("pulse-count-display");
    this.planDisplay = document.getElementById("plan-display");
    this.transcriptionCountDisplay = document.getElementById(
      "transcription-count-display",
    );
    this.pulsarForm = document.getElementById("pulsar-form");
    this.outputArea = document.getElementById("content-output");
    this.urlInput = document.getElementById("post-url") as HTMLInputElement;
    this.rawTextInput = document.getElementById(
      "raw-text",
    ) as HTMLTextAreaElement;
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
    this.generateImageBtn = document.getElementById("generate-image-btn");
    this.imageTemplateSelector = document.getElementById(
      "image-template-selector",
    ) as HTMLSelectElement;
    this.imageColorSelector = document.getElementById(
      "image-color-selector",
    ) as HTMLInputElement;
    this.fontFamilySelector = document.getElementById(
      "font-family-selector",
    ) as HTMLSelectElement;
    this.backgroundColorSelector = document.getElementById(
      "background-color-selector",
    ) as HTMLInputElement;
  }

  public isTwitterPremium(): boolean {
    return this.eventManager?.isTwitterPremium() || false;
  }

  public isTelegramMedia(): boolean {
    return this.eventManager?.isTelegramMedia() || false;
  }

  public async init() {
    if (!this.pulsarForm || !this.outputArea) return;

    this.urlInput?.addEventListener("input", () =>
      this._saveSourceInputsToStorage(),
    );
    this.rawTextInput?.addEventListener("input", () =>
      this._saveSourceInputsToStorage(),
    );
    this.outputArea.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "facebook-page-select-btn")
        this.handleFacebookPageSelect();
      if (target.id === "telegram-destination-select-btn")
        this.handleTelegramDestinationSelect();
      if (target.id === "discord-destination-select-btn")
        this.handleDiscordDestinationSelect();
      if (target.classList.contains("clear-selection-btn")) {
        const network = target.dataset.network as "telegram" | "discord";
        this.handleClearSelection(network);
      }
    });

    this.pulsarForm?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains("network-select-checkbox")) {
        this.updateGenerateImageButtonState();
      }
    });

    // Step 1: Get user session and essential data
    const {
      data: { session },
      error: sessionError,
    } = await this.supabase.auth.getSession();
    if (sessionError || !session) {
      window.location.href = "/login";
      return;
    }
    this.userId = session.user.id;
    await this.loadUserData();

    // Step 2: Instantiate all managers now that user data (especially plan) is available
    this.promptManager = new PromptManager(
      this.supabase,
      this.userId,
      this.userPlan,
    );
    this.mediaManager = new MediaManager(
      this.supabase,
      this.userId,
      this.userPlan,
    );
    this.publicationManager = new PublicationManager(
      this.supabase,
      this.userId,
      this.mediaManager,
      this,
      (count) => this.updatePulseDisplay(count),
    );
    this.eventManager = new DashboardEventManager(
      this.supabase,
      this.publicationManager,
      this,
    );
    this.pulsarFormManager = new PulsarFormManager(
      this.supabase,
      this.pulsarForm,
      {
        onPulseUpdate: () => this.refreshPulseCountFromServer(),
        onPulsarComplete: () => {
          const latestState = getTempPost<ITempPost>();
          this._renderOutputArea(latestState);
        },
        mediaManagerClear: () => this.mediaManager?.clearSelectedMedia(),
      },
    );

    // Step 3: Initialize all managers
    this.promptManager.init();
    this.mediaManager.init();
    this.publicationManager.init();
    this.eventManager.init();
    this.pulsarFormManager.init();
    if (this.generateImageBtn) {
      this.generateImageBtn.addEventListener("click", () =>
        this.handleGenerateQuoteImage(),
      );
    }

    // Step 4: Synchronize UI with loaded state
    if (this.userProfile) {
      this.eventManager.synchronizeUIWithState(this.userProfile);
    }
    this.applyImageGenerationPlanRestrictions();

    // Step 5: Render initial content from localStorage or reopen data
    this.renderInitialState();

    // Step 6: Post-initialization tasks
    this.handleReferralCheck();
  }

  private _saveSourceInputsToStorage() {
    const urlInputContainer = document.getElementById("url-input-container");
    const isUrlMode =
      urlInputContainer && !urlInputContainer.classList.contains("hidden");

    const dataToStore = {
      sourceUrl: isUrlMode ? this.urlInput?.value || "" : "",
      rawText: !isUrlMode ? this.rawTextInput?.value || "" : "",
    };

    const existingData = getTempPost<ITempPost>() || {};
    const finalData: ITempPost = { ...existingData, ...dataToStore };
    saveTempPost(finalData);
  }

  private _renderOutputArea(state: ITempPost | null) {
    if (!this.outputArea) return;
    this.outputArea.innerHTML = "";

    if (!state) {
      this.updateUIAccess(this.userPlan);
      return;
    }

    if (state.generatedImageUrl) {
      this._displayGeneratedImageCard(
        state.generatedImageUrl,
        state.generatedContent,
      );
    }

    if (state.generatedContent) {
      this._displayGeneratedContent(state.generatedContent);
    }

    if (!state.generatedImageUrl && !state.generatedContent) {
      this.updateUIAccess(this.userPlan);
    }
  }

  private renderInitialState() {
    const reopenData = getReopenPost<IReopenPayload>();
    if (reopenData) {
      if (this.urlInput && reopenData.sourceUrl) {
        this.urlInput.value = reopenData.sourceUrl;
      }
      this._renderOutputArea(reopenData);
      this.reopenPayload = reopenData;
      if (
        this.mediaManager &&
        this.reopenPayload &&
        this.reopenPayload.mediaMap
      ) {
        this.mediaManager.preloadMedia(this.reopenPayload.mediaMap);
        this.reopenPayload = null;
      }
      removeReopenPost();
      this.updateGenerateImageButtonState();
      return;
    }

    const storedData = getTempPost<ITempPost>();
    if (storedData) {
      if (storedData.sourceUrl && this.urlInput) {
        this.urlInput.value = storedData.sourceUrl;
      } else if (storedData.rawText && this.rawTextInput) {
        this.rawTextInput.value = storedData.rawText;
      }
      this._renderOutputArea(storedData);
    } else {
      this._renderOutputArea(null);
    }
    this.updateGenerateImageButtonState();
  }

  private applyImageGenerationPlanRestrictions() {
    if (
      !this.imageTemplateSelector ||
      !this.imageColorSelector ||
      !this.fontFamilySelector ||
      !this.backgroundColorSelector
    )
      return;

    this.imageTemplateSelector.disabled = false;
    this.imageTemplateSelector.title = "";
    this.imageTemplateSelector.style.cursor = "";
    Array.from(this.imageTemplateSelector.options).forEach(
      (o) => (o.disabled = false),
    );

    this.imageColorSelector.disabled = false;
    this.imageColorSelector.title = "";
    this.imageColorSelector.style.cursor = "";

    this.fontFamilySelector.disabled = false;
    this.fontFamilySelector.title = "";
    this.fontFamilySelector.style.cursor = "";

    this.backgroundColorSelector.disabled = false;
    this.backgroundColorSelector.title = "";
    this.backgroundColorSelector.style.cursor = "";

    if (this.userPlan === "free") {
      this.imageTemplateSelector.value = "default";
      Array.from(this.imageTemplateSelector.options).forEach((option) => {
        if (option.value !== "default") option.disabled = true;
      });
      this.imageTemplateSelector.title = "Upgrade to use more templates.";
      this.imageTemplateSelector.style.cursor = "not-allowed";

      this.fontFamilySelector.disabled = true;
      this.fontFamilySelector.title = "Upgrade to change fonts.";
      this.fontFamilySelector.style.cursor = "not-allowed";

      this.imageColorSelector.disabled = true;
      this.imageColorSelector.title = "Upgrade to change colors.";
      this.imageColorSelector.style.cursor = "not-allowed";

      this.backgroundColorSelector.disabled = true;
      this.backgroundColorSelector.title = "Upgrade to change background.";
      this.backgroundColorSelector.style.cursor = "not-allowed";
    } else if (this.userPlan === "classic") {
      this.backgroundColorSelector.disabled = true;
      this.backgroundColorSelector.title =
        "Upgrade to Pro to change background.";
      this.backgroundColorSelector.style.cursor = "not-allowed";
    } else if (this.userPlan === "pro") {
      // All enabled, nothing to do
    }
  }

  private async handleReferralCheck() {
    const referralCode = getReferralCode();
    if (!referralCode) {
      return;
    }

    const maxRetries = 3;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const { error } = await this.supabase.functions.invoke(
          "link-referral",
          {
            body: { referral_code: referralCode },
          },
        );

        if (error && error.message.includes("Invalid user")) {
          throw new Error("Invalid user session, retrying...");
        }

        if (error) {
          console.error("Error linking referral:", error);
          break;
        }

        break;
      } catch (e) {
        console.warn(`Attempt ${i + 1} failed:`, e.message);
        if (i < maxRetries - 1) {
          await new Promise((res) => setTimeout(res, retryDelay));
        } else {
          console.error("All retry attempts failed for linking referral.");
        }
      }
    }

    removeReferralCode();
  }

  private updateGenerateImageButtonState() {
    if (!this.generateImageBtn) {
      return;
    }

    const instagramCheckbox = document.querySelector<HTMLInputElement>(
      '.network-select-checkbox[value="instagram"]',
    );
    const isFreePlan = this.userPlan === "free";

    if (isFreePlan) {
      // If there's no checkbox, we assume it's not checked.
      const isInstagramChecked = instagramCheckbox
        ? instagramCheckbox.checked
        : false;
      // The button should be of type HTMLButtonElement to have a disabled property.
      (this.generateImageBtn as HTMLButtonElement).disabled = !isInstagramChecked;

      if (!isInstagramChecked) {
        this.generateImageBtn.title =
          "Enable the Instagram network to generate an image on the free plan.";
      } else {
        this.generateImageBtn.title = "";
      }
    } else {
      (this.generateImageBtn as HTMLButtonElement).disabled = false;
      this.generateImageBtn.title = "";
    }
  }

  private async refreshPulseCountFromServer() {
    if (!this.userId) return;

    const { data, error } = await this.supabase
      .from("profiles")
      .select(
        "monthly_pulses_remaining, weekly_transcriptions_remaining",
      )
      .eq("id", this.userId)
      .single();

    if (error) {
      console.error("Failed to refresh pulse count:", error);
      return;
    }

    this.updatePulseDisplay(data.monthly_pulses_remaining);
    this.updateTranscriptionCountDisplay(data.weekly_transcriptions_remaining);
  }

  private async loadUserData() {
    if (!this.userId) return;

    const { data: profile, error: profileError } = await this.supabase
      .from("profiles")
      .select(
        "*, monthly_pulses_remaining, weekly_transcriptions_remaining, plan_type, default_linkedin_chars, default_twitter_chars, default_instagram_chars, default_threads_chars, default_facebook_chars, default_discord_chars, default_telegram_chars, prefers_twitter_premium, prefers_telegram_media_limit",
      )
      .eq("id", this.userId)
      .single<IProfile>();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      if (this.pulseCountDisplay) this.pulseCountDisplay.innerText = "Error";
      if (this.planDisplay) this.planDisplay.innerText = "Error";
      return;
    }

    this.userProfile = profile;
    this.currentPulseCount = profile.monthly_pulses_remaining;
    this.userPlan = (profile.plan_type || "free").replace(/'/g, "");
    this.updatePulseDisplay(this.currentPulseCount);
    this.updateTranscriptionCountDisplay(profile.weekly_transcriptions_remaining);
    if (this.planDisplay)
      this.planDisplay.innerText = this.userPlan.toUpperCase();

    const { data: connections, error: connectionsError } = await this.supabase
      .from("social_connections")
      .select("provider, provider_user_id, provider_user_name")
      .eq("user_id", this.userId)
      .in("provider", ["telegram", "discord", "facebook"]);

    if (connectionsError) {
      console.error("Error fetching app connections:", connectionsError);
    } else {
      this.telegramConnections = connections.filter(
        (c) => c.provider === "telegram",
      );
      this.discordConnections = connections.filter(
        (c) => c.provider === "discord",
      );
      this.facebookPages = connections.filter((c) => c.provider === "facebook");
    }

    if (this.linkedinCharCountInput && profile.default_linkedin_chars)
      this.linkedinCharCountInput.value = String(
        profile.default_linkedin_chars,
      );
    if (this.twitterCharCountInput && profile.default_twitter_chars) {
      this.twitterCharCountInput.value = String(profile.default_twitter_chars);
    }
    if (this.instagramCharCountInput && profile.default_instagram_chars)
      this.instagramCharCountInput.value = String(
        profile.default_instagram_chars,
      );
    if (this.threadsCharCountInput && profile.default_threads_chars)
      this.threadsCharCountInput.value = String(profile.default_threads_chars);
    if (this.facebookCharCountInput && profile.default_facebook_chars)
      this.facebookCharCountInput.value = String(
        profile.default_facebook_chars,
      );
    const discordCharCountInput = document.getElementById(
      "discord-char-count",
    ) as HTMLInputElement;
    if (discordCharCountInput && profile.default_discord_chars)
      discordCharCountInput.value = String(profile.default_discord_chars);

    const telegramCharCountInput = document.getElementById(
      "telegram-char-count",
    ) as HTMLInputElement;
    if (telegramCharCountInput && profile.default_telegram_chars)
      telegramCharCountInput.value = String(profile.default_telegram_chars);
  }

  private updateUIAccess(plan: string) {
    const imageFeatures = document.querySelectorAll(".image-feature");
    const videoFeatures = document.querySelectorAll(".video-feature");
    const canUploadImage = plan === "basic" || plan === "pro";
    const canUploadVideo = plan === "pro";
    imageFeatures.forEach((el) =>
      el.classList.toggle("hidden", !canUploadImage),
    );
    videoFeatures.forEach((el) =>
      el.classList.toggle("hidden", !canUploadVideo),
    );
  }

  public updatePulseDisplay(count: number) {
    if (this.pulseCountDisplay) {
      this.pulseCountDisplay.innerText = count === -1 ? "∞" : count.toString();
    }
    this.currentPulseCount = count;
  }

  public updateTranscriptionCountDisplay(count: number) {
    if (this.transcriptionCountDisplay) {
      this.transcriptionCountDisplay.innerText = count.toString();
    }
  }

  private handleTelegramDestinationSelect() {
    this.showDestinationSelectionModal("telegram");
  }

  private handleDiscordDestinationSelect() {
    this.showDestinationSelectionModal("discord");
  }

  private handleClearSelection(network: "telegram" | "discord") {
    if (network === "telegram") {
      this.selectedTelegramConnections = [];
    } else {
      this.selectedDiscordConnections = [];
    }

    const card = document.querySelector(`[data-network="${network}"]`);
    if (!card) return;

    const selectBtn = card.querySelector(`#${network}-destination-select-btn`);
    const multiPublishUI = card.querySelector(`#${network}-multi-publish-ui`);

    selectBtn?.classList.remove("hidden");
    multiPublishUI?.classList.add("hidden");
  }

  private showDestinationSelectionModal(network: "telegram" | "discord") {
    const connections =
      network === "telegram"
        ? this.telegramConnections
        : this.discordConnections;
    const selectedConnections =
      network === "telegram"
        ? this.selectedTelegramConnections
        : this.selectedDiscordConnections;
    const networkName = network.charAt(0).toUpperCase() + network.slice(1);

    if (!connections || connections.length === 0) {
      showModal(
        `// No ${networkName} Destinations Found`,
        `<p>No ${networkName} destinations are configured. Please add one in the <a href="/app/connections" class="text-primary underline">Connections</a> page.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    const optionsHTML = connections
      .map(
        (conn) => `
      <label class="block border-b border-border/20 p-4 hover:bg-border/50 cursor-pointer">
        <input type="checkbox" name="${network}-destination" value="${conn.provider_user_id}" class="mr-2 accent-primary" ${selectedConnections.includes(conn.provider_user_id) ? "checked" : ""}>
        ${conn.provider_user_name}
      </label>
    `,
      )
      .join("");

    const modalBody = `<div class="max-h-60 overflow-y-auto">${optionsHTML}</div>`;
    const modalFooter = `
      <button data-modal-close class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
      <button id="confirm-${network}-dest-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm</button>
    `;

    showModal(
      `// Select ${networkName} Destination(s)`,
      modalBody,
      modalFooter,
    );

    document
      .getElementById(`confirm-${network}-dest-btn`)
      ?.addEventListener("click", () => {
        const checkedBoxes = document.querySelectorAll<HTMLInputElement>(
          `input[name="${network}-destination"]:checked`,
        );
        const selectedIds = Array.from(checkedBoxes).map((cb) => cb.value);

        if (network === "telegram") {
          this.selectedTelegramConnections = selectedIds;
        } else {
          this.selectedDiscordConnections = selectedIds;
        }

        const card = document.querySelector(`[data-network="${network}"]`);
        if (!card) return;

        const selectBtn = card.querySelector(
          `#${network}-destination-select-btn`,
        );
        const multiPublishUI = card.querySelector(
          `#${network}-multi-publish-ui`,
        );
        const publishBtn = multiPublishUI?.querySelector(".publish-btn");

        if (selectBtn && multiPublishUI && publishBtn) {
          selectBtn.classList.add("hidden");
          multiPublishUI.classList.remove("hidden");
          publishBtn.textContent = `Post to ${selectedIds.length} destination(s)`;
        }

        hideModal();
      });
  }

  private async handleFacebookPageSelect() {
    const pages = this.facebookPages;

    if (!pages || pages.length === 0) {
      showModal(
        "// No Pages Found",
        `<p>No Facebook pages are connected. Please connect your Facebook account in the <a href="/app/connections" class="text-primary underline">Connections</a> page.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    if (pages.length === 1) {
      this.selectedFacebookPage = {
        id: pages[0].provider_user_id,
        name: pages[0].provider_user_name,
      };
      const pageNameDisplay = document.getElementById("facebook-selected-page");
      if (pageNameDisplay) {
        pageNameDisplay.textContent = `Page: ${this.selectedFacebookPage.name}`;
      }
      showModal(
        "// Page Selected",
        `<p>Automatically selected your only Facebook page: ${this.selectedFacebookPage.name}</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    const pageOptionsHTML = pages
      .map(
        (page) => `
        <label class="block border-b border-border/20 p-4 hover:bg-border/50 cursor-pointer">
            <input type="radio" name="facebook-page" value="${page.provider_user_id}" class="mr-2 accent-primary" ${this.selectedFacebookPage?.id === page.provider_user_id ? "checked" : ""}>
            ${page.provider_user_name}
        </label>
    `,
      )
      .join("");

    const modalBody = `<div class="max-h-60 overflow-y-auto">${pageOptionsHTML}</div>`;
    const modalFooter = `
        <button data-modal-close class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
        <button id="confirm-fb-page-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Select</button>
    `;

    showModal("// Select a Facebook Page", modalBody, modalFooter);

    document
      .getElementById("confirm-fb-page-btn")
      ?.addEventListener("click", () => {
        const selectedRadio = document.querySelector<HTMLInputElement>(
          'input[name="facebook-page"]:checked',
        );
        if (selectedRadio) {
          const pageId = selectedRadio.value;
          const pageName =
            pages.find((p) => p.provider_user_id === pageId)
              ?.provider_user_name || "Unknown Page";
          this.selectedFacebookPage = { id: pageId, name: pageName };

          const pageNameDisplay = document.getElementById(
            "facebook-selected-page",
          );
          if (pageNameDisplay) {
            pageNameDisplay.textContent = `Page: ${pageName}`;
          }
          hideModal();
        }
      });
  }

  public clearContentOutput() {
    if (this.outputArea) {
      this.outputArea.innerHTML = "";
    }
    removeTempPost();
  }

  private async handleGenerateQuoteImage() {
    this._saveSourceInputsToStorage();
    if (!this.userId || !this.userProfile) {
      showModal("// Error", "<p>Please log in to generate images.</p>");
      return;
    }

    let sourceText = "";
    const urlInputContainer = document.getElementById("url-input-container");
    const textInputContainer = document.getElementById("text-input-container");

    if (
      urlInputContainer &&
      !urlInputContainer.classList.contains("hidden") &&
      this.urlInput?.value
    ) {
      sourceText = this.urlInput.value;
    } else if (
      textInputContainer &&
      !textInputContainer.classList.contains("hidden") &&
      this.rawTextInput?.value
    ) {
      sourceText = this.rawTextInput.value;
    }

    if (!sourceText) {
      showModal(
        "// Warning",
        "<p>Please provide an article URL or paste text to generate an image.</p>",
      );
      return;
    }

    const templateId = this.imageTemplateSelector?.value || "default";
    const color = this.imageColorSelector?.value || "#7c3aed";
    const fontFamily =
      this.fontFamilySelector?.value || "'Poppins', sans-serif";
    const backgroundColor = this.backgroundColorSelector?.value || "#1a1a1a";

    showModal(
      "// Generating Image...",
      "<p>Please wait while the AI extracts a quote and generates your image.</p><div class='loading-spinner'></div>",
      "",
    );
    this.generateImageBtn?.setAttribute("disabled", "true");

    try {
      let rawTextForAI = this.rawTextInput?.value || "";
      if (!rawTextForAI && this.urlInput?.value.startsWith("http")) {
        showModal(
          "// Extracting Content...",
          "<p>Please wait while we extract content from the URL.</p><div class='loading-spinner'></div>",
          "",
        );
        const { data: extractionData, error: extractionError } =
          await this.supabase.functions.invoke("get-source-text", {
            body: { url: this.urlInput.value },
          });

        if (extractionError) {
          throw new Error(extractionError.message);
        }
        if (extractionData.status === "error") {
          throw new Error(extractionData.error);
        }
        rawTextForAI = extractionData.cleanedText;
        if (this.rawTextInput) {
          this.rawTextInput.value = rawTextForAI;
        }
      } else if (!rawTextForAI) {
        throw new Error("No text content available to generate a quote from.");
      }

      showModal(
        "// Generating Image...",
        "<p>Extracting quote and creating image. This may take a moment.</p><div class='loading-spinner'></div>",
        "",
      );

      const { data, error } = await this.supabase.functions.invoke(
        "generate-image-from-text",
        {
          body: {
            rawText: rawTextForAI,
            userId: this.userId,
            templateId: templateId,
            color: color,
            fontFamily: fontFamily,
            backgroundColor: backgroundColor,
          },
        },
      );

      if (error) throw new Error(error.message);
      if (data.status === "error") throw new Error(data.error);

      const existingData = getTempPost<ITempPost>() || {};
      const tempPost: ITempPost = { ...existingData };
      tempPost.generatedImageUrl = data.publicUrl;
      saveTempPost(tempPost);
      this._renderOutputArea(tempPost);

      this.refreshPulseCountFromServer();
      hideModal();
    } catch (err) {
      console.error("Error generating quote image:", err);
      showModal(
        "// Error",
        `<p>Failed to generate image: ${err.message || "Unknown error"}</p>`,
      );
    } finally {
      this.generateImageBtn?.removeAttribute("disabled");
    }
  }

  private _displayGeneratedImageCard(
    imageUrl: string,
    generatedContent: IGeneratedContent | undefined,
  ) {
    if (!this.outputArea || !this.mediaManager) return;

    const activeNetworks = generatedContent
      ? (Object.keys(generatedContent) as TNetwork[])
      : [];

    let attachmentButtonsHTML = "";
    const imageSupportingNetworks: TNetwork[] = [
      "instagram",
      "facebook",
      "linkedin",
      "twitter",
      "threads",
      "discord",
      "telegram",
    ];

    activeNetworks.forEach((network) => {
      const isNetworkImageCapable = imageSupportingNetworks.includes(network);
      let isPlanAllowed = false;

      if (
        this.userPlan === "pro" ||
        this.userPlan === "classic" ||
        this.userPlan === "basic"
      ) {
        isPlanAllowed = true;
      } else if (this.userPlan === "free" && network === "instagram") {
        isPlanAllowed = true;
      }

      if (isNetworkImageCapable && isPlanAllowed) {
        attachmentButtonsHTML += `<button data-attach-network="${network}" class="attach-image-btn border border-foreground/50 px-4 py-2 font-mono text-sm uppercase hover:bg-foreground/10">${network}</button>`;
      }
    });

    if (attachmentButtonsHTML === "") {
      attachmentButtonsHTML =
        "<p class='text-foreground/70 text-sm'>// No active post cards support images on your current plan.</p>";
    }

    const imageCardContainer = document.createElement("div");
    imageCardContainer.id = "generated-image-container";
    imageCardContainer.className =
      "mt-6 border border-border bg-background-light p-6 rounded-lg shadow-lg";

    const imageCardHTML = `
      <h3 class="text-xl font-bold uppercase mb-4 text-primary">// Generated Image</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="relative w-full h-80 bg-gray-900 flex items-center justify-center overflow-hidden rounded-md">
          <img src="${imageUrl}" alt="Generated Quote Image" class="max-w-full max-h-full object-contain" />
        </div>
        <div>
          <p class="mb-2 font-mono text-sm text-foreground/70">// Attach to post:</p>
          <div id="image-attachment-buttons" class="flex flex-wrap gap-2 mb-6">
            ${attachmentButtonsHTML}
          </div>
          <p class="mb-2 font-mono text-sm text-foreground/70">// Actions:</p>
          <div class="flex flex-wrap gap-2">
            <a href="${imageUrl}" download="postpulsar-quote-image.png" class="download-image-btn border border-secondary px-4 py-2 font-mono text-sm uppercase text-secondary/80 hover:bg-secondary/10" target="_blank">Download</a>
            <button class="copy-image-url-btn border border-foreground/50 px-4 py-2 font-mono text-sm uppercase hover:bg-foreground/10" data-image-url="${imageUrl}">Copy URL</button>
          </div>
        </div>
      </div>
    `;

    imageCardContainer.innerHTML = imageCardHTML;

    this.outputArea.prepend(imageCardContainer);

    const attachmentButtons = imageCardContainer.querySelector(
      "#image-attachment-buttons",
    );
    attachmentButtons?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.matches(".attach-image-btn")) {
        const network = target.dataset.attachNetwork as TNetwork;
        if (network && this.mediaManager) {
          this.mediaManager.attachGeneratedImage(network, imageUrl);
          target.textContent = "✓ Attached";
          target.setAttribute("disabled", "true");
          target.classList.add("bg-green-500/20", "text-green-300");
        }
      }
    });

    const copyButton = imageCardContainer.querySelector(".copy-image-url-btn");
    copyButton?.addEventListener("click", async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const urlToCopy = btn.dataset.imageUrl;
      if (urlToCopy) {
        await navigator.clipboard.writeText(urlToCopy);
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = originalText), 2000);
      }
    });
  }

  private _displayGeneratedContent(content: IGeneratedContent) {
    if (!this.outputArea) return;

    let cardsHTML = "";
    const networkOrder: TNetwork[] = [
      "linkedin",
      "twitter",
      "instagram",
      "threads",
      "facebook",
      "telegram",
      "discord",
    ];

    for (const network of networkOrder) {
      if (content[network]) {
        let connections: IPage[] = [];
        if (network === "telegram") {
          connections = this.telegramConnections;
        } else if (network === "discord") {
          connections = this.discordConnections;
        }

        cardsHTML += createSocialPostCard(
          network,
          content[network],
          this.userPlan,
          connections,
        );
      }
    }

    const contentContainer = document.createElement("div");
    contentContainer.id = "text-content-container"; // Add ID for easy removal
    contentContainer.innerHTML = `
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold uppercase">// Transmission Received</h2>
        <button
          id="publish-all-btn"
          class="border border-primary bg-primary px-6 py-3 font-mono text-base font-bold uppercase text-background transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-gray-500"
        >
          Publish All &gt;&gt;
        </button>
      </div>
      <div class="mt-4 space-y-6">
        ${cardsHTML}
      </div>
    `;

    this.outputArea.appendChild(contentContainer);

    if (this.userProfile) {
      this.eventManager?.synchronizeUIWithState(this.userProfile);
    }

    const textareas: NodeListOf<HTMLTextAreaElement> =
      this.outputArea.querySelectorAll('textarea[id$="-textarea"]');
    textareas.forEach((textarea) => {
      this.eventManager?.handleCharCount({
        target: textarea,
      } as unknown as Event);
    });

    this.updateUIAccess(this.userPlan);
    this.updateGenerateImageButtonState();
  }
}
