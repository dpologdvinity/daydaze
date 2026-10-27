// Reactive state and action handlers for the Sunny Acres Farm loop. The farm
// and the coins live in the app's save: App mirrors them into farmDesk and
// installs `commit`, which writes a new pair back into the save (the panel
// never touches storage itself, so nothing here can fight the app's own saves).

import { useEffect, useState } from "react";
import {
  createDefaultFarm,
  fastForwardFarm,
  feedAnimal,
  harvestPlot,
  plantSeed,
  sellProduce,
  waterPlot,
  type CropId,
  type FarmSave,
} from "../../../game/farm.ts";
import { earn, spend } from "../../../game/wallet.ts";
import { createStore } from "../shared/store.ts";

type FarmCoins = { farm: FarmSave; coins: number };

/** The saved farm and coins, and the way to change them. */
export const farmDesk = createStore({
  farm: createDefaultFarm(),
  coins: 0,
  commit: null as ((next: FarmCoins) => void) | null,
});

/** Hook providing the latest FarmSave, coin balance, and mutating farm actions. */
export function useFarmState() {
  const desk = farmDesk.use();
  // a tick every second keeps growth timers lively
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { farm, coins } = desk;
  const commit = (next: FarmCoins) => {
    // show it at once; the app's save follows
    farmDesk.set(next);
    desk.commit?.(next);
  };

  const plant = (plotIndex: number, crop: CropId): boolean => {
    const res = plantSeed(farm, plotIndex, crop, Date.now());
    if (!res) return false;
    const nextCoins = spend(coins, res.cost);
    if (nextCoins === null) return false; // not enough coins
    commit({ coins: nextCoins, farm: res.farm });
    return true;
  };

  const water = (plotIndex: number): boolean => {
    const nextFarm = waterPlot(farm, plotIndex, Date.now());
    if (!nextFarm) return false;
    commit({ coins, farm: nextFarm });
    return true;
  };

  const harvest = (
    plotIndex: number,
  ): { crop: CropId; yieldCount: number } | null => {
    const res = harvestPlot(farm, plotIndex, Date.now());
    if (!res) return null;
    commit({ coins, farm: res.farm });
    return { crop: res.crop, yieldCount: res.yieldCount };
  };

  const sell = (crop: CropId, count: number): number | null => {
    const res = sellProduce(farm, crop, count);
    if (!res) return null;
    commit({ coins: earn(coins, res.coinsEarned), farm: res.farm });
    return res.coinsEarned;
  };

  const feed = (animalId: string): boolean => {
    const res = feedAnimal(farm, animalId, Date.now());
    commit({ coins, farm: res.farm });
    return res.heart;
  };

  /** Debug only: fast-forward every plot. */
  const skipTime = (seconds: number) =>
    commit({ coins, farm: fastForwardFarm(farm, seconds * 1000) });

  return { farm, coins, plant, water, harvest, sell, feed, skipTime };
}
