import clsx from "clsx";
import { FilmIcon, ImageIcon, ConvertIcon, PaletteIcon, QueueIcon, SparkIcon, TerminalIcon } from "./icons";
import { useQueueStore } from "../store/queue";

export type View = "video" | "blend_video" | "photo" | "convert" | "queue" | "logs";

const NAV: { id: View; label: string; icon: typeof FilmIcon }[] = [
  { id: "video", label: "Xử lý video", icon: FilmIcon },
  { id: "blend_video", label: "Chỉnh màu video", icon: PaletteIcon },
  { id: "photo", label: "Chỉnh ảnh", icon: ImageIcon },
  { id: "convert", label: "Đổi định dạng", icon: ConvertIcon },
  { id: "queue", label: "Hàng đợi", icon: QueueIcon },
];

export function Sidebar({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  const jobs = useQueueStore((s) => s.jobs);
  const activeCount = jobs.filter(
    (j) => j.status === "queued" || j.status === "running",
  ).length;

  return (
    <div className="titlebar-drag flex h-full w-[196px] shrink-0 flex-col border-r border-[var(--border)] pt-11 pb-4 px-3">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[var(--accent-strong)] to-[var(--accent)] text-white shadow-sm">
          <SparkIcon size={16} />
        </div>
        <span className="text-[14.5px] font-semibold tracking-tight">
          K-Utils
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={clsx(
                "nav-item flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium cursor-pointer",
                active
                  ? "bg-white/[0.08] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text)]",
              )}
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "queue" && activeCount > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10.5px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onChange("logs")}
          className={clsx(
            "nav-item flex items-center gap-2.5 rounded-[10px] px-3 py-1.5 text-[12px] font-medium cursor-pointer",
            view === "logs"
              ? "bg-white/[0.08] text-[var(--text)]"
              : "text-[var(--text-faint)] hover:bg-white/[0.04] hover:text-[var(--text-muted)]",
          )}
        >
          <TerminalIcon size={14} />
          <span className="flex-1 text-left">Nhật ký</span>
        </button>
        <div className="px-2 pt-1 text-[10.5px] leading-snug text-[var(--text-faint)]">
          Xử lý trên máy · VideoToolbox
          <br />
          tối ưu hiệu năng &amp; pin
        </div>
      </div>
    </div>
  );
}
