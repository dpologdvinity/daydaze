import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { payoutFor, type PayGrade } from "../../game/wallet.ts";
import { Dialog } from "../Dialog.tsx";
import {
  BOOTHS,
  FILL_RATE,
  RIVALS,
  SQUIRT_RADIUS,
  SQUIRT_SECONDS,
  onTarget,
  rivalAt,
  squirtScore,
  squirtTarget,
  BOTTLE_COLUMNS,
  BOTTLE_ROWS,
  CORKS,
  GALLERY_SECONDS,
  HOLES,
  LANES,
  LEVELS,
  RINGS,
  TARGET_POINTS,
  WHACK_POINTS,
  WHACK_SECONDS,
  galleryTargets,
  grade,
  meters,
  moleSchedule,
  shoot,
  targetX,
  toss,
  whack,
  type BoothId,
  type Level,
  type Toss,
} from "./engine.ts";
import "./Midway.css";

type Result = { grade: PayGrade; score: number; booth: BoothId; level: Level };
type Props = {
  onClose: (result: Result | null) => void;
  reducedMotion?: boolean;
};

/** Seconds since mount, refreshed every animation frame while `running`. */
function useClock(running: boolean) {
  const [t, setT] = useState(0);
  const start = useRef(performance.now());
  useEffect(() => {
    if (!running) return;
    start.current = performance.now();
    let frame = 0;
    const tick = () => {
      setT((performance.now() - start.current) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  return t;
}

type BoothProps = {
  level: Level;
  seed: number;
  onFinish: (score: number) => void;
};

// ------------------------------------------------------------ whack-a-mole

// number keys laid out like a phone keypad over the 3 by 3 board
const KEY_TO_HOLE: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
  "9": 8,
};

function Whack({ level, seed, onFinish }: BoothProps) {
  const moles = useMemo(() => moleSchedule(level, seed), [level, seed]);
  const t = useClock(true);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<{ hole: number; text: string } | null>(
    null,
  );
  const finished = useRef(false);
  const left = Math.max(0, WHACK_SECONDS - t);

  useEffect(() => {
    if (left > 0 || finished.current) return;
    finished.current = true;
    onFinish(score);
  }, [left, score, onFinish]);

  const bop = (hole: number) => {
    if (left <= 0) return;
    const out = whack(moles, hole, t);
    setScore((s) => Math.max(0, s + WHACK_POINTS[out]));
    setFlash({
      hole,
      text: out === "golden" ? "+30!" : out === "hit" ? "+10" : "miss",
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hole = KEY_TO_HOLE[e.key];
      if (hole === undefined) return;
      e.preventDefault();
      bop(hole);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="mw-booth mw-whack" aria-label="Whack-a-mole">
      <Hud score={score} left={left} extra="Keys 1 to 9 bop the holes" />
      <div className="mw-holes">
        {Array.from({ length: HOLES }, (_, hole) => {
          const mole = moles.find(
            (m) => m.hole === hole && !m.hit && m.up <= t && t <= m.down,
          );
          return (
            <button
              key={hole}
              type="button"
              className="mw-hole"
              data-up={mole ? (mole.golden ? "golden" : "mole") : undefined}
              aria-label={`Hole ${hole + 1}${mole ? ", mole up" : ""}`}
              onPointerDown={(e) => {
                e.preventDefault();
                bop(hole);
              }}
              onClick={(e) => {
                // keyboard activation; pointer taps already bopped on down
                if (e.detail === 0) bop(hole);
              }}
            >
              <span className="mw-mole" aria-hidden="true">
                <span className="mw-mole-eyes" />
              </span>
              {flash?.hole === hole && (
                <span key={`${t.toFixed(1)}`} className="mw-pop">
                  {flash.text}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// --------------------------------------------------------- shooting gallery

function TargetArt({ kind }: { kind: "duck" | "star" | "can" }) {
  if (kind === "star")
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"
          fill="#ffd84f"
          stroke="#a35f00"
          strokeWidth="2"
        />
      </svg>
    );
  if (kind === "can")
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect x="10" y="6" width="20" height="30" rx="3" fill="#3fe0d0" />
        <rect x="10" y="15" width="20" height="8" fill="#ff2f9a" />
        <ellipse cx="20" cy="6" rx="10" ry="3" fill="#bff5ef" />
      </svg>
    );
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="18" cy="26" rx="14" ry="9" fill="#ffb02e" />
      <circle cx="29" cy="14" r="7" fill="#ffb02e" />
      <path d="M35 14l5 2-5 2z" fill="#ff6b3d" />
      <circle cx="31" cy="12" r="1.6" fill="#1a0d1d" />
    </svg>
  );
}

function Gallery({ level, seed, onFinish }: BoothProps) {
  const targets = useMemo(() => galleryTargets(level, seed), [level, seed]);
  const t = useClock(true);
  const [score, setScore] = useState(0);
  const [corks, setCorks] = useState(CORKS[level]);
  const [aim, setAim] = useState<{ x: number; lane: number }>({
    x: 0.5,
    lane: 1,
  });
  const [pop, setPop] = useState<{
    x: number;
    lane: number;
    text: string;
  } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const left = Math.max(0, GALLERY_SECONDS - t);
  const over = left <= 0 || corks <= 0;

  useEffect(() => {
    if (!over || finished.current) return;
    finished.current = true;
    onFinish(score);
  }, [over, score, onFinish]);

  const fire = (x: number, lane: number) => {
    if (over) return;
    setCorks((c) => c - 1);
    const hit = shoot(targets, level, lane, x, t);
    if (hit) setScore((s) => s + TARGET_POINTS[hit.kind]);
    setPop({ x, lane, text: hit ? `+${TARGET_POINTS[hit.kind]}` : "pok" });
  };

  const at = (clientX: number, clientY: number) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return null;
    const x = (clientX - box.left) / box.width;
    const lane = Math.floor(((clientY - box.top) / box.height) * LANES);
    if (x < 0 || x > 1 || lane < 0 || lane >= LANES) return null;
    return { x, lane };
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const move: Record<string, () => void> = {
        ArrowLeft: () => setAim((a) => ({ ...a, x: Math.max(0, a.x - 0.03) })),
        ArrowRight: () => setAim((a) => ({ ...a, x: Math.min(1, a.x + 0.03) })),
        ArrowUp: () => setAim((a) => ({ ...a, lane: Math.max(0, a.lane - 1) })),
        ArrowDown: () =>
          setAim((a) => ({ ...a, lane: Math.min(LANES - 1, a.lane + 1) })),
        " ": () => fire(aim.x, aim.lane),
        Enter: () => fire(aim.x, aim.lane),
      };
      const fn = move[e.key];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cross: CSSProperties = {
    left: `${aim.x * 100}%`,
    top: `${((aim.lane + 0.5) / LANES) * 100}%`,
  };

  return (
    <section className="mw-booth mw-gallery" aria-label="Shooting gallery">
      <Hud
        score={score}
        left={left}
        extra={`${corks} corks · arrows aim, space fires`}
      />
      <div
        ref={stage}
        className="mw-stage"
        role="application"
        aria-label="Gallery targets. Tap a target to fire a cork."
        onPointerMove={(e) => {
          const p = at(e.clientX, e.clientY);
          if (p) setAim(p);
        }}
        onPointerDown={(e) => {
          const p = at(e.clientX, e.clientY);
          if (!p) return;
          setAim(p);
          fire(p.x, p.lane);
        }}
      >
        {Array.from({ length: LANES }, (_, lane) => (
          <div key={lane} className="mw-lane" />
        ))}
        {targets.map((target) =>
          target.hit ? null : (
            <span
              key={target.id}
              className="mw-target"
              style={{
                left: `${targetX(target, t) * 100}%`,
                top: `${((target.lane + 0.5) / LANES) * 100}%`,
                transform: `translate(-50%, -50%) scaleX(${target.speed < 0 ? -1 : 1})`,
              }}
            >
              <TargetArt kind={target.kind} />
            </span>
          ),
        )}
        {pop && (
          <span
            key={`${pop.x}-${corks}`}
            className="mw-pop"
            style={{
              left: `${pop.x * 100}%`,
              top: `${((pop.lane + 0.5) / LANES) * 100}%`,
            }}
          >
            {pop.text}
          </span>
        )}
        <span className="mw-cross" style={cross} aria-hidden="true" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------- water-gun race

const HORSES = ["You", "Blue", "Gold", "Green"] as const;

function Squirt({ level, seed, onFinish }: BoothProps) {
  const t = useClock(true);
  const [aim, setAim] = useState({ x: 0.5, y: 0.5 });
  const [firing, setFiring] = useState(false);
  // progress builds frame by frame while the stream is on the bullseye
  const progress = useRef(0);
  const last = useRef(0);
  const finished = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const target = squirtTarget(level, seed, t);
  const hitting = firing && onTarget(level, aim, target);
  const dt = Math.max(0, Math.min(0.1, t - last.current));
  last.current = t;
  if (hitting && !finished.current)
    progress.current = Math.min(1, progress.current + FILL_RATE * dt);
  const rivals = Array.from({ length: RIVALS }, (_, i) =>
    rivalAt(level, seed, i, t),
  );
  const rivalWon = rivals.some((r) => r >= 1);
  const won = progress.current >= 1 && !rivalWon;
  const over = progress.current >= 1 || rivalWon || t >= SQUIRT_SECONDS;
  const score = squirtScore(progress.current, won);

  useEffect(() => {
    if (!over || finished.current) return;
    finished.current = true;
    onFinish(score);
  }, [over, score, onFinish]);

  useEffect(() => {
    const step = 0.04;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => setAim((a) => ({ ...a, x: Math.max(0, a.x - step) })),
      ArrowRight: () => setAim((a) => ({ ...a, x: Math.min(1, a.x + step) })),
      ArrowUp: () => setAim((a) => ({ ...a, y: Math.max(0, a.y - step) })),
      ArrowDown: () => setAim((a) => ({ ...a, y: Math.min(1, a.y + step) })),
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFiring(true);
        return;
      }
      const fn = keys[e.key];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") setFiring(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const at = (clientX: number, clientY: number) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (clientY - box.top) / box.height)),
    };
  };
  const size = `${SQUIRT_RADIUS[level] * 200}%`;

  return (
    <section className="mw-booth mw-squirt" aria-label="Water-gun race">
      <Hud
        score={score}
        left={Math.max(0, SQUIRT_SECONDS - t)}
        extra="hold to squirt · arrows aim, hold space"
      />
      <ol className="mw-horses" aria-label="The race">
        {HORSES.map((name, i) => {
          const p = i === 0 ? progress.current : (rivals[i - 1] ?? 0);
          return (
            <li key={name} data-you={i === 0}>
              <span>{name}</span>
              <meter min={0} max={1} value={p} aria-label={`${name}'s horse`} />
            </li>
          );
        })}
      </ol>
      <div
        ref={stage}
        className="mw-stage"
        role="application"
        aria-label="The bullseye. Press and hold on it to squirt."
        data-hitting={hitting}
        onPointerMove={(e) => {
          const p = at(e.clientX, e.clientY);
          if (p) setAim(p);
        }}
        onPointerDown={(e) => {
          const p = at(e.clientX, e.clientY);
          if (p) setAim(p);
          setFiring(true);
        }}
        onPointerUp={() => setFiring(false)}
        onPointerLeave={() => setFiring(false)}
      >
        <span
          className="mw-bullseye"
          style={{
            left: `${target.x * 100}%`,
            top: `${target.y * 100}%`,
            width: size,
            aspectRatio: "1",
          }}
        />
        <span
          className="mw-cross"
          data-firing={firing}
          style={{ left: `${aim.x * 100}%`, top: `${aim.y * 100}%` }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- ring toss

function Rings({ level, onFinish }: BoothProps) {
  const t = useClock(true);
  const [tosses, setTosses] = useState<Toss[]>([]);
  const finished = useRef(false);
  const { aim, power } = meters(level, t);
  const score = tosses.reduce((s, x) => s + x.points, 0);
  const done = tosses.length >= RINGS;

  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    onFinish(score);
  }, [done, score, onFinish]);

  const throwRing = () => {
    if (done) return;
    setTosses((list) => [...list, toss(level, aim, power)]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      throwRing();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const last = tosses[tosses.length - 1];
  return (
    <section className="mw-booth mw-rings" aria-label="Ring toss">
      <Hud
        score={score}
        extra={`Ring ${Math.min(tosses.length + 1, RINGS)} of ${RINGS} · space throws`}
      />
      <div className="mw-ring-play">
        <div className="mw-crate" aria-hidden="true">
          {Array.from({ length: BOTTLE_ROWS }, (_, r) =>
            Array.from({ length: BOTTLE_COLUMNS }, (_, c) => {
              const row = BOTTLE_ROWS - 1 - r; // back row drawn first
              const rung = tosses.some(
                (x) => x.ringer?.[0] === c && x.ringer?.[1] === row,
              );
              return (
                <span
                  key={`${c}-${row}`}
                  className="mw-bottle"
                  data-rung={rung || undefined}
                  data-row={row}
                />
              );
            }),
          )}
          {/* the swinging aim and power cross-hair over the crate */}
          <span
            className="mw-ring-ghost"
            style={{
              left: `${aim * 100}%`,
              top: `${(1 - power) * 100}%`,
            }}
          />
          {last && (
            <span
              key={tosses.length}
              className="mw-ring-landed"
              data-hit={last.ringer ? "yes" : "no"}
              style={{
                left: `${(last.at[0] / BOTTLE_COLUMNS) * 100}%`,
                top: `${(1 - last.at[1] / BOTTLE_ROWS) * 100}%`,
              }}
            />
          )}
        </div>
        <div className="mw-meters" aria-hidden="true">
          <div className="mw-meter mw-meter-aim">
            <span style={{ left: `${aim * 100}%` }} />
          </div>
          <div className="mw-meter mw-meter-power">
            <span style={{ bottom: `${power * 100}%` }} />
          </div>
        </div>
      </div>
      <button
        type="button"
        className="mw-go"
        onClick={throwRing}
        disabled={done}
      >
        Throw
      </button>
      <p className="mw-announce" aria-live="polite">
        {last
          ? last.ringer
            ? `Ringer! +${last.points}`
            : "Clink. No ringer."
          : "Watch the cross-hair, then throw."}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- the game

function Hud({
  score,
  left,
  extra,
}: {
  score: number;
  left?: number;
  extra: string;
}) {
  return (
    <div className="mw-hud">
      <span className="mw-score">{score} pts</span>
      {left !== undefined && (
        <span className="mw-time">{Math.ceil(left)} s</span>
      )}
      <span className="mw-hint">{extra}</span>
    </div>
  );
}

export function Midway({ onClose }: Props) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [booth, setBooth] = useState<BoothId>("whack");
  const [level, setLevel] = useState<Level>("easy");
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const best = useRef<Result | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase === "intro") startRef.current?.focus();
    if (phase === "done") againRef.current?.focus();
  }, [phase]);

  const finish = useMemo(
    () => (score: number) => {
      const r: Result = {
        score,
        booth,
        level,
        grade: grade(booth, level, score),
      };
      setResult(r);
      if (!best.current || payoutFor(r.grade) > payoutFor(best.current.grade))
        best.current = r;
      setPhase("done");
    },
    [booth, level],
  );

  const start = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    setPhase("play");
  };
  const info = BOOTHS.find((b) => b.id === booth) ?? BOOTHS[0];

  return (
    <Dialog
      title="The Midway"
      subtitle="Step right up: four games, one prize counter."
      className="mw"
      onClose={() => onClose(best.current)}
    >
      {phase === "intro" && (
        <section className="mw-intro">
          <div className="mw-pick" role="radiogroup" aria-label="Booth">
            {BOOTHS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={b.id === booth}
                className="mw-card"
                onClick={() => setBooth(b.id)}
              >
                <strong>{b.label}</strong>
                <span>{b.blurb}</span>
              </button>
            ))}
          </div>
          <div className="mw-levels" role="radiogroup" aria-label="Difficulty">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={l.id === level}
                onClick={() => setLevel(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            ref={startRef}
            type="button"
            className="mw-go"
            onClick={start}
          >
            Play {info.label}
          </button>
        </section>
      )}
      {phase === "play" &&
        (booth === "whack" ? (
          <Whack level={level} seed={seed} onFinish={finish} />
        ) : booth === "gallery" ? (
          <Gallery level={level} seed={seed} onFinish={finish} />
        ) : booth === "squirt" ? (
          <Squirt level={level} seed={seed} onFinish={finish} />
        ) : (
          <Rings level={level} seed={seed} onFinish={finish} />
        ))}
      {phase === "done" && result && (
        <section className="mw-result" aria-live="polite">
          <p className="mw-grade" data-grade={result.grade}>
            {result.grade}
          </p>
          <p>
            {result.score} points at {info.label.toLowerCase()} on{" "}
            {result.level}. The prize counter pays{" "}
            <strong>{payoutFor(result.grade)} coins</strong>.
          </p>
          <div className="mw-result-actions">
            <button
              ref={againRef}
              type="button"
              className="mw-go"
              onClick={start}
            >
              Play again
            </button>
            <button type="button" onClick={() => setPhase("intro")}>
              Pick another booth
            </button>
            <button type="button" onClick={() => onClose(best.current)}>
              Collect and leave
            </button>
          </div>
        </section>
      )}
    </Dialog>
  );
}
