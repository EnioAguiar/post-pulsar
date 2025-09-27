// src/lib/ui/SocialPostCard.ts

import type { IPage } from "./DashboardManager";

/**
 * Este módulo é responsável por criar e gerenciar os cards de posts de redes sociais no dashboard.
 * Ele encapsula a lógica de renderização do HTML, contadores de caracteres e interações do usuário
 * para cada card individualmente.
 */

type TNetwork =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "telegram"
  | "discord";

const singleMediaUploadHTML = (network: TNetwork): string => {
  const acceptedFiles = "image/jpeg,image/png,video/mp4,video/quicktime";
  const description = "Image (max 2MB) or Video (max 200MB).";

  return `
    <div class="mb-4 media-feature" data-network="${network}">
        <p class="block font-mono text-sm uppercase text-foreground/70 mb-2">// Upload Media (Optional)</p>
        <label for="media-upload-${network}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
          Choose Image or Video
        </label>
        <input type="file" id="media-upload-${network}" class="media-upload-input hidden" accept="${acceptedFiles}">
        <p class="mt-2 font-mono text-xs text-foreground/50">${description}</p>
        <div class="media-preview-container relative mt-2 hidden w-fit">
            <img src="#" alt="Image Preview" class="image-preview hidden max-h-40 border border-border"/>
            <video src="#" controls class="video-preview hidden max-h-40 border border-border"></video>
            <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
        </div>
    </div>
  `;
};

const flexibleMediaUploadHTML = (network: TNetwork): string => {
  const limit = network === "discord" ? "8MB" : "50MB";
  const description = `Up to 10 files. Max size per file: ${limit}.`;
  const acceptedFiles =
    "image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm";

  return `
      <div class="mb-4 media-feature" data-network="${network}">
        <p class="block font-mono text-sm uppercase text-foreground/70 mb-2">// Upload Media (Optional)</p>
        <label for="media-upload-${network}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
          Choose Images & Videos
        </label>
        <input type="file" id="media-upload-${network}" class="media-upload-input hidden" accept="${acceptedFiles}" multiple>
        <p class="mt-2 font-mono text-xs text-foreground/50">${description}</p>
        <div class="media-gallery-container mt-2 flex flex-wrap gap-2">
          <!-- Thumbnails will be injected here by JavaScript -->
        </div>
      </div>
  `;
};

export function createSocialPostCard(
  network: TNetwork,
  content: string,
  plan: string,
  connections: IPage[] = [],
): string {
  switch (network) {
    case "linkedin":
      return `
                <div data-network="linkedin">
                  <h3 class="font-mono text-lg text-primary">// LinkedIn Post</h3>
                  <div class="relative mt-2">
                    ${singleMediaUploadHTML("linkedin")}
                    <textarea id="linkedin-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="linkedin">Post to LinkedIn</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    case "twitter":
      return `
                <div data-network="twitter">
                  <h3 class="font-mono text-lg text-primary">// X (Twitter) Post</h3>
                  <div class="relative mt-2">
                    ${singleMediaUploadHTML("twitter")}
                    <textarea id="twitter-textarea" class="h-32 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="text-right text-sm font-mono text-foreground/50" id="twitter-counter-container">
                      <span id="twitter-counter">${280 - content.length}</span> characters remaining
                    </div>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="twitter">Post to X</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    case "instagram":
    case "threads": {
      const networkName = network.charAt(0).toUpperCase() + network.slice(1);
      const isThreads = network === "threads";
      let mediaUploadHTML = "";

      if (plan === "pro" || plan === "basic" || network === "instagram") {
        const isPro = plan === "pro";
        const title = isPro ? "// Upload Media (Carousel)" : "// Upload Image";
        const label = isPro ? "Choose Images & Videos" : "Choose Image";
        const acceptedFiles = isPro
          ? "image/jpeg,image/png,video/mp4,video/quicktime"
          : "image/jpeg,image/png";
        const description = isPro
          ? "Up to 10 items. Images (max 2MB): JPG, PNG. Videos (max 200MB): MP4, MOV."
          : "Single image only. Max size: 2MB. Accepted: JPG, PNG.";
        const allowMultiple = isPro ? "multiple" : "";

        mediaUploadHTML = `
                    <div class="mb-4 media-feature" data-network="${network}">
                      <p class="block font-mono text-sm uppercase text-foreground/70 mb-2">${title}</p>
                      <label for="media-upload-${network}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
                        ${label}
                      </label>
                      <input type="file" id="media-upload-${network}" class="media-upload-input hidden" accept="${acceptedFiles}" ${allowMultiple}>
                      <p class="mt-2 font-mono text-xs text-foreground/50">${description}</p>
                      <div class="media-gallery-container mt-2 flex flex-wrap gap-2">
                        <!-- Thumbnails will be injected here by JavaScript -->
                      </div>
                    </div>
                `;
      }

      return `
                <div data-network="${network}">
                  <h3 class="font-mono text-lg text-primary">// ${networkName} Post</h3>
                  <div class="relative mt-2">
                    ${mediaUploadHTML}
                    <textarea id="${network}-textarea" class="h-40 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    ${
                      isThreads
                        ? `
                    <div class="text-right text-sm font-mono text-foreground/50" id="threads-counter-container">
                      <span id="threads-counter">${500 - content.length}</span> characters remaining
                    </div>
                    `
                        : ""
                    }
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="${network}">Post to ${networkName}</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    }
    case "facebook":
      return `
                <div data-network="facebook">
                  <h3 class="font-mono text-lg text-primary">// Facebook Post</h3>
                  <div class="relative mt-2">
                    ${singleMediaUploadHTML("facebook")}
                    <textarea id="facebook-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex items-center gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="facebook">Post to Facebook</button>
                      <button id="facebook-page-select-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Select Page</button>
                      <span id="facebook-selected-page" class="font-mono text-sm text-foreground/70"></span>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    case "telegram": {
      let buttonHTML;
      if (connections.length > 1) {
        buttonHTML = `<button id="telegram-destination-select-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Select Destination(s)</button>`;
      } else {
        const connectionId = connections[0]?.provider_user_id || "";
        buttonHTML = `<button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="telegram" data-connection-id="${connectionId}">Post to Telegram</button>`;
      }

      return `
                <div data-network="telegram">
                  <h3 class="font-mono text-lg text-primary">// Telegram Post</h3>
                  <div class="relative mt-2">
                    ${singleMediaUploadHTML("telegram")}
                    <textarea id="telegram-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="text-right text-sm font-mono text-foreground/50" id="telegram-counter-container">
                      <span id="telegram-counter">${4096 - content.length}</span> characters remaining
                    </div>
                    <div class="mt-2 flex items-center gap-2">
                      ${buttonHTML}
                      <span id="telegram-selected-destinations" class="font-mono text-sm text-foreground/70"></span>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    }
    case "discord": {
      let buttonHTML;
      if (connections.length > 1) {
        buttonHTML = `<button id="discord-destination-select-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Select Destination(s)</button>`;
      } else {
        const connectionId = connections[0]?.provider_user_id || "";
        buttonHTML = `<button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="discord" data-connection-id="${connectionId}">Post to Discord</button>`;
      }
      return `
                <div data-network="discord">
                  <h3 class="font-mono text-lg text-primary">// Discord Post</h3>
                  <div class="relative mt-2">
                    ${flexibleMediaUploadHTML("discord")}
                    <textarea id="discord-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex items-center gap-2">
                      ${buttonHTML}
                      <span id="discord-selected-destinations" class="font-mono text-sm text-foreground/70"></span>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    }
    default:
      return "";
  }
}
