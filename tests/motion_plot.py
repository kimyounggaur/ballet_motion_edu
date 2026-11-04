import json, sys, numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
for f in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',):
    fm.fontManager.addfont(f)
plt.rcParams['font.family'] = 'Noto Sans CJK KR'
plt.rcParams['axes.unicode_minus'] = False
paths = sys.argv[1:-1]; out = sys.argv[-1]
D = [json.load(open(p)) for p in paths]
moves = ['demi-plie', 'releve', 'tendu', 'arabesque']
fig, axs = plt.subplots(len(moves), 3, figsize=(17, 3.1 * len(moves)), sharex='row')
def speed(xyz, t):
    a = np.array(xyz); v = np.gradient(a, t, axis=0); return np.linalg.norm(v, axis=1)
for r, m in enumerate(moves):
    for di, d in enumerate(D):
        s = d[m]; t = np.array(s['t']); col = ['#8a8090', '#a9475f'][min(di, 1)] if len(D) > 1 else '#a9475f'
        lab = ['v3', '2단계'][di] if len(D) > 1 else 'v3'
        axs[r, 0].plot(t, speed(s['hR'], t), color=col, lw=1.4, label=lab + ' 오른손끝')
        axs[r, 1].plot(t, speed(s['aR'], t), color=col, lw=1.4, label=lab + ' 오른발목')
        h = np.array(s['head']); axs[r, 2].plot(t, h[:, 1], color=col, lw=1.4, label=lab + ' 머리 피치')
        axs[r, 2].plot(t, h[:, 0], color=col, lw=1.0, ls='--', label=lab + ' 머리 요')
    axs[r, 0].set_ylabel(m); axs[r, 0].set_title('손끝 속력 (m/카운트)' if r == 0 else '', fontsize=10)
    axs[r, 1].set_title('발목 속력 (m/카운트)' if r == 0 else '', fontsize=10)
    axs[r, 2].set_title('머리 각도 (°)' if r == 0 else '', fontsize=10)
    for c in range(3): axs[r, c].grid(alpha=.25); axs[r, c].set_xlim(0, D[0][m]['total'])
axs[0, 0].legend(fontsize=8); axs[0, 2].legend(fontsize=7, ncol=2)
plt.tight_layout(); plt.savefig(out, dpi=80)
