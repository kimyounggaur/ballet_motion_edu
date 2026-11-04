"""Compose the labelled 현재 / 리디자인 comparison sheet from shots/cmp2/{before,after}_*.png"""
from PIL import Image, ImageDraw, ImageFont
import pathlib, sys
S = pathlib.Path('shots/cmp2')
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'shots/compare_before_after.png')
FP = '/usr/share/fonts/opentype/noto/NotoSansCJK-{}.ttc'
def font(w, size): return ImageFont.truetype(FP.format(w), size, index=1)   # index 1 = Noto Sans CJK KR

BG, INK, INK2, LINE, ACC = (241, 238, 242), (31, 24, 35), (91, 81, 96), (217, 211, 220), (169, 71, 95)
CELL_W, CELL_H = 600, 750
cols = [  # name, crop (x0, y0, w, h), headline, sub
  ('a_front',     (562, 135, 800, 1000), '4번 포지션',   '정면'),
  ('b_arabesque', (460, 187, 700,  875), '아라베스크',   '3/4 각도'),
  ('c_side',      (540, 220, 720,  900), '그랑 플리에',  '측면'),
  ('d_face',      (370,   5, 944, 1180), '얼굴·상체',    '클로즈업'),
]
rows = [('before', '현재', 'v2 관절 마네킹', INK), ('after', '리디자인', '1단계 · 발레리나', ACC)]
M, LW, G = 56, 210, 18
HEAD_H, COLHEAD_H, FOOT_H = 150, 70, 200
W = M + LW + len(cols) * CELL_W + (len(cols) - 1) * G + M
H = HEAD_H + COLHEAD_H + len(rows) * CELL_H + (len(rows) - 1) * G + FOOT_H
im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)

d.text((M, 44), '발레 기본기 3D · 피규어 리디자인 1단계', font=font('Bold', 50), fill=INK)
d.text((M, 108), '현재(v2)와 리디자인을 같은 포즈 · 같은 카메라 · 같은 구도로 비교 (HUD와 보조선은 숨김)', font=font('Regular', 27), fill=INK2)

x0 = M + LW
for ci, (name, box, head, sub) in enumerate(cols):
    x = x0 + ci * (CELL_W + G)
    d.text((x + 4, HEAD_H + 8), head, font=font('Bold', 32), fill=INK)
    hw = d.textlength(head, font=font('Bold', 32))
    d.text((x + 4 + hw + 14, HEAD_H + 16), sub, font=font('Regular', 24), fill=INK2)

mask = Image.new('L', (CELL_W, CELL_H), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, CELL_W - 1, CELL_H - 1), radius=26, fill=255)
for ri, (tag, label, sub, colr) in enumerate(rows):
    y = HEAD_H + COLHEAD_H + ri * (CELL_H + G)
    # row label, vertically centred
    ly = y + CELL_H // 2 - 48
    d.text((M, ly), label, font=font('Bold', 44), fill=colr)
    d.text((M, ly + 62), sub, font=font('Regular', 24), fill=INK2)
    for ci, (name, (bx, by, bw, bh), head, sub2) in enumerate(cols):
        x = x0 + ci * (CELL_W + G)
        src = Image.open(S / f'{tag}_{name}.png').convert('RGB').crop((bx, by, bx + bw, by + bh)).resize((CELL_W, CELL_H), Image.LANCZOS)
        im.paste(src, (x, y), mask)
        d.rounded_rectangle((x, y, x + CELL_W - 1, y + CELL_H - 1), radius=26, outline=LINE, width=2)

fy = HEAD_H + COLHEAD_H + len(rows) * CELL_H + (len(rows) - 1) * G + 38
f1, f2 = font('Bold', 26), font('Regular', 26)
def line(y, head, body):
    d.text((M, y), head, font=f1, fill=ACC)
    d.text((M + d.textlength(head, font=f1) + 18, y), body, font=f2, fill=INK2)
line(fy, '달라진 점', '이음매 없는 몸통·목  /  하이컷 레오타드(스트랩·암홀)  /  핑크 타이츠·슬리퍼  /  얼굴·헤어라인·번  /  손가락  /  스튜디오 조명')
line(fy + 46, '그대로', '동작 데이터와 균형 계산(관절 각도·무게중심)')
line(fy + 92, '아직 없음', '동작 보간·시선·호흡  /  스커트  /  팔다리 일체형 스키닝(지금은 분절 + 관절 반지름 맞춤)')
im.save(OUT, optimize=True)
print(OUT, im.size, OUT.stat().st_size // 1024, 'KB')
