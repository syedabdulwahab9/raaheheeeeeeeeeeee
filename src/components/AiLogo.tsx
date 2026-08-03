/** Refined mark for the Islamic AI feature — an eight-point Islamic star framing
 *  a calligraphic crescent, with three quiet "thought" nodes that hint at AI.
 *  Pure currentColor, so it inherits theme and works in light and dark mode. */
export function AiLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      role="img"
      aria-label="Islamic AI"
      focusable="false"
    >
      {/* eight-point khatam star, drawn as two squares */}
      <g stroke="currentColor" strokeLinejoin="round" opacity="0.4">
        <rect x="6.4" y="6.4" width="19.2" height="19.2" rx="3.4" strokeWidth="1.2" />
        <rect
          x="6.4"
          y="6.4"
          width="19.2"
          height="19.2"
          rx="3.4"
          strokeWidth="1.2"
          transform="rotate(45 16 16)"
        />
      </g>

      {/* crescent */}
      <path
        d="M19.9 10.6a6.1 6.1 0 1 0 0 10.8 7.5 7.5 0 0 1 0-10.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* five-point star inside the crescent's embrace */}
      <path
        d="m21.9 14.1.72 1.46 1.61.24-1.17 1.14.28 1.6-1.44-.76-1.44.76.28-1.6-1.17-1.14 1.61-.24.72-1.46Z"
        fill="currentColor"
        opacity="0.9"
      />

      {/* quiet neural nodes */}
      <circle cx="10.4" cy="16" r="1.15" fill="currentColor" opacity="0.75" />
      <circle cx="13.1" cy="11.5" r="0.85" fill="currentColor" opacity="0.5" />
      <circle cx="13.1" cy="20.5" r="0.85" fill="currentColor" opacity="0.5" />
      <path
        d="M11.5 16h2.1M11.1 15.1l1.7-2.7M11.1 16.9l1.7 2.7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
