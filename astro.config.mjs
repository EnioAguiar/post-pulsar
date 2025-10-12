// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

import sentry from "@sentry/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://www.post-pulsar.com",
  integrations: [tailwind(), sentry(), sitemap()],
  output: "server",
  adapter: vercel(),
});
