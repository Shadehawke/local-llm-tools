import { type ModelArchitecture } from "../data/models";
import { type QuantFormat } from "../data/quants";

const BYTES_PER_GIB = 1024 ** 3;

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
  weightsGiB: number;
  kvCacheGiB: number;
  kvKeysGiB: number;
  kvValuesGiB: number;
  overheadGiB: number;
  totalGiB: number;
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
  const baseTerms = model.numLayers * model.numKvHeads * model.headDim * contextLength * batchSize;
  const kBytes = baseTerms * kvPreset.kBytesPerValue;
  const vBytes = baseTerms * kvPreset.vBytesPerValue;
  return kBytes + vBytes;
}

export function calculateKvKeysBytes(
  model: ModelArchitecture,
  contextLength: number,
  batchSize: number,
  kvPreset: KvQuantPreset,
): number {
  return model.numLayers * model.numKvHeads * model.headDim * contextLength * batchSize * kvPreset.kBytesPerValue;
}

export function calculateKvValuesBytes(
  model: ModelArchitecture,
  contextLength: number,
  batchSize: number,
  kvPreset: KvQuantPreset,
): number {
  return model.numLayers * model.numKvHeads * model.headDim * contextLength * batchSize * kvPreset.vBytesPerValue;
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
    weightsGiB: weightsBytes / BYTES_PER_GIB,
    kvCacheGiB: kvCacheBytes / BYTES_PER_GIB,
    kvKeysGiB: kvKeysBytes / BYTES_PER_GIB,
    kvValuesGiB: kvValuesBytes / BYTES_PER_GIB,
    overheadGiB: overheadBytes / BYTES_PER_GIB,
    totalGiB: totalBytes / BYTES_PER_GIB,
  };
}

/**
 * Inverse: given available VRAM, what's the max context that fits?
 * Uses the selected KV preset's combined bytes-per-token rate.
 */
export function maxContextForVram(
  availableVramGiB: number,
  model: ModelArchitecture,
  quant: QuantFormat,
  batchSize: number,
  kvPreset: KvQuantPreset,
): number {
  const availableBytes = availableVramGiB * BYTES_PER_GIB;
  const weightsBytes = calculateWeightsBytes(model, quant);
  const remainingForKvCache = availableBytes - weightsBytes - FIXED_OVERHEAD_BYTES;

  if (remainingForKvCache <= 0) return 0;

  const bytesPerContextToken =
    model.numLayers *
    model.numKvHeads *
    model.headDim *
    batchSize *
    (kvPreset.kBytesPerValue + kvPreset.vBytesPerValue);

  return Math.floor(remainingForKvCache / bytesPerContextToken);
}