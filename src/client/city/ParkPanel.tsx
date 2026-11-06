// The park's two new places in the overlay: at an open farmers market stall,
// the vendor's greeting (src/game/dialogue/produce-vendor.ts), a Chat button
// and, where the stall sells a crop, a Buy button that takes coins and adds a
// bunch to the farm's groceries; and in the dog yard, the button that lets
// your pet off the leash (or leashes it up). The scene writes `parkDesk`.

import { useEffect, useRef, useState, type JSX } from "react";
import { CROPS } from "../../game/farm.ts";
import {
  STALLS,
  buyProduce,
  marketPrice,
} from "../../game/city/farmersMarket.ts";
import { pickLine, type RecentLines } from "../../game/dialogue/pick.ts";
import type { DialogueSituation } from "../../game/dialogue/types.ts";
import { farmDesk } from "../rooms/farm/farmSession.ts";
import { cityHour } from "./daylight.ts";
import { parkDesk } from "./parkDesk.ts";

/** Stalls visited this session: the second visit is a regular's. */
const visited = new Set<string>();

/** A line to chat about: the weather, the produce or the time of day. */
function chatSituation(): DialogueSituation {
  const options: DialogueSituation[] = ["tapped", "idle", "weather"];
  const hour = cityHour();
  options.push(hour < 12 ? "morning" : "afternoon");
  return options[Math.floor(Math.random() * options.length)];
}

export function ParkPanel(): JSX.Element | null {
  const desk = parkDesk.use();
  const { farm, coins } = farmDesk.use();
  const stall = STALLS.find((s) => s.id === desk.stall) ?? null;
  const [line, setLine] = useState("");
  const recent = useRef<RecentLines>([]);
  const say = (situation: DialogueSituation) => {
    const picked = pickLine({
      role: "produce-vendor",
      situation,
      context: { neighborhood: "uptown", venue: "farmers-market" },
      rng: Math.random,
      recent: recent.current,
    });
    recent.current = picked.recent;
    setLine(picked.text);
  };
  const stallId = stall?.id ?? null;
  useEffect(() => {
    if (!stallId) {
      setLine("");
      return;
    }
    say(visited.has(stallId) ? "greeting-regular" : "greeting-first");
    visited.add(stallId);
    // greet once per stall in reach
  }, [stallId]);

  const crop = stall?.sells ?? null;
  const price = crop ? marketPrice(crop) : 0;
  const buy = () => {
    if (!crop) return;
    const res = buyProduce(farm, coins, crop);
    if (!res) return;
    const next = { farm: res.farm, coins: res.coins };
    // show it at once; the app's save follows (the same path as the farm panel)
    farmDesk.set(next);
    farmDesk.get().commit?.(next);
    say("action-ordering");
  };
  return (
    <>
      {stall && (
        <section
          className="park-panel"
          aria-label={`${stall.name}, a farmers market stall`}
        >
          <h3>{stall.name}</h3>
          <p className="park-line">
            <strong>{stall.vendor.name}:</strong> {line}
          </p>
          <div className="park-actions">
            <button type="button" onClick={() => say(chatSituation())}>
              Chat
            </button>
            {crop && (
              <button type="button" disabled={coins < price} onClick={buy}>
                Buy {CROPS[crop].name.toLowerCase()}: {price} coins
              </button>
            )}
          </div>
          {crop && (
            <p className="park-note">
              In your groceries: {farm.groceries[crop] || 0}
              {coins < price && " (not enough coins)"}
            </p>
          )}
        </section>
      )}
      {desk.inYard && desk.petName && (
        <section className="park-panel park-leash" aria-label="Dog park">
          <button
            type="button"
            onClick={() => parkDesk.set({ offLeash: !desk.offLeash })}
          >
            {desk.offLeash
              ? `Leash ${desk.petName} up`
              : `Let ${desk.petName} off the leash`}
          </button>
        </section>
      )}
    </>
  );
}
