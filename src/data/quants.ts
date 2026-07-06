/**
 * GGUF quantization formats and their effective bytes-per-weight.
 *
 * "Effective" matters because formats like Q4_K_M aren't a flat 4 bits per
 * weight — they use mixed precision plus per-block scale factors, and the GGUF
 * file also carries the embedding table, output head, and metadata, which don't
 * shrink at the same rate as the transformer layers.
 *
 * K-QUANT VERIFICATION (recalibrated July 2026):
 *   Recomputed from bartowski GGUF decimal-GB file sizes for Llama-3.1-8B
 *   (file_size_GB / 8.03), cross-checked against Llama-3.1-70B (Q4_K_M 42.5GB,
 *   Q5_K_M 49.9GB, Q8_0 75GB → 0.60/0.71/1.06, within ~2% of the 8B rates).
 *   This supersedes the prior pass, which multiplied decimal-GB sizes by 1024^3
 *   before dividing by params and so overstated every value ≥Q4 by ~7.4%.
 *
 * I-QUANT VERIFICATION (recalibrated July 2026):
 *   Recomputed from bartowski GGUF decimal-GB file sizes for Llama-3.1-8B
 *   (file_size_GB / 8.03) — the same anchor used for the K-quants — and
 *   cross-checked against Llama-3-70B. The 8B rate runs ~5% above the 70B rate
 *   (smaller models carry more fixed embed/output overhead per param); we anchor
 *   to 8B to match this project's 8B–32B target audience and keep one calibration
 *   rule across every quant. Supersedes the prior "8B/70B averaged" pass, which
 *   had drifted ~4-6% high in the IQ2_M–IQ4_NL band.
 *
 * FP16: exactly 2 bytes/param by definition.
 */

export interface QuantFormat {
  id: string;
  label: string;
  /** Effective bytes per parameter, calibrated against real GGUF files. */
  bytesPerParam: number;
  /** Whether bytesPerParam came from real measured file sizes or extrapolation. */
  verified: boolean;
  description: string;
  qualityTier: "extreme-low" | "low" | "medium" | "high" | "lossless-ish";
  /** Which family this quant belongs to — used for grouping in the UI. */
  family: "iq" | "kq" | "legacy";
}

export const QUANT_FORMATS: QuantFormat[] = [
  // ── I-quants (importance matrix) ─────────────────────────────────────────
  // Use codebooks + calibration data for better quality-per-byte than K-quants
  // at low bit widths. Require an imatrix file; slower on CPU than K-quants.
  // Not compatible with Vulkan (AMD) builds — GPU users should verify backend.
  {
    id: "iq1_s",
    label: "IQ1_S",
    bytesPerParam: 0.252,
    verified: true,
    description: "Extreme 1-bit. Severe quality loss, smallest possible file.",
    qualityTier: "extreme-low",
    family: "iq",
  },
  {
    id: "iq1_m",
    label: "IQ1_M",
    bytesPerParam: 0.269,
    verified: true,
    description: "Extreme 1-bit, slightly better than IQ1_S.",
    qualityTier: "extreme-low",
    family: "iq",
  },
  {
    id: "iq2_xxs",
    label: "IQ2_XXS",
    bytesPerParam: 0.299,
    verified: true,
    description: "2-bit, ultra-small. Noticeable quality loss on most models.",
    qualityTier: "low",
    family: "iq",
  },
  {
    id: "iq2_xs",
    label: "IQ2_XS",
    bytesPerParam: 0.325,
    verified: true,
    description: "2-bit extra-small. Slight step up from IQ2_XXS.",
    qualityTier: "low",
    family: "iq",
  },
  {
    id: "iq2_s",
    label: "IQ2_S",
    bytesPerParam: 0.344,
    verified: true,
    description: "2-bit small. Approaches Q2_K quality with smaller file.",
    qualityTier: "low",
    family: "iq",
  },
  {
    id: "iq2_m",
    label: "IQ2_M",
    bytesPerParam: 0.367,
    verified: true,
    description: "2-bit medium. Best 2-bit option quality-wise.",
    qualityTier: "low",
    family: "iq",
  },
  {
    id: "iq3_xxs",
    label: "IQ3_XXS",
    bytesPerParam: 0.407,
    verified: true,
    description: "3-bit, smallest. Often beats Q3_K_S at same or smaller size.",
    qualityTier: "low",
    family: "iq",
  },
  {
    id: "iq3_xs",
    label: "IQ3_XS",
    bytesPerParam: 0.438,
    verified: true,
    description: "3-bit extra-small. Good quality-per-byte below Q4.",
    qualityTier: "low",
    family: "iq",
  },
  {
    id: "iq3_s",
    label: "IQ3_S",
    bytesPerParam: 0.458,
    verified: true,
    description: "3-bit small. Comparable to Q3_K_M at smaller size.",
    qualityTier: "medium",
    family: "iq",
  },
  {
    id: "iq3_m",
    label: "IQ3_M",
    bytesPerParam: 0.471,
    verified: true,
    description: "3-bit medium. Best 3-bit option; approaches Q4 quality.",
    qualityTier: "medium",
    family: "iq",
  },
  {
    id: "iq4_xs",
    label: "IQ4_XS",
    bytesPerParam: 0.554,
    verified: true,
    description: "4-bit extra-small. Often matches Q4_K_M quality at smaller size.",
    qualityTier: "medium",
    family: "iq",
  },
  {
    id: "iq4_nl",
    label: "IQ4_NL",
    bytesPerParam: 0.583,
    verified: true,
    description: "4-bit non-linear. Similar to Q4_K_M; better on ARM/AVX2.",
    qualityTier: "medium",
    family: "iq",
  },

  // ── K-quants ─────────────────────────────────────────────────────────────
  // Mixed-precision per-block quantization. Widely supported across all
  // backends (CUDA, ROCm, Vulkan, Metal, CPU). The default choice for most.
  {
    id: "q2_k",
    label: "Q2_K",
    bytesPerParam: 0.40,
    verified: true,
    description: "2-bit. Emergency-fit only — significant quality loss.",
    qualityTier: "low",
    family: "kq",
  },
  {
    id: "q3_k_s",
    label: "Q3_K_S",
    bytesPerParam: 0.46,
    verified: true,
    description: "3-bit small. Slightly smaller than Q3_K_M, slightly lower quality.",
    qualityTier: "low",
    family: "kq",
  },
  {
    id: "q3_k_m",
    label: "Q3_K_M",
    bytesPerParam: 0.50,
    verified: true,
    description: "3-bit medium. Usable for casual use; clear drop vs Q4+.",
    qualityTier: "low",
    family: "kq",
  },
  {
    id: "q3_k_l",
    label: "Q3_K_L",
    bytesPerParam: 0.54,
    verified: true,
    description: "3-bit large. Closer to Q4 quality, larger than Q3_K_M.",
    qualityTier: "low",
    family: "kq",
  },
  {
    id: "q4_k_s",
    label: "Q4_K_S",
    bytesPerParam: 0.58,
    verified: true,
    description: "4-bit small. Slightly smaller than Q4_K_M with minor quality tradeoff.",
    qualityTier: "medium",
    family: "kq",
  },
  {
    id: "q4_k_m",
    label: "Q4_K_M",
    bytesPerParam: 0.61,
    verified: true,
    description: "4-bit medium. Sweet spot for most consumer GPUs.",
    qualityTier: "medium",
    family: "kq",
  },
  {
    id: "q5_k_s",
    label: "Q5_K_S",
    bytesPerParam: 0.70,
    verified: true,
    description: "5-bit small. Slightly smaller than Q5_K_M.",
    qualityTier: "high",
    family: "kq",
  },
  {
    id: "q5_k_m",
    label: "Q5_K_M",
    bytesPerParam: 0.71,
    verified: true,
    description: "5-bit medium. Noticeably closer to full precision.",
    qualityTier: "high",
    family: "kq",
  },
  {
    id: "q6_k",
    label: "Q6_K",
    bytesPerParam: 0.82,
    verified: true,
    description: "6-bit. Near full-precision quality, for when VRAM allows.",
    qualityTier: "high",
    family: "kq",
  },
  {
    id: "q8_0",
    label: "Q8_0",
    bytesPerParam: 1.06,
    verified: true,
    description: "8-bit. Effectively lossless vs FP16 for most use cases.",
    qualityTier: "lossless-ish",
    family: "kq",
  },

  // ── Full precision ───────────────────────────────────────────────────────
  {
    id: "fp16",
    label: "FP16",
    bytesPerParam: 2.0,
    verified: true,
    description: "Full precision. Reference baseline, rarely used locally.",
    qualityTier: "lossless-ish",
    family: "legacy",
  },
];

export function getQuantById(id: string): QuantFormat {
  const quant = QUANT_FORMATS.find((q) => q.id === id);
  if (!quant) {
    throw new Error(`Unknown quant id: ${id}`);
  }
  return quant;
}