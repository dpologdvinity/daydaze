// Reactive state and action handlers for the Suburbia Community Garden loop.
// The garden and coins live in the app's save: App mirrors them into gardenDesk
// and installs `commit`, which writes a new pair back into the save.

import { useEffect, useState } from "react";
import {
  claimPlot,
  createDefaultGarden,
  fastForwardGarden,
  harvestPlot,
  plantSeed,
  waterPlot,
  type GardenCropId,
  type GardenSave,
} from "../../../game/garden.ts";
import { earn, spend } from "../../../game/wallet.ts";
import { createStore } from "../shared/store.ts";
import { doWork } from "../shared/game3d/workClip.ts";

type GardenCoins = { garden: GardenSave; coins: number };

export const gardenDesk = createStore({
  garden: createDefaultGarden(),
  coins: 0,
  wateringPlot: null as number | null,
  commit: null as ((next: GardenCoins) => void) | null,
});

/** Hook providing the latest GardenSave, coin balance, and mutating garden actions. */
export function useGardenState() {
  const desk = gardenDesk.use();
  // a tick every second keeps growth timers and progress bars lively
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { garden, coins, wateringPlot } = desk;
  const commit = (next: GardenCoins) => {
    gardenDesk.set(next);
    desk.commit?.(next);
  };

  const claim = (plotIndex: number): boolean => {
    const nextGarden = claimPlot(garden, plotIndex);
    if (!nextGarden) return false;
    commit({ coins, garden: nextGarden });
    return true;
  };

  const plant = (plotIndex: number, crop: GardenCropId): boolean => {
    const res = plantSeed(garden, plotIndex, crop, Date.now());
    if (!res) return false;
    const nextCoins = spend(coins, res.cost);
    if (nextCoins === null) return false; // not enough coins
    commit({ coins: nextCoins, garden: res.garden });
    doWork("farm-plant");
    return true;
  };

  const water = (plotIndex: number): boolean => {
    const nextGarden = waterPlot(garden, plotIndex, Date.now());
    if (!nextGarden) return false;
    // Set wateringPlot to show watering animation
    gardenDesk.set({ wateringPlot: plotIndex });
    doWork("farm-water");
    setTimeout(() => {
      if (gardenDesk.get().wateringPlot === plotIndex) {
        gardenDesk.set({ wateringPlot: null });
      }
    }, 2200);
    commit({ coins, garden: nextGarden });
    return true;
  };

  const harvest = (
    plotIndex: number,
  ): { crop: GardenCropId; yieldCount: number; coins: number } | null => {
    const res = harvestPlot(garden, plotIndex, Date.now());
    if (!res) return null;
    commit({ coins: earn(coins, res.coins), garden: res.garden });
    doWork("farm-harvest");
    return { crop: res.crop, yieldCount: res.yieldCount, coins: res.coins };
  };

  /** Debug/Fast-forward: advances all plot timers. */
  const skipTime = (seconds: number) =>
    commit({ coins, garden: fastForwardGarden(garden, seconds * 1000) });

  return {
    garden,
    coins,
    wateringPlot,
    claim,
    plant,
    water,
    harvest,
    skipTime,
  };
}
