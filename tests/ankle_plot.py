import json, sys, numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
fm.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
plt.rcParams['font.family'] = 'Noto Sans CJK KR'; plt.rcParams['axes.unicode_minus'] = False
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2])); out = sys.argv[3]
fig, axs = plt.subplots(2, 3, figsize=(16, 6.4))
def spd(xyz, t): return np.linalg.norm(np.gradient(np.array(xyz), t, axis=0), axis=1)
for r, (mv, w) in enumerate([('tendu', (8.2, 9.0)), ('arabesque', (10.8, 11.8))]):
    for d, col, lab in [(a, '#8a8090', 'v4 (이전)'), (b, '#a9475f', '3단계 (수정)')]:
        s = d[mv]; t = np.array(s['t'])
        axs[r, 0].plot(t, spd(s['A'], t), color=col, lw=1.6, label=lab)
        axs[r, 1].plot(t, spd(s['A'], t), color=col, lw=1.6, marker='o', ms=3, label=lab)
        axs[r, 2].plot(t, s['toe'], color=col, lw=1.6, marker='o', ms=3, label=lab)
    axs[r, 0].set_ylabel(mv); axs[r, 1].set_xlim(*w); axs[r, 2].set_xlim(*w)
    axs[r, 0].set_title('발목 속력 (m/카운트) — 전체' if r == 0 else '', fontsize=10)
    axs[r, 1].set_title('발목 속력 — 확대(60fps 샘플)' if r == 0 else '', fontsize=10)
    axs[r, 2].set_title('발가락 각도 (°) — 확대' if r == 0 else '', fontsize=10)
    for c in range(3): axs[r, c].grid(alpha=.25)
    # y-limits for zoom panels from data in window
    for c in (1,):
        ys = []
        for d in (a, b):
            t = np.array(d[mv]['t']); v = spd(d[mv]['A'], t); m = (t >= w[0]) & (t <= w[1]); ys += list(v[m])
        axs[r, c].set_ylim(0, max(ys) * 1.1)
axs[0, 0].legend(fontsize=9); plt.tight_layout(); plt.savefig(out, dpi=80)
