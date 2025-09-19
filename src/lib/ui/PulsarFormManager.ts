import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";

// Type Definitions (copiadas de DashboardManager para encapsulamento)
interface IGeneratedContent {
  [key: string]: string;
}
type TInvokeBody = { [key: string]: any };

const TEMP_POST_KEY = "temp_post_pulsar";

export class PulsarFormManager {
  private supabase: SupabaseClient;
  private form: HTMLElement;
  private onPulseUpdate: (count: number) => void;
  private displayGeneratedContent: (content: IGeneratedContent) => void;
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
  private networkCheckboxes: NodeListOf<HTMLInputElement> | null;

  constructor(
    supabase: SupabaseClient,
    formElement: HTMLElement,
    callbacks: {
      onPulseUpdate: (count: number) => void;
      displayGeneratedContent: (content: IGeneratedContent) => void;
      mediaManagerClear: () => void;
    }
  ) {
    this.supabase = supabase;
    this.form = formElement;
    this.onPulseUpdate = callbacks.onPulseUpdate;
    this.displayGeneratedContent = callbacks.displayGeneratedContent;
    this.mediaManagerClear = callbacks.mediaManagerClear;

    this.initializeDOMElements();
  }

  private initializeDOMElements() {
    this.submitButton = this.form.querySelector("button[type='submit']");
    this.outputArea = document.getElementById("content-output"); // Ainda necessário globalmente
    this.urlInput = this.form.querySelector("#post-url");
    this.rawTextInput = this.form.querySelector("#raw-text");
    this.contentLanguageInput = this.form.querySelector("#content-language");
    this.hashtagLanguageInput = this.form.querySelector("#hashtag-language");
    this.linkedinCharCountInput = this.form.querySelector("#linkedin-char-count");
    this.twitterCharCountInput = this.form.querySelector("#twitter-char-count");
    this.instagramCharCountInput = this.form.querySelector("#instagram-char-count");
    this.threadsCharCountInput = this.form.querySelector("#threads-char-count");
    this.facebookCharCountInput = this.form.querySelector("#facebook-char-count");
    this.pinterestCharCountInput = this.form.querySelector("#pinterest-char-count");
    this.discordCharCountInput = this.form.querySelector("#discord-char-count");
    this.telegramCharCountInput = this.form.querySelector("#telegram-char-count");
    this.promptSelector = this.form.querySelector("#prompt-selector");
    this.networkCheckboxes = this.form.querySelectorAll(".network-select-checkbox");
  }

  public init() {
    if (!this.form) return;
    this.form.addEventListener("submit", this.handlePulsarSubmit.bind(this));
  }

  private async handlePulsarSubmit(e: Event) {
    e.preventDefault();
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
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`
      );
      return;
    }

    this.submitButton.setAttribute("disabled", "true");
    this.submitButton.innerHTML = "PULSING...";

    const pulsingMessages = [
      "Transmitting signal...",
      "Analyzing content...",
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
      const bodyPayload: TInvokeBody = {
        contentLanguage: this.contentLanguageInput?.value,
        hashtagLanguage: this.hashtagLanguageInput?.value,
        targetNetworks: targetNetworks,
      };

      const urlInputContainer = document.getElementById("url-input-container");
      const dataToStore: { [key: string]: any } = {};

      if (!urlInputContainer?.classList.contains("hidden")) {
        bodyPayload.url = this.urlInput.value;
        dataToStore.sourceUrl = this.urlInput.value;
      } else {
        bodyPayload.rawText = this.rawTextInput.value;
        dataToStore.rawText = this.rawTextInput.value;
      }

      if (this.promptSelector && this.promptSelector.value) {
        bodyPayload.promptText = this.promptSelector.value;
      }

      if (this.linkedinCharCountInput?.value)
        bodyPayload.linkedInCharCount = parseInt(this.linkedinCharCountInput.value, 10);
      if (this.twitterCharCountInput?.value)
        bodyPayload.twitterCharCount = parseInt(this.twitterCharCountInput.value, 10);
      if (this.instagramCharCountInput?.value)
        bodyPayload.instagramCharCount = parseInt(this.instagramCharCountInput.value, 10);
      if (this.threadsCharCountInput?.value)
        bodyPayload.threadsCharCount = parseInt(this.threadsCharCountInput.value, 10);
      if (this.facebookCharCountInput?.value)
        bodyPayload.facebookCharCount = parseInt(this.facebookCharCountInput.value, 10);
      if (this.pinterestCharCountInput?.value)
        bodyPayload.pinterestCharCount = parseInt(this.pinterestCharCountInput.value, 10);
      if (this.discordCharCountInput?.value)
        bodyPayload.discordCharCount = parseInt(this.discordCharCountInput.value, 10);
      if (this.telegramCharCountInput?.value)
        bodyPayload.telegramCharCount = parseInt(this.telegramCharCountInput.value, 10);

      const { data, error } = await this.supabase.functions.invoke("pulsar-v1", {
        body: bodyPayload,
      });

      if (error) {
        throw new Error(`Network or function error: ${error.message}`);
      }

      if (data.status === "error") {
        if (data.errorCode === "HISTORY_LIMIT_REACHED") {
          const body = `<p class="text-foreground/80">${data.error}</p>`;
          const footer = `<button id="close-limit-modal-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Close</button>\n                          <a href="/app/history" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Manage History</a>`;
          showModal("// Post History Full", body, footer);
          document.getElementById("close-limit-modal-btn")?.addEventListener("click", hideModal);
          if (this.outputArea) this.outputArea.innerHTML = "";
        } else {
          const errorTitle =
            data.errorCode === "AI_RATE_LIMIT_EXCEEDED" ? "[AI RATE LIMIT]" : "[ERROR]";
          if (this.outputArea)
            this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">${errorTitle}</p><p class="font-mono text-foreground/70 mt-2">${data.error}</p></div>`;
        }
        return;
      }

      if (data.status === "success") {
        this.onPulseUpdate(targetNetworks.length);
        const { generatedContent } = data;

        dataToStore.generatedContent = generatedContent;
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
}