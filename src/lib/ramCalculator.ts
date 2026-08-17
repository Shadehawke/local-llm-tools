import { type ModelArchitecture } from "../data/models";
import { type QuantFormat } from "../data/quants";
import { calculateWeightsBytes, calculateKvCacheBytes, type KvQuantPreset } from "./vramCalculator";

const BYTES_PER_GB = 1e9;
// Small flat reserve for framework/compute buffers — matches the VRAM calc's approach.
const FIXED_OVERHEAD_BYTES = 0.6 * 1024 ** 3;
const BATCH_SIZE = 1;

/**
 * Effective fraction of theoretical peak memory bandwidth realised during CPU /
 * unified-memory decode. Calibrated (Aug 2026) against measured real-world runs:
 *   - Qwen3-235B-A22B on Strix Halo (256 GB/s unified) ≈ 11 tok/s
 *   - Qwen3.6-35B-A3B on a ~90 GB/s DDR5 APU ≈ 17.8 tok/s
 * Back-solving both (with their fit-driven quants) puts the factor near 0.50 — well
 * below the GPU factor (0.70), since CPU/APU memory subsystems realise less of peak.
 * It's also inherently noisier (engine, NUMA, CPU generation), so decode estimates
 * from this carry a wider ±30% band and are framed as feasibility ballparks.
 */
const CPU_BANDWIDTH_EFFICIENCY = 0.5;

export interface RamEstimateInput {
  model: ModelArchitecture;
  quant: QuantFormat;
  ramGB: number;
  bandwidthGBs: number;
  contextLength: number;
  kvPreset: KvQuantPreset;
}

export interface RamEstimateResult {
  weightsGB: number;
  kvCacheGB: number;
  overheadGB: number;
  totalGB: number;
  fits: boolean;
  headroomGB: number;
  tokensPerSecond: number;
  /** True for MoE — decode reads only active params, the reason big MoE is viable in RAM. */
  isMoE: boolean;
  activeParamsBillion: number;
  totalParamsBillion: number;
}

/**
 * "Can I run this model in system RAM (CPU / unified memory), and how fast?"
 *
 * Fit reuses the VRAM calculator's weight + KV math verbatim (total params must be
 * resident, so the two tools can't disagree on size). Decode is the bandwidth
 * roofline at CPU efficiency, reading only ACTIVE params per token — which is why
 * a 235B MoE is runnable in RAM at all.
 *
 * DECODE only. Prefill (prompt processing) on CPU is compute-bound and far slower —
 * not represented here. Pure CPU / unified memory; hybrid GPU+CPU offload is not modelled.
 */
export function estimateRamInference(input: RamEstimateInput): RamEstimateResult {
  const { model, quant, ramGB, bandwidthGBs, contextLength, kvPreset } = input;

  const weightsBytes = calculateWeightsBytes(model, quant);
  const kvCacheBytes = calculateKvCacheBytes(model, contextLength, BATCH_SIZE, kvPreset);
  const totalBytes = weightsBytes + kvCacheBytes + FIXED_OVERHEAD_BYTES;

  const totalGB = totalBytes / BYTES_PER_GB;
  const fits = totalBytes <= ramGB * BYTES_PER_GB;

  // Decode reads active params (MoE) or all params (dense), plus the full KV cache
  // at the current context, once per token — at CPU bandwidth × efficiency.
  const activeParamsBillion =
    model.isMoE && model.activeParamsBillion ? model.activeParamsBillion : model.paramsBillion;
  const bytesPerToken = activeParamsBillion * 1e9 * quant.bytesPerParam + kvCacheBytes;

  const effectiveBandwidthBytesPerSec = bandwidthGBs * 1e9 * CPU_BANDWIDTH_EFFICIENCY;
  const tokensPerSecond = effectiveBandwidthBytesPerSec / bytesPerToken;

  return {
    weightsGB: weightsBytes / BYTES_PER_GB,
    kvCacheGB: kvCacheBytes / BYTES_PER_GB,
    overheadGB: FIXED_OVERHEAD_BYTES / BYTES_PER_GB,
    totalGB,
    fits,
    headroomGB: ramGB - totalGB,
    tokensPerSecond,
    isMoE: Boolean(model.isMoE && model.activeParamsBillion),
    activeParamsBillion,
    totalParamsBillion: model.paramsBillion,
  };
}