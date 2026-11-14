// The paintings and posters on show: Meshy-generated images in public/art/<id>.webp
// (longest side 1024, aspect varies, so a hanger reads it from the loaded image
// and fits it to a slot with fitInside). Gallery 44 hangs a curated set and the
// apartment's prints (decor.ts) offer another; credits live in docs/assets.md.

export type ArtGroup = "sapphic" | "filipino" | "daydaze";

export const ARTWORKS = {
  // sapphic romance
  "sap-slow-dance": { title: "Slow Dance, Last Song", group: "sapphic" },
  "sap-rainy-window": { title: "Rain on the Glass", group: "sapphic" },
  "sap-bonfire": { title: "After the Bonfire", group: "sapphic" },
  "sap-mermaids": { title: "Two Mermaids", group: "sapphic" },
  "sap-stained-glass": { title: "Stained Glass", group: "sapphic" },
  "sap-cafe": { title: "Cafe for Two", group: "sapphic" },
  "sap-sunflowers": { title: "Sunflowers", group: "sapphic" },
  "sap-umbrella": { title: "Under One Umbrella", group: "sapphic" },
  "sap-pride": { title: "Pride", group: "sapphic" },
  "sap-polaroids": { title: "Polaroids", group: "sapphic" },
  "sap-ferris-wheel": { title: "Ferris Wheel", group: "sapphic" },
  "sap-arcade": { title: "Arcade Date", group: "sapphic" },
  "sap-boardwalk": { title: "Boardwalk Evening", group: "sapphic" },
  "sap-bookshop": { title: "Bookshop Corner", group: "sapphic" },
  "sap-diner": { title: "Diner Booth", group: "sapphic" },
  "sap-flash-game": { title: "Flash Game", group: "sapphic" },
  "sap-ice-rink": { title: "Ice Rink", group: "sapphic" },
  "sap-karaoke": { title: "Karaoke Duet", group: "sapphic" },
  "sap-marina": { title: "Marina", group: "sapphic" },
  "sap-nouveau": { title: "Art Nouveau", group: "sapphic" },
  "sap-picnic": { title: "Picnic", group: "sapphic" },
  "sap-pop-art": { title: "Pop Art", group: "sapphic" },
  "sap-roller-rink": { title: "Roller Rink", group: "sapphic" },
  "sap-wedding": { title: "Wedding", group: "sapphic" },
  // Filipino
  "ph-parol-night": { title: "Parol Night", group: "filipino" },
  "ph-sinulog": { title: "Sinulog", group: "filipino" },
  "ph-lola-kitchen": { title: "Lola's Kitchen", group: "filipino" },
  "ph-jeepney-dusk": { title: "Jeepney at Dusk", group: "filipino" },
  "ph-rice-terraces": { title: "Rice Terraces", group: "filipino" },
  "ph-pahiyas": { title: "Pahiyas", group: "filipino" },
  "ph-mango-orchard": { title: "Mango Orchard", group: "filipino" },
  "ph-carabao": { title: "Carabao", group: "filipino" },
  "ph-fiesta-street": { title: "Fiesta Street", group: "filipino" },
  "ph-manila-bay": { title: "Manila Bay", group: "filipino" },
  "ph-nipa-sea": { title: "Nipa Hut by the Sea", group: "filipino" },
  "ph-noche-buena": { title: "Noche Buena", group: "filipino" },
  // Daydaze posters
  "dd-boardwalk": { title: "Boardwalk Poster", group: "daydaze" },
  "dd-mermaid-cove": { title: "Mermaid Cove Poster", group: "daydaze" },
  "dd-skyline": { title: "Skyline Poster", group: "daydaze" },
  "dd-night-market": { title: "Night Market Poster", group: "daydaze" },
  "dd-carnival": { title: "Carnival Poster", group: "daydaze" },
  "dd-pulse": { title: "Pulse Poster", group: "daydaze" },
  "dd-roller": { title: "Roller Disco Poster", group: "daydaze" },
  "dd-travel": { title: "Travel Poster", group: "daydaze" },
} as const satisfies Record<string, { title: string; group: ArtGroup }>;

export type ArtworkId = keyof typeof ARTWORKS;

/** Where the browser fetches an artwork's image. */
export const artworkUrl = (id: ArtworkId): string => `/art/${id}.webp`;

/** The largest `aspect` (width over height) rectangle inside `maxW` by `maxH`;
 * a missing or broken aspect gives a square. */
export function fitInside(
  aspect: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const w = Math.min(maxW, maxH * a);
  return { w, h: w / a };
}
