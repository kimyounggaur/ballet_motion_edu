"""Stage 3 before/after video: v4 (left) vs stage 3 (right), side by side.
Frames come from render_clip2.py / render_clip3.py (shots/clips3/<key>_old|new). Zoomed close-ups ('z_*') were rendered at 60 fps and
are encoded at 15 fps (4x slower); each is followed by a strip with the toe angle (from clip_series.js, same sampling as the frames).
usage: python3 tests/compose_video3.py [outname.mp4]"""
import sys, json, pathlib, subprocess, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(__file__).resolve().parent.parent
clips = root / 'shots' / 'clips3'
FPS = 15
PW, PH = 666, 529                      # one panel
GAP = 12
W = PW * 2 + GAP
TOP, STRIP, FOOT = 64, 104, 86
H = TOP + PH + STRIP + FOOT
H += H % 2
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-%s.ttc'
def font(style, size): return ImageFont.truetype(F % style, size, index=1)
FT, FL, FC, FS, FX = font('Bold', 30), font('Regular', 26), font('Regular', 23), font('Bold', 21), font('Regular', 17)
FBIG, FMID = font('Bold', 46), font('Regular', 28)
INK, MUTE, ACC, BG, WARN, GRID = (38, 30, 42), (110, 100, 116), (169, 71, 95), (250, 247, 245), (204, 56, 48), (221, 214, 222)
OLDC = (120, 112, 128)

# key, title, caption lines, bpm, t0, fps_in, slow, kind
CLIPS = [
  dict(key='z_tendu', series='tendu', title='바뜨망 탄듀 · 발끝 튐 보정', bpm=66, t0=8.2, fin=60, slow=4, repeat=2, zoom=True,
       caps=['발을 닫는 순간(8.6박) 이전 버전은 발끝이 한 프레임 만에 {d0:.0f}° 꺾였습니다. 3단계는 같은 구간이 끊김 없이 이어집니다.',
             '아래 그래프 = 발가락 각도(°). 이전 버전의 수직 절벽(빨간 점)이 3단계에서는 완만한 곡선이 됩니다.']),
  dict(key='z_arab', series='arabesque', title='아라베스크 · 발끝 튐 보정', bpm=60, t0=11.0, fin=60, slow=4, repeat=2, zoom=True,
       caps=['다리를 내려 발끝을 바닥에 댈 때(11.2박) 이전 버전은 발끝이 한 프레임 만에 {d0:.0f}° 꺾였습니다.',
             '3단계는 접촉 직전부터 미리 풀려서 같은 구간이 부드럽게 이어집니다. (옆 시점 · 그래프 = 발가락 각도)']),
  dict(key='grand', title='그랑 플리에 · 팔다리 스키닝 + 튜튜', bpm=60, t0=5.5, fin=15, slow=1, repeat=1, zoom=False,
       caps=['무릎·팔꿈치가 꺾일 때 다리·팔의 살이 마디 없이 이어지고(스키닝), 튜튜가 다리와 팔에 밀려 비켜섭니다.',
             '튜튜는 켜고 끌 수 있습니다(모션창 칩 · 위에서 볼 때는 자동으로 흐려짐).']),
  dict(key='full', title='아라베스크 전체 흐름 · 튜튜', bpm=60, t0=4.0, fin=15, slow=1, repeat=1, zoom=False,
       caps=['다리를 들어 올리면 뒤쪽 치마가 밀려 올라가고, 골반 기울기를 따라 같이 기웁니다.',
             '스커트는 동작 이력 없이 그 순간의 자세로만 계산되어 재생·스크럽 어디서나 같은 모양입니다.']),
]

def strip_img(ts, vs, lo, hi, idx, color, mark_idx, label, t0, t1, w=PW, h=STRIP):
    S = 2
    im = Image.new('RGB', (w * S, h * S), BG); d = ImageDraw.Draw(im)
    L, R, T, B = 52 * S, 14 * S, 24 * S, 16 * S
    X = lambda t: L + (t - t0) / (t1 - t0) * (w * S - L - R)
    Y = lambda v: T + (hi - v) / (hi - lo) * (h * S - T - B)
    d.line([(L, Y(0)), (w * S - R, Y(0))], fill=GRID, width=S)
    d.text((6 * S, 3 * S), label, fill=MUTE, font=ImageFont.truetype(F % 'Regular', 15 * S, index=1))
    small = ImageFont.truetype(F % 'Regular', 13 * S, index=1)
    d.text((L - 6 * S, Y(0)), '0°', fill=MUTE, font=small, anchor='rm')
    d.text((L - 6 * S, Y(lo + (hi - lo) * 0.08)), f'{lo:.0f}°', fill=MUTE, font=small, anchor='rm')
    pts = [(X(t), Y(v)) for t, v in zip(ts, vs)]
    light = tuple(int(c * 0.35 + 255 * 0.65) for c in color)
    d.line(pts, fill=light, width=3 * S, joint='curve')
    d.line(pts[:idx + 1], fill=color, width=3 * S, joint='curve')
    for mi in mark_idx:
        x, y = pts[mi]
        d.ellipse((x - 7 * S, y - 7 * S, x + 7 * S, y + 7 * S), outline=WARN, width=2 * S)
    x, y = pts[idx]
    d.line([(x, T - 4 * S), (x, h * S - B)], fill=(*color,), width=S)
    d.ellipse((x - 5 * S, y - 5 * S, x + 5 * S, y + 5 * S), fill=color)
    return im.resize((w, h), Image.LANCZOS)

out = root / 'shots' / 'vid3'; shutil.rmtree(out, ignore_errors=True); out.mkdir(parents=True)
n = 0
def save(im):
    global n
    im.save(out / f'{n:05d}.png'); n += 1
def hold(im, sec):
    for _ in range(int(round(FPS * sec))): save(im)

# ---- intro card
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
d.text((48, 70), '3단계: 팔다리 스키닝 · 튜튜 · 발끝 튐 보정', fill=INK, font=FBIG)
d.text((48, 140), '왼쪽 = 지금 게시된 v4   /   오른쪽 = 새 버전 (아직 게시 전)', fill=ACC, font=FMID)
items = ['① 탄듀·아라베스크에서 발끝이 한 프레임에 15~18° 꺾이던 튐 제거 (슬로모션 4배, 확대)',
         '② 무릎·팔꿈치가 꺾일 때 마디 없이 이어지는 팔다리 스키닝 (그랑 플리에)',
         '③ 다리·팔과 부딪히며 비켜서는 튜튜 (아라베스크 전체 흐름)']
for k, s in enumerate(items): d.text((48, 240 + 58 * k), s, fill=INK, font=FL)
d.text((48, 240 + 58 * 3 + 20), '재생·확대·시점 전환은 그대로이며, 튜튜는 칩으로 끌 수 있습니다.', fill=MUTE, font=FC)
hold(im, 3.0)

# ---- clips
for c in CLIPS:
    a, b = sorted((clips / f"{c['key']}_old").glob('*.png')), sorted((clips / f"{c['key']}_new").glob('*.png'))
    m = min(len(a), len(b))
    if m == 0: print('missing', c['key']); continue
    step = (c['bpm'] / 60.0) / c['fin']
    t_list = [c['t0'] + i * step for i in range(m)]
    if c['zoom']:
        so = json.load(open(clips / f"zseries_{c['series']}_old.json")); sn = json.load(open(clips / f"zseries_{c['series']}_new.json"))
        to_, tn_ = np.array(so['toe']), np.array(sn['toe'])
        k = min(m, len(to_), len(tn_)); assert k == m, (k, m)
        dstep = np.abs(np.diff(to_))
        marks = [int(i + 1) for i in np.where(dstep > 13.0)[0]]       # one-frame toe snaps in the old build
        d0 = float(dstep.max())
        lo, hi = float(min(to_.min(), tn_.min())) - 4, float(max(to_.max(), tn_.max())) + 6
        print(c['key'], 'old toe snaps at frames', marks, 'step max %.1f deg; new step max %.1f deg' % (d0, np.abs(np.diff(tn_)).max()))
    for rep in range(c['repeat']):
        last = None
        for i in range(m):
            im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
            pa, pb = Image.open(a[i]).convert('RGB'), Image.open(b[i]).convert('RGB')
            if pa.size != (PW, PH): pa = pa.resize((PW, PH), Image.LANCZOS)
            if pb.size != (PW, PH): pb = pb.resize((PW, PH), Image.LANCZOS)
            im.paste(pa, (0, TOP)); im.paste(pb, (PW + GAP, TOP))
            d.text((16, 14), c['title'], fill=INK, font=FT)
            d.text((PW - 4, 22), '이전 (v4)', fill=MUTE, font=FL, anchor='ra')
            d.text((PW + GAP + 16, 22), '3단계', fill=ACC, font=FL)
            t = t_list[i]
            d.text((W - 16, 22), f'{t:4.2f}박' + (f'  ·  1/{c["slow"]} 속도' if c['slow'] > 1 else ''), fill=MUTE, font=FL, anchor='ra')
            if c['zoom']:
                for mi in marks:
                    if mi - 1 <= i <= mi + 3:
                        txt = f'발끝 튐  {dstep[mi - 1]:.0f}° / 1프레임'
                        tw = d.textlength(txt, font=FS)
                        d.rounded_rectangle((16, TOP + 14, 16 + tw + 24, TOP + 14 + 38), radius=9, fill=WARN)
                        d.text((28, TOP + 20), txt, fill=(255, 255, 255), font=FS)
                y0 = TOP + PH + 4
                im.paste(strip_img(t_list, to_, lo, hi, i, OLDC, marks, '발가락 각도 · 이전', t_list[0], t_list[-1]), (0, y0))
                im.paste(strip_img(t_list, tn_, lo, hi, i, ACC, [], '발가락 각도 · 3단계', t_list[0], t_list[-1]), (PW + GAP, y0))
                cap_y = TOP + PH + STRIP + 12
                caps = [s.format(d0=d0) for s in c['caps']]
            else:
                cap_y = TOP + PH + 14
                caps = c['caps']
            for k2, cap in enumerate(caps):
                d.text((16, cap_y + 32 * k2), cap, fill=MUTE, font=FC)
            save(im); last = im
        hold(last, 0.5 if rep + 1 < c['repeat'] else 0.7)
print('frames', n, '=', round(n / FPS, 1), 's')
dst = root / 'shots' / (sys.argv[1] if len(sys.argv) > 1 else 'ballet_stage3_before_after.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(out / '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', str(dst)], check=True)
print(dst, dst.stat().st_size // 1024, 'KB', f'{W}x{H}')
