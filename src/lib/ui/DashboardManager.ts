import type { SupabaseClient } from '@supabase/supabase-js';
import { showModal, hideModal, showProgressModal, updateProgressStep } from '../modal';
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

      if (this.linkedinCharCountInput.value) bodyPayload.linkedInCharCount = parseInt(this.linkedinCharCountInput.value, 10);
      if (this.twitterCharCountInput.value) bodyPayload.twitterCharCount = parseInt(this.twitterCharCountInput.value, 10);
      if (this.instagramCharCountInput.value) bodyPayload.instagramCharCount = parseInt(this.instagramCharCountInput.value, 10);
      if (this.threadsCharCountInput.value) bodyPayload.threadsCharCount = parseInt(this.threadsCharCountInput.value, 10);
      if (this.facebookCharCountInput.value) bodyPayload.facebookCharCount = parseInt(this.facebookCharCountInput.value, 10);
      if (this.pinterestCharCountInput.value) bodyPayload.pinterestCharCount = parseInt(this.pinterestCharCountInput.value, 10);

      const { data, error } = await this.supabase.functions.invoke("pulsar-v1", { body: bodyPayload });
      if (error) throw error;

      this.currentPulseCount--;
      this.updatePulseDisplay(this.currentPulseCount);

      const { generatedContent } = data;
      this.displayGeneratedContent(generatedContent);

    } catch (err) {
      const error = err as { message: string };
      if(this.outputArea) this.outputArea.innerHTML = `<div class="border border-red-500/50 p-8 text-center"><p class="font-mono font-bold text-red-400">[ERROR]</p><p class="font-mono text-foreground/70 mt-2">${error.message}</p></div>`;
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

  private displayGeneratedContent(content: IGeneratedContent) {
    if (!this.outputArea) return;

    const networks: TNetwork[] = ['linkedin', 'twitter', 'instagram', 'threads', 'facebook', 'pinterest'];
    let cardsHTML = '';

    for (const network of networks) {
        if (content[network]) {
            cardsHTML += createSocialPostCard(network, content[network]);
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
    const featureContainer = input.closest('.image-feature, .video-feature') as HTMLElement;

    if (!featureContainer || !input.files || !input.files[0]) {
        console.log("No file selected or container not found. Exiting.");
        return;
    }

    const networkCard = featureContainer.closest('[data-network]') as HTMLElement;
    if (!networkCard) {
        console.error("CRITICAL: Could not find parent network card with [data-network] attribute.");
        return;
    }

    const network = networkCard.dataset.network as TNetwork;
    const file = input.files[0];
    const isVideo = file.type.startsWith('video/');
    console.log(`Network: ${network}, isVideo: ${isVideo}, File: ${file.name}`);

    const singleMediaNetworks: TNetwork[] = ['linkedin', 'twitter', 'facebook', 'pinterest'];

    if (network && singleMediaNetworks.includes(network)) {
        console.log("Single media network detected. Applying exclusive logic.");
        const imageFeature = networkCard.querySelector('.image-feature') as HTMLElement;
        const videoFeature = networkCard.querySelector('.video-feature') as HTMLElement;
        
        if (!imageFeature || !videoFeature) {
            console.error("CRITICAL: Could not find both .image-feature and .video-feature containers within the network card.");
            return;
        }

        const currentFeature = isVideo ? videoFeature : imageFeature;
        const otherFeature = isVideo ? imageFeature : videoFeature;

        // 1. Reset and disable the OTHER feature
        const otherInput = otherFeature.querySelector('.media-upload-input') as HTMLInputElement;
        const otherLabel = otherFeature.querySelector('.media-upload-label') as HTMLLabelElement;
        const otherInfo = otherFeature.querySelector('.tooltip-container') as HTMLElement;
        const otherPreview = otherFeature.querySelector('.media-preview-container') as HTMLElement;
        
        if (otherInput) {
            otherInput.value = '';
            otherInput.disabled = true;
        }
        if(otherLabel) otherLabel.classList.add('disabled');
        if(otherInfo) otherInfo.classList.remove('hidden');
        if(otherPreview) {
            otherPreview.classList.add('hidden');
            const otherImg = otherPreview.querySelector('img');
            const otherVid = otherPreview.querySelector('video');
            if (otherImg?.src.startsWith('blob:')) URL.revokeObjectURL(otherImg.src);
            if (otherVid?.src.startsWith('blob:')) URL.revokeObjectURL(otherVid.src);
        }

        // 2. Ensure the CURRENT feature is enabled
        const currentInput = currentFeature.querySelector('.media-upload-input') as HTMLInputElement;
        const currentLabel = currentFeature.querySelector('.media-upload-label') as HTMLLabelElement;
        const currentInfo = currentFeature.querySelector('.tooltip-container') as HTMLElement;
        
        if (currentInput) currentInput.disabled = false;
        if(currentLabel) currentLabel.classList.remove('disabled');
        if(currentInfo) currentInfo.classList.add('hidden');
    }

    const previewContainer = featureContainer.querySelector('.media-preview-container') as HTMLDivElement;
    const previewImage = previewContainer?.querySelector('.image-preview') as HTMLImageElement;
    const previewVideo = previewContainer?.querySelector('.video-preview') as HTMLVideoElement;

    if (previewImage) {
      previewImage.classList.add("hidden");
      if (previewImage.src.startsWith("blob:")) URL.revokeObjectURL(previewImage.src);
    }
    if (previewVideo) {
      previewVideo.classList.add("hidden");
      if (previewVideo.src.startsWith("blob:")) URL.revokeObjectURL(previewVideo.src);
    }

    const allowedTypes = isVideo ? ["video/mp4", "video/quicktime"] : ["image/jpeg", "image/png"];
    const maxSize = isVideo ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
    let errorMessage: string | null = null;

    if (!allowedTypes.includes(file.type)) errorMessage = isVideo ? "Only MP4 or MOV videos are allowed." : "Only JPG or PNG images are allowed.";
    if (file.size > maxSize) errorMessage = isVideo ? "Video size cannot exceed 20MB." : "Image size cannot exceed 2MB.";

    if (errorMessage) {
      alert(`Error: ${errorMessage}`);
      input.value = "";
      if (network) this.selectedMediaForNetwork[network] = null;
      if (previewContainer) previewContainer.classList.add("hidden");
      this.handleRemoveMedia(e); // Re-enable both inputs on error
      return;
    }

    if (network) this.selectedMediaForNetwork[network] = file;
    const objectURL = URL.createObjectURL(file);

    if (isVideo) {
      if (previewVideo) {
        previewVideo.src = objectURL;
        previewVideo.classList.remove("hidden");
      }
    } else {
      if (previewImage) {
        previewImage.src = objectURL;
        previewImage.classList.remove("hidden");
      }
    }
    if (previewContainer) previewContainer.classList.remove("hidden");
    console.log("--- handleFileUpload END ---");
  }

  private handleRemoveMedia(e: Event) {
      console.log("--- handleRemoveMedia START ---");
      const triggerElement = e.target as HTMLElement;
      const featureContainer = triggerElement.closest('.image-feature, .video-feature') as HTMLElement;
      if (!featureContainer) return;

      const networkCard = featureContainer.closest('[data-network]') as HTMLElement;
      if (!networkCard) return;

      const network = networkCard.dataset.network as TNetwork;
      const previewContainer = featureContainer.querySelector('.media-preview-container') as HTMLDivElement;
      const previewImage = previewContainer?.querySelector('.image-preview') as HTMLImageElement;
      const previewVideo = previewContainer?.querySelector('.video-preview') as HTMLVideoElement;
      const fileInput = featureContainer.querySelector('.media-upload-input') as HTMLInputElement;

      if (previewImage?.src.startsWith('blob:')) URL.revokeObjectURL(previewImage.src);
      if (previewVideo?.src.startsWith('blob:')) URL.revokeObjectURL(previewVideo.src);

      if (previewImage) { previewImage.src = '#'; previewImage.classList.add('hidden'); }
      if (previewVideo) { previewVideo.src = '#'; previewVideo.classList.add('hidden'); }
      if (previewContainer) previewContainer.classList.add('hidden');
      if (fileInput) fileInput.value = '';
      
      if (network) {
          this.selectedMediaForNetwork[network] = null;
      }

      const singleMediaNetworks: TNetwork[] = ['linkedin', 'twitter', 'facebook', 'pinterest'];
      if (network && singleMediaNetworks.includes(network)) {
          console.log(`Re-enabling all media inputs for ${network}`);
          ['.image-feature', '.video-feature'].forEach(selector => {
              const feature = networkCard.querySelector(selector) as HTMLElement;
              if (feature) {
                  const input = feature.querySelector('.media-upload-input') as HTMLInputElement;
                  const label = feature.querySelector('.media-upload-label') as HTMLLabelElement;
                  const infoIcon = feature.querySelector('.tooltip-container') as HTMLElement;
                  if (input) input.disabled = false;
                  if (label) label.classList.remove('disabled');
                  if (infoIcon) infoIcon.classList.add('hidden');
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
          
          let finalMediaUrl: string | null = null;
          let mediaType: 'IMAGE' | 'VIDEO' | null = null;
          const selectedMedia = this.selectedMediaForNetwork[network] ?? null;
          const isVideo = selectedMedia?.type.startsWith('video/');

          const steps: string[] = [];
          if (isVideo) {
            if (network === 'twitter') {
              steps.push('Uploading video', `Publishing to ${network}`);
            } else {
              steps.push('Uploading raw video', 'Requesting conversion', 'Processing video', `Publishing to ${network}`);
            }
          } else if (selectedMedia) {
            steps.push('Uploading media', `Publishing to ${network}`);
          } else {
            steps.push(`Publishing to ${network}`);
          }
          showProgressModal(`// Publishing to ${network}`, steps);

          try {
            if (selectedMedia) {
                if (isVideo) {
                    if (network === 'twitter') {
                        updateProgressStep(0, 'Uploading video...', 'loading');
                        const filePath = `public/${this.userId}/${Date.now()}_${selectedMedia.name}`;
                        const { error: uploadError } = await this.supabase.storage.from('post-images').upload(filePath, selectedMedia);
                        if (uploadError) throw uploadError;
                        const { data: publicUrlData } = this.supabase.storage.from('post-images').getPublicUrl(filePath);
                        if (!publicUrlData) throw new Error("Could not get public URL for the video.");
                        finalMediaUrl = publicUrlData.publicUrl;
                        mediaType = 'VIDEO';
                        updateProgressStep(0, 'Video uploaded.', 'success');
                        updateProgressStep(1, `Publishing to ${network}...`, 'loading');
                    } else {
                        // Existing conversion flow for other networks
                        updateProgressStep(0, 'Uploading raw video...', 'loading');
                        const rawFilePath = `raw-videos/${this.userId}/${Date.now()}_${selectedMedia.name}`;
                        const { error: rawUploadError } = await this.supabase.storage.from('post-images').upload(rawFilePath, selectedMedia);
                        if (rawUploadError) throw new Error(`Raw video upload failed: ${rawUploadError.message}`);
                        updateProgressStep(0, 'Raw video uploaded.', 'success');

                        const { data: rawUrlData } = this.supabase.storage.from('post-images').getPublicUrl(rawFilePath);
                        
                        updateProgressStep(1, 'Requesting conversion...', 'loading');
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
                        updateProgressStep(1, 'Conversion requested.', 'success');

                        updateProgressStep(2, 'Video is processing... (this may take minutes)', 'loading');
                        finalMediaUrl = conversionData.publicUrl;
                        mediaType = 'VIDEO';
                        updateProgressStep(2, 'Video processed successfully.', 'success');
                        updateProgressStep(3, 'Publishing...', 'loading');
                    }
                } else { // This is for images
                    updateProgressStep(0, 'Uploading image...', 'loading');
                    const filePath = `public/${this.userId}/${Date.now()}_${selectedMedia.name}`;
                    const { error: uploadError } = await this.supabase.storage.from('post-images').upload(filePath, selectedMedia);
                    if (uploadError) throw uploadError;
                    const { data: publicUrlData } = this.supabase.storage.from('post-images').getPublicUrl(filePath);
                    if (!publicUrlData) throw new Error("Could not get public URL for the media.");
                    finalMediaUrl = publicUrlData.publicUrl;
                    mediaType = 'IMAGE';
                    updateProgressStep(0, 'Image uploaded.', 'success');
                    updateProgressStep(1, 'Publishing...', 'loading');
                }
            } else {
                 updateProgressStep(0, 'Publishing...', 'loading');
            }
            
            const body: { [key: string]: string | null } = { network, text: editedText, pageId: selectedPageId };
            if (finalMediaUrl) { 
                body.mediaUrl = finalMediaUrl; 
                body.mediaType = mediaType; 
            }

            const { data, error } = await this.supabase.functions.invoke("publish-to-social", { body });
            if (error) throw error;
            
            updateProgressStep(steps.length - 1, 'Published successfully!', 'success');

            if (data && typeof data.remainingPulses === 'number') {
              this.updatePulseDisplay(data.remainingPulses);
              this.currentPulseCount = data.remainingPulses;
            }

            setTimeout(() => {
                hideModal();
                target.innerText = `Published!`;
            }, 1500);


          } catch (err) {
            const error = err as { message: string };
            const finalStepIndex = steps.length - 1;
            updateProgressStep(finalStepIndex, `Error: ${error.message}`, 'error');
            target.innerText = `Error!`;
            target.removeAttribute("disabled");

            if (error.message?.includes("SESSION_EXPIRED")) {
                const networkName = error.message.split(" ").pop()?.replace('.', '');
                showModal(`// ${networkName} Session Expired`, `<p class="text-foreground/80">Your session for ${networkName} has expired. Please go to the <a href="/app/connections" class="underline">connections page</a> to link your account again.</p>`, `<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`);
            }
            const errorOkBtn = document.getElementById("error-ok-btn");
            if (errorOkBtn) errorOkBtn.addEventListener("click", hideModal);
          }
        });

      const cancelBtn = document.getElementById("cancel-publish-btn");
      if (cancelBtn) cancelBtn.addEventListener("click", hideModal);
    }
  }
}
