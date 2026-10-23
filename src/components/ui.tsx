import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export function Field({
  label,
  children,
  hint,
  icon,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-muted)]">
        {icon && <span className="text-[var(--text-faint)]">{icon}</span>}
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[11px] text-[var(--text-faint)]">{hint}</span>
      )}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[10px] bg-white/[0.06] border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer hover:bg-white/[0.09]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#1a1d25]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex rounded-[10px] bg-white/[0.04] border border-[var(--border)] p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex-1 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium transition-all",
            value === o.value
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.05]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--accent)] cursor-pointer"
      />
      <span className="w-14 shrink-0 text-right text-[12.5px] tabular-nums text-[var(--text-muted)]">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export function ColorSwatch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative flex items-center gap-2 rounded-[10px] bg-white/[0.06] border border-[var(--border)] px-3 py-1.5">
      <div
        className="h-5 w-5 rounded-full border border-white/20 shrink-0"
        style={{ backgroundColor: value }}
      />
      <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
        {value.toUpperCase()}
      </span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-[10px] bg-white/[0.04] px-3 py-2.5 text-left cursor-pointer hover:bg-white/[0.06]"
    >
      <span>
        <span className="block text-[13px] font-medium text-[var(--text)]">
          {label}
        </span>
        {hint && (
          <span className="block text-[11px] text-[var(--text-faint)]">
            {hint}
          </span>
        )}
      </span>
      <span
        className={clsx(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--accent)]" : "bg-white/[0.14]",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function Tooltip({
  text,
  children,
  side = "bottom",
}: {
  text: string;
  children: ReactNode;
  side?: "bottom" | "top";
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const show = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: side === "bottom" ? rect.bottom + 6 : rect.top - 6,
      left: rect.left + rect.width / 2,
    });
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[300] -translate-x-1/2 whitespace-nowrap rounded-[7px] border border-[var(--border-strong)] bg-[#17191f] px-2 py-1 text-[11px] text-[var(--text)] shadow-lg"
            style={{
              top: pos.top,
              left: pos.left,
              transform:
                side === "bottom"
                  ? "translate(-50%, 0)"
                  : "translate(-50%, -100%)",
            }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}

export function IconButton({
  icon,
  tooltip,
  onClick,
  variant = "default",
  disabled,
  size = "md",
  tooltipSide = "bottom",
}: {
  icon: ReactNode;
  tooltip: string;
  onClick?: () => void;
  variant?: "default" | "accent" | "ghost" | "danger";
  disabled?: boolean;
  size?: "sm" | "md";
  tooltipSide?: "bottom" | "top";
}) {
  return (
    <Tooltip text={tooltip} side={tooltipSide}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
        className={clsx(
          "flex items-center justify-center rounded-[9px] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
          size === "md" ? "h-8 w-8" : "h-7 w-7",
          variant === "default" &&
            "bg-white/[0.06] text-[var(--text-muted)] hover:bg-white/[0.1] hover:text-[var(--text)]",
          variant === "ghost" &&
            "text-[var(--text-faint)] hover:bg-white/[0.06] hover:text-[var(--text)]",
          variant === "accent" &&
            "bg-[var(--accent-soft)] text-[var(--accent-strong)] hover:bg-[var(--accent)] hover:text-white",
          variant === "danger" &&
            "text-[var(--text-faint)] hover:bg-red-500/10 hover:text-[var(--danger)]",
        )}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  icon,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "accent" | "ghost" | "danger";
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-medium transition-all disabled:cursor-not-allowed cursor-pointer select-none",
        variant === "accent" && "btn-accent text-white",
        variant === "default" &&
          "bg-white/[0.06] border border-[var(--border)] text-[var(--text)] hover:bg-white/[0.1]",
        variant === "ghost" &&
          "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.06]",
        variant === "danger" &&
          "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "warning" | "accent";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "default" && "bg-white/[0.08] text-[var(--text-muted)]",
        tone === "success" && "bg-emerald-400/15 text-emerald-400",
        tone === "danger" && "bg-red-400/15 text-red-400",
        tone === "warning" && "bg-amber-400/15 text-amber-400",
        tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
      )}
    >
      {children}
    </span>
  );
}
