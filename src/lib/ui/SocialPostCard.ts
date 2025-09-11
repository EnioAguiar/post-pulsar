// src/lib/ui/SocialPostCard.ts

/**
 * Este módulo é responsável por criar e gerenciar os cards de posts de redes sociais no dashboard.
 * Ele encapsula a lógica de renderização do HTML, contadores de caracteres e interações do usuário
 * para cada card individualmente.
 */

type TNetwork = 'linkedin' | 'twitter' | 'instagram' | 'threads' | 'facebook' | 'pinterest';

const imageUploadHTML = (network: TNetwork): string => {
    const isSingleMedia = ['linkedin', 'twitter', 'facebook', 'pinterest'].includes(network);
    return `
    <div class="mb-4 image-feature">
      <div class="flex items-center gap-2 mb-2">
        <p class="block font-mono text-sm uppercase text-foreground/70">// Upload Image (Optional)</p>
        ${isSingleMedia ? `
        <div class="tooltip-container relative hidden">
            <span class="info-icon cursor-pointer text-red-400">(i)</span>
            <div class="tooltip-text absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-md bg-black px-3 py-2 text-sm text-white opacity-0 transition-opacity pointer-events-none">
                You can only select one type of media (image OR video) for this network.
            </div>
        </div>
        ` : ''}
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
    const isSingleMedia = ['linkedin', 'twitter', 'facebook', 'pinterest'].includes(network);
    return `
    <div class="mb-4 video-feature">
       <div class="flex items-center gap-2 mb-2">
        <p class="block font-mono text-sm uppercase text-foreground/70">// Upload Video (Optional)</p>
        ${isSingleMedia ? `
        <div class="tooltip-container relative hidden">
            <span class="info-icon cursor-pointer text-red-400">(i)</span>
            <div class="tooltip-text absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-md bg-black px-3 py-2 text-sm text-white opacity-0 transition-opacity pointer-events-none">
                You can only select one type of media (image OR video) for this network.
            </div>
        </div>
        ` : ''}
      </div>
      <label for="video-upload-${network}" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
        Choose Video
      </label>
      <input type="file" id="video-upload-${network}" class="media-upload-input hidden" accept="video/mp4,video/quicktime">
      <p class="mt-2 font-mono text-xs text-foreground/50">Max size: 20MB. Accepted: MP4, MOV.</p>
      <div class="media-preview-container relative mt-2 hidden w-fit">
        <video src="#" controls class="video-preview hidden max-h-40 border border-border"></video>
        <button type="button" class="remove-media-btn absolute top-0 right-0 m-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/80">X</button>
      </div>
    </div>
  `;
};


export function createSocialPostCard(network: TNetwork, content: string): string {
    switch (network) {
        case 'linkedin':
            return `
                <div data-network="linkedin">
                  <h3 class="font-mono text-lg text-primary">// LinkedIn Post</h3>
                  <div class="relative mt-2">
                    ${imageUploadHTML('linkedin')}
                    ${videoUploadHTML('linkedin')}
                    <textarea id="linkedin-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="linkedin">Post to LinkedIn</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
        case 'twitter':
            return `
                <div data-network="twitter">
                  <h3 class="font-mono text-lg text-primary">// X (Twitter) Post</h3>
                  <div class="relative mt-2">
                    ${imageUploadHTML('twitter')}
                    ${videoUploadHTML('twitter')}
                    <textarea id="twitter-textarea" class="h-32 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="text-right text-sm font-mono text-foreground/50" id="twitter-counter-container">
                      <span id="twitter-counter">${280 - content.length}</span> characters remaining
                    </div>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="twitter">Post to X</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                    <p class="mt-2 text-xs text-foreground/50">Aviso: A API gratuita do Twitter/X é limitada. Posts duplicados ou que excedam a cota da sua conta de desenvolvedor podem falhar.</p>
                  </div>
                </div>`;
        case 'instagram':
            return `
                <div data-network="instagram">
                  <h3 class="font-mono text-lg text-primary">// Instagram Post</h3>
                  <div class="relative mt-2">
                    <div class="mb-4 media-feature" data-network="instagram">
                      <p class="block font-mono text-sm uppercase text-foreground/70 mb-2">// Upload Media (Carousel)</p>
                      <label for="media-upload-instagram" class="media-upload-label w-full cursor-pointer border border-border bg-transparent p-3 font-mono text-sm uppercase text-foreground transition-colors hover:bg-border/50 inline-block text-center">
                        Choose Images & Videos
                      </label>
                      <input type="file" id="media-upload-instagram" class="media-upload-input hidden" accept="image/jpeg,image/png,video/mp4,video/quicktime" multiple>
                      <p class="mt-2 font-mono text-xs text-foreground/50">You can select up to 10 images and videos to create a carousel.</p>
                      <div class="media-gallery-container mt-2 flex flex-wrap gap-2">
                        <!-- Thumbnails will be injected here by JavaScript -->
                      </div>
                    </div>
                    <textarea id="instagram-textarea" class="h-40 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="instagram">Post to Instagram</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
        case 'threads':
            return `
                <div data-network="threads">
                  <h3 class="font-mono text-lg text-primary">// Threads Post</h3>
                  <div class="relative mt-2">
                    ${imageUploadHTML('threads')}
                    ${videoUploadHTML('threads')}
                    <textarea id="threads-textarea" class="h-40 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="text-right text-sm font-mono text-foreground/50" id="threads-counter-container">
                      <span id="threads-counter">${500 - content.length}</span> characters remaining
                    </div>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="threads">Post to Threads</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
        case 'facebook':
            return `
                <div data-network="facebook">
                  <h3 class="font-mono text-lg text-primary">// Facebook Post</h3>
                  <div class="relative mt-2">
                    ${imageUploadHTML('facebook')}
                    ${videoUploadHTML('facebook')}
                    <textarea id="facebook-textarea" class="h-48 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex items-center gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="facebook">Post to Facebook</button>
                      <div class="facebook-page-selector-container flex-grow"></div>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
        case 'pinterest':
            // Pinterest card is not in the original file, but I will add a placeholder for it based on the other cards.
            return `
                <div data-network="pinterest">
                  <h3 class="font-mono text-lg text-primary">// Pinterest Pin</h3>
                  <div class="relative mt-2">
                    ${imageUploadHTML('pinterest')}
                    ${videoUploadHTML('pinterest')}
                    <textarea id="pinterest-textarea" class="h-32 w-full rounded-none border border-border bg-background p-4 font-mono text-base focus:border-primary focus:outline-none focus:ring-0">${content}</textarea>
                    <div class="mt-2 flex gap-2">
                      <button class="publish-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:bg-gray-500" data-network="pinterest">Post to Pinterest</button>
                      <button class="copy-btn border border-border px-4 py-2 font-mono text-sm uppercase hover:bg-primary hover:text-background">Copy Text</button>
                    </div>
                  </div>
                </div>`;
        default:
            return '';
    }
}