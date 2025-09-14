import type { SupabaseClient } from '@supabase/supabase-js';
import { showModal, hideModal, showProgressModal, updateProgressStep, updateProgressBar } from '../modal';
import { createSocialPostCard } from './SocialPostCard';

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

type TNetwork = 'linkedin' | 'twitter' | 'instagram' | 'threads' | 'facebook' | 'pinterest';

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
  private promptSelector: HTMLSelectElement | null;
  private addPromptBtn: HTMLElement | null;
  private managePromptsBtn: HTMLElement | null;
  private selectAllNetworksCheckbox: HTMLInputElement | null;
  private networkCheckboxes: NodeListOf<HTMLInputElement> | null;

  private currentPulseCount = 0;
  private selectedMediaForNetwork: { [key: string]: File[] | null } = {};
  private userId: string | null = null;
  private userPlan = 'free';

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
    this.contentLanguageInput = document.getElementById("content-language") as HTMLSelectElement;
    this.hashtagLanguageInput = document.getElementById("hashtag-language") as HTMLSelectElement;
    this.submitButton = this.pulsarForm?.querySelector("button[type='submit']") as HTMLButtonElement;
    this.advancedSettingsToggle = document.getElementById("advanced-settings-toggle");
    this.advancedSettingsPanel = document.getElementById("advanced-settings-panel");
    this.linkedinCharCountInput = document.getElementById("linkedin-char-count") as HTMLInputElement;
    this.twitterCharCountInput = document.getElementById("twitter-char-count") as HTMLInputElement;
    this.instagramCharCountInput = document.getElementById("instagram-char-count") as HTMLInputElement;
    this.threadsCharCountInput = document.getElementById("threads-char-count") as HTMLInputElement;
    this.facebookCharCountInput = document.getElementById("facebook-char-count") as HTMLInputElement;
    this.pinterestCharCountInput = document.getElementById("pinterest-char-count") as HTMLInputElement;
    this.twitterPremiumCheck = document.getElementById("twitter-premium-check") as HTMLInputElement;
    this.savePrefsBtn = document.getElementById("save-prefs-btn");
    this.promptSelector = document.getElementById("prompt-selector") as HTMLSelectElement;
    this.addPromptBtn = document.getElementById("add-prompt-btn");
    this.managePromptsBtn = document.getElementById("manage-prompts-btn");
    this.selectAllNetworksCheckbox = document.getElementById("select-all-networks") as HTMLInputElement;
    this.networkCheckboxes = document.querySelectorAll(".network-select-checkbox") as NodeListOf<HTMLInputElement>;
  }

  public init() {
    if (this.pulsarForm && this.outputArea && this.submitButton) {
        this.pulsarForm.addEventListener("submit", this.handlePulsarSubmit.bind(this));
        this.outputArea.addEventListener("click", this.handleOutputAreaClick.bind(this));
        this.outputArea.addEventListener("change", (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('media-upload-input')) {
                this.handleFileUpload(e);
            }
        });
        this.outputArea.addEventListener("input", this.handleCharCount.bind(this));
        this.twitterPremiumCheck?.addEventListener('change', this.handleTwitterPremiumToggle.bind(this));
        this.loadUserData();

        if(this.advancedSettingsToggle) {
          this.advancedSettingsToggle.addEventListener("click", () => {
            if(this.advancedSettingsPanel) this.advancedSettingsPanel.classList.toggle("hidden");
          });
        }
        if(this.savePrefsBtn) this.savePrefsBtn.addEventListener("click", this.handleSavePrefs.bind(this));

        // Add event listeners for prompt modals
        if (this.addPromptBtn) this.addPromptBtn.addEventListener('click', this.openPromptModal.bind(this));
        if (this.managePromptsBtn) this.managePromptsBtn.addEventListener('click', this.openManagePromptsModal.bind(this));
        
        // Add event listener for network selection
        if (this.selectAllNetworksCheckbox) {
            this.selectAllNetworksCheckbox.addEventListener('change', this.handleSelectAllNetworks.bind(this));
        }
      }
  }

  private async loadUserData() {
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
    if (sessionError || !session) {
      window.location.href = "/login";
      return;
    }
    this.userId = session.user.id;

    const [profileResponse, lastPostResponse] = await Promise.all([
      this.supabase
        .from("profiles")
        .select("monthly_pulses_remaining, plan_type, default_linkedin_chars, default_twitter_chars, default_instagram_chars, default_threads_chars, default_facebook_chars, default_pinterest_chars")
        .eq("id", this.userId)
        .single<IProfile>(),
      this.supabase
        .from("generated_posts")
        .select("content")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single<{content: IGeneratedContent}>(),
    ]);

    const { data: profile, error: profileError } = profileResponse;
    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      if (this.pulseCountDisplay) this.pulseCountDisplay.innerText = "Error";
      if (this.planDisplay) this.planDisplay.innerText = "Error";
      return;
    }

    this.currentPulseCount = profile.monthly_pulses_remaining;
    this.userPlan = (profile.plan_type || 'free').replace(/'/g, "");
    this.updatePulseDisplay(this.currentPulseCount);
    if (this.planDisplay) this.planDisplay.innerText = this.userPlan.toUpperCase();

    this.loadPrompts();

    if (this.linkedinCharCountInput && profile.default_linkedin_chars) this.linkedinCharCountInput.value = String(profile.default_linkedin_chars);
    if (this.twitterCharCountInput && profile.default_twitter_chars) {
      this.twitterCharCountInput.value = String(profile.default_twitter_chars);
      if (this.twitterPremiumCheck && profile.default_twitter_chars > 280) {
        this.twitterPremiumCheck.checked = true;
        this.handleTwitterPremiumToggle();
      }
    }
    if (this.instagramCharCountInput && profile.default_instagram_chars) this.instagramCharCountInput.value = String(profile.default_instagram_chars);
    if (this.threadsCharCountInput && profile.default_threads_chars) this.threadsCharCountInput.value = String(profile.default_threads_chars);
    if (this.facebookCharCountInput && profile.default_facebook_chars) this.facebookCharCountInput.value = String(profile.default_facebook_chars);
    if (this.pinterestCharCountInput && profile.default_pinterest_chars) this.pinterestCharCountInput.value = String(profile.default_pinterest_chars);

    const { data: lastPost } = lastPostResponse;
    if (lastPost && lastPost.content) {
      this.displayGeneratedContent(lastPost.content);
    } else {
      this.updateUIAccess(this.userPlan);
    }
  }

  public async loadPrompts() {
    if (!this.promptSelector || !this.userId) return;

    const defaultPrompts = [
        { name: "Default AI", text: "" },
        { name: "Short & Punchy", text: "Create a very short and impactful post, using a strong hook to grab attention immediately." },
        { name: "In-depth Analysis", text: "Write a more detailed post. Break down the key topic into a few insightful points. End with an open-ended question to encourage discussion." }
    ];

    let allPrompts = defaultPrompts.map(p => `<option value="${p.text}">${p.name}</option>`);

    const { data: customPrompts, error } = await this.supabase
        .from('user_prompts')
        .select('id, name, text')
        .eq('user_id', this.userId);

    if (error) {
        console.error("Error fetching custom prompts:", error);
    } else if (customPrompts) {
        const customOptions = customPrompts.map(p => `<option value="${p.text}">${p.name} (Custom)</option>`);
        allPrompts = [...allPrompts, ...customOptions];
    }

    this.promptSelector.innerHTML = allPrompts.join('');

    if (this.userPlan === 'pro') {
        this.addPromptBtn?.classList.remove('hidden');
        this.managePromptsBtn?.classList.remove('hidden');
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

    document.getElementById('cancel-prompt-btn')?.addEventListener('click', hideModal);
    document.getElementById('prompt-form')?.addEventListener('submit', this.handleSavePrompt.bind(this));
  }

  private async openManagePromptsModal() {
    if (!this.userId) return;

    const { data: prompts, error } = await this.supabase
        .from('user_prompts')
        .select('id, name')
        .eq('user_id', this.userId);

    if (error) {
        return showModal("// Error", `<p>Could not load your prompts: ${error.message}</p>`, `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`);
    }

    let bodyHtml = '<p class="text-foreground/70">You have no custom prompts.</p>';
    if (prompts && prompts.length > 0) {
        bodyHtml = '<ul class="space-y-2">' + prompts.map(p => `
            <li class="flex items-center justify-between border-b border-border/20 py-2">
                <span class="font-mono">${p.name}</span>
                <button class="delete-prompt-btn text-red-400 hover:text-red-600 p-1" data-prompt-id="${p.id}" aria-label="Delete ${p.name}">&times;</button>
            </li>
        `).join('') + '</ul>';
    }

    showModal("// Manage Custom Prompts", bodyHtml, `<button id="close-manage-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Close</button>`);

    document.getElementById('close-manage-btn')?.addEventListener('click', hideModal);
    document.querySelector('#modal-body')?.addEventListener('click', this.handleDeletePrompt.bind(this));
  }

  private async handleDeletePrompt(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('delete-prompt-btn')) return;

    const promptId = target.dataset.promptId;
    if (!promptId) return;

    const { error } = await this.supabase.from('user_prompts').delete().eq('id', promptId);

    if (error) {
        alert(`Error deleting prompt: ${error.message}`);
    } else {
        target.closest('li')?.remove();
        this.loadPrompts(); // Refresh the main dropdown
    }
  }

  private async handleSavePrompt(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const promptNameInput = form.querySelector('#prompt-name') as HTMLInputElement;
    const promptTextInput = form.querySelector('#prompt-text') as HTMLTextAreaElement;

    if (!this.userId || !promptNameInput || !promptTextInput) return;

    const promptName = promptNameInput.value;
    const promptText = promptTextInput.value;

    if (!promptName || !promptText) {
        alert("Prompt name and text cannot be empty.");
        return;
    }

    const submitButton = document.getElementById('save-prompt-submit-btn') as HTMLButtonElement;
    if(submitButton) {
        submitButton.disabled = true;
        submitButton.innerText = "Saving...";
    }

    try {
        const { error } = await this.supabase.from('user_prompts').insert([
            { user_id: this.userId, name: promptName, text: promptText }
        ]);

        if (error) throw error;

        hideModal();
        await this.loadPrompts(); // Refresh the dropdown
        
        showModal('// Success', '<p>Your new prompt has been saved.</p>', '<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>');
        document.getElementById('ok-btn')?.addEventListener('click', hideModal);

    } catch (err) {
        const error = err as { message: string };
        console.error("Error saving prompt:", error);
        const footer = document.getElementById('modal-footer');
        if(footer) footer.innerHTML = `<p class="text-red-400">Error: ${error.message}</p>`;
    } finally {
        if(submitButton) {
            submitButton.disabled = false;
            submitButton.innerText = "Save Prompt";
        }
    }
  }
  
  private updateUIAccess(plan: string) {
    const imageFeatures = document.querySelectorAll('.image-feature');
    const videoFeatures = document.querySelectorAll('.video-feature');
    const canUploadImage = plan === 'basic' || plan === 'pro';
    const canUploadVideo = plan === 'pro';
    imageFeatures.forEach(el => el.classList.toggle('hidden', !canUploadImage));
    videoFeatures.forEach(el => el.classList.toggle('hidden', !canUploadVideo));
  }

  private updatePulseDisplay(count: number) {
    if (this.pulseCountDisplay) {
      this.pulseCountDisplay.innerText = count === -1 ? "∞" : count.toString();
    }
  }

  private handleSelectAllNetworks() {
    if (!this.selectAllNetworksCheckbox || !this.networkCheckboxes) return;
    const isChecked = this.selectAllNetworksCheckbox.checked;
    this.networkCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
  }

  private async handlePulsarSubmit(e: Event) {
    e.preventDefault();
    this.selectedMediaForNetwork = {};
    if (!this.submitButton || !this.outputArea || !this.urlInput || !this.networkCheckboxes) return;

    this.submitButton.setAttribute("disabled", "true");
    this.submitButton.innerHTML = "PULSING...";

    const pulsingMessages = ["Transmitting signal...", "Analyzing article...", "Engaging AI model...", "Calibrating social matrix...", "Generating content...", "Finalizing transmission..."];
    let messageIndex = 0;
    
    this.outputArea.innerHTML = `<div class="border border-dashed border-border p-8 text-center"><p class="font-mono text-foreground/70">[PULSING] :: ${pulsingMessages[0]}</p></div>`;
    const loadingIndicator = this.outputArea.querySelector("p");

    const pulsingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % pulsingMessages.length;
      if (loadingIndicator) loadingIndicator.textContent = `[PULSING] :: ${pulsingMessages[messageIndex]}`;
    }, 2500);

    try {
      const targetNetworks = Array.from(this.networkCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

      if (targetNetworks.length === 0) {
        alert("Please select at least one target network.");
        this.submitButton.removeAttribute("disabled");
        this.submitButton.innerHTML = "Pulsar &gt;&gt;";
        clearInterval(pulsingInterval);
        if (this.outputArea) this.outputArea.innerHTML = "";
        return;
      }

      const bodyPayload: { [key: string]: any } = {
        url: this.urlInput.value,
        contentLanguage: this.contentLanguageInput.value,
        hashtagLanguage: this.hashtagLanguageInput.value,
        targetNetworks: targetNetworks,
      };

      if (this.promptSelector && this.promptSelector.value) {
        bodyPayload.promptText = this.promptSelector.value;
      }

      if (this.linkedinCharCountInput.value) bodyPayload.linkedInCharCount = parseInt(this.linkedinCharCountInput.value, 10);
      if (this.twitterCharCountInput.value) bodyPayload.twitterCharCount = parseInt(this.twitterCharCountInput.value, 10);
      if (this.instagramCharCountInput.value) bodyPayload.instagramCharCount = parseInt(this.instagramCharCountInput.value, 10);
      if (this.threadsCharCountInput.value) bodyPayload.threadsCharCount = parseInt(this.threadsCharCountInput.value, 10);
      if (this.facebookCharCountInput.value) bodyPayload.facebookCharCount = parseInt(this.facebookCharCountInput.value, 10);
      if (this.pinterestCharCountInput.value) bodyPayload.pinterestCharCount = parseInt(this.pinterestCharCountInput.value, 10);

      const { data, error } = await this.supabase.functions.invoke("pulsar-v1", { body: bodyPayload });

      if (error) {
        throw new Error(`Network or function error: ${error.message}`);
      }

      if (data.status === 'error') {
        if (data.errorCode === 'HISTORY_LIMIT_REACHED') {
          const body = `<p class="text-foreground/80">${data.error}</p>`;
          const footer = `<button id="close-limit-modal-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Close</button>
                          <a href="/app/history" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Manage History</a>`;
          showModal("// Post History Full", body, footer);
          document.getElementById('close-limit-modal-btn')?.addEventListener('click', hideModal);
          if(this.outputArea) this.outputArea.innerHTML = '';
        } else {
          const errorTitle = data.errorCode === 'AI_RATE_LIMIT_EXCEEDED' ? '[AI RATE LIMIT]' : '[ERROR]';
          if(this.outputArea) this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">${errorTitle}</p><p class="font-mono text-foreground/70 mt-2">${data.error}</p></div>`;
        }
        return;
      }

      if (data.status === 'success') {
        this.currentPulseCount--;
        this.updatePulseDisplay(this.currentPulseCount);
        const { generatedContent, postId } = data;
        this.displayGeneratedContent(generatedContent, postId);
      }

    } catch (err) {
      const error = err as { message: string };
      if(this.outputArea) this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">[CRITICAL ERROR]</p><p class="font-mono text-foreground/70 mt-2">${error.message}</p></div>`;
    } finally {
      clearInterval(pulsingInterval);
      if (this.submitButton) {
        this.submitButton.removeAttribute("disabled");
        this.submitButton.innerHTML = "Pulsar &gt;&gt;";
      }
    }
  }

  private async loadFacebookPages() {
    const { data, error } = await this.supabase.from('social_connections').select('provider_user_id, provider_user_name').eq('provider', 'facebook');
    if (error) {
      console.error('Error fetching Facebook pages:', error);
      return;
    }
    if (data && data.length > 1) {
      const container = document.querySelector('.facebook-page-selector-container');
      if (!container) return;
      const options = (data as IPage[]).map(page => `<option value="${page.provider_user_id}">${page.provider_user_name}</option>`).join('');
      container.innerHTML = `
        <select id="facebook-page-selector" class="w-full rounded-none border border-border bg-background p-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-0">
          <option value="" disabled selected>Select a Page...</option>
          ${options}
        </select>
      `;
    }
  }

  private displayGeneratedContent(content: IGeneratedContent, postId?: number) {
    if (!this.outputArea) return;

    if (postId) {
        this.outputArea.dataset.postId = String(postId);
    }

    const networks: TNetwork[] = ['linkedin', 'twitter', 'instagram', 'threads', 'facebook', 'pinterest'];
    let cardsHTML = '';

    for (const network of networks) {
        if (content[network]) {
            cardsHTML += createSocialPostCard(network, content[network], this.userPlan);
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

    this.updateCharacterCount('twitter', content.twitter);
    this.updateCharacterCount('threads', content.threads);
    this.loadFacebookPages();
    this.updateUIAccess(this.userPlan);

    // Add event listener for the new button
    document.getElementById('publish-all-btn')?.addEventListener('click', this.handlePublishAll.bind(this));
  }

  private async handleSavePrefs() {
    if (!this.savePrefsBtn) return;
    const prefs = {
        linkedin_chars: parseInt(this.linkedinCharCountInput.value, 10) || null,
        twitter_chars: parseInt(this.twitterCharCountInput.value, 10) || null,
        instagram_chars: parseInt(this.instagramCharCountInput.value, 10) || null,
        threads_chars: parseInt(this.threadsCharCountInput.value, 10) || null,
        facebook_chars: parseInt(this.facebookCharCountInput.value, 10) || null,
        pinterest_chars: parseInt(this.pinterestCharCountInput.value, 10) || null,
    };
    this.savePrefsBtn.setAttribute("disabled", "true");
    this.savePrefsBtn.innerText = "Saving...";
    try {
      const { error } = await this.supabase.rpc("update_char_preferences", prefs);
      if (error) throw error;
      this.savePrefsBtn.innerText = "Saved!";
      setTimeout(() => { 
        if(this.savePrefsBtn) {
          this.savePrefsBtn.innerText = "Save as Default"; 
          this.savePrefsBtn.removeAttribute("disabled");
        }
      }, 2000);
    } catch (err) {
        const error = err as { message: string };
        alert(`Error saving preferences: ${error.message}`);
        if(this.savePrefsBtn) {
            this.savePrefsBtn.innerText = "Save as Default";
            this.savePrefsBtn.removeAttribute("disabled");
        }
    }
  }

  private handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const featureContainer = input.closest('.media-feature, .image-feature, .video-feature') as HTMLElement;

    if (!featureContainer || !input.files || input.files.length === 0) {
        return;
    }

    const networkCard = featureContainer.closest('[data-network]') as HTMLElement;
    if (!networkCard) {
        console.error("CRITICAL: Could not find parent network card with [data-network] attribute.");
        return;
    }

    const network = networkCard.dataset.network as TNetwork;
    const files = Array.from(input.files);
    const isCarousel = network === 'instagram' || network === 'threads';

    if (isCarousel) {
        const validatedFiles = files.filter(file => {
            const isVideo = file.type.startsWith('video/');
            if (this.userPlan === 'basic' && isVideo) {
                return false; 
            }
            const allowedTypes = isVideo ? ["video/mp4", "video/quicktime"] : ["image/jpeg", "image/png"];
            const maxSize = isVideo ? 200 * 1024 * 1024 : 2 * 1024 * 1024;

            if (!allowedTypes.includes(file.type)) {
                showModal("// Invalid File Type", `<p>The file <span class="font-bold">${file.name}</span> has an unsupported type.</p>`, `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`);
                document.getElementById('ok-btn')?.addEventListener('click', hideModal);
                return false;
            }
            if (file.size > maxSize) {
                const limit = isVideo ? '200MB' : '2MB';
                showModal("// File Too Large", `<p>The file <span class="font-bold">${file.name}</span> exceeds the size limit of ${limit}.</p>`, `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`);
                document.getElementById('ok-btn')?.addEventListener('click', hideModal);
                return false;
            }
            return true;
        });

        if (this.userPlan === 'basic') {
            this.selectedMediaForNetwork[network] = validatedFiles.slice(0, 1);
        } else {
            const currentFiles = this.selectedMediaForNetwork[network] || [];
            currentFiles.push(...validatedFiles);
            this.selectedMediaForNetwork[network] = currentFiles;
        }
        
        this.renderCarouselGallery(network, networkCard);

    } else { // Logic for single media networks
        const file = files[0];
        const isVideo = file.type.startsWith('video/');

        const imageFeature = networkCard.querySelector('.image-feature') as HTMLElement;
        const videoFeature = networkCard.querySelector('.video-feature') as HTMLElement;
        
        if (!imageFeature || !videoFeature) {
            console.error("CRITICAL: Could not find both .image-feature and .video-feature containers.");
            return;
        }

        const currentFeature = isVideo ? videoFeature : imageFeature;
        const otherFeature = isVideo ? imageFeature : videoFeature;

        const otherInput = otherFeature.querySelector('.media-upload-input') as HTMLInputElement;
        if (otherInput) {
            otherInput.value = '';
            otherInput.disabled = true;
        }
        otherFeature.querySelector('.media-upload-label')?.classList.add('disabled');
        otherFeature.querySelector('.tooltip-container')?.classList.remove('hidden');
        const otherPreview = otherFeature.querySelector('.media-preview-container') as HTMLElement;
        if (otherPreview) otherPreview.classList.add('hidden');

        const currentInput = currentFeature.querySelector('.media-upload-input') as HTMLInputElement;
        if (currentInput) currentInput.disabled = false;
        currentFeature.querySelector('.media-upload-label')?.classList.remove('disabled');
        currentFeature.querySelector('.tooltip-container')?.classList.add('hidden');

        const allowedTypes = isVideo ? ["video/mp4", "video/quicktime"] : ["image/jpeg", "image/png"];
        const maxSize = isVideo ? 200 * 1024 * 1024 : 2 * 1024 * 1024;
        
        if (!allowedTypes.includes(file.type)) {
            showModal("// Invalid File Type", `<p>Unsupported type.</p>`, `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`);
            document.getElementById('ok-btn')?.addEventListener('click', hideModal);
            input.value = "";
            this.handleRemoveMedia(e);
            return;
        }

        if (file.size > maxSize) {
            const limit = isVideo ? '200MB' : '2MB';
            showModal("// File Too Large", `<p>Exceeds the size limit of ${limit}.</p>`, `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`);
            document.getElementById('ok-btn')?.addEventListener('click', hideModal);
            input.value = "";
            this.handleRemoveMedia(e);
            return;
        }

        this.selectedMediaForNetwork[network] = [file];
        const previewContainer = currentFeature.querySelector('.media-preview-container') as HTMLDivElement;
        const previewImage = previewContainer?.querySelector('.image-preview') as HTMLImageElement;
        const previewVideo = previewContainer?.querySelector('.video-preview') as HTMLVideoElement;

        const objectURL = URL.createObjectURL(file);
        if (isVideo && previewVideo) {
            previewVideo.src = objectURL;
            previewVideo.classList.remove("hidden");
        } else if (!isVideo && previewImage) {
            previewImage.src = objectURL;
            previewImage.classList.remove("hidden");
        }
        if (previewContainer) previewContainer.classList.remove("hidden");
    }
  }

  private renderCarouselGallery(network: TNetwork, networkCard: HTMLElement) {
    const galleryContainer = networkCard.querySelector('.media-gallery-container');
    if (!galleryContainer) return;

    galleryContainer.innerHTML = '';
    const files = this.selectedMediaForNetwork[network] || [];

    files.forEach((file, index) => {
        const isVideo = file.type.startsWith('video/');
        const objectURL = URL.createObjectURL(file);
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'relative w-24 h-24 border border-border';
        
        let mediaElement;
        if (isVideo) {
            mediaElement = document.createElement('video');
            mediaElement.src = objectURL;
            mediaElement.className = 'w-full h-full object-cover';
        } else {
            mediaElement = document.createElement('img');
            mediaElement.src = objectURL;
            mediaElement.alt = 'Media preview';
            mediaElement.className = 'w-full h-full object-cover';
        }

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80 text-xs';
        removeBtn.innerHTML = 'X';
        removeBtn.dataset.index = String(index);

        thumbContainer.appendChild(mediaElement);
        thumbContainer.appendChild(removeBtn);
        galleryContainer.appendChild(thumbContainer);
    });
  }

  private handleRemoveMedia(e: Event) {
      const triggerElement = e.target as HTMLElement;
      const networkCard = triggerElement.closest('[data-network]') as HTMLElement;
      if (!networkCard) return;
      
      const network = networkCard.dataset.network as TNetwork;
      const isCarousel = network === 'instagram' || network === 'threads';

      if (isCarousel) {
          const indexToRemove = parseInt(triggerElement.dataset.index || '-1', 10);
          if (indexToRemove > -1) {
              const files = this.selectedMediaForNetwork[network] || [];
              const fileToRemove = files[indexToRemove];
              if (fileToRemove) {
                  const thumb = triggerElement.previousElementSibling as HTMLImageElement | HTMLVideoElement;
                  if (thumb && thumb.src.startsWith('blob:')) {
                      URL.revokeObjectURL(thumb.src);
                  }
              }
              files.splice(indexToRemove, 1);
              this.selectedMediaForNetwork[network] = files;
              this.renderCarouselGallery(network, networkCard);
          }
      } else { // Logic for single media networks
          const featureContainer = triggerElement.closest('.image-feature, .video-feature') as HTMLElement;
          if (!featureContainer) return;

          const previewContainer = featureContainer.querySelector('.media-preview-container') as HTMLDivElement;
          const fileInput = featureContainer.querySelector('.media-upload-input') as HTMLInputElement;

          const media = previewContainer?.querySelector('img, video') as HTMLImageElement | HTMLVideoElement;
          if (media && media.src.startsWith('blob:')) URL.revokeObjectURL(media.src);

          if (previewContainer) previewContainer.classList.add('hidden');
          if (fileInput) fileInput.value = '';
          this.selectedMediaForNetwork[network] = null;

          ['.image-feature', '.video-feature'].forEach(selector => {
              const feature = networkCard.querySelector(selector) as HTMLElement;
              if (feature) {
                  const input = feature.querySelector('.media-upload-input') as HTMLInputElement;
                  if (input) input.disabled = false;
                  feature.querySelector('.media-upload-label')?.classList.remove('disabled');
                  feature.querySelector('.tooltip-container')?.classList.add('hidden');
              }
          });
      }
  }

  private updateCharacterCount(network: 'twitter' | 'threads', text: string) {
    if (!this.twitterPremiumCheck) return;
    const isPremium = this.twitterPremiumCheck.checked;
    const limits = { twitter: isPremium ? 25000 : 280, threads: 500 };
    const maxChars = limits[network];
    const counter = document.getElementById(`${network}-counter`);
    const counterContainer = document.getElementById(`${network}-counter-container`);
    const textarea = document.getElementById(`${network}-textarea`) as HTMLTextAreaElement;
    if (counter && counterContainer && textarea) {
      const remaining = maxChars - (text || textarea.value).length;
      counter.textContent = remaining.toString();
      counterContainer.classList.toggle('text-red-500', remaining < 0);
    }
  }

  private handleCharCount(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    if (target.id === 'twitter-textarea') this.updateCharacterCount('twitter', target.value);
    if (target.id === 'threads-textarea') this.updateCharacterCount('threads', target.value);
  }

  private handleTwitterPremiumToggle() {
    if(!this.twitterCharCountInput || !this.twitterPremiumCheck) return;
    const isPremium = this.twitterPremiumCheck.checked;
    const counterContainer = document.getElementById('twitter-counter-container');
    this.twitterCharCountInput.max = isPremium ? "25000" : "280";
    this.twitterCharCountInput.value = isPremium ? "4000" : "250";
    if (counterContainer) counterContainer.classList.toggle('hidden', isPremium);
    this.updateCharacterCount('twitter', (document.getElementById('twitter-textarea') as HTMLTextAreaElement)?.value || '');
  }

  private async executePublication(network: TNetwork, text: string, pageId: string | null, targetButton: HTMLButtonElement, progressOptions: { offset: number, total: number } = { offset: 0, total: 1 }) {
    targetButton.setAttribute("disabled", "true");
    const selectedMedia = this.selectedMediaForNetwork[network] || [];
    const isCarousel = (network === 'instagram' || network === 'threads') && selectedMedia.length > 1;

    const steps: string[] = [];
    if (isCarousel) {
        selectedMedia.forEach((file) => {
            steps.push(`Uploading ${file.name}`);
        });
        steps.push(`Publishing Carousel to ${network}`);
    } else if (selectedMedia.length === 1) {
        const isVideo = selectedMedia[0].type.startsWith('video/');
        steps.push(isVideo ? 'Uploading video' : 'Uploading image', `Publishing to ${network}`);
    } else {
        steps.push(`Publishing to ${network}`);
    }

    if (progressOptions.total > 1) {
        updateProgressStep(progressOptions.offset, `Publishing to ${network}...`, 'loading');
    } else {
        showProgressModal(`// Publishing to ${network}`, steps);
    }

    try {
        const body: { [key: string]: any } = { network, text, pageId, postId: this.outputArea?.dataset.postId };

        if (selectedMedia.length > 0) {
            const uploadedMediaUrls: string[] = [];
            for (let i = 0; i < selectedMedia.length; i++) {
                const file = selectedMedia[i];
                const filePath = `public/${this.userId}/${Date.now()}_${file.name}`;
                const { error: uploadError } = await this.supabase.storage.from('post-images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = this.supabase.storage.from('post-images').getPublicUrl(filePath);
                if (!publicUrlData) throw new Error(`Could not get public URL for ${file.name}.`);
                uploadedMediaUrls.push(publicUrlData.publicUrl);
            }
            body.mediaUrls = uploadedMediaUrls;
            body.isCarousel = isCarousel;
        }

        const { data, error } = await this.supabase.functions.invoke("publish-to-social", { body });

        if (error) throw new Error(`Function invocation error: ${error.message}`);
        if (data.status === 'error') throw new Error(data.error);

        if (data.status === 'success') {
            if (progressOptions.total > 1) {
                updateProgressStep(progressOptions.offset, `Published to ${network}!`, 'success');
            } else {
                updateProgressStep(steps.length - 1, 'Published successfully!', 'success');
                setTimeout(hideModal, 1500);
            }
            if (typeof data.remainingPulses === 'number') {
                this.updatePulseDisplay(data.remainingPulses);
                this.currentPulseCount = data.remainingPulses;
            }
            targetButton.innerText = `Published!`;
        }

    } catch (err) {
        const error = err as { message: string };
        if (progressOptions.total > 1) {
            updateProgressStep(progressOptions.offset, `Error: ${error.message.substring(0, 20)}...`, 'error');
        } else {
            const finalStepIndex = steps.length > 0 ? steps.length - 1 : 0;
            updateProgressStep(finalStepIndex, `A critical error occurred: ${error.message}`, 'error');
        }
        targetButton.innerText = `Error!`;
        targetButton.removeAttribute("disabled");
    }
  }

  private async handlePublishAll() {
    const publishAllBtn = document.getElementById('publish-all-btn') as HTMLButtonElement;
    if (!publishAllBtn) return;

    const postCards = Array.from(this.outputArea?.querySelectorAll('[data-network]') || []);
    const publications = postCards.map(card => {
        const network = card.getAttribute('data-network') as TNetwork;
        const text = (card.querySelector('textarea')?.value || '');
        const publishBtn = card.querySelector('.publish-btn') as HTMLButtonElement;
        return { network, text, publishBtn };
    }).filter(p => p.publishBtn && !p.publishBtn.disabled);

    if (publications.length === 0) {
        alert("No posts available to publish.");
        return;
    }

    const confirmButtonId = "confirm-publish-all-btn";
    showModal(
        `// Confirm Publish All`,
        `<p class="text-foreground/80">Are you sure you want to publish to ${publications.length} networks? This will consume ${publications.length} Pulses.</p>`,
        `<button id="cancel-publish-all-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
         <button id="${confirmButtonId}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post All</button>`
    );

    const onCancel = () => {
        hideModal();
        publishAllBtn.removeAttribute("disabled");
    };

    const onConfirm = async () => {
        hideModal();
        publishAllBtn.setAttribute("disabled", "true");
        const steps = publications.map(p => `Publishing to ${p.network}`);
        showProgressModal('// Publishing All Posts', steps);

        for (let i = 0; i < publications.length; i++) {
            const pub = publications[i];
            await this.executePublication(pub.network, pub.text, null, pub.publishBtn, { offset: i, total: publications.length });
        }

        setTimeout(() => {
            hideModal();
            publishAllBtn.innerText = "All Published!";
        }, 2000);
    };

    document.getElementById('cancel-publish-all-btn')?.addEventListener('click', onCancel);
    document.getElementById(confirmButtonId)?.addEventListener('click', onConfirm);
  }

  private async handleOutputAreaClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    if (target.closest('.remove-media-btn')) {
        this.handleRemoveMedia(e);
        return;
    }

    if (target.classList.contains("copy-btn")) {
      const relativeContainer = target.closest(".relative");
      const contentElement = relativeContainer?.querySelector("textarea");
      if (contentElement) {
        navigator.clipboard.writeText(contentElement.value);
        target.innerText = "Copied!";
        setTimeout(() => { target.innerText = "Copy Text"; }, 2000);
      }
    }

    if (target.classList.contains("publish-btn")) {
      const network = target.closest('[data-network]')?.dataset.network as TNetwork;
      const postId = this.outputArea?.dataset.postId;

      const relativeContainer = target.closest(".relative");
      const editedText = relativeContainer?.querySelector("textarea")?.value
      if (!network || !editedText) {
        alert("Cannot publish empty content.");
        return;
      }

      let selectedPageId: string | null = null;
      if (network === 'facebook') {
        const selector = document.getElementById('facebook-page-selector') as HTMLSelectElement;
        if (selector && selector.value) {
          selectedPageId = selector.value;
        } else if (selector) {
          alert('Please select a Facebook Page to post to.');
          return;
        }
      }

      const confirmButtonId = "confirm-publish-btn";
      showModal(
        `// Confirm Publication`,
        `<p class="text-foreground/80">Are you sure you want to post this content to ${network}? This will consume 1 Pulse.</p>`,
        `<button id="cancel-publish-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
         <button id="${confirmButtonId}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post</button>`
      );

      document.getElementById(confirmButtonId)?.addEventListener("click", async () => {
          hideModal();
          await this.executePublication(network, editedText, selectedPageId, target as HTMLButtonElement);
      });

      const cancelBtn = document.getElementById("cancel-publish-btn");
      if (cancelBtn) cancelBtn.addEventListener("click", hideModal);
    }
  }
}
