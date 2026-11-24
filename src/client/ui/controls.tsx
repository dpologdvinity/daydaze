// Shared closet picker controls: color swatches, picture tiles, chips,
// segmented buttons and sliders. Every picker is a radiogroup of buttons with
// the option label as its accessible name. Also augments React's CSSProperties
// with the `--c` swatch variable.

import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { isColor } from "../../game/look.ts";

declare module "react" {
  interface CSSProperties {
    /** Swatch color read by `.gem` in styles.css. */
    "--c"?: string;
  }
}

export type Option<T extends string> = {
  readonly id: T;
  readonly label: string;
  /** The color a swatch shows when the id itself is not a color. */
  readonly swatch?: string | undefined;
  /** An item not owned yet in the player's wardrobe. */
  readonly unowned?: boolean | undefined;
  /** The item's price in coins when sold in a shop. */
  readonly price?: number | null | undefined;
  /** The store name where this item is sold. */
  readonly store?: string | undefined;
  /** Opens the shop counter when the unowned item is clicked. */
  readonly onShop?: (() => void) | undefined;
};

type PickerProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onPick: (id: T) => void;
};

/** Moves focus and selection between buttons in a radiogroup with arrow keys. */
export function onRadioKeyDown<T extends string>(
  e: KeyboardEvent<HTMLButtonElement>,
  options: readonly { id: T; unowned?: boolean | undefined }[],
  currentIndex: number,
  onPick: (id: T) => void,
) {
  const selectable = options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !o.unowned);
  if (selectable.length === 0) return;
  const currentSelectableIdx = selectable.findIndex(
    ({ i }) => i === currentIndex,
  );
  let nextSelectableIdx = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    nextSelectableIdx = (currentSelectableIdx + 1) % selectable.length;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    nextSelectableIdx =
      (currentSelectableIdx - 1 + selectable.length) % selectable.length;
  }
  if (nextSelectableIdx >= 0) {
    e.preventDefault();
    onPick(selectable[nextSelectableIdx].o.id);
    const parent = e.currentTarget.parentElement;
    const buttons = parent?.querySelectorAll<HTMLButtonElement>(
      'button[role="radio"]',
    );
    buttons?.[nextSelectableIdx]?.focus();
  }
}

/** Round color gems; the option label is the accessible name. */
export function Swatches<T extends string>({
  label,
  options,
  value,
  onPick,
}: PickerProps<T>) {
  const selectedIndex = options.findIndex((o) => o.id === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  return (
    <div className="row" role="radiogroup" aria-label={label}>
      {options.map((o, idx) => {
        const style: CSSProperties = { "--c": o.swatch ?? o.id };
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            tabIndex={idx === activeIndex ? 0 : -1}
            aria-checked={o.id === value}
            aria-label={o.label}
            title={o.label}
            className="gem"
            style={style}
            onClick={() => onPick(o.id)}
            onKeyDown={(e) => onRadioKeyDown(e, options, idx, onPick)}
          />
        );
      })}
    </div>
  );
}

/** Full RGB selection alongside convenient presets; skin uses Swatches. */
export function ColorPicker({
  label,
  options,
  value,
  onPick,
}: PickerProps<string>) {
  const [draft, setDraft] = useState<string | null>(null);
  const selected = options.find((o) => o.id === value);
  const color = isColor(value) ? value : selected?.swatch;
  return (
    <div className="color-picker">
      <Swatches
        label={label}
        options={options}
        value={value}
        onPick={(id) => {
          setDraft(null);
          onPick(id);
        }}
      />
      <div className="custom-color">
        <label>
          Any color
          <input
            type="color"
            aria-label={`Custom ${label.toLowerCase()}`}
            value={color && isColor(color) ? color : "#e890a0"}
            onChange={(e) => {
              setDraft(null);
              onPick(e.target.value);
            }}
          />
        </label>
        <label>
          Hex
          <input
            type="text"
            aria-label={`${label} hex`}
            value={draft ?? (color && isColor(color) ? color : "")}
            maxLength={7}
            placeholder="#RRGGBB"
            spellCheck={false}
            aria-invalid={draft !== null && !isColor(draft)}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              if (isColor(next)) onPick(next);
            }}
            onBlur={() => setDraft(null)}
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Option buttons. `tiles` shows each option as a picture card from
 * `/closet/<tiles>-<id>.webp` with its name under it; options without a
 * picture fall back to a lettered card.
 */
export function Tiles<T extends string>({
  label,
  options,
  value,
  onPick,
  tiles,
}: PickerProps<T> & { tiles: string }) {
  const selectedIndex = options.findIndex((o) => o.id === value && !o.unowned);
  const firstOwnedIndex = options.findIndex((o) => !o.unowned);
  const activeIndex =
    selectedIndex >= 0
      ? selectedIndex
      : firstOwnedIndex >= 0
        ? firstOwnedIndex
        : 0;
  return (
    <div
      className="tiles"
      data-tiles={tiles}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o, idx) => {
        if (o.unowned) {
          const price = o.price;
          const priceTag =
            price !== null && price !== undefined
              ? `${price} ${price === 1 ? "coin" : "coins"}`
              : "free";
          const store = o.store ?? "Shop";
          return (
            <button
              key={o.id}
              type="button"
              className="tile unowned dimmed"
              onClick={() => {
                o.onShop?.();
              }}
              aria-label={`${o.label}, ${priceTag} at ${store}`}
              title={`${o.label} · ${priceTag} · Open ${store}`}
            >
              <img
                src={`/closet/${tiles}-${o.id}.webp`}
                alt=""
                loading={idx < 6 ? undefined : "lazy"}
                decoding="async"
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
              <span>{o.label}</span>
              <span className="tile-buy">
                {price !== null && price !== undefined && (
                  <span className="tile-price chip-price">{priceTag}</span>
                )}
                <span className="tile-shop chip-shop">Shop</span>
              </span>
            </button>
          );
        }
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            tabIndex={idx === activeIndex ? 0 : -1}
            aria-checked={o.id === value}
            className="tile"
            onClick={() => onPick(o.id)}
            onKeyDown={(e) => onRadioKeyDown(e, options, idx, onPick)}
          >
            <img
              src={`/closet/${tiles}-${o.id}.webp`}
              alt=""
              loading={idx < 6 ? undefined : "lazy"}
              decoding="async"
              onError={(e) => {
                e.currentTarget.hidden = true;
              }}
            />
            <span>{o.label}</span>
          </button>
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
  const selectedIndex = options.findIndex((o) => o.id === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  return (
    <div className="row" role="radiogroup" aria-label={label}>
      {options.map((o, idx) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          tabIndex={idx === activeIndex ? 0 : -1}
          aria-checked={o.id === value}
          className={thumbs ? "chip thumb" : "chip"}
          onClick={() => onPick(o.id)}
          onKeyDown={(e) => onRadioKeyDown(e, options, idx, onPick)}
          title={o.label}
        >
          {thumbs ? <img src={`/doll/${o.id}.png`} alt={o.label} /> : o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A row of text buttons, one per option, for small exclusive choices (mood,
 * camera view, strengths). `className` picks the row's styling.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onPick,
  className,
}: PickerProps<T> & { className: string }) {
  const selectedIndex = options.findIndex((o) => o.id === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  return (
    <div className={`seg ${className}`} role="radiogroup" aria-label={label}>
      {options.map((o, idx) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          tabIndex={idx === activeIndex ? 0 : -1}
          aria-checked={o.id === value}
          onClick={() => onPick(o.id)}
          onKeyDown={(e) => onRadioKeyDown(e, options, idx, onPick)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A labeled closet slider: whole 0 to 100 by default (body shape); the
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
