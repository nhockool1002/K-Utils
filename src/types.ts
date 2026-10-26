export type JobStatus = "queued" | "running" | "done" | "error" | "canceled";

export type EncoderId =
  | "h264_videotoolbox"
  | "hevc_videotoolbox"
  | "libx264"
  | "libx265";

export type SubtitleMode = "none" | "soft" | "hard";
export type CropAspect = "1:1" | "9:16" | "16:9" | "4:3" | null;
export type RotateDeg = 0 | 90 | 180 | 270;

/** One combined video job: every field is an independently toggled
 * capability that composes into a single ffmpeg pass. */
export interface VideoJobOptions {
  rotate: RotateDeg;
  flip_h: boolean;
  flip_v: boolean;
  crop_aspect: CropAspect;
  speed: number;
  subtitle_mode: SubtitleMode;
  font_size: number;
  font_color: string;
  outline_color: string;
  position: "bottom" | "top";
  compress: boolean;
  encoder: EncoderId;
  quality: string;
  resolution: string | null;
  audio_bitrate: string;
  mute_audio: boolean;
  /** Optional color-grading "look" (same engine as the Chỉnh ảnh tab).
   * `null` disables grading entirely. */
  grading: PhotoFilterParams | null;
}

export interface MediaInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  has_audio: boolean;
  bit_rate: number;
}

export type LogLevel = "info" | "debug" | "error";

export interface LogEntry {
  timestamp_ms: number;
  level: LogLevel;
  message: string;
}

/** One photo "look": every field is an independently adjustable slider.
 * Built-in presets are just named starting points for these same fields. */
export interface PhotoFilterParams {
  temperature: number;
  tint: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  vibrance: number;
  saturation: number;
  split_shadow_hue: number;
  split_shadow_sat: number;
  split_highlight_hue: number;
  split_highlight_sat: number;
  split_balance: number;
  grain: number;
  vignette: number;
  fade: number;
  intensity: number;
}

export interface PhotoPreset {
  id: string;
  name: string;
  category: string;
  params: PhotoFilterParams;
}

export type PhotoJobStatus = "queued" | "running" | "done" | "error";

export interface PhotoQueueItem {
  id: string;
  inputPath: string;
  inputName: string;
  outputPath: string;
  status: PhotoJobStatus;
  errorMessage?: string;
}

export interface QueueJob {
  id: string;
  inputPath: string;
  inputName: string;
  subtitlePath?: string;
  subtitleName?: string;
  outputPath: string;
  status: JobStatus;
  percent: number;
  speed?: number;
  fps?: number;
  etaSeconds?: number;
  errorMessage?: string;
  /** Short human-readable description of what this job does, e.g.
   * "Xoay 90° · Crop 9:16 · Nén video". Shown in the queue. */
  summary: string;
  options: VideoJobOptions;
  createdAt: number;
}
