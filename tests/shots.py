"""Render verification screenshots of the artifact in headless Chrome (software WebGL).
usage: python3 shots.py out_dir '<json list of shots>' [--full] [--dark] [--w 1280 --h 900]
each shot: {"name":..., "set":{...}, "clip":"stage"|"page"}
"""
import asyncio, json, sys, pathlib
from playwright.async_api import async_playwright

here = pathlib.Path(__file__).parent
args = sys.argv[1:]
out = pathlib.Path(args[0]); out.mkdir(parents=True, exist_ok=True)
shots = json.loads(args[1])
dark = '--dark' in args
W = int(args[args.index('--w') + 1]) if '--w' in args else 1280
H = int(args[args.index('--h') + 1]) if '--h' in args else 900

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome',
                                    args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1,
                                  color_scheme='dark' if dark else 'light')
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        page = args[args.index('--page') + 1] if '--page' in args else 'ballet3d_test.html'
        await pg.goto('file://' + str(here / page))
        try:
            await pg.wait_for_function('window.__ballet !== undefined', timeout=20000)
        except Exception as e:
            print('INIT FAILED', e); print('\n'.join(logs)); await b.close(); return
        for s in shots:
            await pg.evaluate('o => window.__ballet.set(o)', s.get('set', {}))
            await pg.wait_for_timeout(120)
            path = out / f"{s['name']}.png"
            if s.get('clip', 'stage') == 'stage':
                await pg.locator('#stage').screenshot(path=str(path))
            else:
                await pg.screenshot(path=str(path), full_page=s.get('full', False))
            if s.get('measure'):
                m = await pg.evaluate('() => { const m = window.__ballet.measure(); return JSON.stringify({legs: m.legs, com: m.comDist, w: m.w, tilt: m.pelvisTilt, lean: m.torsoLean}); }')
                print(s['name'], m)
        for l in logs:
            print('LOG', l)
        await b.close()

asyncio.run(main())
