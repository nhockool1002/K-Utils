import { Field, SegmentedControl, Slider, ColorSwatch, IconButton } from "./ui";
import {
  XIcon,
  SpinnerIcon,
  AlertIcon,
  RetryIcon,
  TextSizeIcon,
  AlignBottomIcon,
  PaletteIcon,
} from "./icons";

export function PreviewModal({
  imageUrl,
  loading,
  error,
  fileName,
  fontSize,
  setFontSize,
  fontColor,
  setFontColor,
  outlineColor,
  setOutlineColor,
  position,
  setPosition,
  onClose,
  onRegenerate,
}: {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  fileName: string;
  fontSize: number;
  setFontSize: (v: number) => void;
  fontColor: string;
  setFontColor: (v: string) => void;
  outlineColor: string;
  setOutlineColor: (v: string) => void;
  position: "bottom" | "top";
  setPosition: (v: "bottom" | "top") => void;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-8"
      onClick={onClose}
    >
      <div
        className="modal-surface fade-in flex max-h-full w-full max-w-[920px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 items-center justify-center bg-black/55 p-4">
          {loading && !imageUrl && (
            <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
              <SpinnerIcon size={22} />
              <span className="text-[12.5px]">Đang tạo bản xem trước…</span>
            </div>
          )}
          {error && (
            <div className="flex max-h-full max-w-[420px] flex-col items-center gap-2 text-center text-[var(--danger)]">
              <AlertIcon size={22} />
              <span className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-[12px]">
                {error}
              </span>
            </div>
          )}
          {imageUrl && !error && (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Xem trước phụ đề"
                className="max-h-[70vh] max-w-full rounded-[8px] object-contain"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-black/40">
                  <SpinnerIcon size={20} className="text-white" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--border)] p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold">Xem trước &amp; tinh chỉnh</p>
              <p className="truncate text-[11.5px] text-[var(--text-faint)]">
                {fileName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton
                size="sm"
                variant="ghost"
                icon={<RetryIcon size={14} />}
                tooltip="Tạo lại bản xem trước"
                onClick={onRegenerate}
              />
              <IconButton
                size="sm"
                variant="ghost"
                icon={<XIcon size={15} />}
                tooltip="Đóng"
                onClick={onClose}
              />
            </div>
          </div>

          <Field label="Cỡ chữ phụ đề" icon={<TextSizeIcon size={13} />}>
            <Slider value={fontSize} min={14} max={56} onChange={setFontSize} suffix="px" />
          </Field>
          <Field label="Vị trí" icon={<AlignBottomIcon size={13} />}>
            <SegmentedControl
              value={position}
              onChange={(v) => setPosition(v as "bottom" | "top")}
              options={[
                { value: "bottom", label: "Dưới" },
                { value: "top", label: "Trên" },
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
      </div>
    </div>
  );
}
