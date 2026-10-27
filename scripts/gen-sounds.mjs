// Generate the fixed Daydaze sound library offline; never ship the API key.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";

const sounds = [
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
const envFile = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const key =
  process.env.ELEVENLABS_API_KEY ??
  envFile.match(/^ELEVENLABS_API_KEY\s*=\s*["']?([^"'\s]+)["']?/m)?.[1];
if (!key) throw new Error("Set ELEVENLABS_API_KEY in the environment or .env");
const headers = { "xi-api-key": key };
async function usage() {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/user/subscription",
    { headers },
  );
  if (!response.ok)
    throw new Error(`Subscription request failed: ${response.status}`);
  return (await response.json()).character_count;
}
const ffmpeg =
  spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
const extension = ffmpeg ? "ogg" : "mp3";
mkdirSync("public/audio", { recursive: true });
const initial = await usage();
let reserved = 0;
for (const [id, text, duration, loop] of sounds) {
  if (
    existsSync(`public/audio/${id}.ogg`) ||
    existsSync(`public/audio/${id}.mp3`)
  )
    continue;
  // ElevenLabs publishes a cost of 40 credits per second for explicit durations.
  if (reserved + duration * 40 > 3000)
    throw new Error("Credit budget exhausted");
  reserved += duration * 40;
  const response = await fetch(
    "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        duration_seconds: duration,
        loop,
        model_id: "eleven_text_to_sound_v2",
      }),
    },
  );
  const current = await usage();
  const reported = response.headers.get("character-cost");
  console.log(
    `${id}: ${reported === null ? `up to ${duration * 40} estimated` : reported} credits; account counter +${current - initial}`,
  );
  if (!response.ok)
    throw new Error(
      `Generation failed: ${response.status} ${await response.text()}`,
    );
  const target = `public/audio/${id}.${extension}`;
  const data = Buffer.from(await response.arrayBuffer());
  if (!ffmpeg) writeFileSync(target, data);
  else {
    const temporary = `public/audio/${id}.tmp.mp3`;
    writeFileSync(temporary, data);
    const result = spawnSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-y",
        "-i",
        temporary,
        "-c:a",
        "libopus",
        "-b:a",
        "32k",
        target,
      ],
      { stdio: "inherit" },
    );
    if (result.status === 0) unlinkSync(temporary);
    else {
      if (existsSync(target)) unlinkSync(target);
      writeFileSync(`public/audio/${id}.mp3`, data);
      unlinkSync(temporary);
      console.log(`${id}: Opus unavailable; saved MP3`);
    }
  }
}
console.log(`Total: ${(await usage()) - initial} credits`);
