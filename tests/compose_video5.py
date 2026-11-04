"""Stage 5 before/after video: published v6 (left) vs Stage-5 candidate (right), side by side.
Frames: shots/s5/{T,A}_{old,new} (render_clip3.py, WARM_FROM0=1, 60 fps sampling, 2x crop); strips from shots/s5/ser/{T,A}_{old,new}.json (clip_series5.js, same sampling).
Slow motion = each 60 fps frame shown for 2 output frames at 30 fps (1/4 speed); real speed = every 2nd frame at 30 fps.
usage: python3 tests/compose_video5.py [outname.mp4]"""
import sys, json, pathlib, subprocess, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(__file__).resolve().parent.parent
sd = root / 'shots' / 's5'
FPS = 30
PW, PH = 666, 529
GAP = 12
W = PW * 2 + GAP
TOP, STRIP, FOOT = 64, 90, 124
H = TOP + PH + 2 * STRIP + FOOT
H += H % 2
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-%s.ttc'
def font(style, size): return ImageFont.truetype(F % style, size, index=1)
FT, FL, FC, FS = font('Bold', 30), font('Regular', 26), font('Regular', 23), font('Bold', 21)
FBIG, FMID = font('Bold', 46), font('Regular', 28)
INK, MUTE, ACC, BG, WARN, AMBER, GRID = (38, 30, 42), (110, 100, 116), (169, 71, 95), (250, 247, 245), (204, 56, 48), (176, 108, 18), (221, 214, 222)
OLDC = (120, 112, 128)

def strip_img(ts, vs, lo, hi, idx, color, mark_idx, label, unit, t0, t1, w=PW, h=STRIP):
    S = 2
    im = Image.new('RGB', (w * S, h * S), BG); d = ImageDraw.Draw(im)
    L, R, T, B = 60 * S, 14 * S, 30 * S, 10 * S
    X = lambda t: L + (t - t0) / (t1 - t0) * (w * S - L - R)
    Y = lambda v: T + (hi - v) / (hi - lo) * (h * S - T - B)
    if lo < 0 < hi: d.line([(L, Y(0)), (w * S - R, Y(0))], fill=GRID, width=S)
    d.text((6 * S, 2 * S), label, fill=MUTE, font=ImageFont.truetype(F % 'Regular', 14 * S, index=1))
    small = ImageFont.truetype(F % 'Regular', 12 * S, index=1)
    for v in (hi, lo): d.text((L - 6 * S, Y(v)), f'{v:g}{unit}', fill=MUTE, font=small, anchor='rm')
    if lo < 0 < hi: d.text((L - 6 * S, Y(0)), f'0{unit}', fill=MUTE, font=small, anchor='rm')
    pts = [(X(t), Y(v)) for t, v in zip(ts, vs)]
    light = tuple(int(c * 0.35 + 255 * 0.65) for c in color)
    d.line(pts, fill=light, width=3 * S, joint='curve')
    d.line(pts[:idx + 1], fill=color, width=3 * S, joint='curve')
    for mi in mark_idx:
        x, y = pts[mi]; d.ellipse((x - 6 * S, y - 6 * S, x + 6 * S, y + 6 * S), outline=WARN, width=2 * S)
    x, y = pts[idx]
    d.line([(x, T - 4 * S), (x, h * S - B)], fill=(*color,), width=S)
    d.ellipse((x - 5 * S, y - 5 * S, x + 5 * S, y + 5 * S), fill=color)
    return im.resize((w, h), Image.LANCZOS)

out = sd / 'vid'; shutil.rmtree(out, ignore_errors=True); out.mkdir(parents=True)
n = 0
def save(im):
    global n
    im.save(out / f'{n:05d}.png'); n += 1
def hold(im, sec):
    for _ in range(int(round(FPS * sec))): save(im)
def badge(d, x, y, txt, color=WARN):
    tw = d.textlength(txt, font=FS)
    d.rounded_rectangle((x, y, x + tw + 24, y + 38), radius=9, fill=color); d.text((x + 12, y + 6), txt, fill=(255, 255, 255), font=FS)
def wrap(txt, fnt, maxw, dd):
    lines, cur = [], ''
    for word in txt.split(' '):
        trial = (cur + ' ' + word).strip()
        if dd.textlength(trial, font=fnt) <= maxw: cur = trial
        else: lines.append(cur); cur = word
    if cur: lines.append(cur)
    return lines

# ---- intro card
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
d.text((48, 70), '5단계: 오른 발목 튐 제거 (탄듀·아라베스크·포지션)', fill=INK, font=FBIG)
d.text((48, 140), '왼쪽 = 지금 게시된 v6   /   오른쪽 = 새 후보 (아직 게시 전)', fill=ACC, font=FMID)
items = ['① 탄듀: 뒤로 쓸고 닫는 동안 발목이 멈칫했다가 한 프레임에 최대 37mm씩 달려나가던 것을 정해 둔 경로 그대로의 부드러운 속도로 (슬로모션 1/4)',
         '② 아라베스크: 발이 바닥에 닿은 뒤 약 15프레임 멈췄다가 급가속하던 것을 일정한 속도로 (슬로모션 1/4)',
         '③ 대신 달라진 점도 함께 보여 드립니다: 발가락이 바닥을 쓰는 동안 눌려 말리고, 아라베스크 착지 뒤 발이 더 빨리 평평해집니다.']
y = 232
for s in items:
    for ln in wrap(s, FL, W - 110, d):
        d.text((48, y), ln, fill=INK, font=FL); y += 38
    y += 20
d.text((48, y + 8), '아래 그래프의 위쪽 = 발목 속도(mm/프레임), 아래쪽 = 발가락 각도 또는 발 각도(°). 영상은 처음부터 재생했을 때의 모습입니다.', fill=MUTE, font=FC)
hold(im, 4.5)

def runs(mask, pad):
    """contiguous True runs of a boolean array, widened by pad frames -> list of (start, end)"""
    res, i, m = [], 0, len(mask)
    while i < m:
        if mask[i]:
            j = i
            while j + 1 < m and mask[j + 1]: j += 1
            res.append((max(0, i - pad), min(m - 1, j + pad))); i = j + 1
        else: i += 1
    merged = []
    for a, b in res:
        if merged and a <= merged[-1][1] + 3: merged[-1] = (merged[-1][0], max(b, merged[-1][1]))
        else: merged.append((a, b))
    return merged

def clip(key, title, caps, t0, step, mode, spd_hi, s2, s2_lo, s2_hi, s2_unit, s2_label, badge_fn, repeat=1, tail=0.6):
    a, b = sorted((sd / f'{key}_old').glob('*.png')), sorted((sd / f'{key}_new').glob('*.png'))
    m = min(len(a), len(b)); assert m > 0, key
    so = json.load(open(sd / 'ser' / f'{key}_old.json')); sn = json.load(open(sd / 'ser' / f'{key}_new.json'))
    assert len(so['t']) >= m and len(sn['t']) >= m, (len(so['t']), len(sn['t']), m)
    spd = lambda s: np.r_[0, np.linalg.norm(np.diff(np.array(s['A']), axis=0), axis=1)][:m]
    d2 = lambda s: np.r_[0, np.linalg.norm(np.array(s['A'])[2:] - 2 * np.array(s['A'])[1:-1] + np.array(s['A'])[:-2], axis=1), 0][:m]
    vo, vn = spd(so), spd(sn); eo, en = d2(so), d2(sn)
    ao, an = np.array(s2(so))[:m], np.array(s2(sn))[:m]
    ts = [t0 + i * step for i in range(m)]
    ctx = dict(so=so, sn=sn, vo=vo, vn=vn, eo=eo, en=en, ao=ao, an=an, m=m, hit_o=runs(eo > 3, 2), hit_n=runs(en > 3, 2))
    marks = [int(i) for i in np.where(eo > 3)[0]]
    idxs = list(range(m)) if mode == 'slow' else list(range(0, m, 2))
    for rep in range(repeat):
        last = None
        for i in idxs:
            im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
            pa, pb = Image.open(a[i]).convert('RGB'), Image.open(b[i]).convert('RGB')
            if pa.size != (PW, PH): pa = pa.resize((PW, PH), Image.LANCZOS)
            if pb.size != (PW, PH): pb = pb.resize((PW, PH), Image.LANCZOS)
            im.paste(pa, (0, TOP)); im.paste(pb, (PW + GAP, TOP))
            d.text((16, 14), title, fill=INK, font=FT)
            d.text((PW - 4, 22), '이전 (v6)', fill=MUTE, font=FL, anchor='ra'); d.text((PW + GAP + 16, 22), '5단계 후보', fill=ACC, font=FL)
            d.text((W - 16, 22), f'{ts[i]:5.2f}박' + ('  ·  1/4 속도' if mode == 'slow' else '  ·  실제 속도'), fill=MUTE, font=FL, anchor='ra')
            bo, bn = badge_fn(i, ctx)
            if bo: badge(d, 16, TOP + 14, bo[0], bo[1])
            if bn: badge(d, PW + GAP + 16, TOP + 14, bn[0], bn[1])
            y0 = TOP + PH + 2
            im.paste(strip_img(ts, vo, 0, spd_hi, i, OLDC, marks, '발목 이동 속도 · 이전', 'mm', ts[0], ts[-1]), (0, y0))
            im.paste(strip_img(ts, vn, 0, spd_hi, i, ACC, [], '발목 이동 속도 · 후보', 'mm', ts[0], ts[-1]), (PW + GAP, y0))
            y1 = y0 + STRIP
            im.paste(strip_img(ts, ao, s2_lo, s2_hi, i, OLDC, [], f'{s2_label} · 이전', s2_unit, ts[0], ts[-1]), (0, y1))
            im.paste(strip_img(ts, an, s2_lo, s2_hi, i, ACC, [], f'{s2_label} · 후보', s2_unit, ts[0], ts[-1]), (PW + GAP, y1))
            cy = TOP + PH + 2 * STRIP + 10
            for cap in caps:
                for ln in wrap(cap, FC, W - 32, d):
                    d.text((16, cy), ln, fill=MUTE, font=FC); cy += 31
            for _ in range(2 if mode == 'slow' else 1): save(im)
            last = im
        hold(last, tail if rep + 1 == repeat else 0.4)

STEP_T = (66 / 60.0) / 60
STEP_A = (60 / 60.0) / 60

def badge_tendu(i, c):
    bo = bn = None
    for a0, b0 in c['hit_o']:
        if a0 <= i <= b0:
            bo = ('발목 멈칫 → 급가속', WARN)
    to, tn = c['ao'][i], c['an'][i]
    if tn < -20: bn = (f'발가락 눌림 {tn:+.0f}° (이전 {to:+.0f}°)', AMBER)
    return bo, bn

def badge_arab(i, c):
    bo = bn = None
    vo = c['vo']
    k0 = next((k for k in range(9, c['m']) if vo[k] < 2.5), None)          # first slow frame after touchdown
    if k0 is not None:
        k1 = k0
        while k1 + 1 < c['m'] and vo[k1 + 1] < 2.5: k1 += 1
        if k0 - 1 <= i <= k1 + 14: bo = ('발목 정체 → 급가속 (최대 %.0fmm/프레임)' % vo[k1:k1 + 20].max(), WARN)
    da = abs(np.diff(c['an'], prepend=c['an'][0]))[i]
    if da > 4: bn = (f'발이 빠르게 평평해짐 {da:.0f}°/프레임', AMBER)
    return bo, bn

clip('T', '탄듀 뒤로 쓸고 닫기 · 발목 속도',
     ['이전(왼쪽)은 발목이 멈칫하다 갑자기 달려나가는 구간이 두 번 있습니다(그래프의 높은 봉우리, 최대 37mm/프레임). 후보(오른쪽)는 정해 둔 경로 그대로 완만한 한 번의 속도 변화입니다.',
      '대신 후보는 발이 닫히는 동안 발가락이 눌려 말립니다(아래 그래프, 이전은 거의 +10°~0° 유지).'],
     8.0, STEP_T, 'slow', 40, lambda s: s['toe'], -70, 15, '°', '발가락 각도', badge_tendu, tail=0.8)
clip('T', '같은 구간 · 실제 속도로 보면',
     ['실제 속도(30fps로 재생)에서는 이전 버전의 발목이 두 번 툭 끊기는 것처럼 보이고, 후보는 이어서 미끄러집니다.',
      '(슬로모션이 아닌 1배속)'],
     8.0, STEP_T, 'real', 40, lambda s: s['toe'], -70, 15, '°', '발가락 각도', badge_tendu, repeat=2)
clip('A', '아라베스크 착지(11박)',
     ['이전(왼쪽)은 발이 닿은 뒤 발목이 약 15프레임 거의 멈췄다가 급가속합니다. 후보(오른쪽)는 일정한 속도로 이어집니다.',
      '대신 후보는 발이 닿은 직후 발 각도가 더 빠르게 낮아져 이전보다 빨리 평평해집니다(아래 그래프).'],
     10.85, STEP_A, 'slow', 25, lambda s: s['a'], -5, 80, '°', '발 각도', badge_arab, tail=0.8)
clip('A', '같은 구간 · 실제 속도로 보면',
     ['실제 속도(30fps로 재생)에서 이전 버전은 착지 뒤 발목이 멈췄다 튀어나가고, 후보는 이어서 미끄러집니다.',
      '(슬로모션이 아닌 1배속)'],
     10.85, STEP_A, 'real', 25, lambda s: s['a'], -5, 80, '°', '발 각도', badge_arab, repeat=2)

# ---- outro card
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
d.text((48, 50), '달라진 점과 남은 한계 (정직한 보고)', fill=INK, font=FBIG)
items = [('오른 발목 튐은 사라졌습니다 (처음부터 재생, 표준 설정):', ['탄듀 11.2 → 1.1mm · 아라베스크 6.7 → 1.6mm · 기본 포지션 9.3 → 1.0mm (60fps 이웃 프레임 2차 차분 최댓값)', '3mm를 넘는 프레임: 88개 → 0개. 플리에·그랑 플리에·를르베는 이전과 완전히 같습니다.']),
         ('대신 모양이 달라졌습니다:', ['쓸고 닫는 동안 발가락이 눌려 말림(−20°~−60°, 이전 +5°~+10°). 뒤 탄듀 끝점(9박)은 −33° (이전 +10°).', '옆(7·11박) 끝점은 이전과 같고 앞(5박)은 발가락 +10° → +1°입니다. 아라베스크 착지 뒤 발이 평평해지는 속도는 더 빨라졌습니다.']),
         ('남은 한계:', ['중간으로 건너뛴 직후 재생하면 균형 솔버의 이력(기존 특성, 골반 최대 7mm 차이) 때문에 아라베스크 이륙·착지(6박·11박)에서 발목이 최대 11mm 단차로 남을 수 있습니다(이전 9mm). 탄듀·포지션은 1.9mm 이하.']),
         ('다음 후보:', ['끝점에서 발가락을 펴 주는 보정(발목이 5~8mm 앞서도록 허용) · 이륙/착지 전환을 이력과 무관하게 만들기'])]
y = 150
for head, subs in items:
    d.text((48, y), head, fill=INK, font=FL); y += 38
    for sub in subs:
        for ln in wrap(sub, FC, W - 130, d):
            d.text((72, y), ln, fill=MUTE, font=FC); y += 31
    y += 14
hold(im, 8.0)
print('frames', n, '=', round(n / FPS, 1), 's')
dst = root / 'shots' / (sys.argv[1] if len(sys.argv) > 1 else 'ballet_stage5_before_after.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(out / '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', str(dst)], check=True)
print(dst, dst.stat().st_size // 1024, 'KB', f'{W}x{H}')
