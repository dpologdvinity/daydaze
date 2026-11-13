// The shop names painted on the district lots (src/game/city/districts.ts),
// all made up, in each district's own language and style: Tagalog in Little
// Manila, Cantonese and Mandarin romanizations in Chinatown, Korean in
// Koreatown, studio and gallery names in the Arts District, old money in
// Uptown. Plain capital ASCII so the label atlas draws them in any font; no
// real businesses or brands.

export type District =
  "little-manila" | "chinatown" | "koreatown" | "arts-district" | "uptown";

export const DISTRICT_NAMES: Readonly<Record<District, readonly string[]>> = {
  "little-manila": [
    "TINDAHAN NI MANG ESTONG",
    "PANADERYA LUNA",
    "BARBERYA DE LUXE",
    "KAPEHAN SA SULOK",
    "LABADA EXPRESS",
    "BOTICA BAYANIHAN",
    "PARLOR NI TITA ROSE",
    "MERKADO SINAG",
    "TAHIAN MAGANDA",
    "LUTO NI NANAY",
    "HALO-HALO SA KANTO",
    "PALENGKE MINI",
  ],
  chinatown: [
    "FU LOK MEI HERBS",
    "HUNG WAH TEA TRADING",
    "JADE DRAGON EMPORIUM",
    "LUCKY CLOUD DIM SUM",
    "PEARL RIVER SEAFOOD",
    "WING SANG BAKERY",
    "GOLDEN KOI FABRICS",
    "SIU MEI NOODLE HOUSE",
    "TAI PING APOTHECARY",
    "SAN YUEN LANTERNS",
    "MOON GATE TEAHOUSE",
    "DOUBLE HAPPINESS GIFTS",
  ],
  koreatown: [
    "NAMSAN BBQ HOUSE",
    "CHEONGDAM NOODLES",
    "HANGANG PHARMACY",
    "MIDAM BAKERY",
    "SOJU AND BANCHAN",
    "PINK TTEOK SHOP",
    "DALBIT MARKET",
    "SARANGBANG KARAOKE",
    "GOOD LUCK HAIR SALON",
    "BOMNAL BEAUTY",
    "HANOK TEA ROOM",
    "SUNRISE PC BANG",
  ],
  "arts-district": [
    "RUST AND RESIN STUDIO",
    "THE KILN ROOM",
    "NEON LOOM GALLERY",
    "SPLATTER PRESS",
    "LAST LIGHT DARKROOM",
    "WILDFLOWER SCREENPRINT",
    "TOO MANY CATS ZINES",
    "BRASS CROW GALLERY",
    "COBALT AND CLAY",
    "THE PAPER MOTH",
    "SALVAGE SOUND LAB",
    "GLUE AND GLITTER",
  ],
  uptown: [
    "MAISON DE LA ROSE",
    "THE ASHFORD CLUB",
    "ST CLAIR HOTEL",
    "HARLOW AND PIKE",
    "BELVEDERE ARMS",
    "OLIVE AND FINCH",
    "CARRAWAY JEWELERS",
    "LA VIOLETTE",
    "THE GILDED LILY",
    "WREN AND WILLOW BOOKS",
    "FAIRFAX TAILORS",
    "THE MARBLE STAIR",
  ],
};
