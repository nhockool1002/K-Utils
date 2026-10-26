import { useEffect, useRef, useState } from "react";
import { DropZone } from "./DropZone";
import { PreviewModal } from "./PreviewModal";
import { PresetGrid } from "./PresetGrid";
import {
  Field,
  Select,
  SegmentedControl,
  Button,
  Badge,
  Slider,
  ColorSwatch,
  Toggle,
  IconButton,
} from "./ui";
import {
  FilmIcon,
  XIcon,
  CaptionsIcon,
  EyeIcon,
  CpuIcon,
  ExpandIcon,
  GaugeIcon,
  VolumeIcon,
  FolderOpenIcon,
  TextSizeIcon,
  AlignBottomIcon,
  PaletteIcon,
  QueueIcon,
  RotateIcon,
  CropIcon,
  WandIcon,
} from "./icons";
import {
  pickVideoFiles,
  pickSubtitleFile,
  baseName,
  stripExt,
  dirName,
  pickOutputDir,
  previewVideoFrame,
} from "../lib/api";
import { listPhotoPresets } from "../lib/photoApi";
import { NEUTRAL_GRADING_PARAMS } from "../lib/grading";
import {
  ENCODER_OPTIONS,
  RESOLUTION_OPTIONS,
  AUDIO_BITRATE_OPTIONS,
  QUALITY_LEVELS,
  QUALITY_LABELS,
  ROTATE_OPTIONS,
  CROP_ASPECT_OPTIONS,
  resolveQuality,
  isHardwareEncoder,
  type QualityLevel,
} from "../lib/quality";
import type {
  EncoderId,
  VideoJobOptions,
  QueueJob,
  SubtitleMode,
  CropAspect,
  RotateDeg,
  PhotoFilterParams,
  PhotoPreset,
} from "../types";
import { useQueueStore } from "../store/queue";

interface PendingItem {
  path: string;
  subtitlePath: string | null;
}

const CROP_NONE = "none";

function buildSummary(options: VideoJobOptions): string {
  const parts: string[] = [];
  if (options.rotate !== 0) parts.push(`Xoay ${options.rotate}°`);
  if (options.flip_h) parts.push("Lật ngang");
  if (options.flip_v) parts.push("Lật dọc");
  if (options.crop_aspect) parts.push(`Crop ${options.crop_aspect}`);
  if (Math.abs(options.speed - 1) > 0.001) {
    parts.push(`Tốc độ ${options.speed}x`);
  }
  if (options.subtitle_mode === "soft") parts.push("Phụ đề mềm");
  if (options.subtitle_mode === "hard") parts.push("Phụ đề cứng");
  if (options.grading) parts.push("Chỉnh màu");
  if (options.mute_audio) parts.push("Tắt âm thanh");
  parts.push(options.compress ? "Nén video" : "Giữ chất lượng gốc");
  return parts.join(" · ");
}

export function VideoPanel() {
  const [pending, setPending] = useState<PendingItem[]>([]);

  const [rotate, setRotate] = useState<RotateDeg>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropAspect, setCropAspect] = useState<CropAspect>(null);
  const [speed, setSpeed] = useState(1);

  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>("none");
  const [fontSize, setFontSize] = useState(26);
  const [fontColor, setFontColor] = useState("#FFFFFF");
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [position, setPosition] = useState<"bottom" | "top">("bottom");

  const [gradingEnabled, setGradingEnabled] = useState(false);
  const [gradingParams, setGradingParams] = useState<PhotoFilterParams>(NEUTRAL_GRADING_PARAMS);
  const [gradingPresets, setGradingPresets] = useState<PhotoPreset[]>([]);
  const [gradingCategory, setGradingCategory] = useState("Tất cả");
  const [gradingPresetId, setGradingPresetId] = useState<string | null>(null);

  const [compress, setCompress] = useState(true);
  const [encoder, setEncoder] = useState<EncoderId>("h264_videotoolbox");
  const [resolution, setResolution] = useState("source");
  const [quality, setQuality] = useState<QualityLevel>("medium");
  const [audioBitrate, setAudioBitrate] = useState("128k");
  const [muteAudio, setMuteAudio] = useState(false);

  const [outputDir, setOutputDir] = useState<string | null>(null);
  const addJobs = useQueueStore((s) => s.addJobs);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestId = useRef(0);

  const needsSubtitle = subtitleMode !== "none";

  useEffect(() => {
    listPhotoPresets().then(setGradingPresets).catch(() => {});
  }, []);

  const applyGradingPreset = (preset: PhotoPreset) => {
    setGradingParams(preset.params);
    setGradingPresetId(preset.id);
  };

  const addFiles = (paths: string[]) => {
    setPending((prev) => {
      const existing = new Set(prev.map((p) => p.path));
      const additions = paths
        .filter((p) => !existing.has(p))
        .map((path) => ({ path, subtitlePath: null }));
      return [...prev, ...additions];
    });
  };

  const browse = async () => {
    const files = await pickVideoFiles();
    if (files.length) addFiles(files);
  };

  const removePending = (path: string) => {
    setPending((prev) => prev.filter((p) => p.path !== path));
  };

  const assignSubtitle = async (path: string) => {
    const sub = await pickSubtitleFile();
    if (!sub) return;
    setPending((prev) =>
      prev.map((p) => (p.path === path ? { ...p, subtitlePath: sub } : p)),
    );
  };

  const chooseOutputDir = async () => {
    const dir = await pickOutputDir();
    if (dir) setOutputDir(dir);
  };

  const buildOptions = (): VideoJobOptions => ({
    rotate,
    flip_h: flipH,
    flip_v: flipV,
    crop_aspect: cropAspect,
    speed,
    subtitle_mode: subtitleMode,
    font_size: fontSize,
    font_color: fontColor,
    outline_color: outlineColor,
    position,
    compress,
    encoder,
    quality: resolveQuality(encoder, quality, resolution),
    resolution: resolution === "source" ? null : resolution,
    audio_bitrate: audioBitrate,
    mute_audio: muteAudio,
    grading: gradingEnabled ? gradingParams : null,
  });

  const runPreview = async (path: string, subtitlePath: string | null) => {
    const requestId = ++previewRequestId.current;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const options = buildOptions();
      const subtitleArg = options.subtitle_mode === "hard" ? subtitlePath : null;
      const img = await previewVideoFrame(path, subtitleArg, options);
      if (requestId !== previewRequestId.current) return; // a newer request superseded this one
      setPreviewImage(img);
    } catch (err) {
      if (requestId !== previewRequestId.current) return;
      setPreviewError(String(err));
    } finally {
      if (requestId === previewRequestId.current) setPreviewLoading(false);
    }
  };

  const openPreview = (path: string) => {
    setPreviewImage(null);
    setPreviewError(null);
    setPreviewPath(path);
  };

  // Opening a new preview (or switching to a different file) generates
  // immediately — no debounce, since nothing else is pending yet.
  useEffect(() => {
    if (!previewPath) return;
    const item = pending.find((p) => p.path === previewPath);
    if (!item) return;
    void runPreview(previewPath, item.subtitlePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPath]);

  // Tweaking any transform/style control while the modal is open
  // regenerates after a short debounce. Deliberately excludes
  // `previewPath` so it doesn't double-fire alongside the effect above.
  useEffect(() => {
    if (!previewPath) return;
    const item = pending.find((p) => p.path === previewPath);
    if (!item) return;
    const timer = setTimeout(() => {
      void runPreview(previewPath, item.subtitlePath);
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rotate,
    flipH,
    flipV,
    cropAspect,
    subtitleMode,
    fontSize,
    fontColor,
    outlineColor,
    position,
    compress,
    resolution,
    gradingEnabled,
    gradingParams,
  ]);

  const readyCount = needsSubtitle
    ? pending.filter((p) => p.subtitlePath).length
    : pending.length;

  const enqueue = () => {
    const ready = needsSubtitle
      ? pending.filter((p) => p.subtitlePath)
      : pending;
    if (!ready.length) return;
    const options = buildOptions();
    const summary = buildSummary(options);
    const jobs: QueueJob[] = ready.map(({ path, subtitlePath }) => {
      const name = baseName(path);
      const dir = outputDir ?? dirName(path);
      const outputPath = `${dir}/${stripExt(name)}_kutils.mp4`;
      return {
        id: crypto.randomUUID(),
        inputPath: path,
        inputName: name,
        subtitlePath: subtitlePath ?? undefined,
        subtitleName: subtitlePath ? baseName(subtitlePath) : undefined,
        outputPath,
        status: "queued",
        percent: 0,
        summary,
        options,
        createdAt: Date.now(),
      };
    });
    addJobs(jobs);
    setPending((prev) => (needsSubtitle ? prev.filter((p) => !p.subtitlePath) : []));
  };

  const previewItem = pending.find((p) => p.path === previewPath);

  return (
    <div className="fade-in flex h-full flex-col gap-4 overflow-y-auto px-7 py-6">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Xử lý video</h1>
        <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
          Kết hợp xoay, crop, tốc độ, phụ đề và nén video trong một tác vụ duy
          nhất — xử lý một lần, không mất chất lượng qua nhiều bước.
        </p>
      </div>

      <DropZone
        onFiles={addFiles}
        onBrowse={browse}
        label="Kéo thả video vào đây"
        sublabel="Hỗ trợ MP4, MOV, M4V, MKV, AVI, WEBM — có thể chọn nhiều file"
      />

      {pending.length > 0 && (
        <div className="panel fade-in flex shrink-0 flex-col divide-y divide-[var(--border)] overflow-hidden">
          {pending.map(({ path, subtitlePath }) => (
            <div
              key={path}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px]"
            >
              <FilmIcon size={15} className="shrink-0 text-[var(--text-muted)]" />
              <span className="flex-1 truncate">{baseName(path)}</span>
              <IconButton
                size="sm"
                icon={<EyeIcon size={13} />}
                tooltip="Xem trước"
                onClick={() => openPreview(path)}
              />
              {needsSubtitle && (
                <button
                  type="button"
                  onClick={() => assignSubtitle(path)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11.5px] hover:bg-white/[0.1] cursor-pointer"
                >
                  <CaptionsIcon size={12} />
                  {subtitlePath ? (
                    <span className="max-w-[120px] truncate text-[var(--success)]">
                      {baseName(subtitlePath)}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">Chọn phụ đề…</span>
                  )}
                </button>
              )}
              <IconButton
                size="sm"
                variant="ghost"
                icon={<XIcon size={13} />}
                tooltip="Xoá khỏi danh sách"
                onClick={() => removePending(path)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="panel flex flex-col gap-4 p-4">
        <Field label="Phụ đề" icon={<CaptionsIcon size={13} />}>
          <SegmentedControl
            value={subtitleMode}
            onChange={(v) => setSubtitleMode(v as SubtitleMode)}
            options={[
              { value: "none", label: "Không ghép" },
              { value: "soft", label: "Phụ đề mềm" },
              { value: "hard", label: "Phụ đề cứng" },
            ]}
          />
        </Field>

        {subtitleMode === "hard" && (
          <div className="grid grid-cols-2 gap-4 rounded-[10px] bg-white/[0.03] p-3">
            <Field label="Cỡ chữ phụ đề" icon={<TextSizeIcon size={13} />}>
              <Slider value={fontSize} min={14} max={56} onChange={setFontSize} suffix="px" />
            </Field>
            <Field label="Vị trí" icon={<AlignBottomIcon size={13} />}>
              <SegmentedControl
                value={position}
                onChange={(v) => setPosition(v as "bottom" | "top")}
                options={[
                  { value: "bottom", label: "Phía dưới" },
                  { value: "top", label: "Phía trên" },
                ]}
              />
            </Field>
            <Field label="Màu chữ" icon={<PaletteIcon size={13} />}>
              <ColorSwatch value={fontColor} onChange={setFontColor} />
            </Field>
            <Field label="Màu viền" icon={<PaletteIcon size={13} />}>
              <ColorSwatch value={outlineColor} onChange={setOutlineColor} />
            </Field>
          </div>
        )}
        {subtitleMode === "soft" && (
          <p className="rounded-[10px] bg-white/[0.03] px-3 py-2 text-[11.5px] text-[var(--text-faint)]">
            Phụ đề sẽ được nhúng dưới dạng track riêng (không in lên hình), có
            thể tắt/mở khi phát video.
          </p>
        )}
      </div>

      <div className="panel grid grid-cols-2 gap-4 p-4">
        <Field label="Xoay video" icon={<RotateIcon size={13} />}>
          <SegmentedControl
            value={String(rotate)}
            onChange={(v) => setRotate(Number(v) as RotateDeg)}
            options={ROTATE_OPTIONS.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
          />
        </Field>
        <Field label="Tỷ lệ khung hình (Crop)" icon={<CropIcon size={13} />}>
          <Select
            value={cropAspect ?? CROP_NONE}
            onChange={(v) => setCropAspect(v === CROP_NONE ? null : (v as CropAspect))}
            options={CROP_ASPECT_OPTIONS.map((o) => ({
              value: o.value ?? CROP_NONE,
              label: o.label,
            }))}
          />
        </Field>
        <Toggle
          checked={flipH}
          onChange={setFlipH}
          label="Lật ngang"
          hint="Lật video theo chiều ngang"
        />
        <Toggle
          checked={flipV}
          onChange={setFlipV}
          label="Lật dọc"
          hint="Lật video theo chiều dọc"
        />
      </div>

      <div className="panel flex flex-col gap-3 p-4">
        <Field label="Tốc độ phát" icon={<GaugeIcon size={13} />} hint="0.25x (chậm) – 4x (nhanh)">
          <Slider value={speed} min={0.25} max={4} step={0.05} onChange={setSpeed} suffix="x" />
        </Field>
      </div>

      <div className="panel flex flex-col gap-3 p-4">
        <Toggle
          checked={gradingEnabled}
          onChange={setGradingEnabled}
          label="Chỉnh màu (Blend)"
          hint="Áp bộ lọc màu — phim nhựa, vintage, cổ điển… — giống tab Chỉnh ảnh"
        />

        {gradingEnabled && (
          <div className="flex flex-col gap-3 rounded-[10px] bg-white/[0.03] p-3">
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                icon={<WandIcon size={13} />}
                onClick={() => {
                  setGradingParams(NEUTRAL_GRADING_PARAMS);
                  setGradingPresetId(null);
                }}
              >
                Đặt lại
              </Button>
            </div>
            <PresetGrid
              presets={gradingPresets}
              activeCategory={gradingCategory}
              onCategoryChange={setGradingCategory}
              selectedId={gradingPresetId}
              onSelect={applyGradingPreset}
              maxHeight={180}
            />
            <Field
              label="Cường độ"
              icon={<GaugeIcon size={13} />}
              hint="Pha trộn giữa video gốc và bộ lọc màu"
            >
              <Slider
                value={gradingParams.intensity}
                min={0}
                max={100}
                onChange={(v) => setGradingParams((p) => ({ ...p, intensity: v }))}
                suffix="%"
              />
            </Field>
          </div>
        )}
      </div>

      <div className="panel flex flex-col gap-4 p-4">
        <Toggle
          checked={compress}
          onChange={setCompress}
          label="Nén video"
          hint={
            compress
              ? "Áp dụng độ phân giải & chất lượng bên dưới"
              : "Giữ chất lượng gần với video gốc nhất có thể"
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Bộ mã hoá" icon={<CpuIcon size={13} />}>
            <Select
              value={encoder}
              onChange={(v) => setEncoder(v as EncoderId)}
              options={ENCODER_OPTIONS}
            />
          </Field>
          <Field label="Âm thanh (AAC)" icon={<VolumeIcon size={13} />}>
            <Select
              value={audioBitrate}
              onChange={setAudioBitrate}
              options={AUDIO_BITRATE_OPTIONS}
            />
          </Field>

          {compress && (
            <>
              <Field label="Độ phân giải" icon={<ExpandIcon size={13} />}>
                <Select
                  value={resolution}
                  onChange={setResolution}
                  options={RESOLUTION_OPTIONS}
                />
              </Field>
              <Field
                label="Chất lượng"
                icon={<GaugeIcon size={13} />}
                hint={
                  isHardwareEncoder(encoder)
                    ? "Ảnh hưởng bitrate đầu ra"
                    : "Ảnh hưởng CRF (nhỏ hơn = nét hơn)"
                }
              >
                <SegmentedControl
                  value={quality}
                  onChange={(v) => setQuality(v as QualityLevel)}
                  options={QUALITY_LEVELS.map((l) => ({
                    value: l,
                    label: QUALITY_LABELS[l],
                  }))}
                />
              </Field>
            </>
          )}

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
        </div>

        <Toggle
          checked={muteAudio}
          onChange={setMuteAudio}
          label="Tắt âm thanh"
          hint="Video đầu ra sẽ không có âm thanh"
        />
      </div>

      <div className="mt-auto flex items-center justify-between pb-1">
        <div className="text-[12.5px] text-[var(--text-muted)]">
          {pending.length > 0 && (
            <Badge tone={readyCount ? "accent" : "warning"}>
              {needsSubtitle
                ? `${readyCount}/${pending.length} video đã có phụ đề`
                : `${readyCount} video đã chọn`}
            </Badge>
          )}
        </div>
        <Button
          variant="accent"
          icon={<QueueIcon size={14} />}
          disabled={!readyCount}
          onClick={enqueue}
        >
          Thêm vào hàng đợi
        </Button>
      </div>

      {previewPath && previewItem && (
        <PreviewModal
          imageUrl={previewImage}
          loading={previewLoading}
          error={previewError}
          fileName={baseName(previewPath)}
          fontSize={fontSize}
          setFontSize={setFontSize}
          fontColor={fontColor}
          setFontColor={setFontColor}
          outlineColor={outlineColor}
          setOutlineColor={setOutlineColor}
          position={position}
          setPosition={setPosition}
          onClose={() => setPreviewPath(null)}
          onRegenerate={() => runPreview(previewItem.path, previewItem.subtitlePath)}
        />
      )}
    </div>
  );
}
