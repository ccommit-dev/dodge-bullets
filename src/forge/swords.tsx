type SwordArtProps = {
  level: number;
  hue: number;
  name: string;
};

function metal(hue: number, light: number, sat = 70): string {
  return `hsl(${hue} ${sat}% ${light}%)`;
}

/** Distinct silhouette + ornaments per enhancement tier. */
export function SwordArt({ level, hue, name }: SwordArtProps) {
  const id = `blade-${level}`;
  const tip = metal(hue, 72, 80);
  const mid = metal(hue, 52);
  const deep = metal(hue, 28, 55);
  const glow = metal(hue, 78, 90);
  const grip = level >= 10 ? metal(hue, 22, 40) : "#3b2418";
  const trim = level >= 8 ? glow : "#fbbf24";

  return (
    <svg className="forge-sword" viewBox="0 0 220 360" aria-label={name}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={deep} />
          <stop offset="0.45" stopColor={tip} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
        <radialGradient id={`${id}-gem`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={glow} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
      </defs>

      {/* Blade body — shape changes by family */}
      {level <= 1 && (
        <path d="M110 34 L138 210 L110 248 L82 210 Z" fill={`url(#${id})`} />
      )}
      {level >= 2 && level <= 4 && (
        <path d="M110 18 L152 228 L110 274 L68 228 Z" fill={`url(#${id})`} />
      )}
      {level >= 5 && level <= 7 && (
        <path
          d="M110 14 L146 120 L158 220 L110 278 L62 220 L74 120 Z"
          fill={`url(#${id})`}
        />
      )}
      {level >= 8 && level <= 10 && (
        <>
          <path
            d="M110 10 L164 210 L132 236 L110 290 L88 236 L56 210 Z"
            fill={`url(#${id})`}
          />
          <path
            d="M86 150 L110 40 L134 150"
            fill="none"
            stroke={glow}
            strokeWidth="3"
            opacity="0.7"
          />
        </>
      )}
      {level >= 11 && level <= 13 && (
        <>
          <path
            d="M110 8 L170 198 L140 230 L110 302 L80 230 L50 198 Z"
            fill={`url(#${id})`}
          />
          <path d="M78 90 L110 24 L142 90 L110 78 Z" fill={glow} opacity="0.55" />
        </>
      )}
      {level >= 14 && (
        <>
          <path
            d="M110 6 L176 186 L146 220 L128 248 L110 312 L92 248 L74 220 L44 186 Z"
            fill={`url(#${id})`}
          />
          <path
            d="M70 120 L110 20 L150 120 L128 140 L110 70 L92 140 Z"
            fill={glow}
            opacity="0.45"
          />
          <circle cx="110" cy="150" r="10" fill={`url(#${id}-gem)`} />
        </>
      )}

      {/* Fuller / edge line */}
      <path
        d={
          level <= 1
            ? "M110 42 L110 228"
            : level <= 7
              ? "M110 28 L110 250"
              : "M110 20 L110 268"
        }
        stroke="rgba(255,255,255,.78)"
        strokeWidth={level >= 10 ? 5 : 3.5}
        strokeLinecap="round"
      />

      {/* Cross-guard */}
      {level <= 3 && (
        <path
          d="M52 236 Q110 214 168 236 L156 258 Q110 244 64 258 Z"
          fill={grip}
          stroke={trim}
          strokeWidth="3"
        />
      )}
      {level >= 4 && level <= 7 && (
        <path
          d="M40 232 L74 224 L110 242 L146 224 L180 232 L164 262 L110 248 L56 262 Z"
          fill={grip}
          stroke={trim}
          strokeWidth="3"
        />
      )}
      {level >= 8 && (
        <path
          d="M34 228 L70 214 L110 246 L150 214 L186 228 L168 266 L110 252 L52 266 Z"
          fill={grip}
          stroke={trim}
          strokeWidth="3.5"
        />
      )}

      {/* Wing / flame / frost ornaments */}
      {level === 5 && (
        <>
          <path d="M70 200 Q48 170 66 140" fill="none" stroke={glow} strokeWidth="5" />
          <path d="M150 200 Q172 170 154 140" fill="none" stroke={glow} strokeWidth="5" />
        </>
      )}
      {level === 6 && (
        <>
          <path d="M92 90 L110 48 L128 90" fill="none" stroke={glow} strokeWidth="4" />
          <path d="M78 140 L110 96 L142 140" fill="none" stroke={glow} strokeWidth="3" />
        </>
      )}
      {level === 7 && (
        <>
          <circle cx="84" cy="120" r="5" fill={glow} opacity="0.8" />
          <circle cx="136" cy="150" r="4" fill={glow} opacity="0.7" />
          <circle cx="96" cy="180" r="3.5" fill={glow} opacity="0.6" />
        </>
      )}
      {level === 9 && (
        <>
          <circle cx="110" cy="96" r="6" fill={`url(#${id}-gem)`} />
          <circle cx="90" cy="140" r="3" fill={glow} />
          <circle cx="130" cy="140" r="3" fill={glow} />
          <circle cx="110" cy="176" r="3" fill={glow} />
        </>
      )}
      {level === 10 && (
        <path
          d="M68 188 Q52 160 74 128 L90 156 Z M152 188 Q168 160 146 128 L130 156 Z"
          fill={deep}
          stroke={glow}
          strokeWidth="2"
        />
      )}
      {level >= 12 && (
        <path
          d="M58 210 L42 188 L70 196 M162 210 L178 188 L150 196"
          fill="none"
          stroke={trim}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}

      {/* Grip + pommel */}
      <rect
        x={level >= 11 ? 94 : 97}
        y={level >= 8 ? 250 : 248}
        width={level >= 11 ? 32 : 26}
        height={level >= 11 ? 72 : 62}
        rx="12"
        fill={grip}
        stroke={trim}
        strokeWidth="3"
      />
      {level >= 3 && (
        <path
          d={`M${level >= 11 ? 100 : 103} 262 H${level >= 11 ? 120 : 117}`}
          stroke={trim}
          strokeWidth="2"
          opacity="0.7"
        />
      )}
      <circle
        cx="110"
        cy={level >= 11 ? 334 : 322}
        r={level >= 11 ? 22 : 17}
        fill={level >= 8 ? `url(#${id}-gem)` : grip}
        stroke={trim}
        strokeWidth="3"
      />
      {level === 15 && (
        <>
          <circle cx="110" cy="110" r="14" fill="none" stroke={glow} strokeWidth="2" opacity="0.7" />
          <circle cx="110" cy="110" r="22" fill="none" stroke={glow} strokeWidth="1.5" opacity="0.4" />
        </>
      )}
    </svg>
  );
}
