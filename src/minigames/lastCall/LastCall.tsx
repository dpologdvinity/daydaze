import { useEffect, useRef, useState } from "react";
import { Dialog } from "../Dialog.tsx";
import { playBarSound, type BarSound } from "../../audio/barSynths.ts";
import {
  EMPTY_DRINK,
  GARNISHES,
  GLASSES,
  INGREDIENTS,
  MAX_POURS,
  ROUND_ORDERS,
  SWEET_SPOT,
  generateOrders,
  meterPosition,
  mixQualityAt,
  newRound,
  pour,
  roundResult,
  serve,
  streakOf,
  type Drink,
  type GarnishId,
  type GlassId,
  type Grade,
  type Guest,
  type IngredientId,
  type Method,
  type MixQuality,
  type Recipe,
  type Result,
  type Round,
  type Served,
} from "./engine.ts";
import "./LastCall.css";

declare module "react" {
  interface CSSProperties {
    "--needle"?: number;
    "--hue"?: number;
  }
}

const INGREDIENT = new Map(INGREDIENTS.map((i) => [i.id, i]));
// A stray double tap must not also press the button that replaces the one tapped.
const STEP_GUARD_MS = 300;

const GRADE_LINE: Record<Grade, string> = {
  S: "Best bartender in the building.",
  A: "The regulars will be back.",
  B: "A solid shift.",
  C: "A rough night. Go again.",
};

const METHOD_VERB: Record<Method, { act: string; stop: string; noun: string }> =
  {
    shake: { act: "Shake it", stop: "Stop shaking", noun: "shake" },
    stir: { act: "Stir it", stop: "Stop stirring", noun: "stir" },
  };

const SPEED_WORD = { quick: "Quick", steady: "Steady", slow: "Slow" } as const;

const QUALITY_WORD: Record<MixQuality, string> = {
  perfect: "Perfect",
  good: "Good",
  sloppy: "Sloppy",
};

type Phase = "intro" | "bar" | "done";
type Step = "build" | "mixing" | "mixed" | "tipped";

export type LastCallProps = {
  /** Called once: the best finished round of this visit, or null if none. */
  onClose: (result: Result | null) => void;
  reducedMotion?: boolean;
  muted?: boolean;
};

/** Recipe ingredients in recipe order, with how many measures of each. */
function measures(recipe: Recipe): [IngredientId, number][] {
  const counts = new Map<IngredientId, number>();
  for (const id of recipe.ingredients) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts];
}

function blend(colors: readonly string[]): string {
  const sum = [0, 0, 0];
  for (const color of colors) {
    for (let i = 0; i < 3; i++) {
      sum[i] += parseInt(color.slice(1 + 2 * i, 3 + 2 * i), 16);
    }
  }
  return `rgb(${sum.map((v) => Math.round(v / colors.length)).join(" ")})`;
}

/** Doll silhouette: oversized head, a hairstyle per look, glossy lips. */
function GuestDoll({ guest }: { guest: Guest }) {
  return (
    <svg
      className="mx-doll"
      viewBox="0 0 80 96"
      aria-hidden="true"
      style={{ "--hue": guest.hue }}
    >
      {guest.look === 2 && <circle cx="40" cy="34" r="30" />}
      {guest.look === 1 && (
        <path d="M14 40c0-20 12-30 26-30s26 10 26 30v40H14z" />
      )}
      {guest.look === 0 && <circle cx="40" cy="9" r="9" />}
      <path className="mx-doll-skin" d="M26 96c0-18 6-30 14-30s14 12 14 30z" />
      <path className="mx-doll-skin" d="M8 96c2-14 14-20 32-20s30 6 32 20z" />
      <ellipse className="mx-doll-skin" cx="40" cy="40" rx="20" ry="22" />
      <path d="M20 36c2-14 10-20 20-20s18 6 20 20c-8-6-24-8-40 0z" />
      <ellipse className="mx-doll-lips" cx="40" cy="53" rx="5" ry="2.6" />
    </svg>
  );
}

type GlassShape = {
  outline: string;
  clip: string;
  top: number;
  bottom: number;
  rim: [number, number];
  rimLeft: number;
};

const GLASS_SHAPE: Record<GlassId, GlassShape> = {
  rocks: {
    outline: "M48 118L56 228H144L152 118",
    clip: "M53 128L59 222H141L147 128z",
    top: 128,
    bottom: 222,
    rim: [152, 118],
    rimLeft: 48,
  },
  highball: {
    outline: "M64 40L70 228H130L136 40",
    clip: "M69 52L74 222H126L131 52z",
    top: 52,
    bottom: 222,
    rim: [136, 40],
    rimLeft: 64,
  },
  martini: {
    outline: "M28 60L100 150L172 60M100 150V226M68 228H132",
    clip: "M40 68L100 143L160 68z",
    top: 68,
    bottom: 143,
    rim: [172, 60],
    rimLeft: 28,
  },
  wine: {
    outline:
      "M56 48C52 118 68 150 100 152C132 150 148 118 144 48M100 152V226M68 228H132",
    clip: "M62 66C60 116 72 142 100 144C128 142 140 116 138 66z",
    top: 66,
    bottom: 144,
    rim: [144, 48],
    rimLeft: 56,
  },
};

function Garnish({ id, x, y }: { id: GarnishId; x: number; y: number }) {
  const at = `translate(${x} ${y})`;
  switch (id) {
    case "salt_rim":
      return null;
    case "lime_wheel":
    case "lemon_wheel":
      return (
        <g transform={at} className={`mx-g-${id}`}>
          <circle r="16" className="mx-g-peel" />
          <circle r="12.5" className="mx-g-flesh" />
          <path d="M0-12V12M-12 0H12M-8.5-8.5L8.5 8.5M8.5-8.5L-8.5 8.5" />
        </g>
      );
    case "mint_sprig":
      return (
        <g transform={at} className="mx-g-mint">
          <path d="M0 10V-14" />
          <ellipse rx="6" ry="11" transform="translate(-7 -8) rotate(-30)" />
          <ellipse rx="6" ry="11" transform="translate(7 -10) rotate(30)" />
          <ellipse rx="5" ry="9" transform="translate(0 -20)" />
        </g>
      );
    case "cherry":
      return (
        <g transform={at} className="mx-g-cherry">
          <path d="M0-10C2-20 8-24 14-26" />
          <circle r="10" />
          <path d="M-4-5C-6-1-6 2-4 4" className="mx-g-score" />
        </g>
      );
    case "passionfruit_half":
      return (
        <g transform={at} className="mx-g-passion">
          <circle r="15" />
          <circle r="11" className="mx-g-pulp" />
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <circle
              key={n}
              r="1.8"
              cx={Math.cos(n) * 6}
              cy={Math.sin(n * 1.7) * 6}
              className="mx-g-seed"
            />
          ))}
        </g>
      );
  }
}

function Glass({
  drink,
  mixed,
  mixing,
}: {
  drink: Drink;
  mixed: boolean;
  mixing: boolean;
}) {
  const shape = GLASS_SHAPE[drink.glass ?? "highball"];
  const clipId = `mx-clip-${drink.glass ?? "ghost"}`;
  const layer = (shape.bottom - shape.top) / MAX_POURS;
  const colors = drink.ingredients.map(
    (id) => INGREDIENT.get(id)?.color ?? "#ffffff",
  );
  const [rimX, rimY] = shape.rim;
  return (
    <svg
      className={`mx-glass ${mixing ? "mx-glass-mixing" : ""} ${drink.glass ? "" : "mx-glass-ghost"}`}
      viewBox="0 0 200 240"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mx-shine" x1="0" x2="1">
          <stop offset="0.18" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={shape.clip} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {mixed && colors.length > 0 ? (
          <rect
            className="mx-liquid"
            x="0"
            width="200"
            y={shape.bottom - layer * colors.length}
            height={layer * colors.length}
            fill={blend(colors)}
          />
        ) : (
          colors.map((color, i) => (
            <rect
              key={i}
              className="mx-layer"
              x="0"
              width="200"
              y={shape.bottom - layer * (i + 1)}
              height={layer + 0.5}
              fill={color}
            />
          ))
        )}
        <rect
          className="mx-shine"
          x="0"
          y="0"
          width="200"
          height="240"
          fill="url(#mx-shine)"
        />
      </g>
      <path className="mx-glass-outline" d={shape.outline} />
      {drink.garnish === "salt_rim" && (
        <path className="mx-g-salt" d={`M${shape.rimLeft} ${rimY}H${rimX}`} />
      )}
      {drink.garnish && (
        <Garnish id={drink.garnish} x={rimX - 4} y={rimY - 4} />
      )}
    </svg>
  );
}

/** The neon tube sign on the back bar, behind the glass. */
function NeonSign() {
  return (
    <svg className="mx-neon" viewBox="0 0 200 170" aria-hidden="true">
      <path
        className="mx-neon-glass"
        d="M40 34H160L100 104zM100 104V146M70 146H130"
      />
    </svg>
  );
}

function ReceiptLine({ label, amount }: { label: string; amount: number }) {
  return (
    <li className={amount > 0 ? "mx-earned" : "mx-lost"}>
      <span>{label}</span> <strong>+{amount}</strong>
    </li>
  );
}

function Receipt({
  served,
  guest,
  method,
}: {
  served: Served;
  guest: Guest;
  method: Method;
}) {
  const { tip, verdict } = served;
  return (
    <div className="mx-receipt" role="status">
      <p className="mx-receipt-head">
        {verdict.ingredients
          ? `${guest.name} tipped ${tip.total}`
          : `${guest.name} sent it back`}
      </p>
      {verdict.ingredients ? (
        <ul aria-label="Tip breakdown">
          <ReceiptLine label="Pour" amount={tip.pour} />
          <ReceiptLine label="Glass" amount={tip.glass} />
          <ReceiptLine label="Garnish" amount={tip.garnish} />
          <ReceiptLine
            label={`${QUALITY_WORD[verdict.mix]} ${METHOD_VERB[method].noun}`}
            amount={tip.mix}
          />
          <ReceiptLine
            label={`${SPEED_WORD[verdict.speed]} serve`}
            amount={tip.speed}
          />
          {tip.streak > 0 && <ReceiptLine label="Streak" amount={tip.streak} />}
        </ul>
      ) : (
        <p className="mx-hint">That is not what they ordered. No tip.</p>
      )}
    </div>
  );
}

export function LastCall({
  onClose,
  reducedMotion = false,
  muted = false,
}: LastCallProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<Round>(() => newRound([]));
  const [drink, setDrink] = useState<Drink>(EMPTY_DRINK);
  const [step, setStep] = useState<Step>("build");
  const [mix, setMix] = useState<MixQuality>("sloppy");
  const [needle, setNeedle] = useState(0);
  const [last, setLast] = useState<Result | null>(null);
  const [announce, setAnnounce] = useState("");

  const roundRef = useRef(round);
  const stepRef = useRef<Step>("build");
  const orderStartedAt = useRef(0);
  const meterStartedAt = useRef(0);
  const stepAt = useRef(0);
  const best = useRef<Result | null>(null);
  const closed = useRef(false);
  const startRef = useRef<HTMLButtonElement>(null);
  const firstPourRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLElement>(null);

  const index = round.served.length;
  // While the receipt shows, the guest just served stays at the bar.
  const current = step === "tipped" ? index - 1 : index;
  const order = round.orders[current];
  const lastServed = round.served[round.served.length - 1];

  const sound = (name: BarSound) => {
    // Sound is optional: playBarSound never throws when audio is unavailable.
    if (!muted) playBarSound(name);
  };

  const goTo = (next: Step) => {
    stepRef.current = next;
    stepAt.current = performance.now();
    setStep(next);
  };

  useEffect(() => {
    if (phase === "intro") startRef.current?.focus();
    else if (phase === "done") replayRef.current?.focus();
    else {
      // On a phone the ticket and glass sit above the station: bring them back.
      barRef.current?.scrollTo({ top: 0 });
      const target = step === "build" ? firstPourRef : actionRef;
      target.current?.focus({ preventScroll: true });
    }
  }, [phase, step, current]);

  useEffect(() => {
    if (step !== "mixing") return;
    let frame = 0;
    const tick = () => {
      setNeedle(meterPosition(performance.now() - meterStartedAt.current));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const start = () => {
    const fresh = newRound(generateOrders(ROUND_ORDERS, Math.random));
    roundRef.current = fresh;
    setRound(fresh);
    setDrink(EMPTY_DRINK);
    setLast(null);
    setAnnounce("");
    orderStartedAt.current = performance.now();
    goTo("build");
    setPhase("bar");
  };

  const addPour = (id: IngredientId) => {
    if (stepRef.current !== "build") return;
    if (drink.ingredients.length >= MAX_POURS) {
      setAnnounce("The glass is full.");
      return;
    }
    sound("pour");
    const next = pour(drink, id);
    setDrink(next);
    setAnnounce(
      `${INGREDIENT.get(id)?.label} poured. ${next.ingredients.length} of ${MAX_POURS} measures.`,
    );
  };

  const startMix = () => {
    if (stepRef.current !== "build" || drink.ingredients.length === 0) return;
    sound("shake");
    meterStartedAt.current = performance.now();
    setNeedle(0);
    goTo("mixing");
  };

  const stopMix = () => {
    if (stepRef.current !== "mixing") return;
    const position = meterPosition(performance.now() - meterStartedAt.current);
    setNeedle(position);
    setMix(mixQualityAt(position));
    goTo("mixed");
  };

  const serveDrink = () => {
    if (stepRef.current !== "mixed") return;
    const now = performance.now();
    if (now - stepAt.current < STEP_GUARD_MS) return;
    const next = serve(
      roundRef.current,
      roundRef.current.served.length,
      drink,
      mix,
      now - orderStartedAt.current,
    );
    if (next === roundRef.current) return;
    roundRef.current = next;
    setRound(next);
    sound("ding");
    goTo("tipped");
  };

  const nextGuest = () => {
    if (stepRef.current !== "tipped") return;
    if (performance.now() - stepAt.current < STEP_GUARD_MS) return;
    const result = roundResult(roundRef.current);
    if (result) {
      if (!best.current || result.tips > best.current.tips) {
        best.current = result;
      }
      setLast(result);
      setPhase("done");
      return;
    }
    setDrink(EMPTY_DRINK);
    setAnnounce("");
    orderStartedAt.current = performance.now();
    goTo("build");
  };

  const close = () => {
    if (closed.current) return;
    closed.current = true;
    stepRef.current = "build";
    onClose(best.current);
  };

  const tips = round.served.reduce((sum, s) => sum + s.tip.total, 0);
  const streak = streakOf(round);
  const verb = order ? METHOD_VERB[order.recipe.method] : METHOD_VERB.shake;
  const building = step === "build";

  return (
    <Dialog
      title="Last Call"
      subtitle="Behind the bar"
      onClose={close}
      className={`mx ${reducedMotion ? "mx-calm" : ""}`}
    >
      {phase === "intro" && (
        <section className="mx-intro">
          <div className="mx-intro-art">
            <NeonSign />
            <svg
              className="mx-intro-glass"
              viewBox="0 0 200 240"
              aria-hidden="true"
            >
              <path
                className="mx-glass-outline"
                d={GLASS_SHAPE.martini.outline}
              />
              <path className="mx-intro-fill" d={GLASS_SHAPE.martini.clip} />
              <Garnish id="cherry" x={168} y={56} />
            </svg>
          </div>
          <p className="mx-lede">
            Five guests are waiting at the bar. Read each ticket, build the
            drink, and nail the mix.
          </p>
          <p className="mx-hint">
            The right glass and garnish, a clean mix and a quick serve all add
            to the tip. Perfect drinks in a row earn a streak bonus.
          </p>
          <button
            ref={startRef}
            type="button"
            className="mx-button mx-button-hot"
            onClick={start}
          >
            Take the first order
          </button>
        </section>
      )}

      {phase === "bar" && order && (
        <section className="mx-bar" ref={barRef}>
          <div className="mx-book-row">
            <ol className="mx-book" aria-label="Order book">
              {round.orders.map((o, i) => {
                const done = round.served[i];
                const state = done
                  ? done.verdict.ingredients
                    ? `+${done.tip.total}`
                    : "Sent back"
                  : i === current
                    ? "Up now"
                    : "Waiting";
                return (
                  <li
                    key={o.id}
                    className={`mx-slip ${i === current ? "mx-slip-now" : ""} ${done ? "mx-slip-done" : ""}`}
                    aria-current={i === current ? "true" : undefined}
                  >
                    <span className="mx-slip-guest">{o.guest.name}</span>
                    <span className="mx-slip-drink">{o.recipe.name}</span>
                    <span className="mx-slip-state">{state}</span>
                  </li>
                );
              })}
            </ol>
            <dl className="mx-tally">
              <div>
                <dt>Tips</dt>
                <dd>{tips}</dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd>{streak}</dd>
              </div>
            </dl>
          </div>

          <article className="mx-ticket" aria-labelledby="mx-order-name">
            <GuestDoll guest={order.guest} />
            <p className="mx-ticket-guest">{order.guest.name} would like</p>
            <h3 id="mx-order-name">{order.recipe.name}</h3>
            <ul className="mx-recipe" aria-label="Recipe card">
              {measures(order.recipe).map(([id, count]) => (
                <li key={id}>
                  <span>{INGREDIENT.get(id)?.label}</span>
                  {count > 1 && <span> × {count}</span>}
                </li>
              ))}
            </ul>
            <dl className="mx-specs">
              <div>
                <dt>Glass</dt>
                <dd>
                  {GLASSES.find((g) => g.id === order.recipe.glass)?.label}
                </dd>
              </div>
              <div>
                <dt>Garnish</dt>
                <dd>
                  {GARNISHES.find((g) => g.id === order.recipe.garnish)?.label}
                </dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{order.recipe.method === "shake" ? "Shake" : "Stir"}</dd>
              </div>
            </dl>
          </article>

          <div className="mx-stage">
            <NeonSign />
            <Glass
              drink={drink}
              mixed={step === "mixed" || step === "tipped"}
              mixing={step === "mixing"}
            />
            {(step === "build" || step === "mixing") && (
              <p className="mx-measures" aria-hidden="true">
                {drink.glass ? "" : "No glass yet. "}
                {drink.ingredients.length} of {MAX_POURS} measures
              </p>
            )}
          </div>

          <div className="mx-station">
            <fieldset disabled={!building}>
              <legend>Pour</legend>
              <div className="mx-pours">
                {INGREDIENTS.map((ingredient, i) => {
                  const count = drink.ingredients.filter(
                    (id) => id === ingredient.id,
                  ).length;
                  return (
                    <button
                      key={ingredient.id}
                      ref={i === 0 ? firstPourRef : undefined}
                      type="button"
                      className="mx-chip mx-pour"
                      onClick={() => addPour(ingredient.id)}
                    >
                      <span
                        className="mx-drop"
                        style={{ background: ingredient.color }}
                        aria-hidden="true"
                      />
                      {ingredient.label}
                      {count > 0 && (
                        <span className="mx-count" aria-hidden="true">
                          ×{count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset disabled={!building}>
              <legend>Glass</legend>
              <div className="mx-glasses">
                {GLASSES.map((glass) => (
                  <button
                    key={glass.id}
                    type="button"
                    className="mx-chip mx-pick"
                    aria-pressed={drink.glass === glass.id}
                    onClick={() => setDrink({ ...drink, glass: glass.id })}
                  >
                    <svg viewBox="0 0 200 240" aria-hidden="true">
                      <path
                        className="mx-glass-outline"
                        d={GLASS_SHAPE[glass.id].outline}
                      />
                    </svg>
                    {glass.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset disabled={!building}>
              <legend>Garnish</legend>
              <div className="mx-garnishes">
                {GARNISHES.map((garnish) => (
                  <button
                    key={garnish.id}
                    type="button"
                    className="mx-chip mx-pick"
                    aria-pressed={drink.garnish === garnish.id}
                    onClick={() => setDrink({ ...drink, garnish: garnish.id })}
                  >
                    <svg viewBox="-24 -32 48 48" aria-hidden="true">
                      {garnish.id === "salt_rim" ? (
                        <path className="mx-g-salt" d="M-20 0H20" />
                      ) : (
                        <Garnish id={garnish.id} x={0} y={-6} />
                      )}
                    </svg>
                    {garnish.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mx-action">
            {step === "build" && (
              <>
                <button
                  type="button"
                  className="mx-button"
                  disabled={drink === EMPTY_DRINK}
                  onClick={() => {
                    setDrink(EMPTY_DRINK);
                    setAnnounce("Glass emptied.");
                  }}
                >
                  Start over
                </button>
                <button
                  ref={actionRef}
                  type="button"
                  className="mx-button mx-button-hot"
                  disabled={drink.ingredients.length === 0}
                  onClick={startMix}
                >
                  {verb.act}
                </button>
              </>
            )}
            {step === "mixing" && (
              <>
                <div
                  className="mx-meter"
                  role="meter"
                  aria-label={`${verb.noun} timing`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(needle * 100)}
                  style={{ "--needle": needle }}
                >
                  <span
                    className="mx-meter-good"
                    style={{
                      left: `${(0.5 - SWEET_SPOT.good) * 100}%`,
                      right: `${(0.5 - SWEET_SPOT.good) * 100}%`,
                    }}
                  />
                  <span
                    className="mx-meter-perfect"
                    style={{
                      left: `${(0.5 - SWEET_SPOT.perfect) * 100}%`,
                      right: `${(0.5 - SWEET_SPOT.perfect) * 100}%`,
                    }}
                  />
                  <span className="mx-needle" />
                </div>
                <button
                  ref={actionRef}
                  type="button"
                  className="mx-button mx-button-hot"
                  onPointerDown={stopMix}
                  // Keyboard activation (Enter/Space) arrives as a click with detail 0.
                  onClick={(event) => {
                    if (event.detail === 0) stopMix();
                  }}
                >
                  {verb.stop}
                </button>
              </>
            )}
            {step === "mixed" && (
              <>
                <p className={`mx-quality mx-quality-${mix}`} role="status">
                  {QUALITY_WORD[mix]} {verb.noun}
                </p>
                <button
                  ref={actionRef}
                  type="button"
                  className="mx-button mx-button-hot"
                  onClick={serveDrink}
                >
                  Serve {order.guest.name}
                </button>
              </>
            )}
            {step === "tipped" && lastServed && (
              <>
                <Receipt
                  served={lastServed}
                  guest={order.guest}
                  method={order.recipe.method}
                />
                <button
                  ref={actionRef}
                  type="button"
                  className="mx-button mx-button-hot"
                  onClick={nextGuest}
                >
                  {index >= round.orders.length
                    ? "Close out the round"
                    : "Next guest"}
                </button>
              </>
            )}
          </div>
          <p className="mx-sr-only" aria-live="polite">
            {announce}
          </p>
        </section>
      )}

      {phase === "done" && last && (
        <section className="mx-result">
          <p className="mx-grade">
            <span className="mx-sr-only">Grade </span>
            {last.grade}
          </p>
          <h3>{GRADE_LINE[last.grade]}</h3>
          <dl className="mx-stats">
            <div>
              <dt>Tips</dt>
              <dd>{last.tips}</dd>
            </div>
            <div>
              <dt>Served</dt>
              <dd>
                {last.served} of {ROUND_ORDERS}
              </dd>
            </div>
            <div>
              <dt>Perfect</dt>
              <dd>{last.perfect}</dd>
            </div>
          </dl>
          {best.current && best.current !== last && (
            <p className="mx-hint">
              Your best round this visit made {best.current.tips} in tips. That
              one counts when you leave.
            </p>
          )}
          <div className="mx-actions">
            <button
              ref={replayRef}
              type="button"
              className="mx-button"
              onClick={start}
            >
              Work another round
            </button>
            <button
              type="button"
              className="mx-button mx-button-hot"
              onClick={close}
            >
              Close up
            </button>
          </div>
        </section>
      )}
    </Dialog>
  );
}
