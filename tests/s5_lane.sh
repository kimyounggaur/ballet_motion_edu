#!/bin/bash
# usage: s5_lane.sh old|new   (renders the tendu back stroke, then the arabesque landing, one version)
export WARM_FROM0=1
cd /tmp/claude-0/-home-claude/f5f5a00f-4cae-5447-acd5-192de1b09e95/scratchpad
if [ "$1" = old ]; then P=ballet3d_v6_test.html; else P=ballet3d_test.html; fi
python3 tests/render_clip3.py shots/s5/T_$1 $P on tendu 8.0 10.2 60 2.2 0.45 side 20 170 452 359
python3 tests/render_clip3.py shots/s5/A_$1 $P on arabesque 10.85 12.0 60 2.8 0.5 side 20 160 452 359
echo LANE-$1-DONE
