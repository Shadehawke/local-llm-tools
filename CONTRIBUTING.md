# Contributing

Thanks for your interest. This project has one non-negotiable principle:
**accuracy is the product.** The entire reason llmfit.dev exists is that most
"VRAM calculator" sites are wrong — they flatten weights and KV cache into one
guess, or pull numbers from memory. So the bar for contributions is higher than
usual, and it's almost entirely about where your numbers come from.

## The one rule that matters: data must be verifiable

Any change to `src/data/models.ts`, `src/data/gpus.ts`, or `src/data/quants.ts`
**must cite a primary source in the pull request.** Numbers added from memory,
from spec-aggregator sites, or from another calculator will be rejected — not
because they're necessarily wrong, but because "we verified every entry against
the source" is the whole value of this project, and one unverified entry breaks
that promise.

What counts as a primary source, by file:

- **`models.ts`** (architecture): the model's own `config.json` on Hugging Face
  (link it), or the official technical report where the repo is gated. Pull
  `paramsBillion`, `numLayers`, `numKvHeads`, `headDim`, and the hybrid/MoE
  fields directly from it. `nativeContextLength` is `max_position_embeddings`
  from `config.json`, not a marketing "native" figure. If a value has to be
  extrapolated rather than read from source, mark the entry `verified: false`
  and say so — never present an estimate as verified.
- **`gpus.ts`** (bandwidth/VRAM): TechPowerUp's GPU database or the vendor's
  official spec/datasheet (link it). `bandwidthGBs` and `vramGB` should match a
  primary spec, not a retailer listing.
- **`quants.ts`** (bytes-per-param): a real GGUF file size, not a theoretical
  bit count. Calibrate against a bartowski quant of Llama-3.1-8B and divide the
  decimal-GB file size by the param count (8.03) — the same rule every existing
  entry follows. Show the file and the arithmetic in the PR. (Note GGUF sizes
  are reported in decimal GB; don't treat them as GiB.)

A data PR that links its sources and shows the math is easy to accept. One that
doesn't will be closed with a request for sources.

## Adding or changing a tool

The build pattern is documented in the [README](./README.md#the-pattern-for-adding-a-new-tool).
Two rules specific to this codebase:

1. **All calculation logic lives in `src/lib/` as pure functions** (no DOM, no
   Astro). Tools are thin UI layers over those functions.
2. **New tools reuse the existing calculation functions rather than
   reimplementing them.** The reverse and context-length calculators both call
   the same `estimateVram` / `maxContextForVram` the main calculator uses, so
   they physically cannot report a different number. If a change would let two
   tools disagree about the same quantity, it's the wrong change.

Always sanity-check a formula change against a real-world number you can verify
(a real GGUF size, a measured tok/s) before wiring up UI on top of it.

## Style and stack

- TypeScript strict mode. No React/Vue/Svelte — interactivity is vanilla
  `<script type="module">` importing from `src/lib/`.
- Internal links and the `<BaseLayout path="...">` prop must include a trailing
  slash (`trailingSlash: 'always'` is set; a mismatch causes redirect errors).
- VRAM figures display in decimal GB (`/ 1e9`) to match LM Studio / Ollama.
- Comments explain *why*, not *what*.

## Before you open a PR

- `npm run build` passes cleanly (catches type errors and broken imports).
- Any data change cites its primary source(s) in the PR description.
- Keep it one focused change — a model addition, a bug fix, a tool — not a mix.

Honest and accurate beats optimistic. If a number is uncertain, say so in the
PR; that's a feature here, not a weakness.

## License

This project is licensed under the **GNU Affero General Public License v3.0
(AGPL-3.0)** — see [LICENSE](./LICENSE) for the full text. In plain terms
(this summary is not a substitute for the license itself):

- You're free to use, study, self-host, fork, and modify it.
- Commercial use is allowed — but the copyleft travels with the code; it
  cannot be taken closed-source.
- **The clause that matters most:** if you run a *modified* version as a public
  network service — e.g. you deploy your own calculator site based on this —
  you must make your complete modified source available to that service's users
  under this same AGPL-3.0 license. You can't fork it, change it, and run a
  closed-source competing service.
- The software is provided without warranty.

By opening a pull request, you agree your contribution is licensed under
AGPL-3.0 on the same terms as the rest of the project.
