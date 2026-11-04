import asyncio, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width':1200,'height':850})).new_page()
        logs=[]
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)))
        await pg.goto('file://'+str(here/'ballet3d_test.html'))
        await pg.wait_for_function('window.__ballet !== undefined', timeout=20000)
        # interact: each tab, play at 1x, toggle step-stop, mistakes, mirror, turnout, cameras, ruler scrub
        await pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
        tabs = await pg.locator('#moveTabs button').count()
        await pg.click('#speeds button[data-speed="1"]')
        for i in range(tabs):
            await pg.locator('#moveTabs button').nth(i).click()
            await pg.wait_for_timeout(600)
            chips = pg.locator('#mistakes .chip')
            if await chips.count(): await chips.first.click()
            await pg.wait_for_timeout(500)
            await pg.click('#sideL'); await pg.wait_for_timeout(300); await pg.click('#sideR')
            for c in ['side','top','back','q34','front']:
                await pg.click(f'#cams button[data-cam="{c}"]'); await pg.wait_for_timeout(120)
            await pg.click('#nextBtn'); await pg.click('#nextBtn'); await pg.click('#prevBtn')
            box = await pg.locator('#track').bounding_box()
            await pg.mouse.move(box['x']+20, box['y']+30); await pg.mouse.down()
            await pg.mouse.move(box['x']+box['width']-30, box['y']+30, steps=8); await pg.mouse.up()
            await pg.click('#playBtn'); await pg.wait_for_timeout(500)
        await pg.click('#polish'); await pg.wait_for_timeout(300); await pg.click('#polish'); await pg.wait_for_timeout(300)
        print('polish pressed:', await pg.get_attribute('#polish','aria-pressed'))
        await pg.click('#stepStop'); await pg.wait_for_timeout(1500)
        await pg.fill('#turnout', '160'); await pg.dispatch_event('#turnout', 'change'); await pg.wait_for_timeout(500)
        await pg.fill('#turnout', '120'); await pg.dispatch_event('#turnout', 'change'); await pg.wait_for_timeout(500)
        nchips = await pg.locator('#toggles .chip').count(); print('toggle chips', nchips)
        for k in range(nchips):
            await pg.locator('#toggles .chip').nth(k).click()
        await pg.wait_for_timeout(400)
        # drag-orbit and wheel on canvas
        cb = await pg.locator('#stage canvas').bounding_box()
        await pg.mouse.move(cb['x']+300, cb['y']+300); await pg.mouse.down(); await pg.mouse.move(cb['x']+500, cb['y']+250, steps=6); await pg.mouse.up()
        await pg.mouse.wheel(0, 300); await pg.wait_for_timeout(300)
        fps = await pg.evaluate('''() => new Promise(r => { let n=0; const t0=performance.now(); function f(){ n++; if (performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2); } requestAnimationFrame(f); })''')
        print('fps (swiftshader)', fps)
        state = await pg.evaluate('() => ({hash: location.hash, step: document.getElementById("hudTitle").textContent, count: document.getElementById("hudCount").textContent})')
        print(state)
        await pg.screenshot(path=str(here.parent/'shots'/'soak_end.png'))
        print('\n'.join(logs) if logs else 'no console output')
        await b.close()
asyncio.run(main())
