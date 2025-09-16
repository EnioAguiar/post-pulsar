import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";
import { createSocialPostCard } from "./SocialPostCard";
import { PromptManager } from "./PromptManager";
import { MediaManager } from "./MediaManager";
import { DashboardEventManager } from "./DashboardEventManager";
import { PublicationManager } from "./PublicationManager";

// Type Definitions
interface IProfile {
  monthly_pulses_remaining: number;
  plan_type: string;
  default_linkedin_chars?: number;
  default_twitter_chars?: number;
  default_instagram_chars?: number;
  default_threads_chars?: number;
  default_facebook_chars?: number;
  default_pinterest_chars?: number;
}

interface IGeneratedContent {
  [key: string]: string;
}

interface IPage {
  provider_user_id: string;
  provider_user_name: string;
}

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "pinterest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TInvokeBody = { [key: string]: any };

const TEMP_POST_KEY = "temp_post_pulsar";
const REOPEN_POST_KEY = "reopen_from_history";

export class DashboardManager {
  private supabase: SupabaseClient;
  private pulseCountDisplay: HTMLElement | null;
  private planDisplay: HTMLElement | null;
  private pulsarForm: HTMLElement | null;
  private outputArea: HTMLElement | null;
  private urlInput: HTMLInputElement | null;
  private contentLanguageInput: HTMLSelectElement | null;
  private hashtagLanguageInput: HTMLSelectElement | null;
  private submitButton: HTMLButtonElement | null;
  private linkedinCharCountInput: HTMLInputElement | null;
  private twitterCharCountInput: HTMLInputElement | null;
  private instagramCharCountInput: HTMLInputElement | null;
  private threadsCharCountInput: HTMLInputElement | null;
  private facebookCharCountInput: HTMLInputElement | null;
  private pinterestCharCountInput: HTMLInputElement | null;
  private promptSelector: HTMLSelectElement | null;
  private networkCheckboxes: NodeListOf<HTMLInputElement> | null;

  private promptManager: PromptManager | null = null;
  private mediaManager: MediaManager | null = null;
  private eventManager: DashboardEventManager | null = null;
  private publicationManager: PublicationManager | null = null;

  private currentPulseCount = 0;
  private userId: string | null = null;
  private userPlan = "free";

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.initializeDOMElements();
  }

  private initializeDOMElements() {
    this.pulseCountDisplay = document.getElementById("pulse-count-display");
    this.planDisplay = document.getElementById("plan-display");
    this.pulsarForm = document.getElementById("pulsar-form");
    this.outputArea = document.getElementById("content-output");
    this.urlInput = document.getElementById("post-url") as HTMLInputElement;
    this.contentLanguageInput = document.getElementById(
      "content-language",
    ) as HTMLSelectElement;
    this.hashtagLanguageInput = document.getElementById(
      "hashtag-language",
    ) as HTMLSelectElement;
    this.submitButton = this.pulsarForm?.querySelector(
      "button[type='submit']",
    ) as HTMLButtonElement;
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
    this.promptSelector = document.getElementById(
      "prompt-selector",
    ) as HTMLSelectElement;
    this.networkCheckboxes = document.querySelectorAll(
      ".network-select-checkbox",
    ) as NodeListOf<HTMLInputElement>;
  }

  public async init() {
    if (!this.pulsarForm || !this.outputArea || !this.submitButton) return;

    this.pulsarForm.addEventListener(
      "submit",
      this.handlePulsarSubmit.bind(this),
    );

    await this.loadUserData();

    if (this.userId && this.userPlan) {
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
        (count) => this.updatePulseDisplay(count),
      );
      this.publicationManager.init();

      this.eventManager = new DashboardEventManager(
        this.supabase,
        this.publicationManager,
      );
      this.eventManager.init();
    }
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
        "monthly_pulses_remaining, plan_type, default_linkedin_chars, default_twitter_chars, default_instagram_chars, default_threads_chars, default_facebook_chars, default_pinterest_chars",
      )
      .eq("id", this.userId)
      .single<IProfile>();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      if (this.pulseCountDisplay) this.pulseCountDisplay.innerText = "Error";
      if (this.planDisplay) this.planDisplay.innerText = "Error";
      return;
    }

    this.currentPulseCount = profile.monthly_pulses_remaining;
    this.userPlan = (profile.plan_type || "free").replace(/'/g, "");
    this.updatePulseDisplay(this.currentPulseCount);
    if (this.planDisplay)
      this.planDisplay.innerText = this.userPlan.toUpperCase();

    // Set character count preferences from profile
    if (this.linkedinCharCountInput && profile.default_linkedin_chars)
      this.linkedinCharCountInput.value = String(
        profile.default_linkedin_chars,
      );
    if (this.twitterCharCountInput && profile.default_twitter_chars) {
      this.twitterCharCountInput.value = String(profile.default_twitter_chars);
      const twitterPremiumCheck = document.getElementById(
        "twitter-premium-check",
      ) as HTMLInputElement;
      if (twitterPremiumCheck && profile.default_twitter_chars > 280) {
        twitterPremiumCheck.checked = true;
        this.eventManager?.handleTwitterPremiumToggle();
      }
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
    if (this.pinterestCharCountInput && profile.default_pinterest_chars)
      this.pinterestCharCountInput.value = String(
        profile.default_pinterest_chars,
      );

    // --- Content Loading Logic ---
    // Priority 1: Check for a post to reopen from history.
    const reopenData = localStorage.getItem(REOPEN_POST_KEY);
    if (reopenData) {
      try {
        const { generatedContent, sourceUrl, mediaUrls } = JSON.parse(reopenData);
        if (this.urlInput) this.urlInput.value = sourceUrl;
        this.displayGeneratedContent(generatedContent);
        if (this.mediaManager && mediaUrls) {
          this.mediaManager.preloadMedia(mediaUrls);
        }
      } catch (e) {
        console.error("Failed to parse reopen data:", e);
      } finally {
        localStorage.removeItem(REOPEN_POST_KEY); // Clear after attempting to load
      }
      return; // Stop further loading
    }

    // Priority 2: Check for a temporary post from the same session.
    const storedData = localStorage.getItem(TEMP_POST_KEY);
    if (storedData) {
      try {
        const { generatedContent, sourceUrl } = JSON.parse(storedData);
        if (this.urlInput) {
          this.urlInput.value = sourceUrl;
        }
        this.displayGeneratedContent(generatedContent);
      } catch (e) {
        console.error("Failed to parse temporary post data:", e);
        localStorage.removeItem(TEMP_POST_KEY);
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

  private async handlePulsarSubmit(e: Event) {
    e.preventDefault();
    this.mediaManager?.clearSelectedMedia();
    if (
      !this.submitButton ||
      !this.outputArea ||
      !this.urlInput ||
      !this.networkCheckboxes
    )
      return;

    this.submitButton.setAttribute("disabled", "true");
    this.submitButton.innerHTML = "PULSING...";

    const pulsingMessages = [
      "Transmitting signal...",
      "Analyzing article...",
      "Engaging AI model...",
      "Calibrating social matrix...",
      "Generating content...",
      "Finalizing transmission...",
    ];
    let messageIndex = 0;

    this.outputArea.innerHTML = `<div class="border border-dashed border-border p-8 text-center"><p class="font-mono text-foreground/70">[PULSING] :: ${pulsingMessages[0]}</p></div>`;
    const loadingIndicator = this.outputArea.querySelector("p");

    const pulsingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % pulsingMessages.length;
      if (loadingIndicator)
        loadingIndicator.textContent = `[PULSING] :: ${pulsingMessages[messageIndex]}`;
    }, 2500);

    try {
      const targetNetworks = Array.from(this.networkCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

      if (targetNetworks.length === 0) {
        alert("Please select at least one target network.");
        this.submitButton.removeAttribute("disabled");
        this.submitButton.innerHTML = "Pulsar &gt;&gt;";
        clearInterval(pulsingInterval);
        if (this.outputArea) this.outputArea.innerHTML = "";
        return;
      }

      const bodyPayload: TInvokeBody = {
        url: this.urlInput.value,
        contentLanguage: this.contentLanguageInput?.value,
        hashtagLanguage: this.hashtagLanguageInput?.value,
        targetNetworks: targetNetworks,
      };

      if (this.promptSelector && this.promptSelector.value) {
        bodyPayload.promptText = this.promptSelector.value;
      }

      if (this.linkedinCharCountInput?.value)
        bodyPayload.linkedInCharCount = parseInt(
          this.linkedinCharCountInput.value,
          10,
        );
      if (this.twitterCharCountInput?.value)
        bodyPayload.twitterCharCount = parseInt(
          this.twitterCharCountInput.value,
          10,
        );
      if (this.instagramCharCountInput?.value)
        bodyPayload.instagramCharCount = parseInt(
          this.instagramCharCountInput.value,
          10,
        );
      if (this.threadsCharCountInput?.value)
        bodyPayload.threadsCharCount = parseInt(
          this.threadsCharCountInput.value,
          10,
        );
      if (this.facebookCharCountInput?.value)
        bodyPayload.facebookCharCount = parseInt(
          this.facebookCharCountInput.value,
          10,
        );
      if (this.pinterestCharCountInput?.value)
        bodyPayload.pinterestCharCount = parseInt(
          this.pinterestCharCountInput.value,
          10,
        );

      const { data, error } = await this.supabase.functions.invoke(
        "pulsar-v1",
        { body: bodyPayload },
      );

      if (error) {
        throw new Error(`Network or function error: ${error.message}`);
      }

      if (data.status === "error") {
        if (data.errorCode === "HISTORY_LIMIT_REACHED") {
          const body = `<p class="text-foreground/80">${data.error}</p>`;
          const footer = `<button id="close-limit-modal-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Close</button>
                          <a href="/app/history" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Manage History</a>`;
          showModal("// Post History Full", body, footer);
          document
            .getElementById("close-limit-modal-btn")
            ?.addEventListener("click", hideModal);
          if (this.outputArea) this.outputArea.innerHTML = "";
        } else {
          const errorTitle =
            data.errorCode === "AI_RATE_LIMIT_EXCEEDED"
              ? "[AI RATE LIMIT]"
              : "[ERROR]";
          if (this.outputArea)
            this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">${errorTitle}</p><p class="font-mono text-foreground/70 mt-2">${data.error}</p></div>`;
        }
        return;
      }

      if (data.status === "success") {
        this.currentPulseCount -= targetNetworks.length;
        this.updatePulseDisplay(this.currentPulseCount);
        const { generatedContent } = data;

        // Save to localStorage for persistence on refresh
        const dataToStore = {
          generatedContent,
          sourceUrl: this.urlInput.value,
        };
        localStorage.setItem(TEMP_POST_KEY, JSON.stringify(dataToStore));

        this.displayGeneratedContent(generatedContent);
      }
    } catch (err) {
      const error = err as { message: string };
      if (this.outputArea)
        this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">[CRITICAL ERROR]</p><p class="font-mono text-foreground/70 mt-2">${error.message}</p></div>`;
    } finally {
      clearInterval(pulsingInterval);
      if (this.submitButton) {
        this.submitButton.removeAttribute("disabled");
        this.submitButton.innerHTML = "Pulsar &gt;&gt;";
      }
    }
  }

  private async loadFacebookPages() {
    const { data, error } = await this.supabase
      .from("social_connections")
      .select("provider_user_id, provider_user_name")
      .eq("provider", "facebook");
    if (error) {
      console.error("Error fetching Facebook pages:", error);
      return;
    }
    if (data && data.length > 1) {
      const container = document.querySelector(
        ".facebook-page-selector-container",
      );
      if (!container) return;
      const options = (data as IPage[])
        .map(
          (page) =>
            `<option value="${page.provider_user_id}">${page.provider_user_name}</option>`,
        )
        .join("");
      container.innerHTML = `
        <select id="facebook-page-selector" class="w-full rounded-none border border-border bg-background p-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-0">
          <option value="" disabled selected>Select a Page...</option>
          ${options}
        </select>
      `;
    }
  }

  private displayGeneratedContent(content: IGeneratedContent) {
    if (!this.outputArea) return;

    const networks: TNetwork[] = [
      "linkedin",
      "twitter",
      "instagram",
      "threads",
      "facebook",
      "pinterest",
    ];
    let cardsHTML = "";

    for (const network of networks) {
      if (content[network]) {
        cardsHTML += createSocialPostCard(
          network,
          content[network],
          this.userPlan,
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

    const twitterTextArea = document.getElementById(
      "twitter-textarea",
    ) as HTMLTextAreaElement;
    const threadsTextArea = document.getElementById(
      "threads-textarea",
    ) as HTMLTextAreaElement;
    this.eventManager?.handleTwitterPremiumToggle(); // To set initial state
    if (twitterTextArea)
      this.eventManager?.handleCharCount({
        target: twitterTextArea,
      } as unknown as Event);
    if (threadsTextArea)
      this.eventManager?.handleCharCount({
        target: threadsTextArea,
      } as unknown as Event);

    this.loadFacebookPages();
    this.updateUIAccess(this.userPlan);

    // The event listener for 'publish-all-btn' is now handled by PublicationManager
  }
}
