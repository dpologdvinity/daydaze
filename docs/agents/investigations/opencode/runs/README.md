# docs/agents/investigations/opencode/runs

Output of the free-model benchmark. `../run.sh` works in `/tmp/oc-bench` and appends one line per model and task to `results.txt`; only that summary is kept here, not the per-model working folders.

## Files

| File | What it does |
| --- | --- |
| `results.txt` | One line per run: `<model> <task> rc=<exit code> <seconds>s <score>`. The score is `PASS` or `FAIL` for the code and bug-fix tasks, and `-` for review and vision, which are judged by reading the output. The file ends with `BENCH-DONE` |

## Notes

- Read the results with the interpreted table in [`../README.md`](../README.md); `rc=0` only means opencode exited cleanly.
