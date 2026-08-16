/**
 * System / unified memory bandwidth presets for the RAM inference calculator.
 *
 * Bandwidth is theoretical peak, computed as:
 *   data_rate (MT/s) × 8 bytes/channel × num_channels ÷ 1000  →  GB/s (decimal)
 * (DDR channels are 64-bit = 8 bytes; a consumer "dual-channel" kit is 2 of them.)
 * This mirrors how gpus.ts stores peak GDDR bandwidth — real-world utilisation is
 * handled by the efficiency factor in the speed estimate, not baked in here.
 *
 * Mac / Apple unified memory is intentionally NOT here — it lives in gpus.ts and is
 * served by the VRAM calculator, which already handles unified-memory Macs.
 */

export interface MemoryConfig {
  id: string;
  label: string;
  /** Theoretical peak bandwidth, GB/s (decimal). */
  bandwidthGBs: number;
  kind: "ddr" | "unified";
}

export const MEMORY_CONFIGS: MemoryConfig[] = [
  // Consumer desktop / laptop (dual channel)
  { id: "ddr4-3200-dual", label: "DDR4-3200, dual channel", bandwidthGBs: 51.2, kind: "ddr" },
  { id: "ddr5-5600-dual", label: "DDR5-5600, dual channel", bandwidthGBs: 89.6, kind: "ddr" },
  { id: "ddr5-6000-dual", label: "DDR5-6000, dual channel", bandwidthGBs: 96.0, kind: "ddr" },
  { id: "ddr5-6400-dual", label: "DDR5-6400, dual channel", bandwidthGBs: 102.4, kind: "ddr" },
  { id: "ddr5-8000-dual", label: "DDR5-8000, dual channel", bandwidthGBs: 128.0, kind: "ddr" },
  // Unified-memory APU
  { id: "strix-halo", label: "Ryzen AI Max+ 395 (Strix Halo), unified", bandwidthGBs: 256.0, kind: "unified" },
  // HEDT / workstation (quad channel)
  { id: "ddr4-3200-quad", label: "DDR4-3200, quad channel", bandwidthGBs: 102.4, kind: "ddr" },
  { id: "ddr5-5600-quad", label: "DDR5-5600, quad channel", bandwidthGBs: 179.2, kind: "ddr" },
  // Server (8-channel EPYC / Xeon)
  { id: "ddr5-4800-8ch", label: "DDR5-4800, 8-channel (server)", bandwidthGBs: 307.2, kind: "ddr" },
  { id: "ddr5-6000-8ch", label: "DDR5-6000, 8-channel (server)", bandwidthGBs: 384.0, kind: "ddr" },
];

export function getMemoryConfigById(id: string): MemoryConfig {
  const config = MEMORY_CONFIGS.find((c) => c.id === id);
  if (!config) throw new Error(`Unknown memory config: ${id}`);
  return config;
}