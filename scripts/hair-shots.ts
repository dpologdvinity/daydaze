// Screenshots lineup-page shots for several hair style sets and suit checks (a
// fresh browser each, one hold of the shared browser lock):
//   BASE_URL=http://localhost:5320 flock /tmp/daydaze-pw.lock \
//     node --experimental-strip-types scripts/hair-shots.ts
// Each hair shot is a row of heads, one style and color per doll, written to
// docs/screenshots/hair-<name>.png; `back` looks from behind. The suit-*
// shots (`shot` set) write doll-<name>.png: menswear on the chest, in motion.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:5195";
const COLORS = "1b1014,4a2a1c,b77a3e,f1d78f,ff4fb3,7b4dff";
const BACK = "cam=0,1.52,-2.4";
const SHOTS: { name: string; query: string; shot?: string }[] = [
  {
    name: "women-1",
    query: `styles=rapunzel,long-waves,fishtail,layered-long,sleek-side,high-pony&colors=${COLORS}`,
  },
  {
    name: "women-1-back",
    query: `styles=rapunzel,long-waves,fishtail,layered-long,sleek-side,high-pony&colors=${COLORS}&${BACK}`,
  },
  {
    name: "women-2",
    query: `styles=twin-tails,lob,blunt-bob,sidebob,side-fringe,messy-bun&colors=1b1014,ff8a3d,4a2a1c,3a6bff,c0c0c8,7ee8a2`,
  },
  {
    name: "men-1",
    query: `men=1&styles=quiff,side-part,tousled,messy-curls,crew,slick-back&colors=1b1014,4a2a1c,b77a3e,1b1014,4a2a1c,c0c0c8`,
  },
  {
    name: "men-1-back",
    query: `men=1&styles=quiff,side-part,tousled,messy-curls,crew,slick-back&colors=1b1014,4a2a1c,b77a3e,1b1014,4a2a1c,c0c0c8&${BACK}`,
  },
  {
    name: "men-2",
    query: `men=1&styles=mop,pompadour,mohawk,spiky-crop,crew,quiff&colors=1b1014,3a6bff,ff4fb3,4a2a1c,b77a3e,7b4dff`,
  },
  // close-ups of the speckle cases: men's and women's dark hair from behind,
  // and the Quiff's forehead in several colors
  {
    name: "close-men-back",
    query: `men=1&styles=crew,side-part,slick-back,messy-curls&colors=1b1014,4a2a1c,c0c0c8,1b1014&cam=0,1.62,-1.15`,
  },
  {
    name: "close-women-back",
    query: `styles=rapunzel,long-waves,layered-long&colors=1b1014,1b1014,4a2a1c&cam=0,1.5,-1.4`,
  },
  {
    name: "close-quiff",
    query: `men=1&styles=quiff,quiff,quiff,quiff&colors=1b1014,4a2a1c,b77a3e,c0c0c8&cam=0,1.62,1.3`,
  },
  // a man in the suit, up close and in motion: skin must not show through
  {
    name: "suit-chest",
    shot: "hairs",
    query: "men=1&styles=crew&cam=0,1.3,1.8",
  },
  { name: "suit-men", shot: "men", query: "cam=0,1.1,4.2" },
  { name: "suit-pose", shot: "pose", query: "men=1&outfit=suit" },
  { name: "suit-sit", shot: "sit", query: "men=1&outfit=suit" },
  { name: "suit-dance", shot: "dance", query: "men=1&outfit=suit" },
  // women walking in the trouser outfits, side on and from behind the knee
  { name: "suit-track-side", shot: "trackwalk", query: "cam=0.6,0.6,3.2" },
  { name: "suit-track-back", shot: "trackwalk", query: "cam=-2.2,0.6,2.2" },
  {
    name: "suit-women",
    shot: "body",
    query: "outfits=blouse,shorts,jeans",
  },
];

const only = process.argv.slice(2);
for (const { name, query, shot = "hairs" } of SHOTS) {
  if (only.length && !only.includes(name)) continue;
  // a fresh browser per shot: a second page in the same SwiftShader session
  // can leave the capture waiting minutes on the first one's GPU queue
  const browser = await chromium.launch({
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 650 },
    });
    page.on("pageerror", (e) => console.error("page error:", e.message));
    await page.goto(
      `${BASE}/src/client/avatar/lineup.html?human=1&shot=${shot}&${query}`,
      { timeout: 240_000 },
    );
    await page.locator("canvas").waitFor();
    // the models load lazily: give them time, then let the frame loop settle
    await page.waitForTimeout(45_000);
    await page.screenshot({
      path: `docs/screenshots/${name.startsWith("suit-") ? "doll" : "hair"}-${name}.png`,
      timeout: 900_000,
    });
    console.log("wrote", name);
  } catch (e) {
    console.error("failed", name, e instanceof Error ? e.message : e);
  } finally {
    await browser.close();
  }
}
