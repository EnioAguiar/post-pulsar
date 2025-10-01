// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: "server",
  adapter: vercel(),
  response: {
    headers: {
      // Allow loading images from Facebook and Instagram CDNs
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co blob: *.fbcdn.net *.cdninstagram.com; font-src 'self'; connect-src 'self' https://*.supabase.co;",
    },
  },
});
