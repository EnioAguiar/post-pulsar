async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "telegram"
  | "discord";

export class MediaManager {
  private supabase: SupabaseClient;
  private userId: string;
  private userPlan: string;
  public selectedMediaForNetwork: { [key: string]: File[] | null } = {};

  constructor(supabase: SupabaseClient, userId: string, userPlan: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.userPlan = userPlan;
  }

  public init() {
    const outputArea = document.getElementById("content-output");
    outputArea?.addEventListener("change", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("media-upload-input")) {
        this.handleFileUpload(e);
      }
    });
    outputArea?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".remove-media-btn")) {
        this.handleRemoveMedia(e);
      }
    });
  }

  public clearSelectedMedia() {
    this.selectedMediaForNetwork = {};
  }

  public async preloadMedia(mediaMap: { [key: string]: string[] }) {
    if (!mediaMap || Object.keys(mediaMap).length === 0) {
      return;
    }

    for (const network of Object.keys(mediaMap) as TNetwork[]) {
      const urls = mediaMap[network];
      if (!urls || urls.length === 0) {
        continue;
      }

      const networkCard = document.querySelector(
        `[data-network="${network}"]`,
      ) as HTMLElement;
      if (!networkCard) {
        continue;
      }

      const input = networkCard.querySelector(
        ".media-upload-input",
      ) as HTMLInputElement;
      const isMultiple = input?.hasAttribute("multiple");

      const filePromises = urls.map((url) => {
        const filename = url.substring(url.lastIndexOf("/") + 1);
        return urlToFile(url, filename);
      });
      const files = await Promise.all(filePromises);
      this.selectedMediaForNetwork[network] = files;

      if (isMultiple) {
        this.renderCarouselGallery(network, networkCard);
      } else if (files.length > 0) {
        this.renderSinglePreview(network, networkCard, files[0]);
      }
    }
  }

  private handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const featureContainer = input.closest(".media-feature") as HTMLElement;

    if (!featureContainer || !input.files || input.files.length === 0) {
      return;
    }

    const networkCard = featureContainer.closest(
      "[data-network]",
    ) as HTMLElement;
    if (!networkCard) {
      console.error(
        "CRITICAL: Could not find parent network card with [data-network] attribute.",
      );
      return;
    }

    const network = networkCard.dataset.network as TNetwork;
    const files = Array.from(input.files);
    const isMultiple = input.hasAttribute("multiple");

    if (isMultiple) {
      const validatedFiles = files.filter((file) => {
        return this.validateFile(file, network);
      });

      if (this.userPlan === "basic" && network === "instagram") {
        this.selectedMediaForNetwork[network] = validatedFiles.slice(0, 1);
      } else {
        const currentFiles = this.selectedMediaForNetwork[network] || [];
        currentFiles.push(...validatedFiles);
        this.selectedMediaForNetwork[network] = currentFiles;
      }

      this.renderCarouselGallery(network, networkCard);
    } else {
      // Logic for single file inputs
      const file = files[0];
      if (!this.validateFile(file, network)) {
        input.value = "";
        return;
      }
      this.selectedMediaForNetwork[network] = [file];
      this.renderSinglePreview(network, networkCard, file);
    }
  }

  private validateFile(file: File, network: TNetwork): boolean {
    const isVideo = file.type.startsWith("video/");
    let maxSize, limit, allowedTypes;

    switch (network) {
      case "discord":
      case "telegram":
        maxSize = network === "discord" ? 8 * 1024 * 1024 : 50 * 1024 * 1024;
        limit = network === "discord" ? "8MB" : "50MB";
        allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "video/mp4",
          "video/quicktime",
          "video/webm",
        ];
        break;
      case "instagram":
      case "threads":
        if (this.userPlan === "basic" && isVideo) return false;
        allowedTypes = isVideo
          ? ["video/mp4", "video/quicktime"]
          : ["image/jpeg", "image/png"];
        maxSize = isVideo ? 200 * 1024 * 1024 : 2 * 1024 * 1024;
        limit = isVideo ? "200MB" : "2MB";
        break;
      default: // LinkedIn, Facebook, Twitter
        allowedTypes = isVideo
          ? ["video/mp4", "video/quicktime"]
          : ["image/jpeg", "image/png"];
        maxSize = isVideo ? 200 * 1024 * 1024 : 2 * 1024 * 1024;
        limit = isVideo ? "200MB" : "2MB";
        break;
    }

    if (!allowedTypes.includes(file.type)) {
      showModal(
        "// Invalid File Type",
        `<p>The file <span class="font-bold">${file.name}</span> has an unsupported type.</p>`,
        `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
      );
      document.getElementById("ok-btn")?.addEventListener("click", hideModal);
      return false;
    }

    if (file.size > maxSize) {
      showModal(
        "// File Too Large",
        `<p>The file <span class="font-bold">${file.name}</span> exceeds the size limit of ${limit}.</p>`,
        `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
      );
      document.getElementById("ok-btn")?.addEventListener("click", hideModal);
      return false;
    }
    return true;
  }

  private renderSinglePreview(
    network: TNetwork,
    networkCard: HTMLElement,
    file: File,
  ) {
    const previewContainer = networkCard.querySelector(
      ".media-preview-container",
    ) as HTMLDivElement;
    if (!previewContainer) return;

    const previewImage = previewContainer.querySelector(
      ".image-preview",
    ) as HTMLImageElement;
    const previewVideo = previewContainer.querySelector(
      ".video-preview",
    ) as HTMLVideoElement;

    if (previewImage) previewImage.classList.add("hidden");
    if (previewVideo) previewVideo.classList.add("hidden");

    const isVideo = file.type.startsWith("video/");
    const objectURL = URL.createObjectURL(file);

    if (isVideo && previewVideo) {
      previewVideo.src = objectURL;
      previewVideo.classList.remove("hidden");
    } else if (!isVideo && previewImage) {
      previewImage.src = objectURL;
      previewImage.classList.remove("hidden");
    }
    previewContainer.classList.remove("hidden");
  }

  private renderCarouselGallery(network: TNetwork, networkCard: HTMLElement) {
    const galleryContainer = networkCard.querySelector(
      ".media-gallery-container",
    );
    if (!galleryContainer) return;

    galleryContainer.innerHTML = "";
    const files = this.selectedMediaForNetwork[network] || [];

    files.forEach((file, index) => {
      const isVideo = file.type.startsWith("video/");
      const objectURL = URL.createObjectURL(file);
      const thumbContainer = document.createElement("div");
      thumbContainer.className = "relative w-24 h-24 border border-border";

      let mediaElement;
      if (isVideo) {
        mediaElement = document.createElement("video");
        mediaElement.src = objectURL;
        mediaElement.className = "w-full h-full object-cover";
      } else {
        mediaElement = document.createElement("img");
        mediaElement.src = objectURL;
        mediaElement.alt = "Media preview";
        mediaElement.className = "w-full h-full object-cover";
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className =
        "remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80 text-xs";
      removeBtn.innerHTML = "X";
      removeBtn.dataset.index = String(index);

      thumbContainer.appendChild(mediaElement);
      thumbContainer.appendChild(removeBtn);
      galleryContainer.appendChild(thumbContainer);
    });
  }

  private handleRemoveMedia(e: Event) {
    const triggerElement = e.target as HTMLElement;
    const featureContainer = triggerElement.closest(
      ".media-feature",
    ) as HTMLElement;
    if (!featureContainer) return;

    const networkCard = featureContainer.closest("[data-network]") as HTMLElement;
    if (!networkCard) return;

    const network = networkCard.dataset.network as TNetwork;
    const input = networkCard.querySelector(
      ".media-upload-input",
    ) as HTMLInputElement;
    const isMultiple = input?.hasAttribute("multiple");

    if (isMultiple) {
      const indexToRemove = parseInt(triggerElement.dataset.index || "-1", 10);
      if (indexToRemove > -1) {
        const files = this.selectedMediaForNetwork[network] || [];
        const fileToRemove = files[indexToRemove];
        if (fileToRemove) {
          const thumb = triggerElement.previousElementSibling as
            | HTMLImageElement
            | HTMLVideoElement;
          if (thumb && thumb.src.startsWith("blob:")) {
            URL.revokeObjectURL(thumb.src);
          }
        }
        files.splice(indexToRemove, 1);
        this.selectedMediaForNetwork[network] = files;
        this.renderCarouselGallery(network, networkCard);
      }
    } else {
      const previewContainer = featureContainer.querySelector(
        ".media-preview-container",
      ) as HTMLDivElement;
      const fileInput = featureContainer.querySelector(
        ".media-upload-input",
      ) as HTMLInputElement;

      const media = previewContainer?.querySelector("img, video") as
        | HTMLImageElement
        | HTMLVideoElement;
      if (media && media.src.startsWith("blob:"))
        URL.revokeObjectURL(media.src);

      if (previewContainer) previewContainer.classList.add("hidden");
      if (fileInput) fileInput.value = "";
      this.selectedMediaForNetwork[network] = null;
    }
  }
}
