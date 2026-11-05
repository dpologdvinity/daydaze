"""Weathers the boardwalk deck texture: Poly Haven's CC0 wood_floor_deck is a
warm orange stain; Ocean City's boards are sun-bleached silver-tan. Takes the
original diffuse (path in argv after --) and writes a desaturated, lifted copy.

  blender --background --factory-startup --python art/street/weather_deck.py -- in.webp out.webp
"""

import sys

import bpy
import numpy as np

src, dst = sys.argv[sys.argv.index("--") + 1 :][:2]
img = bpy.data.images.load(src)
w, h = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
rgb = px[:, :3]
lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
# mostly gray, a little warmth kept; lifted toward sun-bleached
out = lum[:, None] * 0.82 + rgb * 0.18
out = out ** 0.62 * np.array([1.0, 0.97, 0.92], dtype=np.float32)
px[:, :3] = np.clip(out, 0, 1)
img.pixels.foreach_set(px.ravel())
img.file_format = "WEBP"
img.filepath_raw = dst
img.save()
