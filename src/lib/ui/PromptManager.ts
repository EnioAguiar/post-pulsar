import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";

export class PromptManager {
  private supabase: SupabaseClient;
  private userId: string;
  private promptSelector: HTMLSelectElement;
  private addPromptBtn: HTMLElement | null;
  private managePromptsBtn: HTMLElement | null;
  private userPlan: string;

  constructor(supabase: SupabaseClient, userId: string, userPlan: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.userPlan = userPlan;
    this.promptSelector = document.getElementById(
      "prompt-selector",
    ) as HTMLSelectElement;
    this.addPromptBtn = document.getElementById("add-prompt-btn");
    this.managePromptsBtn = document.getElementById("manage-prompts-btn");
  }

  public init() {
    if (this.addPromptBtn)
      this.addPromptBtn.addEventListener("click", () => this.openPromptModal());
    if (this.managePromptsBtn)
      this.managePromptsBtn.addEventListener("click", () =>
        this.openManagePromptsModal(),
      );
    this.loadPrompts();
  }

  public async loadPrompts() {
    if (!this.promptSelector) return;

    const defaultPrompts = [
      { name: "Default AI", text: "" },
      {
        name: "Short & Punchy",
        text: "Create a very short and impactful post, using a strong hook to grab attention immediately.",
      },
      {
        name: "In-depth Analysis",
        text: "Write a more detailed post. Break down the key topic into a few insightful points. End with an open-ended question to encourage discussion.",
      },
    ];

    let allPrompts = defaultPrompts.map(
      (p) => `<option value="${p.text}">${p.name}</option>`,
    );

    const { data: customPrompts, error } = await this.supabase
      .from("user_prompts")
      .select("id, name, text")
      .eq("user_id", this.userId);

    if (error) {
      console.error("Error fetching custom prompts:", error);
    } else if (customPrompts) {
      const customOptions = customPrompts.map(
        (p) => `<option value="${p.text}">${p.name} (Custom)</option>`,
      );
      allPrompts = [...allPrompts, ...customOptions];
    }

    this.promptSelector.innerHTML = allPrompts.join("");

    if (this.userPlan === "pro") {
      this.addPromptBtn?.classList.remove("hidden");
      this.managePromptsBtn?.classList.remove("hidden");
    }
  }

  private openPromptModal() {
    const modalBody = `
            <form id="prompt-form">
                <div class="mb-4">
                    <label for="prompt-name" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Prompt Name</label>
                    <input type="text" id="prompt-name" name="prompt-name" required class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="e.g., My Awesome Prompt">
                </div>
                <div class="mb-4">
                    <label for="prompt-text" class="mb-2 block font-mono text-sm uppercase text-foreground/70">// Prompt Text</label>
                    <textarea id="prompt-text" name="prompt-text" required rows="5" class="w-full rounded-none border border-border bg-background p-4 font-mono text-lg focus:border-primary focus:outline-none focus:ring-0" placeholder="e.g., Create a post that is witty and uses a metaphor..."></textarea>
                </div>
            </form>
        `;
    const modalFooter = `
            <button type="button" id="cancel-prompt-btn" class="border border-foreground/50 px-8 py-4 font-mono text-lg font-bold uppercase text-foreground/50 transition-colors hover:bg-foreground/10">Cancel</button>
            <button type="submit" id="save-prompt-submit-btn" form="prompt-form" class="border border-primary bg-primary px-8 py-4 font-mono text-lg font-bold uppercase text-background transition-colors hover:bg-primary/80">Save Prompt</button>
        `;

    showModal("// Create New Prompt", modalBody, modalFooter);

    document
      .getElementById("cancel-prompt-btn")
      ?.addEventListener("click", hideModal);
    document
      .getElementById("prompt-form")
      ?.addEventListener("submit", (e) => this.handleSavePrompt(e));
  }

  private async openManagePromptsModal() {
    const { data: prompts, error } = await this.supabase
      .from("user_prompts")
      .select("id, name")
      .eq("user_id", this.userId);

    if (error) {
      showModal(
        "// Error",
        `<p>Could not load your prompts: ${error.message}</p>`,
        `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
      );
      return;
    }

    let bodyHtml =
      '<p class="text-foreground/70">You have no custom prompts.</p>';
    if (prompts && prompts.length > 0) {
      bodyHtml =
        '<ul class="space-y-2">' +
        prompts
          .map(
            (p) => `
                <li class="flex items-center justify-between border-b border-border/20 py-2">
                    <span class="font-mono">${p.name}</span>
                    <button class="delete-prompt-btn text-red-400 hover:text-red-600 p-1" data-prompt-id="${p.id}" aria-label="Delete ${p.name}">&times;</button>
                </li>
            `,
          )
          .join("") +
        "</ul>";
    }

    showModal(
      "// Manage Custom Prompts",
      bodyHtml,
      `<button id="close-manage-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Close</button>`,
    );

    document
      .getElementById("close-manage-btn")
      ?.addEventListener("click", hideModal);
    document
      .querySelector("#modal-body")
      ?.addEventListener("click", (e) => this.handleDeletePrompt(e));
  }

  private async handleDeletePrompt(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("delete-prompt-btn")) return;

    const promptId = target.dataset.promptId;
    if (!promptId) return;

    const { error } = await this.supabase
      .from("user_prompts")
      .delete()
      .eq("id", promptId);

    if (error) {
      alert(`Error deleting prompt: ${error.message}`);
    } else {
      target.closest("li")?.remove();
      this.loadPrompts(); // Refresh the main dropdown
    }
  }

  private async handleSavePrompt(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const promptNameInput = form.querySelector(
      "#prompt-name",
    ) as HTMLInputElement;
    const promptTextInput = form.querySelector(
      "#prompt-text",
    ) as HTMLTextAreaElement;

    if (!promptNameInput || !promptTextInput) return;

    const promptName = promptNameInput.value;
    const promptText = promptTextInput.value;

    if (!promptName || !promptText) {
      alert("Prompt name and text cannot be empty.");
      return;
    }

    const submitButton = document.getElementById(
      "save-prompt-submit-btn",
    ) as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerText = "Saving...";
    }

    try {
      const { error } = await this.supabase
        .from("user_prompts")
        .insert([{ user_id: this.userId, name: promptName, text: promptText }]);

      if (error) throw error;

      hideModal();
      await this.loadPrompts(); // Refresh the dropdown

      showModal(
        "// Success",
        "<p>Your new prompt has been saved.</p>",
        '<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>',
      );
      document.getElementById("ok-btn")?.addEventListener("click", hideModal);
    } catch (err) {
      const error = err as { message: string };
      console.error("Error saving prompt:", error);
      const footer = document.getElementById("modal-footer");
      if (footer)
        footer.innerHTML = `<p class="text-red-400">Error: ${error.message}</p>`;
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = "Save Prompt";
      }
    }
  }
}
