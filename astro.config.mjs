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
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
