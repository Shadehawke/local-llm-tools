export interface ToolEntry {
  slug: string;
  title: string;
  shortDescription: string;
  status: "live" | "coming-soon";
}

/**
 * Single source of truth for tool metadata. Add a new tool here once it's built,
 * and the homepage + /tools index pick it up automatically — no duplicated link
 * text scattered across pages to keep in sync.
 */
export const TOOLS: ToolEntry[] = [
  {
    slug: "vram-calculator",
    title: "VRAM Calculator",
    shortDescription:
      "Calculate exact VRAM needed for any model, quantization, and context length.",
    status: "live",
  },
  {
    slug: "what-can-i-run",
    title: "What Can I Run?",
    shortDescription:
      "Pick your GPU and see the best local LLM it can run — the highest-quality quant that fits, with estimated speed.",
    status: "live",
  },
  {
    slug: "context-length-calculator",
    title: "Context Length Calculator",
    shortDescription:
      "See the max context length that fits your GPU — and how much more Q8/Q4 KV cache buys you.",
    status: "live",
  },
  {
    slug: "ram-calculator",
    title: "RAM Calculator",
    shortDescription:
      "Can you run a model on CPU / system RAM, and how fast? Built for big MoE models on RAM-heavy rigs.",
    status: "live",
  },
];
