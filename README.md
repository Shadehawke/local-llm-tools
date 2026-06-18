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

## Data verification status (last checked June 2026)

**Model architectures** (`src/data/models.ts`): all 9 models cross-checked
directly against published `config.json` files on Hugging Face (or technical
report citations where the repo is gated). One real error was caught and
fixed: the original "Mistral Small 22B" entry (56 layers) didn't match any
actual released checkpoint and has been replaced with the verified
Mistral-Small-3.1-24B-Instruct-2503 release (40 layers). Native context
lengths for the Qwen3 family were also corrected from 32768 to the actual
config value of 40960.

**GGUF quant bytes-per-param** (`src/data/quants.ts`): Q4_K_M, Q5_K_M, Q6_K,
and Q8_0 were recalculated from real published GGUF file sizes (bartowski's
quants of Llama 3/3.1 8B, Qwen2.5 14B, and Qwen2.5 72B) — the original
estimates were systematically too low by 10-20%. Q2_K and Q3_K_M are still
extrapolated rather than directly measured; see the `verified: false` flag
on those two entries. To finish verification: download a Q2_K or Q3_K_M
GGUF file for any model with a known param count and divide file size by
param count.

## Remaining TODOs before public launch

- **Verify Q2_K and Q3_K_M** against real file sizes (see above).
- **Pick a real domain** and update `site` in `astro.config.mjs` + the sitemap
  URL in `public/robots.txt`.
- **No analytics yet.** Decide on a privacy-respecting option (Plausible, Fathom,
  or Cloudflare Web Analytics) before driving traffic — this is the only signal
  that tells you whether tool #2 should be the GGUF estimator or something else.

## Local development

```bash
npm install
npm run dev      # localhost:4321
npm run build    # outputs to dist/
npm run preview  # serve the built dist/ locally
```
