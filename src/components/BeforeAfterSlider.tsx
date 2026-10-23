import { useRef, useState, useCallback } from "react";
import clsx from "clsx";

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  afterLoading,
  split: controlledSplit,
  onSplitChange,
  className,
}: {
  beforeSrc: string;
  afterSrc: string | null;
  afterLoading: boolean;
  /** Pass to share the divider position with another instance (e.g. a
   * fullscreen modal opened from a smaller card). Omit for a self-contained
   * slider with its own internal position. */
  split?: number;
  onSplitChange?: (split: number) => void;
  /** Overrides sizing (default caps the card to a sensible preview size). */
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalSplit, setInternalSplit] = useState(50);
  const split = controlledSplit ?? internalSplit;
  const setSplit = onSplitChange ?? setInternalSplit;
  const dragging = useRef(false);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(100, Math.max(0, pct)));
    },
    [setSplit],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={clsx(
        "relative mx-auto select-none overflow-hidden rounded-[10px] bg-black/40 cursor-ew-resize",
        className ?? "aspect-[4/3] w-full max-w-[480px]",
      )}
    >
      <img
        src={beforeSrc}
        alt="Ảnh gốc"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      {afterSrc && (
        <div
          className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <img
            src={afterSrc}
            alt="Sau khi áp filter"
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>
      )}
      {afterLoading && (
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white">
          Đang render…
        </div>
      )}
      <div
        className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-white/90 shadow-[0_0_6px_rgba(0,0,0,0.5)]"
        style={{ left: `${split}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-black shadow-md">
          ⇔
        </div>
      </div>
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] text-white">
        Gốc
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] text-white">
        Sau
      </span>
    </div>
  );
}
