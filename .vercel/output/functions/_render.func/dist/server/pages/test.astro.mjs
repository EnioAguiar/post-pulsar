/* empty css                                       */
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_CFeEkBdL.mjs';
export { renderers } from '../renderers.mjs';

const $$Test = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Test Page // PostPulsar" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container py-12"> <h1 class="text-3xl font-bold uppercase">// This is a Test Page</h1> <p>If you see this, new routes are working!</p> </main> ` })}`;
}, "/home/enio/projetos/post-pulsar/src/pages/test.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/test.astro";
const $$url = "/test";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Test,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
