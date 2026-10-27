import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

/** Formats macOS's `sips` can read via the system ImageIO decoders —
 * everything from HEIC/AVIF/WebP down to most camera RAW formats — that our
 * statically-linked ffmpeg cannot. Common formats (jpg/png) are included too
 * so this also works as a plain batch re-encoder. */
export const CONVERT_INPUT_EXTS = [
  "heic",
  "heif",
  "webp",
  "avif",
  "tiff",
  "tif",
  "bmp",
  "gif",
  "psd",
  "tga",
  "jp2",
  "ico",
  "cr2",
  "cr3",
  "crw",
  "nef",
  "nrw",
  "arw",
  "raf",
  "orf",
  "rw2",
  "dng",
  "pef",
  "srw",
  "3fr",
  "dcr",
  "erf",
  "sr2",
  "mrw",
  "mos",
  "iiq",
  "jpg",
  "jpeg",
  "png",
];

export type ConvertOutputFormat = "jpg" | "png" | "tiff" | "bmp" | "gif";

export async function pickConvertFiles(): Promise<string[]> {
  const result = await open({
    multiple: true,
    directory: false,
    filters: [{ name: "Ảnh", extensions: CONVERT_INPUT_EXTS }],
  });
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export async function convertImage(
  input: string,
  output: string,
  quality: number | null,
): Promise<string> {
  return invoke<string>("convert_image", { input, output, quality });
}
