import { type GpuEntry, INFERENCE_EFFICIENCY } from "../data/gpus";
import { type ModelArchitecture } from "../data/models";
import { type QuantFormat } from "../data/quants";
import { calculateWeightsBytes } from "./vramCalculator";

const BYTES_PER_GIB = 1024 ** 3;

/**
 * Estimate decode tokens/sec for single-user local inference.
 *
 * LLM decode is memory-bandwidth-bound at batch size 1. Each token requires
 * reading all active model weights from memory once:
 *
 *   tokens/sec ≈ effective_bandwidth / weight_bytes_per_token
 *
 * For dense models: active weights = total weights.
 * For MoE models:   active weights = activeParamsBillion × bytesPerParam.
 *   Only the active expert subset is read per token — this is why MoE models
 *   run faster than their total param count suggests.
 *
 * Results are a ±20% ballpark. Actual speed varies with context length
 * (KV cache reads add overhead), backend (llama.cpp vs vLLM vs MLX),
 * and thermal/power limits.
 */

export interface SpeedEstimateInput {
  gpu: GpuEntry;
  model: ModelArchitecture;
  quant: QuantFormat;
  /** Only used when gpu.id === "custom". */
  customBandwidthGBs?: number;
}

export interface SpeedEstimateResult {
  effectiveBandwidthGBs: number;
  weightBytesPerToken: number;
  tokensPerSecond: number;
  /**
   * Speed tier based on community consensus for single-user interactive use:
   *   fast:      20+ tok/s — faster than comfortable reading speed
   *   ok:        10–20 tok/s — comfortable for chat
   *   slow:      5–10 tok/s — usable but noticeable
   *   very_slow: <5 tok/s  — frustrating for interactive use
   */
  tier: "fast" | "ok" | "slow" | "very_slow";
  /** True when model weights exceed VRAM — speed estimate reflects RAM offload. */
  requiresOffload: boolean;
  explanation: string;
}

export function estimateInferenceSpeed(input: SpeedEstimateInput): SpeedEstimateResult {
  const { gpu, model, quant } = input;

  const bandwidthGBs =
    gpu.id === "custom" && input.customBandwidthGBs
      ? input.customBandwidthGBs
      : gpu.bandwidthGBs;

  const effectiveBandwidthGBs = bandwidthGBs * INFERENCE_EFFICIENCY;
  const effectiveBandwidthBytesPerSec = effectiveBandwidthGBs * 1e9;

  // MoE: decode reads only active experts, not all parameters.
  const activeParams =
    model.isMoE && model.activeParamsBillion
      ? model.activeParamsBillion
      : model.paramsBillion;
  const weightBytesPerToken = activeParams * 1e9 * quant.bytesPerParam;

  const tokensPerSecond = effectiveBandwidthBytesPerSec / weightBytesPerToken;

  const totalWeightBytes = calculateWeightsBytes(model, quant);
  const vramBytes = gpu.vramGB * BYTES_PER_GIB;
  const requiresOffload = totalWeightBytes > vramBytes;

  const tier: SpeedEstimateResult["tier"] =
    tokensPerSecond >= 20
      ? "fast"
      : tokensPerSecond >= 10
        ? "ok"
        : tokensPerSecond >= 5
          ? "slow"
          : "very_slow";

  let explanation: string;
  if (requiresOffload) {
    explanation = `Model weights (${(totalWeightBytes / BYTES_PER_GIB).toFixed(1)} GB) exceed VRAM (${gpu.vramGB} GB). This estimate assumes RAM offload — actual speed will be much lower, typically 1–5 tok/s depending on RAM bandwidth.`;
  } else if (model.isMoE && model.activeParamsBillion) {
    explanation = `MoE model: decode reads only the ${model.activeParamsBillion}B active parameters per token, not all ${model.paramsBillion}B. All parameters still occupy VRAM.`;
  } else {
    explanation = `Each token reads ${(weightBytesPerToken / BYTES_PER_GIB).toFixed(2)} GB of weights from ${gpu.bandwidthGBs} GB/s peak bandwidth (${(INFERENCE_EFFICIENCY * 100).toFixed(0)}% real-world efficiency applied). Treat as ±20% estimate.`;
  }

  return {
    effectiveBandwidthGBs,
    weightBytesPerToken,
    tokensPerSecond,
    tier,
    requiresOffload,
    explanation,
  };
}