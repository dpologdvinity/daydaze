// Freesound helper for the sound pass (key from FREESOUND_API_KEY; run it via
// `bash scripts/with-env.sh node scripts/freesound.mjs ...`).
//
//   search "<query>" [maxSeconds] [minSeconds]   list CC0 / CC-BY candidates
//   get <id> <out.ogg>                           download the HQ preview (Ogg)
//
// Search prefers CC0 (listed first); CC-BY results carry the author for the
// credits screen. Only the public preview files are fetched, never originals.
import { writeFileSync } from "node:fs";

const KEY = process.env.FREESOUND_API_KEY;
if (!KEY) throw new Error("FREESOUND_API_KEY is not set");
const API = "https://freesound.org/apiv2";
const FIELDS =
  "id,name,username,license,duration,avg_rating,num_ratings,previews,url";

async function api(path, params) {
  const url = `${API}${path}?${new URLSearchParams({ ...params, token: KEY })}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "search") {
  const max = Number(b) || 20;
  const min = Number(c) || 0.2;
  const rows = [];
  for (const [label, license] of [
    ["CC0", '"Creative Commons 0"'],
    ["CC-BY", '"Attribution"'],
  ]) {
    const res = await api("/search/text/", {
      query: a,
      filter: `license:${license} duration:[${min} TO ${max}]`,
      fields: FIELDS,
      sort: "rating_desc",
      page_size: "8",
    });
    for (const s of res.results)
      rows.push(
        `${label}\t${s.id}\t${s.duration.toFixed(1)}s\t★${(s.avg_rating ?? 0).toFixed(1)}(${s.num_ratings})\t${s.username}\t${s.name}`,
      );
  }
  console.log(rows.join("\n"));
} else if (cmd === "get") {
  const s = await api(`/sounds/${a}/`, { fields: FIELDS });
  const r = await fetch(s.previews["preview-hq-ogg"]);
  if (!r.ok) throw new Error(`preview ${r.status}`);
  writeFileSync(b, Buffer.from(await r.arrayBuffer()));
  console.log(`${s.id}\t${s.license}\t${s.username}\t${s.name}\t${s.url}`);
} else console.log("usage: search <query> [max] [min] | get <id> <out>");
