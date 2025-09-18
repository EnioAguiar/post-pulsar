import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal, showProgressModal, updateProgressStep, updateProgressBar } from "../modal";
import type { MediaManager } from "./MediaManager";
import { PublishAllManager } from "./PublishAllManager";

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "pinterest"
  | "telegram"
  | "discord";

type TInvokeBody = { [key: string]: any };

export class PublicationManager {
  private supabase: SupabaseClient;
  private userId: string;
  private mediaManager: MediaManager;
  private outputArea: HTMLElement | null;
  private updatePulseDisplayCallback: (count: number) => void;

  constructor(
    supabase: SupabaseClient,
    userId: string,
    mediaManager: MediaManager,
    updatePulseDisplayCallback: (count: number) => void,
  ) {
    this.supabase = supabase;
    this.userId = userId;
    this.mediaManager = mediaManager;
    this.outputArea = document.getElementById("content-output");
    this.updatePulseDisplayCallback = updatePulseDisplayCallback;
  }

  public init() {
    this.outputArea?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "publish-all-btn") {
        this.handlePublishAll();
      }
    });
  }

  public async handlePublishAll() {
    const publishAllBtn = document.getElementById("publish-all-btn") as HTMLButtonElement;
    if (!publishAllBtn || !this.outputArea) return;

    const postCards = Array.from(this.outputArea.querySelectorAll("[data-network]"));
    const publications = postCards
      .map((card) => {
        const network = card.getAttribute("data-network") as TNetwork;
        const text = card.querySelector("textarea")?.value || "";
        const publishBtn = card.querySelector(".publish-btn") as HTMLButtonElement;
        let pageId: string | null = null;
        if (network === "facebook") {
          const selector = document.getElementById("facebook-page-selector") as HTMLSelectElement;
          if (selector && selector.value) pageId = selector.value;
        }
        return { network, text, pageId, publishBtn };
      })
      .filter((p) => p.publishBtn && !p.publishBtn.disabled);

    if (publications.length === 0) {
      alert("No posts available to publish.");
      return;
    }

    const facebookPub = publications.find((p) => p.network === "facebook");
    if (facebookPub && !facebookPub.pageId) {
      if (document.getElementById("facebook-page-selector")) {
        alert("Please select a Facebook Page before using 'Publish All'.");
        return;
      }
    }

    const confirmButtonId = "confirm-publish-all-btn";
    showModal(
      `// Confirm Publish All`,
      `<p class="text-foreground/80">Are you sure you want to publish to ${publications.length} networks? This will consume ${publications.length} Pulses.</p>`,
      `<button data-modal-close class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
       <button id="${confirmButtonId}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post All</button>`,
    );

    document.getElementById(confirmButtonId)?.addEventListener("click", async () => {
      hideModal();
      publishAllBtn.setAttribute("disabled", "true");

      const publishAllManager = new PublishAllManager();
      const networkNames = publications.map((p) => p.network);
      publishAllManager.show(networkNames);

      for (const pub of publications) {
        publishAllManager.updateStatus(pub.network, "loading", "Publishing...");
        
        const result = await this.executePublication(
          pub.network,
          pub.text,
          pub.pageId,
          pub.publishBtn,
          { offset: 0, total: publications.length } // This now signifies a batch operation
        );

        if (result === "success") {
          publishAllManager.updateStatus(pub.network, "success", "Published!");
        } else {
          publishAllManager.updateStatus(pub.network, "error", "Failed");
        }
      }

      publishAllManager.enableCloseButton();
      publishAllBtn.innerText = "All Done!";
      publishAllBtn.removeAttribute("disabled");
    });
  }

  public async executePublication(
    network: TNetwork,
    text: string,
    pageId: string | null,
    targetButton: HTMLButtonElement,
    progressOptions: { offset: number; total: number } = {
      offset: 0,
      total: 1,
    },
  ): Promise<"success" | "error"> {
    targetButton.setAttribute("disabled", "true");
    const selectedMedia = this.mediaManager?.selectedMediaForNetwork[network] || [];
    const isCarousel = (network === "instagram" || network === "threads") && selectedMedia.length > 1;

    const steps: string[] = [];
    let stepOffset = 0;
    if (isCarousel) {
      selectedMedia.forEach((file) => {
        const isVideo = file.type.startsWith("video/");
        const needsConversion = isVideo && [ "instagram", "threads", "linkedin", "facebook" ].includes(network);
        steps.push(`Uploading ${file.name}`);
        if (needsConversion) {
          steps.push(`Converting ${file.name}`);
        }
      });
      steps.push(`Publishing Carousel to ${network}`);
    } else if (selectedMedia.length === 1) {
      const isVideo = selectedMedia[0].type.startsWith("video/");
      if (isVideo && [ "instagram", "threads", "linkedin", "facebook" ].includes(network)) {
        steps.push("Uploading raw video", "Requesting conversion", "Processing video", `Publishing to ${network}`);
      } else {
        steps.push(isVideo ? "Uploading video" : "Uploading image", `Publishing to ${network}`);
      }
    } else {
      steps.push(`Publishing to ${network}`);
    }

    if (progressOptions.total === 1) {
      showProgressModal(`// Publishing to ${network}`, steps);
    }

    try {
      const sourceUrlInput = document.getElementById("post-url") as HTMLInputElement;
      const languageSelector = document.getElementById("content-language") as HTMLSelectElement;

      const fullContent: { [key: string]: string } = {};
      this.outputArea?.querySelectorAll("div[data-network]").forEach((card) => {
        const network = card.getAttribute("data-network");
        const textarea = card.querySelector("textarea");
        if (network && textarea) {
          fullContent[network] = textarea.value;
        }
      });

      const body: TInvokeBody = {
        network,
        text,
        pageId,
        fullContent,
        sourceUrl: sourceUrlInput?.value,
        language: languageSelector?.value,
        mediaUrls: [],
        isCarousel: false,
      };

      if (selectedMedia.length > 0 && this.userId) {
        const uploadedMediaUrls: string[] = [];
        const totalSteps = steps.length;
        let completedSteps = 0;

        for (let i = 0; i < selectedMedia.length; i++) {
          const file = selectedMedia[i];
          const isVideo = file.type.startsWith("video/");
          const needsConversion = isVideo && [ "instagram", "threads", "linkedin", "facebook" ].includes(network);

          if (progressOptions.total === 1) {
            updateProgressStep(stepOffset, `Uploading ${file.name}...`, "loading");
            updateProgressBar((completedSteps / totalSteps) * 100);
          }

          if (needsConversion) {
            const rawFilePath = `raw-videos/${this.userId}/${Date.now()}_${file.name}`;
            const { error: rawUploadError } = await this.supabase.storage.from("post-images").upload(rawFilePath, file);
            if (rawUploadError) throw new Error(`Raw video upload failed: ${rawUploadError.message}`);
            
            if (progressOptions.total === 1) updateProgressStep(stepOffset, `Uploaded ${file.name}.`, "success");
            completedSteps++;
            if (progressOptions.total === 1) updateProgressBar((completedSteps / totalSteps) * 100);
            stepOffset++;

            if (progressOptions.total === 1) updateProgressStep(stepOffset, `Requesting conversion for ${file.name}...`, "loading");
            
            const { data: rawUrlData } = this.supabase.storage.from("post-images").getPublicUrl(rawFilePath);
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) throw new Error("User session not found.");

            const functionUrl = `${(import.meta as any).env.PUBLIC_SUPABASE_URL}/functions/v1/request-video-conversion`;
            const response = await fetch(functionUrl, {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ videoUrl: rawUrlData.publicUrl, outputFileName: `processed_${Date.now()}.mp4` }),
            });
            if (!response.ok) throw new Error(`Video conversion request failed: ${await response.text()}`);
            
            const conversionData = await response.json();
            uploadedMediaUrls.push(conversionData.publicUrl);
            
            if (progressOptions.total === 1) updateProgressStep(stepOffset, `Conversion complete for ${file.name}.`, "success");
            completedSteps++;
            if (progressOptions.total === 1) updateProgressBar((completedSteps / totalSteps) * 100);
            stepOffset++;
          } else {
            const filePath = `public/${this.userId}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await this.supabase.storage.from("post-images").upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data: publicUrlData } = this.supabase.storage.from("post-images").getPublicUrl(filePath);
            if (!publicUrlData) throw new Error(`Could not get public URL for ${file.name}.`);
            uploadedMediaUrls.push(publicUrlData.publicUrl);

            if (progressOptions.total === 1) updateProgressStep(stepOffset, `Uploaded ${file.name}.`, "success");
            completedSteps++;
            if (progressOptions.total === 1) updateProgressBar((completedSteps / totalSteps) * 100);
            stepOffset++;
          }
        }

        body.mediaUrls = uploadedMediaUrls;
        body.isCarousel = isCarousel;
        if (progressOptions.total === 1) {
          updateProgressStep(stepOffset, "Publishing...", "loading");
          updateProgressBar((completedSteps / totalSteps) * 100);
        }
      } else {
        if (progressOptions.total === 1) {
          updateProgressStep(0, "Publishing...", "loading");
          updateProgressBar(50);
        }
      }

      const { data, error } = await this.supabase.functions.invoke("publish-to-social", { body });

      if (error) throw new Error(`Function invocation error: ${error.message}`);
      if (data.status === "error") {
        if (progressOptions.total === 1) {
            updateProgressStep(steps.length - 1, data.error, "error");
            updateProgressBar(100);
        }
        targetButton.innerText = `Error!`;
        targetButton.removeAttribute("disabled");
        if (data.errorCode === "CONNECTION_NOT_FOUND" && progressOptions.total === 1) {
          showModal(
            `// Connection Error`,
            `<p class="text-foreground/80">${data.error}</p>`,
            `<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
          );
          document.getElementById("error-ok-btn")?.addEventListener("click", hideModal);
        }
        return "error";
      }

      if (data.status === "success") {
        if (progressOptions.total === 1) {
            updateProgressStep(steps.length - 1, "Published successfully!", "success");
            updateProgressBar(100);
        }
        if (typeof data.remainingPulses === "number") {
          this.updatePulseDisplayCallback(data.remainingPulses);
        }
        targetButton.innerText = `Published!`;
        if (progressOptions.total === 1) {
          setTimeout(() => {
            hideModal();
          }, 1500);
        }
        return "success";
      }
      
      // If we reach here, the response was invalid
      throw new Error(`Invalid response from 'publish-to-social': ${JSON.stringify(data)}`);

    } catch (err) {
      const error = err as { message: string };
      if (progressOptions.total === 1) {
        updateProgressStep(steps.length - 1, `A critical error occurred: ${error.message}`, "error");
        updateProgressBar(100);
      }
      targetButton.innerText = `Error!`;
      targetButton.removeAttribute("disabled");
      return "error";
    }
  }
}