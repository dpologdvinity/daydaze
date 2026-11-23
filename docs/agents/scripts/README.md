# docs/agents/scripts

Shell and Python helpers for running many agents in parallel git worktrees. They are described in the workflow in [`../README.md`](../README.md) and the rules in [`../../../AGENTS.md`](../../../AGENTS.md).

## Files

| File | What it does |
| --- | --- |
| `setup-git.sh` | Run once per clone: raises git's ref lock timeouts (`core.filesRefLockTimeout`, `core.packedRefsTimeout`) so parallel fetches from several worktrees do not fail with "cannot lock ref" |
| `land.sh` | `land.sh <branch> <worktree-name> <message>`: pushes the branch, opens its PR (reusing one that exists), turns on auto-merge, waits for GitHub to merge it, then removes the worktree and the local and remote branch. No local verify; it stops with a message on a conflict, a failed check or a refused auto-merge |
| `keepboth.sh` | `keepboth.sh <files...>`: resolves additive merge conflicts by deleting the conflict markers, keeping both sides |
| `union_assets.py` | `union_assets.py <file>`: resolves merge conflicts in a Markdown table by keeping both sides' rows without duplicates |

## Notes

- `land.sh` never pushes to `main` directly; the merge gate is GitHub's. Pull the branch (`git pull --no-rebase`) before pushing it yourself.
- Check the result of `keepboth.sh` and `union_assets.py`: they are only right when both sides of every conflict are meant to stay.
