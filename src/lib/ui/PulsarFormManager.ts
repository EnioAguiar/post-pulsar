import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";
import { getTempPost, removeTempPost, saveTempPost } from "./storageManager";

// Type Definitions
interface IGeneratedContent {
  [key: string]: string;
}

interface ITempPost {
  sourceUrl?: string;
  rawText?: string;
  generatedContent?: IGeneratedContent;
  generatedImageUrl?: string;
}

interface IInvokeBody {
  contentLanguage?: string;
  hashtagLanguage?: string;
  shouldTruncate?: boolean;
  url?: string;
  rawText?: string;
  promptText?: string;
  linkedInCharCount?: number;
  twitterCharCount?: number;
  instagramCharCount?: number;
  threadsCharCount?: number;
  facebookCharCount?: number;
  pinterestCharCount?: number;
  discordCharCount?: number;
  telegramCharCount?: number;
  targetNetwork: string;
}

interface CustomWindow extends Window {
  posthog?: {
    capture: (
      event: string,
      properties: {
        num_networks: number;
        target_networks: string[];
        source_type: "url" | "raw_text";
        content_language?: string;
        prompt_id: string;
      },
    ) => void;
  };
}

const isMediaUrl = (url: string) => {
  if (!url) return false;
  const mediaRegex =
    /(\.(mp3|mp4|wav|mov))|^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return mediaRegex.test(url);
};

export class PulsarFormManager {
  private supabase: SupabaseClient;
  private form: HTMLElement;
  private onPulseUpdate: () => void;
  private onPulsarComplete: () => void;
  private mediaManagerClear: () => void;

  // DOM Elements
  private submitButton: HTMLButtonElement | null;
  private outputArea: HTMLElement | null;
  private urlInput: HTMLInputElement | null;
  private rawTextInput: HTMLTextAreaElement | null;
  private contentLanguageInput: HTMLSelectElement | null;
  private hashtagLanguageInput: HTMLSelectElement | null;
  private linkedinCharCountInput: HTMLInputElement | null;
  private twitterCharCountInput: HTMLInputElement | null;
  private instagramCharCountInput: HTMLInputElement | null;
  private threadsCharCountInput: HTMLInputElement | null;
  private facebookCharCountInput: HTMLInputElement | null;
  private pinterestCharCountInput: HTMLInputElement | null;
  private discordCharCountInput: HTMLInputElement | null;
  private telegramCharCountInput: HTMLInputElement | null;
  private promptSelector: HTMLSelectElement | null;
  private networkCheckboxes: NodeListOf<HTMLInputElement>;
  private truncateTextCheck: HTMLInputElement | null;

  constructor(
    supabase: SupabaseClient,
    formElement: HTMLElement,
    callbacks: {
      onPulseUpdate: () => void;
      onPulsarComplete: () => void;
      mediaManagerClear: () => void;
    },
  ) {
    this.supabase = supabase;
    this.form = formElement;
    this.onPulseUpdate = callbacks.onPulseUpdate;
    this.onPulsarComplete = callbacks.onPulsarComplete;
    this.mediaManagerClear = callbacks.mediaManagerClear;

    this.submitButton = this.form.querySelector("button[type='submit']");
    this.outputArea = document.getElementById("content-output");
    this.urlInput = this.form.querySelector("#post-url");
    this.rawTextInput = this.form.querySelector("#raw-text");
    this.contentLanguageInput = this.form.querySelector("#content-language");
    this.hashtagLanguageInput = this.form.querySelector("#hashtag-language");
    this.linkedinCharCountInput = this.form.querySelector(
      "#linkedin-char-count",
    );
    this.twitterCharCountInput = this.form.querySelector("#twitter-char-count");
    this.instagramCharCountInput = this.form.querySelector(
      "#instagram-char-count",
    );
    this.threadsCharCountInput = this.form.querySelector("#threads-char-count");
    this.facebookCharCountInput = this.form.querySelector(
      "#facebook-char-count",
    );
    this.pinterestCharCountInput = this.form.querySelector(
      "#pinterest-char-count",
    );
    this.discordCharCountInput = this.form.querySelector("#discord-char-count");
    this.telegramCharCountInput = this.form.querySelector(
      "#telegram-char-count",
    );
    this.promptSelector = this.form.querySelector("#prompt-selector");
    this.networkCheckboxes = this.form.querySelectorAll(
      ".network-select-checkbox",
    );
    this.truncateTextCheck = this.form.querySelector("#truncate-text-check");
  }

  public init() {
    if (!this.form) return;
    this.form.addEventListener("submit", this.handlePulsarSubmit.bind(this));
  }

  private handlePulsarSubmit(e: Event) {
    e.preventDefault();

    const existingContent = getTempPost<ITempPost>();

    if (
      existingContent?.generatedContent ||
      existingContent?.generatedImageUrl
    ) {
      const title = "// Confirm New Pulsar";
      const body =
        '<p class="text-foreground/80">Are you sure you want to start a new Pulsar? The current content will be lost and new pulses will be consumed.</p>';
      const footer = `
        <button data-modal-close class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
        <button id="confirm-pulsar-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm</button>
      `;

      showModal(title, body, footer);

      document
        .getElementById("confirm-pulsar-btn")
        ?.addEventListener("click", () => {
          hideModal();
          // This is the fix: only delete the generated text, not the whole object
          const currentData = getTempPost<ITempPost>() || {};
          delete currentData.generatedContent;
          saveTempPost(currentData);
          this.executePulsar();
        });
    } else {
      this.executePulsar();
    }
  }

  private async executePulsar() {
    // Check for social connections before proceeding
    const { data: connections } = await this.supabase
      .from("social_connections")
      .select("id")
      .limit(1);

    if (connections && connections.length === 0) {
      const title = "// Connect an Account to Publish";
      const body =
        "<p class=\"text-foreground/80\">To get the most out of PostPulsar, you'll need to connect a social account to publish your generated content. It's fast and secure.</p>";
      const footer = `
        <button id="generate-anyway-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Generate Anyway</button>
        <a href="/app/connections" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Connect Account</a>
      `;

      showModal(title, body, footer);

      document
        .getElementById("generate-anyway-btn")
        ?.addEventListener("click", () => {
          hideModal();
          this.runPulsarLogic(); // Proceed after user confirmation
        });
      return; // Stop here and wait for modal interaction
    }

    this.runPulsarLogic();
  }

  private async runPulsarLogic() {
    this.mediaManagerClear();
    if (
      !this.submitButton ||
      !this.outputArea ||
      !this.urlInput ||
      !this.rawTextInput ||
      !this.networkCheckboxes
    )
      return;

    const targetNetworks = Array.from(this.networkCheckboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    if (targetNetworks.length === 0) {
      showModal(
        "// Action Required",
        `<p class="text-foreground/80">Please select at least one target network before using Pulsar.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    this.submitButton.setAttribute("disabled", "true");

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // --- 1. GET SOURCE TEXT ---
      let cleanedText = "";
      const urlInputContainer = document.getElementById("url-input-container");

      if (!urlInputContainer?.classList.contains("hidden")) {
        const url = this.urlInput.value;
        if (!url) throw new Error("URL is required.");

        if (this.submitButton) {
          const extractionType = isMediaUrl(url) ? "TRANSCRIBING" : "SCRAPING";
          this.submitButton.innerHTML = `PULSING... (${extractionType})`;
        }

        const { data, error } = await this.supabase.functions.invoke(
          "get-source-text",
          { body: { url } },
        );

        if (error) {
          throw new Error(`Source extraction error: ${error.message}`);
        }
        if (data.status === "error") {
          throw new Error(data.error);
        }
        cleanedText = data.cleanedText;
        this.onPulseUpdate(); // Update pulse count after extraction
      } else {
        const rawText = this.rawTextInput.value;
        if (!rawText) throw new Error("Text content is required.");
        cleanedText = rawText;
      }

      // --- 2. GENERATE CONTENT FOR EACH NETWORK ---
      const bodyPayload: Partial<IInvokeBody> = {
        contentLanguage: this.contentLanguageInput?.value,
        hashtagLanguage: this.hashtagLanguageInput?.value,
        shouldTruncate: this.truncateTextCheck?.checked,
        rawText: cleanedText, // Pass the extracted text to the generation function
      };

      if (this.promptSelector && this.promptSelector.value) {
        bodyPayload.promptText = this.promptSelector.value;
      }

      // Add char counts to payload
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
      if (this.discordCharCountInput?.value)
        bodyPayload.discordCharCount = parseInt(
          this.discordCharCountInput.value,
          10,
        );
      if (this.telegramCharCountInput?.value)
        bodyPayload.telegramCharCount = parseInt(
          this.telegramCharCountInput.value,
          10,
        );

      const allGeneratedContent: IGeneratedContent = {};

      for (const network of targetNetworks) {
        if (this.submitButton) {
          this.submitButton.innerHTML = `PULSING... (GENERATING ${network})`;
        }

        const singleNetworkPayload: IInvokeBody = {
          ...bodyPayload,
          targetNetwork: network,
        } as IInvokeBody;

        const { data, error } = await this.supabase.functions.invoke(
          "pulsar-v1", // This now only handles generation
          { body: singleNetworkPayload },
        );

        if (error) {
          throw new Error(`Generation error for ${network}: ${error.message}`);
        }

        if (data.status === "error") {
          if (this.outputArea) this.outputArea.innerHTML = ""; // Clear for error message
          if (data.errorCode === "HISTORY_LIMIT_REACHED") {
            const body = `<p class="text-foreground/80">${data.error}</p>`;
            const footer = `<button id="close-limit-modal-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Close</button>\n                          <a href="/app/history" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Manage History</a>`;
            showModal("// Post History Full", body, footer);
            document
              .getElementById("close-limit-modal-btn")
              ?.addEventListener("click", hideModal);
          } else {
            const errorTitle =
              data.errorCode === "AI_RATE_LIMIT_EXCEEDED"
                ? "[AI RATE LIMIT]"
                : "[ERROR]";
            this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">${errorTitle}</p><p class="font-mono text-foreground/70 mt-2">${data.error}</p></div>`;
          }
          return; // Exit the entire function on error
        }

        if (data.status === "success") {
          const { generatedContent } = data;
          Object.assign(allGeneratedContent, generatedContent);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // --- 3. FINALIZE ---
      this.onPulseUpdate(); // Final update after all generations

      // Merge generated content with existing data in localStorage
      const currentData = getTempPost<ITempPost>() || {};

      const finalData: ITempPost = {
        ...currentData,
        sourceUrl: this.urlInput?.value,
        rawText: this.rawTextInput?.value,
        generatedContent: allGeneratedContent,
      };

      saveTempPost(finalData);

      this.onPulsarComplete(); // Signal to the DashboardManager to re-render everything

      // PostHog event capture
      if ((window as CustomWindow).posthog) {
        const sourceType = (finalData as ITempPost).sourceUrl
          ? "url"
          : "raw_text";
        (window as CustomWindow).posthog.capture("content_generated", {
          num_networks: targetNetworks.length,
          target_networks: targetNetworks,
          source_type: sourceType,
          content_language: this.contentLanguageInput?.value,
          prompt_id: this.promptSelector?.value || "default_ai",
        });
      }
    } catch (err) {
      const error = err as { message: string };
      if (this.outputArea)
        this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">[CRITICAL ERROR]</p><p class="font-mono text-foreground/70 mt-2">${error.message}</p></div>`;
    } finally {
      if (this.submitButton) {
        this.submitButton.removeAttribute("disabled");
        this.submitButton.innerHTML = "Pulsar &gt;&gt;";
      }
    }
  }
}
