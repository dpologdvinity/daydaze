// The Suburbia Community Garden HUD panel: raised bed plot management
// (claim, plant seeds, water, harvest), produce storage inventory,
// and neighbor gardener interactions.

import { useState, type JSX } from "react";
import {
  GARDEN_CROP_IDS,
  GARDEN_CROPS,
  plotGrowth,
  type GardenCropId,
} from "../../../game/garden.ts";
import { readFlags } from "../../flags.ts";
import { useGardenState } from "./gardenSession.ts";

const DEBUG = readFlags(location.search).debug;

export function GardenPanel(): JSX.Element {
  const { garden, coins, claim, plant, water, harvest, skipTime } =
    useGardenState();
  const [activeTab, setActiveTab] = useState<"beds" | "storage">("beds");
  const [selectedCrop, setSelectedCrop] = useState<GardenCropId>("tomato");
  const [message, setMessage] = useState<string>("");

  const handleClaim = (plotIndex: number) => {
    const ok = claim(plotIndex);
    if (ok) {
      setMessage(`Claimed raised bed ${plotIndex + 1}! It is ready for seeds.`);
    }
  };

  const handlePlant = (plotIndex: number) => {
    const cost = GARDEN_CROPS[selectedCrop].seedPrice;
    if (coins < cost) {
      setMessage(
        `Need ${cost} coins to buy ${GARDEN_CROPS[selectedCrop].name} seed!`,
      );
      return;
    }
    const ok = plant(plotIndex, selectedCrop);
    if (ok) {
      setMessage(
        `Planted ${GARDEN_CROPS[selectedCrop].name} in Bed ${plotIndex + 1}!`,
      );
    }
  };

  const handleWater = (plotIndex: number) => {
    const ok = water(plotIndex);
    if (ok) {
      setMessage(`Watered Bed ${plotIndex + 1}! Deep soak given to the roots.`);
    }
  };

  const handleHarvest = (plotIndex: number) => {
    const res = harvest(plotIndex);
    if (res) {
      setMessage(
        `Harvested ${res.yieldCount} ${GARDEN_CROPS[res.crop].name} (+${res.coins} coins)! Added to produce storage.`,
      );
    }
  };

  return (
    <div
      className="room-game-panel garden-panel"
      role="region"
      aria-label="Community Garden"
      data-garden-ready="true"
    >
      <div className="game-tabs" role="group" aria-label="Garden options">
        <button
          type="button"
          aria-pressed={activeTab === "beds"}
          onClick={() => setActiveTab("beds")}
        >
          Raised Beds
        </button>
        <button
          type="button"
          aria-pressed={activeTab === "storage"}
          onClick={() => setActiveTab("storage")}
        >
          Produce Shed
        </button>
      </div>

      {message && (
        <p
          className="garden-message"
          role="status"
          style={{ margin: "4px 0", color: "#52b788", fontSize: "0.85rem" }}
        >
          {message}
        </p>
      )}

      {activeTab === "beds" && (
        <div className="garden-beds-section">
          <div
            className="seed-selector"
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
              Seed:
            </span>
            {GARDEN_CROP_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`seed-btn ${selectedCrop === id ? "active" : ""}`}
                aria-pressed={selectedCrop === id}
                onClick={() => setSelectedCrop(id)}
                style={{
                  padding: "3px 8px",
                  fontSize: "0.8rem",
                  background:
                    selectedCrop === id ? "#52b788" : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: "1px solid #666",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {GARDEN_CROPS[id].name} ({GARDEN_CROPS[id].seedPrice}c)
              </button>
            ))}
          </div>

          <div
            className="plots-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
            }}
          >
            {garden.plots.map((plot, i) => {
              const now = Date.now();
              const growth = plotGrowth(plot, now);
              return (
                <div
                  key={i}
                  className="garden-plot-card"
                  data-plot-index={i}
                  data-claimed={plot.claimed}
                  data-crop={plot.crop ?? "none"}
                  data-crop-stage={growth.stage}
                  data-plot-ready={growth.ready}
                  data-wilted={growth.wilted}
                  style={{
                    background: "rgba(18,24,18,0.75)",
                    padding: "8px",
                    borderRadius: "6px",
                    border: growth.ready
                      ? "2px solid #52b788"
                      : growth.wilted
                        ? "1px solid #e76f51"
                        : "1px solid #334433",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                    }}
                  >
                    Bed {i + 1}
                  </p>
                  {!plot.claimed ? (
                    <div>
                      <p
                        style={{
                          margin: "0 0 6px 0",
                          color: "#aaa",
                          fontSize: "0.75rem",
                        }}
                      >
                        Unclaimed Bed
                      </p>
                      <button
                        type="button"
                        onClick={() => handleClaim(i)}
                        aria-label={`Claim bed ${i + 1}`}
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.75rem",
                          background: "#3a7d44",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Claim Bed
                      </button>
                    </div>
                  ) : plot.crop === null ? (
                    <div>
                      <p
                        style={{
                          margin: "0 0 6px 0",
                          color: "#88c070",
                          fontSize: "0.75rem",
                        }}
                      >
                        Tilled Soil
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlant(i)}
                        aria-label={`Plant ${GARDEN_CROPS[selectedCrop].name} on bed ${i + 1}`}
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.75rem",
                          background: "#4f772d",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Plant {GARDEN_CROPS[selectedCrop].name.split(" ")[0]}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p
                        style={{
                          margin: "0 0 2px 0",
                          color: "#ffd166",
                          fontSize: "0.8rem",
                          fontWeight: "500",
                        }}
                      >
                        {GARDEN_CROPS[plot.crop].name}
                      </p>
                      {growth.wilted ? (
                        <div>
                          <p
                            style={{
                              margin: "0 0 4px 0",
                              color: "#e76f51",
                              fontSize: "0.75rem",
                            }}
                          >
                            Wilted! Needs Water
                          </p>
                          <button
                            type="button"
                            onClick={() => handleWater(i)}
                            aria-label={`Water bed ${i + 1}`}
                            style={{
                              padding: "3px 8px",
                              fontSize: "0.75rem",
                              background: "#2a9d8f",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Revive & Water
                          </button>
                        </div>
                      ) : growth.ready ? (
                        <div>
                          <p
                            style={{
                              margin: "0 0 4px 0",
                              color: "#52b788",
                              fontWeight: "bold",
                              fontSize: "0.75rem",
                            }}
                          >
                            Ripe & Ready!
                          </p>
                          <button
                            type="button"
                            onClick={() => handleHarvest(i)}
                            aria-label={`Harvest bed ${i + 1}`}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.8rem",
                              background: "#52b788",
                              color: "#112211",
                              fontWeight: "bold",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Harvest
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p
                            style={{
                              margin: "0 0 2px 0",
                              color: growth.dry ? "#f4a261" : "#80ed99",
                              fontSize: "0.75rem",
                            }}
                          >
                            Stage {growth.stage}/4 (
                            {Math.round(growth.progress * 100)}%)
                            {growth.dry ? " • Dry" : " • Moist"}
                          </p>
                          <div
                            style={{
                              width: "100%",
                              background: "#223322",
                              height: "5px",
                              borderRadius: "3px",
                              overflow: "hidden",
                              marginBottom: "4px",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round(growth.progress * 100)}%`,
                                height: "100%",
                                background: "#52b788",
                              }}
                            />
                          </div>
                          {growth.dry && (
                            <button
                              type="button"
                              onClick={() => handleWater(i)}
                              aria-label={`Water bed ${i + 1}`}
                              style={{
                                padding: "2px 6px",
                                fontSize: "0.7rem",
                                background: "#2a9d8f",
                                color: "#fff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              Water Bed
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Fast forward controls for testing / debug */}
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "6px",
            }}
          >
            <button
              type="button"
              onClick={() => skipTime(60)}
              aria-label="Fast-forward garden 1 minute"
              style={{
                fontSize: "0.7rem",
                padding: "2px 6px",
                background: "rgba(255,255,255,0.08)",
                color: "#888",
                border: "1px solid #444",
                borderRadius: "3px",
              }}
            >
              +1 min
            </button>
            <button
              type="button"
              onClick={() => skipTime(3600)}
              aria-label="Fast-forward garden 1 hour"
              style={{
                fontSize: "0.7rem",
                padding: "2px 6px",
                background: "rgba(255,255,255,0.08)",
                color: "#888",
                border: "1px solid #444",
                borderRadius: "3px",
              }}
            >
              +1 hour
            </button>
          </div>
        </div>
      )}

      {activeTab === "storage" && (
        <div
          className="garden-storage-section"
          style={{
            background: "rgba(18,24,18,0.75)",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #334433",
          }}
        >
          <h4
            style={{
              margin: "0 0 10px 0",
              color: "#ffd166",
              fontSize: "0.9rem",
            }}
          >
            Tool Shed & Fresh Produce Storage
          </h4>
          <p
            style={{
              margin: "0 0 12px 0",
              color: "#aaa",
              fontSize: "0.8rem",
            }}
          >
            Produce harvested from your community garden beds is stored here and
            in your home supplies.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px",
            }}
          >
            {GARDEN_CROP_IDS.map((id) => (
              <div
                key={id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: "4px",
                  border: "1px solid #334433",
                }}
              >
                <span style={{ fontSize: "0.8rem", color: "#e0e0e0" }}>
                  {GARDEN_CROPS[id].name}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    color: "#52b788",
                  }}
                  data-produce-count={id}
                >
                  {garden.produce[id] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
