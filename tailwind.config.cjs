const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        foreground: "#E0E0E0",
        primary: "#FF4500",
        border: "#272727",
      },
      fontFamily: {
        sans: ["IBM Plex Mono", ...fontFamily.mono],
      },
    },
  },
  plugins: [],
};
