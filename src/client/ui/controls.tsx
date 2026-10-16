import { useId, type CSSProperties } from "react";

declare module "react" {
  interface CSSProperties {
    /** Swatch colour read by `.gem` in styles.css. */
    "--c"?: string;
  }
}

type Option<T extends string> = {
  readonly id: T;
  readonly label: string;
  /** The colour a swatch shows when the id itself is not a colour. */
  readonly swatch?: string;
};

type PickerProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onPick: (id: T) => void;
};

/** Round colour gems; the option label is the accessible name. */
export function Swatches<T extends string>({
  label,
  options,
  value,
  onPick,
}: PickerProps<T>) {
  return (
    <div className="row" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const style: CSSProperties = { "--c": o.swatch ?? o.id };
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === value}
            aria-label={o.label}
            title={o.label}
            className="gem"
            style={style}
            onClick={() => onPick(o.id)}
          />
        );
      })}
    </div>
  );
}

/**
 * Option buttons. `tiles` shows each option as a picture card from
 * `/closet/<tiles>-<id>.png` with its name under it; options without a
 * picture fall back to a lettered card.
 */
export function Tiles<T extends string>({
  label,
  options,
  value,
  onPick,
  tiles,
}: PickerProps<T> & { tiles: string }) {
  return (
    <div className="tiles" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className="tile"
          onClick={() => onPick(o.id)}
        >
          <img
            src={`/closet/${tiles}-${o.id}.png`}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Pill buttons, or image tiles from `public/doll/` when `thumbs` is set. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onPick,
  thumbs = false,
}: PickerProps<T> & { thumbs?: boolean }) {
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
          {thumbs ? <img src={`/doll/${o.id}.png`} alt={o.label} /> : o.label}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onPick,
  className,
}: PickerProps<T> & { className: string }) {
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

/** A labelled closet slider: whole 0 to 100 by default (body shape); the
 * face sliders pass -1 to 1 in steps of 0.1. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <div className="slider">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
