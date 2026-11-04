"""Stage 4 before/after video: published v5 (left) vs new solver (right), side by side.
Frames: shots/s4/{S,P}_{old,new} (render_clip2.py, 60 fps sampling); strips from shots/s4/zseries_*.json (clip_series4.js, same sampling).
Slow motion = each 60 fps frame shown for 2 output frames at 30 fps (1/4 speed); real speed = every 2nd frame at 30 fps.
usage: python3 tests/compose_video4.py [outname.mp4]"""
import sys, json, pathlib, subprocess, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(__file__).resolve().parent.parent
sd = root / 'shots' / 's4'
FPS = 30
PW, PH = 666, 529
GAP = 12
W = PW * 2 + GAP
TOP, STRIP, FOOT = 64, 104, 86
H = TOP + PH + STRIP + FOOT
H += H % 2
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-%s.ttc'
def font(style, size): return ImageFont.truetype(F % style, size, index=1)
FT, FL, FC, FS = font('Bold', 30), font('Regular', 26), font('Regular', 23), font('Bold', 21)
FBIG, FMID = font('Bold', 46), font('Regular', 28)
INK, MUTE, ACC, BG, WARN, GRID = (38, 30, 42), (110, 100, 116), (169, 71, 95), (250, 247, 245), (204, 56, 48), (221, 214, 222)
OLDC = (120, 112, 128)

def strip_img(ts, vs, lo, hi, idx, color, mark_idx, label, unit, t0, t1, w=PW, h=STRIP):
    S = 2
    im = Image.new('RGB', (w * S, h * S), BG); d = ImageDraw.Draw(im)
    L, R, T, B = 60 * S, 14 * S, 36 * S, 14 * S
    X = lambda t: L + (t - t0) / (t1 - t0) * (w * S - L - R)
    Y = lambda v: T + (hi - v) / (hi - lo) * (h * S - T - B)
    if lo < 0 < hi: d.line([(L, Y(0)), (w * S - R, Y(0))], fill=GRID, width=S)
    d.text((6 * S, 3 * S), label, fill=MUTE, font=ImageFont.truetype(F % 'Regular', 15 * S, index=1))
    small = ImageFont.truetype(F % 'Regular', 13 * S, index=1)
    for v in (hi, lo): d.text((L - 6 * S, Y(v)), f'{v:g}{unit}', fill=MUTE, font=small, anchor='rm')
    if lo < 0 < hi: d.text((L - 6 * S, Y(0)), f'0{unit}', fill=MUTE, font=small, anchor='rm')
    pts = [(X(t), Y(v)) for t, v in zip(ts, vs)]
    light = tuple(int(c * 0.35 + 255 * 0.65) for c in color)
    d.line(pts, fill=light, width=3 * S, joint='curve')
    d.line(pts[:idx + 1], fill=color, width=3 * S, joint='curve')
    for mi in mark_idx:
        x, y = pts[mi]; d.ellipse((x - 7 * S, y - 7 * S, x + 7 * S, y + 7 * S), outline=WARN, width=2 * S)
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
def badge(d, x, y, txt):
    tw = d.textlength(txt, font=FS)
    d.rounded_rectangle((x, y, x + tw + 24, y + 38), radius=9, fill=WARN); d.text((x + 12, y + 6), txt, fill=(255, 255, 255), font=FS)

# ---- intro card
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
d.text((48, 70), '4단계: 기본 포지션 · 떨림과 단발 튐 제거', fill=INK, font=FBIG)
d.text((48, 140), '왼쪽 = 지금 게시된 v5   /   오른쪽 = 새 버전 (아직 게시 전)', fill=ACC, font=FMID)
items = ['① 4·5번 포지션을 유지하는 동안 무릎이 프레임마다 최대 14mm 폭으로 떨리던 현상 제거 (슬로모션 1/4, 확대)',
         '② 3번으로 닫는 순간(10박) 골반이 한 프레임에 1.8° 튀던 것 제거 (슬로모션 1/4)',
         '③ 모든 포지션 유지 구간에서 두 다리가 정확히 곧게 펴진 채로 정지']
for k, s in enumerate(items): d.text((48, 240 + 58 * k), s, fill=INK, font=FL)
d.text((48, 240 + 58 * 3 + 20), '오른발이 바닥을 쓸며 닫힐 때의 발목 꺾임은 이번 단계에서 건드리지 않았습니다 (마지막 장 참고).', fill=MUTE, font=FC)
hold(im, 3.5)

def clip(key, title, caps, t0, step, mode, lo, hi, unit, label, series_fn, marks_fn=None, badge_fn=None, repeat=1, tail=0.6):
    a, b = sorted((sd / f'{key}_old').glob('*.png')), sorted((sd / f'{key}_new').glob('*.png'))
    m = min(len(a), len(b)); assert m > 0, key
    so = json.load(open(sd / f'zseries_{key}_old.json')); sn = json.load(open(sd / f'zseries_{key}_new.json'))
    vo, vn = np.array(series_fn(so)), np.array(series_fn(sn)); assert len(vo) >= m and len(vn) >= m
    ts = [t0 + i * step for i in range(m)]
    marks = marks_fn(vo[:m]) if marks_fn else []
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
            d.text((PW - 4, 22), '이전 (v5)', fill=MUTE, font=FL, anchor='ra'); d.text((PW + GAP + 16, 22), '4단계', fill=ACC, font=FL)
            d.text((W - 16, 22), f'{ts[i]:5.2f}박' + ('  ·  1/4 속도' if mode == 'slow' else '  ·  실제 속도'), fill=MUTE, font=FL, anchor='ra')
            if badge_fn:
                txt = badge_fn(i, marks)
                if txt: badge(d, 16, TOP + 14, txt)
            y0 = TOP + PH + 4
            im.paste(strip_img(ts, vo[:m], lo, hi, i, OLDC, marks, f'{label} · 이전', unit, ts[0], ts[-1]), (0, y0))
            im.paste(strip_img(ts, vn[:m], lo, hi, i, ACC, [], f'{label} · 4단계', unit, ts[0], ts[-1]), (PW + GAP, y0))
            cap_y = TOP + PH + STRIP + 12
            for k2, cap in enumerate(caps): d.text((16, cap_y + 32 * k2), cap, fill=MUTE, font=FC)
            for _ in range(2 if mode == 'slow' else 1): save(im)
            last = im
        hold(last, tail if rep + 1 == repeat else 0.4)

STEP = (66 / 60.0) / 60
clip('S', '4번 포지션 유지 · 무릎 떨림 제거',
     ['이전 버전은 4번 포지션을 유지하는 동안(14~16박) 다리가 프레임마다 흔들렸습니다 (무릎 최대 14mm 폭).',
      '새 버전은 같은 구간에서 두 다리가 정확히 멈춰 있습니다. 아래 그래프 = 오른 무릎의 좌우 성분(mm).'],
     13.8, STEP, 'slow', 54, 76, 'mm', '오른 무릎 좌우 위치', lambda s: np.array(s['KR'])[:, 0],
     badge_fn=lambda i, marks: '무릎 떨림 · 최대 14mm 폭' if i >= 26 else None, tail=0.8)
clip('S', '같은 구간 · 실제 속도로 보면',
     ['실제 속도(30fps로 재생)에서는 이전 버전의 다리가 계속 떨리는 것처럼 보이고, 새 버전은 정지합니다.',
      '(슬로모션이 아닌 1배속 · 그래프는 위와 같은 오른 무릎의 좌우 위치)'],
     13.8, STEP, 'real', 54, 76, 'mm', '오른 무릎 좌우 위치', lambda s: np.array(s['KR'])[:, 0], repeat=2)
def roll_marks(v): return [int(i + 1) for i in np.where(np.abs(np.diff(v)) > 1.0)[0]]
d0 = 1.8
clip('P', '3번으로 닫는 순간(10박) · 골반 튐 제거',
     ['이전 버전은 발이 닫히는 순간 골반 기울기가 한 프레임에 1.8° 튀었습니다(골반 높이도 3~4mm 단차).',
      '새 버전은 닫히기 직전 약 1/4박 동안 자연스럽게 기웁니다. 그래프 = 골반 기울기(°).'],
     9.7, STEP, 'slow', -1.6, 0.8, '°', '골반 기울기', lambda s: s['roll'], marks_fn=roll_marks,
     badge_fn=lambda i, marks: f'골반 튐  {d0:.1f}° / 1프레임' if marks and marks[0] - 1 <= i <= marks[0] + 4 else None, tail=0.8)

# ---- outro card
def wrap(txt, fnt, maxw, dd):
    out, cur = [], ''
    for word in txt.split(' '):
        trial = (cur + ' ' + word).strip()
        if dd.textlength(trial, font=fnt) <= maxw: cur = trial
        else: out.append(cur); cur = word
    if cur: out.append(cur)
    return out
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
d.text((48, 56), '이번 단계에서 남은 것 (정직한 한계)', fill=INK, font=FBIG)
items = [('오른발이 바닥을 쓸며 닫힐 때 발목이 한 프레임에 4~11mm 꺾이는 지점이 남아 있습니다.',
          ['기본 포지션 약 8곳이고 탄듀·아라베스크에도 있으며, 이전 버전과 같은 값입니다(바닥 접촉 보정 구간).',
           '원인: 발끝이 바닥을 뚫지 않도록 다리를 바깥으로 내미는 보정이 가파르게 켜지고 꺼집니다.']),
         ('이 보정을 부드럽게 바꾸는 두 가지 시도는 되돌렸습니다.',
          ['보정을 끄고 발을 항상 풀어 주기: 탄듀에서 발 각도가 한 프레임에 44° 튐.',
           '보정 가중치를 두기: 발끝이 바닥을 1.6~5mm 뚫고 탄듀 발목 꺾임이 약 3배로 커짐.']),
         ('다음 단계 후보: 발이 뾰족에서 평평으로 넘어가는 구간의 발 경로를 다시 설계하기.',
          ['승인된 탄듀·아라베스크 동작이 달라질 수 있어 영향 점검이 필요합니다.'])]
y = 170
for head, subs in items:
    for ln in wrap(head, FL, W - 120, d):
        d.text((48, y), ('· ' if ln is head or True else '') + ln if False else ln, fill=INK, font=FL); y += 38
    for sub in subs:
        for ln in wrap(sub, FC, W - 140, d):
            d.text((72, y), ln, fill=MUTE, font=FC); y += 32
    y += 22
hold(im, 6.0)
print('frames', n, '=', round(n / FPS, 1), 's')
dst = root / 'shots' / (sys.argv[1] if len(sys.argv) > 1 else 'ballet_stage4_before_after.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(out / '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', str(dst)], check=True)
print(dst, dst.stat().st_size // 1024, 'KB', f'{W}x{H}')
