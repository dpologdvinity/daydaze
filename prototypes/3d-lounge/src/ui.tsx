import { useState, type CSSProperties } from "react";
import {
  BROWS,
  HAIR_COLORS,
  HAIR_STYLES,
  LIPS,
  OUTFIT_COLORS,
  OUTFITS,
  SKINS,
  type Look,
  type Mood,
} from "./looks";

export type View = "room" | "full" | "face";

const SHADOWS = [
  { id: "#d23cff", label: "Orchid" },
  { id: "#ff2f9a", label: "Fuchsia" },
  { id: "#ffb02e", label: "Mango" },
  { id: "#3fe0d0", label: "Lagoon" },
  { id: "#8a5a3c", label: "Bronze" },
] as const;

type Opt = { id: string; label: string };

function Swatches({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly Opt[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="row" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          aria-label={o.label}
          title={o.label}
          className="gem"
          style={{ "--c": o.id } as CSSProperties}
          onClick={() => onPick(o.id)}
        />
      ))}
    </div>
  );
}

function Chips({
  label,
  options,
  value,
  onPick,
  thumbs,
}: {
  label: string;
  options: readonly Opt[];
  value: string;
  onPick: (id: string) => void;
  thumbs?: boolean;
}) {
  return (
    <div className="row" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={thumbs ? "chip thumb" : "chip"}
          onClick={() => onPick(o.id)}
          title={o.label}
        >
          {thumbs ? <img src={`/spike/${o.id}.png`} alt={o.label} /> : o.label}
        </button>
      ))}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onPick,
  className,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
  className: string;
}) {
  return (
    <div className={`seg ${className}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onPick(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Overlay({
  look,
  setLook,
  mood,
  setMood,
  view,
  setView,
}: {
  look: Look;
  setLook: (l: Look) => void;
  mood: Mood;
  setMood: (m: Mood) => void;
  view: View;
  setView: (v: View) => void;
}) {
  const [open, setOpen] = useState(
    () => !window.matchMedia("(max-width: 720px)").matches,
  );
  const set =
    <K extends keyof Look>(k: K) =>
    (v: string) =>
      setLook({ ...look, [k]: v });
  return (
    <>
      <header className="venue">
        <p className="venue-name">The Mango Room</p>
        <p className="venue-sub">Daydaze VIP lounge. Tap the floor to walk.</p>
      </header>

      <button
        type="button"
        className="mirror-toggle"
        aria-expanded={open}
        aria-controls="mirror"
        onClick={() => setOpen(!open)}
      >
        {open ? "Close mirror" : "Dressing room"}
      </button>

      <aside id="mirror" className="mirror" data-open={open}>
        <div className="mirror-glass">
          <h1 className="mirror-title">Get the look</h1>
          <section>
            <h2>Skin</h2>
            <Swatches
              label="Skin tone"
              options={SKINS}
              value={look.skin}
              onPick={set("skin")}
            />
          </section>
          <section>
            <h2>Hair</h2>
            <Chips
              label="Hair style"
              options={HAIR_STYLES}
              value={look.hairStyle}
              onPick={set("hairStyle")}
            />
            <Swatches
              label="Hair colour"
              options={HAIR_COLORS}
              value={look.hairColor}
              onPick={set("hairColor")}
            />
          </section>
          <section>
            <h2>Lips</h2>
            <Chips
              label="Lips"
              options={LIPS}
              value={look.lips}
              onPick={set("lips")}
              thumbs
            />
          </section>
          <section>
            <h2>Brows and lids</h2>
            <Chips
              label="Brows"
              options={BROWS}
              value={look.brows}
              onPick={set("brows")}
              thumbs
            />
            <Swatches
              label="Eyeshadow"
              options={SHADOWS}
              value={look.shadow}
              onPick={set("shadow")}
            />
          </section>
          <section>
            <h2>Outfit</h2>
            <Chips
              label="Outfit"
              options={OUTFITS}
              value={look.outfit}
              onPick={set("outfit")}
            />
            <Swatches
              label="Outfit colour"
              options={OUTFIT_COLORS}
              value={look.outfitColor}
              onPick={set("outfitColor")}
            />
          </section>
        </div>
      </aside>

      <Segmented
        className="moods"
        label="Mood"
        value={mood}
        onPick={setMood}
        options={[
          { id: "idle", label: "Idle" },
          { id: "pose", label: "Pose" },
          { id: "dance", label: "Dance" },
        ]}
      />
      <Segmented
        className="views"
        label="Camera"
        value={view}
        onPick={setView}
        options={[
          { id: "room", label: "Room" },
          { id: "full", label: "Full look" },
          { id: "face", label: "Face" },
        ]}
      />
    </>
  );
}
