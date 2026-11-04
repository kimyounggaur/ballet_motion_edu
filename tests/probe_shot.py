import asyncio, json, sys, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 700, 'height': 600})).new_page()
        logs = []; pg.on('console', lambda m: logs.append(m.type + ': ' + m.text)); pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
        await pg.goto('file://' + str(here / 'ballet3d_test.html'))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=20000)
        await pg.evaluate("window.__ballet.set({move:'demi-plie', t:0, cam:'front'})")
        r = await pg.evaluate(sys.argv[1])
        await pg.evaluate("window.__ballet.set({})")
        await pg.wait_for_timeout(200)
        await pg.locator('#stage').screenshot(path=sys.argv[2])
        print(json.dumps(r)[:1500]); print('\n'.join(logs[:10]))
        await b.close()
asyncio.run(main())
