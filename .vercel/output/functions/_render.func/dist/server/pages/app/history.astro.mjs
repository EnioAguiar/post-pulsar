/* empty css                                          */
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead, l as renderScript } from '../../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../../chunks/Layout_imwEykeh.mjs';
import { $ as $$Modal } from '../../chunks/Modal_qAalKGFe.mjs';
export { renderers } from '../../renderers.mjs';

const $$History = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Post History // PostPulsar" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container py-12"> <div class="flex items-center justify-between"> <h1 class="text-3xl font-bold uppercase">// Post History</h1> <a href="/app" class="font-mono text-sm uppercase text-foreground/70 hover:text-primary">&lt; Back to Dashboard</a> </div> <p class="mt-2 text-foreground/70">
Manage your previously generated posts. Your history is automatically
      managed, keeping the latest 20 posts.
</p> <div id="history-container" class="mt-8 space-y-6"> <!-- Posts will be loaded here by client-side script --> <div class="border border-dashed border-border p-8 text-center"> <p class="font-mono text-foreground/70">Loading history...</p> </div> </div> </main> ${renderComponent($$result2, "Modal", $$Modal, {})} ${renderScript($$result2, "/home/enio/projetos/post-pulsar/src/pages/app/history.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "/home/enio/projetos/post-pulsar/src/pages/app/history.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/app/history.astro";
const $$url = "/app/history";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$History,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
