// Generates Daydaze's sound library offline with the ElevenLabs SDK: the
// ambience loops and one-shots in SOUNDS (Sound Effects API) and the music
// beds in MUSIC (Music API), written to public/audio/ as small Opus/OGG files
// (MP3 when ffmpeg is missing). Ids that already have a file are skipped, so
// rerunning only fills gaps; the game never calls the API.
//
//   bash scripts/with-env.sh node scripts/gen-sounds.mjs          # sound effects
//   bash scripts/with-env.sh node scripts/gen-sounds.mjs --music  # music beds too
//
// The SDK reads ELEVENLABS_API_KEY from the environment (scripts/with-env.sh
// loads it from the git-ignored .env); the key never appears in code or output.
// Every call prints its credit cost; BUDGET caps one run.

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";

const OUT = "public/audio";
/** The most credits one run may spend. */
const BUDGET = 3000;
/** Sound Effects cost per second of explicit duration (ElevenLabs pricing). */
const SFX_CREDITS_PER_SECOND = 40;

/** [id, prompt, seconds, loop] */
const SOUNDS = [
  [
    "city-day",
    "Daytime city ambience, distant traffic hum, occasional distant horns and birds, no voices or music",
    8,
    true,
  ],
  [
    "city-night",
    "Quiet city at night, distant traffic and faint music, atmospheric ambience",
    8,
    true,
  ],
  [
    "beach",
    "Gentle ocean surf washing onto a beach, distant gull calls",
    8,
    true,
  ],
  [
    "park",
    "Peaceful city park ambience with birds singing and gentle breeze",
    8,
    true,
  ],
  [
    "stadium",
    "Distant stadium crowd murmuring and cheering softly, spacious",
    8,
    true,
  ],
  ["fountain", "Gentle outdoor fountain water flowing and splashing", 8, true],
  ["cheer", "Crowd cheers enthusiastically in a stadium", 3, false],
  ["elephant", "Elephant trumpets naturally in the distance", 3, false],
  ["lion", "Lion roars naturally in the distance", 3, false],
  ["flamingos", "Flock of flamingos calling and chattering", 3, false],
  ["door", "A wooden door opens and closes, realistic", 3, false],
  ["coin", "Bright satisfying single coin pickup chime", 3, false],
  ["camera", "Single camera shutter click", 3, false],
  ["horn", "Short car horn honk", 3, false],
  ["bus-brake", "Bus air brake hisses briefly", 3, false],
];

/** [id, prompt, milliseconds]: instrumental beds for rooms, generated with --music. */
const MUSIC = [
  [
    "music-boardwalk",
    "Sunny, carefree beach boardwalk pop instrumental, ukulele, hand claps, light percussion, loopable, no vocals",
    30000,
  ],
  [
    "music-lounge",
    "Smooth late-night lounge instrumental, warm Rhodes piano, soft bass, brushed drums, loopable, no vocals",
    30000,
  ],
];

const client = new ElevenLabsClient();
const ffmpeg =
  spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
mkdirSync(OUT, { recursive: true });

const credits = async () =>
  (await client.user.subscription.get()).characterCount;
const has = (id) =>
  existsSync(`${OUT}/${id}.ogg`) || existsSync(`${OUT}/${id}.mp3`);

/** Saves MP3 bytes as Opus/OGG at `kbps` (MP3 if ffmpeg can't). */
function save(id, bytes, kbps) {
  if (!ffmpeg) return writeFileSync(`${OUT}/${id}.mp3`, bytes);
  const temporary = `${OUT}/${id}.tmp.mp3`;
  writeFileSync(temporary, bytes);
  const target = `${OUT}/${id}.ogg`;
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-y", "-i", temporary, "-c:a", "libopus"].concat([
      "-b:a",
      `${kbps}k`,
      target,
    ]),
    { stdio: "inherit" },
  );
  if (result.status === 0) return unlinkSync(temporary);
  if (existsSync(target)) unlinkSync(target);
  writeFileSync(`${OUT}/${id}.mp3`, bytes);
  unlinkSync(temporary);
  console.log(`${id}: Opus unavailable; saved MP3`);
}

const bytesOf = async (stream) =>
  Buffer.from(await new Response(stream).arrayBuffer());

const start = await credits();
let reserved = 0;
const reserve = (amount) => {
  if (reserved + amount > BUDGET) throw new Error("Credit budget exhausted");
  reserved += amount;
};

for (const [id, text, seconds, loop] of SOUNDS) {
  if (has(id)) continue;
  reserve(seconds * SFX_CREDITS_PER_SECOND);
  const audio = await client.textToSoundEffects.convert({
    text,
    durationSeconds: seconds,
    loop,
    modelId: "eleven_text_to_sound_v2",
    outputFormat: "mp3_44100_128",
  });
  save(id, await bytesOf(audio), 32);
  console.log(`${id}: done; run total ${(await credits()) - start} credits`);
}

if (process.argv.includes("--music")) {
  for (const [id, prompt, ms] of MUSIC) {
    if (has(id)) continue;
    // music is billed per generation; reserve a cautious share of the budget
    reserve(1000);
    const audio = await client.music.compose({
      prompt,
      musicLengthMs: ms,
      modelId: "music_v2_5",
      forceInstrumental: true,
    });
    save(id, await bytesOf(audio), 64);
    console.log(`${id}: done; run total ${(await credits()) - start} credits`);
  }
}

console.log(`Total: ${(await credits()) - start} credits`);
