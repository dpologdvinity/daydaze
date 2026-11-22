"""Self-check for the garment cutting and the leg-pull budget in doll_outfits.

    blender --background --factory-startup --python-exit-code 1 --python art/doll/blender/test_outfits.py

Arm holes and hems are cut where a field crosses a limit (clip), so they are
smooth curves and flat lines instead of rows of teeth; the leg skin that
garments draw in to the leg's axis (LEG_SHARE) must never be drawn past it
by the garments worn together.
"""

import importlib
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
outfits = importlib.import_module("doll_outfits")

# a unit square on the XY plane, one quad, weights one bone per corner pair
pos = np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], dtype=float)
wts = np.array([[1, 0], [0, 1], [0, 1], [1, 0]], dtype=float)
quad = [[0, 1, 2, 3]]

# cut where x > 0.25: the left quarter-width strip stays, with new vertices on
# the two edges the cut crosses, weights mixed by how far along they are
kept, kept_w, polys = outfits.clip(pos, wts, quad, pos[:, 0], 0.25)
assert len(polys) == 1 and len(polys[0]) == 4, f"expected one quad, got {polys}"
assert np.allclose(sorted(kept[:, 0]), [0, 0, 0.25, 0.25]), f"cut not on x = 0.25: {kept}"
assert np.allclose(kept_w.sum(axis=1), 1), f"weights no longer sum to one: {kept_w}"
cut = kept[:, 0] > 0.1
assert np.allclose(kept_w[cut][:, 1], 0.25), f"cut vertices not mixed 1/4 along: {kept_w[cut]}"

# a limit past every value cuts nothing; one below every value drops it all
whole, _w, polys = outfits.clip(pos, wts, quad, pos[:, 0], 1.0)
assert len(whole) == 4 and polys == [[0, 1, 2, 3]], "a limit nothing crosses changed the polygon"
none, _w, polys = outfits.clip(pos, wts, quad, pos[:, 0] + 2, 1.0)
assert len(none) == 0 and polys == [], "a polygon wholly over the limit was kept"

# two polygons sharing an edge share the vertex cut on it (no crack)
pos2 = np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [2, 0, 0], [2, 1, 0]], dtype=float)
wts2 = np.zeros((6, 2))
wts2[:, 0] = 1
kept2, _w, polys2 = outfits.clip(pos2, wts2, [[0, 1, 2, 3], [1, 4, 5, 2]], pos2[:, 0], 1.5)
assert len(polys2) == 2
ends = {tuple(np.round(kept2[i], 6)) for p in polys2 for i in p if kept2[i][0] > 1.2}
assert ends == {(1.5, 0.0, 0.0), (1.5, 1.0, 0.0)}, f"shared cut edge was split: {ends}"

# the roomy push: loose below, snug above, easing between
push = outfits.roomy(0.7, 0.9, 0.022, 0.01)
assert np.isclose(push(0.5), 0.022) and np.isclose(push(1.0), 0.01) and 0.01 < push(0.8) < 0.022

# the leg-pull shares of garments that can be worn on the same skin stay under 1
share = outfits.LEG_SHARE
for stack in (("Bottom", "Legwear", "Shoes"), ("Bottom", "Legwear", "Top", "Outer"), ("Dress", "Legwear", "Shoes")):
    total = sum(share[k] for k in stack)
    assert total < 1, f"{stack} draws the skin {total} of the way in: past the axis it shows through"
print("test_outfits: ok")
