#!/usr/bin/env python3
"""Assemble the single-file artifact (prod uses cdnjs three.js r128; test uses the local copy)."""
import pathlib, sys
here = pathlib.Path(__file__).parent
src = here / 'src'
FONTS = ('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500;1,600'
         '&family=Hahmlet:wght@500;600&family=IBM+Plex+Mono:wght@400;500;600'
         '&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap')
CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'

def build(three_src, out):
    html = f"""<title>발레 기본기 3D</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="관절 인형 3D로 보는 발레 기본 동작 교본: 포지션, 플리에, 를르베, 탄듀, 아라베스크">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{(src / 'style.css').read_text()}
</style>
{(src / 'body.html').read_text()}
<script src="{three_src}"></script>
<script>
{(src / 'core.js').read_text()}
</script>
<script>
{(src / 'figure.js').read_text()}
</script>
<script>
{(src / 'tutu.js').read_text()}
</script>
<script>
{(src / 'app.js').read_text()}
</script>
"""
    out.write_text(html)
    print(out, len(html) // 1024, 'KB')

build(CDN, here / 'ballet3d.html')
test = here / 'tests' / 'ballet3d_test.html'
build('../vendor/three.min.js', test)
# the publish skeleton wraps the page; mimic it for local tests
t = test.read_text()
# offline sandbox: drop the font stylesheet (it would block scripts while it times out)
import re
t = re.sub(r'<link rel="(stylesheet|preconnect)"[^>]*>\n', '', t)
test.write_text('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
                '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>'
                '</head><body>' + t + '</body></html>')
