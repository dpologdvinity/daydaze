import type { CSSProperties } from "react";

declare module "react" {
  interface CSSProperties {
    /** Swatch colour read by `.gem` in styles.css. */
    "--c"?: string;
  }
}

type Option<T extends string> = { readonly id: T; readonly label: string };

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
        const style: CSSProperties = { "--c": o.id };
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

/** A labelled -1..1 slider in steps of 0.1. */
export function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input
        type="range"
        min={-1}
        max={1}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    </label>
  );
}
