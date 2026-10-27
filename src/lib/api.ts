import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import type { VideoJobOptions, MediaInfo, LogEntry } from "../types";

const VIDEO_EXTS = ["mp4", "mov", "m4v", "mkv", "avi", "webm"];
const SUBTITLE_EXTS = ["srt", "vtt", "ass", "ssa"];

export async function pickVideoFiles(): Promise<string[]> {
  const result = await open({
    multiple: true,
    directory: false,
    filters: [{ name: "Video", extensions: VIDEO_EXTS }],
  });
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export async function pickSubtitleFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Phụ đề", extensions: SUBTITLE_EXTS }],
  });
  if (!result) return null;
  return Array.isArray(result) ? result[0] ?? null : result;
}

export async function pickOutputDir(): Promise<string | null> {
  const result = await open({ multiple: false, directory: true });
  if (!result) return null;
  return Array.isArray(result) ? result[0] ?? null : result;
}

export function dirName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}

export function baseName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export function stripExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}

export function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : "";
}

export async function probeMedia(path: string): Promise<MediaInfo> {
  return invoke<MediaInfo>("probe_media", { path });
}

export async function startVideoJob(
  jobId: string,
  input: string,
  subtitle: string | null,
  output: string,
  options: VideoJobOptions,
): Promise<void> {
  return invoke("start_video_job", {
    jobId,
    input,
    subtitle,
    output,
    options,
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  return invoke("cancel_job", { jobId });
}

export async function previewVideoFrame(
  input: string,
  subtitle: string | null,
  options: VideoJobOptions,
  seekSeconds?: number,
): Promise<string> {
  return invoke<string>("preview_video_frame", {
    input,
    subtitle,
    options,
    seekSeconds: seekSeconds ?? null,
  });
}

export async function getLogs(): Promise<LogEntry[]> {
  return invoke<LogEntry[]>("get_logs");
}

export async function clearLogs(): Promise<void> {
  return invoke("clear_logs");
}

export function onAppLog(cb: (e: LogEntry) => void) {
  return listen<LogEntry>("app-log", (e) => cb(e.payload));
}

export interface ProgressEvent {
  job_id: string;
  percent: number;
  speed?: number;
  fps?: number;
  eta_seconds?: number;
}

export interface DoneEvent {
  job_id: string;
  output_path: string;
}

export interface ErrorEvent {
  job_id: string;
  message: string;
}

export function onJobProgress(cb: (e: ProgressEvent) => void) {
  return listen<ProgressEvent>("job-progress", (e) => cb(e.payload));
}
export function onJobDone(cb: (e: DoneEvent) => void) {
  return listen<DoneEvent>("job-done", (e) => cb(e.payload));
}
export function onJobError(cb: (e: ErrorEvent) => void) {
  return listen<ErrorEvent>("job-error", (e) => cb(e.payload));
}
