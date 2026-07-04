/**
 * GPU/hardware dataset for inference speed estimation.
 *
 * Memory bandwidth is the dominant factor for single-user LLM decode speed —
 * each generated token requires reading all active model weights from VRAM once,
 * making inference memory-bandwidth-bound rather than compute-bound.
 *
 * SOURCES (all values primary-source verified, June 2026):
 *   NVIDIA: TechPowerUp GPU Database (techpowerup.com/gpu-specs/)
 *   Apple:  Official Apple spec pages and Apple newsroom announcements
 *
 * EFFICIENCY FACTOR (0.70 default):
 *   Real-world throughput is typically 60–80% of peak theoretical bandwidth.
 *   Causes: VRAM ECC overhead, memory controller contention, KV cache reads
 *   alongside weight reads, framework overhead. 0.70 is a conservative midpoint
 *   consistent with community benchmarks (llama.cpp, Ollama) vs. theoretical
 *   peaks. Apple Silicon tends to run ~75–80% due to the unified memory
 *   architecture; discrete NVIDIA GDDR runs 65–75%. We use 0.70 for both
 *   to avoid false precision — treat results as ±20% ballpark.
 */

export interface GpuEntry {
  id: string;
  label: string;
  /** Peak memory bandwidth in GB/s, from official specs. */
  bandwidthGBs: number;
  /** VRAM/unified memory in GB. */
  vramGB: number;
  vendor: "nvidia" | "amd" | "apple";
  /**
   * Architecture generation group — used for UI grouping, not calculations.
   * Helps users find their card without scrolling through the full list.
   */
  group: string;
}

export const GPU_ENTRIES: GpuEntry[] = [
  // ── NVIDIA RTX 30-series (Ampere) ────────────────────────────────────────
  {
    id: "rtx3060-12gb",
    label: "RTX 3060 12GB",
    bandwidthGBs: 360,
    vramGB: 12,
    vendor: "nvidia",
    group: "RTX 30 Series",
  },
  {
    id: "rtx3070",
    label: "RTX 3070",
    bandwidthGBs: 448,
    vramGB: 8,
    vendor: "nvidia",
    group: "RTX 30 Series",
  },
  {
    id: "rtx3080-10gb",
    label: "RTX 3080 10GB",
    bandwidthGBs: 760,
    vramGB: 10,
    vendor: "nvidia",
    group: "RTX 30 Series",
  },
  {
    id: "rtx3080-12gb",
    label: "RTX 3080 12GB",
    bandwidthGBs: 912,
    vramGB: 12,
    vendor: "nvidia",
    group: "RTX 30 Series",
  },
  {
    id: "rtx3090",
    label: "RTX 3090",
    bandwidthGBs: 936,
    vramGB: 24,
    vendor: "nvidia",
    group: "RTX 30 Series",
  },
  {
    id: "rtx3090ti",
    label: "RTX 3090 Ti",
    bandwidthGBs: 1008,
    vramGB: 24,
    vendor: "nvidia",
    group: "RTX 30 Series",
  },

  // ── NVIDIA RTX 40-series (Ada Lovelace) ──────────────────────────────────
  {
    id: "rtx4060",
    label: "RTX 4060",
    bandwidthGBs: 272,
    vramGB: 8,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4060ti-8gb",
    label: "RTX 4060 Ti 8GB",
    bandwidthGBs: 288,
    vramGB: 8,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4060ti-16gb",
    label: "RTX 4060 Ti 16GB",
    bandwidthGBs: 288,
    vramGB: 16,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4070",
    label: "RTX 4070",
    bandwidthGBs: 504,
    vramGB: 12,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4070super",
    label: "RTX 4070 Super",
    bandwidthGBs: 504,
    vramGB: 12,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4070ti",
    label: "RTX 4070 Ti",
    bandwidthGBs: 504,
    vramGB: 12,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4070tisuper",
    label: "RTX 4070 Ti Super",
    bandwidthGBs: 672,
    vramGB: 16,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4080",
    label: "RTX 4080",
    bandwidthGBs: 716.8,
    vramGB: 16,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4080super",
    label: "RTX 4080 Super",
    bandwidthGBs: 736,
    vramGB: 16,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },
  {
    id: "rtx4090",
    label: "RTX 4090",
    bandwidthGBs: 1008,
    vramGB: 24,
    vendor: "nvidia",
    group: "RTX 40 Series",
  },

  // ── NVIDIA RTX 50-series (Blackwell) ─────────────────────────────────────
  {
    id: "rtx5060",
    label: "RTX 5060",
    bandwidthGBs: 448,
    vramGB: 8,
    vendor: "nvidia",
    group: "RTX 50 Series",
  },
  {
    id: "rtx5060ti-8gb",
    label: "RTX 5060 Ti 8GB",
    bandwidthGBs: 448,
    vramGB: 8,
    vendor: "nvidia",
    group: "RTX 50 Series",
  },
  {
    id: "rtx5060ti-16gb",
    label: "RTX 5060 Ti 16GB",
    bandwidthGBs: 448,
    vramGB: 16,
    vendor: "nvidia",
    group: "RTX 50 Series",
  },
  {
    id: "rtx5070",
    label: "RTX 5070",
    bandwidthGBs: 672,
    vramGB: 12,
    vendor: "nvidia",
    group: "RTX 50 Series",
  },
  {
    id: "rtx5070ti",
    label: "RTX 5070 Ti",
    bandwidthGBs: 896,
    vramGB: 16,
    vendor: "nvidia",
    group: "RTX 50 Series",
  },
  {
    id: "rtx5080",
    label: "RTX 5080",
    bandwidthGBs: 960,
    vramGB: 16,
    vendor: "nvidia",
    group: "RTX 50 Series",
  },
  {
    id: "rtx5090",
    label: "RTX 5090",
    bandwidthGBs: 1792,
    vramGB: 32,
    vendor: "nvidia",
    group: "RTX 50 Series",
  },

  // ── AMD ──────────────────────────────────────────────────────────────────
  {
    id: "rx6800xt",
    label: "RX 6800 XT",
    bandwidthGBs: 512,
    vramGB: 16,
    vendor: "amd",
    group: "AMD RX 6000/7000/9000",
  },
  {
    id: "rx7900xtx",
    label: "RX 7900 XTX",
    bandwidthGBs: 960,
    vramGB: 24,
    vendor: "amd",
    group: "AMD RX 6000/7000/9000",
  },
  {
    id: "rx9070xt",
    label: "RX 9070 XT",
    bandwidthGBs: 640,
    vramGB: 16,
    vendor: "amd",
    group: "AMD RX 6000/7000/9000",
  },

  // ── Apple Silicon ─────────────────────────────────────────────────────────
  {
    id: "m3-base",
    label: "Apple M3 (18GB)",
    bandwidthGBs: 100,
    vramGB: 18,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m3-pro",
    label: "Apple M3 Pro (36GB)",
    bandwidthGBs: 150,
    vramGB: 36,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m3-max-30core",
    label: "Apple M3 Max 30-core GPU (96GB)",
    bandwidthGBs: 300,
    vramGB: 96,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m3-max-40core",
    label: "Apple M3 Max 40-core GPU (128GB)",
    bandwidthGBs: 400,
    vramGB: 128,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m3-ultra",
    label: "Apple M3 Ultra (512GB)",
    bandwidthGBs: 819,
    vramGB: 512,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m4-base",
    label: "Apple M4 (32GB)",
    bandwidthGBs: 120,
    vramGB: 32,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m4-pro",
    label: "Apple M4 Pro (64GB)",
    bandwidthGBs: 273,
    vramGB: 64,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m4-max-32core",
    label: "Apple M4 Max 32-core GPU (128GB)",
    bandwidthGBs: 410,
    vramGB: 128,
    vendor: "apple",
    group: "Apple Silicon",
  },
  {
    id: "m4-max-40core",
    label: "Apple M4 Max 40-core GPU (128GB)",
    bandwidthGBs: 546,
    vramGB: 128,
    vendor: "apple",
    group: "Apple Silicon",
  },

  // Custom — user supplies bandwidth manually
  {
    id: "custom",
    label: "Custom (enter bandwidth manually)",
    bandwidthGBs: 500,
    vramGB: 16,
    vendor: "nvidia",
    group: "Custom",
  },
];

export function getGpuById(id: string): GpuEntry {
  const gpu = GPU_ENTRIES.find((g) => g.id === id);
  if (!gpu) throw new Error(`Unknown GPU id: ${id}`);
  return gpu;
}

/** Real-world efficiency factor applied to peak theoretical bandwidth. */
export const INFERENCE_EFFICIENCY = 0.70;