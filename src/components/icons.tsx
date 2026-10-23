type IconProps = { size?: number; className?: string };

const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const FilmIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </svg>
);

export const CaptionsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M7 10.5h3M7 14h5M14 10.5h3M14 14h3" />
  </svg>
);

export const QueueIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

export const FolderIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 17z" />
  </svg>
);

export const PlusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const XIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const CheckCircleIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.2l2.4 2.4 4.6-5" />
  </svg>
);

export const AlertIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
    <path d="M12 9.5v4.2M12 16.8h.01" />
  </svg>
);

export const TrashIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);

export const StopIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const SpinnerIcon = ({ size, className }: IconProps) => (
  <svg
    {...base(size)}
    className={className}
    style={{ animation: "spin 0.8s linear infinite" }}
  >
    <path d="M12 3a9 9 0 1 0 9 9" />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </svg>
);

export const RetryIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 10a8 8 0 0 1 14-5.2M20 14a8 8 0 0 1-14 5.2" />
    <path d="M18 3v5h-5M6 21v-5h5" />
  </svg>
);

export const TerminalIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M7 9.5 10.5 12 7 14.5M12.5 14.5h4.5" />
  </svg>
);

export const EyeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const InfoIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5h.01" />
  </svg>
);

export const FolderOpenIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h7a1.5 1.5 0 0 1 1.47 1.8l-1.2 6A1.5 1.5 0 0 1 16.8 16.5H5.7a1.5 1.5 0 0 1-1.47-1.2L3 8.2A1.3 1.3 0 0 1 3.5 7Z" />
  </svg>
);

export const ExternalLinkIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M9 6H6.5A1.5 1.5 0 0 0 5 7.5v10A1.5 1.5 0 0 0 6.5 19h10a1.5 1.5 0 0 0 1.5-1.5V15" />
    <path d="M13 5h6v6M18.5 5.5 11 13" />
  </svg>
);

export const BroomIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="m19 4-6.5 6.5M6 21l1.5-4.5a3 3 0 0 1 1.9-1.9L14 13l2 2-1.6 4.6a3 3 0 0 1-1.9 1.9L8 23" />
    <path d="M9.5 15.5 4 10l3-3 5.5 5.5" />
  </svg>
);

export const CpuIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M9 3v2.5M15 3v2.5M9 18.5V21M15 18.5V21M3 9h2.5M3 15h2.5M18.5 9H21M18.5 15H21" />
  </svg>
);

export const ExpandIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
  </svg>
);

export const GaugeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 16a7.5 7.5 0 1 1 15 0" />
    <path d="M12 16l3.5-4" />
    <path d="M12 16h.01" />
  </svg>
);

export const VolumeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 10v4h3.5L12 17.5v-11L7.5 10H4Z" />
    <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
  </svg>
);

export const TextSizeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7V5.5h9V7M8.5 5.5V18M6.5 18h4M15 12V11h6v1M18 11v7M16.5 18h3" />
  </svg>
);

export const AlignBottomIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20h16M8 4v11M16 4v7" />
  </svg>
);

export const PaletteIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.5 1.5-1.3 0-.4-.2-.7-.4-1a1.3 1.3 0 0 1 1-2.2H16a4 4 0 0 0 4-4c0-5-3.6-9.5-8-9.5Z" />
    <circle cx="7.5" cy="12" r="1" />
    <circle cx="9" cy="8" r="1" />
    <circle cx="14" cy="7.5" r="1" />
  </svg>
);

export const SparkIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);

export const RotateIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 10a8 8 0 0 1 14-5.2" />
    <path d="M18 2v5h-5" />
    <rect x="5" y="13" width="9" height="9" rx="1.5" />
  </svg>
);

export const FlipHorizontalIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v18" />
    <path d="M16 7h3l-3 3M19 10v4M16 17h3l-3-3" />
    <path d="M8 7H5l3 3M5 10v4M8 17H5l3-3" />
  </svg>
);

export const CropIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </svg>
);

export const ImageIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m3 16 5-5 4 4 3-3 6 6" />
  </svg>
);

export const WandIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20 15 9" />
    <path d="M14 4v3M19 7h-3M19 3l1.5 1.5M20 11l-1 1" />
    <path d="m14 4 1 1" />
  </svg>
);

export const UploadIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 16V4M12 4 8 8M12 4l4 4" />
    <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
  </svg>
);

export const FlipVerticalIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 12h18" />
    <path d="M7 8V5l-3 3M10 5v3M17 8V5l3 3M14 5v3" />
    <path d="M7 16v3l-3-3M10 19v-3M17 16v3l3-3M14 19v-3" />
  </svg>
);
