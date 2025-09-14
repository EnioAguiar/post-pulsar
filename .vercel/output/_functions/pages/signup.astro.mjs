/* empty css                                       */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_C3e1LDAI.mjs';
export { renderers } from '../renderers.mjs';

const $$Signup = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Sign Up // PostPulsar" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container flex min-h-[calc(100vh-80px)] flex-col items-center justify-center"> <div class="w-full max-w-md border border-border p-8"> <h2 class="mb-6 text-center text-2xl font-bold uppercase">
// Initiate Onboarding
</h2> <form id="signup-form" class="space-y-6"> <div> <label for="email" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Email</label> <input id="email" name="email" type="email" required class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" placeholder="user@domain.com"> </div> <div> <label for="password" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Password</label> <input id="password" name="password" type="password" required class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" placeholder="::INPUT_SECRET:: (min. 6 characters)"> </div> <div class="flex items-center"> <input id="terms-checkbox" type="checkbox" class="size-4 rounded-none bg-background accent-primary focus:ring-0 focus:ring-offset-0"> <label for="terms-checkbox" class="ml-2 font-mono text-xs text-foreground/70">
I have read and agree to the
<a href="/terms" class="text-primary hover:underline" target="_blank">
Terms of Service
</a> </label> </div> <button id="signup-btn" type="submit" class="w-full border border-primary bg-primary p-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-primary/50" disabled>Create Protocol &gt;&gt;</button> </form> <p class="mt-8 text-center font-mono text-xs uppercase text-foreground/70">
Existing Agent? <a href="/login" class="font-bold text-primary hover:underline">Access Terminal</a> </p> </div> </main>  <div id="feedback-modal" class="fixed inset-0 z-50 hidden size-full items-center justify-center bg-background/80 backdrop-blur-sm"> <div class="w-full max-w-md border border-border bg-background p-8"> <h3 id="modal-title" class="mb-4 text-center text-xl font-bold uppercase"></h3> <p id="modal-message" class="mb-6 text-center text-foreground/70"></p> <button id="modal-close-btn" class="w-full border border-border bg-transparent p-3 font-mono text-sm font-bold uppercase text-foreground transition-colors hover:bg-border/50">
Close
</button> </div> </div> ` })} ${renderScript($$result, "/home/enio/projetos/post-pulsar/src/pages/signup.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/enio/projetos/post-pulsar/src/pages/signup.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/signup.astro";
const $$url = "/signup";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Signup,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
