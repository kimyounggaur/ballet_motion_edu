#!/bin/bash
cd "$(dirname "$0")/.."
python3 tests/render_clip3.py shots/clips3/z_tendu_new ballet3d_test.html on tendu 8.2 8.9 60 2.0 0.3 side 40 170 380 302
python3 tests/render_clip3.py shots/clips3/z_arab_new ballet3d_test.html on arabesque 11.0 11.55 60 2.2 0.3 side 40 170 380 302
python3 tests/render_clip2.py shots/clips3/grand_new ballet3d_test.html on grand-plie 5.5 10.5 15 3.5 0.8 q34
echo LANE_D_DONE
