import asyncio, pathlib, sys
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for name, vw, vh, scheme in [('desk', 1280, 900, 'light'), ('phone', 390, 844, 'dark')]:
            ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=2 if name == 'phone' else 1, color_scheme=scheme)
            pg = await ctx.new_page()
            await pg.goto('file://' + str(root / 'tests' / 'ballet3d_test.html'))
            await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
            await pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = false); document.querySelectorAll('details')[2].open = true")
            await pg.evaluate('window.requestAnimationFrame = () => 0')
            await pg.wait_for_timeout(500)
            el = pg.locator('details').nth(2)
            await el.scroll_into_view_if_needed()
            await el.screenshot(path=str(root / 'shots' / f'fold_{name}.png'))
            await ctx.close()
        await b.close()
asyncio.run(main())
