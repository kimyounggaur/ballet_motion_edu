import sys, asyncio
from playwright.async_api import async_playwright
async def main(url, out):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':400,'height':300})
        msgs=[]
        pg.on('console', lambda m: msgs.append(m.text))
        pg.on('pageerror', lambda e: msgs.append('ERR '+str(e)))
        await pg.goto(url)
        await pg.wait_for_function('window.done===true', timeout=15000)
        print(await pg.evaluate('window.glinfo'))
        await pg.screenshot(path=out)
        print('\n'.join(msgs))
        await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2]))
