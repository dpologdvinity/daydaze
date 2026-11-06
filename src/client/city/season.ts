// The player's local date, with an optional preview date, refreshed while playing.
import { useEffect, useState } from "react";
import {
  dressings,
  parseDateFlag,
  type Dressing,
} from "../../game/city/season.ts";

export function useDressings(): Dressing[] {
  const [date, setDate] = useState(
    () => parseDateFlag(location.search) ?? new Date(),
  );
  useEffect(() => {
    if (parseDateFlag(location.search)) return;
    const id = window.setInterval(() => setDate(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return dressings(date);
}
