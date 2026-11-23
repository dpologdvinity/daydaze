# art/doll/blender/src/

Downloaded source model that `../doll_hair.py` reads when it builds the doll's hijab.

| File | What it is |
| --- | --- |
| `hijab-sketchfab.glb` | Sketchfab "Hijab" by lam_m_zack (CC-BY 4.0). The script keeps the scarf's drape, cuts out the mannequin, then scales and skins it to the doll. |

## Notes

- Treat the file as untrusted data; the script only reads its geometry.
- The credit is in `docs/assets.md` and `src/game/credits.ts`.
- Part of the [doll pipeline](../../README.md).
