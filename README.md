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

​```
src/
  data/           # Static datasets:
                  #   models.ts   — model architectures (verified vs config.json)
                  #   quants.ts   — GGUF quant bytes-per-param (calibrated)
                  #   gpus.ts     — GPU bandwidth dataset (TechPowerUp + Apple)
                  #   tools.ts    — tool registry (homepage + /tools auto-generated)
  lib/            # Pure calculation functions (no DOM, no Astro):
                  #   vramCalculator.ts  — weights + split-K/V KV cache + overhead
                  #   inferenceSpeed.ts  — decode tok/s from GPU bandwidth
  layouts/        # BaseLayout.astro — shared shell, SEO meta, OpenGraph, analytics
  components/     # (empty for now — extract shared UI here once 2+ tools need it)
  pages/
    index.astro       # Homepage
    tools/
      index.astro     # Tools listing page
      vram-calculator.astro   # Flagship tool — template to copy for tools 2-8
    guides/
      index.astro     # Guides listing page
      vram-calculator-comparison.astro   # Methodology comparison article
      rtx-3060-local-llm.astro           # Hardware-specific guide (organic play)
​```

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

## Data verification status (last checked July 2026)

**Model architectures** (`src/data/models.ts`): all 12 models cross-checked
directly against published `config.json` files on Hugging Face (or technical
report citations where the repo is gated). One real error was caught and
fixed: the original "Mistral Small 22B" entry (56 layers) didn't match any
actual released checkpoint and has been replaced with the verified
Mistral-Small-3.1-24B-Instruct-2503 release (40 layers). Native context
lengths for the Qwen3 family were corrected from 32768 to the actual
config.json `max_position_embeddings` of 40960.

**GGUF quant bytes-per-param** (`src/data/quants.ts`): every K-quant is now
calibrated directly from real bartowski GGUF file sizes (Llama-3.1-8B,
cross-checked against Llama-3.1-70B), and all are marked `verified: true`.
A prior pass had inflated the Q4-and-up K-quants by ~7.4% by treating
decimal-GB file sizes as GiB before dividing by params; that's corrected,
and the weights figure now matches what LM Studio/Ollama report byte-for-byte.
The I-quant band (IQ2_M and up) is calibrated as a multi-model average but
runs slightly rich against single-model 8B sizes — a re-derivation is the
next calibration cleanup (see roadmap).

## Roadmap / open items

- **I-quant re-derivation** — the IQ2_M–IQ4_NL band runs ~4-5% rich vs single-
  model 8B file sizes; re-derive as a multi-model average and re-verify.
- **Hardware guides** — RTX 4090 (70B tier) and RTX 4060 Ti 16GB (the serious-
  hobbyist VRAM tier), using the RTX 3060 guide as the template.
- **Reverse calculator** — "given my GPU, what's the best model I can run?"
  The GPU bandwidth dataset (`src/data/gpus.ts`) is already in place.
- **Watch Search Console** for the first non-brand queries — those tell you
  which GPU/model guide to write next; don't build blind ahead of that signal.

## Local development

```bash
npm install
npm run dev      # localhost:4321
npm run build    # outputs to dist/
npm run preview  # serve the built dist/ locally
```
