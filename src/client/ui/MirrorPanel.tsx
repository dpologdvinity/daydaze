// The closet's Mirror: the face, makeup, hair, body and outfit tabs inside the
// dressing room drawer. Split out of Overlay.tsx and loaded with the first
// time the drawer opens, so the first load stays small.

import { encodeWear, recolor, wearOf } from "../../game/wardrobe.ts";
import { WardrobePicker } from "./WardrobePicker.tsx";
import type { ClosetSave } from "../../game/closet.ts";
import { activeTier, allows } from "../../game/age.ts";
import { Fragment, type ReactNode } from "react";
import {
  FIGURES,
  PIERCING_SPOTS,
  PIERCING_STYLES,
  encodePiercings,
  piercingsOf,
  EYE_SHAPES,
  FACE_SHAPES,
  LIP_SHAPES,
  NOSES,
  BLUSHES,
  GLOSSES,
  HIGHLIGHTERS,
  FRECKLES,
  LIMB_SPOTS,
  LIMB_STYLES,
  encodeLimbs,
  limbsOf,
  VITILIGO,
  BIRTHMARKS,
  GLASSES,
  BINDIS,
  HEARING_AIDS,
  LINERS,
  SHADOW_STYLES,
  STRENGTHS,
  encodeMakeup,
  makeupOf,
  type Makeup,
  EYE_COLORS,
  EYESHADOWS,
  FACE_SLIDERS,
  encodeFace,
  faceOf,
  type Face,
  HAIR_COLORS,
  HAIR_STYLES,
  LIPS,
  LIP_LINERS,
  LIP_STYLES,
  OUTFIT_COLORS,
  OUTFITS,
  SHOES,
  isShoe,
  SKINS,
  SWIMSUITS,
  type Look,
  type SwimLook,
  PRONOUNS,
  BEARDS,
  BODIES,
  bodyOf,
} from "../../game/look.ts";
import { INTENSITIES, type Intensity } from "../../game/effects/buzz.ts";
import {
  BODY_LABELS,
  BODY_TRAITS,
  clampTrait,
  type BodyShape,
} from "../../game/body.ts";
import { wearable } from "../../game/shop.ts";
import { GAITS, gaitOf } from "../../game/gaits.ts";
import {
  Chips,
  ColorPicker,
  Segmented,
  Slider,
  Swatches,
  Tiles,
} from "./controls.tsx";
import { BrowPicker } from "./BrowPicker.tsx";
import { BROW_COLORS, browColor } from "../../game/brows.ts";

const PRONOUN_CHIPS = [
  { id: "", label: "None shown" },
  ...PRONOUNS.map((p) => ({ id: p, label: p })),
];

const EFFECT_LEVELS = INTENSITIES.map((id) => ({
  id,
  label: id === "off" ? "Off" : id === "low" ? "Low" : "Full",
}));

const HIGH_AUDIO_CHIPS = [
  { id: "on", label: "On" },
  { id: "off", label: "Off" },
] as const;

/**
 * The closet's tabs, in order. Face and makeup frame the camera on the face;
 * the rest show the full doll.
 */
export const MIRROR_TABS = [
  { id: "face", label: "Face" },
  { id: "makeup", label: "Makeup" },
  { id: "hair", label: "Hair" },
  { id: "body", label: "Body" },
  { id: "outfit", label: "Outfit" },
] as const;
/** One of the closet tab ids from MIRROR_TABS. */
export type MirrorTab = (typeof MIRROR_TABS)[number]["id"];

export function Mirror({
  tab,
  setTab,
  look,
  setLook,
  swim,
  setSwim,
  wardrobe,
  body,
  setBody,
  closet,
  setCloset,
  effects,
  setEffects,
  highAudio = true,
  setHighAudio,
}: {
  tab: MirrorTab;
  setTab: (tab: MirrorTab) => void;
  look: Look;
  setLook: (look: Look) => void;
  swim: SwimLook;
  setSwim: (swim: SwimLook) => void;
  wardrobe: readonly string[];
  body: BodyShape;
  setBody: (body: BodyShape) => void;
  closet: ClosetSave;
  setCloset: (closet: ClosetSave) => void;
  effects: Intensity;
  setEffects: (effects: Intensity) => void;
  highAudio?: boolean;
  setHighAudio?: ((highAudio: boolean) => void) | undefined;
}) {
  const face = faceOf(look);
  const makeup = makeupOf(look);
  const piercings = piercingsOf(look);
  const setMakeup = (next: Makeup) =>
    setLook({ ...look, makeup: encodeMakeup(next) });
  const setFace = (next: Face) => setLook({ ...look, face: encodeFace(next) });
  const tabs: Record<MirrorTab, ReactNode> = {
    face: (
      <>
        <section>
          <h3>Skin</h3>
          <Swatches
            label="Skin tone"
            options={SKINS}
            value={look.skin}
            onPick={(skin) => setLook({ ...look, skin })}
          />
          <Segmented
            label="Vitiligo"
            options={VITILIGO}
            value={makeup.vitiligo}
            onPick={(vitiligo) => setMakeup({ ...makeup, vitiligo })}
            className="strength"
          />
          <Chips
            label="Birthmark"
            options={BIRTHMARKS}
            value={makeup.birthmark}
            onPick={(birthmark) => setMakeup({ ...makeup, birthmark })}
          />
        </section>
        <section>
          <h3>Face shape</h3>
          <Tiles
            label="Face shape"
            options={FACE_SHAPES}
            value={face.faceShape}
            onPick={(faceShape) => setFace({ ...face, faceShape })}
            tiles="face"
          />
        </section>
        <section>
          <h3>Eyes</h3>
          <Tiles
            label="Eye shape"
            options={EYE_SHAPES}
            value={face.eyeShape}
            onPick={(eyeShape) => setFace({ ...face, eyeShape })}
            tiles="eye"
          />
          <ColorPicker
            label="Eye color"
            options={EYE_COLORS}
            value={face.eyeColor}
            onPick={(eyeColor) => setFace({ ...face, eyeColor })}
          />
        </section>
        <section>
          <h3>Nose</h3>
          <Tiles
            label="Nose"
            options={NOSES}
            value={face.noseShape}
            onPick={(noseShape) => setFace({ ...face, noseShape })}
            tiles="nose"
          />
        </section>
        <section>
          <h3>Lips</h3>
          <Tiles
            label="Lip shape"
            options={LIP_SHAPES}
            value={face.lipShape}
            onPick={(lipShape) => setFace({ ...face, lipShape })}
            tiles="lips"
          />
        </section>
        <section>
          <h3>Fine tune</h3>
          {FACE_SLIDERS.map((s) => (
            <Slider
              key={s.id}
              label={s.label}
              value={face[s.id]}
              min={-1}
              max={1}
              step={0.1}
              onChange={(v) => setFace({ ...face, [s.id]: v })}
            />
          ))}
        </section>
      </>
    ),
    makeup: (
      <>
        <section>
          <h3>Lipstick</h3>
          <ColorPicker
            label="Lipstick"
            options={LIPS}
            value={look.lips}
            onPick={(lips) => setLook({ ...look, lips })}
          />
          <Tiles
            label="Lip finish"
            options={GLOSSES}
            value={makeup.gloss}
            onPick={(gloss) => setMakeup({ ...makeup, gloss })}
            tiles="gloss"
          />
          <p className="tiles-label">Lip liner</p>
          <Chips
            label="Lip liner"
            options={LIP_LINERS}
            value={makeup.lipLiner}
            onPick={(lipLiner) => setMakeup({ ...makeup, lipLiner })}
          />
          <p className="tiles-label">Lip style</p>
          <Chips
            label="Lip style"
            options={LIP_STYLES}
            value={makeup.lipStyle}
            onPick={(lipStyle) => setMakeup({ ...makeup, lipStyle })}
          />
        </section>
        <section>
          <h3>Eyes</h3>
          <ColorPicker
            label="Eyeshadow"
            options={EYESHADOWS}
            value={look.shadow}
            onPick={(shadow) => setLook({ ...look, shadow })}
          />
          <Tiles
            label="Eyeshadow style"
            options={SHADOW_STYLES}
            value={makeup.shadowStyle}
            onPick={(shadowStyle) => setMakeup({ ...makeup, shadowStyle })}
            tiles="shadow"
          />
          <Tiles
            label="Eyeliner"
            options={LINERS}
            value={makeup.liner}
            onPick={(liner) => setMakeup({ ...makeup, liner })}
            tiles="liner"
          />
          <p className="tiles-label">Brows</p>
          <BrowPicker
            value={look.brows}
            color={browColor(look)}
            onPick={(brows) => setLook({ ...look, brows })}
          />
          <ColorPicker
            label="Brow color"
            options={BROW_COLORS}
            value={browColor(look)}
            onPick={(color) => setLook({ ...look, browColor: color })}
          />
        </section>
        <section>
          <h3>Cheeks</h3>
          <ColorPicker
            label="Blush"
            options={BLUSHES}
            value={makeup.blush}
            onPick={(blush) => setMakeup({ ...makeup, blush })}
          />
          <Segmented
            label="Blush strength"
            options={STRENGTHS}
            value={makeup.blushStrength}
            onPick={(blushStrength) => setMakeup({ ...makeup, blushStrength })}
            className="strength"
          />
          <ColorPicker
            label="Highlighter"
            options={HIGHLIGHTERS}
            value={makeup.highlight}
            onPick={(highlight) => setMakeup({ ...makeup, highlight })}
          />
          <Segmented
            label="Freckles"
            options={FRECKLES}
            value={makeup.freckles}
            onPick={(freckles) => setMakeup({ ...makeup, freckles })}
            className="strength"
          />
        </section>
        <section>
          <h3>Glasses</h3>
          <Chips
            label="Glasses"
            options={GLASSES}
            value={makeup.glasses}
            onPick={(glasses) => setMakeup({ ...makeup, glasses })}
          />
        </section>
        <section>
          <h3>Bindi and hearing aids</h3>
          <Chips
            label="Bindi"
            options={BINDIS}
            value={makeup.bindi}
            onPick={(bindi) => setMakeup({ ...makeup, bindi })}
          />
          <Chips
            label="Hearing aids"
            options={HEARING_AIDS}
            value={makeup.hearing}
            onPick={(hearing) => setMakeup({ ...makeup, hearing })}
          />
        </section>
        <section>
          <h3>Piercings</h3>
          {PIERCING_SPOTS.map((spot) => (
            <Fragment key={spot.id}>
              <p className="tiles-label">{spot.label}</p>
              <Tiles
                label={`${spot.label} piercing`}
                options={wearable(PIERCING_STYLES, wardrobe)}
                value={piercings[spot.id]}
                onPick={(style) =>
                  setLook({
                    ...look,
                    piercings: encodePiercings({
                      ...piercings,
                      [spot.id]: style,
                    }),
                  })
                }
                tiles={`pierce-${spot.id}`}
              />
            </Fragment>
          ))}
        </section>
      </>
    ),
    hair: (
      <>
        <section>
          <h3>Style</h3>
          <Tiles
            label="Hair style"
            options={wearable(HAIR_STYLES, wardrobe)}
            value={look.hairStyle}
            onPick={(hairStyle) => setLook({ ...look, hairStyle })}
            tiles="hair"
          />
        </section>
        <section>
          <h3>Color</h3>
          <ColorPicker
            label="Hair color"
            options={HAIR_COLORS}
            value={look.hairColor}
            onPick={(hairColor) => setLook({ ...look, hairColor })}
          />
        </section>
      </>
    ),
    body: (
      <>
        <section>
          <h3>Build</h3>
          <Chips
            label="Build"
            options={BODIES}
            value={bodyOf(look)}
            onPick={(build) => setLook({ ...look, body: build })}
          />
          <Chips
            label="Facial hair"
            options={BEARDS}
            value={look.beard ?? "none"}
            onPick={(beard) => {
              // none drops the key: validateLook refuses an undefined field
              const { beard: _, ...rest } = look;
              setLook(beard === "none" ? rest : { ...rest, beard });
            }}
          />
        </section>
        <section>
          <h3>Walk</h3>
          <Chips
            label="Walk style"
            options={GAITS}
            value={gaitOf(look.gait).id}
            onPick={(gait) => setLook({ ...look, gait })}
          />
        </section>
        <section>
          <h3>Limbs</h3>
          {LIMB_SPOTS.map((spot) => (
            <Chips
              key={spot.id}
              label={spot.label}
              options={LIMB_STYLES}
              value={limbsOf(look)[spot.id]}
              onPick={(style) => {
                const limbs = { ...limbsOf(look), [spot.id]: style };
                // all natural drops the key: validateLook refuses an undefined field
                const { limbs: _, ...rest } = look;
                setLook(
                  Object.values(limbs).every((l) => l === "natural")
                    ? rest
                    : { ...rest, limbs: encodeLimbs(limbs) },
                );
              }}
            />
          ))}
        </section>
        <section>
          <h3>Pronouns</h3>
          <Chips
            label="Pronouns"
            options={PRONOUN_CHIPS}
            value={look.pronouns ?? ""}
            onPick={(pronouns) => {
              // none drops the key: validateLook refuses an undefined field
              const { pronouns: _, ...rest } = look;
              setLook(pronouns ? { ...rest, pronouns } : rest);
            }}
          />
        </section>
        <section>
          <h3>Figure</h3>
          <Tiles
            label="Figure"
            options={FIGURES}
            value={face.figure}
            onPick={(figure) => setFace({ ...face, figure })}
            tiles="figure"
          />
          {BODY_TRAITS.map((trait) => (
            <Slider
              key={trait}
              label={BODY_LABELS[trait]}
              value={body[trait]}
              onChange={(value) =>
                setBody({ ...body, [trait]: clampTrait(value) })
              }
            />
          ))}
        </section>
      </>
    ),
    outfit: (
      <>
        <section>
          <h3>Outfit</h3>
          <Tiles
            label="Outfit"
            tiles="outfit"
            options={wearable(OUTFITS, wardrobe)}
            value={look.outfit}
            onPick={(outfit) => {
              // a whole outfit goes on over any mix
              const { wear: _mixed, ...rest } = look;
              setLook({ ...rest, outfit });
            }}
          />
          <ColorPicker
            label="Outfit color"
            options={OUTFIT_COLORS}
            value={look.outfitColor}
            onPick={(outfitColor) =>
              setLook({
                ...look,
                outfitColor,
                // and dyes every garment of a mix
                ...(look.wear
                  ? { wear: encodeWear(recolor(wearOf(look), outfitColor)) }
                  : {}),
              })
            }
          />
        </section>
        <WardrobePicker
          look={look}
          setLook={setLook}
          wardrobe={wardrobe}
          closet={closet}
          setCloset={setCloset}
        />
        <section>
          <h3>Shoes</h3>
          <Chips
            label="Shoes"
            options={[
              { id: "outfit", label: "With the outfit" },
              ...wearable(SHOES, wardrobe),
            ]}
            value={look.shoes ?? "outfit"}
            onPick={(pick) => {
              const { shoes: _old, ...rest } = look;
              setLook(isShoe(pick) ? { ...rest, shoes: pick } : rest);
            }}
          />
        </section>
        <section>
          <h3>Swimsuit</h3>
          <Tiles
            label="Swimsuit"
            tiles="swim"
            options={SWIMSUITS}
            value={swim.style}
            onPick={(style) => setSwim({ ...swim, style })}
          />
          <ColorPicker
            label="Swimsuit color"
            options={OUTFIT_COLORS}
            value={swim.color}
            onPick={(color) => setSwim({ ...swim, color })}
          />
        </section>
        {allows(activeTier(), "alcohol") && (
          <section>
            <h3>Drunk effects</h3>
            <Chips
              label="Drunk effects"
              options={EFFECT_LEVELS}
              value={effects}
              onPick={setEffects}
            />
          </section>
        )}
        {allows(activeTier(), "drugs") && setHighAudio && (
          <section>
            <h3>High audio</h3>
            <Chips
              label="High audio"
              options={HIGH_AUDIO_CHIPS}
              value={highAudio ? "on" : "off"}
              onPick={(v) => setHighAudio(v === "on")}
            />
          </section>
        )}
      </>
    ),
  };
  return (
    <>
      <div className="mirror-tabs" role="tablist" aria-label="Closet">
        {MIRROR_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`mirror-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="mirror-panel"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        id="mirror-panel"
        className="mirror-panel"
        role="tabpanel"
        aria-labelledby={`mirror-tab-${tab}`}
      >
        {tabs[tab]}
      </div>
    </>
  );
}
