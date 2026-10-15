import type { ReactNode } from "react";

// Inline SVG icons in the same thin, rounded line style. They are decoration:
// the words beside them name the control.

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A hand mirror with a sparkle: the dressing room. */
export function MirrorIcon() {
  return (
    <Icon>
      <ellipse cx="11" cy="9" rx="6.5" ry="7.5" />
      <path d="M11 16.5v4.5M8 21h6" />
      <path d="M19.5 3v3M18 4.5h3" />
    </Icon>
  );
}

/** A martini glass with an olive: the drink. */
export function CocktailIcon() {
  return (
    <Icon>
      <path d="M4 4h16l-8 9z" />
      <path d="M12 13v7M8 20h8" />
      <circle cx="15" cy="7" r="1.4" />
    </Icon>
  );
}

/** A ferris-wheel gondola ring: the rides. */
export function RideIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17" />
      <circle cx="12" cy="12" r="1.6" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}
