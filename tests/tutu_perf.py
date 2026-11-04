import asyncio, json, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1100, 'height': 750})).new_page()
        logs = []; pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
        await pg.goto('file://' + str(here / 'ballet3d_test.html'))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
        r = await pg.evaluate("""async () => {
          const B = window.__ballet, t = B.tutu, out = {};
          const orig = t.update; let n = 0, sum = 0, mx = 0;
          t.update = function () { const t0 = performance.now(); orig.apply(this, arguments); const d = performance.now() - t0; n++; sum += d; mx = Math.max(mx, d); };
          for (const mv of ['grand-plie', 'arabesque', 'tendu']) {
            n = 0; sum = 0; mx = 0;
            B.set({ move: mv, t: 0, cam: 'q34' });
            // drive frames like playback: 240 steps through the move
            const tot = 16;
            for (let i = 0; i < 240; i++) B.frame(tot * i / 240, true);
            out[mv] = { calls: n, meanMs: +(sum / n).toFixed(3), maxMs: +mx.toFixed(2) };
          }
          return out;
        }""")
        print(json.dumps(r)); print(logs)
        await b.close()
asyncio.run(main())
