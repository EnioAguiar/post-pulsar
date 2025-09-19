import { e as createComponent, l as renderScript, m as maybeRenderHead, r as renderTemplate } from './astro/server_Ci3whAqB.mjs';
import 'kleur/colors';
import 'clsx';

const $$Modal = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderScript($$result, "/home/enio/projetos/post-pulsar/src/components/Modal.astro?astro&type=script&index=0&lang.ts")} ${maybeRenderHead()}<div id="modal-container" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true"> <!-- Backdrop --> <div id="modal-backdrop" class="fixed inset-0 bg-background/80 backdrop-blur-sm"></div> <!-- Modal Panel --> <div id="modal-panel" class="relative w-full max-w-lg border border-border bg-background text-foreground"> <!-- Header --> <div class="flex items-center justify-between border-b border-border p-4"> <h3 id="modal-title" class="font-mono text-xl font-bold uppercase"> <!-- Title goes here --> </h3> <button id="modal-close-btn" type="button" class="p-1 text-foreground/70 transition-colors hover:text-foreground" aria-label="Close">
&times;
</button> </div> <!-- Body --> <div id="modal-body" class="p-6"> <!-- Content goes here --> </div> <!-- Footer --> <div id="modal-footer" class="flex justify-end gap-4 border-t border-border p-4"> <!-- Action buttons go here --> </div> <!-- Progress Bar Footer --> <div id="progress-footer" class="hidden w-full items-center gap-4 border-t border-border p-4"> <div class="h-2 w-full grow overflow-hidden rounded-full bg-border"> <div id="progress-bar" class="h-full bg-primary transition-all duration-500" style="width: 0%"></div> </div> <span id="progress-percentage" class="font-mono text-sm">0%</span> </div> </div> </div>`;
}, "/home/enio/projetos/post-pulsar/src/components/Modal.astro", void 0);

export { $$Modal as $ };
