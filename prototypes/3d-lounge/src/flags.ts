// Perf toggles for profiling, e.g. spike.html?off=reflector,bloom,npcs
export const OFF = new Set(
  (new URLSearchParams(location.search).get("off") ?? "").split(","),
);
