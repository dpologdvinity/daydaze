// Downloads CC0 PBR texture sets into public/textures/<id>/ as 512px WebP
// (diff, nor, rough), the layout `groundMaps` and `surfaceMaps` load.
// Sources: Poly Haven (api.polyhaven.com) and ambientCG (ambientcg.com/api).
// Both publish under CC0. Existing sets are skipped; delete a folder to
// refetch it. Downloads land in art/textures/.cache/ (git-ignored).
//   node --experimental-strip-types scripts/fetch-textures.ts [id...]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const SIZE = 512;
const ROOT = join(import.meta.dirname, "..");
const CACHE = join(ROOT, "art", "textures", ".cache");
const OUT = join(ROOT, "public", "textures");

type Source = "polyhaven" | "ambientcg";
/** Each set: its id here, where it comes from, and the source's own id. */
const SETS: readonly (readonly [string, Source, string?])[] = [
  // floors
  ["marble_01", "polyhaven"],
  ["marble_tiles", "polyhaven"],
  ["marble_mosaic_tiles", "polyhaven"],
  ["terrazzo_tiles", "polyhaven"],
  ["wood_floor", "polyhaven"],
  ["oak_wood_planks", "polyhaven"],
  ["laminate_floor_02", "polyhaven"],
  ["floor_tiles_06", "polyhaven"],
  ["long_white_tiles", "polyhaven"],
  ["square_tiles", "polyhaven"],
  ["rubber_tiles", "polyhaven"],
  ["granite_tile", "polyhaven"],
  ["slate_floor", "polyhaven"],
  ["garage_floor", "polyhaven"],
  ["anti_skid_tiles", "polyhaven"],
  ["carpet", "ambientcg", "Carpet015"],
  ["carpet_red", "ambientcg", "Carpet006"],
  // walls
  ["velour_velvet", "polyhaven"],
  ["quatrefoil_jacquard_fabric", "polyhaven"],
  ["painted_plaster_wall", "polyhaven"],
  ["white_plaster_02", "polyhaven"],
  ["beige_wall_001", "polyhaven"],
  ["wood_plank_wall", "polyhaven"],
  ["concrete_wall_008", "polyhaven"],
  ["rounded_square_tiled_wall", "polyhaven"],
  ["square_tiled_wall", "polyhaven"],
  ["brick_wall_02", "polyhaven"],
  ["stone_tile_wall", "polyhaven"],
  ["bamboo_wall", "polyhaven"],
  ["wallpaper", "ambientcg", "Wallpaper001A"],
  // surfaces and furniture
  ["leather_white", "polyhaven"],
  ["fabric_leather_02", "polyhaven"],
  ["denim_fabric", "polyhaven"],
  ["metal_plate", "polyhaven"],
  ["rusty_metal", "polyhaven"],
  ["corrugated_iron", "polyhaven"],
  ["painted_metal_shutter", "polyhaven"],
  ["gold", "ambientcg", "Metal034"],
  ["chrome", "ambientcg", "Metal049A"],
  ["wood_veneer", "ambientcg", "Wood049"],
  ["plastic", "ambientcg", "Plastic010"],
  // outdoors
  ["leafy_grass", "polyhaven"],
  ["sparse_grass", "polyhaven"],
  ["coast_sand_01", "polyhaven"],
  ["park_sand", "polyhaven"],
  ["rock_face", "polyhaven"],
  ["cobblestone_floor_04", "polyhaven"],
  ["patterned_paving", "polyhaven"],
  ["clay_roof_tiles", "polyhaven"],
  ["palm_bark", "polyhaven"],
  ["red_sandstone_pavement", "polyhaven"],
];

async function download(url: string, to: string) {
  if (existsSync(to)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(to, Buffer.from(await res.arrayBuffer()));
}

/** The three source images for a set, downloaded into the cache. */
async function fetchSet(id: string, from: Source, srcId = id) {
  const dir = join(CACHE, id);
  mkdirSync(dir, { recursive: true });
  const files = {
    diff: join(dir, "diff.jpg"),
    nor: join(dir, "nor.jpg"),
    rough: join(dir, "rough.jpg"),
  };
  if (from === "polyhaven") {
    const res = await fetch(`https://api.polyhaven.com/files/${srcId}`);
    if (!res.ok) throw new Error(`${res.status} polyhaven ${srcId}`);
    const j: unknown = await res.json();
    const url = (map: string): string => {
      const found =
        typeof j === "object" && j !== null
          ? Object.entries(j).find(([k]) => k === map)?.[1]
          : undefined;
      const u: unknown = found?.["1k"]?.jpg?.url;
      if (typeof u !== "string") throw new Error(`${srcId}: no 1k ${map}`);
      return u;
    };
    await download(url("Diffuse"), files.diff);
    await download(url("nor_gl"), files.nor);
    await download(url("Rough"), files.rough);
  } else {
    const zip = join(dir, "set.zip");
    await download(`https://ambientcg.com/get?file=${srcId}_1K-JPG.zip`, zip);
    execFileSync("unzip", ["-o", "-q", zip, "-d", dir]);
    const pick = (suffix: string) => join(dir, `${srcId}_1K-JPG_${suffix}.jpg`);
    for (const [key, suffix] of [
      ["diff", "Color"],
      ["nor", "NormalGL"],
      ["rough", "Roughness"],
    ] as const) {
      const from = pick(suffix);
      if (!existsSync(from)) throw new Error(`${srcId}: no ${suffix}`);
      writeFileSync(files[key], readFileSync(from));
    }
  }
  return files;
}

const wanted = process.argv.slice(2);
const sets = SETS.filter(([id]) => !wanted.length || wanted.includes(id));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [id, from, srcId] of sets) {
  const out = join(OUT, id);
  if (existsSync(join(out, "rough.webp"))) continue;
  try {
    const files = await fetchSet(id, from, srcId);
    mkdirSync(out, { recursive: true });
    for (const [key, file] of Object.entries(files)) {
      const src = `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`;
      const webp = await page.evaluate(
        async ({ src, size }) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = c.height = size;
          c.getContext("2d")?.drawImage(img, 0, 0, size, size);
          return c.toDataURL("image/webp", 0.85);
        },
        { src, size: SIZE },
      );
      writeFileSync(
        join(out, `${key}.webp`),
        Buffer.from(webp.split(",")[1] ?? "", "base64"),
      );
    }
    console.log("ok", id);
  } catch (e) {
    console.log("FAILED", id, e instanceof Error ? e.message : e);
  }
}
await browser.close();
