"""Stage 4 before/after figure (positions @ 60 fps, polish on).  usage: python3 tests/s4_plot.py [out.png]"""
import json, sys, pathlib, numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.lines import Line2D
root = pathlib.Path(__file__).resolve().parent.parent
fm.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'); fm.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
plt.rcParams.update({'font.family': 'Noto Sans CJK JP', 'axes.unicode_minus': False})
SURF, INK, INK2, MUTE, GRID, BAND = '#fcfcfb', '#0b0b0b', '#52514e', '#8a8984', '#e7e6e2', '#f1f0ec'
NEW, OLD = '#2a78d6', '#eb6834'        # categorical slots 1 and 2 (validated: all checks pass)
L = lambda p: json.load(open(root / 'shots' / 's4' / p))
old, new = L('pos_old_p1.json'), L('pos_new_p1.json')
t = np.array(old['t']); assert np.allclose(t, new['t'])
def d2(a): a = np.asarray(a); return np.linalg.norm(a[2:] - 2 * a[1:-1] + a[:-2], axis=1)
def rows(s):
    return {'knee': np.maximum(d2(s['K']['R']), d2(s['K']['L'])), 'pelvis': d2(s['pp']), 'ankle': d2(s['A']['R'])}
ro, rn = rows(old), rows(new); tm = t[1:-1]
YMAX = 34
fig = plt.figure(figsize=(12.4, 13.6), dpi=140, facecolor=SURF)
gs = fig.add_gridspec(4, 2, height_ratios=[1, 1, 1, 1.35], hspace=0.66, wspace=0.2, left=0.075, right=0.975, top=0.835, bottom=0.075)
fig.text(0.075, 0.955, '기본 포지션 · 60fps 재생에서 프레임마다 꺾이는 정도', fontsize=19, fontweight='bold', color=INK, va='top')
fig.text(0.075, 0.925, '값 = 이웃한 세 프레임의 2차 차분 크기(mm). 클수록 한 프레임에 갑자기 꺾였다는 뜻이며, 매끄러운 동작은 1mm 안팎입니다.', fontsize=11.5, color=INK2, va='top')
fig.legend(handles=[Line2D([0], [0], color=OLD, lw=2.2, label='이전 (게시된 v5)'), Line2D([0], [0], color=NEW, lw=2.2, label='새 버전 (4단계 · 게시 전)')],
           loc='upper left', bbox_to_anchor=(0.068, 0.895), ncol=2, frameon=False, fontsize=12, labelcolor=INK, handlelength=2.2, columnspacing=2.2)
holds = [(6, 8, '2번'), (10, 12, '3번'), (14, 16, '4번'), (18, 20, '5번'), (22, 24, '1번')]
def style(ax):
    ax.set_facecolor(SURF)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    for s in ('left', 'bottom'): ax.spines[s].set_color(GRID)
    ax.tick_params(colors=INK2, labelsize=10, length=0); ax.grid(axis='y', color=GRID, lw=0.8); ax.set_axisbelow(True)
def stats(a, b, thr=3.0): return f'최대 {a.max():.1f} → {b.max():.1f} mm  ·  3mm 넘는 프레임 {int((a > thr).sum())} → {int((b > thr).sum())}개'
titles = {'knee': '무릎 (왼·오른 중 큰 쪽)', 'pelvis': '골반', 'ankle': '오른 발목 — 발이 바닥을 쓸며 닫히는 구간'}
for r, key in enumerate(['knee', 'pelvis', 'ankle']):
    ax = fig.add_subplot(gs[r, :]); style(ax)
    for a, b, n in holds:
        ax.axvspan(a, b, color=BAND, lw=0, zorder=0)
        if r == 0: ax.text((a + b) / 2, YMAX * 0.985, f'{n} 포지션 유지', ha='center', va='top', fontsize=9.5, color=MUTE)
    ax.plot(tm, ro[key], color=OLD, lw=1.3, zorder=3); ax.plot(tm, rn[key], color=NEW, lw=1.3, zorder=4)
    ax.set_xlim(0, 24); ax.set_ylim(0, YMAX); ax.set_xticks(range(0, 25, 2)); ax.set_yticks([0, 10, 20, 30])
    ax.set_ylabel('mm', color=INK2, fontsize=10, rotation=0, labelpad=14, va='center')
    ax.set_title(titles[key], loc='left', fontsize=12.5, fontweight='bold', color=INK, pad=7)
    ax.text(1.0, 1.045, stats(ro[key], rn[key]), transform=ax.transAxes, ha='right', va='bottom', fontsize=10.5, color=INK2)
    if r == 2: ax.set_xlabel('박(beat)', color=INK2, fontsize=10)
    else: ax.set_xticklabels([])
    if key == 'ankle':
        ax.text(12, YMAX * 0.80, '이번 단계에서 건드리지 않은 부분 — 두 버전의 값이 같아서 주황선이 파란선 뒤에 가려져 있습니다 (원인은 맨 아래 설명)', ha='center', va='top', fontsize=10, color=INK2)
# zooms
k0, k1 = np.searchsorted(t, 13.9), np.searchsorted(t, 15.1); h0 = np.searchsorted(t, 14.2)
axa = fig.add_subplot(gs[3, 0]); style(axa)
xo, xn = np.array(old['K']['R'])[:, 0], np.array(new['K']['R'])[:, 0]
axa.plot(t[k0:k1], xo[k0:k1], color=OLD, lw=1.3, marker='o', ms=3.4, zorder=3); axa.plot(t[k0:k1], xn[k0:k1], color=NEW, lw=1.8, marker='o', ms=3.4, zorder=4)
axa.set_xlim(13.9, 15.3); axa.set_ylim(59, 75)
axa.set_title('4번 포지션 유지 · 오른 무릎의 좌우 위치', loc='left', fontsize=12.5, fontweight='bold', color=INK, pad=24)
axa.text(0, 1.03, f'유지 구간(14.2박~)의 흔들림 폭  이전 {xo[h0:k1].max() - xo[h0:k1].min():.1f}mm → 새 버전 {xn[h0:k1].max() - xn[h0:k1].min():.1f}mm', transform=axa.transAxes, ha='left', va='bottom', fontsize=10.5, color=INK2)
axa.set_xlabel('박(beat)', color=INK2, fontsize=10); axa.set_ylabel('mm', color=INK2, fontsize=10, rotation=0, labelpad=14, va='center')
axa.text(15.12, 73.0, '새 버전', fontsize=10.5, color=INK, ha='left', va='center'); axa.text(15.12, 66.5, '이전', fontsize=10.5, color=INK, ha='left', va='center')
p0, p1 = np.searchsorted(t, 9.70), np.searchsorted(t, 10.30)
axb = fig.add_subplot(gs[3, 1]); style(axb)
ro_, rn_ = np.array(old['roll']), np.array(new['roll'])
axb.plot(t[p0:p1], ro_[p0:p1], color=OLD, lw=1.3, marker='o', ms=3.4, zorder=3); axb.plot(t[p0:p1], rn_[p0:p1], color=NEW, lw=1.8, marker='o', ms=3.4, zorder=4)
axb.set_xlim(9.7, 10.42); axb.set_ylim(-1.75, 1.0)
axb.axvline(10.0, color=MUTE, lw=0.9, ls=(0, (3, 3)), zorder=1); axb.text(10.012, 0.93, '10박 · 3번으로 닫히는 순간', fontsize=9.5, color=MUTE, va='top')
axb.set_title('3번으로 닫는 순간 · 골반 기울기', loc='left', fontsize=12.5, fontweight='bold', color=INK, pad=24)
axb.set_xlabel('박(beat)', color=INK2, fontsize=10); axb.set_ylabel('°', color=INK2, fontsize=10, rotation=0, labelpad=10, va='center')
i = np.argmax(np.abs(np.diff(ro_[p0:p1]))); j = np.argmax(np.abs(np.diff(rn_[p0:p1])))
axb.text(0, 1.03, f'한 프레임 최대 변화  이전 {abs(np.diff(ro_[p0:p1])[i]):.2f}° → 새 버전 {abs(np.diff(rn_[p0:p1])[j]):.2f}°', transform=axb.transAxes, ha='left', va='bottom', fontsize=10.5, color=INK2)
axb.text(10.36, 0.62, '새 버전', fontsize=10.5, color=INK, ha='left', va='center'); axb.text(9.74, -1.58, '이전', fontsize=10.5, color=INK, ha='left', va='center')
fig.text(0.075, 0.032, '오른 발목 행의 남은 꺾임은 발끝이 바닥을 뚫지 않도록 다리를 바깥으로 내미는 보정이 켜지고 꺼지는 지점에서 생기며(이전 버전·탄듀·아라베스크에도 동일), 이번 수정과 별개의 원인입니다.',
         fontsize=10, color=INK2, va='top')
out = root / 'shots' / (sys.argv[1] if len(sys.argv) > 1 else 'ballet_stage4_before_after.png')
fig.savefig(out, facecolor=SURF); print(out, out.stat().st_size // 1024, 'KB')
for k in ro: print(k, 'old max %.2f n>3 %d | new max %.2f n>3 %d' % (ro[k].max(), (ro[k] > 3).sum(), rn[k].max(), (rn[k] > 3).sum()))
print('roll step old %.3f new %.3f' % (np.abs(np.diff(ro_[p0:p1])).max(), np.abs(np.diff(rn_[p0:p1])).max()))
