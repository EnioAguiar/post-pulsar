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

  private async handlePulsarSubmit(e: Event) {
    e.preventDefault();
    this.selectedMediaForNetwork = {};
    if (!this.submitButton || !this.outputArea || !this.urlInput) return;

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
      const bodyPayload: { [key: string]: string | number } = {
        url: this.urlInput.value,
        contentLanguage: this.contentLanguageInput.value,
        hashtagLanguage: this.hashtagLanguageInput.value,
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
    console.log(`[DEBUG] displayGeneratedContent received postId: ${postId}`); // LOG 1
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
      <h2 class="text-2xl font-bold uppercase">// Transmission Received</h2>
      <div class="mt-4 space-y-6">
        ${cardsHTML}
      </div>
    `;

    this.updateCharacterCount('twitter', content.twitter);
    this.updateCharacterCount('threads', content.threads);
    this.loadFacebookPages();
    this.updateUIAccess(this.userPlan);
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
    console.log("--- handleFileUpload START ---");
    const input = e.target as HTMLInputElement;
    const featureContainer = input.closest('.media-feature, .image-feature, .video-feature') as HTMLElement;

    if (!featureContainer || !input.files || input.files.length === 0) {
        console.log("No file selected or container not found. Exiting.");
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
        console.log(`Carousel network detected: ${network}. Handling multiple files.`);
        const currentFiles = this.selectedMediaForNetwork[network] || [];
        
        const validatedFiles = files.filter(file => {
            const isVideo = file.type.startsWith('video/');
            const allowedTypes = isVideo ? ["video/mp4", "video/quicktime"] : ["image/jpeg", "image/png"];
            const maxSize = isVideo ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
            if (!allowedTypes.includes(file.type)) {
                alert(`Error: File ${file.name} has an unsupported type. Only JPG, PNG, MP4, or MOV are allowed.`);
                return false;
            }
            if (file.size > maxSize) {
                alert(`Error: File ${file.name} exceeds the size limit.`);
                return false;
            }
            return true;
        });

        currentFiles.push(...validatedFiles);
        this.selectedMediaForNetwork[network] = currentFiles;
        this.renderCarouselGallery(network, networkCard);

    } else { // Logic for single media networks
        const file = files[0];
        const isVideo = file.type.startsWith('video/');
        console.log(`Single media network: ${network}, isVideo: ${isVideo}, File: ${file.name}`);

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
        const maxSize = isVideo ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
        if (!allowedTypes.includes(file.type) || file.size > maxSize) {
            alert("File is invalid (type or size).");
            input.value = "";
            this.handleRemoveMedia(e); // Reset UI
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
    console.log("--- handleFileUpload END ---");
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
      console.log("--- handleRemoveMedia START ---");
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
      console.log("--- handleRemoveMedia END ---");
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

  private mapApiErrorToUserMessage(rawMessage: string): string {
    try {
        // First, check for our custom session expired message
        if (rawMessage.includes("SESSION_EXPIRED")) {
            const networkName = rawMessage.split(" ").pop()?.replace('.', '');
            return `Your session for ${networkName} has expired. Please go to the connections page to link your account again.`;
        }

        // Then, try to parse the message as JSON, as it might be a stringified JSON from the backend
        const errorObj = JSON.parse(rawMessage);
        const subcode = errorObj?.error?.error_subcode || errorObj?.details?.error_subcode;

        switch (subcode) {
            case 2207004: return "The image is too large. It should be less than 8 MiB.";
            case 2207026: return "The video format is not supported. Please check the requirements and try again.";
            case 2207042: return "You have reached the daily publishing limit for this account.";
            case 2207008: return "The media container expired. Please try publishing again.";
            case 2207050: return "This Instagram account is restricted. Please log in to the Instagram app to resolve any issues.";
            default: break; // Fall through to generic messages
        }

        // Handle the generic video processing failure we've been seeing
        if (errorObj?.details?.status_code === 'ERROR') {
            return "Instagram failed to process the video. This can be due to temporary instability on their side or an unsupported video specification. Please try again later.";
        }

    } catch {
        // The error message was not a JSON string, so we treat it as a plain text message.
    }

    // Fallback for non-JSON messages or unmapped codes
    if (rawMessage.includes("INSUFFICIENT_PULSES")) {
        return "You do not have enough Pulses to perform this action.";
    }

    return "An unexpected error occurred. Please check the console for details.";
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
          target.setAttribute("disabled", "true");
          
          const selectedMedia = this.selectedMediaForNetwork[network] || [];
          const isCarousel = (network === 'instagram' || network === 'threads') && selectedMedia.length > 1;

          const steps: string[] = [];
          let stepOffset = 0;
          if (isCarousel) {
              selectedMedia.forEach((file) => {
                  const isVideo = file.type.startsWith('video/');
                  const needsConversion = isVideo && ['instagram', 'threads', 'linkedin', 'facebook'].includes(network);
                  steps.push(`Uploading ${file.name}`);
                  if (needsConversion) {
                      steps.push(`Converting ${file.name}`);
                  }
              });
              steps.push(`Publishing Carousel to ${network}`);
          } else if (selectedMedia.length === 1) {
            const isVideo = selectedMedia[0].type.startsWith('video/');
            if (isVideo && ['instagram', 'threads', 'linkedin', 'facebook'].includes(network)) {
                steps.push('Uploading raw video', 'Requesting conversion', 'Processing video', `Publishing to ${network}`);
            } else {
                steps.push(isVideo ? 'Uploading video' : 'Uploading image', `Publishing to ${network}`);
            }
          } else {
            steps.push(`Publishing to ${network}`);
          }
          showProgressModal(`// Publishing to ${network}`, steps);

          try {
            const body: { [key: string]: string | string[] | boolean | null | undefined } = { network, text: editedText, pageId: selectedPageId, postId };

            if (selectedMedia.length > 0) {
                const uploadedMediaUrls: string[] = [];
                const totalSteps = steps.length;
                let completedSteps = 0;

                for (let i = 0; i < selectedMedia.length; i++) {
                    const file = selectedMedia[i];
                    const isVideo = file.type.startsWith('video/');
                    const needsConversion = isVideo && ['instagram', 'threads', 'linkedin', 'facebook'].includes(network);
                    
                    updateProgressStep(stepOffset, `Uploading ${file.name}...`, 'loading');
                    updateProgressBar((completedSteps / totalSteps) * 100);

                    if (needsConversion) {
                        const rawFilePath = `raw-videos/${this.userId}/${Date.now()}_${file.name}`;
                        const { error: rawUploadError } = await this.supabase.storage.from('post-images').upload(rawFilePath, file);
                        if (rawUploadError) throw new Error(`Raw video upload failed: ${rawUploadError.message}`);
                        updateProgressStep(stepOffset, `Uploaded ${file.name}.`, 'success');
                        completedSteps++;
                        updateProgressBar((completedSteps / totalSteps) * 100);
                        stepOffset++;

                        updateProgressStep(stepOffset, `Requesting conversion for ${file.name}...`, 'loading');
                        const { data: rawUrlData } = this.supabase.storage.from('post-images').getPublicUrl(rawFilePath);
                        
                        const { data: { session } } = await this.supabase.auth.getSession();
                        if (!session) throw new Error("User session not found. Please log in again.");

                        const functionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/request-video-conversion`;
                        const response = await fetch(functionUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ videoUrl: rawUrlData.publicUrl, outputFileName: `processed_${Date.now()}.mp4` })
                        });
                        if (!response.ok) throw new Error(`Video conversion request failed: ${await response.text()}`);
                        
                        const conversionData = await response.json();
                        uploadedMediaUrls.push(conversionData.publicUrl);
                        updateProgressStep(stepOffset, `Conversion complete for ${file.name}.`, 'success');
                        completedSteps++;
                        updateProgressBar((completedSteps / totalSteps) * 100);
                        stepOffset++;

                    } else {
                        const filePath = `public/${this.userId}/${Date.now()}_${file.name}`;
                        const { error: uploadError } = await this.supabase.storage.from('post-images').upload(filePath, file);
                        if (uploadError) throw uploadError;
                        const { data: publicUrlData } = this.supabase.storage.from('post-images').getPublicUrl(filePath);
                        if (!publicUrlData) throw new Error(`Could not get public URL for ${file.name}.`);
                        uploadedMediaUrls.push(publicUrlData.publicUrl);
                        updateProgressStep(stepOffset, `Uploaded ${file.name}.`, 'success');
                        completedSteps++;
                        updateProgressBar((completedSteps / totalSteps) * 100);
                        stepOffset++;
                    }
                }

                body.mediaUrls = uploadedMediaUrls;
                body.isCarousel = isCarousel;
                updateProgressStep(stepOffset, 'Publishing...', 'loading');
                updateProgressBar((completedSteps / totalSteps) * 100);

            } else {
                 updateProgressStep(0, 'Publishing...', 'loading');
                 updateProgressBar(50); // Assume 50% for text-only posts
            }

            const { data, error } = await this.supabase.functions.invoke("publish-to-social", { body });

            // Handle function invocation errors (network, etc.)
            if (error) {
                throw new Error(`Function invocation error: ${error.message}`);
            }

            // Handle application-level errors returned by the function
            if (data.status === 'error') {
                const finalStepIndex = steps.length - 1;
                // Use the specific error message from the backend
                updateProgressStep(finalStepIndex, data.error, 'error');
                updateProgressBar(100);
                target.innerText = `Error!`;
                target.removeAttribute("disabled");

                // Special handling for session expired, as it needs a custom modal
                if (data.errorCode === "CONNECTION_NOT_FOUND") {
                    showModal(`// Connection Error`, `<p class="text-foreground/80">${data.error}</p>`, `<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`);
                    const errorOkBtn = document.getElementById("error-ok-btn");
                    if (errorOkBtn) errorOkBtn.addEventListener("click", hideModal);
                }
                return; // Stop execution
            }

            // Handle success
            if (data.status === 'success') {
                updateProgressStep(steps.length - 1, 'Published successfully!', 'success');
                updateProgressBar(100);

                if (typeof data.remainingPulses === 'number') {
                    this.updatePulseDisplay(data.remainingPulses);
                    this.currentPulseCount = data.remainingPulses;
                }

                setTimeout(() => {
                    hideModal();
                    target.innerText = `Published!`;
                }, 1500);
            }

          } catch (err) {
            const error = err as { message: string };
            const finalStepIndex = steps.length - 1;
            // This catch block now handles critical client-side errors (e.g., upload) or function invocation errors
            updateProgressStep(finalStepIndex, `A critical error occurred: ${error.message}`, 'error');
            updateProgressBar(100);
            target.innerText = `Error!`;
            target.removeAttribute("disabled");
          }
        });

      const cancelBtn = document.getElementById("cancel-publish-btn");
      if (cancelBtn) cancelBtn.addEventListener("click", hideModal);
    }
  }
}
