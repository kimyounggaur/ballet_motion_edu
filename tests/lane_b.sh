#!/bin/bash
cd "$(dirname "$0")/.."
python3 tests/render_clip2.py shots/clips3/arab_old ballet3d_v4_test.html on arabesque 10.6 11.8 60 2.2 0.3 side
python3 tests/render_clip2.py shots/clips3/arab_new ballet3d_test.html on arabesque 10.6 11.8 60 2.2 0.3 side
python3 tests/render_clip2.py shots/clips3/full_old ballet3d_v4_test.html on arabesque 4 11.5 15 3.6 0.85 side
python3 tests/render_clip2.py shots/clips3/full_new ballet3d_test.html on arabesque 4 11.5 15 3.6 0.85 side
echo LANE_B_DONE
