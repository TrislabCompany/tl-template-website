// @ts-check
import { defineConfig } from "astro/config";

// output: "static" writes plain files to dist/, which nginx serves. Keep it:
// the image has no server code.
export default defineConfig({
  output: "static",
  build: {
    // Styles and scripts go to files under /_astro/, never inline, so the
    // Content-Security-Policy in nginx/default.conf needs no 'unsafe-inline'.
    inlineStylesheets: "never",
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
