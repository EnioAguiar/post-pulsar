import { e as createComponent, m as maybeRenderHead, r as renderTemplate, f as createAstro, h as addAttribute, o as renderHead, k as renderComponent, p as renderSlot, l as renderScript } from './astro/server_b5n78yJd.mjs';
import 'kleur/colors';
/* empty css                               */
import 'clsx';

const $$Header = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<header class="sticky top-0 z-50 bg-background/80 backdrop-blur-sm"> <nav class="container flex items-center justify-between border-b border-border px-6 py-4"> <a href="/" class="text-xl font-bold uppercase tracking-wider">
P<span class="text-primary">[</span>O<span class="text-primary">]</span>STPULSAR
</a> <div id="nav-links" class="flex items-center space-x-6 text-sm font-medium uppercase"> <a href="/app" class="transition-colors hover:text-primary" data-auth="true" style="display: none;">
/DASHBOARD
</a> <a href="/app/settings" class="transition-colors hover:text-primary" data-auth="true" style="display: none;">
/SETTINGS
</a> <a href="/app/history" class="transition-colors hover:text-primary" data-auth="true" style="display: none;">
/HISTORY
</a> <a href="/app/connections" class="transition-colors hover:text-primary" data-auth="true" style="display: none;">
/CONNECTIONS
</a> <a href="/login" class="transition-colors hover:text-primary" data-auth="false" style="display: none;">
/LOGIN
</a> <a href="/signup" class="border border-primary bg-primary px-4 py-2 text-background transition-colors hover:bg-primary/80" data-auth="false" style="display: none;">
ACTIVATE ACCOUNT
</a> <button id="logout-btn-header" class="border border-primary px-4 py-2 text-primary transition-colors hover:bg-primary/10" data-auth="true" style="display: none;">
LOGOUT
</button> </div> </nav> </header>`;
}, "/home/enio/projetos/post-pulsar/src/components/Header.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return renderTemplate`${maybeRenderHead()}<footer class="container mt-16 border-t border-border/50 py-8 text-center text-foreground/70"> <div class="flex justify-center gap-4"> <a href="/terms" class="hover:text-primary">Terms of Service</a> <a href="/privacy" class="hover:text-primary">Privacy Policy</a> </div> <p class="mt-4 text-sm">&copy; ${currentYear} PostPulsar. All rights reserved.</p> </footer>`;
}, "/home/enio/projetos/post-pulsar/src/components/Footer.astro", void 0);

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const {
    title,
    description = "PostPulsar is a micro-SaaS that uses AI to solve the 'hell' of content repurposing."
  } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="description"${addAttribute(description, "content")}><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/PostPulsar.svg"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">${renderHead()}</head> <body class="flex min-h-screen flex-col"> <div class="grow"> ${renderComponent($$result, "Header", $$Header, {})} ${renderSlot($$result, $$slots["default"])} </div> ${renderComponent($$result, "Footer", $$Footer, {})} ${renderScript($$result, "/home/enio/projetos/post-pulsar/src/layouts/Layout.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "/home/enio/projetos/post-pulsar/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
