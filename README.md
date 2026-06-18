# Local LLM Tools

Calculators and utilities for people running LLMs locally (Ollama, LM Studio, llama.cpp).
Niche: developer-grade accuracy on the math most "VRAM calculator" sites get wrong —
separating model weights from KV cache instead of one flat estimate.

## Stack

- **Astro** (static output) — every page is pre-rendered HTML/CSS/JS, no server needed
- **TypeScript** (strict mode)
- **Tailwind v4** (CSS-first config via `@theme` in `src/styles/global.css` — no `tailwind.config.js`)
- **Deploy target:** Cloudflare Pages (static hosting, free tier covers this easily)

No React/Vue/Svelte. Each tool is a self-contained `<script type="module">` block that
imports pure functions from `src/lib/`. This is intentional — these are isolated forms
with a results panel, not stateful apps. Adding a framework runtime here would be
unjustified complexity for what the UI actually needs.

## Project structure

```
src/
  data/           # Static datasets — model architectures, quant formats, tool registry
  lib/            # Pure calculation functions (no DOM, no Astro) — testable, reusable
  layouts/        # BaseLayout.astro — shared shell, SEO meta, OpenGraph
  components/     # (empty for now — extract shared UI here once 2+ tools need it)
  pages/
    index.astro       # Homepage
    tools/
      index.astro     # Tools listing page
      vram-calculator.astro   # First tool — the template to copy for tools 2-8
```

## The pattern for adding a new tool

1. **Data first.** If the tool needs a dataset (e.g. tokenizer vocab info, pricing
   tables), add it to `src/data/` as a typed array + a `getXById()` lookup helper,
   following `models.ts` / `quants.ts`.
2. **Pure logic in `src/lib/`.** Write the calculation as plain TypeScript functions
   that take inputs and return a result object — no DOM access. Sanity-check the
   math against a real-world number you can verify (see how `vramCalculator.ts` was
   checked against an actual Qwen3-14B load) before building UI on top of it.
3. **Page file in `src/pages/tools/`.** Copy `vram-calculator.astro`'s structure:
   - Frontmatter: title, description, FAQ array, FAQ schema JSON-LD
   - Two-column grid: inputs left, results right
   - `<script>` block at the bottom that imports from `lib/` and `data/`, wires up
     `addEventListener`, and calls a `recalculate()` function on every input change
   - "How this is calculated" section explaining the formula honestly — this is the
     topical-authority content, written for humans, not filler
4. **Register it.** Add an entry to `src/data/tools.ts` with `status: "live"` — the
   homepage and `/tools` index pick it up automatically.
5. **Build and check.** `npm run build` — catches type errors and broken imports
   before you ever open a browser.

## Known TODOs before public launch

- **Verify model architecture numbers** in `src/data/models.ts` against actual
  `config.json` files on Hugging Face for each model. These were filled in from
  general knowledge and cross-checked against one real case (Qwen3-14B on a 3060),
  but every entry should be spot-checked individually before this becomes the
  "trust our numbers" pitch of the site.
- **Verify quant bytes-per-param values** in `src/data/quants.ts` against a few
  real downloaded GGUF file sizes (file size ÷ param count) rather than relying
  solely on the estimates given here.
- **Pick a real domain** and update `site` in `astro.config.mjs` + the sitemap
  URL in `public/robots.txt`.
- **No analytics yet.** Decide on a privacy-respecting option (Plausible, Fathom,
  or Cloudflare Web Analytics) before launch so you have traffic data to decide
  what to build next — don't skip this, it's the only signal that tells you
  whether tool #2 should be the GGUF estimator or something else entirely.

## Local development

```bash
npm install
npm run dev      # localhost:4321
npm run build    # outputs to dist/
npm run preview  # serve the built dist/ locally
```
