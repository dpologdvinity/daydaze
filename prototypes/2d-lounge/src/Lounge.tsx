import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Sparkles, X } from "lucide-react";
import { Doll } from "./Doll";
import { DOLL_H, DOLL_W, FOOT_Y, SIT_DROP } from "./dollShapes";
import {
  BROW_OPTIONS,
  HAIR_COLORS,
  HAIR_OPTIONS,
  LIP_OPTIONS,
  OUTFIT_OPTIONS,
  PLAYER_LOOK,
  TINTS,
  TONES,
  TONE_OPTIONS,
  type ArmPose,
  type Look,
  type Pose,
} from "./looks";
import {
  BarCounter,
  Booth,
  Chandelier,
  CocktailTable,
  DanceTiles,
  FLOOR_BACK,
  FLOOR_FRONT,
  Foreground,
  Fx,
  MonsteraPlant,
  NeonSigns,
  PalmPlant,
  RoomBack,
  Stools,
} from "./Room";

const STAGE_W = 1600;
const STAGE_H = 900;
/** Doll box height in stage units at the front of the floor. */
const DOLL_FRONT_H = 300;
const K = DOLL_FRONT_H / DOLL_H;
const SPEED = 300;

const depthScale = (y: number) =>
  0.68 +
  0.32 *
    Math.min(1, Math.max(0, (y - FLOOR_BACK) / (FLOOR_FRONT - FLOOR_BACK)));

interface Npc {
  name: string;
  x: number;
  y: number;
  dir: 1 | -1;
  pose: Pose;
  arms: [ArmPose, ArmPose];
  look: Look;
}

const NPCS: Npc[] = [
  {
    name: "Jade",
    x: 470,
    y: 574,
    dir: 1,
    pose: "stand",
    arms: ["down", "drink"],
    look: {
      tone: "midnight",
      hair: "braids",
      hairColor: "none",
      brows: "sculpted-espresso",
      lips: "burgundy-cherry",
      outfit: "dress",
      tint: "#ffad1f",
      hoops: true,
    },
  },
  {
    name: "Coco",
    x: 352,
    y: 668,
    dir: 1,
    pose: "stand",
    arms: ["hip", "down"],
    look: {
      tone: "caramel",
      hair: "waves",
      hairColor: "hue-rotate(-22deg) saturate(2.1) brightness(0.95)",
      brows: "feathered-honey",
      lips: "90s-caramel-ombre",
      outfit: "flares",
      tint: "#8a3dff",
      hoops: false,
    },
  },
  {
    name: "Dani",
    x: 1180,
    y: 645,
    dir: -1,
    pose: "sit",
    arms: ["down", "down"],
    look: {
      tone: "mocha",
      hair: "braids",
      hairColor: "hue-rotate(-48deg) saturate(1.5) brightness(1.75)",
      brows: "fox-snatched",
      lips: "hot-pink-glam",
      outfit: "dress",
      tint: "#18b98c",
      hoops: true,
    },
  },
  {
    name: "Bree",
    x: 980,
    y: 712,
    dir: -1,
    pose: "stand",
    arms: ["hip", "drink"],
    look: {
      tone: "porcelain",
      hair: "waves",
      hairColor: "brightness(1.55) saturate(1.25) hue-rotate(6deg)",
      brows: "y2k-thin",
      lips: "nude-pink-gloss",
      outfit: "fur",
      tint: "#ff2f9a",
      hoops: true,
    },
  },
];

// Hollywood vanity bulbs around the arched 200x270 mirror frame.
const BULBS: [number, number][] = [
  ...Array.from({ length: 7 }, (_, i) => {
    const a = Math.PI + (i / 6) * Math.PI;
    return [100 + Math.cos(a) * 94, 100 + Math.sin(a) * 94] as [number, number];
  }),
  ...[150, 205, 260].flatMap((y): [number, number][] => [
    [6, y],
    [194, y],
  ]),
];

const CHATTER: [string, string][] = [
  ["Bree", "mango martini anyone?"],
  ["Coco", "who's on the decks tonight"],
  ["Jade", "VIP opens at midnight"],
  ["Dani", "ok that fur is everything"],
];

function clampToFloor(x: number, y: number): [number, number] {
  let cy = Math.min(FLOOR_FRONT - 8, Math.max(FLOOR_BACK + 16, y));
  const half = 600 + ((cy - FLOOR_BACK) * 200) / 220;
  let cx = Math.min(
    Math.min(800 + half - 50, 1450),
    Math.max(Math.max(800 - half + 50, 150), x),
  );
  // Furniture footprints: stop in front of them instead of inside.
  const blocks: [number, number, number, number, number][] = [
    [930, 1385, FLOOR_BACK, 646, 656],
    [1030, 1172, 660, 712, 722],
    [196, 714, 600, 618, 626],
  ];
  for (const [x0, x1, y0, y1, out] of blocks)
    if (cx > x0 && cx < x1 && cy > y0 && cy < y1) cy = out;
  cx = Math.round(cx);
  return [cx, Math.round(cy)];
}

function DollEntity({
  x,
  y,
  dir,
  look,
  pose,
  arms,
  name,
  bubble,
  walking,
  phase,
  isPlayer,
  innerRef,
}: {
  x: number;
  y: number;
  dir: number;
  look: Look;
  pose: Pose;
  arms: [ArmPose, ArmPose];
  name: string;
  bubble?: string;
  walking?: boolean;
  phase: number;
  isPlayer?: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const s = depthScale(y);
  const headTop = -(FOOT_Y - (pose === "sit" ? SIT_DROP : 0)) * K + 8 * K;
  return (
    <div
      ref={innerRef}
      className={`ent${isPlayer ? " ent-player" : ""}`}
      style={{
        transform: `translate(${x}px, ${y}px) scale(${s})`,
        zIndex: Math.round(y),
      }}
    >
      <div className="ent-shadow" />
      <div
        className="ent-flip"
        style={
          {
            width: DOLL_W * K,
            height: DOLL_H * K,
            left: (-DOLL_W * K) / 2,
            top: -FOOT_Y * K,
            transform: `scaleX(${dir})`,
          } as CSSProperties
        }
      >
        <Doll
          look={look}
          pose={pose}
          arms={arms}
          walking={walking}
          phase={phase}
        />
      </div>
      <div className="ent-name">{name}</div>
      {bubble && (
        <div className="bubble" style={{ top: headTop }} key={bubble}>
          {bubble}
        </div>
      )}
    </div>
  );
}

export function Lounge() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 800, y: 770 });
  const target = useRef({ x: 800, y: 770 });
  const view = useRef({ s: 1, ox: 0, oy: 0, follow: false });
  const [walking, setWalking] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [look, setLook] = useState<Look>(PLAYER_LOOK);
  const [panelOpen, setPanelOpen] = useState(() =>
    new URLSearchParams(location.search).has("dress"),
  );
  const [chat, setChat] = useState("");
  const [playerBubble, setPlayerBubble] = useState<string>();
  const [chatter, setChatter] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setChatter((c) => (c + 1) % CHATTER.length),
      7000,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!playerBubble) return;
    const t = setTimeout(() => setPlayerBubble(undefined), 5000);
    return () => clearTimeout(t);
  }, [playerBubble]);

  const layout = useCallback(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const s = Math.max(w / STAGE_W, h / STAGE_H);
    const follow = STAGE_W * s > w * 1.25;
    let ox = (w - STAGE_W * s) / 2;
    if (follow)
      ox = Math.min(0, Math.max(w - STAGE_W * s, w / 2 - pos.current.x * s));
    const oy = (h - STAGE_H * s) / 2;
    view.current = { s, ox, oy, follow };
    stage.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`;
  }, []);

  useEffect(() => {
    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, [layout]);

  const walkTo = useCallback((x: number, y: number) => {
    const [tx, ty] = clampToFloor(x, y);
    target.current = { x: tx, y: ty };
    if (Math.abs(tx - pos.current.x) > 2) setDir(tx < pos.current.x ? -1 : 1);
    setWalking(true);
  }, []);

  useEffect(() => {
    if (!walking) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = pos.current;
      const t = target.current;
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.hypot(dx, dy);
      const v = SPEED * depthScale(p.y) * dt;
      if (dist <= v) {
        p.x = t.x;
        p.y = t.y;
      } else {
        p.x += (dx / dist) * v;
        p.y += (dy / dist) * v;
      }
      const el = playerRef.current;
      if (el) {
        el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${depthScale(p.y)})`;
        el.style.zIndex = String(Math.round(p.y));
      }
      if (view.current.follow) layout();
      if (dist <= v) setWalking(false);
      else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [walking, layout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") setPanelOpen(false);
      const d: Record<string, [number, number]> = {
        ArrowLeft: [-70, 0],
        ArrowRight: [70, 0],
        ArrowUp: [0, -40],
        ArrowDown: [0, 40],
      };
      const m = d[e.key];
      if (!m) return;
      e.preventDefault();
      walkTo(pos.current.x + m[0], pos.current.y + m[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walkTo]);

  const onStagePointer = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const { s, ox, oy } = view.current;
    walkTo((e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s);
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chat.trim().slice(0, 60);
    if (text) setPlayerBubble(text);
    setChat("");
  };

  const set = <K extends keyof Look>(key: K, value: Look[K]) =>
    setLook((l) => ({ ...l, [key]: value }));
  const [chatName, chatLine] = CHATTER[chatter];

  return (
    <div className={`lounge${panelOpen ? " panel-open" : ""}`}>
      <div className="stage-wrap" ref={wrapRef} onPointerDown={onStagePointer}>
        <div className="stage" ref={stageRef}>
          <RoomBack />
          <DanceTiles />
          <NeonSigns />
          <Chandelier />
          <BarCounter />
          <Stools />
          <Booth />
          <CocktailTable />
          <PalmPlant />
          <MonsteraPlant />
          {NPCS.map((n, i) => (
            <DollEntity
              key={n.name}
              {...n}
              phase={i * 1.7 + 0.6}
              bubble={chatName === n.name ? chatLine : undefined}
            />
          ))}
          <DollEntity
            innerRef={playerRef}
            x={pos.current.x}
            y={pos.current.y}
            dir={dir}
            look={look}
            pose="stand"
            arms={["down", "hip"]}
            name="mangoqueen"
            bubble={playerBubble}
            walking={walking}
            phase={0}
            isPlayer
          />
          <div className="fx">
            <Fx />
          </div>
          <Foreground />
        </div>
      </div>

      <header className="hud-title">
        <h1>Mango Lounge</h1>
        <p>Daydaze, 5 dolls here</p>
      </header>

      <form className="hud-chat" onSubmit={sendChat}>
        <label className="sr-only" htmlFor="chat">
          Say something
        </label>
        <input
          id="chat"
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          placeholder="Say something…"
          maxLength={60}
          autoComplete="off"
        />
        <button type="submit">Send</button>
      </form>

      <ul className="hud-here" aria-label="Here now">
        {["mangoqueen", ...NPCS.map((n) => n.name)].map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>

      <button
        type="button"
        className="hud-dress"
        aria-expanded={panelOpen}
        aria-controls="vanity"
        onClick={() => setPanelOpen((o) => !o)}
      >
        <Sparkles size={18} aria-hidden="true" />
        Dress up
      </button>

      {panelOpen && (
        <aside id="vanity" className="vanity" aria-label="Dress up">
          <button
            type="button"
            className="vanity-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close dress up"
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div className="mirror">
            {BULBS.map(([left, top], i) => (
              <i
                key={i}
                className="bulb"
                style={{ left, top, animationDelay: `${-i * 0.37}s` }}
              />
            ))}
            <div className="mirror-glass">
              <div className="mirror-doll">
                <Doll look={look} arms={["down", "hip"]} phase={0.3} />
              </div>
            </div>
          </div>
          <div className="vanity-scroll">
            <Group label="Skin">
              {TONE_OPTIONS.map((t) => (
                <Swatch
                  key={t.id}
                  label={t.label}
                  color={TONES[t.id].base}
                  on={look.tone === t.id}
                  onClick={() => set("tone", t.id)}
                />
              ))}
            </Group>
            <Group label="Hair">
              {HAIR_OPTIONS.map((h) => (
                <Chip
                  key={h.id}
                  on={look.hair === h.id}
                  onClick={() => set("hair", h.id)}
                >
                  {h.label}
                </Chip>
              ))}
              <span className="opt-break" />
              {HAIR_COLORS.map((c) => (
                <Swatch
                  key={c.label}
                  label={c.label}
                  color={c.swatch}
                  on={look.hairColor === c.id}
                  onClick={() => set("hairColor", c.id)}
                />
              ))}
            </Group>
            <Group label="Brows">
              {BROW_OPTIONS.map((b) => (
                <Chip
                  key={b.id}
                  on={look.brows === b.id}
                  onClick={() => set("brows", b.id)}
                >
                  {b.label}
                </Chip>
              ))}
            </Group>
            <Group label="Lips">
              {LIP_OPTIONS.map((l) => (
                <Swatch
                  key={l.id}
                  label={l.label}
                  color={l.swatch}
                  on={look.lips === l.id}
                  onClick={() => set("lips", l.id)}
                />
              ))}
            </Group>
            <Group label="Outfit">
              {OUTFIT_OPTIONS.map((o) => (
                <Chip
                  key={o.id}
                  on={look.outfit === o.id}
                  onClick={() => set("outfit", o.id)}
                >
                  {o.label}
                </Chip>
              ))}
              <span className="opt-break" />
              {TINTS.map((t) => (
                <Swatch
                  key={t.id}
                  label={t.label}
                  color={t.id}
                  on={look.tint === t.id}
                  onClick={() => set("tint", t.id)}
                />
              ))}
            </Group>
            <Group label="Jewelry">
              <Chip on={look.hoops} onClick={() => set("hoops", !look.hoops)}>
                Gold bamboo hoops
              </Chip>
            </Group>
          </div>
        </aside>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="opt-group">
      <legend>{label}</legend>
      <div className="opt-row">{children}</div>
    </fieldset>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function Swatch({
  label,
  color,
  on,
  onClick,
}: {
  label: string;
  color: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="swatch"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ "--c": color } as CSSProperties}
    />
  );
}
