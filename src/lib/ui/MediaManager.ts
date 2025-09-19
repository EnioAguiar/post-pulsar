import type { SupabaseClient } from "@supabase/supabase-js";
import { showModal, hideModal } from "../modal";

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook";

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

      const isCarousel = network === "instagram" || network === "threads";

      if (isCarousel) {
        this.renderCarouselGalleryFromUrls(network, networkCard, urls);
      } else {
        const url = urls[0];
        if (!url) continue;

        // A simple guess based on common extensions.
        const isVideo =
          url.includes(".mp4") ||
          url.includes(".mov") ||
          url.includes(".webm");

        const imageFeature = networkCard.querySelector(
          ".image-feature",
        ) as HTMLElement;
        const videoFeature = networkCard.querySelector(
          ".video-feature",
        ) as HTMLElement;

        if (!imageFeature || !videoFeature) continue;

        const currentFeature = isVideo ? videoFeature : imageFeature;
        const otherFeature = isVideo ? imageFeature : videoFeature;

        currentFeature.classList.remove("hidden");

        const otherInput = otherFeature.querySelector(
          ".media-upload-input",
        ) as HTMLInputElement;
        if (otherInput) {
          otherInput.disabled = true;
        }
        otherFeature
          .querySelector(".media-upload-label")
          ?.classList.add("disabled");
        otherFeature
          .querySelector(".tooltip-container")
          ?.classList.remove("hidden");

        const previewContainer = currentFeature.querySelector(
          ".media-preview-container",
        ) as HTMLElement;
        const previewMedia = previewContainer.querySelector(
          isVideo ? ".video-preview" : ".image-preview",
        ) as HTMLImageElement | HTMLVideoElement;

        if (previewMedia) {
          previewMedia.src = url; // Use the direct URL
          previewMedia.classList.remove("hidden");
          previewContainer.classList.remove("hidden");
        }
      }
    }
  }

  private handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const featureContainer = input.closest(
      ".media-feature, .image-feature, .video-feature",
    ) as HTMLElement;

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
    const isCarousel = network === "instagram" || network === "threads";

    if (isCarousel) {
      const validatedFiles = files.filter((file) => {
        const isVideo = file.type.startsWith("video/");
        if (this.userPlan === "basic" && isVideo) {
          return false;
        }
        const allowedTypes = isVideo
          ? ["video/mp4", "video/quicktime"]
          : ["image/jpeg", "image/png"];
        const maxSize = isVideo ? 200 * 1024 * 1024 : 2 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
          showModal(
            "// Invalid File Type",
            `<p>The file <span class="font-bold">${file.name}</span> has an unsupported type.</p>`,
            `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
          );
          document
            .getElementById("ok-btn")
            ?.addEventListener("click", hideModal);
          return false;
        }
        if (file.size > maxSize) {
          const limit = isVideo ? "200MB" : "2MB";
          showModal(
            "// File Too Large",
            `<p>The file <span class="font-bold">${file.name}</span> exceeds the size limit of ${limit}.</p>`,
            `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
          );
          document
            .getElementById("ok-btn")
            ?.addEventListener("click", hideModal);
          return false;
        }
        return true;
      });

      if (this.userPlan === "basic") {
        this.selectedMediaForNetwork[network] = validatedFiles.slice(0, 1);
      } else {
        const currentFiles = this.selectedMediaForNetwork[network] || [];
        currentFiles.push(...validatedFiles);
        this.selectedMediaForNetwork[network] = currentFiles;
      }

      this.renderCarouselGallery(network, networkCard);
    } else {
      // Logic for single media networks
      const file = files[0];
      const isVideo = file.type.startsWith("video/");

      const imageFeature = networkCard.querySelector(
        ".image-feature",
      ) as HTMLElement;
      const videoFeature = networkCard.querySelector(
        ".video-feature",
      ) as HTMLElement;

      if (!imageFeature || !videoFeature) {
        console.error(
          "CRITICAL: Could not find both .image-feature and .video-feature containers.",
        );
        return;
      }

      const currentFeature = isVideo ? videoFeature : imageFeature;
      const otherFeature = isVideo ? imageFeature : videoFeature;

      const otherInput = otherFeature.querySelector(
        ".media-upload-input",
      ) as HTMLInputElement;
      if (otherInput) {
        otherInput.value = "";
        otherInput.disabled = true;
      }
      otherFeature
        .querySelector(".media-upload-label")
        ?.classList.add("disabled");
      otherFeature
        .querySelector(".tooltip-container")
        ?.classList.remove("hidden");
      const otherPreview = otherFeature.querySelector(
        ".media-preview-container",
      ) as HTMLElement;
      if (otherPreview) otherPreview.classList.add("hidden");

      const currentInput = currentFeature.querySelector(
        ".media-upload-input",
      ) as HTMLInputElement;
      if (currentInput) currentInput.disabled = false;
      currentFeature
        .querySelector(".media-upload-label")
        ?.classList.remove("disabled");
      currentFeature
        .querySelector(".tooltip-container")
        ?.classList.add("hidden");

      const allowedTypes = isVideo
        ? ["video/mp4", "video/quicktime"]
        : ["image/jpeg", "image/png"];
      const maxSize = isVideo ? 200 * 1024 * 1024 : 2 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        showModal(
          "// Invalid File Type",
          `<p>Unsupported type.</p>`,
          `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
        );
        document.getElementById("ok-btn")?.addEventListener("click", hideModal);
        input.value = "";
        this.handleRemoveMedia(e);
        return;
      }

      if (file.size > maxSize) {
        const limit = isVideo ? "200MB" : "2MB";
        showModal(
          "// File Too Large",
          `<p>Exceeds the size limit of ${limit}.</p>`,
          `<button id="ok-btn" class="border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold uppercase">OK</button>`,
        );
        document.getElementById("ok-btn")?.addEventListener("click", hideModal);
        input.value = "";
        this.handleRemoveMedia(e);
        return;
      }

      this.selectedMediaForNetwork[network] = [file];
      const previewContainer = currentFeature.querySelector(
        ".media-preview-container",
      ) as HTMLDivElement;
      const previewImage = previewContainer?.querySelector(
        ".image-preview",
      ) as HTMLImageElement;
      const previewVideo = previewContainer?.querySelector(
        ".video-preview",
      ) as HTMLVideoElement;

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

  private renderCarouselGalleryFromUrls(
    network: TNetwork,
    networkCard: HTMLElement,
    urls: string[],
  ) {
    const galleryContainer = networkCard.querySelector(
      ".media-gallery-container",
    );
    if (!galleryContainer) return;

    galleryContainer.innerHTML = "";

    urls.forEach((url, index) => {
      const isVideo =
        url.includes(".mp4") || url.includes(".mov") || url.includes(".webm");
      const thumbContainer = document.createElement("div");
      thumbContainer.className = "relative w-24 h-24 border border-border";

      let mediaElement;
      if (isVideo) {
        mediaElement = document.createElement("video");
        mediaElement.src = url;
        mediaElement.className = "w-full h-full object-cover";
      } else {
        mediaElement = document.createElement("img");
        mediaElement.src = url;
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
    const networkCard = triggerElement.closest("[data-network]") as HTMLElement;
    if (!networkCard) return;

    const network = networkCard.dataset.network as TNetwork;
    const isCarousel = network === "instagram" || network === "threads";

    if (isCarousel) {
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
      // Logic for single media networks
      const featureContainer = triggerElement.closest(
        ".image-feature, .video-feature",
      ) as HTMLElement;
      if (!featureContainer) return;

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

      [".image-feature", ".video-feature"].forEach((selector) => {
        const feature = networkCard.querySelector(selector) as HTMLElement;
        if (feature) {
          const input = feature.querySelector(
            ".media-upload-input",
          ) as HTMLInputElement;
          if (input) input.disabled = false;
          feature
            .querySelector(".media-upload-label")
            ?.classList.remove("disabled");
          feature.querySelector(".tooltip-container")?.classList.add("hidden");
        }
      });
    }
  }
}
