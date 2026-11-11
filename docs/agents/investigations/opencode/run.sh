#!/usr/bin/env bash
# Runs every free opencode model on four small tasks; scores code/bugfix by node --test.
cd /tmp/oc-bench
MODELS="glm-5.3-flash-free deepseek-v4.1-flash-free mimo-v2.6-flash-free flint-40b-free beam-free nemotron-3.5-lightning-free nemotron-3.5-super-vl-free nemotron-3-ultra-free big-pickle"
P_CODE="Implement formatDuration in duration.ts so that duration.test.ts passes. Run: node --experimental-strip-types --test duration.test.ts . Only edit duration.ts. Reply with one line: DONE or FAILED."
P_BUG="inventory.test.ts fails. Find and fix the bug in inventory.ts (do not change the test). Run: node --experimental-strip-types --test inventory.test.ts . Reply with one sentence naming the bug, then DONE or FAILED."
P_REV="Review change.diff (TypeScript game code) as a strict code reviewer. List every bug or risk with a concrete failing input and the fix. Be brief. Do not edit files."
P_VIS="Look at the attached game screenshot zoo.png. Answer briefly: 1) which animal species are visible and how many of each, 2) the exact text on any signs, 3) the labels of the buttons in the top-right and bottom-left. Do not guess: say 'unclear' if you cannot read something."
for m in $MODELS; do
  for t in code bugfix review vision; do
    d=runs/$m/$t; rm -rf $d; mkdir -p $d
    case $t in code) cp tasks/code/* $d; p=$P_CODE;; bugfix) cp tasks/bugfix/* $d; p=$P_BUG;; review) cp tasks/review/change.diff $d; p=$P_REV;; vision) cp tasks/zoo.png $d; p=$P_VIS;; esac
    s=$(date +%s)
    if [ $t = vision ]; then (cd $d && timeout 600 opencode run -m opencode/$m -f zoo.png -- "$p" > out.txt 2>&1); else (cd $d && timeout 600 opencode run -m opencode/$m --dir . "$p" > out.txt 2>&1); fi
    rc=$?; e=$(( $(date +%s) - s ))
    score=-
    case $t in code) (cd $d && cmp -s duration.test.ts ../../../tasks/code/duration.test.ts && node --experimental-strip-types --test duration.test.ts >/dev/null 2>&1) && score=PASS || score=FAIL;;
      bugfix) (cd $d && node --experimental-strip-types --test inventory.test.ts >/dev/null 2>&1 && cmp -s inventory.test.ts ../../../tasks/bugfix/inventory.test.ts) && score=PASS || score=FAIL;; esac
    echo "$m $t rc=$rc ${e}s $score" | tee -a results.txt
  done
done
echo BENCH-DONE >> results.txt
