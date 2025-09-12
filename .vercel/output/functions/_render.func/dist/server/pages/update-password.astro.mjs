/* empty css                                       */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_CFeEkBdL.mjs';
export { renderers } from '../renderers.mjs';

const $$UpdatePassword = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Update Password // PostPulsar" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container flex min-h-[calc(100vh-80px)] flex-col items-center justify-center"> <div class="w-full max-w-md border border-border p-8"> <h2 class="mb-6 text-center text-2xl font-bold uppercase">
// Create New Password
</h2> <form id="update-password-form" class="space-y-6"> <div> <label for="new-password" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">New Password</label> <input id="new-password" name="new-password" type="password" required class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" placeholder="::INPUT_SECRET::"> </div> <div> <label for="confirm-password" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Confirm New Password</label> <input id="confirm-password" name="confirm-password" type="password" required class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" placeholder="::INPUT_SECRET::"> </div> <button type="submit" class="w-full border border-primary bg-primary p-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80">Update Password &gt;&gt;</button> </form> <div id="message" class="mt-4 text-sm"></div> </div> </main> ` })} ${renderScript($$result, "/home/enio/projetos/post-pulsar/src/pages/update-password.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/enio/projetos/post-pulsar/src/pages/update-password.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/update-password.astro";
const $$url = "/update-password";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$UpdatePassword,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
