import { useEffect, useMemo, useRef, useState } from "react";
import { DropZone } from "./DropZone";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { Field, Slider, Button, IconButton, Badge } from "./ui";
import {
  ImageIcon,
  XIcon,
  WandIcon,
  UploadIcon,
  FolderOpenIcon,
  QueueIcon,
  CheckCircleIcon,
  AlertIcon,
  SpinnerIcon,
  GaugeIcon,
  PaletteIcon,
} from "./icons";
import {
  pickImageFiles,
  pickLightroomPreset,
  listPhotoPresets,
  previewPhoto,
  applyPhotoJob,
  parseLightroomPreset,
} from "../lib/photoApi";
import { baseName, stripExt, extOf, dirName, pickOutputDir } from "../lib/api";
import type {
  PhotoFilterParams,
  PhotoPreset,
  PhotoQueueItem,
} from "../types";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "heic", "heif"];

const NEUTRAL_PARAMS: PhotoFilterParams = {
  temperature: 0,
  tint: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vibrance: 0,
  saturation: 0,
  split_shadow_hue: 220,
  split_shadow_sat: 0,
  split_highlight_hue: 40,
  split_highlight_sat: 0,
  split_balance: 0,
  grain: 0,
  vignette: 0,
  fade: 0,
  intensity: 100,
};

interface PendingImage {
  path: string;
  name: string;
}

function outputExtFor(inputPath: string): string {
  const ext = extOf(inputPath);
  if (ext === "heic" || ext === "heif") return "jpg";
  return ext || "jpg";
}

export function PhotoPanel() {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const [presets, setPresets] = useState<PhotoPreset[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Tất cả");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [params, setParams] = useState<PhotoFilterParams>(NEUTRAL_PARAMS);
  const [outputDir, setOutputDir] = useState<string | null>(null);

  const [originalPreviews, setOriginalPreviews] = useState<Record<string, string>>({});
  const [gradedPreview, setGradedPreview] = useState<string | null>(null);
  const [gradedLoading, setGradedLoading] = useState(false);
  const previewRequestId = useRef(0);

  const [queue, setQueue] = useState<PhotoQueueItem[]>([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    listPhotoPresets().then(setPresets).catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const set = new Set(presets.map((p) => p.category));
    return ["Tất cả", ...Array.from(set)];
  }, [presets]);

  const visiblePresets = useMemo(
    () =>
      activeCategory === "Tất cả"
        ? presets
        : presets.filter((p) => p.category === activeCategory),
    [presets, activeCategory],
  );

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
    const files = await pickImageFiles();
    if (files.length) {
      addFiles(files);
      if (!selectedPath) setSelectedPath(files[0]);
    }
  };

  const removePending = (path: string) => {
    setPending((prev) => prev.filter((p) => p.path !== path));
    if (selectedPath === path) setSelectedPath(null);
  };

  const chooseOutputDir = async () => {
    const dir = await pickOutputDir();
    if (dir) setOutputDir(dir);
  };

  // Generate (and cache) a neutral "before" render per image, once — this
  // goes through our own ffmpeg pipeline rather than <img src> directly so
  // HEIC files always render correctly regardless of WebView support.
  useEffect(() => {
    if (!selectedPath || originalPreviews[selectedPath]) return;
    let canceled = false;
    previewPhoto(selectedPath, NEUTRAL_PARAMS)
      .then((img) => {
        if (canceled) return;
        setOriginalPreviews((prev) => ({ ...prev, [selectedPath]: img }));
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [selectedPath, originalPreviews]);

  // Regenerate the "after" preview whenever the selected image or any
  // slider changes, debounced so rapid slider drags don't spam ffmpeg.
  useEffect(() => {
    if (!selectedPath) {
      setGradedPreview(null);
      return;
    }
    const requestId = ++previewRequestId.current;
    setGradedLoading(true);
    const timer = setTimeout(() => {
      previewPhoto(selectedPath, params)
        .then((img) => {
          if (requestId !== previewRequestId.current) return;
          setGradedPreview(img);
        })
        .catch(() => {
          if (requestId !== previewRequestId.current) return;
        })
        .finally(() => {
          if (requestId === previewRequestId.current) setGradedLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath, params]);

  const applyPreset = (preset: PhotoPreset) => {
    setParams(preset.params);
    setActivePresetId(preset.id);
  };

  const updateParam = (key: keyof PhotoFilterParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setActivePresetId(null);
  };

  const importLightroom = async () => {
    const path = await pickLightroomPreset();
    if (!path) return;
    try {
      const parsed = await parseLightroomPreset(path);
      setParams(parsed);
      setActivePresetId("lightroom");
    } catch (err) {
      alert(`Không nạp được preset Lightroom:\n${String(err)}`);
    }
  };

  const resetParams = () => {
    setParams(NEUTRAL_PARAMS);
    setActivePresetId(null);
  };

  const applyToAll = async () => {
    if (!pending.length || applying) return;
    setApplying(true);
    const items: PhotoQueueItem[] = pending.map((img) => {
      const dir = outputDir ?? dirName(img.path);
      const outputPath = `${dir}/${stripExt(img.name)}_edited.${outputExtFor(img.path)}`;
      return { id: img.path, inputPath: img.path, inputName: img.name, outputPath, status: "queued" };
    });
    setQueue(items);

    for (const item of items) {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "running" } : q)),
      );
      try {
        await applyPhotoJob(item.inputPath, item.outputPath, params);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "done" } : q)),
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error", errorMessage: String(err) }
              : q,
          ),
        );
      }
    }
    setApplying(false);
  };

  const beforeSrc = selectedPath ? originalPreviews[selectedPath] : null;

  return (
    <div className="fade-in flex h-full flex-col gap-4 overflow-y-auto px-7 py-6">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Chỉnh ảnh</h1>
        <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
          Áp bộ lọc màu — phim nhựa, vintage, cổ điển, đen trắng… — với thanh
          điều chỉnh chi tiết và so sánh trực quan trước/sau.
        </p>
      </div>

      <DropZone
        onFiles={addFiles}
        onBrowse={browse}
        label="Kéo thả ảnh vào đây"
        sublabel="Hỗ trợ JPG, PNG, HEIC — có thể chọn nhiều ảnh để xử lý hàng loạt"
        extensions={IMAGE_EXTS}
        icon={<ImageIcon size={14} className="shrink-0 text-[var(--accent-strong)]" />}
      />

      {pending.length > 0 && (
        <div className="panel fade-in flex shrink-0 flex-col divide-y divide-[var(--border)] overflow-hidden">
          {pending.map((img) => (
            <div
              key={img.path}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPath(img.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedPath(img.path);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 text-[13px] text-left cursor-pointer ${
                selectedPath === img.path ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
              }`}
            >
              <ImageIcon size={15} className="shrink-0 text-[var(--text-muted)]" />
              <span className="flex-1 truncate">{img.name}</span>
              <span onClick={(e) => e.stopPropagation()}>
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={<XIcon size={13} />}
                  tooltip="Xoá khỏi danh sách"
                  onClick={() => removePending(img.path)}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedPath && (
        <div className="panel p-3">
          <BeforeAfterSlider
            beforeSrc={beforeSrc ?? ""}
            afterSrc={gradedPreview}
            afterLoading={gradedLoading}
          />
        </div>
      )}

      <div className="panel flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">Bộ lọc dựng sẵn</span>
          <Button variant="ghost" icon={<UploadIcon size={13} />} onClick={importLightroom}>
            Nạp preset Lightroom (.xmp)
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium cursor-pointer ${
                activeCategory === cat
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white/[0.05] text-[var(--text-muted)] hover:bg-white/[0.09]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex max-h-[180px] flex-wrap gap-1.5 overflow-y-auto">
          {visiblePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium cursor-pointer ${
                activePresetId === preset.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--border)] bg-white/[0.03] text-[var(--text-muted)] hover:bg-white/[0.07]"
              }`}
            >
              {preset.name}
            </button>
          ))}
          {activePresetId === "lightroom" && (
            <Badge tone="accent">Tuỳ chỉnh (từ Lightroom)</Badge>
          )}
        </div>
      </div>

      <div className="panel flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">Điều chỉnh chi tiết</span>
          <Button variant="ghost" icon={<WandIcon size={13} />} onClick={resetParams}>
            Đặt lại
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nhiệt độ màu">
            <Slider value={params.temperature} min={-100} max={100} onChange={(v) => updateParam("temperature", v)} />
          </Field>
          <Field label="Tint">
            <Slider value={params.tint} min={-100} max={100} onChange={(v) => updateParam("tint", v)} />
          </Field>
          <Field label="Phơi sáng">
            <Slider value={params.exposure} min={-100} max={100} onChange={(v) => updateParam("exposure", v)} />
          </Field>
          <Field label="Tương phản">
            <Slider value={params.contrast} min={-100} max={100} onChange={(v) => updateParam("contrast", v)} />
          </Field>
          <Field label="Highlights">
            <Slider value={params.highlights} min={-100} max={100} onChange={(v) => updateParam("highlights", v)} />
          </Field>
          <Field label="Shadows">
            <Slider value={params.shadows} min={-100} max={100} onChange={(v) => updateParam("shadows", v)} />
          </Field>
          <Field label="Whites">
            <Slider value={params.whites} min={-100} max={100} onChange={(v) => updateParam("whites", v)} />
          </Field>
          <Field label="Blacks">
            <Slider value={params.blacks} min={-100} max={100} onChange={(v) => updateParam("blacks", v)} />
          </Field>
          <Field label="Vibrance" icon={<PaletteIcon size={13} />}>
            <Slider value={params.vibrance} min={-100} max={100} onChange={(v) => updateParam("vibrance", v)} />
          </Field>
          <Field label="Saturation" icon={<PaletteIcon size={13} />}>
            <Slider value={params.saturation} min={-100} max={100} onChange={(v) => updateParam("saturation", v)} />
          </Field>
        </div>

        <div className="rounded-[10px] bg-white/[0.03] p-3">
          <p className="mb-2 text-[12px] font-medium text-[var(--text-muted)]">Chia tông màu (Split toning)</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tông bóng tối (hue)">
              <Slider value={params.split_shadow_hue} min={0} max={360} onChange={(v) => updateParam("split_shadow_hue", v)} suffix="°" />
            </Field>
            <Field label="Độ đậm bóng tối">
              <Slider value={params.split_shadow_sat} min={0} max={100} onChange={(v) => updateParam("split_shadow_sat", v)} />
            </Field>
            <Field label="Tông vùng sáng (hue)">
              <Slider value={params.split_highlight_hue} min={0} max={360} onChange={(v) => updateParam("split_highlight_hue", v)} suffix="°" />
            </Field>
            <Field label="Độ đậm vùng sáng">
              <Slider value={params.split_highlight_sat} min={0} max={100} onChange={(v) => updateParam("split_highlight_sat", v)} />
            </Field>
            <Field label="Cân bằng" hint="Nghiêng về bóng tối ↔ vùng sáng">
              <Slider value={params.split_balance} min={-100} max={100} onChange={(v) => updateParam("split_balance", v)} />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Hạt phim (Grain)">
            <Slider value={params.grain} min={0} max={100} onChange={(v) => updateParam("grain", v)} />
          </Field>
          <Field label="Vignette">
            <Slider value={params.vignette} min={0} max={100} onChange={(v) => updateParam("vignette", v)} />
          </Field>
          <Field label="Fade (đen mờ)">
            <Slider value={params.fade} min={0} max={100} onChange={(v) => updateParam("fade", v)} />
          </Field>
        </div>

        <Field label="Cường độ tổng" icon={<GaugeIcon size={13} />} hint="Pha trộn giữa ảnh gốc và ảnh đã chỉnh">
          <Slider value={params.intensity} min={0} max={100} onChange={(v) => updateParam("intensity", v)} suffix="%" />
        </Field>
      </div>

      <div className="panel flex flex-col gap-3 p-4">
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

        <div className="flex items-center justify-between">
          <div className="text-[12.5px] text-[var(--text-muted)]">
            {pending.length > 0 && <Badge tone="accent">{pending.length} ảnh đã chọn</Badge>}
          </div>
          <Button
            variant="accent"
            icon={<QueueIcon size={14} />}
            disabled={!pending.length || applying}
            onClick={applyToAll}
          >
            {applying ? "Đang xử lý…" : "Áp dụng & Xuất ảnh"}
          </Button>
        </div>

        {queue.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
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
    </div>
  );
}
