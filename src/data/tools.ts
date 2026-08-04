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
    slug: "gguf-size-estimator",
    title: "GGUF Size Estimator",
    shortDescription: "Estimate GGUF file size before downloading, by quant level.",
    status: "coming-soon",
  },
  {
    slug: "inference-speed-estimator",
    title: "Inference Time Estimator",
    shortDescription: "Estimate response time from tokens/sec and output length.",
    status: "coming-soon",
  },
  {
    slug: "context-cost-calculator",
    title: "Context Window Cost Calculator",
    shortDescription: "Compare local vs API cost across context lengths and providers.",
    status: "coming-soon",
  },
  {
    slug: "chat-template-formatter",
    title: "Chat Template Formatter",
    shortDescription: "Wrap raw prompts in ChatML, Llama 3, Alpaca, or Qwen chat templates.",
    status: "coming-soon",
  },
  {
    slug: "token-counter",
    title: "Token Counter",
    shortDescription: "Count tokens across multiple tokenizers side by side.",
    status: "coming-soon",
  },
  {
    slug: "quant-picker",
    title: "Quant Format Picker",
    shortDescription: "Get a quantization recommendation based on your VRAM and priorities.",
    status: "coming-soon",
  },
  {
    slug: "system-prompt-budget",
    title: "System Prompt Token Budget",
    shortDescription: "See how much context window your system prompt consumes.",
    status: "coming-soon",
  },
];
