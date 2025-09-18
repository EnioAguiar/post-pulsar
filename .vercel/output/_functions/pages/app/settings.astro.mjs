/* empty css                                          */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_b5n78yJd.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../../chunks/Layout_imwEykeh.mjs';
import { $ as $$Modal } from '../../chunks/Modal_qAalKGFe.mjs';
export { renderers } from '../../renderers.mjs';

const $$Settings = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Settings // PostPulsar" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="container py-12"> <div class="mb-12"> <h1 class="text-3xl font-bold uppercase">
// System Preferences & Security
</h1> <p class="mt-1 text-foreground/70">
Manage your account details and security protocols.
</p> </div> <div class="space-y-8"> <!-- Email Management --> <div class="border border-border p-6"> <h2 class="border-b border-border pb-3 text-xl font-bold uppercase">
Email Address
</h2> <div class="mt-4 flex items-center justify-between"> <div> <p class="font-mono text-sm uppercase text-foreground/70">
Current Email Address:
</p> <p id="user-email" class="font-mono text-lg">Loading...</p> </div> <button id="change-email-btn" class="border border-border px-4 py-2 font-mono text-sm font-bold uppercase text-foreground transition-colors hover:bg-border/50">
Change
</button> </div> <div id="email-message" class="mt-4 text-sm"></div> </div> <!-- Password Management --> <div class="border border-border p-6"> <h2 class="border-b border-border pb-3 text-xl font-bold uppercase">
Password
</h2> <div id="password-loading" class="mt-4"> <p class="font-mono text-sm text-foreground/70">
// Verifying authentication method...
</p> </div> <!-- Form for users WITH an existing password --> <div id="password-change-wrapper" class="hidden"> <p class="mt-4 font-mono text-sm text-foreground/70">
You have a password set. You can change it below.
</p> <form id="password-change-form" class="mt-4 space-y-4"> <div> <label for="current-password" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Current Password</label> <input type="password" id="current-password" name="current-password" class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" required> </div> <div> <label for="new-password-change" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">New Password</label> <input type="password" id="new-password-change" name="new-password" class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" required> </div> <div> <label for="confirm-password-change" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Confirm New Password</label> <input type="password" id="confirm-password-change" name="confirm-password" class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" required> </div> <button type="submit" class="w-full border border-primary bg-primary p-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80">
Update Password
</button> </form> </div> <!-- Form for users WITHOUT a password (social login) --> <div id="password-create-wrapper" class="hidden"> <p class="mt-4 font-mono text-sm text-foreground/70">
You signed in using a social provider. Create a password to enable
            signing in with your email as well.
</p> <form id="password-create-form" class="mt-4 space-y-4"> <div> <label for="new-password-create" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">New Password</label> <input type="password" id="new-password-create" name="new-password" class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" required> </div> <div> <label for="confirm-password-create" class="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-foreground/70">Confirm New Password</label> <input type="password" id="confirm-password-create" name="confirm-password" class="w-full rounded-none border border-border bg-background p-3 font-mono focus:border-primary focus:outline-none focus:ring-0" required> </div> <button type="submit" class="w-full border border-primary bg-primary p-3 font-mono text-sm font-bold uppercase text-background transition-colors hover:bg-primary/80">
Create Password
</button> </form> </div> <div id="password-message" class="mt-4 text-sm"></div> </div> <!-- Social Connections --> <div class="border border-border p-6"> <h2 class="border-b border-border pb-3 text-xl font-bold uppercase">
Social Connections
</h2> <div class="mt-4"> <button id="link-google-btn" class="flex w-full items-center justify-center border border-border bg-transparent p-3 font-mono text-sm font-bold uppercase text-foreground transition-colors hover:bg-border/50"> <svg class="mr-3 size-5" viewBox="0 0 48 48"> <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.018 36.223 44 30.552 44 24c0-1.341-.138-2.65-.389-3.917z"></path> </svg> <span id="link-google-btn-text">Link Google Account</span> </button> </div> </div> <!-- Danger Zone --> <div class="border-2 border-red-500/50 p-6"> <h2 class="border-b border-red-500/30 pb-3 text-xl font-bold uppercase text-red-500">
Danger Zone
</h2> <div class="mt-4"> <p class="mb-4 text-foreground/70">
Deleting your account is a permanent action and cannot be undone.
</p> <button id="delete-account-btn" class="w-full border border-red-500 p-3 font-mono text-sm font-bold uppercase text-red-500 transition-colors hover:bg-red-500/10">
Delete My Account
</button> </div> </div> </div> </main> ${renderComponent($$result2, "Modal", $$Modal, {})} ` })} ${renderScript($$result, "/home/enio/projetos/post-pulsar/src/pages/app/settings.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/enio/projetos/post-pulsar/src/pages/app/settings.astro", void 0);

const $$file = "/home/enio/projetos/post-pulsar/src/pages/app/settings.astro";
const $$url = "/app/settings";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Settings,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
