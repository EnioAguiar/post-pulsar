// src/lib/ui/SocialPostCard.ts

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
  | "pinterest"
  | "telegram"
  | "discord";

const imageUploadHTML = (network: TNetwork): string => {
  const isSingleMedia = [
    "linkedin",
    "twitter",
    "facebook",
    "pinterest",
    "instagram",
    "threads",
  ].includes(network);
  return `
    <div class="mb-4 image-feature">
      <div class="flex items-center gap-2 mb-2">
        <p class="block font-mono text-sm uppercase text-foreground/70">// Upload Image (Optional)</p>
        ${
          isSingleMedia
            ? `
        <div class="tooltip-container relative hidden">
            <span class="info-icon cursor-pointer text-red-400">(i)</span>
            <div class="tooltip-text absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-md bg-black px-3 py-2 text-sm text-white opacity-0 transition-opacity pointer-events-none">
                You can only select one type of media (image OR video) for this network.
            </div>
        </div>
        `
            : ""
        }
      </div>
      <label for="image-upload-${network}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
        Choose Image
      </label>
      <input type="file" id="image-upload-${network}" class="media-upload-input hidden" accept="image/jpeg,image/png">
      <p class="mt-2 font-mono text-xs text-foreground/50">Max size: 2MB. Accepted: JPG, PNG.</p>
      <div class="media-preview-container relative mt-2 hidden w-fit">
        <img src="#" alt="Image Preview" class="image-preview hidden max-h-40 border border-border"/>
        <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
      </div>
    </div>
  `;
};

const videoUploadHTML = (network: TNetwork): string => {
  const isSingleMedia = [
    "linkedin",
    "twitter",
    "facebook",
    "pinterest",
  ].includes(network);
  return `
    <div class="mb-4 video-feature">
       <div class="flex items-center gap-2 mb-2">
        <p class="block font-mono text-sm uppercase text-foreground/70">// Upload Video (Optional)</p>
        ${
          isSingleMedia
            ? `
        <div class="tooltip-container relative hidden">
            <span class="info-icon cursor-pointer text-red-400">(i)</span>
            <div class="tooltip-text absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-md bg-black px-3 py-2 text-sm text-white opacity-0 transition-opacity pointer-events-none">
                You can only select one type of media (image OR video) for this network.
            </div>
        </div>
        `
            : ""
        }
      </div>
      <label for="video-upload-${network}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
        Choose Video
      </label>
      <input type="file" id="video-upload-${network}" class="media-upload-input hidden" accept="video/mp4,video/quicktime">
      <p class="mt-2 font-mono text-xs text-foreground/50">Max size: 200MB. Accepted: MP4, MOV.</p>
      <div class="media-preview-container relative mt-2 hidden w-fit">
        <video src="#" controls class="video-preview hidden max-h-40 border border-border"></video>
        <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
      </div>
    </div>
  `;
};

export function createSocialPostCard(
  network: TNetwork,
  content: string,
  plan: string,
): string {
  switch (network) {
    case "linkedin":
      return `
                <div data-network="linkedin">
                  <h3 class="font-mono text-lg text-primary">// LinkedIn Post</h3>
                  <div class="relative mt-2">
                    ${imageUploadHTML("linkedin")}
                    ${videoUploadHTML("linkedin")}
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
                    ${imageUploadHTML("twitter")}
                    ${videoUploadHTML("twitter")}
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

      if (plan === "pro" || plan === "basic" || network === 'instagram') {
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
                    ${imageUploadHTML("facebook")}
                    ${videoUploadHTML("facebook")}
                    <textarea id="facebook-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex items-center gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="facebook">Post to Facebook</button>
                      <button id="facebook-page-select-btn" class="border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Select Page</button>
                      <span id="facebook-selected-page" class="font-mono text-sm text-foreground/70"></span>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    case "pinterest":
      // Pinterest card is not in the original file, but I will add a placeholder for it based on the other cards.
      return `
                <div data-network="pinterest">
                  <h3 class="font-mono text-lg text-primary">// Pinterest Pin</h3>
                  <div class="relative mt-2">
                    ${imageUploadHTML("pinterest")}
                    ${videoUploadHTML("pinterest")}
                    <textarea id="pinterest-textarea" class="h-32 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="pinterest">Post to Pinterest</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    case "telegram":
      return `
                <div data-network="telegram">
                  <h3 class="font-mono text-lg text-primary">// Telegram Post</h3>
                  <div class="relative mt-2">
                    <textarea id="telegram-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="telegram">Post to Telegram</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    case "discord":
      return `
                <div data-network="discord">
                  <h3 class="font-mono text-lg text-primary">// Discord Post</h3>
                  <div class="relative mt-2">
                    <textarea id="discord-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="discord">Post to Discord</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
    default:
      return "";
  }
}
