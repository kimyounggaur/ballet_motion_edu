#!/bin/bash
cd "$(dirname "$0")/.."
python3 tests/render_clip2.py shots/clips3/tendu_old ballet3d_v4_test.html on tendu 8.0 9.2 60 2.0 0.35 front
python3 tests/render_clip2.py shots/clips3/tendu_new ballet3d_test.html on tendu 8.0 9.2 60 2.0 0.35 front
python3 tests/render_clip2.py shots/clips3/grand_old ballet3d_v4_test.html on grand-plie 5.5 10.5 15 3.0 0.75 q34
python3 tests/render_clip2.py shots/clips3/grand_new ballet3d_test.html on grand-plie 5.5 10.5 15 3.0 0.75 q34
echo LANE_A_DONE
