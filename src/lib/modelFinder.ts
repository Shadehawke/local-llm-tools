import { MODEL_ARCHITECTURES, type ModelArchitecture } from "../data/models";
import { QUANT_FORMATS, type QuantFormat } from "../data/quants";
import { type GpuEntry } from "../data/gpus";
import { estimateVram, type KvQuantPreset } from "./vramCalculator";
import { estimateInferenceSpeed, type SpeedEstimateResult } from "./inferenceSpeed";

/** Single-user local decode — batch size is always 1 for this tool. */
const BATCH_SIZE = 1;

/**
 * Enumeration ladder, highest-quality first.
 *
 * Restricted to K-quants (which includes Q8_0): the standard, widely-available
 * GGUF downloads a typical user actually pulls, forming a clean monotonic size
 * ladder. I-quants are deliberately excluded here even though the forward
 * calculator supports them — several sit within a hair of a K-quant's
 * bytes-per-param (IQ4_NL ~0.62 vs Q4_K_M ~0.61), so interleaving by size alone
 * would surface a niche quant as "best" over the canonical Q4_K_M for no real
 * quality gain. Squeezing a larger model into tight VRAM via I-quants belongs in
 * the forward tool.
 */
const QUANT_LADDER: QuantFormat[] = QUANT_FORMATS
  .filter((q) => q.family === "kq")
  .sort((a, b) => b.bytesPerParam - a.bytesPerParam);

/**
 * Quality tiers treated as a genuine recommendation (Q4_K_S and up). Below that —
 * Q3/Q2 class — still fits and is shown, but as a quality compromise, never a
 * headline pick.
 */
const RECOMMENDED_TIERS: ReadonlySet<QuantFormat["qualityTier"]> = new Set([
  "medium",
  "high",
  "lossless-ish",
]);

export interface RunnableModel {
  model: ModelArchitecture;
  bestQuant: QuantFormat;
  weightsGB: number;
  kvCacheGB: number;
  totalGB: number;
  headroomGB: number;
  tokensPerSecond: number;
  speedTier: SpeedEstimateResult["tier"];
  /** "tight" when real-world overhead could realistically push a nominal fit over. */
  fitQuality: "comfortable" | "tight";
  tier: "recommended" | "reduced";
  /** bestQuant came from extrapolation rather than a measured file size. */
  usesExtrapolatedQuant: boolean;
}

export interface FinderResult {
  recommended: RunnableModel[];
  reduced: RunnableModel[];
  headline: RunnableModel | null;
  noneFit: boolean;
}

export interface FinderOptions {
  /** Override VRAM when gpu.id === "custom". */
  customVramGB?: number;
  /** Override bandwidth when gpu.id === "custom" (passed through to the speed estimate). */
  customBandwidthGBs?: number;
}

/**
 * "Given this GPU, what's the best model that fits?" — a thin enumeration over
 * estimateVram + estimateInferenceSpeed. It reimplements none of the VRAM or
 * speed math, so it cannot disagree with the forward calculator: any fix to
 * KV / hybrid / MoE logic propagates to both tools automatically.
 */
export function findRunnableModels(
  gpu: GpuEntry,
  contextLength: number,
  kvPreset: KvQuantPreset,
  options: FinderOptions = {},
): FinderResult {
  const vramGB =
    gpu.id === "custom" && options.customVramGB ? options.customVramGB : gpu.vramGB;

  const runnable: RunnableModel[] = [];

  for (const model of MODEL_ARCHITECTURES) {
    if (model.id === "custom") continue; // no fixed param count to enumerate

    // Ladder is quality-desc, so the first quant that fits is the best that fits.
    for (const quant of QUANT_LADDER) {
      const est = estimateVram({
        model,
        quant,
        contextLength,
        batchSize: BATCH_SIZE,
        kvPreset,
      });

      if (est.totalGB > vramGB) continue;

      const speed = estimateInferenceSpeed({
          gpu,
          model,
          quant,
          contextLength,
          kvPreset,
          customBandwidthGBs: options.customBandwidthGBs,
        });

      const headroomGB = vramGB - est.totalGB;
      runnable.push({
        model,
        bestQuant: quant,
        weightsGB: est.weightsGB,
        kvCacheGB: est.kvCacheGB,
        totalGB: est.totalGB,
        headroomGB,
        tokensPerSecond: speed.tokensPerSecond,
        speedTier: speed.tier,
        // Within ~0.5GB free, or over 95% utilised: longer context or memory
        // fragmentation can tip a nominal fit into an OOM — worth flagging.
        fitQuality:
          headroomGB < 0.5 || est.totalGB / vramGB > 0.95 ? "tight" : "comfortable",
        tier: RECOMMENDED_TIERS.has(quant.qualityTier) ? "recommended" : "reduced",
        usesExtrapolatedQuant: !quant.verified,
      });
      break; // best fit for this model found
    }
  }

  // Larger model wins; ties broken by higher quant, then faster decode. Param
  // count is a capability proxy, not a benchmark — stated as such in the UI.
  const byCapability = (a: RunnableModel, b: RunnableModel): number =>
    b.model.paramsBillion - a.model.paramsBillion ||
    b.bestQuant.bytesPerParam - a.bestQuant.bytesPerParam ||
    b.tokensPerSecond - a.tokensPerSecond;

  const recommended = runnable.filter((r) => r.tier === "recommended").sort(byCapability);
  const reduced = runnable.filter((r) => r.tier === "reduced").sort(byCapability);

  return {
    recommended,
    reduced,
    headline: recommended[0] ?? reduced[0] ?? null,
    noneFit: runnable.length === 0,
  };
}