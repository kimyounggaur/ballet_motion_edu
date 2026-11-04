"""Check a built page the way a visitor gets it: production HTML (cdnjs three r128 tag; the request is answered from the local copy, fonts aborted).
usage: python3 tests/pub_check.py tag=path [tag=path ...]
per page: pose digest (hash of measure() over playback-like windows in all moves), soak-style interactions with console errors,
layout widths (desktop 1280 / phone 390), one stage screenshot. Digests of two pages are compared at the end."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

root = pathlib.Path(__file__).resolve().parent.parent
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

DIGEST_JS = """async ({starts, n, dt}) => {
  const B = window.__ballet;
  let h = 2166136261 >>> 0, frames = 0, last = null;
  const mix = s => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const t0 of starts) {
    B.set({ t: t0 });
    for (let k = 0; k < n; k++) { B.frame(t0 + (k + 1) * dt); last = B.measure(); mix(JSON.stringify(last)); frames++; }
  }
  return { hash: h.toString(16), frames, legs: JSON.stringify(last && last.legs).slice(0, 100) };
}"""


# the digest only needs the solver/skinning side of renderFrame; skipping the GL draw calls keeps SwiftShader from queueing a backlog
PATCH_JS = """() => {
  const names = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements'];
  window.__origDraw = {};
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const n of names) if (C.prototype[n]) { (window.__origDraw[C.name] = window.__origDraw[C.name] || {})[n] = C.prototype[n]; C.prototype[n] = function () {}; }
  }
}"""
RESTORE_JS = """() => {
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C || !window.__origDraw || !window.__origDraw[C.name]) continue;
    for (const [n, f] of Object.entries(window.__origDraw[C.name])) C.prototype[n] = f;
  }
}"""
TWO_RAF = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"


async def new_page(b, vw, vh, scheme, logs, hits):
    ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=1, color_scheme=scheme)
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
    return ctx, pg


async def check(p, tag, path):
    out = {'tag': tag}
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    logs, hits = [], []
    ctx, pg = await new_page(b, 1280, 900, 'light', logs, hits)
    await pg.goto('file://' + str(pathlib.Path(path).resolve()))
    await pg.wait_for_function('window.__ballet !== undefined', timeout=30000)
    tabs = await pg.locator('#moveTabs button').count()
    out['cdn'] = len(hits)
    out['tabs'] = tabs
    # 1) deterministic pose digest, every move, three windows each
    digs = []
    await pg.evaluate(PATCH_JS)
    for i in range(tabs):
        await pg.locator('#moveTabs button').nth(i).click(timeout=60000)
        d = await pg.evaluate(DIGEST_JS, {'starts': [5.0, 9.8, 15.5], 'n': 30, 'dt': 0.0183})
        digs.append(d['hash'])
    await pg.evaluate(RESTORE_JS)
    await pg.evaluate(TWO_RAF)
    out['digest'] = digs
    # 2) soak-style interactions
    await pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
    await pg.click('#speeds button[data-speed="1"]')
    for i in range(tabs):
        await pg.locator('#moveTabs button').nth(i).click()
        await pg.wait_for_timeout(400)
        chips = pg.locator('#mistakes .chip')
        if await chips.count():
            await chips.first.click()
        await pg.wait_for_timeout(300)
        await pg.click('#sideL'); await pg.wait_for_timeout(200); await pg.click('#sideR')
        for c in ['side', 'top', 'back', 'q34', 'front']:
            await pg.click(f'#cams button[data-cam="{c}"]'); await pg.wait_for_timeout(80)
        await pg.click('#nextBtn'); await pg.click('#nextBtn'); await pg.click('#prevBtn')
        box = await pg.locator('#track').bounding_box()
        await pg.mouse.move(box['x'] + 20, box['y'] + 12); await pg.mouse.down()
        await pg.mouse.move(box['x'] + box['width'] - 30, box['y'] + 12, steps=8); await pg.mouse.up()
        before = await pg.evaluate('() => document.getElementById("hudCount").textContent + "|" + document.getElementById("hudTitle").textContent')
        await pg.click('#playBtn'); await pg.wait_for_timeout(1800)
        after = await pg.evaluate('() => document.getElementById("hudCount").textContent + "|" + document.getElementById("hudTitle").textContent')
        await pg.click('#playBtn')                      # pause again
        out.setdefault('play_changed', []).append(before != after)
    await pg.click('#polish'); await pg.wait_for_timeout(200); await pg.click('#polish'); await pg.wait_for_timeout(200)
    out['polish_pressed'] = await pg.get_attribute('#polish', 'aria-pressed')
    await pg.click('#stepStop'); await pg.wait_for_timeout(600); await pg.click('#stepStop')
    for v in ('160', '120', '140'):
        await pg.fill('#turnout', v); await pg.dispatch_event('#turnout', 'change'); await pg.wait_for_timeout(250)
    n = await pg.locator('#toggles .chip').count()
    for k in range(n):
        await pg.locator('#toggles .chip').nth(k).click()
    for k in range(n):
        await pg.locator('#toggles .chip').nth(k).click()
    out['toggle_chips'] = n
    cb = await pg.locator('#stage canvas').bounding_box()
    await pg.mouse.move(cb['x'] + 300, cb['y'] + 300); await pg.mouse.down(); await pg.mouse.move(cb['x'] + 500, cb['y'] + 250, steps=6); await pg.mouse.up()
    await pg.mouse.wheel(0, 300); await pg.wait_for_timeout(300)
    # 3) one stage screenshot at the 4-position hold
    await pg.locator('#moveTabs button').nth(0).click()
    await pg.evaluate("() => window.__ballet.set({move: 'positions', t: 16.0, cam: 'front', mirror: false})")
    await pg.wait_for_timeout(300)
    await pg.locator('#stage').screenshot(path=str(root / 'shots' / f'pubcheck_{tag}_pos16.png'))
    out['console'] = list(logs)
    await ctx.close()
    # 4) layout
    for name, vw, vh, scheme in (('desk', 1280, 900, 'light'), ('phone', 390, 844, 'dark')):
        l2, h2 = [], []
        c2, p2 = await new_page(b, vw, vh, scheme, l2, h2)
        await p2.goto('file://' + str(pathlib.Path(path).resolve()))
        await p2.wait_for_function('window.__ballet !== undefined', timeout=30000)
        await p2.wait_for_timeout(400)
        sc = await p2.evaluate('() => document.documentElement.scrollWidth')
        out['layout_' + name] = f'{sc} <= {vw}' if sc <= vw else f'HORIZONTAL OVERFLOW {sc} > {vw}'
        out['console_' + name] = l2
        await c2.close()
    await b.close()
    return out


async def main():
    pairs = [a.split('=', 1) for a in sys.argv[1:]]
    res = []
    async with async_playwright() as p:
        for tag, path in pairs:
            r = await check(p, tag, path)
            res.append(r)
            print(r, flush=True)
    if len(res) == 2:
        print('POSE DIGEST EQUAL:', res[0]['digest'] == res[1]['digest'])

asyncio.run(main())
