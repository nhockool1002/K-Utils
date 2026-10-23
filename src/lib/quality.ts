import type { EncoderId, CropAspect, RotateDeg } from "../types";

export const QUALITY_LEVELS = ["low", "medium", "high", "max"] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  low: "Thấp",
  medium: "Vừa",
  high: "Cao",
  max: "Rất cao",
};

const BITRATE_TABLE: Record<string, Record<QualityLevel, number>> = {
  "480": { low: 800, medium: 1200, high: 1800, max: 2500 },
  "720": { low: 1500, medium: 2500, high: 3500, max: 5000 },
  "1080": { low: 2500, medium: 4000, high: 6000, max: 9000 },
  "1440": { low: 5000, medium: 9000, high: 13000, max: 18000 },
  "2160": { low: 8000, medium: 14000, high: 20000, max: 30000 },
};

const CRF_TABLE: Record<QualityLevel, number> = {
  low: 28,
  medium: 23,
  high: 20,
  max: 17,
};

export function isHardwareEncoder(encoder: EncoderId): boolean {
  return encoder === "h264_videotoolbox" || encoder === "hevc_videotoolbox";
}

export function resolveQuality(
  encoder: EncoderId,
  level: QualityLevel,
  resolution: string | null,
): string {
  if (!isHardwareEncoder(encoder)) {
    return String(CRF_TABLE[level]);
  }
  const table = BITRATE_TABLE[resolution ?? "1080"] ?? BITRATE_TABLE["1080"];
  return `${table[level]}k`;
}

export const ENCODER_OPTIONS: { value: EncoderId; label: string }[] = [
  { value: "h264_videotoolbox", label: "H.264 · Phần cứng (khuyên dùng)" },
  { value: "hevc_videotoolbox", label: "H.265 (HEVC) · Phần cứng, nhẹ hơn" },
  { value: "libx264", label: "H.264 · CPU, chất lượng cao" },
  { value: "libx265", label: "H.265 · CPU, chậm hơn" },
];

export const RESOLUTION_OPTIONS = [
  { value: "source", label: "Giữ nguyên độ phân giải" },
  { value: "2160", label: "4K (2160p)" },
  { value: "1440", label: "2K (1440p)" },
  { value: "1080", label: "Full HD (1080p)" },
  { value: "720", label: "HD (720p)" },
  { value: "480", label: "SD (480p)" },
];

export const AUDIO_BITRATE_OPTIONS = [
  { value: "96k", label: "96 kbps" },
  { value: "128k", label: "128 kbps" },
  { value: "192k", label: "192 kbps" },
  { value: "256k", label: "256 kbps" },
];

export const ROTATE_OPTIONS: { value: RotateDeg; label: string }[] = [
  { value: 0, label: "0°" },
  { value: 90, label: "90°" },
  { value: 180, label: "180°" },
  { value: 270, label: "270°" },
];

export const CROP_ASPECT_OPTIONS: { value: CropAspect; label: string }[] = [
  { value: null, label: "Giữ nguyên" },
  { value: "1:1", label: "1:1 Vuông" },
  { value: "9:16", label: "9:16 Dọc" },
  { value: "16:9", label: "16:9 Ngang" },
  { value: "4:3", label: "4:3" },
];

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;
export const SPEED_MIN = 0.25;
export const SPEED_MAX = 4;

export function formatSpeed(speed: number): string {
  const rounded = Math.round(speed * 100) / 100;
  return `${rounded}x`;
}
