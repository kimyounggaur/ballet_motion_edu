"""Compose before/after clips (frames from render_clip.py) into one side-by-side mp4."""
import sys, pathlib, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont
root = pathlib.Path(__file__).resolve().parent.parent
FPS = 20
CLIPS = [  # dir, title, caption, bpm, t0
  ('demi',   '드미 플리에 · 준비 팔',  '팔이 먼저 출발해 부드럽게 도착하고, 손목이 뒤따릅니다 · 머리와 눈이 손을 따라갑니다 · 가슴이 숨 쉽니다', 60, 0),
  ('tendu',  '바뜨망 탄듀',            '발은 빠르게 나가 부드럽게 도착하고, 돌아올 때는 잠시 머물렀다가 닫습니다', 66, 4),
  ('releve', '를르베',                 '플리에에서 바닥을 밀며 튕기듯 올라서고 끝에서 부드럽게 멈춥니다', 66, 4),
  ('arab',   '아라베스크',             '머리가 앞쪽 팔 쪽으로 돌고 시선이 손끝 너머를 봅니다', 60, 4),
]
FT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 30, index=1)
FL = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 26, index=1)
FC = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 24, index=1)
INK, MUTE, ACC, BG = (38, 30, 42), (110, 100, 116), (169, 71, 95), (250, 247, 245)
out = root / 'shots' / 'vid'; shutil.rmtree(out, ignore_errors=True); out.mkdir(parents=True)
n = 0
for key, title, cap, bpm, t0 in CLIPS:
    a, b = sorted((root / 'shots' / 'clips' / f'{key}_off').glob('*.png')), sorted((root / 'shots' / 'clips' / f'{key}_on').glob('*.png'))
    m = min(len(a), len(b))
    W, H = Image.open(a[0]).size
    top, foot, gap = 64, 58, 12
    SW, SH = W * 2 + gap, top + H + foot
    SW += SW % 2; SH += SH % 2
    for i in range(m):
        im = Image.new('RGB', (SW, SH), BG); d = ImageDraw.Draw(im)
        im.paste(Image.open(a[i]).convert('RGB'), (0, top)); im.paste(Image.open(b[i]).convert('RGB'), (W + gap, top))
        d.text((16, 14), title, fill=INK, font=FT)
        d.text((W - 4, 22), '이전 (v3)', fill=MUTE, font=FL, anchor='ra')
        d.text((W + gap + 16, 22), '2단계: 이징 · 시선 · 호흡', fill=ACC, font=FL)
        t = t0 + i * (bpm / 60.0) / FPS
        d.text((SW - 16, 22), f'{t:4.1f}박', fill=MUTE, font=FL, anchor='ra')
        d.text((16, top + H + 14), cap, fill=MUTE, font=FC)
        im.save(out / f'{n:05d}.png'); n += 1
    # a short hold on the last frame
    for _ in range(int(FPS * 0.4)):
        shutil.copy(out / f'{n - 1:05d}.png', out / f'{n:05d}.png'); n += 1
print('frames', n)
dst = root / 'shots' / 'ballet_polish_before_after.mp4'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(out / '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', str(dst)], check=True)
print(dst, dst.stat().st_size // 1024, 'KB')
