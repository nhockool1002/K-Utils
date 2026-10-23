import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FilmIcon, PlusIcon, InfoIcon } from "./icons";
import { Tooltip } from "./ui";
import { extOf } from "../lib/api";

const DEFAULT_VIDEO_EXTS = ["mp4", "mov", "m4v", "mkv", "avi", "webm"];

export function DropZone({
  onFiles,
  onBrowse,
  label,
  sublabel,
  extensions,
  icon,
}: {
  onFiles: (paths: string[]) => void;
  onBrowse: () => void;
  label: string;
  sublabel: string;
  /** Lowercase file extensions (no dot) accepted on drag-and-drop. Defaults
   * to the video formats the app started with. */
  extensions?: string[];
  icon?: ReactNode;
}) {
  const [dragActive, setDragActive] = useState(false);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;
  const extSet = new Set(extensions ?? DEFAULT_VIDEO_EXTS);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setDragActive(true);
        } else if (event.payload.type === "leave") {
          setDragActive(false);
        } else if (event.payload.type === "drop") {
          setDragActive(false);
          const paths = event.payload.paths.filter((p) =>
            extSet.has(extOf(p)),
          );
          if (paths.length) onFilesRef.current(paths);
        }
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={onBrowse}
      className={clsx(
        "dropzone fade-in flex shrink-0 items-center gap-2 py-2.5 px-3 cursor-pointer",
        dragActive && "drag-active",
      )}
    >
      {icon ?? (
        <FilmIcon size={14} className="shrink-0 text-[var(--accent-strong)]" />
      )}
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[var(--text)]">
        {label}
      </span>
      <Tooltip text={sublabel}>
        <InfoIcon size={13} className="shrink-0 text-[var(--text-faint)]" />
      </Tooltip>
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-[var(--text-muted)]">
        <PlusIcon size={12} />
        Chọn file
      </span>
    </div>
  );
}
