import { useMemo } from "react";
import clsx from "clsx";
import { CheckIcon } from "./icons";
import type { PhotoPreset } from "../types";

const ALL_CATEGORY = "Tất cả";

/** Category-filterable grid of color-grading presets, shared by the photo
 * editor and the video panel's "Chỉnh màu" section — both apply the same
 * `PhotoFilterParams` engine. */
export function PresetGrid({
  presets,
  activeCategory,
  onCategoryChange,
  selectedId,
  onSelect,
  maxHeight = 320,
}: {
  presets: PhotoPreset[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  selectedId: string | null;
  onSelect: (preset: PhotoPreset) => void;
  maxHeight?: number;
}) {
  const categories = useMemo(() => {
    const set = new Set(presets.map((p) => p.category));
    return [ALL_CATEGORY, ...Array.from(set)];
  }, [presets]);

  const visiblePresets = useMemo(
    () =>
      activeCategory === ALL_CATEGORY
        ? presets
        : presets.filter((p) => p.category === activeCategory),
    [presets, activeCategory],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={clsx(
              "rounded-full px-2.5 py-1 text-[11.5px] font-medium cursor-pointer",
              activeCategory === cat
                ? "bg-[var(--accent)] text-white"
                : "bg-white/[0.05] text-[var(--text-muted)] hover:bg-white/[0.09]",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div
        className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {visiblePresets.map((preset) => {
          const selected = selectedId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset)}
              className={clsx(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-[10px] border px-2 py-3 text-center text-[11.5px] font-medium leading-tight cursor-pointer transition-colors",
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--border)] bg-white/[0.03] text-[var(--text-muted)] hover:bg-white/[0.07] hover:text-[var(--text)]",
              )}
            >
              {selected && (
                <CheckIcon
                  size={11}
                  className="absolute right-1.5 top-1.5 text-[var(--accent-strong)]"
                />
              )}
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
