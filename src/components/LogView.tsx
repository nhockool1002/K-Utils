import { useEffect, useState } from "react";
import { useLogStore } from "../store/logs";
import { Button, Badge, IconButton } from "./ui";
import { TrashIcon, QueueIcon, ExpandIcon } from "./icons";
import clsx from "clsx";

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString("vi-VN", { hour12: false });
}

export function LogView() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [showAll, setShowAll] = useState(false);

  const cutoff = Date.now() - 15 * 60 * 1000;
  const shown = showAll ? entries : entries.filter((e) => e.timestamp_ms >= cutoff);
  const ordered = [...shown].reverse();

  useEffect(() => {
    useLogStore.getState().loadInitial();
  }, []);

  return (
    <div className="fade-in flex h-full flex-col gap-4 overflow-hidden px-8 py-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Nhật ký ứng dụng</h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            {showAll ? "Toàn bộ nhật ký phiên làm việc" : "15 phút gần nhất"} — dùng để debug khi
            có sự cố.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="default"
            icon={<ExpandIcon size={13} />}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Chỉ xem 15 phút" : "Xem toàn bộ"}
          </Button>
          <IconButton
            variant="danger"
            icon={<TrashIcon size={14} />}
            tooltip="Xoá nhật ký"
            onClick={() => clear()}
          />
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="panel flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-[var(--text-faint)]">
            <QueueIcon size={20} />
          </div>
          <p className="text-[13.5px] text-[var(--text-muted)]">
            Chưa có nhật ký nào trong khoảng thời gian này.
          </p>
        </div>
      ) : (
        <div className="panel flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-1 font-mono text-[11.5px] leading-relaxed">
            {ordered.map((e, i) => (
              <div key={i} className="flex gap-2 rounded px-2 py-1 hover:bg-white/[0.04]">
                <span className="shrink-0 text-[var(--text-faint)]">
                  {formatTime(e.timestamp_ms)}
                </span>
                <Badge
                  tone={
                    e.level === "error"
                      ? "danger"
                      : e.level === "info"
                        ? "accent"
                        : "default"
                  }
                >
                  {e.level}
                </Badge>
                <span
                  className={clsx(
                    "whitespace-pre-wrap break-all",
                    e.level === "error" ? "text-red-400/90" : "text-[var(--text-muted)]",
                  )}
                >
                  {e.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
