"""Polish on/off captures at identical times. usage: python3 tests/pol_check.py OUTDIR [name,...]"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
OFF = {"com": False, "knee": False, "angles": False, "trail": False, "feet": False, "work": False}
SHOTS = [
  {"name": "face_first",   "set": {"move": "demi-plie",  "t": 2.0,  "cam": "front", "camR": 1.1, "camY": 1.45}},
  {"name": "face_second",  "set": {"move": "demi-plie",  "t": 4.0,  "cam": "front", "camR": 1.1, "camY": 1.45}},
  {"name": "arab_q34",     "set": {"move": "arabesque",  "t": 8.8,  "cam": "q34",   "camR": 4.4, "camY": 0.95}},
  {"name": "arab_face",    "set": {"move": "arabesque",  "t": 8.8,  "cam": "front", "camR": 1.2, "camY": 1.40}},
  {"name": "third_front",  "set": {"move": "positions",  "t": 11.0, "cam": "front", "camR": 3.4, "camY": 1.0}},
  {"name": "breath_side0", "set": {"move": "demi-plie",  "t": 8.0,  "cam": "side",  "camR": 2.2, "camY": 1.2}},
  {"name": "breath_side1", "set": {"move": "demi-plie",  "t": 9.8,  "cam": "side",  "camR": 2.2, "camY": 1.2}},
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome',
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=1.5)
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        await pg.goto('file://' + str((here / 'ballet3d_test.html').resolve()))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await pg.add_style_tag(content='.hud,#labels,.lbl3d,.ghost-key,.hint{display:none!important}')
        for s in SHOTS:
            if only and s['name'] not in only: continue
            for pol in (False, True):
                o = dict(s['set']); o['view'] = OFF; o['polish'] = pol
                await pg.evaluate('o => window.__ballet.set(o)', o)
                await pg.wait_for_timeout(200)
                await pg.locator('#stage').screenshot(path=str(out / f"{s['name']}_{'on' if pol else 'off'}.png"))
        for l in logs: print('LOG', l)
        await b.close()
asyncio.run(main())
