// The Sunny Acres Farm HUD panel: plot actions (plant, water, harvest),
// farm stand sales, and animal feeding.

import { useState, type JSX } from "react";
import {
  CROP_IDS,
  CROPS,
  FARM_SPECIES,
  plotGrowth,
  type CropId,
} from "../../../game/farm.ts";
import { readFlags } from "../../flags.ts";
import { useFarmState } from "./farmSession.ts";

const DEBUG = readFlags(location.search).debug;

export function FarmPanel(): JSX.Element {
  const { farm, coins, plant, water, harvest, sell, feed, skipTime } =
    useFarmState();
  const [activeTab, setActiveTab] = useState<"plots" | "stand" | "animals">(
    "plots",
  );
  const [selectedCrop, setSelectedCrop] = useState<CropId>("carrot");
  const [message, setMessage] = useState<string>("");

  const handlePlant = (plotIndex: number) => {
    const cost = CROPS[selectedCrop].seedPrice;
    if (coins < cost) {
      setMessage(`Need ${cost} coins to buy ${CROPS[selectedCrop].name} seed!`);
      return;
    }
    const ok = plant(plotIndex, selectedCrop);
    if (ok) {
      setMessage(
        `Planted ${CROPS[selectedCrop].name} on Plot ${plotIndex + 1}!`,
      );
    }
  };

  const handleWater = (plotIndex: number) => {
    const ok = water(plotIndex);
    if (ok) {
      setMessage(`Watered Plot ${plotIndex + 1}! It has begun growing.`);
    }
  };

  const handleHarvest = (plotIndex: number) => {
    const res = harvest(plotIndex);
    if (res) {
      setMessage(
        `Harvested ${res.yieldCount} ${CROPS[res.crop].name}! Added to groceries.`,
      );
    }
  };

  const handleSell = (crop: CropId) => {
    const count = farm.groceries[crop] || 0;
    if (count <= 0) return;
    const earned = sell(crop, count);
    if (earned !== null) {
      setMessage(`Sold ${count} ${CROPS[crop].name} for ${earned} coins!`);
    }
  };

  const handleFeed = (animal: string) => {
    feed(animal);
    setMessage(`You fed the ${animal}! ❤️`);
  };

  return (
    <div
      className="room-game-panel farm-panel"
      role="region"
      aria-label="Sunny Acres Farm"
    >
      <div className="game-tabs" role="group" aria-label="Farm options">
        <button
          type="button"
          aria-pressed={activeTab === "plots"}
          onClick={() => setActiveTab("plots")}
        >
          Crops & Plots
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "stand"}
          onClick={() => setActiveTab("stand")}
        >
          Farm Stand
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "animals"}
          onClick={() => setActiveTab("animals")}
        >
          Pastures
        </button>
      </div>

      {message && (
        <p
          className="farm-message"
          role="status"
          style={{ margin: "4px 0", color: "#ffd166" }}
        >
          {message}
        </p>
      )}

      {activeTab === "plots" && (
        <div className="farm-plots-section">
          <div
            className="seed-selector"
            style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
          >
            <span>Seed:</span>
            {CROP_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`seed-btn ${selectedCrop === id ? "active" : ""}`}
                aria-pressed={selectedCrop === id}
                onClick={() => setSelectedCrop(id)}
              >
                {CROPS[id].name} ({CROPS[id].seedPrice}c)
              </button>
            ))}
          </div>

          <div
            className="plots-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {farm.plots.map((plot, i) => {
              const now = Date.now();
              const growth = plotGrowth(plot, now);
              return (
                <div
                  key={i}
                  className="farm-plot-card"
                  data-plot-index={i}
                  data-crop={plot.crop ?? "none"}
                  data-crop-stage={growth.stage}
                  data-plot-ready={growth.ready}
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    padding: "8px",
                    borderRadius: "6px",
                    border: growth.ready
                      ? "2px solid #52b788"
                      : "1px solid #444",
                  }}
                >
                  <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
                    Plot {i + 1}
                  </p>
                  {plot.crop === null ? (
                    <div>
                      <p style={{ margin: "0 0 4px 0", color: "#aaa" }}>
                        Empty Soil
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlant(i)}
                        aria-label={`Plant ${CROPS[selectedCrop].name} on plot ${i}`}
                      >
                        Plant {CROPS[selectedCrop].name}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: "0 0 2px 0", color: "#ffd166" }}>
                        {CROPS[plot.crop].name}
                      </p>
                      {plot.wateredAt === null ? (
                        <div>
                          <p style={{ margin: "0 0 4px 0", color: "#e76f51" }}>
                            Dry soil
                          </p>
                          <button
                            type="button"
                            onClick={() => handleWater(i)}
                            aria-label={`Water plot ${i}`}
                          >
                            Water plot
                          </button>
                        </div>
                      ) : growth.ready ? (
                        <div>
                          <p style={{ margin: "0 0 4px 0", color: "#52b788" }}>
                            Ripe & Ready!
                          </p>
                          <button
                            type="button"
                            onClick={() => handleHarvest(i)}
                            aria-label={`Harvest plot ${i}`}
                            style={{
                              background: "#52b788",
                              color: "#fff",
                              fontWeight: "bold",
                            }}
                          >
                            Harvest
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p style={{ margin: "0 0 2px 0", color: "#48cae4" }}>
                            Stage {growth.stage}/4 (
                            {Math.round(growth.progress * 100)}%)
                          </p>
                          <div
                            style={{
                              width: "100%",
                              background: "#333",
                              height: "6px",
                              borderRadius: "3px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round(growth.progress * 100)}%`,
                                height: "100%",
                                background: "#48cae4",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {DEBUG && (
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="debug-skip-btn"
                onClick={() => skipTime(60)}
                aria-label="Debug: Skip 60s"
                style={{ fontSize: "11px", opacity: 0.8 }}
              >
                Skip 60s (Debug)
              </button>
              <button
                type="button"
                onClick={() => skipTime(120)}
                aria-label="Debug: Skip 120s"
                style={{ fontSize: "11px", opacity: 0.8 }}
              >
                Skip 120s (Debug)
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "stand" && (
        <div className="farm-stand-section">
          <p style={{ margin: "0 0 8px 0" }}>
            Fresh harvest in your basket. Sell for coins or save for cooking:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {CROP_IDS.map((id) => {
              const count = farm.groceries[id] || 0;
              const def = CROPS[id];
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(0,0,0,0.5)",
                    padding: "6px 10px",
                    borderRadius: "4px",
                  }}
                >
                  <span>
                    {def.name}: <strong>{count}</strong> ({def.sellPrice}c each)
                  </span>
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={() => handleSell(id)}
                    aria-label={`Sell all ${def.name}`}
                  >
                    Sell all ({count * def.sellPrice}c)
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "animals" && (
        <div className="farm-animals-section">
          <p style={{ margin: "0 0 8px 0" }}>
            Pasture animals wander their pens. Feed them treats:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            {FARM_SPECIES.map((animal) => (
              <div
                key={animal}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  padding: "8px",
                  borderRadius: "6px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px 0",
                    textTransform: "capitalize",
                    fontWeight: "bold",
                  }}
                >
                  {animal}
                </p>
                <button
                  type="button"
                  onClick={() => handleFeed(animal)}
                  aria-label={`Feed ${animal}`}
                >
                  Feed treat 🍎
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
