"""Load the PRODUCTION html (cdnjs three r128 tag) with the CDN request answered from the local copy, fonts aborted."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome',
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 900})
        pg = await ctx.new_page(); logs = []; hits = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        async def handler(route):
            u = route.request.url
            if 'cdnjs.cloudflare.com' in u and 'three' in u:
                hits.append(u); await route.fulfill(status=200, content_type='application/javascript', body=(root / 'vendor' / 'three.min.js').read_bytes())
            elif 'fonts.googleapis.com' in u or 'fonts.gstatic.com' in u:
                await route.abort()
            else:
                await route.continue_()
        await pg.route('**/*', handler)
        await pg.goto('file://' + str(root / 'ballet3d.html'))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await pg.evaluate('o => window.__ballet.set(o)', {"move": "arabesque", "t": 8.8, "cam": "q34", "camR": 4.6, "camY": 0.95})
        await pg.wait_for_timeout(300)
        await pg.locator('#stage').screenshot(path=str(root / 'shots' / 'prodcheck.png'))
        m = await pg.evaluate('() => JSON.stringify(window.__ballet.measure().legs)')
        print('CDN request answered:', hits)
        print('measure.legs:', m[:160])
        for l in logs: print('LOG', l)
        await b.close()
asyncio.run(main())
