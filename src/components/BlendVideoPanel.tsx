import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { DropZone } from "./DropZone";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { PresetGrid } from "./PresetGrid";
import { Field, Slider, Button, IconButton, Badge } from "./ui";
import {
  FilmIcon,
  XIcon,
  WandIcon,
  FolderOpenIcon,
  QueueIcon,
  GaugeIcon,
  PaletteIcon,
  PanelRightIcon,
  ExpandIcon,
} from "./icons";
import {
  pickVideoFiles,
  baseName,
  stripExt,
  dirName,
  pickOutputDir,
  probeMedia,
  previewVideoFrame,
} from "../lib/api";
import { listPhotoPresets } from "../lib/photoApi";
import { NEUTRAL_GRADING_PARAMS } from "../lib/grading";
import { useQueueStore } from "../store/queue";
import type { PhotoFilterParams, PhotoPreset, VideoJobOptions, QueueJob, MediaInfo } from "../types";

interface PendingVideo {
  path: string;
  name: string;
}

const NEUTRAL_VIDEO_OPTIONS: VideoJobOptions = {
  rotate: 0,
  flip_h: false,
  flip_v: false,
  crop_aspect: null,
  speed: 1,
  subtitle_mode: "none",
  font_size: 26,
  font_color: "#FFFFFF",
  outline_color: "#000000",
  position: "bottom",
  compress: false,
  encoder: "h264_videotoolbox",
  quality: "",
  resolution: null,
  audio_bitrate: "192k",
  mute_audio: false,
  grading: null,
};

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BlendVideoPanel() {
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [previewTime, setPreviewTime] = useState(0);

  const [presets, setPresets] = useState<PhotoPreset[]>([]);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [params, setParams] = useState<PhotoFilterParams>(NEUTRAL_GRADING_PARAMS);

  const [originalFrame, setOriginalFrame] = useState<string | null>(null);
  const [gradedFrame, setGradedFrame] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const originalRequestId = useRef(0);
  const gradedRequestId = useRef(0);

  const [split, setSplit] = useState(50);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  const [outputDir, setOutputDir] = useState<string | null>(null);
  const addJobs = useQueueStore((s) => s.addJobs);

  useEffect(() => {
    listPhotoPresets().then(setPresets).catch(() => {});
  }, []);

  // Probe the newly-selected video just for its duration (cheap, no decode
  // of the actual frames) and pick a sensible default scrub position.
  useEffect(() => {
    if (!selectedPath) {
      setMediaInfo(null);
      return;
    }
    let canceled = false;
    probeMedia(selectedPath)
      .then((info) => {
        if (canceled) return;
        setMediaInfo(info);
        const defaultSeek =
          info.duration > 2 ? Math.max(info.duration * 0.15, 1) : Math.max(info.duration / 2, 0);
        setPreviewTime(Math.min(defaultSeek, info.duration));
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [selectedPath]);

  // "Before" frame: only depends on which video and which timestamp — not on
  // the grading sliders — so dragging the scrubber doesn't need to wait on
  // the "after" render to also finish.
  useEffect(() => {
    if (!selectedPath) {
      setOriginalFrame(null);
      return;
    }
    const requestId = ++originalRequestId.current;
    const timer = setTimeout(() => {
      previewVideoFrame(selectedPath, null, NEUTRAL_VIDEO_OPTIONS, previewTime)
        .then((img) => {
          if (requestId === originalRequestId.current) setOriginalFrame(img);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedPath, previewTime]);

  // "After" frame: regenerates on scrub AND on every slider/preset tweak.
  // Every preview call only ever extracts a single frame (fast input-seek,
  // no re-encode of the source), so this stays responsive even on a
  // multi-gigabyte video.
  useEffect(() => {
    if (!selectedPath) {
      setGradedFrame(null);
      return;
    }
    const requestId = ++gradedRequestId.current;
    setFrameLoading(true);
    const timer = setTimeout(() => {
      const options: VideoJobOptions = { ...NEUTRAL_VIDEO_OPTIONS, grading: params };
      previewVideoFrame(selectedPath, null, options, previewTime)
        .then((img) => {
          if (requestId === gradedRequestId.current) setGradedFrame(img);
        })
        .catch(() => {})
        .finally(() => {
          if (requestId === gradedRequestId.current) setFrameLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath, previewTime, params]);

  const addFiles = (paths: string[]) => {
    setPending((prev) => {
      const existing = new Set(prev.map((p) => p.path));
      const additions = paths
        .filter((p) => !existing.has(p))
        .map((path) => ({ path, name: baseName(path) }));
      const next = [...prev, ...additions];
      return next;
    });
  };

  const browse = async () => {
    const files = await pickVideoFiles();
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

  const applyPreset = (preset: PhotoPreset) => {
    setParams(preset.params);
    setActivePresetId(preset.id);
  };

  const updateParam = (key: keyof PhotoFilterParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setActivePresetId(null);
  };

  const resetParams = () => {
    setParams(NEUTRAL_GRADING_PARAMS);
    setActivePresetId(null);
  };

  const buildSummary = () => {
    const presetName = activePresetId ? presets.find((p) => p.id === activePresetId)?.name : null;
    return `Chỉnh màu: ${presetName ?? "Tuỳ chỉnh"} · Cường độ ${params.intensity}% · Giữ chất lượng gốc`;
  };

  const enqueue = () => {
    if (!pending.length) return;
    const options: VideoJobOptions = { ...NEUTRAL_VIDEO_OPTIONS, grading: params };
    const summary = buildSummary();
    const jobs: QueueJob[] = pending.map(({ path, name }) => {
      const dir = outputDir ?? dirName(path);
      const outputPath = `${dir}/${stripExt(name)}_blend.mp4`;
      return {
        id: crypto.randomUUID(),
        inputPath: path,
        inputName: name,
        outputPath,
        status: "queued",
        percent: 0,
        summary,
        options,
        createdAt: Date.now(),
      };
    });
    addJobs(jobs);
    setPending([]);
    setSelectedPath(null);
  };

  return (
    <div className="fade-in flex h-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight">Chỉnh màu video (Blend)</h1>
            <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
              Áp bộ lọc màu lên video với xem trước trực quan trước/sau — kéo
              thanh thời gian để xem màu ở bất kỳ cảnh nào trước khi xuất.
            </p>
          </div>
          <IconButton
            icon={<PanelRightIcon size={16} />}
            tooltip={controlsOpen ? "Ẩn bảng điều chỉnh" : "Hiện bảng điều chỉnh"}
            variant={controlsOpen ? "accent" : "default"}
            onClick={() => setControlsOpen((v) => !v)}
          />
        </div>

        <DropZone
          onFiles={addFiles}
          onBrowse={browse}
          label="Kéo thả video vào đây"
          sublabel="Hỗ trợ MP4, MOV, M4V, MKV, AVI, WEBM — xem trước chỉ xử lý 1 khung hình nên vẫn nhanh với file lớn"
        />

        {pending.length > 0 && (
          <div className="panel fade-in flex shrink-0 flex-col divide-y divide-[var(--border)] overflow-hidden">
            {pending.map((vid) => (
              <div
                key={vid.path}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPath(vid.path)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedPath(vid.path);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 text-[13px] text-left cursor-pointer ${
                  selectedPath === vid.path ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                }`}
              >
                <FilmIcon size={15} className="shrink-0 text-[var(--text-muted)]" />
                <span className="flex-1 truncate">{vid.name}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={<XIcon size={13} />}
                    tooltip="Xoá khỏi danh sách"
                    onClick={() => removePending(vid.path)}
                  />
                </span>
              </div>
            ))}
          </div>
        )}

        {selectedPath && (
          <div className="panel relative flex flex-col gap-3 p-3">
            <BeforeAfterSlider
              beforeSrc={originalFrame ?? ""}
              afterSrc={gradedFrame}
              afterLoading={frameLoading}
              split={split}
              onSplitChange={setSplit}
            />
            <span className="absolute bottom-16 right-5">
              <IconButton
                icon={<ExpandIcon size={14} />}
                tooltip="Xem toàn màn hình"
                onClick={() => setFullscreenOpen(true)}
              />
            </span>
            <Field
              label="Vị trí xem trước"
              icon={<GaugeIcon size={13} />}
              hint={`${formatTime(previewTime)} / ${formatTime(mediaInfo?.duration ?? 0)} — chỉ render 1 khung hình, không ảnh hưởng tốc độ dù video nặng`}
            >
              <Slider
                value={previewTime}
                min={0}
                max={Math.max(mediaInfo?.duration ?? 1, 0.1)}
                step={0.1}
                onChange={setPreviewTime}
              />
            </Field>
          </div>
        )}

        {fullscreenOpen && selectedPath && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
            onClick={() => setFullscreenOpen(false)}
          >
            <div
              className="modal-surface fade-in relative w-full max-w-[1200px] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute right-3 top-3 z-10">
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={<XIcon size={15} />}
                  tooltip="Đóng"
                  onClick={() => setFullscreenOpen(false)}
                />
              </span>
              <BeforeAfterSlider
                beforeSrc={originalFrame ?? ""}
                afterSrc={gradedFrame}
                afterLoading={frameLoading}
                split={split}
                onSplitChange={setSplit}
                className="mx-auto h-[82vh] w-auto max-w-[90vw]"
              />
            </div>
          </div>
        )}

        <div className="panel flex flex-col gap-3 p-4">
          <span className="text-[13px] font-semibold">Bộ lọc dựng sẵn</span>
          <PresetGrid
            presets={presets}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            selectedId={activePresetId}
            onSelect={applyPreset}
            maxHeight={220}
          />
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
                {outputDir ?? "Mặc định: cùng thư mục với video gốc"}
              </span>
            </div>
          </Field>
          <p className="text-[11px] text-[var(--text-faint)]">
            Video sẽ được xử lý tuần tự trong Hàng đợi (từng file một, mã hoá
            phần cứng) — máy không bị quá tải dù file dung lượng lớn, có tiến
            trình %/tốc độ/ETA và có thể huỷ bất cứ lúc nào.
          </p>

          <div className="flex items-center justify-between">
            <div className="text-[12.5px] text-[var(--text-muted)]">
              {pending.length > 0 && <Badge tone="accent">{pending.length} video đã chọn</Badge>}
            </div>
            <Button
              variant="accent"
              icon={<QueueIcon size={14} />}
              disabled={!pending.length}
              onClick={enqueue}
            >
              Thêm vào hàng đợi
            </Button>
          </div>
        </div>
      </div>

      <div
        className={clsx(
          "shrink-0 overflow-hidden border-l border-[var(--border)] transition-[width] duration-200",
          controlsOpen ? "w-[320px]" : "w-0",
        )}
      >
        <div className="flex h-full w-[320px] flex-col gap-4 overflow-y-auto px-5 py-6">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">Điều chỉnh chi tiết</span>
            <Button variant="ghost" icon={<WandIcon size={13} />} onClick={resetParams}>
              Đặt lại
            </Button>
          </div>

          <div className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-4 rounded-[10px] bg-white/[0.03] p-3">
            <p className="text-[12px] font-medium text-[var(--text-muted)]">Chia tông màu (Split toning)</p>
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

          <div className="flex flex-col gap-4">
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

          <Field label="Cường độ tổng" icon={<GaugeIcon size={13} />} hint="Pha trộn giữa video gốc và video đã chỉnh">
            <Slider value={params.intensity} min={0} max={100} onChange={(v) => updateParam("intensity", v)} suffix="%" />
          </Field>
        </div>
      </div>
    </div>
  );
}
