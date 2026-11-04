"""Filmstrip of one move at several times, polish off vs on. usage: python3 tests/pol_strip.py OUT.png move cam camR camY t1,t2,... """
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
here = pathlib.Path(__file__).parent
out, move, cam, camR, camY, ts = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), [float(x) for x in sys.argv[6].split(',')]
crop = tuple(int(x) for x in sys.argv[7].split(',')) if len(sys.argv) > 7 else None
OFF = {"com": False, "knee": False, "angles": False, "trail": False, "feet": False, "work": False}
F = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 22, index=1)
async def main():
    rows = {False: [], True: []}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1100, 'height': 800}, device_scale_factor=1)
        pg = await ctx.new_page()
        await pg.goto('file://' + str((here / 'ballet3d_test.html').resolve()))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await pg.add_style_tag(content='.hud,#labels,.lbl3d,.ghost-key,.hint{display:none!important}')
        for t in ts:
            for pol in (False, True):
                await pg.evaluate('o => window.__ballet.set(o)', {"move": move, "t": t, "cam": cam, "camR": camR, "camY": camY, "view": OFF, "polish": pol})
                await pg.wait_for_timeout(120)
                path = f'/tmp/_strip_{int(pol)}_{t}.png'
                await pg.locator('#stage').screenshot(path=path)
                im = Image.open(path).convert('RGB')
                rows[pol].append(im.crop(crop) if crop else im)
        await b.close()
    w, h = rows[False][0].size
    sheet = Image.new('RGB', (w * len(ts), (h + 34) * 2), (250, 247, 245))
    d = ImageDraw.Draw(sheet)
    for r, pol in enumerate((False, True)):
        for i, im in enumerate(rows[pol]):
            sheet.paste(im, (i * w, r * (h + 34) + 34))
            d.text((i * w + 8, r * (h + 34) + 4), ('2단계 ' if pol else 'v3 ') + f't={ts[i]}', fill=(169, 71, 95) if pol else (90, 80, 90), font=F)
    sheet.save(out); print(sheet.size)
asyncio.run(main())
