import { type ModelArchitecture } from "../data/models";
import { type QuantFormat } from "../data/quants";

const BYTES_PER_GIB = 1024 ** 3;

/** KV cache is typically stored at FP16 even when weights are quantized lower. */
const KV_CACHE_BYTES_PER_VALUE = 2;

/** Flat buffer for CUDA context, framework overhead, activation memory, etc. */
const FIXED_OVERHEAD_BYTES = 0.6 * BYTES_PER_GIB;

export interface VramEstimateInput {
  model: ModelArchitecture;
  quant: QuantFormat;
  contextLength: number;
  batchSize: number;
}

export interface VramEstimateResult {
  weightsBytes: number;
  kvCacheBytes: number;
  overheadBytes: number;
  totalBytes: number;
  weightsGiB: number;
  kvCacheGiB: number;
  overheadGiB: number;
  totalGiB: number;
}

/**
 * Model weight memory: param count × effective bytes-per-param for the chosen quant.
 * This is the dominant term for short contexts and the one most calculators stop at —
 * but it's only half the picture once context length grows.
 */
export function calculateWeightsBytes(model: ModelArchitecture, quant: QuantFormat): number {
  const paramCount = model.paramsBillion * 1_000_000_000;
  return paramCount * quant.bytesPerParam;
}

/**
 * KV cache memory: this is the term that scales with context length and is the
 * usual culprit when "it loaded fine but OOM'd once I asked a long question."
 *
 * Formula: 2 (key + value) × layers × kv_heads × head_dim × context_length
 *          × bytes_per_value × batch_size
 *
 * The leading 2× accounts for storing both K and V tensors per layer.
 */
export function calculateKvCacheBytes(
  model: ModelArchitecture,
  contextLength: number,
  batchSize: number,
): number {
  return (
    2 *
    model.numLayers *
    model.numKvHeads *
    model.headDim *
    contextLength *
    KV_CACHE_BYTES_PER_VALUE *
    batchSize
  );
}

export function estimateVram(input: VramEstimateInput): VramEstimateResult {
  const weightsBytes = calculateWeightsBytes(input.model, input.quant);
  const kvCacheBytes = calculateKvCacheBytes(input.model, input.contextLength, input.batchSize);
  const overheadBytes = FIXED_OVERHEAD_BYTES;
  const totalBytes = weightsBytes + kvCacheBytes + overheadBytes;

  return {
    weightsBytes,
    kvCacheBytes,
    overheadBytes,
    totalBytes,
    weightsGiB: weightsBytes / BYTES_PER_GIB,
    kvCacheGiB: kvCacheBytes / BYTES_PER_GIB,
    overheadGiB: overheadBytes / BYTES_PER_GIB,
    totalGiB: totalBytes / BYTES_PER_GIB,
  };
}

/**
 * Inverse problem: given available VRAM, what's the max context length that fits?
 * This is the "secondary output" that makes this tool more useful than a simple
 * pass/fail check — most people's real question is "how much context CAN I run."
 */
export function maxContextForVram(
  availableVramGiB: number,
  model: ModelArchitecture,
  quant: QuantFormat,
  batchSize: number,
): number {
  const availableBytes = availableVramGiB * BYTES_PER_GIB;
  const weightsBytes = calculateWeightsBytes(model, quant);
  const remainingForKvCache = availableBytes - weightsBytes - FIXED_OVERHEAD_BYTES;

  if (remainingForKvCache <= 0) {
    return 0; // Model weights alone don't fit; no context is possible.
  }

  const bytesPerContextToken =
    2 * model.numLayers * model.numKvHeads * model.headDim * KV_CACHE_BYTES_PER_VALUE * batchSize;

  return Math.floor(remainingForKvCache / bytesPerContextToken);
}
