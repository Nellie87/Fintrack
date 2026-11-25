/**
 * FinTrack logo mark: rising bars with a teal trend line.
 * Same artwork as public/favicon.svg (which needs literal colours because it is loaded outside the app).
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      className="brand__mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="var(--color-navy-700)" />
      <rect x="7" y="17" width="4" height="8" rx="1" fill="var(--color-text-on-dark-muted)" />
      <rect x="14" y="13" width="4" height="12" rx="1" fill="var(--color-text-on-dark-muted)" />
      <rect x="21" y="9" width="4" height="16" rx="1" fill="var(--color-text-on-dark)" />
      <path
        d="M6 14 L13 10 L18 12 L26 6"
        fill="none"
        stroke="var(--color-accent-bright)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
