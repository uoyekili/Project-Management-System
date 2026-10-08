import { useId } from "react";

type SoftwareLogoProps = {
  className?: string;
  subtitle?: string;
  title?: string;
};

export function SoftwareLogo({
  className,
  subtitle,
  title = "TaskFlow",
}: SoftwareLogoProps) {
  const isBrand = title === "TaskFlow";
  const uid = useId().replace(/:/g, "");
  const bgId = `tf-bg-${uid}`;
  const goldId = `tf-gold-${uid}`;
  const clipId = `tf-clip-${uid}`;

  return (
    <div className={["software-logo", className].filter(Boolean).join(" ")}>
      <span className="software-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 96 96" role="presentation">
          <defs>
            <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6A95FF" />
              <stop offset="0.55" stopColor="#2F55E8" />
              <stop offset="1" stopColor="#1B2F9F" />
            </linearGradient>
            <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFD166" />
              <stop offset="1" stopColor="#FF9A1F" />
            </linearGradient>
            <clipPath id={clipId}>
              <rect width="96" height="96" rx="24" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect width="96" height="96" fill={`url(#${bgId})`} />
            <circle cx="18" cy="6" r="62" fill="#FFFFFF" opacity="0.1" />
            <circle cx="92" cy="100" r="44" fill="#0B1B66" opacity="0.18" />
          </g>
          <rect x="1" y="1" width="94" height="94" rx="23" fill="none" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="2" />
          <path d="M24 52C26 72 44 84 66 81" fill="none" stroke="#6FD6FF" strokeWidth="4.5" strokeLinecap="round" />
          <g fill="none" stroke="#0B1B66" strokeOpacity="0.3" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 3)">
            <path d="M30 32H66" />
            <path d="M48 32V55C48 65 53 70 61 70" />
          </g>
          <g fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 32H66" />
            <path d="M48 32V55C48 65 53 70 61 70" />
          </g>
          <path d="M76 12L77.6 16.4L82 18L77.6 19.6L76 24L74.4 19.6L70 18L74.4 16.4Z" fill="#FFFFFF" opacity="0.9" />
          <circle cx="71" cy="70" r="11" fill={`url(#${goldId})`} stroke="#FFFFFF" strokeWidth="3" />
          <path d="M65.5 70.5L69.5 74.5L77 66" fill="none" stroke="#14257A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div className="software-logo-copy">
        <strong>
          {isBrand ? (
            <>
              <span className="software-logo-task">Task</span>
              <span className="software-logo-flow">Flow</span>
            </>
          ) : (
            title
          )}
        </strong>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}
