// Ícones de traço (1.5px), no estilo outline. Herdam a cor do texto ao lado.

interface IconProps {
  className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function TodayIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  );
}

export function PracticeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  );
}

export function RepertoireIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l3.5-1 2.5 13.5-3.5 1z" />
    </svg>
  );
}

export function StudyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 5v14M13 5v14M18 5v14" />
      <path d="M6.5 5v7M11 5v7M15.5 5v7" strokeWidth={3} />
    </svg>
  );
}

export function ProgressIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 19h16" />
      <path d="M5 15l4-4 3 3 6-7" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} className={className}>
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

export function NoteIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M10 17V7l7-1.5v10" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="15" cy="15.5" r="2" />
    </svg>
  );
}

export function PlugIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

export function ExpandIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h6" />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </svg>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3" />
    </svg>
  );
}
