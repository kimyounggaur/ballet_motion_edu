"""Close-up figure captures at 2x for before/after comparison.
usage: python3 tests/cmp.py OUTDIR TAG   (reads tests/ballet3d_test.html)
"""
import asyncio, json, sys, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
tag = sys.argv[2]
SHOTS = json.loads(sys.argv[3]) if len(sys.argv) > 3 else [
  {"name":"a_front_5th", "set":{"move":"positions","t":15.0,"cam":"front","camR":4.2,"camY":0.95}},
  {"name":"b_arabesque", "set":{"move":"arabesque","t":8.8,"cam":"q34","camR":4.6,"camY":0.95}},
  {"name":"c_grand_plie","set":{"move":"grand-plie","t":9.0,"cam":"side","camR":4.2,"camY":0.8}},
  {"name":"d_head_close","set":{"move":"demi-plie","t":6.5,"cam":"front","camR":1.5,"camY":1.5,"view":{"com":False,"knee":False,"angles":False,"trail":False,"feet":False,"work":False}}},
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome',
            args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':1280,'height':900}, device_scale_factor=2)
        pg = await ctx.new_page(); logs=[]
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
        await pg.goto('file://'+str(here/'ballet3d_test.html'))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        for s in SHOTS:
            await pg.evaluate('o => window.__ballet.set(o)', s['set'])
            await pg.wait_for_timeout(200)
            await pg.locator('#stage').screenshot(path=str(out/f"{tag}_{s['name']}.png"))
        for l in logs: print('LOG', l)
        await b.close()
asyncio.run(main())
