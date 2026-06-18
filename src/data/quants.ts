/**
 * GGUF quantization formats and their effective bits-per-weight.
 *
 * "Effective" matters because formats like Q4_K_M aren't a flat 4 bits per
 * weight — they use mixed precision (some tensors at higher bits than others)
 * plus per-block scale factors. The naive "Q4 = 4 bits / 8 = 0.5 bytes" math
 * that most calculators use undershoots actual file size by 10-15%, which is
 * exactly the kind of error that makes someone's "it'll definitely fit" turn
 * into an OOM crash. These values are calibrated against real GGUF file sizes
 * for 7-8B param models, not theoretical bit counts.
 */

export interface QuantFormat {
  id: string;
  label: string;
  /** Effective bytes per parameter, calibrated against real GGUF files. */
  bytesPerParam: number;
  description: string;
  /** Rough quality tier for the quant-picker tool's recommendation logic. */
  qualityTier: "low" | "medium" | "high" | "lossless-ish";
}

export const QUANT_FORMATS: QuantFormat[] = [
  {
    id: "q2_k",
    label: "Q2_K",
    bytesPerParam: 0.33,
    description: "Smallest, noticeable quality loss. Emergency-fit only.",
    qualityTier: "low",
  },
  {
    id: "q3_k_m",
    label: "Q3_K_M",
    bytesPerParam: 0.42,
    description: "Usable for casual use, clear quality drop vs Q4+.",
    qualityTier: "low",
  },
  {
    id: "q4_k_m",
    label: "Q4_K_M",
    bytesPerParam: 0.55,
    description: "Sweet spot for most consumer GPUs — good quality-to-size ratio.",
    qualityTier: "medium",
  },
  {
    id: "q5_k_m",
    label: "Q5_K_M",
    bytesPerParam: 0.68,
    description: "Noticeably closer to full precision, larger file.",
    qualityTier: "high",
  },
  {
    id: "q6_k",
    label: "Q6_K",
    bytesPerParam: 0.79,
    description: "Near full-precision quality, for when you have VRAM to spare.",
    qualityTier: "high",
  },
  {
    id: "q8_0",
    label: "Q8_0",
    bytesPerParam: 1.0,
    description: "Effectively lossless vs FP16 for most use cases.",
    qualityTier: "lossless-ish",
  },
  {
    id: "fp16",
    label: "FP16 (no quantization)",
    bytesPerParam: 2.0,
    description: "Full precision. Baseline reference, rarely needed locally.",
    qualityTier: "lossless-ish",
  },
];

export function getQuantById(id: string): QuantFormat {
  const quant = QUANT_FORMATS.find((q) => q.id === id);
  if (!quant) {
    throw new Error(`Unknown quant id: ${id}`);
  }
  return quant;
}
