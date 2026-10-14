import type { CSSProperties, ReactNode } from "react";
import { rand } from "./dollShapes";

// Stage space is 1600x900. Back wall spans x 200..1400, floor meets it at y 540.
export const FLOOR_BACK = 540;
export const FLOOR_FRONT = 880;

const INK = "#14060f";
const GOLD = ["#fff1b8", "#e9b44c", "#9a5b16"];

/** A stage-space SVG cropped to `box` so composited layers stay small. */
function Layer({
  z,
  children,
  className = "",
  box = [0, 0, 1600, 900],
}: {
  z: number;
  children: ReactNode;
  className?: string;
  box?: [number, number, number, number];
}) {
  const [left, top, width, height] = box;
  return (
    <svg
      className={`room-layer ${className}`}
      viewBox={box.join(" ")}
      style={{ zIndex: z, left, top, width, height }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function GoldGrad({
  id,
  vertical = false,
}: {
  id: string;
  vertical?: boolean;
}) {
  return (
    <linearGradient
      id={id}
      x1="0"
      y1="0"
      x2={vertical ? "0" : "1"}
      y2={vertical ? "1" : "0"}
    >
      <stop offset="0" stopColor={GOLD[2]} />
      <stop offset="0.35" stopColor={GOLD[0]} />
      <stop offset="0.6" stopColor={GOLD[1]} />
      <stop offset="1" stopColor={GOLD[2]} />
    </linearGradient>
  );
}

function Glow({ id, std = 6 }: { id: string; std?: number }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={std} result="a" />
      <feGaussianBlur in="SourceGraphic" stdDeviation={std * 3} result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="a" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

// Monoline neon glyphs on a 40x60 grid.
const GLYPHS: Record<string, [string, number]> = {
  M: ["M0 60L0 0L20 34L40 0L40 60", 40],
  A: ["M0 60L20 0L40 60M8 38L32 38", 40],
  N: ["M0 60L0 0L40 60L40 0", 40],
  G: ["M38 14C32 2 8 0 3 22C-2 44 10 60 22 60C34 60 40 50 40 38L24 38", 40],
  O: ["M20 0C44 0 44 60 20 60C-4 60-4 0 20 0Z", 40],
  C: ["M38 14C32 2 8 0 3 22C-2 44 10 60 22 60C30 60 36 54 39 46", 40],
  L: ["M2 0L2 60L38 60", 38],
  U: ["M0 0L0 40C0 64 40 64 40 40L40 0", 40],
  B: ["M2 60L2 0L22 0C38 0 38 28 22 29L2 29M22 29C42 30 42 60 22 60L2 60", 38],
  I: ["M4 0L4 60", 8],
  V: ["M0 0L20 60L40 0", 40],
  P: ["M2 60L2 0L22 0C42 0 42 32 22 32L2 32", 36],
  " ": ["", 22],
};

function NeonWord({
  text,
  x,
  y,
  size,
  color,
  skew = 0,
}: {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  skew?: number;
}) {
  const k = size / 60;
  const gap = 14;
  const width = [...text].reduce((w, ch) => w + GLYPHS[ch][1] + gap, -gap);
  let cx = 0;
  const parts = [...text].map((ch, i) => {
    const [d, w] = GLYPHS[ch];
    const g = <path key={i} d={d} transform={`translate(${cx} 0)`} />;
    cx += w + gap;
    return g;
  });
  return (
    <g
      transform={`translate(${x - (width * k) / 2} ${y}) skewX(${skew}) scale(${k})`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke={color} strokeWidth={9}>
        {parts}
      </g>
      <g stroke="#fff6fb" strokeWidth={3} opacity={0.9}>
        {parts}
      </g>
    </g>
  );
}

function NeonTube({
  d,
  color,
  width = 7,
}: {
  d: string;
  color: string;
  width?: number;
}) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={color} strokeWidth={width} />
      <path d={d} stroke="#fff8ee" strokeWidth={width * 0.35} opacity={0.9} />
    </g>
  );
}

/* ---------------------------------------------------------------- back */

function Bottles() {
  const shelves = [250, 335, 420];
  const colors = [
    "#ffb347",
    "#7dffb2",
    "#ff5fa8",
    "#c58bff",
    "#ffd86b",
    "#ff8a3d",
    "#9fe8ff",
  ];
  const out: ReactNode[] = [];
  shelves.forEach((sy, s) => {
    let x = 244;
    let i = 0;
    while (x < 676) {
      const r = rand(s * 40 + i);
      const w = 14 + r * 10;
      const h = 38 + rand(s * 40 + i + 7) * 30;
      const c = colors[Math.floor(rand(s * 11 + i * 3) * colors.length)];
      const neck = w * 0.32;
      out.push(
        <g key={`${s}-${i}`} transform={`translate(${x} ${sy})`}>
          <path
            d={`M0 0L0 ${-h * 0.62}C0 ${-h * 0.75} ${w / 2 - neck / 2} ${-h * 0.75} ${w / 2 - neck / 2} ${-h * 0.82}L${w / 2 - neck / 2} ${-h}L${w / 2 + neck / 2} ${-h}L${w / 2 + neck / 2} ${-h * 0.82}C${w / 2 + neck / 2} ${-h * 0.75} ${w} ${-h * 0.75} ${w} ${-h * 0.62}L${w} 0Z`}
            fill={c}
            fillOpacity={0.55}
            stroke={INK}
            strokeWidth={1.6}
          />
          <rect
            x={w * 0.18}
            y={-h * 0.45}
            width={w * 0.64}
            height={h * 0.2}
            fill="#fff3d6"
            opacity={0.75}
            rx={1}
          />
          <path
            d={`M${w * 0.22} -4L${w * 0.22} ${-h * 0.58}`}
            stroke="#fff"
            strokeWidth={1.6}
            opacity={0.75}
          />
          <rect
            x={w / 2 - neck / 2 - 1}
            y={-h - 4}
            width={neck + 2}
            height={5}
            fill={GOLD[1]}
          />
        </g>,
      );
      x += w + 6 + rand(s * 9 + i) * 6;
      i++;
    }
  });
  return <g>{out}</g>;
}

function LionCrest({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="58" fill="url(#crestHalo)" />
      {/* laurels */}
      {[-1, 1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          {Array.from({ length: 7 }, (_, i) => {
            const a = (-60 + i * 22) * (Math.PI / 180);
            const px = Math.cos(a) * 50;
            const py = Math.sin(a) * 50 + 6;
            return (
              <ellipse
                key={i}
                cx={px}
                cy={py}
                rx="5"
                ry="11"
                transform={`rotate(${-60 + i * 22 + 20} ${px} ${py})`}
                fill="url(#goldV)"
                stroke={INK}
                strokeWidth="1.2"
              />
            );
          })}
        </g>
      ))}
      <circle r="38" fill="url(#goldH)" stroke={INK} strokeWidth="2.5" />
      <circle r="31" fill="#3b0b2e" stroke={GOLD[0]} strokeWidth="1.5" />
      {Array.from({ length: 16 }, (_, i) => (
        <path
          key={i}
          d="M0-27C6-20 6-12 0-8C-6-12-6-20 0-27Z"
          transform={`rotate(${i * 22.5})`}
          fill="url(#goldV)"
          stroke={INK}
          strokeWidth="0.8"
        />
      ))}
      <path
        d="M-11-6C-11-16 11-16 11-6L9 8C6 15-6 15-9 8Z"
        fill="url(#goldH)"
        stroke={INK}
        strokeWidth="1.2"
      />
      <path
        d="M-6-4L-2-3M6-4L2-3M-3 5L0 8L3 5M0 8L0 11"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M-30 46L30 46L24 56L-24 56Z"
        fill="#6b1145"
        stroke={GOLD[1]}
        strokeWidth="1.5"
      />
    </g>
  );
}

function SideMirror({ left }: { left: boolean }) {
  // Tall arched mirror drawn onto the side wall plane.
  const xs = [100, 160];
  const pt = (x: number, t: number) => {
    const top = 0.4 * x;
    const bottom = 760 - 1.1 * x;
    return [x, top + t * (bottom - top)] as const;
  };
  const [a, b, c, d] = [
    pt(xs[0], 0.24),
    pt(xs[1], 0.26),
    pt(xs[1], 0.74),
    pt(xs[0], 0.76),
  ];
  const pts = `${a} ${b} ${c} ${d}`;
  return (
    <g transform={left ? undefined : "matrix(-1 0 0 1 1600 0)"}>
      <polygon
        points={pts}
        fill="url(#mirror)"
        stroke="url(#goldV)"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <polygon points={pts} fill="none" stroke={INK} strokeWidth="1.5" />
      <path
        d={`M${a[0] + 14} ${a[1] + 40}L${b[0] - 10} ${b[1] + 26}`}
        stroke="#fff"
        strokeWidth="3"
        opacity="0.35"
      />
      <path
        d={`M${a[0] + 12} ${a[1] + 70}L${b[0] - 8} ${b[1] + 50}`}
        stroke="#ffb3e0"
        strokeWidth="2"
        opacity="0.3"
      />
    </g>
  );
}

function SideDrape({ left }: { left: boolean }) {
  return (
    <g transform={left ? undefined : "matrix(-1 0 0 1 1600 0)"}>
      <path
        d="M160 64L200 80L200 540L186 548C176 470 172 420 176 360C150 380 146 470 150 590L134 600C130 450 130 300 160 64Z"
        fill="url(#velvetDrape)"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        d="M178 120C176 220 178 300 182 380"
        stroke="#ff4fa8"
        strokeWidth="2"
        opacity="0.4"
        fill="none"
      />
    </g>
  );
}

export function RoomBack() {
  const floorLines = [552, 568, 590, 618, 652, 694, 745, 805, 875];
  const tilesBase = danceTiles();
  return (
    <Layer z={0}>
      <defs>
        <GoldGrad id="goldH" />
        <GoldGrad id="goldV" vertical />
        <radialGradient id="crestHalo">
          <stop offset="0" stopColor="#ffcf6b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffcf6b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c0626" />
          <stop offset="0.55" stopColor="#3a0c45" />
          <stop offset="1" stopColor="#5a1450" />
        </linearGradient>
        <linearGradient id="sideWall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0e0314" />
          <stop offset="1" stopColor="#2a0834" />
        </linearGradient>
        <linearGradient id="ceiling" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07020b" />
          <stop offset="1" stopColor="#1e0628" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a0a33" />
          <stop offset="0.3" stopColor="#14051c" />
          <stop offset="1" stopColor="#07020a" />
        </linearGradient>
        <linearGradient id="niche" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b0a2a" />
          <stop offset="1" stopColor="#5b2410" />
        </linearGradient>
        <linearGradient id="shelfGlow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffb547" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="archGlow" cx="0.5" cy="0.75" r="0.7">
          <stop offset="0" stopColor="#d48bff" />
          <stop offset="0.45" stopColor="#7a2fd9" />
          <stop offset="1" stopColor="#1c0638" />
        </radialGradient>
        <linearGradient id="velvetWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d0f52" />
          <stop offset="1" stopColor="#3a0630" />
        </linearGradient>
        <linearGradient id="velvetDrape" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a0420" />
          <stop offset="0.4" stopColor="#8a1258" />
          <stop offset="0.7" stopColor="#4a0838" />
          <stop offset="1" stopColor="#1a0314" />
        </linearGradient>
        <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4b2a6e" />
          <stop offset="0.5" stopColor="#1c0a2c" />
          <stop offset="1" stopColor="#6a2a5a" />
        </linearGradient>
        <radialGradient id="sconceHalo">
          <stop offset="0" stopColor="#ffd28a" stopOpacity="0.8" />
          <stop offset="0.4" stopColor="#ff8a5c" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ff8a5c" stopOpacity="0" />
        </radialGradient>
        <pattern
          id="damask"
          width="44"
          height="44"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M22 4L40 22L22 40L4 22Z"
            fill="none"
            stroke="#7b2a7a"
            strokeWidth="1"
            opacity="0.5"
          />
          <path
            d="M22 14C26 18 26 26 22 30C18 26 18 18 22 14Z"
            fill="#a8457d"
            opacity="0.28"
          />
          <circle cx="0" cy="0" r="2" fill="#e9b44c" opacity="0.35" />
          <circle cx="44" cy="0" r="2" fill="#e9b44c" opacity="0.35" />
          <circle cx="0" cy="44" r="2" fill="#e9b44c" opacity="0.35" />
          <circle cx="44" cy="44" r="2" fill="#e9b44c" opacity="0.35" />
        </pattern>
        <pattern id="tuft" width="40" height="34" patternUnits="userSpaceOnUse">
          <path
            d="M0 17L20 0L40 17L20 34Z"
            fill="none"
            stroke="#2a0322"
            strokeWidth="2.4"
          />
          <path
            d="M2 17L20 2"
            stroke="#ff5fb0"
            strokeWidth="1"
            opacity="0.35"
          />
          <circle cx="20" cy="0" r="2.6" fill="#f6c86a" />
          <circle cx="0" cy="17" r="2.6" fill="#f6c86a" />
          <circle cx="40" cy="17" r="2.6" fill="#f6c86a" />
          <circle cx="20" cy="34" r="2.6" fill="#f6c86a" />
        </pattern>
        <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#06000a" stopOpacity="0" />
          <stop offset="1" stopColor="#06000a" stopOpacity="0.6" />
        </radialGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="softer" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* shell */}
      <rect width="1600" height="900" fill="#0a0210" />
      <polygon points="0,0 1600,0 1400,80 200,80" fill="url(#ceiling)" />
      <rect x="200" y="80" width="1200" height="460" fill="url(#wall)" />
      <rect x="200" y="80" width="1200" height="460" fill="url(#damask)" />
      <polygon points="0,0 200,80 200,540 0,760" fill="url(#sideWall)" />
      <polygon
        points="0,0 200,80 200,540 0,760"
        fill="url(#sideWall)"
        transform="matrix(-1 0 0 1 1600 0)"
      />
      {/* ceiling cove and downlights */}
      <path
        d="M200 82L1400 82"
        stroke="#ff3ea5"
        strokeWidth="14"
        filter="url(#soft)"
      />
      <path d="M200 81L1400 81" stroke="#ff3ea5" strokeWidth="4" />
      <path d="M200 81L1400 81" stroke="#ffe6f4" strokeWidth="1.5" />
      {[340, 560, 1040, 1260].map((x) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy={40 + (Math.abs(800 - x) / 600) * 14}
            rx="16"
            ry="4"
            fill="#ffe7c2"
          />
          <ellipse
            cx={x}
            cy={44 + (Math.abs(800 - x) / 600) * 14}
            rx="40"
            ry="12"
            fill="#ffb86b"
            opacity="0.25"
            filter="url(#softer)"
          />
        </g>
      ))}
      {/* wainscot rail */}
      <rect x="200" y="508" width="1200" height="32" fill="#22061f" />
      <rect x="200" y="506" width="1200" height="4" fill="url(#goldH)" />

      {/* floor */}
      <polygon
        points="200,540 1400,540 1600,760 1600,900 0,900 0,760"
        fill="url(#floor)"
      />
      <g stroke="#e9b44c" strokeOpacity="0.12" strokeWidth="1.2">
        {Array.from({ length: 13 }, (_, i) => {
          const x = 200 + i * 100;
          return (
            <line key={i} x1={x} y1={540} x2={800 + (x - 800) * 1.9} y2={900} />
          );
        })}
        {floorLines.map((y) => (
          <line key={y} x1={0} y1={y} x2={1600} y2={y} />
        ))}
      </g>
      {/* reflections */}
      <g filter="url(#soft)">
        <rect
          x="200"
          y="616"
          width="510"
          height="40"
          fill="#ffad3a"
          opacity="0.5"
        />
        {[260, 330, 400, 470, 540, 610, 660].map((x, i) => (
          <rect
            key={x}
            x={x}
            y="620"
            width="18"
            height="130"
            fill={i % 2 ? "#ff8a3d" : "#ffd27a"}
            opacity="0.32"
          />
        ))}
        <rect
          x="764"
          y="548"
          width="72"
          height="150"
          fill="#9d5cff"
          opacity="0.6"
        />
        <ellipse
          cx="800"
          cy="730"
          rx="170"
          ry="110"
          fill="#ffe6f6"
          opacity="0.14"
        />
        <rect
          x="960"
          y="650"
          width="410"
          height="30"
          fill="#ff2f9a"
          opacity="0.38"
        />
        <rect
          x="1100"
          y="660"
          width="90"
          height="170"
          fill="#ff9a1f"
          opacity="0.22"
        />
        <ellipse
          cx="1446"
          cy="680"
          rx="40"
          ry="70"
          fill="#ffd27a"
          opacity="0.25"
        />
        <ellipse
          cx="700"
          cy="600"
          rx="30"
          ry="60"
          fill="#ffd27a"
          opacity="0.25"
        />
      </g>
      {/* dance floor base */}
      <g>
        {tilesBase.map((t, i) => (
          <polygon
            key={i}
            points={t.pts}
            fill="#1a0828"
            stroke="#e9b44c"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
        ))}
        <polygon
          points="596,628 1004,628 1086,834 514,834"
          fill="none"
          stroke="url(#goldH)"
          strokeWidth="4"
        />
      </g>

      {/* back bar niche */}
      <rect
        x="226"
        y="166"
        width="468"
        height="310"
        rx="14"
        fill="url(#goldV)"
      />
      <rect
        x="234"
        y="174"
        width="452"
        height="296"
        rx="10"
        fill="url(#niche)"
      />
      {[250, 335, 420].map((y) => (
        <rect
          key={y}
          x="234"
          y={y - 70}
          width="452"
          height="70"
          fill="url(#shelfGlow)"
          opacity="0.7"
        />
      ))}
      <Bottles />
      <rect
        x="306"
        y="176"
        width="308"
        height="48"
        rx="10"
        fill="#12041a"
        opacity="0.82"
        stroke="url(#goldH)"
        strokeWidth="1.5"
      />
      {[250, 335, 420].map((y) => (
        <g key={y}>
          <rect x="234" y={y} width="452" height="7" fill="url(#goldH)" />
          <rect
            x="234"
            y={y + 7}
            width="452"
            height="3"
            fill="#ffcc70"
            opacity="0.8"
            filter="url(#softer)"
          />
        </g>
      ))}
      <path
        d="M244 184L330 184M244 184L244 236"
        stroke="#fff"
        strokeWidth="2"
        opacity="0.18"
      />
      <LionCrest x={460} y={112} />

      {/* VIP arch */}
      <path
        d="M720 540L720 350A80 80 0 0 1 880 350L880 540Z"
        fill="url(#goldV)"
      />
      <path
        d="M734 540L734 352A66 66 0 0 1 866 352L866 540Z"
        fill="url(#archGlow)"
      />
      <g strokeLinecap="round" strokeWidth="3.4" strokeDasharray="0.1 9">
        {Array.from({ length: 13 }, (_, i) => {
          const x = 740 + i * 10;
          const top =
            352 - Math.sqrt(Math.max(0, 66 * 66 - (x - 800) * (x - 800))) + 6;
          return (
            <path
              key={i}
              d={`M${x} ${top}Q${x + (i % 2 ? 3 : -3)} 450 ${x} 536`}
              stroke={i % 2 ? "#ffd27a" : "#ff7ccf"}
              fill="none"
            />
          );
        })}
      </g>
      {[738, 862].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="500" width="6" height="44" fill="url(#goldH)" />
          <ellipse cx={x} cy="500" rx="7" ry="5" fill={GOLD[0]} />
          <ellipse cx={x} cy="545" rx="11" ry="3.5" fill={GOLD[1]} />
        </g>
      ))}
      <path
        d="M740 506Q800 540 860 506"
        stroke="#b0105e"
        strokeWidth="7"
        fill="none"
      />
      <path
        d="M740 504Q800 536 860 504"
        stroke="#ff6fb8"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />

      {/* booth wall */}
      <rect x="902" y="282" width="476" height="258" fill="url(#goldV)" />
      <rect x="910" y="290" width="460" height="250" fill="url(#velvetWall)" />
      <rect x="910" y="290" width="460" height="250" fill="url(#tuft)" />
      {[952, 1328].map((x) => (
        <g key={x}>
          <circle cx={x} cy="250" r="70" fill="url(#sconceHalo)" />
          <path d={`M${x} 286L${x} 262`} stroke="url(#goldH)" strokeWidth="5" />
          <path
            d={`M${x - 14} 262C${x - 16} 240 ${x - 8} 230 ${x} 228C${x + 8} 230 ${x + 16} 240 ${x + 14} 262Z`}
            fill="#ffe2b8"
            stroke={GOLD[1]}
            strokeWidth="2"
          />
          <ellipse cx={x} cy="290" rx="9" ry="4" fill={GOLD[1]} />
        </g>
      ))}

      <rect width="1600" height="900" fill="url(#vignette)" />
      <SideMirror left />
      <SideMirror left={false} />
      <SideDrape left />
      <SideDrape left={false} />
    </Layer>
  );
}

/* --------------------------------------------------------------- neon */

const MANGO_PATH =
  "M1086 150C1070 110 1100 82 1140 86C1196 90 1222 140 1206 186C1192 224 1146 234 1112 214C1094 202 1094 180 1086 150Z";

export function NeonSigns() {
  return (
    <>
      <Layer z={2} className="neon neon-mango" box={[1010, 20, 280, 270]}>
        <defs>
          <Glow id="glowMango" std={5} />
        </defs>
        <g filter="url(#glowMango)">
          <NeonTube d={MANGO_PATH} color="#ff9a1f" width={8} />
          <NeonTube
            d="M1150 90C1156 72 1170 62 1186 60"
            color="#7a4a1a"
            width={5}
          />
          <NeonTube
            d="M1160 72C1180 50 1214 50 1230 62C1210 84 1180 88 1160 72Z"
            color="#3dff9a"
            width={6}
          />
          <NeonTube
            d="M1104 130C1112 112 1128 104 1146 104"
            color="#ffe2a3"
            width={4}
          />
          <NeonWord
            text="MANGO"
            x={1150}
            y={232}
            size={34}
            color="#ff3ea5"
            skew={-10}
          />
        </g>
      </Layer>
      <Layer z={2} className="neon neon-lion" box={[300, 150, 320, 110]}>
        <defs>
          <Glow id="glowLion" std={4} />
        </defs>
        <g filter="url(#glowLion)">
          <NeonWord
            text="DAYDAZE"
            x={460}
            y={190}
            size={30}
            color="#ff4fd0"
          />
        </g>
      </Layer>
      <Layer z={2} className="neon neon-vip" box={[740, 212, 120, 76]}>
        <defs>
          <Glow id="glowVip" std={4} />
        </defs>
        <g filter="url(#glowVip)">
          <NeonWord text="VIP" x={800} y={244} size={26} color="#b98bff" />
        </g>
      </Layer>
    </>
  );
}

/* --------------------------------------------------------- dance floor */

function danceTiles() {
  const rows = 5;
  const cols = 7;
  const y0 = 632;
  const y1 = 830;
  const edge = (t: number): [number, number, number] => [
    y0 + (y1 - y0) * t,
    600 + (520 - 600) * t,
    1000 + (1080 - 1000) * t,
  ];
  const tiles: { pts: string; group: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const [ya, la, ra] = edge(r / rows);
    const [yb, lb, rb] = edge((r + 1) / rows);
    for (let c = 0; c < cols; c++) {
      const x = (l: number, rr: number, k: number) => l + ((rr - l) * k) / cols;
      const ins = 3;
      const pts = [
        [x(la, ra, c) + ins, ya + ins],
        [x(la, ra, c + 1) - ins, ya + ins],
        [x(lb, rb, c + 1) - ins, yb - ins],
        [x(lb, rb, c) + ins, yb - ins],
      ]
        .map((p) => p.join(","))
        .join(" ");
      tiles.push({ pts, group: (r * 2 + c) % 3 });
    }
  }
  return tiles;
}

const TILE_COLORS = ["#ff2f9a", "#8a3dff", "#ffad1f"];

export function DanceTiles() {
  const tiles = danceTiles();
  return (
    <>
      {TILE_COLORS.map((color, g) => (
        <Layer
          key={g}
          z={1}
          className={`tiles tiles-${g}`}
          box={[490, 600, 620, 260]}
        >
          <defs>
            <filter
              id={`tileGlow${g}`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="8" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter={`url(#tileGlow${g})`}>
            {tiles
              .filter((t) => t.group === g)
              .map((t, i) => (
                <polygon
                  key={i}
                  points={t.pts}
                  fill={color}
                  fillOpacity="0.8"
                />
              ))}
          </g>
        </Layer>
      ))}
    </>
  );
}

/* ----------------------------------------------------------- furniture */

export function BarCounter() {
  return (
    <Layer z={612} box={[190, 400, 540, 220]}>
      <defs>
        <linearGradient id="lacquer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a0f4a" />
          <stop offset="1" stopColor="#120418" />
        </linearGradient>
        <linearGradient id="marble" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#120a14" />
          <stop offset="0.4" stopColor="#3b2a40" />
          <stop offset="0.55" stopColor="#1a1020" />
          <stop offset="1" stopColor="#0c070e" />
        </linearGradient>
        <GoldGrad id="cGoldV" vertical />
        <GoldGrad id="cGoldH" />
        <radialGradient id="cocktailHalo">
          <stop offset="0" stopColor="#ffb02e" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cTuft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a2fd9" />
          <stop offset="1" stopColor="#2a0a4a" />
        </linearGradient>
        <pattern
          id="cTuftDots"
          width="22"
          height="20"
          patternUnits="userSpaceOnUse"
          x="222"
          y="518"
        >
          <path
            d="M0 10L11 0L22 10L11 20Z"
            fill="none"
            stroke="#1a0530"
            strokeWidth="1.6"
          />
          <circle cx="11" cy="0" r="1.8" fill="#f6c86a" />
          <circle cx="0" cy="10" r="1.8" fill="#f6c86a" />
          <circle cx="22" cy="10" r="1.8" fill="#f6c86a" />
          <circle cx="11" cy="20" r="1.8" fill="#f6c86a" />
        </pattern>
        <filter id="ledGlow" x="-10%" y="-200%" width="120%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <rect
        x="210"
        y="506"
        width="490"
        height="96"
        fill="url(#lacquer)"
        stroke={INK}
        strokeWidth="2"
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x={222 + i * 118}
            y="518"
            width="110"
            height="60"
            rx="8"
            fill="url(#cTuft)"
            stroke="url(#cGoldH)"
            strokeWidth="3"
          />
          <rect
            x={222 + i * 118}
            y="518"
            width="110"
            height="60"
            rx="8"
            fill="url(#cTuftDots)"
          />
          <path
            d={`M${230 + i * 118} 524L${280 + i * 118} 524`}
            stroke="#fff"
            strokeWidth="1.5"
            opacity="0.3"
          />
        </g>
      ))}
      <rect
        x="205"
        y="504"
        width="500"
        height="8"
        fill="#ffb547"
        filter="url(#ledGlow)"
      />
      <rect x="205" y="505" width="500" height="3" fill="#ffe1a0" />
      <rect
        x="198"
        y="480"
        width="514"
        height="26"
        rx="6"
        fill="url(#marble)"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        d="M206 483L704 483"
        stroke="#fff"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M260 490C300 496 330 488 380 496M520 488C560 496 600 490 640 498"
        stroke="#9a86a6"
        strokeWidth="1"
        opacity="0.6"
        fill="none"
      />
      <rect
        x="214"
        y="584"
        width="482"
        height="7"
        rx="3.5"
        fill="url(#cGoldV)"
        stroke={INK}
        strokeWidth="1"
      />
      <rect x="208" y="598" width="494" height="14" fill="#0c0310" />
      <rect
        x="210"
        y="608"
        width="490"
        height="4"
        fill="#ffb547"
        filter="url(#ledGlow)"
        opacity="0.8"
      />

      {/* champagne bucket */}
      <g transform="translate(262 480)">
        <path
          d="M-6-62L-4-36L4-36L6-62Z"
          fill="#1d4a2a"
          stroke={INK}
          strokeWidth="1.5"
        />
        <rect x="-6" y="-66" width="12" height="7" fill={GOLD[1]} />
        <path
          d="M-20-34L20-34L16 0L-16 0Z"
          fill="#cfd6e6"
          stroke={INK}
          strokeWidth="1.5"
        />
        <path d="M-14-30L-11-4" stroke="#fff" strokeWidth="3" opacity="0.8" />
        <ellipse
          cx="0"
          cy="-34"
          rx="20"
          ry="4"
          fill="#eef4ff"
          stroke={INK}
          strokeWidth="1.2"
        />
      </g>
      {/* coupes */}
      {[330, 356].map((x) => (
        <g key={x} transform={`translate(${x} 480)`}>
          <path
            d="M-11-24C-11-14 11-14 11-24Z"
            fill="#ffd9ef"
            fillOpacity="0.7"
            stroke={INK}
            strokeWidth="1.2"
          />
          <path d="M0-17L0-2M-6 0L6 0" stroke="#f3eaff" strokeWidth="2" />
        </g>
      ))}
      {/* the mango martini */}
      <g transform="translate(596 480)">
        <circle cx="0" cy="-26" r="46" fill="url(#cocktailHalo)" />
        <path
          d="M-24-48L24-48L2-20L-2-20Z"
          fill="#ffb02e"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M-21-46L21-46"
          stroke="#fff3c4"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M0-20L0-2M-11 0L11 0"
          stroke="#f3eaff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M16-56C26-60 32-50 26-44C20-40 14-46 16-56Z"
          fill="#ff8a1f"
          stroke={INK}
          strokeWidth="1.5"
        />
        <path
          d="M-6-60L6-40"
          stroke="#ff3ea5"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
      {/* shaker */}
      <g transform="translate(650 480)">
        <path
          d="M-9-44L9-44L11 0L-11 0Z"
          fill="#d9dfee"
          stroke={INK}
          strokeWidth="1.5"
        />
        <path
          d="M-6-52L6-52L9-44L-9-44Z"
          fill="#b8c0d4"
          stroke={INK}
          strokeWidth="1.2"
        />
        <path d="M-5-40L-6-4" stroke="#fff" strokeWidth="2.5" opacity="0.8" />
      </g>
      <g transform="translate(520 480)">
        <rect
          x="-6"
          y="-14"
          width="12"
          height="14"
          rx="2"
          fill="#ffe7c8"
          opacity="0.85"
        />
        <ellipse cx="0" cy="-20" rx="3" ry="6" fill="#ffd36b" />
      </g>
    </Layer>
  );
}

export function Stools() {
  return (
    <Layer z={650} box={[230, 530, 420, 125]}>
      <defs>
        <GoldGrad id="sGold" />
        <radialGradient id="seatVelvet" cx="0.4" cy="0.3">
          <stop offset="0" stopColor="#ff5fb8" />
          <stop offset="1" stopColor="#7a0a48" />
        </radialGradient>
      </defs>
      {[268, 438, 608].map((x) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy="646"
            rx="26"
            ry="6"
            fill="url(#sGold)"
            stroke={INK}
            strokeWidth="1.5"
          />
          <rect x={x - 4} y="560" width="8" height="86" fill="url(#sGold)" />
          <ellipse
            cx={x}
            cy="608"
            rx="18"
            ry="5"
            fill="none"
            stroke="url(#sGold)"
            strokeWidth="3.5"
          />
          <path
            d={`M${x - 32} 548L${x - 30} 562C${x - 20} 570 ${x + 20} 570 ${x + 30} 562L${x + 32} 548Z`}
            fill="#6a0840"
            stroke={INK}
            strokeWidth="1.5"
          />
          <ellipse
            cx={x}
            cy="548"
            rx="32"
            ry="10"
            fill="url(#seatVelvet)"
            stroke={INK}
            strokeWidth="1.5"
          />
          <path
            d={`M${x - 28} 563C${x - 14} 569 ${x + 14} 569 ${x + 28} 563`}
            stroke={GOLD[0]}
            strokeWidth="2"
            fill="none"
          />
        </g>
      ))}
    </Layer>
  );
}

export function Booth() {
  const channels = Array.from({ length: 12 }, (_, i) => 975 + i * 32);
  return (
    <Layer z={640} box={[930, 405, 460, 250]}>
      <defs>
        <linearGradient id="channel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a0532" />
          <stop offset="0.45" stopColor="#e2288a" />
          <stop offset="0.6" stopColor="#ff6fbd" />
          <stop offset="1" stopColor="#4a0532" />
        </linearGradient>
        <linearGradient id="seat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6fbd" />
          <stop offset="0.35" stopColor="#c8146f" />
          <stop offset="1" stopColor="#4a0532" />
        </linearGradient>
        <linearGradient id="armRoll" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a0532" />
          <stop offset="0.5" stopColor="#ff4fa8" />
          <stop offset="1" stopColor="#4a0532" />
        </linearGradient>
        <GoldGrad id="bGold" />
        <pattern
          id="leopard"
          width="18"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="18" height="16" fill="#e7a84a" />
          <path
            d="M3 4C5 1 9 2 8 5C7 8 3 8 3 4ZM12 10C14 8 17 9 16 12C15 14 11 13 12 10Z"
            fill="none"
            stroke="#2a1408"
            strokeWidth="1.6"
          />
          <circle cx="6" cy="5" r="1.2" fill="#7a3a12" />
          <circle cx="14" cy="11" r="1.2" fill="#7a3a12" />
        </pattern>
        <clipPath id="boothBack">
          <path d="M968 600L968 470C968 432 1010 416 1060 416L1260 416C1310 416 1352 432 1352 470L1352 600Z" />
        </clipPath>
      </defs>
      <path
        d="M968 600L968 470C968 432 1010 416 1060 416L1260 416C1310 416 1352 432 1352 470L1352 600Z"
        fill="#3a0428"
        stroke={INK}
        strokeWidth="2.5"
      />
      <g clipPath="url(#boothBack)">
        {channels.map((x) => (
          <rect
            key={x}
            x={x - 14}
            y="400"
            width="30"
            height="210"
            rx="15"
            fill="url(#channel)"
            stroke="#2a0320"
            strokeWidth="1.5"
          />
        ))}
      </g>
      <path
        d="M968 470C968 432 1010 416 1060 416L1260 416C1310 416 1352 432 1352 470"
        stroke="url(#bGold)"
        strokeWidth="5"
        fill="none"
      />
      {/* pillows */}
      <g transform="rotate(-12 1030 545)">
        <rect
          x="998"
          y="516"
          width="64"
          height="54"
          rx="16"
          fill="url(#leopard)"
          stroke={INK}
          strokeWidth="2"
        />
        <path
          d="M1006 524C1020 520 1040 520 1054 526"
          stroke="#fff"
          strokeWidth="2"
          opacity="0.45"
          fill="none"
        />
      </g>
      <g transform="rotate(10 1300 545)">
        <rect
          x="1268"
          y="518"
          width="62"
          height="52"
          rx="16"
          fill="url(#bGold)"
          stroke={INK}
          strokeWidth="2"
        />
        <path
          d="M1276 528C1290 522 1310 522 1322 528"
          stroke="#fff"
          strokeWidth="2"
          opacity="0.6"
          fill="none"
        />
      </g>
      <path
        d="M946 588C946 574 958 566 974 566L1346 566C1362 566 1374 574 1374 588L1374 618C1374 630 1362 636 1346 636L974 636C958 636 946 630 946 618Z"
        fill="url(#seat)"
        stroke={INK}
        strokeWidth="2.5"
      />
      <path
        d="M970 574L1350 574"
        stroke="#ffc2e4"
        strokeWidth="2"
        opacity="0.6"
      />
      {[938, 1338].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y="500"
            width="44"
            height="134"
            rx="22"
            fill="url(#armRoll)"
            stroke={INK}
            strokeWidth="2.5"
          />
          <ellipse
            cx={x + 22}
            cy="514"
            rx="16"
            ry="10"
            fill="#ff8ac8"
            opacity="0.5"
          />
        </g>
      ))}
      <rect
        x="950"
        y="636"
        width="420"
        height="7"
        fill="url(#bGold)"
        stroke={INK}
        strokeWidth="1"
      />
      {[962, 1160, 1358].map((x) => (
        <rect
          key={x}
          x={x - 5}
          y="642"
          width="10"
          height="6"
          rx="2"
          fill={GOLD[1]}
        />
      ))}
    </Layer>
  );
}

export function CocktailTable() {
  return (
    <Layer z={705} box={[1030, 620, 140, 90]}>
      <defs>
        <GoldGrad id="tGold" />
        <radialGradient id="candle">
          <stop offset="0" stopColor="#ffd36b" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M1074 676L1068 698L1132 698L1126 676Z"
        fill="url(#tGold)"
        stroke={INK}
        strokeWidth="1.5"
      />
      <ellipse
        cx="1100"
        cy="700"
        rx="38"
        ry="7"
        fill="url(#tGold)"
        stroke={INK}
        strokeWidth="1.5"
      />
      <ellipse
        cx="1100"
        cy="672"
        rx="64"
        ry="14"
        fill="#2a1438"
        fillOpacity="0.85"
        stroke="url(#tGold)"
        strokeWidth="4"
      />
      <path
        d="M1052 668C1080 662 1120 662 1146 668"
        stroke="#fff"
        strokeWidth="1.5"
        opacity="0.45"
        fill="none"
      />
      <circle cx="1100" cy="660" r="26" fill="url(#candle)" />
      <rect x="1095" y="656" width="10" height="12" rx="2" fill="#ffe7c8" />
      <ellipse cx="1100" cy="652" rx="2.5" ry="5" fill="#ffd36b" />
      {[1068, 1130].map((x, i) => (
        <g key={x} transform={`translate(${x} 670)`}>
          <path
            d="M-12-26L12-26L1-12L-1-12Z"
            fill="#ffb02e"
            stroke={INK}
            strokeWidth="1.2"
          />
          <path d="M0-12L0-1M-6 0L6 0" stroke="#f3eaff" strokeWidth="1.8" />
          {i === 0 && (
            <path d="M7-30C12-32 15-27 12-24C9-22 6-25 7-30Z" fill="#ff8a1f" />
          )}
        </g>
      ))}
    </Layer>
  );
}

function PalmFrond({
  angle,
  len,
  seed,
}: {
  angle: number;
  len: number;
  seed: number;
}) {
  const a = (angle * Math.PI) / 180;
  const ex = Math.cos(a) * len;
  const ey = Math.sin(a) * len;
  const cx = ex * 0.5;
  const cy = ey * 0.5 - len * 0.35;
  const leaflets: ReactNode[] = [];
  for (let k = 1; k < 18; k++) {
    const t = k / 18;
    const px = 2 * (1 - t) * t * cx + t * t * ex;
    const py = 2 * (1 - t) * t * cy + t * t * ey;
    const l = (1 - t) * 30 + 8;
    const droop = 0.9 + rand(seed + k) * 0.3;
    leaflets.push(
      <path
        key={`a${k}`}
        d={`M${px} ${py}q${-l * 0.3} ${l * 0.5} ${-l * 0.2} ${l * droop}`}
      />,
      <path
        key={`b${k}`}
        d={`M${px} ${py}q${l * 0.4} ${l * 0.4} ${l * 0.5} ${l * droop}`}
      />,
    );
  }
  return (
    <g>
      <g stroke="#04190f" strokeWidth="10" strokeLinecap="round" fill="none">
        {leaflets}
      </g>
      <g stroke="#17734b" strokeWidth="6" strokeLinecap="round" fill="none">
        {leaflets}
      </g>
      <g
        stroke="#ff5fb8"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      >
        {leaflets}
      </g>
      <path
        d={`M0 0Q${cx} ${cy} ${ex} ${ey}`}
        stroke="#0a2a1e"
        strokeWidth="3"
        fill="none"
      />
    </g>
  );
}

function GoldUrn({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M${-w / 2} ${-h}L${w / 2} ${-h}L${w * 0.36} ${-h * 0.15}L${w * 0.24} 0L${-w * 0.24} 0L${-w * 0.36} ${-h * 0.15}Z`}
        fill="url(#pGold)"
        stroke={INK}
        strokeWidth="1.8"
      />
      {[-0.3, -0.1, 0.1, 0.3].map((k) => (
        <path
          key={k}
          d={`M${w * k} ${-h + 6}L${w * k * 0.75} ${-h * 0.2}`}
          stroke="#7a4410"
          strokeWidth="1.4"
          opacity="0.7"
        />
      ))}
      <rect
        x={-w / 2 - 3}
        y={-h - 6}
        width={w + 6}
        height="8"
        rx="3"
        fill="url(#pGold)"
        stroke={INK}
        strokeWidth="1.5"
      />
    </g>
  );
}

export function PalmPlant() {
  return (
    <Layer z={560} box={[530, 290, 340, 280]}>
      <defs>
        <GoldGrad id="pGold" />
      </defs>
      <g transform="translate(700 492)">
        {[-160, -135, -110, -80, -55, -25, -200].map((a, i) => (
          <PalmFrond key={i} angle={a} len={110 + rand(i) * 40} seed={i * 20} />
        ))}
      </g>
      <GoldUrn x={700} y={562} w={52} h={66} />
    </Layer>
  );
}

function MonsteraLeaf({
  x,
  y,
  s,
  r,
  rim = "#ff4fa8",
  dark = false,
}: {
  x: number;
  y: number;
  s: number;
  r: number;
  rim?: string;
  dark?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path
        d="M0 0C-40-10-62-50-50-90C-38-126 0-130 0-108C0-130 38-126 50-90C62-50 40-10 0 0Z"
        fill={dark ? "#05140e" : "#0c3a2a"}
        stroke={rim}
        strokeWidth={dark ? 3 : 2}
        strokeOpacity="0.8"
      />
      <path d="M0 0L0-104" stroke="#062016" strokeWidth="3" />
      {[-1, 1].map((sd) =>
        [30, 52, 74].map((yy, i) => (
          <path
            key={`${sd}${i}`}
            d={`M${sd * 8} ${-yy}L${sd * (40 - i * 4)} ${-yy - 14}`}
            stroke={dark ? "#010503" : "#14060f"}
            strokeWidth="5"
            strokeLinecap="round"
          />
        )),
      )}
      <path
        d="M-30-90C-26-110-10-116 -4-110"
        stroke="#5dffb8"
        strokeWidth="1.5"
        opacity="0.4"
        fill="none"
      />
    </g>
  );
}

export function MonsteraPlant() {
  return (
    <Layer z={610} box={[1330, 400, 200, 215]}>
      <defs>
        <GoldGrad id="mGold" />
      </defs>
      <MonsteraLeaf x={1440} y={540} s={0.9} r={-30} />
      <MonsteraLeaf x={1450} y={545} s={1.05} r={10} />
      <MonsteraLeaf x={1430} y={548} s={0.8} r={-62} />
      <MonsteraLeaf x={1462} y={548} s={0.75} r={44} />
      <g transform="translate(1446 612)">
        <path
          d="M-34-66L34-66L26 0L-26 0Z"
          fill="url(#mGold)"
          stroke={INK}
          strokeWidth="1.8"
        />
        <rect
          x="-38"
          y="-72"
          width="76"
          height="9"
          rx="3"
          fill="url(#mGold)"
          stroke={INK}
          strokeWidth="1.5"
        />
      </g>
    </Layer>
  );
}

/* ---------------------------------------------------- chandelier and fx */

export function Chandelier() {
  const tiers = [
    { y: 112, rx: 70, ry: 11, n: 12 },
    { y: 150, rx: 104, ry: 16, n: 16 },
    { y: 186, rx: 60, ry: 9, n: 10 },
  ];
  return (
    <Layer z={3} box={[605, 0, 390, 345]}>
      <defs>
        <radialGradient id="chHalo">
          <stop offset="0" stopColor="#fff2fb" stopOpacity="0.7" />
          <stop offset="0.35" stopColor="#ff9ad6" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ff9ad6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="crystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d9c8ff" />
          <stop offset="1" stopColor="#ff9ad6" />
        </linearGradient>
        <GoldGrad id="chGold" />
      </defs>
      <circle cx="800" cy="150" r="190" fill="url(#chHalo)" />
      <path d="M800 0L800 96" stroke="url(#chGold)" strokeWidth="4" />
      {Array.from({ length: 8 }, (_, i) => (
        <circle
          key={i}
          cx="800"
          cy={8 + i * 11}
          r="3.5"
          fill="none"
          stroke={GOLD[1]}
          strokeWidth="2"
        />
      ))}
      {tiers.map((t, ti) => (
        <g key={ti}>
          <ellipse
            cx="800"
            cy={t.y}
            rx={t.rx}
            ry={t.ry}
            fill="none"
            stroke="url(#chGold)"
            strokeWidth="4"
          />
          {Array.from({ length: t.n }, (_, i) => {
            const a = (i / t.n) * Math.PI * 2;
            const x = 800 + Math.cos(a) * t.rx;
            const y = t.y + Math.sin(a) * t.ry;
            const len = 22 + (Math.sin(a) > 0 ? 10 : 0) + rand(ti * 30 + i) * 8;
            const back = Math.sin(a) < 0;
            return (
              <g key={i} opacity={back ? 0.55 : 1}>
                <path
                  d={`M${x} ${y}L${x} ${y + len}`}
                  stroke="#f4e9ff"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <path
                  d={`M${x} ${y + len}l-4 6l4 12l4-12z`}
                  fill="url(#crystal)"
                  stroke="#5a2a7a"
                  strokeWidth="0.8"
                />
              </g>
            );
          })}
        </g>
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const x = 800 + Math.cos(a) * 104;
        const y = 150 + Math.sin(a) * 16;
        return (
          <g key={i} opacity={Math.sin(a) < 0 ? 0.6 : 1}>
            <path
              d={`M800 ${150}Q${(800 + x) / 2} ${y - 30} ${x} ${y - 6}`}
              stroke="url(#chGold)"
              strokeWidth="3"
              fill="none"
            />
            <rect x={x - 3} y={y - 18} width="6" height="12" fill="#fff4e0" />
            <ellipse cx={x} cy={y - 23} rx="3.5" ry="6" fill="#ffe6a8" />
          </g>
        );
      })}
      <path
        d="M800 196L792 214L800 246L808 214Z"
        fill="url(#crystal)"
        stroke="#5a2a7a"
        strokeWidth="1"
      />
    </Layer>
  );
}

// Delays sit on the twinkle's own step grid (2.6s / 8) so all glints repaint together.
const SPARKLES: [number, number, number][] = [
  [742, 136, 0],
  [860, 128, 0.65],
  [800, 238, 1.3],
  [700, 160, 1.95],
  [902, 166, 0.325],
  [770, 204, 0.975],
  [832, 196, 1.625],
  [590, 400, 2.275],
  [1150, 112, 0.65],
];

export function Fx() {
  return (
    <>
      <div className="fx-shaft fx-shaft-a" />
      <div className="fx-haze fx-haze-a" />
      {SPARKLES.map(([x, y, d], i) => (
        <span
          key={i}
          className="fx-sparkle"
          style={{ left: x, top: y, animationDelay: `${-d}s` } as CSSProperties}
        />
      ))}
    </>
  );
}

export function Foreground() {
  const drape = (
    <>
      <path
        d="M0 0L150 0C140 120 120 280 106 470C120 560 138 700 128 900L0 900Z"
        fill="url(#fgDrape)"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        d="M92 462C110 450 130 456 136 474C130 494 108 498 92 486Z"
        fill="url(#fGold)"
        stroke={INK}
        strokeWidth="1.5"
      />
      <path
        d="M112 490L106 560M116 490L120 562M110 490L114 566"
        stroke={GOLD[1]}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
  return (
    <>
      <Layer z={9000} box={[0, 0, 340, 900]}>
        <defs>
          <linearGradient id="fgDrape" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#120210" />
            <stop offset="0.25" stopColor="#5a0a3e" />
            <stop offset="0.45" stopColor="#1e0418" />
            <stop offset="0.7" stopColor="#7a1052" />
            <stop offset="0.85" stopColor="#ff4fa8" stopOpacity="0.8" />
            <stop offset="1" stopColor="#2a0420" />
          </linearGradient>
          <GoldGrad id="fGold" vertical />
        </defs>
        {drape}
        <MonsteraLeaf x={150} y={930} s={1.5} r={28} rim="#ff8ad0" dark />
        <MonsteraLeaf x={60} y={930} s={1.8} r={-8} rim="#ffad1f" dark />
      </Layer>
      <Layer z={9000} box={[1300, 0, 300, 900]}>
        <g transform="matrix(-1 0 0 1 1600 0)">{drape}</g>
        <MonsteraLeaf x={1520} y={940} s={1.4} r={-30} rim="#b98bff" dark />
      </Layer>
    </>
  );
}
