"""Clean figure captures (no HUD, no overlays) for the before/after comparison.
usage: python3 tests/cmp2.py HTML OUTDIR TAG
"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
html, out, tag = sys.argv[1], pathlib.Path(sys.argv[2]), sys.argv[3]
out.mkdir(parents=True, exist_ok=True)
OFF = {"com": False, "knee": False, "angles": False, "trail": False, "feet": False, "work": False}
SHOTS = [
  {"name": "a_front",    "set": {"move": "positions", "t": 15.0, "cam": "front", "camR": 4.2, "camY": 0.95}},
  {"name": "b_arabesque","set": {"move": "arabesque", "t": 8.8,  "cam": "q34",   "camR": 4.6, "camY": 0.95}},
  {"name": "c_side",     "set": {"move": "grand-plie","t": 9.0,  "cam": "side",  "camR": 4.2, "camY": 0.8}},
  {"name": "d_face",     "set": {"move": "demi-plie", "t": 6.5,  "cam": "front", "camR": 1.0, "camY": 1.47}},
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome',
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=2)
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        await pg.goto('file://' + str((here / html).resolve()))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await pg.add_style_tag(content='.hud,#labels,.lbl3d,.ghost-key,.hint{display:none!important}')
        for s in SHOTS:
            o = dict(s['set']); o['view'] = OFF
            await pg.evaluate('o => window.__ballet.set(o)', o)
            await pg.wait_for_timeout(250)
            await pg.locator('#stage').screenshot(path=str(out / f"{tag}_{s['name']}.png"))
        for l in logs: print('LOG', l)
        await b.close()
asyncio.run(main())
