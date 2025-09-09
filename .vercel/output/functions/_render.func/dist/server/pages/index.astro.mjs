/* empty css                                       */
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CrHq6Z9o.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_8_r6tlOF.mjs';
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "PostPulsar // Content Arsenal", "description": "Turn one blog post into content for all your social networks with one click." }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container"> <div class="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center text-center"> <h1 class="max-w-4xl text-5xl font-bold uppercase leading-tight">
DECODE YOUR CONTENT<span class="text-primary">.</span> AMPLIFY YOUR REACH<span class="text-primary">.</span> </h1> <p class="mt-4 max-w-2xl text-lg text-foreground/70">
PostPulsar uses AI to transform your blog articles into a complete
        arsenal of content for social networks. From a single source to a dozen
        outputs.
</p> <div id="cta-buttons" class="mt-8 flex justify-center space-x-4"> <a href="/signup" class="border border-primary bg-primary px-8 py-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80" data-auth="false">Activate Protocol &gt;&gt;</a> <a href="/app" class="border border-primary bg-primary px-8 py-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80" data-auth="true" style="display: none;">Access Dashboard &gt;&gt;</a> </div> </div> </main> ` })}`;
}, "/home/enio/projetos/post-pulsar/src/pages/index.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
