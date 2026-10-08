import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function createIcon(paths: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const MailIcon = createIcon(
  <>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </>,
);

export const LockIcon = createIcon(
  <>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
);

export const EyeIcon = createIcon(
  <>
    <path d="M2 12s3.6-8 10-8 10 8 10 8-3.6 8-10 8-10-8-10-8Z" />
    <path d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
  </>,
);

export const EyeOffIcon = createIcon(
  <>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
    <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5.1 0 8.7 4.4 10 8a13 13 0 0 1-2.1 3.7" />
    <path d="M6.5 6.5A12.5 12.5 0 0 0 2 12c1.3 3.6 4.9 8 10 8a9.8 9.8 0 0 0 5-1.4" />
  </>,
);

export const ListChecksIcon = createIcon(
  <>
    <path d="m3 17 2 2 4-4" />
    <path d="m3 7 2 2 4-4" />
    <path d="M13 6h8" />
    <path d="M13 12h8" />
    <path d="M13 18h8" />
  </>,
);

export const GanttIcon = createIcon(
  <>
    <path d="M8 6h10" />
    <path d="M6 12h9" />
    <path d="M11 18h7" />
  </>,
);

export const KanbanIcon = createIcon(
  <>
    <path d="M6 5v11" />
    <path d="M12 5v6" />
    <path d="M18 5v14" />
  </>,
);

export const PieChartIcon = createIcon(
  <>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </>,
);

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>,
);

export const ShieldCheckIcon = createIcon(
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);

export const AlertCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </>,
);

export const LoaderIcon = createIcon(<path d="M21 12a9 9 0 1 1-6.219-8.56" />);
