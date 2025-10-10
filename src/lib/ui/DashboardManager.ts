import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";
import { createSocialPostCard } from "./SocialPostCard";
import { PromptManager } from "./PromptManager";
import { MediaManager } from "./MediaManager";
import { DashboardEventManager } from "./DashboardEventManager";
import { PublicationManager } from "./PublicationManager";
import { PulsarFormManager } from "./PulsarFormManager";

// Type Definitions
interface IProfile {
  monthly_pulses_remaining: number;
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
}

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "telegram"
  | "discord";

const REOPEN_POST_KEY = "reopen_from_history";

export class DashboardManager {
  private supabase: SupabaseClient;
  private pulseCountDisplay: HTMLElement | null;
  private planDisplay: HTMLElement | null;
  private pulsarForm: HTMLElement | null;
  private outputArea: HTMLElement | null;
  private urlInput: HTMLInputElement | null;
  private rawTextInput: HTMLTextAreaElement | null;
  private linkedinCharCountInput: HTMLInputElement | null;
  private twitterCharCountInput: HTMLInputElement | null;
  private instagramCharCountInput: HTMLInputElement | null;
  private threadsCharCountInput: HTMLInputElement | null;
  private facebookCharCountInput: HTMLInputElement | null;

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
  public selectedTelegramConnections: string[] = [];
  public selectedDiscordConnections: string[] = [];

  private reopenPayload: IReopenPayload | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.pulseCountDisplay = document.getElementById("pulse-count-display");
    this.planDisplay = document.getElementById("plan-display");
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
  }

  public isTwitterPremium(): boolean {
    return this.eventManager?.isTwitterPremium() || false;
  }

  public isTelegramMedia(): boolean {
    return this.eventManager?.isTelegramMedia() || false;
  }

  public async init() {
    if (!this.pulsarForm || !this.outputArea) return;

    this.outputArea.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "facebook-page-select-btn") {
        this.handleFacebookPageSelect();
      }
      if (target.id === "telegram-destination-select-btn") {
        this.handleTelegramDestinationSelect();
      }
      if (target.id === "discord-destination-select-btn") {
        this.handleDiscordDestinationSelect();
      }
      if (target.classList.contains("clear-selection-btn")) {
        const network = target.dataset.network as "telegram" | "discord";
        this.handleClearSelection(network);
      }
    });

    await this.loadUserData();

    if (this.userId && this.userPlan && this.userProfile) {
      this.promptManager = new PromptManager(
        this.supabase,
        this.userId,
        this.userPlan,
      );
      this.promptManager.init();

      this.mediaManager = new MediaManager(
        this.supabase,
        this.userId,
        this.userPlan,
      );
      this.mediaManager.init();

      this.publicationManager = new PublicationManager(
        this.supabase,
        this.userId,
        this.mediaManager,
        this,
        (count) => this.updatePulseDisplay(count),
      );
      this.publicationManager.init();

      this.eventManager = new DashboardEventManager(
        this.supabase,
        this.publicationManager,
        this,
      );
      this.eventManager.init();
      this.eventManager.synchronizeUIWithState(this.userProfile);

      this.pulsarFormManager = new PulsarFormManager(
        this.supabase,
        this.pulsarForm,
        {
          onPulseUpdate: (spent) => {
            this.currentPulseCount -= spent;
            this.updatePulseDisplay(this.currentPulseCount);
          },
          displayGeneratedContent: (content) =>
            this.displayGeneratedContent(content),
          mediaManagerClear: () => this.mediaManager?.clearSelectedMedia(),
        },
      );
      this.pulsarFormManager.init();
    }

    if (
      this.mediaManager &&
      this.reopenPayload &&
      this.reopenPayload.mediaMap
    ) {
      this.mediaManager.preloadMedia(this.reopenPayload.mediaMap);
      this.reopenPayload = null;
    }

    // Handle referral code after everything is initialized
    this.handleReferralCheck();
  }

  private async handleReferralCheck() {
    const referralCode = localStorage.getItem("referral_code");
    if (!referralCode) {
      return; // No code, do nothing
    }

    console.log(`Found referral code: ${referralCode}. Attempting to link user...`);

    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
      try {
        const { error } = await this.supabase.functions.invoke("link-referral", {
          body: { referral_code: referralCode },
        });

        if (error && error.message.includes("Invalid user")) {
          throw new Error("Invalid user session, retrying...");
        }

        if (error) {
          // For other errors, don't retry, just log it.
          console.error("Error linking referral:", error);
          break; // Exit loop
        }

        console.log("Referral link successful.");
        break; // Success, exit loop
      } catch (e) {
        console.warn(`Attempt ${i + 1} failed:`, e.message);
        if (i < maxRetries - 1) {
          await new Promise(res => setTimeout(res, retryDelay));
        } else {
          console.error("All retry attempts failed for linking referral.");
        }
      }
    }

    // Clean up the code regardless of final success or failure
    localStorage.removeItem("referral_code");
    console.log("Referral code removed from localStorage.");
  }

  private async loadUserData() {
    const {
      data: { session },
      error: sessionError,
    } = await this.supabase.auth.getSession();
    if (sessionError || !session) {
      window.location.href = "/login";
      return;
    }
    this.userId = session.user.id;

    const { data: profile, error: profileError } = await this.supabase
      .from("profiles")
      .select(
        "*, monthly_pulses_remaining, plan_type, default_linkedin_chars, default_twitter_chars, default_instagram_chars, default_threads_chars, default_facebook_chars, default_discord_chars, default_telegram_chars, prefers_twitter_premium, prefers_telegram_media_limit",
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
    if (this.planDisplay)
      this.planDisplay.innerText = this.userPlan.toUpperCase();

    // Fetch all app connections (Telegram, Discord)
    const { data: connections, error: connectionsError } = await this.supabase
      .from("social_connections")
      .select("provider, provider_user_id, provider_user_name")
      .eq("user_id", this.userId)
      .in("provider", ["telegram", "discord"]);

    if (connectionsError) {
      console.error("Error fetching app connections:", connectionsError);
    } else {
      this.telegramConnections = connections.filter(
        (c) => c.provider === "telegram",
      );
      this.discordConnections = connections.filter(
        (c) => c.provider === "discord",
      );
      console.log("Loaded Telegram connections:", this.telegramConnections);
      console.log("Loaded Discord connections:", this.discordConnections);
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

    const reopenData = localStorage.getItem(REOPEN_POST_KEY);
    if (reopenData) {
      try {
        const payload: IReopenPayload = JSON.parse(reopenData);
        this.reopenPayload = payload;

        if (this.urlInput && payload.sourceUrl) {
          this.urlInput.value = payload.sourceUrl;
        }
        if (payload.generatedContent) {
          this.displayGeneratedContent(payload.generatedContent);
        }
      } catch (e) {
        console.error("Failed to parse reopen data:", e);
        this.reopenPayload = null;
      } finally {
        localStorage.removeItem(REOPEN_POST_KEY);
      }
      return;
    }

    // Tenta carregar do localStorage por último
    const storedData = localStorage.getItem("temp_post_pulsar");
    if (storedData) {
      try {
        const { generatedContent, sourceUrl, rawText } = JSON.parse(storedData);
        if (sourceUrl && this.urlInput) {
          this.urlInput.value = sourceUrl;
        } else if (rawText && this.rawTextInput) {
          this.rawTextInput.value = rawText;
        }
        this.displayGeneratedContent(generatedContent);
      } catch (e) {
        console.error("Failed to parse temporary post data:", e);
        localStorage.removeItem("temp_post_pulsar");
      }
    } else {
      this.updateUIAccess(this.userPlan);
    }
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
    const { data, error } = await this.supabase
      .from("social_connections")
      .select("provider_user_id, provider_user_name")
      .eq("provider", "facebook");

    if (error) {
      showModal(
        "// Error",
        `<p>Could not load Facebook pages: ${error.message}</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    if (!data || data.length === 0) {
      showModal(
        "// No Pages Found",
        `<p>No Facebook pages are connected. Please connect your Facebook account in the <a href="/app/connections" class="text-primary underline">Connections</a> page.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    const pages = data as IPage[];
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
    localStorage.removeItem("temp_post_pulsar");
    console.log("Dashboard content and localStorage have been cleared.");
  }

  private displayGeneratedContent(content: IGeneratedContent) {
    if (!this.outputArea) return;

    console.log("DEBUG: Displaying content. Current connections:", {
      telegram: this.telegramConnections,
      discord: this.discordConnections,
    });

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

    this.outputArea.innerHTML = `
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

    // Force sync of UI state AFTER cards are in the DOM
    if (this.userProfile) {
      this.eventManager?.synchronizeUIWithState(this.userProfile);
    }

    // Manually trigger a char count for all relevant textareas
    const textareas: NodeListOf<HTMLTextAreaElement> =
      this.outputArea.querySelectorAll('textarea[id$="-textarea"]');
    textareas.forEach((textarea) => {
      this.eventManager?.handleCharCount({
        target: textarea,
      } as unknown as Event);
    });

    this.updateUIAccess(this.userPlan);
  }
}
