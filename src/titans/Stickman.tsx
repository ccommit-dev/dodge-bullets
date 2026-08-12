type StickmanProps = {
  hue: number;
  name: string;
  attacking?: boolean;
  size?: number;
};

/** Compact stickman companion — same language as the dodge-game stickman. */
export function Stickman({ hue, name, attacking = false, size = 46 }: StickmanProps) {
  const color = `hsl(${hue} 70% 62%)`;
  return (
    <div
      className={`titans-stick ${attacking ? "atk" : ""}`}
      style={{ width: size, height: size * 1.35, color }}
      title={name}
      aria-label={name}
    >
      <svg viewBox="0 0 40 54" width="100%" height="100%">
        <ellipse cx="20" cy="50" rx="10" ry="2.4" fill="rgba(0,0,0,.28)" />
        <circle cx="20" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path
          d="M20 16 L20 34"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          className="arm-l"
          d="M20 20 L10 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          className="arm-r"
          d="M20 20 L30 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          className="leg-l"
          d="M20 34 L12 46"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          className="leg-r"
          d="M20 34 L28 46"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          className="sword"
          d="M30 26 L38 18"
          fill="none"
          stroke={`hsl(${hue} 90% 72%)`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
