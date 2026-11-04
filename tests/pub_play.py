"""Does real-time playback advance? Software rendering is too slow for the page's dt clamp (0.1 s/frame), so GL draw calls are skipped:
what runs is the page's own loop (advance + solver + skinning + overlays + hud) at the browser's frame rate.
usage: python3 tests/pub_play.py path/to/page.html"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

root = pathlib.Path(__file__).resolve().parent.parent
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
PATCH_JS = """() => {
  const names = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements'];
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const n of names) if (C.prototype[n]) C.prototype[n] = function () {};
  }
  window.__raf = 0; const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => orig(t => { window.__raf++; cb(t); });
}"""
READ_JS = """() => ({ v: parseFloat(document.getElementById('track').getAttribute('aria-valuenow')), count: document.getElementById('hudCount').textContent,
                  title: document.getElementById('hudTitle').textContent, raf: window.__raf, t: performance.now() })"""


async def main(path):
    logs, hits = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        ctx = await b.new_context(viewport={'width': 1100, 'height': 800})
        pg = await ctx.new_page()
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))

        async def handler(route):
            u = route.request.url
            if 'cdnjs.cloudflare.com' in u and 'three' in u:
                hits.append(u)
                await route.fulfill(status=200, content_type='application/javascript', body=(root / 'vendor' / 'three.min.js').read_bytes())
            elif 'fonts.googleapis.com' in u or 'fonts.gstatic.com' in u:
                await route.abort()
            else:
                await route.continue_()
        await pg.route('**/*', handler)
        await pg.goto('file://' + str(pathlib.Path(path).resolve()))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await pg.evaluate(PATCH_JS)
        tabs = await pg.locator('#moveTabs button').count()
        await pg.click('#speeds button[data-speed="1"]')
        for i in range(tabs):
            await pg.locator('#moveTabs button').nth(i).click(timeout=60000)
            await pg.evaluate("() => window.__ballet.set({ t: 5.0 })")
            await pg.wait_for_timeout(300)
            a = await pg.evaluate(READ_JS)
            await pg.click('#playBtn')
            await pg.wait_for_timeout(2500)
            c = await pg.evaluate(READ_JS)
            await pg.click('#playBtn')
            name = (await pg.locator('#moveTabs button').nth(i).inner_text()).replace('\n', ' ')
            secs = (c['t'] - a['t']) / 1000
            print(f"{name:<22} playhead {a['v']:.1f} -> {c['v']:.1f} beats in {secs:.2f} s | count {a['count']!r} -> {c['count']!r} | step {c['title']!r} | frames/s {(c['raf'] - a['raf']) / secs:.0f}")
        print('CDN request answered:', len(hits), '| console:', logs if logs else 'none')
        await b.close()

asyncio.run(main(sys.argv[1]))
