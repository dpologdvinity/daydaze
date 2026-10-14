import { useId, type CSSProperties } from "react";
import {
  DOLL_H,
  DOLL_W,
  JACKET_PANELS,
  SIT_DROP,
  TORSO_PATH,
  armDef,
  fluffPath,
  legDefs,
  limbRing,
  pantLimbs,
  rand,
  smoothPath,
  type ArmDef,
  type LegDef,
  type Pt,
} from "./dollShapes";
import {
  TONES,
  asset,
  shade,
  type ArmPose,
  type Look,
  type Pose,
} from "./looks";

const INK = "#1b0b14";
const STROKE = 9;
const DENIM = "#2f3f93";

interface DollProps {
  look: Look;
  pose?: Pose;
  arms?: [ArmPose, ArmPose];
  walking?: boolean;
  /** Seconds; staggers blink and breathing between dolls. */
  phase?: number;
}

const limb = (pts: Pt[]) => smoothPath(limbRing(pts));

export function Doll({
  look,
  pose = "stand",
  arms = ["down", "hip"],
  walking = false,
  phase = 0,
}: DollProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const skin = TONES[look.tone];
  const tint = look.tint;
  const legs = legDefs(pose);
  const armDefs = [armDef(arms[0], false), armDef(arms[1], true)];
  const shoe = look.outfit === "flares" ? "#f3eef7" : shade(tint, -0.15);
  const style = {
    "--phase": `${-phase}s`,
    "--sit": pose === "sit" ? `${(SIT_DROP / DOLL_H) * 100}%` : "0%",
  } as CSSProperties;

  const skinStroke = {
    stroke: INK,
    strokeWidth: STROKE,
    strokeLinejoin: "round",
  } as const;

  const renderLeg = (leg: LegDef, i: number) => (
    <g key={i} className={`doll-leg doll-leg-${i}`}>
      {leg.limbs.map((l, j) => (
        <path key={j} d={limb(l)} fill={url("skin")} {...skinStroke} />
      ))}
      {leg.limbs.map((l, j) => (
        <path
          key={`h${j}`}
          d={limb(
            l.map(([x, y, w]) => [x - w * 0.12, y, w * 0.16] as Pt).slice(1),
          )}
          fill={skin.light}
          opacity={0.55}
        />
      ))}
      <Shoe leg={leg} color={shoe} />
    </g>
  );

  const renderArm = (a: ArmDef, i: number) => (
    <g key={i}>
      {a.limbs.map((l, j) => (
        <path key={j} d={limb(l)} fill={url("skin")} {...skinStroke} />
      ))}
      <path d={limb(a.hand)} fill={skin.base} {...skinStroke} />
      {[0, 14].map((o) => {
        const [wx, wy] = a.limbs[a.limbs.length - 1].at(-1)!;
        return (
          <ellipse
            key={o}
            cx={wx}
            cy={wy - 18 + o}
            rx="32"
            ry="9"
            fill="none"
            stroke="#f6c453"
            strokeWidth="7"
          />
        );
      })}
    </g>
  );

  return (
    <div
      className={`doll${walking ? " is-walking" : ""}${pose === "sit" ? " is-sitting" : ""}`}
      style={style}
    >
      <div className="doll-breathe">
        {/* Layer A: body and garments, under the bust art. */}
        <svg
          className="doll-layer"
          viewBox={`0 0 ${DOLL_W} ${DOLL_H}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={id("skin")} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={skin.light} />
              <stop offset="0.28" stopColor={skin.base} />
              <stop offset="0.72" stopColor={skin.base} />
              <stop offset="1" stopColor={skin.shade} />
            </linearGradient>
            <linearGradient id={id("torso")} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={skin.shade} />
              <stop offset="0.2" stopColor={skin.base} />
              <stop offset="0.5" stopColor={shade(skin.base, 0.08)} />
              <stop offset="0.8" stopColor={skin.base} />
              <stop offset="1" stopColor={skin.shade} />
            </linearGradient>
            <linearGradient id={id("tint")} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor={shade(tint, 0.35)} />
              <stop offset="0.45" stopColor={tint} />
              <stop offset="1" stopColor={shade(tint, -0.45)} />
            </linearGradient>
            <linearGradient id={id("denim")} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={shade(DENIM, -0.35)} />
              <stop offset="0.4" stopColor={shade(DENIM, 0.12)} />
              <stop offset="1" stopColor={shade(DENIM, -0.45)} />
            </linearGradient>
            <linearGradient id={id("patent")} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#4a3150" />
              <stop offset="0.5" stopColor="#1d1022" />
              <stop offset="1" stopColor="#0d0610" />
            </linearGradient>
            {legs.map((leg, i) => (
              <clipPath key={i} id={id(`hem${i}`)}>
                <path
                  d={`M0 1331L346 1331C420 1345 604 1345 678 1331L${DOLL_W} 1331L${DOLL_W} ${leg.ankle[1] + HEM}L0 ${leg.ankle[1] + HEM}Z`}
                />
              </clipPath>
            ))}
            <pattern
              id={id("sequin")}
              width="22"
              height="22"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="5" cy="5" r="4" fill="#fff" opacity="0.32" />
              <circle cx="16" cy="16" r="3" fill="#fff" opacity="0.18" />
            </pattern>
          </defs>
          {legs.map(renderLeg)}
          <path d={TORSO_PATH} fill={url("torso")} {...skinStroke} />
          {look.outfit === "flares" &&
            legs.map((leg, i) => (
              <g key={i} className={`doll-leg doll-leg-${i}`}>
                <Flares leg={leg} clip={url(`hem${i}`)} fill={url("denim")} />
              </g>
            ))}
          <Navel skin={skin.shade} />
          <Garment look={look} url={url} />
          {armDefs.map(renderArm)}
        </svg>
        <img
          className="doll-head"
          src={asset(`head-${look.tone}`)}
          alt=""
          draggable={false}
        />
        {/* Layer B: anything that covers the bust shoulders. */}
        <svg
          className="doll-layer"
          viewBox={`0 0 ${DOLL_W} ${DOLL_H}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={id("fur")} x1="0" x2="0.4" y1="0" y2="1">
              <stop offset="0" stopColor={shade(tint, 0.45)} />
              <stop offset="0.5" stopColor={tint} />
              <stop offset="1" stopColor={shade(tint, -0.3)} />
            </linearGradient>
          </defs>
          <Topper look={look} url={url} id={id} armDefs={armDefs} />
        </svg>
        <Blink skin={skin} phase={phase} />
        <img
          className="doll-head"
          src={asset(`brows-${look.brows}`)}
          alt=""
          draggable={false}
        />
        <img
          className="doll-head"
          src={asset(`lips-${look.lips}`)}
          alt=""
          draggable={false}
        />
        <img
          className="doll-head"
          src={asset(`hair-${look.hair}`)}
          alt=""
          draggable={false}
          style={{
            filter: look.hairColor === "none" ? undefined : look.hairColor,
          }}
        />
        {look.hoops && (
          <img
            className="doll-head"
            src={asset("hoops")}
            alt=""
            draggable={false}
          />
        )}
        {armDefs.some((a) => a.holds) && (
          <svg
            className="doll-layer"
            viewBox={`0 0 ${DOLL_W} ${DOLL_H}`}
            aria-hidden="true"
          >
            {armDefs.map(
              (a, i) =>
                a.holds && (
                  <Martini
                    key={i}
                    at={a.holds}
                    hand={a.hand}
                    tone={skin.base}
                  />
                ),
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

const HEM = 50;

function Flares({
  leg,
  clip,
  fill,
}: {
  leg: LegDef;
  clip: string;
  fill: string;
}) {
  const limbs = pantLimbs(leg);
  const last = limbs[limbs.length - 1];
  const [hx, , hw] = last[last.length - 1];
  const y = leg.ankle[1] + HEM;
  return (
    <g>
      <g clipPath={clip}>
        {limbs.map((l, j) => (
          <path
            key={j}
            d={limb(l)}
            fill={fill}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        ))}
        {limbs.map((l, j) => (
          <path
            key={`s${j}`}
            d={limb(
              l
                .map(([x, yy, w]) => [x + w * 0.18, yy, w * 0.12] as Pt)
                .slice(1, -1),
            )}
            fill="#8fa6ff"
            opacity={0.35}
          />
        ))}
      </g>
      <path
        d={`M${hx - hw / 2 + 6} ${y}L${hx + hw / 2 - 6} ${y}`}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </g>
  );
}

function Shoe({ leg, color }: { leg: LegDef; color: string }) {
  const [x, y] = leg.ankle;
  return (
    <g transform={`translate(${x} ${y}) rotate(${leg.shoeRot})`}>
      <rect
        x="-70"
        y="60"
        width="140"
        height="72"
        rx="20"
        fill={shade(color, -0.25)}
        stroke={INK}
        strokeWidth={STROKE}
      />
      <rect
        x="-66"
        y="62"
        width="132"
        height="18"
        rx="9"
        fill={shade(color, 0.35)}
      />
      <path
        d="M-34 -2C-50 22-60 46-58 70L58 70C60 46 50 22 34-2Z"
        fill={color}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <rect
        x="-32"
        y="-16"
        width="64"
        height="18"
        rx="9"
        fill={shade(color, -0.2)}
        stroke={INK}
        strokeWidth={6}
      />
      <path
        d="M-30 30C-34 44-34 54-30 62"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.7"
        fill="none"
      />
      <path
        d="M-46 100L40 100"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.35"
      />
    </g>
  );
}

function Navel({ skin }: { skin: string }) {
  return (
    <path
      d="M506 1290c2 10 10 10 12 0"
      stroke={skin}
      strokeWidth="6"
      fill="none"
      strokeLinecap="round"
    />
  );
}

const NECKLINE =
  "M318 1030C360 1008 420 1004 455 1030C480 1048 500 1060 512 1062C524 1060 544 1048 569 1030C604 1004 664 1008 706 1030";

function Garment({ look, url }: { look: Look; url: (n: string) => string }) {
  const outline = {
    stroke: INK,
    strokeWidth: STROKE,
    strokeLinejoin: "round",
  } as const;
  const crop = `${NECKLINE}L702 1095C690 1140 680 1160 676 1174C600 1188 424 1188 348 1174C344 1160 334 1140 322 1095Z`;
  const sheen = (
    <path
      d="M392 1050C380 1090 384 1130 398 1160"
      stroke="#fff"
      strokeWidth="12"
      strokeLinecap="round"
      opacity="0.45"
      fill="none"
    />
  );
  if (look.outfit === "flares")
    return (
      <g>
        <path
          d="M346 1331C420 1345 604 1345 678 1331"
          stroke={INK}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M352 1352C440 1366 584 1366 672 1352"
          stroke="#e9c46a"
          strokeWidth="7"
          strokeDasharray="2 14"
          strokeLinecap="round"
          fill="none"
        />
        <circle
          cx="512"
          cy="1364"
          r="13"
          fill="#fff6c8"
          stroke={INK}
          strokeWidth="5"
        />
        <path d={crop} fill={url("tint")} {...outline} />
        {sheen}
        <path d="M512 1068l9 14-9 14-9-14z" fill="#fff" opacity="0.9" />
      </g>
    );
  if (look.outfit === "dress") {
    const d = `${NECKLINE}L704 1100C690 1170 650 1230 636 1262C650 1310 680 1380 690 1420L722 1572C620 1596 404 1596 302 1572L334 1420C344 1380 374 1310 388 1262C374 1230 334 1170 320 1100Z`;
    return (
      <g>
        <path d={d} fill={url("tint")} {...outline} />
        <path d={d} fill={url("sequin")} />
        <path
          d="M400 1060C384 1150 410 1230 404 1300C396 1380 370 1460 360 1540"
          stroke="#fff"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.4"
          fill="none"
        />
        <path
          d="M392 1262C460 1276 564 1276 632 1262"
          stroke={INK}
          strokeWidth="5"
          opacity="0.5"
          fill="none"
        />
      </g>
    );
  }
  return (
    <g>
      <path
        d="M346 1320C420 1334 604 1334 678 1320L708 1524C620 1546 404 1546 316 1524Z"
        fill={url("patent")}
        {...outline}
      />
      <path
        d="M372 1350C360 1410 352 1460 346 1510"
        stroke="#fff"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.4"
        fill="none"
      />
      <path d={crop} fill="#24142b" {...outline} />
      <path
        d="M392 1050C380 1090 384 1130 398 1160"
        stroke="#fff"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.25"
        fill="none"
      />
    </g>
  );
}

function Topper({
  look,
  url,
  id,
  armDefs,
}: {
  look: Look;
  url: (n: string) => string;
  id: (n: string) => string;
  armDefs: ArmDef[];
}) {
  if (look.outfit !== "fur") {
    const strap = look.outfit === "flares" ? shade(look.tint, -0.1) : "#f2e2b0";
    return (
      <g strokeLinecap="round">
        <path
          d="M434 1020L396 866M590 1020L628 866"
          stroke={INK}
          strokeWidth="18"
        />
        <path
          d="M434 1020L396 866M590 1020L628 866"
          stroke={strap}
          strokeWidth="8"
        />
        <path
          d="M410 905C450 960 574 960 614 905"
          stroke="#f6d27a"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="512"
          cy="948"
          r="10"
          fill="#fff"
          stroke="#f6d27a"
          strokeWidth="4"
        />
      </g>
    );
  }
  const furStroke = {
    stroke: INK,
    strokeWidth: STROKE,
    strokeLinejoin: "round",
  } as const;
  const sleeves = armDefs.flatMap((a) =>
    a.limbs.map((l) =>
      fluffPath(limbRing(l.map(([x, y, w]) => [x, y, w + 70] as Pt)), 30, 13),
    ),
  );
  const panels = JACKET_PANELS.map((p) => fluffPath(p, 34, 16));
  const shapes = [...panels, ...sleeves];
  return (
    <g>
      {shapes.map((d, i) => (
        <g key={i}>
          <clipPath id={id(`furclip${i}`)}>
            <path d={d} />
          </clipPath>
          <path d={d} fill={url("fur")} {...furStroke} />
          <g
            clipPath={`url(#${id(`furclip${i}`)})`}
            stroke={shade(look.tint, -0.35)}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            opacity="0.55"
          >
            {Array.from({ length: 26 }, (_, k) => {
              const x = 180 + rand(i * 50 + k) * 660;
              const y = 860 + rand(i * 70 + k + 9) * 520;
              return <path key={k} d={`M${x} ${y}q10 18 2 34`} />;
            })}
          </g>
        </g>
      ))}
    </g>
  );
}

function Martini({
  at,
  hand,
  tone,
}: {
  at: [number, number];
  hand: Pt[];
  tone: string;
}) {
  const [x, y] = at;
  return (
    <g>
      <g transform={`translate(${x} ${y})`}>
        <path
          d="M-62-118L62-118L4-40L-4-40Z"
          fill="#ffb42e"
          fillOpacity="0.92"
          stroke={INK}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M-52-110L52-110"
          stroke="#fff3c4"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M0-40L0 22M-30 26L30 26"
          stroke="#e8f2ff"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M0-40L0 22M-30 26L30 26"
          stroke={INK}
          strokeWidth="2"
          opacity="0.4"
        />
        <path
          d="M44-132C70-140 82-118 66-104C52-96 40-108 44-132Z"
          fill="#ff8a1f"
          stroke={INK}
          strokeWidth="6"
        />
        <path
          d="M-38-104L-14-60"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
      {/* fingers wrap the stem, so redraw the hand over the glass */}
      <path
        d={limb(hand)}
        fill={tone}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Blink({
  skin,
  phase,
}: {
  skin: { base: string; light: string; shade: string };
  phase: number;
}) {
  const lid = "M290 448C330 418 420 418 476 514C420 524 336 506 290 470Z";
  const lash =
    "M292 462C350 500 420 518 476 514M304 474L284 490M322 486L306 504M342 494L330 512";
  return (
    <svg
      className="doll-blink"
      viewBox={`0 0 ${DOLL_W} ${DOLL_W}`}
      aria-hidden="true"
    >
      {/* SMIL, not CSS: a discrete repaint keeps the doll a single composited layer */}
      <g opacity="0">
        <animate
          attributeName="opacity"
          values="0;1;0"
          keyTimes="0;0.955;0.975"
          calcMode="discrete"
          dur="5.3s"
          begin={`${-phase}s`}
          repeatCount="indefinite"
        />
        {[0, 1].map((i) => (
          <g key={i} transform={i ? "matrix(-1 0 0 1 1025 0)" : undefined}>
            <path d={lid} fill={skin.base} />
            <path d={lid} fill={skin.light} opacity="0.35" />
            <path
              d={lash}
              stroke={INK}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
