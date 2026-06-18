/**
 * Model architecture parameters needed for accurate VRAM estimation.
 *
 * Why these specific fields: total VRAM = model weights + KV cache + overhead.
 * Weights only need param count. KV cache size depends on the model's actual
 * attention architecture (layer count, KV head count, head dimension) — NOT
 * just param count. Two 8B models can have wildly different KV cache footprints
 * if one uses grouped-query attention (GQA) with fewer KV heads.
 *
 * Source: each model's published config.json (Hugging Face) or technical report.
 * Values here verified against Qwen3-14B running locally on a 3060 12GB (Q8_0)
 * as a sanity check — predicted ~15.8GB weights, which matches observed OOM at
 * full Q8 on 12GB and successful load at Q4_K_M.
 */

export interface ModelArchitecture {
  id: string;
  label: string;
  paramsBillion: number;
  numLayers: number;
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
    id: "mistral-small-22b",
    label: "Mistral Small 22B",
    paramsBillion: 22.2,
    numLayers: 56,
    numKvHeads: 8,
    headDim: 128,
    nativeContextLength: 32768,
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
