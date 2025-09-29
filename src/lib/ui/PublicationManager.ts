import type { SupabaseClient } from "@supabase/supabase-js";
import {
  showModal,
  hideModal,
  showProgressModal,
  updateProgressStep,
  updateProgressBar,
} from "../modal";
import type { MediaManager } from "./MediaManager";
import type { DashboardManager } from "./DashboardManager";
import { PublishAllManager, type IPublicationTarget } from "./PublishAllManager";

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "telegram"
  | "discord";

type TInvokeBody = { [key: string]: any };

export class PublicationManager {
  private supabase: SupabaseClient;
  private userId: string;
  private mediaManager: MediaManager;
  private dashboardManager: DashboardManager;
  private outputArea: HTMLElement | null;
  private updatePulseDisplayCallback: (count: number) => void;

  constructor(
    supabase: SupabaseClient,
    userId: string,
    mediaManager: MediaManager,
    dashboardManager: DashboardManager,
    updatePulseDisplayCallback: (count: number) => void,
  ) {
    this.supabase = supabase;
    this.userId = userId;
    this.mediaManager = mediaManager;
    this.dashboardManager = dashboardManager;
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

  private getCharacterLimit(network: TNetwork): number | null {
    if (network === "threads") return 500;
    if (network === "twitter") {
      const isPremium = this.dashboardManager.isTwitterPremium();
      return isPremium ? 25000 : 280;
    }
    if (network === "telegram") {
      const isMedia = this.dashboardManager.isTelegramMedia();
      return isMedia ? 1024 : 4096;
    }
    return null; // No limit for other networks
  }

  public async handlePublishAll() {
    const publishAllBtn = document.getElementById(
      "publish-all-btn",
    ) as HTMLButtonElement;
    if (!publishAllBtn || !this.outputArea) return;

    const postCards = Array.from(
      this.outputArea.querySelectorAll("[data-network]"),
    );

    const publications: (IPublicationTarget & { text: string, publishBtn: HTMLButtonElement })[] = [];

    for (const card of postCards) {
      const network = card.getAttribute("data-network") as TNetwork;
      const text = card.querySelector("textarea")?.value || "";
      const publishBtn = card.querySelector(
        ".publish-btn",
      ) as HTMLButtonElement;

      if (!publishBtn || publishBtn.disabled) continue;

      const hasMultipleConnections =
        publishBtn.dataset.hasMultipleConnections === "true";

      if (hasMultipleConnections) {
        const connections = network === 'telegram'
            ? this.dashboardManager.telegramConnections
            : this.dashboardManager.discordConnections;

        for (const conn of connections) {
            publications.push({
                network,
                text,
                publishBtn,
                id: conn.provider_user_id,
                name: conn.provider_user_name,
            });
        }
      } else {
        const targetId = network === "facebook"
            ? this.dashboardManager.selectedFacebookPage?.id
            : network; // Use network name as ID for single-target networks
        const targetName = network === "facebook"
            ? this.dashboardManager.selectedFacebookPage?.name
            : network;

        publications.push({
            network,
            text,
            publishBtn,
            id: targetId || network,
            name: targetName || network,
        });
      }
    }

    if (publications.length === 0) {
      showModal(
        "// Nothing to Publish",
        `<p class="text-foreground/80">No posts are available to be published.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    // Character limit validation
    const offendingNetworks: string[] = [];
    for (const pub of publications) {
      const limit = this.getCharacterLimit(pub.network as TNetwork);
      if (limit !== null && pub.text.length > limit) {
        offendingNetworks.push(pub.network);
      }
    }

    if (offendingNetworks.length > 0) {
      showModal(
        `// Character Limit Exceeded`,
        `<p class="text-foreground/80">The following posts are over the character limit. Please shorten them before using Publish All:</p><ul class="mt-2 list-disc list-inside">${offendingNetworks.map((n) => `<li><strong>${n}</strong></li>`).join("")}</ul>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    const facebookIsTargeted = publications.some(
      (p) => p.network === "facebook",
    );
    if (facebookIsTargeted && !this.dashboardManager.selectedFacebookPage) {
      showModal(
        "// Action Required",
        `<p class="text-foreground/80">Please select a Facebook Page before using 'Publish All'.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      return;
    }

    const confirmButtonId = "confirm-publish-all-btn";
    showModal(
      `// Confirm Publish All`,
      `<p class="text-foreground/80">Are you sure you want to publish to ${publications.length} destinations? This will consume ${publications.length} Pulses.</p>`,
      `<button data-modal-close class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-gray-800">Cancel</button>
       <button id="${confirmButtonId}" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">Confirm & Post All</button>`,
    );

    document
      .getElementById(confirmButtonId)
      ?.addEventListener("click", async () => {
        hideModal();
        publishAllBtn.setAttribute("disabled", "true");

        const publishAllManager = new PublishAllManager();
        publishAllManager.show(publications);

        // Set all to "Publishing..." state immediately
        publications.forEach((pub) => {
          publishAllManager.updateStatus(pub, "loading", "Publishing...");
        });

        // Create an array of publication promises with individual UI updates
        const publicationPromises = publications.map((pub) => {
          const connectionTargetId = ["telegram", "discord", "facebook"].includes(pub.network) ? pub.id : null;
          return this.executePublication(
            pub.network as TNetwork,
            pub.text,
            connectionTargetId,
            pub.publishBtn,
            { offset: 0, total: publications.length },
          ).then((result) => {
            if (result === "success") {
              publishAllManager.updateStatus(
                pub,
                "success",
                "Published!",
              );
            } else {
              publishAllManager.updateStatus(pub, "error", "Failed");
            }
          });
        });

        // Wait for all promises to settle before concluding
        await Promise.all(publicationPromises);

        publishAllManager.enableCloseButton();
        this.dashboardManager.clearContentOutput(); // Clear the dashboard in the background
        publishAllBtn.innerText = "All Done!";
        publishAllBtn.removeAttribute("disabled");
      });
  }

  public async executePublication(
    network: TNetwork,
    text: string,
    connectionTargetId: string | null,
    targetButton: HTMLButtonElement,
    progressOptions: { offset: number; total: number } = {
      offset: 0,
      total: 1,
    },
  ): Promise<"success" | "error"> {
    const selectedMediaItems =
      this.mediaManager?.selectedMediaForNetwork[network] || [];

    if (network === "instagram" && selectedMediaItems.length === 0) {
      showModal(
        "// Action Required",
        `<p class="text-foreground/80">Instagram requires at least one image or video to publish.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      targetButton.removeAttribute("disabled");
      return "error";
    }

    if (network === "facebook" && !connectionTargetId) {
      showModal(
        "// Action Required",
        `<p class="text-foreground/80">Please select a Facebook Page to publish to.</p>`,
        `<button data-modal-close class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase text-background">OK</button>`,
      );
      targetButton.removeAttribute("disabled");
      return "error";
    }

    targetButton.setAttribute("disabled", "true");
    const isCarousel =
      (network === "instagram" || network === "threads") &&
      selectedMediaItems.length > 1;

    const steps: string[] = [];
    let stepOffset = 0;
    if (isCarousel) {
      selectedMediaItems.forEach((item) => {
        const isVideo = item.file.type.startsWith("video/");
        const needsConversion =
          isVideo &&
          ["instagram", "threads", "linkedin", "facebook"].includes(network);
        steps.push(`Uploading ${item.file.name}`);
        if (needsConversion) {
          steps.push(`Converting ${item.file.name}`);
        }
      });
      steps.push(`Publishing Carousel to ${network}`);
    } else if (selectedMediaItems.length === 1) {
      const isVideo = selectedMediaItems[0].file.type.startsWith("video/");
      if (
        isVideo &&
        ["instagram", "threads", "linkedin", "facebook"].includes(network)
      ) {
        steps.push(
          "Uploading raw video",
          "Requesting conversion",
          "Processing video",
          `Publishing to ${network}`,
        );
      } else {
        steps.push(
          isVideo ? "Uploading video" : "Uploading image",
          `Publishing to ${network}`,
        );
      }
    } else {
      steps.push(`Publishing to ${network}`);
    }

    if (progressOptions.total === 1) {
      const warnings = `
        <div class="mb-4 border border-yellow-400/50 bg-yellow-400/10 p-3 font-mono text-sm text-yellow-300">
          <p><strong>// Heads Up:</strong></p>
          <p class="mt-1 text-yellow-300/80">Posts with images and especially videos can take several minutes to publish. <strong>Instagram and Threads in particular may experience longer delays.</strong> Please do not close this window.</p>
        </div>
      `;
      showProgressModal(`// Publishing to ${network}`, steps, warnings);
    }

    try {
      const sourceUrlInput = document.getElementById(
        "post-url",
      ) as HTMLInputElement;
      const languageSelector = document.getElementById(
        "content-language",
      ) as HTMLSelectElement;

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
        connectionTargetId: connectionTargetId,
        fullContent,
        sourceUrl: sourceUrlInput?.value,
        language: languageSelector?.value,
        mediaMap: {},
        isCarousel: false,
      };

      if (selectedMediaItems.length > 0 && this.userId) {
        const uploadedMediaUrls: string[] = [];
        const totalSteps = steps.length;
        let completedSteps = 0;

        for (let i = 0; i < selectedMediaItems.length; i++) {
          const mediaItem = selectedMediaItems[i];
          const { file, publicUrl } = mediaItem;

          // If the media item already has a public URL, skip uploading.
          if (publicUrl) {
            uploadedMediaUrls.push(publicUrl);
            if (progressOptions.total === 1) {
              updateProgressStep(stepOffset, `Using existing ${file.name}`, "success");
              completedSteps++;
              if (isCarousel) stepOffset++;
            }
            continue;
          }

          const isVideo = file.type.startsWith("video/");
          const needsConversion =
            isVideo &&
            ["instagram", "threads", "linkedin", "facebook"].includes(network);

          if (progressOptions.total === 1) {
            updateProgressStep(
              stepOffset,
              `Uploading ${file.name}...`,
              "loading",
            );
            updateProgressBar((completedSteps / totalSteps) * 100);
          }

          if (needsConversion) {
            const rawFilePath = `raw-videos/${this.userId}/${Date.now()}_${file.name}`;
            const { error: rawUploadError } = await this.supabase.storage
              .from("post-images")
              .upload(rawFilePath, file);
            if (rawUploadError)
              throw new Error(
                `Raw video upload failed: ${rawUploadError.message}`,
              );

            if (progressOptions.total === 1)
              updateProgressStep(
                stepOffset,
                `Uploaded ${file.name}.`,
                "success",
              );
            completedSteps++;
            if (progressOptions.total === 1)
              updateProgressBar((completedSteps / totalSteps) * 100);
            stepOffset++;

            if (progressOptions.total === 1)
              updateProgressStep(
                stepOffset,
                `Requesting conversion for ${file.name}...`,
                "loading",
              );

            const { data: rawUrlData } = this.supabase.storage
              .from("post-images")
              .getPublicUrl(rawFilePath);
            const {
              data: { session },
            } = await this.supabase.auth.getSession();
            if (!session) throw new Error("User session not found.");

            const functionUrl = `${(import.meta as any).env.PUBLIC_SUPABASE_URL}/functions/v1/request-video-conversion`;
            const response = await fetch(functionUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                videoUrl: rawUrlData.publicUrl,
                outputFileName: `processed_${Date.now()}.mp4`,
              }),
            });
            if (!response.ok)
              throw new Error(
                `Video conversion request failed: ${await response.text()}`,
              );

            const conversionData = await response.json();
            uploadedMediaUrls.push(conversionData.publicUrl);

            if (progressOptions.total === 1)
              updateProgressStep(
                stepOffset,
                `Conversion complete for ${file.name}.`,
                "success",
              );
            completedSteps++;
            if (progressOptions.total === 1)
              updateProgressBar((completedSteps / totalSteps) * 100);
            stepOffset++;
          } else {
            const filePath = this.getUploadPath(network, file);
            const { error: uploadError } = await this.supabase.storage
              .from("post-images")
              .upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = this.supabase.storage
              .from("post-images")
              .getPublicUrl(filePath);
            if (!publicUrlData)
              throw new Error(`Could not get public URL for ${file.name}.`);
            uploadedMediaUrls.push(publicUrlData.publicUrl);

            if (progressOptions.total === 1)
              updateProgressStep(
                stepOffset,
                `Uploaded ${file.name}.`,
                "success",
              );
            completedSteps++;
            if (progressOptions.total === 1)
              updateProgressBar((completedSteps / totalSteps) * 100);
            stepOffset++;
          }
        }

        body.mediaMap = { [network]: uploadedMediaUrls };
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

      const { data, error } = await this.supabase.functions.invoke(
        "publish-to-social",
        { body },
      );

      if (error) throw new Error(`Function invocation error: ${error.message}`);
      if (data.status === "error") {
        if (progressOptions.total === 1) {
          updateProgressStep(steps.length - 1, data.error, "error");
          updateProgressBar(100);
        }
        targetButton.innerText = `Error!`;
        targetButton.removeAttribute("disabled");
        if (
          data.errorCode === "CONNECTION_NOT_FOUND" &&
          progressOptions.total === 1
        ) {
          showModal(
            `// Connection Error`,
            `<p class="text-foreground/80">${data.error}</p>`,
            `<button id="error-ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
          );
          document
            .getElementById("error-ok-btn")
            ?.addEventListener("click", hideModal);
        }
        return "error";
      }

      if (data.status === "success") {
        if (progressOptions.total === 1) {
          updateProgressStep(
            steps.length - 1,
            "Published successfully!",
            "success",
          );
          updateProgressBar(100);
        }
        if (typeof data.remainingPulses === "number") {
          this.updatePulseDisplayCallback(data.remainingPulses);
        }
        targetButton.innerText = `Published!`;
        if (progressOptions.total === 1) {
          setTimeout(() => {
            hideModal();
            this.dashboardManager.clearContentOutput(); // Clear UI on success
          }, 1500);
        }
        return "success";
      }

      throw new Error(
        `Invalid response from 'publish-to-social': ${JSON.stringify(data)}`,
      );
    } catch (err) {
      const error = err as { message: string };
      console.error(`[executePublication] CRITICAL ERROR for ${network}:`, error);
      if (progressOptions.total === 1) {
        updateProgressStep(
          steps.length - 1,
          `A critical error occurred: ${error.message}`,
          "error",
        );
        updateProgressBar(100);
      }
      targetButton.innerText = `Error!`;
      targetButton.removeAttribute("disabled");
      return "error";
    }
  }

  private getUploadPath(network: TNetwork, file: File): string {
    const timestamp = Date.now();
    // Check if filename already starts with a timestamp-like pattern
    const hasTimestamp = /^\d{13}_/.test(file.name);
    const filename = hasTimestamp ? file.name : `${timestamp}_${file.name}`;

    if (network === "discord") {
      return `public/${this.userId}/discord-media/${filename}`;
    }
    if (network === "telegram") {
      return `public/${this.userId}/telegram-media/${filename}`;
    }
    return `public/${this.userId}/${filename}`;
  }
}
