"""union_assets.py <file>: resolve merge conflicts in a markdown table by keeping both sides' rows (no duplicates)."""
import sys
path = sys.argv[1]
out, seen, inside = [], set(), False
for line in open(path, encoding="utf-8").read().split("\n"):
    if line.startswith(("<<<<<<< ", ">>>>>>> ")) or line == "=======":
        inside = not line.startswith(">>>>>>> ")
        continue
    if inside and line in seen:
        continue
    seen.add(line); out.append(line)
open(path, "w", encoding="utf-8").write("\n".join(out))
