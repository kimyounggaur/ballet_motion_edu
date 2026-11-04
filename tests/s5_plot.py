"""Stage 5 before/after figure (60 fps, polish on, turnout 70).  usage: python3 tests/s5_plot.py [out.png]"""
import json, sys, pathlib, numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.lines import Line2D
root = pathlib.Path(__file__).resolve().parent.parent
fm.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'); fm.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
plt.rcParams.update({'font.family': 'Noto Sans CJK JP', 'axes.unicode_minus': False})
SURF, INK, INK2, MUTE, GRID, BAND = '#fcfcfb', '#0b0b0b', '#52514e', '#8a8984', '#e7e6e2', '#f1f0ec'
NEW, OLD = '#2a78d6', '#eb6834'
L = lambda mv, k: json.load(open(root / 'shots' / 's5' / f'{mv}_{k}.json'))
def d2(a):
    a = np.asarray(a); return np.linalg.norm(a[2:] - 2 * a[1:-1] + a[:-2], axis=1)
def style(ax):
    ax.set_facecolor(SURF)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    for s in ('left', 'bottom'): ax.spines[s].set_color(GRID)
    ax.tick_params(colors=INK2, labelsize=10, length=0); ax.grid(axis='y', color=GRID, lw=0.8); ax.set_axisbelow(True)
fig = plt.figure(figsize=(12.4, 14.6), dpi=140, facecolor=SURF)
gs = fig.add_gridspec(3, 1, hspace=0.72, left=0.075, right=0.975, top=0.842, bottom=0.378)
gs2 = fig.add_gridspec(1, 2, wspace=0.26, left=0.085, right=0.975, top=0.272, bottom=0.092)
fig.text(0.075, 0.962, '탄듀·아라베스크·포지션 · 오른 발목이 프레임마다 꺾이는 정도', fontsize=19, fontweight='bold', color=INK, va='top')
fig.text(0.075, 0.934, '값 = 60fps 재생에서 이웃한 세 프레임의 2차 차분 크기(mm). 클수록 한 프레임에 갑자기 꺾였다는 뜻이며, 매끄러운 동작은 1mm 안팎입니다.', fontsize=11.5, color=INK2, va='top')
fig.legend(handles=[Line2D([0], [0], color=OLD, lw=2.2, label='이전 (게시된 v6)'), Line2D([0], [0], color=NEW, lw=2.2, label='새 버전 (5단계 · 게시 전)')],
           loc='upper left', bbox_to_anchor=(0.068, 0.905), ncol=2, frameon=False, fontsize=12, labelcolor=INK, handlelength=2.2, columnspacing=2.2)
YMAX = 12.5
rows = [('tendu', '탄듀', [(4, 6), (8, 10), (12, 14)]), ('arabesque', '아라베스크', []), ('positions', '기본 포지션', [])]
for r, (mv, nm, _) in enumerate(rows):
    o, n = L(mv, 'old'), L(mv, 'new'); t = np.array(o['t']); tm = t[1:-1]
    do, dn = d2(o['A']), d2(n['A'])
    ax = fig.add_subplot(gs[r, 0]); style(ax)
    ax.plot(tm, do, color=OLD, lw=1.3, zorder=3); ax.plot(tm, dn, color=NEW, lw=1.3, zorder=4)
    ax.set_xlim(0, t[-1]); ax.set_ylim(0, YMAX); ax.set_xticks(range(0, int(t[-1]) + 1, 2)); ax.set_yticks([0, 3, 6, 9, 12])
    ax.axhline(3, color=MUTE, lw=0.8, ls=(0, (3, 3)), zorder=2)
    ax.set_ylabel('mm', color=INK2, fontsize=10, rotation=0, labelpad=14, va='center')
    ax.set_title(f'{nm} · 오른 발목', loc='left', fontsize=12.5, fontweight='bold', color=INK, pad=7)
    ax.text(1.0, 1.045, f'최대 {do.max():.1f} → {dn.max():.1f} mm  ·  3mm 넘는 프레임 {int((do > 3).sum())} → {int((dn > 3).sum())}개', transform=ax.transAxes, ha='right', va='bottom', fontsize=10.5, color=INK2)
    ax.text(t[-1] * 0.995, 3.25, '3mm', fontsize=9, color=MUTE, ha='right', va='bottom')
    ax.set_xlabel('박(beat)', color=INK2, fontsize=10)
# zoom a: arabesque landing, ankle horizontal speed
o, n = L('arabesque', 'old'), L('arabesque', 'new'); t = np.array(o['t'])
sp = lambda s: np.linalg.norm(np.diff(np.array(s['A'])[:, [0, 2]], axis=0), axis=1)
so, sn = sp(o), sp(n); i0, i1 = np.searchsorted(t, 10.85), np.searchsorted(t, 11.95)
axa = fig.add_subplot(gs2[0, 0]); style(axa)
tt = t[1:]
axa.plot(tt[i0:i1], so[i0:i1], color=OLD, lw=1.3, marker='o', ms=3.2, zorder=3); axa.plot(tt[i0:i1], sn[i0:i1], color=NEW, lw=1.8, marker='o', ms=3.2, zorder=4)
ymx = float(max(so[i0:i1].max(), sn[i0:i1].max())) * 1.08; axa.set_xlim(10.85, 11.95); axa.set_ylim(0, ymx)
axa.axvline(11.0, color=MUTE, lw=0.9, ls=(0, (3, 3)), zorder=1); axa.text(11.012, ymx * 0.985, '11박 · 발이 바닥에 닿음', fontsize=9.5, color=MUTE, va='top')
axa.set_title('아라베스크 · 발이 닿은 뒤 발목의 전진 속도', loc='left', fontsize=12.5, fontweight='bold', color=INK, pad=34)
axa.text(0, 1.02, '이전: 약 15프레임 거의 멈췄다가 다시 달려나감(정체→급가속)\n새 버전: 정해 둔 속도 그대로', transform=axa.transAxes, ha='left', va='bottom', fontsize=10, color=INK2)
axa.set_xlabel('박(beat)', color=INK2, fontsize=10); axa.set_ylabel('mm/프레임', color=INK2, fontsize=10, rotation=90, labelpad=8, va='center')
axa.text(11.62, 3.0, '이전', fontsize=10.5, color=INK, ha='left', va='center'); axa.text(11.62, 9.2, '새 버전', fontsize=10.5, color=INK, ha='left', va='center')
# zoom b: tendu toe angle through the move
o, n = L('tendu', 'old'), L('tendu', 'new'); t = np.array(o['t'])
axb = fig.add_subplot(gs2[0, 1]); style(axb)
axb.plot(t, o['toe'], color=OLD, lw=1.3, zorder=3); axb.plot(t, n['toe'], color=NEW, lw=1.8, zorder=4)
axb.set_xlim(4, 12.5); axb.set_ylim(-75, 25); axb.set_yticks([-60, -40, -20, 0, 20])
axb.axhline(0, color=MUTE, lw=0.8, zorder=1)
axb.set_title('탄듀 · 발가락 각도 (발에 대한 상대각)', loc='left', fontsize=12.5, fontweight='bold', color=INK, pad=34)
axb.text(0, 1.02, '새 버전: 바닥을 쓰는 동안 발가락이 눌려 말림(−20°~−60°)\n이전: +5°~+10° 유지', transform=axb.transAxes, ha='left', va='bottom', fontsize=10, color=INK2)
axb.set_xlabel('박(beat)', color=INK2, fontsize=10); axb.set_ylabel('°', color=INK2, fontsize=10, rotation=0, labelpad=10, va='center')
axb.annotate('뒤 탄듀 끝점(9박)\n새 버전 −33° (이전 +10°)', xy=(9.05, -33), xytext=(9.6, -62), fontsize=9.5, color=INK, ha='left', va='center', arrowprops=dict(arrowstyle='-', color=MUTE, lw=0.9))
axb.text(4.2, 18, '이전', fontsize=10.5, color=INK, ha='left', va='center'); axb.text(7.3, -66, '새 버전', fontsize=10.5, color=INK, ha='left', va='center')
fig.text(0.075, 0.058, '표준 턴아웃(총 140°)·부드러운 동작 켬, 처음부터 연속 재생했을 때의 값입니다. 턴아웃 120~160°, 부드러운 동작 끔에서도 같은 경향입니다.\n발목 꺾임은 사라진 대신, 발가락이 눌려 말리는 모양과 아라베스크 착지 직후 발이 평평해지는 속도가 이전과 달라졌습니다(아래 두 그래프).\n한계: 중간으로 건너뛴 직후 재생하면(균형 솔버의 이력 때문, 기존 특성) 탄듀·포지션은 1.9mm 이하지만 아라베스크 이륙·착지(6박·11박)에 최대 11mm 단차가 남을 수 있습니다(이전 9mm).',
         fontsize=10, color=INK2, va='top', linespacing=1.5)
out = root / 'shots' / (sys.argv[1] if len(sys.argv) > 1 else 'ballet_stage5_before_after.png')
fig.savefig(out, facecolor=SURF); print(out, out.stat().st_size // 1024, 'KB')
