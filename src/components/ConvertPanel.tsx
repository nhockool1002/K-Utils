import { useState } from "react";
import { DropZone } from "./DropZone";
import { Field, SegmentedControl, Slider, Button, IconButton, Badge } from "./ui";
import {
  ConvertIcon,
  XIcon,
  FolderOpenIcon,
  QueueIcon,
  CheckCircleIcon,
  AlertIcon,
  SpinnerIcon,
  GaugeIcon,
} from "./icons";
import { pickConvertFiles, convertImage, CONVERT_INPUT_EXTS, type ConvertOutputFormat } from "../lib/convertApi";
import { baseName, stripExt, extOf, dirName, pickOutputDir } from "../lib/api";
import type { ConvertQueueItem } from "../types";

interface PendingImage {
  path: string;
  name: string;
}

const FORMAT_OPTIONS: { value: ConvertOutputFormat; label: string }[] = [
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "tiff", label: "TIFF" },
  { value: "bmp", label: "BMP" },
  { value: "gif", label: "GIF" },
];

export function ConvertPanel() {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [format, setFormat] = useState<ConvertOutputFormat>("jpg");
  const [quality, setQuality] = useState(90);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [queue, setQueue] = useState<ConvertQueueItem[]>([]);
  const [converting, setConverting] = useState(false);

  const addFiles = (paths: string[]) => {
    setPending((prev) => {
      const existing = new Set(prev.map((p) => p.path));
      const additions = paths
        .filter((p) => !existing.has(p))
        .map((path) => ({ path, name: baseName(path) }));
      return [...prev, ...additions];
    });
  };

  const browse = async () => {
    const files = await pickConvertFiles();
    if (files.length) addFiles(files);
  };

  const removePending = (path: string) => {
    setPending((prev) => prev.filter((p) => p.path !== path));
  };

  const chooseOutputDir = async () => {
    const dir = await pickOutputDir();
    if (dir) setOutputDir(dir);
  };

  const convertAll = async () => {
    if (!pending.length || converting) return;
    setConverting(true);
    const items: ConvertQueueItem[] = pending.map((img) => {
      const dir = outputDir ?? dirName(img.path);
      const outputPath = `${dir}/${stripExt(img.name)}.${format}`;
      return { id: img.path, inputPath: img.path, inputName: img.name, outputPath, status: "queued" };
    });
    setQueue(items);

    for (const item of items) {
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "running" } : q)));
      try {
        await convertImage(item.inputPath, item.outputPath, format === "jpg" ? quality : null);
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "done" } : q)));
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", errorMessage: String(err) } : q,
          ),
        );
      }
    }
    setConverting(false);
    setPending([]);
  };

  return (
    <div className="fade-in flex h-full flex-col gap-4 overflow-y-auto px-7 py-6">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Đổi định dạng ảnh</h1>
        <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
          Chuyển HEIC, RAW máy ảnh (CR2, NEF, ARW...), WebP, AVIF, TIFF và các
          định dạng ít gặp khác sang JPG, PNG hoặc các định dạng phổ thông.
        </p>
      </div>

      <DropZone
        onFiles={addFiles}
        onBrowse={browse}
        label="Kéo thả ảnh vào đây"
        sublabel="Hỗ trợ HEIC, RAW (CR2/NEF/ARW/DNG...), WebP, AVIF, TIFF, BMP, GIF, PSD... — chọn nhiều file để đổi hàng loạt"
        extensions={CONVERT_INPUT_EXTS}
        icon={<ConvertIcon size={14} className="shrink-0 text-[var(--accent-strong)]" />}
      />

      {pending.length > 0 && (
        <div className="panel fade-in flex shrink-0 flex-col divide-y divide-[var(--border)] overflow-hidden">
          {pending.map((img) => (
            <div key={img.path} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] uppercase text-[var(--text-faint)]">
                {extOf(img.path) || "?"}
              </span>
              <span className="flex-1 truncate">{img.name}</span>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<XIcon size={13} />}
                tooltip="Xoá khỏi danh sách"
                onClick={() => removePending(img.path)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="panel flex flex-col gap-4 p-4">
        <Field label="Định dạng đích">
          <SegmentedControl value={format} onChange={(v) => setFormat(v as ConvertOutputFormat)} options={FORMAT_OPTIONS} />
        </Field>

        {format === "jpg" && (
          <Field label="Chất lượng JPG" icon={<GaugeIcon size={13} />}>
            <Slider value={quality} min={10} max={100} onChange={setQuality} suffix="%" />
          </Field>
        )}

        <Field label="Thư mục lưu" icon={<FolderOpenIcon size={13} />}>
          <div className="flex items-center gap-2">
            <IconButton
              icon={<FolderOpenIcon size={15} />}
              tooltip="Chọn thư mục lưu"
              onClick={chooseOutputDir}
            />
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--text-faint)]">
              {outputDir ?? "Mặc định: cùng thư mục với ảnh gốc"}
            </span>
          </div>
        </Field>
      </div>

      <div className="mt-auto flex items-center justify-between pb-1">
        <div className="text-[12.5px] text-[var(--text-muted)]">
          {pending.length > 0 && <Badge tone="accent">{pending.length} ảnh đã chọn</Badge>}
        </div>
        <Button
          variant="accent"
          icon={<QueueIcon size={14} />}
          disabled={!pending.length || converting}
          onClick={convertAll}
        >
          {converting ? "Đang chuyển đổi…" : "Chuyển đổi"}
        </Button>
      </div>

      {queue.length > 0 && (
        <div className="panel flex flex-col gap-1.5 p-4">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[12.5px]">
              {item.status === "running" && <SpinnerIcon size={14} className="text-[var(--accent-strong)]" />}
              {item.status === "queued" && <span className="h-3.5 w-3.5 rounded-full bg-white/10" />}
              {item.status === "done" && <CheckCircleIcon size={14} className="text-[var(--success)]" />}
              {item.status === "error" && <AlertIcon size={14} className="text-[var(--danger)]" />}
              <span className="flex-1 truncate text-[var(--text-muted)]">{item.inputName}</span>
              {item.status === "error" && (
                <span className="truncate text-[11px] text-[var(--danger)]">{item.errorMessage}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
