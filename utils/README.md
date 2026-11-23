# utils

Browser-console and Node helpers for getting Mixamo animations onto disk with readable names. The downloaded FBX files feed the mocap pipeline (`art/doll/blender/mocap.py`, Mixamo FBX in the git-ignored `mixamo/` folder).

## Files

| File                          | What it does                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mixamo-bulk-download.js`     | Paste into the Mixamo browser console to download animations in bulk (individual animations or packs, 96 per page, pages 1 through 26, with resume and retry). Files are saved under each animation's description rather than Mixamo's name. Console controls: `mixamoDownloader.status()`, `stop()`, `listFailures()`, `clearProgress()`, `inspectModal()` |
| `mixamo-manifest-recorder.js` | Paste into the Mixamo console once per page load, then download by hand; each finished download is recorded as `{ savedName, description }`. `mixamoRecorder.save()` downloads `mixamo-manifest.json`, `mixamoRecorder.clear()` forgets the record                                                                                                          |
| `rename-mixamo-downloads.mjs` | Renames downloads to their descriptions using a recorder manifest: `node utils/rename-mixamo-downloads.mjs <dir> <dir>/mixamo-manifest.json [--apply] [--dupes-only]`. Dry run unless `--apply`; zips (packs) are skipped                                                                                                                                   |

## Notes

- These are one-off owner-side tools, not part of the build or tests.
- Run the rename script as a dry run first, and only on a folder that had no same-named files before the downloads.
