import asyncio, pathlib
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for name, vw, vh, scheme in [('desk', 1280, 900, 'light'), ('phone', 390, 844, 'dark')]:
            ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=1, color_scheme=scheme)
            pg = await ctx.new_page(); logs = []
            pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
            await pg.goto('file://' + str(root / 'tests' / 'ballet3d_test.html'))
            await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
            await pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            await pg.evaluate('window.requestAnimationFrame = () => 0')
            await pg.wait_for_timeout(600)
            el = pg.locator('#polish')
            await el.scroll_into_view_if_needed()
            box = await el.bounding_box()
            print(name, 'chip box', {k: round(v) for k, v in box.items()}, 'viewport', vw)
            await pg.screenshot(path=str(root / 'shots' / f'panel_{name}.png'), clip={'x': 0, 'y': max(0, box['y'] - 130), 'width': vw, 'height': 230})
            sc = await pg.evaluate('() => document.documentElement.scrollWidth')
            print(name, 'scrollWidth', sc, 'ok' if sc <= vw else 'HORIZONTAL OVERFLOW', logs)
            await ctx.close()
        await b.close()
asyncio.run(main())
