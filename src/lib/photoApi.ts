import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { PhotoFilterParams, PhotoPreset } from "../types";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "heic", "heif"];

export async function pickImageFiles(): Promise<string[]> {
  const result = await open({
    multiple: true,
    directory: false,
    filters: [{ name: "Ảnh", extensions: IMAGE_EXTS }],
  });
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export async function pickLightroomPreset(): Promise<string | null> {
  const result = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Lightroom Preset", extensions: ["xmp"] }],
  });
  if (!result) return null;
  return Array.isArray(result) ? (result[0] ?? null) : result;
}

export async function listPhotoPresets(): Promise<PhotoPreset[]> {
  return invoke<PhotoPreset[]>("list_photo_presets");
}

export async function previewPhoto(
  input: string,
  params: PhotoFilterParams,
): Promise<string> {
  return invoke<string>("preview_photo", { input, params });
}

export async function applyPhotoJob(
  input: string,
  output: string,
  params: PhotoFilterParams,
): Promise<string> {
  return invoke<string>("apply_photo_job", { input, output, params });
}

export async function parseLightroomPreset(
  path: string,
): Promise<PhotoFilterParams> {
  return invoke<PhotoFilterParams>("parse_lightroom_preset", { path });
}
