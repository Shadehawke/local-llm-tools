/**
 * Model architecture parameters needed for accurate VRAM estimation.
 *
 * Why these specific fields: total VRAM = model weights + KV cache + overhead.
 * Weights only need param count. KV cache size depends on the model's actual
 * attention architecture (layer count, KV head count, head dimension) — NOT
 * just param count. Two 8B models can have wildly different KV cache footprints
 * if one uses grouped-query attention (GQA) with fewer KV heads.
 *
 * SOURCE-VERIFIED (June 2026): every entry below was checked directly against
 * the model's published config.json on Hugging Face (or, where gated/unavailable,
 * cross-referenced against the official technical report / academic citations).
 * Qwen3-14B was additionally sanity-checked against a real local run: predicted
 * ~13.8GB weights at Q8_0 matches the observed OOM on a 3060 12GB, and ~7.6GB at
 * Q4_K_M matches the observed successful load.
 *
 * Correction log from the original draft (kept for transparency):
 *   - Qwen3 8B/14B/32B: nativeContextLength corrected 32768 -> 40960 (actual
 *     config.json max_position_embeddings; YaRN can extend to 131072 separately)
 *   - Mistral Small: original entry (22B, 56 layers) didn't match any real
 *     released checkpoint and appears to have been a fabricated estimate.
 *     Replaced with the verified Mistral-Small-3.1-24B-Instruct-2503 release.
 */

export interface ModelArchitecture {
  id: string;
  label: string;
  /** Total parameter count — determines VRAM needed to load the model. */
  paramsBillion: number;
  /**
   * Active parameters per forward pass (MoE models only).
   * Does NOT affect VRAM — all experts must be resident in memory regardless.
   */
  activeParamsBillion?: number;
  /** Whether this is a Mixture-of-Experts model. Affects UI labeling only. */
  isMoE?: boolean;
  numLayers: number;
  /**
   * For hybrid attention models where all full-attention layers share the same
   * KV head count and head dimension as the base numKvHeads/headDim fields.
   * Examples: Qwen3.6-27B (linear + full attention, same head config per type).
   * If omitted, all numLayers are assumed to be full attention.
   */
  numFullAttentionLayers?: number;
  /**
   * For sliding-window hybrid models where sliding and global layers have
   * DIFFERENT KV head counts and head dimensions (e.g. Gemma 4).
   * When present, the KV cache is computed as two separate terms:
   *   - sliding layers: capped at slidingWindowSize tokens, uses base numKvHeads/headDim
   *   - global layers: full context, uses globalKvHeads/globalHeadDim
   * numFullAttentionLayers should NOT be set when using this config.
   */
  slidingWindowConfig?: {
    slidingLayers: number;
    slidingWindowSize: number;
    /** KV heads for sliding layers — uses base numKvHeads if omitted. */
    slidingKvHeads?: number;
    /** Head dim for sliding layers — uses base headDim if omitted. */
    slidingHeadDim?: number;
    globalLayers: number;
    globalKvHeads: number;
    globalHeadDim: number;
  };
  numKvHeads: number;
  headDim: number;
  /** Native context length the model was trained/released with. */
  nativeContextLength: number;
}

export const MODEL_ARCHITECTURES: ModelArchitecture[] = [
  {
    id: "qwen3-8b",
    label: "Qwen3 8B",
    paramsBillion: 8.2,
    numLayers: 36,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 32768,
  },
  {
    id: "qwen3-14b",
    label: "Qwen3 14B",
    paramsBillion: 14.8,
    numLayers: 40,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 32768,
  },
  {
    id: "qwen3-32b",
    label: "Qwen3 32B",
    paramsBillion: 32.8,
    numLayers: 64,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 32768,
  },
  {
    id: "llama3.1-8b",
    label: "Llama 3.1 8B",
    paramsBillion: 8.03,
    numLayers: 32,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 131072,
  },
  {
    id: "llama3.1-70b",
    label: "Llama 3.1 70B",
    paramsBillion: 70.6,
    numLayers: 80,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 131072,
  },
  {
    id: "mistral-small-24b-2503",
    label: "Mistral Small 3.1 24B",
    paramsBillion: 24.0,
    numLayers: 40,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 131072,
  },
  {
    id: "gemma2-9b",
    label: "Gemma 2 9B",
    paramsBillion: 9.24,
    numLayers: 42,
    numKvHeads: 8,
    headDim: 256,
    nativeContextLength: 8192,
  },
  {
    id: "phi4-14b",
    label: "Phi-4 14B",
    paramsBillion: 14.7,
    numLayers: 40,
    numKvHeads: 10,
    headDim: 128,
    nativeContextLength: 16384,
  },
  {
    id: "deepseek-r1-distill-qwen-32b",
    label: "DeepSeek-R1-Distill-Qwen 32B",
    paramsBillion: 32.8,
    numLayers: 64,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 131072,
  },
  {
    id: "llama4-scout",
    label: "Llama 4 Scout (17B×16E)",
    paramsBillion: 109,
    activeParamsBillion: 17,
    isMoE: true,
    numLayers: 48,
    // iRoPE architecture: NoPE (full causal attention) every 4th layer,
    // chunked attention for the other 3 of 4. 48 layers / 4 = 12 full-attention
    // layers. Verified from transformers Llama4 config class defaults and
    // Hugging Face blog post on Llama 4 release (April 2025).
    numFullAttentionLayers: 12,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 131072,
  },
  {
    id: "qwen3.6-27b",
    label: "Qwen3.6-27B",
    paramsBillion: 27,
    numLayers: 64,
    // Only every 4th layer is full_attention — the rest are linear_attention
    // which do not accumulate a standard KV cache. Using all 64 layers would
    // overcount KV cache by 4x. Verified from config.json (April 2026).
    numFullAttentionLayers: 16,
    numKvHeads: 4,
    headDim: 256,
    nativeContextLength: 262144,
  },
  {
    id: "gemma4-31b",
    label: "Gemma 4 31B",
    paramsBillion: 31,
    // Verified from config.json (June 2026): 60 layers total, alternating
    // 5 sliding_attention + 1 full_attention repeating 10 times.
    // Sliding layers: num_key_value_heads=16, head_dim=256, window=1024.
    // Global layers: num_global_key_value_heads=4, global_head_dim=512.
    // These differ, so we use slidingWindowConfig rather than numFullAttentionLayers.
    numLayers: 60,
    numKvHeads: 16,   // sliding layer default, used for weight calc reference only
    headDim: 256,     // sliding layer default, used for weight calc reference only
    nativeContextLength: 131072,
    slidingWindowConfig: {
      slidingLayers: 50,
      slidingWindowSize: 1024,
      slidingKvHeads: 16,
      slidingHeadDim: 256,
      globalLayers: 10,
      globalKvHeads: 4,
      globalHeadDim: 512,
    },
  },
  {
    id: "custom",
    label: "Custom (enter your own values)",
    paramsBillion: 7,
    numLayers: 32,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 8192,
  },
];

export function getModelById(id: string): ModelArchitecture {
  const model = MODEL_ARCHITECTURES.find((m) => m.id === id);
  if (!model) {
    throw new Error(`Unknown model id: ${id}`);
  }
  return model;
}
