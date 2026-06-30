// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Static output: every tool page is pre-rendered HTML/CSS/JS at build time.
// No SSR server needed — these are client-side calculators, so static hosting
// (Cloudflare Pages) is both simpler and faster than running a Node server.
export default defineConfig({
  site: 'https://llmfit.dev',
  output: 'static',
  // Always include trailing slashes — matches Astro's default static build
  // output (each page becomes a directory with index.html) and ensures
  // canonical URLs, sitemap entries, and server-side redirects all agree.
  // A mismatch here was causing Google's crawler to report "Redirect error"
  // on /tools/vram-calculator.
  trailingSlash: 'always',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
