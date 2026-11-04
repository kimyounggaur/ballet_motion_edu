import asyncio, json, sys, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
variants = json.loads(sys.argv[2])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1100, 'height': 750}, color_scheme='dark' if '--dark' in sys.argv else 'light')
        pg = await ctx.new_page()
        await pg.goto('file://' + str(here / 'ballet3d_test.html'))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=20000)
        await pg.evaluate("window.__ballet.set({move:'tendu', t:7, cam:'q34', camR:2.2, camY:0.95})")
        for i, v in enumerate(variants):
            await pg.evaluate("""v => { const t = window.__ballet.tutu; const c = new (t.layers[0].mat.color.constructor)(v.c).convertSRGBToLinear(); t.layers.forEach((l, k) => { l.mat.color.copy(c); l.L.op = v.op; l.mat.opacity = v.op; }); window.__ballet.set({}); }""", v)
            await pg.wait_for_timeout(150)
            await pg.locator('#stage').screenshot(path=f'{sys.argv[1]}/v{i}.png')
        await b.close()
asyncio.run(main())
