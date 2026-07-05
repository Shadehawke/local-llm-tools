import { type ModelArchitecture } from "../data/models";
import { type QuantFormat } from "../data/quants";

const BYTES_PER_GIB = 1024 ** 3;
// Display + fit budget use decimal GB to match how LM Studio / Ollama / HF
// report GGUF file sizes; VRAM entered as "12" is treated as a 12 GB budget,
// which bakes in a ~7% margin for driver/context overhead (safe for "will it fit").
const BYTES_PER_GB = 1_000_000_000;

/** Flat buffer for CUDA context, framework overhead, activation memory, etc. */
const FIXED_OVERHEAD_BYTES = 0.6 * BYTES_PER_GIB;

/**
 * KV cache quantization presets.
 * Each entry defines bytes-per-value for K and V independently.
 *
 * Why separate: K and V tensors have different sensitivity to compression.
 * Value quantization degrades quality faster than key quantization at the
 * same bit width — community experiments show 2-bit V causes cosine similarity
 * degradation (~0.94) while 2-bit K is more tolerable. This is why real
 * deployments often use asymmetric K/V quantization.
 *
 * Bytes per value:
 *   FP16 = 2.0, Q8 = 1.0, Q5 = 0.625, Q4 = 0.5
 */
export interface KvQuantPreset {
  id: string;
  label: string;
  kBytesPerValue: number;
  vBytesPerValue: number;
  description: string;
}

export const KV_QUANT_PRESETS: KvQuantPreset[] = [
  {
    id: "f16_f16",
    label: "F16 / F16 (default)",
    kBytesPerValue: 2.0,
    vBytesPerValue: 2.0,
    description: "Standard — both K and V at full FP16. Most compatible.",
  },
  {
    id: "q8_f16",
    label: "Q8 K / F16 V",
    kBytesPerValue: 1.0,
    vBytesPerValue: 2.0,
    description: "Quantize keys only. Conservative — V stays lossless.",
  },
  {
    id: "q8_q8",
    label: "Q8 K / Q8 V",
    kBytesPerValue: 1.0,
    vBytesPerValue: 1.0,
    description: "Both at 8-bit. Good balance of savings and quality.",
  },
  {
    id: "q8_q5",
    label: "Q8 K / Q5 V",
    kBytesPerValue: 1.0,
    vBytesPerValue: 0.625,
    description: "Moderate V compression. Suits long-context workloads.",
  },
  {
    id: "q5_q5",
    label: "Q5 K / Q5 V",
    kBytesPerValue: 0.625,
    vBytesPerValue: 0.625,
    description: "Aggressive savings, minimal quality impact on larger models.",
  },
  {
    id: "q4_q8",
    label: "Q4 K / Q8 V",
    kBytesPerValue: 0.5,
    vBytesPerValue: 1.0,
    description: "Compress keys aggressively, keep values safer.",
  },
  {
    id: "q4_q4",
    label: "Q4 K / Q4 V",
    kBytesPerValue: 0.5,
    vBytesPerValue: 0.5,
    description: "Maximum standard compression. Test carefully on smaller models.",
  },
];

export function getKvPresetById(id: string): KvQuantPreset {
  const preset = KV_QUANT_PRESETS.find((p) => p.id === id);
  if (!preset) {
    throw new Error(`Unknown KV quant preset id: ${id}`);
  }
  return preset;
}

export interface VramEstimateInput {
  model: ModelArchitecture;
  quant: QuantFormat;
  contextLength: number;
  batchSize: number;
  kvPreset: KvQuantPreset;
}

export interface VramEstimateResult {
  weightsBytes: number;
  kvCacheBytes: number;
  kvKeysBytes: number;
  kvValuesBytes: number;
  overheadBytes: number;
  totalBytes: number;
  weightsGB: number;
  kvCacheGB: number;
  kvKeysGB: number;
  kvValuesGB: number;
  overheadGB: number;
  totalGB: number;
}

/**
 * Model weight memory: param count × effective bytes-per-param for the chosen quant.
 */
export function calculateWeightsBytes(model: ModelArchitecture, quant: QuantFormat): number {
  const paramCount = model.paramsBillion * 1_000_000_000;
  return paramCount * quant.bytesPerParam;
}

/**
 * KV cache memory with separate K and V byte rates.
 *
 * Formula: layers × kv_heads × head_dim × context_length × batch_size
 * applied independently for K (using kBytesPerValue) and V (using vBytesPerValue),
 * then summed. The original single-term formula used 2× to account for both K and V
 * at FP16; this version makes that split explicit and configurable.
 *
 * Why K and V differ in compression sensitivity: K tensors participate in the
 * attention score computation (dot product with Q), while V tensors are weighted
 * and summed to produce the output. Errors in V propagate more directly into the
 * output distribution, making V more sensitive to aggressive quantization.
 */
export function calculateKvCacheBytes(
  model: ModelArchitecture,
  contextLength: number,
  batchSize: number,
  kvPreset: KvQuantPreset,
): number {
  if (model.slidingWindowConfig) {
    return (
      calculateKvKeysBytes(model, contextLength, batchSize, kvPreset) +
      calculateKvValuesBytes(model, contextLength, batchSize, kvPreset)
    );
  }
  // Use numFullAttentionLayers when present — hybrid attention models only
  // accumulate KV cache in their full-attention layers.
  const effectiveLayers = model.numFullAttentionLayers ?? model.numLayers;
  const baseTerms = effectiveLayers * model.numKvHeads * model.headDim * contextLength * batchSize;
  return baseTerms * (kvPreset.kBytesPerValue + kvPreset.vBytesPerValue);
}

export function calculateKvKeysBytes(
  model: ModelArchitecture,
  contextLength: number,
  batchSize: number,
  kvPreset: KvQuantPreset,
): number {
  if (model.slidingWindowConfig) {
    const sw = model.slidingWindowConfig;
    const slidingCtx = Math.min(contextLength, sw.slidingWindowSize);
    const slidingKvHeads = sw.slidingKvHeads ?? model.numKvHeads;
    const slidingHeadDim = sw.slidingHeadDim ?? model.headDim;
    const slidingBytes = sw.slidingLayers * slidingKvHeads * slidingHeadDim * slidingCtx * batchSize * kvPreset.kBytesPerValue;
    const globalBytes = sw.globalLayers * sw.globalKvHeads * sw.globalHeadDim * contextLength * batchSize * kvPreset.kBytesPerValue;
    return slidingBytes + globalBytes;
  }
  const effectiveLayers = model.numFullAttentionLayers ?? model.numLayers;
  return effectiveLayers * model.numKvHeads * model.headDim * contextLength * batchSize * kvPreset.kBytesPerValue;
}

export function calculateKvValuesBytes(
  model: ModelArchitecture,
  contextLength: number,
  batchSize: number,
  kvPreset: KvQuantPreset,
): number {
  if (model.slidingWindowConfig) {
    const sw = model.slidingWindowConfig;
    const slidingCtx = Math.min(contextLength, sw.slidingWindowSize);
    const slidingKvHeads = sw.slidingKvHeads ?? model.numKvHeads;
    const slidingHeadDim = sw.slidingHeadDim ?? model.headDim;
    const slidingBytes = sw.slidingLayers * slidingKvHeads * slidingHeadDim * slidingCtx * batchSize * kvPreset.vBytesPerValue;
    const globalBytes = sw.globalLayers * sw.globalKvHeads * sw.globalHeadDim * contextLength * batchSize * kvPreset.vBytesPerValue;
    return slidingBytes + globalBytes;
  }
  const effectiveLayers = model.numFullAttentionLayers ?? model.numLayers;
  return effectiveLayers * model.numKvHeads * model.headDim * contextLength * batchSize * kvPreset.vBytesPerValue;
}

export function estimateVram(input: VramEstimateInput): VramEstimateResult {
  const weightsBytes = calculateWeightsBytes(input.model, input.quant);
  const kvKeysBytes = calculateKvKeysBytes(input.model, input.contextLength, input.batchSize, input.kvPreset);
  const kvValuesBytes = calculateKvValuesBytes(input.model, input.contextLength, input.batchSize, input.kvPreset);
  const kvCacheBytes = kvKeysBytes + kvValuesBytes;
  const overheadBytes = FIXED_OVERHEAD_BYTES;
  const totalBytes = weightsBytes + kvCacheBytes + overheadBytes;

  return {
    weightsBytes,
    kvCacheBytes,
    kvKeysBytes,
    kvValuesBytes,
    overheadBytes,
    totalBytes,
    weightsGB: weightsBytes / BYTES_PER_GB,
    kvCacheGB: kvCacheBytes / BYTES_PER_GB,
    kvKeysGB: kvKeysBytes / BYTES_PER_GB,
    kvValuesGB: kvValuesBytes / BYTES_PER_GB,
    overheadGB: overheadBytes / BYTES_PER_GB,
    totalGB: totalBytes / BYTES_PER_GB,
  };
}

/**
 * Inverse: given available VRAM, what's the max context that fits?
 * Uses the selected KV preset's combined bytes-per-token rate.
 */
export function maxContextForVram(
  availableVramGB: number,
  model: ModelArchitecture,
  quant: QuantFormat,
  batchSize: number,
  kvPreset: KvQuantPreset,
): number {
  const availableBytes = availableVramGB * BYTES_PER_GB;
  const weightsBytes = calculateWeightsBytes(model, quant);
  const remainingForKvCache = availableBytes - weightsBytes - FIXED_OVERHEAD_BYTES;

  if (remainingForKvCache <= 0) return 0;

  // For sliding window models, the sliding layers' KV is fixed (capped at
  // window size) and doesn't grow with context. Subtract that fixed cost
  // first, then solve for how much context the global layers can handle.
  if (model.slidingWindowConfig) {
    const sw = model.slidingWindowConfig;
    const slidingKvHeads = sw.slidingKvHeads ?? model.numKvHeads;
    const slidingHeadDim = sw.slidingHeadDim ?? model.headDim;
    const fixedSlidingBytes =
      sw.slidingLayers * slidingKvHeads * slidingHeadDim * sw.slidingWindowSize * batchSize *
      (kvPreset.kBytesPerValue + kvPreset.vBytesPerValue);
    const remainingForGlobal = remainingForKvCache - fixedSlidingBytes;
    if (remainingForGlobal <= 0) return 0;
    const globalBytesPerToken =
      sw.globalLayers * sw.globalKvHeads * sw.globalHeadDim * batchSize *
      (kvPreset.kBytesPerValue + kvPreset.vBytesPerValue);
    return Math.floor(remainingForGlobal / globalBytesPerToken);
  }

  const effectiveLayers = model.numFullAttentionLayers ?? model.numLayers;
  const bytesPerContextToken =
    effectiveLayers *
    model.numKvHeads *
    model.headDim *
    batchSize *
    (kvPreset.kBytesPerValue + kvPreset.vBytesPerValue);

  return Math.floor(remainingForKvCache / bytesPerContextToken);
}

/**
 * TurboQuant KV cache size estimates.
 *
 * TurboQuant (ICLR 2026, Google) compresses KV cache into 2.5-3.5 effective
 * bits per value using vector quantization with codebooks, rather than scalar
 * quantization like Q4/Q8. This gives better quality-per-bit than standard
 * KV quantization at very low bit widths.
 *
 * These are theoretical estimates based on the published bit targets — actual
 * memory savings depend on implementation overhead (codebook storage, indices).
 * llama.cpp integration is in progress but not yet in a stable release as of
 * mid-2026. Treat these as "best case" targets, not guaranteed savings.
 *
 * Source: "TurboQuant: A Training-Free KV Cache Compression Method" (ICLR 2026)
 */
export interface TurboQuantEstimate {
  label: string;
  bitsPerValue: number;
  kvCacheBytes: number;
  kvCacheGB: number;
  savingsVsF16Pct: number;
}

export function estimateTurboQuant(
  model: ModelArchitecture,
  contextLength: number,
  batchSize: number,
): TurboQuantEstimate[] {
  const baseTerms = model.numLayers * model.numKvHeads * model.headDim * contextLength * batchSize;
  // F16/F16 baseline for savings comparison (2 bytes/value × 2 for K+V)
  const f16Bytes = baseTerms * 2 * 2;

  return [2.5, 3.0, 3.5].map((bits) => {
    const bytesPerValue = bits / 8;
    // K + V both at TurboQuant rate
    const kvCacheBytes = baseTerms * bytesPerValue * 2;
    return {
      label: `${bits}-bit`,
      bitsPerValue: bits,
      kvCacheBytes,
      kvCacheGB: kvCacheBytes / BYTES_PER_GB,
      savingsVsF16Pct: Math.round((1 - kvCacheBytes / f16Bytes) * 100),
    };
  });
}