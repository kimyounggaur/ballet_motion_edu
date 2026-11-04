"""Render a clip frame by frame (playback-like: warm-started solver), one polish mode.
usage: python3 tests/render_clip2.py OUTDIR PAGE on|off move t0 t1 fps [camR camY cam [camTh camPh]]"""
import asyncio, sys, pathlib, time
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
page = sys.argv[2]; sys.argv.pop(2)
pol = sys.argv[2] == 'on'; move = sys.argv[3]; t0, t1, fps = float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
cam_o = {}
if len(sys.argv) > 7: cam_o = {"camR": float(sys.argv[7]), "camY": float(sys.argv[8]), "cam": sys.argv[9]}
if len(sys.argv) > 11: cam_o.update({"camTh": float(sys.argv[10]), "camPh": float(sys.argv[11])})
OFF = {"com": False, "knee": False, "angles": False, "trail": False, "feet": False, "work": False}
BPM = {"positions": 66, "demi-plie": 60, "grand-plie": 60, "releve": 66, "tendu": 66, "arabesque": 60}[move]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1100, 'height': 800}, device_scale_factor=1)
        pg = await ctx.new_page(); logs = []
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        await pg.goto('file://' + str((here / page).resolve()))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await pg.add_style_tag(content='.hud,#labels,.lbl3d,.ghost-key,.hint{display:none!important}')
        await pg.evaluate('window.requestAnimationFrame = () => 0')   # stop the app's own render loop: only explicit frames are drawn
        await pg.wait_for_timeout(1500)
        o = {"move": move, "t": t0, "view": OFF, "polish": pol}; o.update(cam_o)
        await pg.evaluate('o => window.__ballet.set(o)', o)
        # warm-up: run the solver from the move's start so the warm start matches playback
        n = int(round((t1 - t0) / (BPM / 60.0) * fps))
        t_start = time.time()
        for i in range(-int(fps * 1.5), 0):   # run the solver up to t0 the way playback would
            await pg.evaluate('t => window.__ballet.warm(t)', max(0.0, t0 + i * (BPM / 60.0) / fps))
        for _ in range(16): await pg.evaluate('t => window.__ballet.frame(t)', t0)   # let the camera settle (it eases toward its goal)
        for i in range(0, n + 1):
            t = t0 + i * (BPM / 60.0) / fps
            await pg.evaluate('t => window.__ballet.frame(t)', t)
            await pg.locator('#stage').screenshot(path=str(out / f'{i:04d}.png'), timeout=180000)
        print('frames', n + 1, 'in', round(time.time() - t_start, 1), 's', logs)
        await b.close()
asyncio.run(main())
