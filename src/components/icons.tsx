import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const HandIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M10 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M13 11V5.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M16 11.5V8.5a1.5 1.5 0 0 1 3 0v6.5a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-5.4-3.36L4 14" />
  </svg>
)

export const PointIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
)

export const PolylineIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 18 10 8l4 6 6-10" />
    <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    <circle cx="10" cy="8" r="1.5" fill="currentColor" />
    <circle cx="14" cy="14" r="1.5" fill="currentColor" />
    <circle cx="20" cy="4" r="1.5" fill="currentColor" />
  </svg>
)

export const PolygonIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m12 3 8 5-3 10H7L4 8l8-5Z" />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
  </svg>
)

export const FolderOpenIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
    <path d="m3 9 1.5 9A2 2 0 0 0 6.5 19h11a2 2 0 0 0 2-1.5L21 11H5l-1-2H3Z" />
  </svg>
)

export const DownloadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
)

export const LayersIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
)

export const CopyIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 6l12 12" />
    <path d="M6 18 18 6" />
  </svg>
)

export const ResetIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
)

export const EyeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const EyeOffIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m3 3 18 18" />
    <path d="M10.6 6.1A10.4 10.4 0 0 1 12 6c6.5 0 10 6 10 6a17.3 17.3 0 0 1-3.4 4.3" />
    <path d="M6.6 7.4A17.3 17.3 0 0 0 2 12s3.5 6 10 6c1.6 0 3-.4 4.3-1.1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

export const SparkleIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3v4" />
    <path d="M12 17v4" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="m5.6 5.6 2.8 2.8" />
    <path d="m15.6 15.6 2.8 2.8" />
    <path d="m5.6 18.4 2.8-2.8" />
    <path d="m15.6 8.4 2.8-2.8" />
  </svg>
)

export const GitHubIcon = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor" stroke="none">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
  </svg>
)
