// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwind from "@astrojs/tailwind";

import sentry from "@sentry/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sentry()],
  output: "server",
  adapter: vercel(),
});