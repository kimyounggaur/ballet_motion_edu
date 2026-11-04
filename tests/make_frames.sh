#!/bin/bash
# usage: make_frames.sh on|off   (renders every clip for one polish mode)
cd "$(dirname "$0")/.."
M=$1
python3 tests/render_clip.py shots/clips/demi_$M $M demi-plie 0 6 20 3.3 1.0 front
python3 tests/render_clip.py shots/clips/tendu_$M $M tendu 4 8 20
python3 tests/render_clip.py shots/clips/releve_$M $M releve 4 8.5 20
python3 tests/render_clip.py shots/clips/arab_$M $M arabesque 4 11.5 20
echo DONE $M
