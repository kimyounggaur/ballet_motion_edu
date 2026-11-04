"""One still per (page, move, t): playback-like warm-up, then a single frame.  usage: python3 tests/s5_still.py OUT.png PAGE move t cam camR camY [camTh camPh]"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
out, page, move, t = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
cam, camR, camY = sys.argv[5], float(sys.argv[6]), float(sys.argv[7])
extra = {}
if len(sys.argv) > 9: extra = {"camTh": float(sys.argv[8]), "camPh": float(sys.argv[9])}
OFF = {"com": False, "knee": False, "angles": False, "trail": False, "feet": False, "work": False}
BPM = {"positions": 66, "demi-plie": 60, "grand-plie": 60, "releve": 66, "tendu": 66, "arabesque": 60}[move]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1100, 'height': 800}, device_scale_factor=1)
        pg = await ctx.new_page()
        await pg.goto('file://' + str((here / page).resolve()))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await pg.add_style_tag(content='.hud,#labels,.lbl3d,.ghost-key,.hint{display:none!important}')
        await pg.evaluate('window.requestAnimationFrame = () => 0')
        await pg.wait_for_timeout(1200)
        o = {"move": move, "t": max(0.0, t - 1.5), "view": OFF, "polish": True, "camR": camR, "camY": camY, "cam": cam}; o.update(extra)
        await pg.evaluate('o => window.__ballet.set(o)', o)
        step = (BPM / 60.0) / 60
        n = int(round(1.5 / step))
        for i in range(-n, 1):
            await pg.evaluate('t => window.__ballet.warm(t)', max(0.0, t + i * step))
        for _ in range(16): await pg.evaluate('t => window.__ballet.frame(t)', t)
        await pg.locator('#stage').screenshot(path=out, timeout=180000)
        await b.close()
asyncio.run(main())
