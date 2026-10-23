import clsx from "clsx";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useQueueStore } from "../store/queue";
import { Badge, Button, IconButton } from "./ui";
import {
  CaptionsIcon,
  CheckCircleIcon,
  FilmIcon,
  AlertIcon,
  SpinnerIcon,
  StopIcon,
  TrashIcon,
  RetryIcon,
  QueueIcon,
  ExternalLinkIcon,
  BroomIcon,
} from "./icons";
import type { QueueJob } from "../types";

function statusBadge(job: QueueJob) {
  switch (job.status) {
    case "queued":
      return <Badge>Đang chờ</Badge>;
    case "running":
      return <Badge tone="accent">Đang xử lý</Badge>;
    case "done":
      return <Badge tone="success">Hoàn tất</Badge>;
    case "error":
      return <Badge tone="danger">Lỗi</Badge>;
    case "canceled":
      return <Badge tone="warning">Đã huỷ</Badge>;
  }
}

function formatEta(seconds?: number) {
  if (seconds === undefined || !isFinite(seconds)) return null;
  const s = Math.round(seconds);
  if (s < 60) return `còn ${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `còn ${m}m ${rem}s`;
}

function JobRow({ job }: { job: QueueJob }) {
  const cancelJob = useQueueStore((s) => s.cancelJob);
  const retryJob = useQueueStore((s) => s.retryJob);
  const removeJob = useQueueStore((s) => s.removeJob);
  const Icon = job.options.subtitle_mode !== "none" ? CaptionsIcon : FilmIcon;

  return (
    <div className="panel fade-in flex flex-col gap-2.5 p-4">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
            job.status === "error"
              ? "bg-red-400/10 text-[var(--danger)]"
              : job.status === "done"
                ? "bg-emerald-400/10 text-[var(--success)]"
                : "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
          )}
        >
          {job.status === "running" ? (
            <SpinnerIcon size={16} />
          ) : job.status === "done" ? (
            <CheckCircleIcon size={17} />
          ) : job.status === "error" ? (
            <AlertIcon size={17} />
          ) : (
            <Icon size={16} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium">{job.inputName}</p>
          <p className="truncate text-[11.5px] text-[var(--text-muted)]">
            {job.summary}
          </p>
        </div>
        {statusBadge(job)}
      </div>

      {(job.status === "running" || job.status === "queued") && (
        <div className="flex flex-col gap-1.5">
          <div className="progress-track h-1.5 w-full">
            <div
              className="progress-fill h-full"
              style={{ width: `${job.status === "running" ? job.percent : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-faint)]">
            <span>
              {job.status === "running"
                ? `${job.percent.toFixed(0)}%${job.fps ? ` · ${job.fps.toFixed(0)} fps` : ""}${job.speed ? ` · ${job.speed.toFixed(2)}x` : ""}`
                : "Đang chờ trong hàng đợi"}
            </span>
            {job.status === "running" && formatEta(job.etaSeconds) && (
              <span>{formatEta(job.etaSeconds)}</span>
            )}
          </div>
        </div>
      )}

      {job.status === "error" && job.errorMessage && (
        <p className="line-clamp-2 rounded-[8px] bg-red-400/5 px-2.5 py-1.5 text-[11px] text-red-400/90">
          {job.errorMessage}
        </p>
      )}

      <div className="flex items-center justify-end gap-1.5">
        {(job.status === "running" || job.status === "queued") && (
          <IconButton
            variant="ghost"
            icon={<StopIcon size={14} />}
            tooltip="Huỷ"
            onClick={() => cancelJob(job.id)}
          />
        )}
        {(job.status === "error" || job.status === "canceled") && (
          <IconButton
            variant="ghost"
            icon={<RetryIcon size={14} />}
            tooltip="Thử lại"
            onClick={() => retryJob(job.id)}
          />
        )}
        {job.status === "done" && (
          <IconButton
            variant="ghost"
            icon={<ExternalLinkIcon size={14} />}
            tooltip="Hiện trong Finder"
            onClick={() => revealItemInDir(job.outputPath).catch(() => {})}
          />
        )}
        {job.status !== "running" && (
          <IconButton
            variant="danger"
            icon={<TrashIcon size={14} />}
            tooltip="Xoá"
            onClick={() => removeJob(job.id)}
          />
        )}
      </div>
    </div>
  );
}

export function QueueView() {
  const jobs = useQueueStore((s) => s.jobs);
  const clearFinished = useQueueStore((s) => s.clearFinished);
  const sorted = [...jobs].sort((a, b) => b.createdAt - a.createdAt);
  const hasFinished = jobs.some(
    (j) => j.status === "done" || j.status === "error" || j.status === "canceled",
  );

  return (
    <div className="fade-in flex h-full flex-col gap-5 overflow-y-auto px-8 py-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Hàng đợi</h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            Xử lý tuần tự từng video để máy luôn mát và mượt.
          </p>
        </div>
        {hasFinished && (
          <Button variant="default" icon={<BroomIcon size={14} />} onClick={clearFinished}>
            Dọn danh sách đã xong
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="panel flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-[var(--text-faint)]">
            <QueueIcon size={20} />
          </div>
          <p className="text-[13.5px] text-[var(--text-muted)]">
            Chưa có tác vụ nào. Hãy thêm video từ tab Xử lý video.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
