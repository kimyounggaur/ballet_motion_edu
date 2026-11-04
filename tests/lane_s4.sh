#!/bin/bash
# Stage 4 clips: old = published v5 test build, new = rebuilt (roll solver).  frames at 60 fps.
cd "$(dirname "$0")/.."
rm -rf shots/s4/S_old shots/s4/S_new shots/s4/P_old shots/s4/P_new
python3 tests/render_clip2.py shots/s4/S_old ballet3d_v5_test.html on positions 13.8 15.4 60 1.75 0.42 front
python3 tests/render_clip2.py shots/s4/S_new ballet3d_test.html    on positions 13.8 15.4 60 1.75 0.42 front
python3 tests/render_clip2.py shots/s4/P_old ballet3d_v5_test.html on positions 9.7 10.3 60 1.55 0.72 front
python3 tests/render_clip2.py shots/s4/P_new ballet3d_test.html    on positions 9.7 10.3 60 1.55 0.72 front
echo LANE_S4_DONE
