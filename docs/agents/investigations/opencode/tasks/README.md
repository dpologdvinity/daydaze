# docs/agents/investigations/opencode/tasks

The fixed inputs of the free-model benchmark in [`../README.md`](../README.md). `../run.sh` copies each task into a scratch folder per model, gives every model the same prompt, and scores the code and bug-fix tasks with `node --test`.

## Files

| File | What it does |
| --- | --- |
| `zoo.png` | Game screenshot for the vision task (count animals, read sign text and button labels) |

## Subfolders

| Folder | Task | Contents |
| --- | --- | --- |
| `code/` | Implement `formatDuration` in `duration.ts` so the test passes | `duration.ts` (a stub that throws) and `duration.test.ts` |
| `bugfix/` | Fix the bug in `inventory.ts` without editing the test | `inventory.ts` (stack-limited `add`) and `inventory.test.ts` |
| `review/` | Review a diff for planted bugs | `change.diff` and `ANSWER.txt`, which lists the two planted bugs (a lost `price <= 0` guard, an unvalidated `parseInt` from storage) |

## Notes

- Do not "fix" these files: the stubs and planted bugs are the point. A run passes only if the test file is unchanged and the test passes.
