/* empty css                                       */
import { e as createComponent, f as createAstro, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_CFeEkBdL.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Login = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Login;
  let errorMsg = null;
  if (Astro2.url.searchParams.has("error")) {
    errorMsg = "[AUTHENTICATION FAILED] :: PLEASE CHECK YOUR CREDENTIALS AND TRY AGAIN.";
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Login // PostPulsar" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container flex min-h-[calc(100vh-80px)] flex-col items-center justify-center"> <div class="w-full max-w-md border border-border p-8"> <h2 class="mb-6 text-center text-2xl font-bold uppercase">
// Access Terminal
</h2> ${errorMsg && renderTemplate`<p class="mb-6 rounded-none border border-red-500 bg-red-500/10 p-3 text-center font-mono text-sm text-red-400"> ${errorMsg} </p>`} <form id="login-form" class="space-y-6"> <div> <label for="email" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Email</label> <input id="email" name="email" type="email" required class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" placeholder="user@domain.com"> </div> <div> <label for="password" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Password</label> <input id="password" name="password" type="password" required class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" placeholder="::INPUT_SECRET::"> <div class="mt-2 text-right"> <a href="#" id="forgot-password-link" class="font-mono text-xs uppercase text-foreground/70 hover:text-primary hover:underline">
Forgot Password?
</a> </div> </div> <button type="submit" class="w-full border border-primary bg-primary p-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80">Authorize &gt;&gt;</button> </form> <div class="my-6 flex items-center justify-center"> <span class="h-px grow bg-border"></span> <span class="mx-4 font-mono text-xs uppercase text-foreground/70">or</span> <span class="h-px grow bg-border"></span> </div> <button id="google-login-btn" class="flex w-full items-center justify-center border border-border bg-transparent p-3 font-mono text-sm font-bold uppercase text-foreground transition-colors hover:bg-border/50"> <svg class="mr-3 size-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.018 36.223 44 30.552 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
Authenticate with Google
</button> <p class="mt-4 text-center font-mono text-xs text-foreground/50">
By signing in with Google, you agree to our
<a href="/terms" class="text-primary hover:underline" target="_blank">Terms of Service</a>.
</p> <p class="mt-8 text-center font-mono text-xs uppercase text-foreground/70">
New Agent? <a href="/signup" class="font-bold text-primary hover:underline">Create Protocol</a> </p> </div> </main>  <div id="forgot-password-modal" class="fixed inset-0 z-50 hidden size-full items-center justify-center bg-background/80 backdrop-blur-sm"> <div class="w-full max-w-md border border-border bg-background p-8"> <h3 class="mb-6 text-center text-xl font-bold uppercase">
// Recover Access
</h3> <form id="forgot-password-form" class="space-y-4"> <input type="email" id="recovery-email-input" placeholder="Enter your account email" class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" required> <button type="submit" class="w-full border border-primary bg-primary p-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80">
Send Recovery Link
</button> <button type="button" id="cancel-forgot-password-btn" class="w-full border border-border bg-transparent p-3 font-mono text-sm font-bold uppercase text-foreground transition-colors hover:bg-border/50">
Cancel
</button> </form> <div id="modal-message" class="mt-4 text-center text-sm"></div> </div> </div> ` })} ${renderScript($$result, "/home/enio/projetos/post-pulsar/src/pages/login.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/enio/projetos/post-pulsar/src/pages/login.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
