#!/bin/bash
# land.sh <branch> <worktree-name> <message>: rebase onto main, verify ON GITHUB
# (push to ci/land-<w>-<sha>, wait for verify.yml), merge only if green.
# No local verify, so the owner's machine stays free. Cleanup only after a real merge.
b=$1; w=$2; msg=$3; M=${DAYDAZE_MAIN:-$HOME/git/daydaze}; d=$M/.worktrees/$w
[ -d $d ] || { git -C $M worktree add -q $d $b && ln -s $M/node_modules $d/node_modules; }
cd $d || exit 1
[ -z "$(git status --porcelain)" ] || { echo "$w DIRTY: $(git status --porcelain | head -3 | tr '\n' ' ')"; exit 1; }
if ! git rebase main > /tmp/land-$w-rebase.log 2>&1; then git rebase --abort; echo "$w CONFLICT $(grep -o 'Merge conflict in .*' /tmp/land-$w-rebase.log | tr '\n' ' ')"; exit 1; fi
ref=ci/land-$w-$(git rev-parse --short HEAD)
git push -q origin HEAD:refs/heads/$ref 2>&1 | grep -v "^remote:"
id=""; for i in $(seq 1 30); do id=$(gh run list --workflow verify.yml --branch $ref -L 1 --json databaseId -q '.[0].databaseId'); [ -n "$id" ] && break; sleep 5; done
[ -n "$id" ] || { echo "$w NO-CI-RUN on $ref"; exit 1; }
if ! gh run watch $id --exit-status > /dev/null 2>&1; then echo "$w VERIFY-FAIL on GitHub run $id: $(gh run view $id --log-failed 2>/dev/null | grep -E 'error|✖|not ok' | head -3 | cut -c1-200 | tr '\n' ' ')"; exit 1; fi
if git -C $M merge-base --is-ancestor main $b && git -C $M merge --no-ff -q $b -m "Merge branch '$b': $msg"; then
  git -C $M push -q origin main 2>&1 | grep -v "^remote:"
  echo "$w MERGED $(git -C $M log --oneline -1 | cut -c1-9) (GitHub verify run $id)"
  # main's own ci and Tests runs: a red main comes before landing anything else
  sleep 15; gh run list --branch main -L 3 --json workflowName,status,url -q '.[] | "  main: \(.workflowName) \(.status) \(.url)"'
  cd $M && git worktree remove --force $d && git branch -D $b > /dev/null
else echo "$w NOT-MERGED (main moved during CI; rerun)"; fi
