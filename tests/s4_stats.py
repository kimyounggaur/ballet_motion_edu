import json, numpy as np, sys
def load(p): return json.load(open(p))
def d2(a):
    a = np.asarray(a); return np.linalg.norm(a[2:] - 2 * a[1:-1] + a[:-2], axis=1)   # mm per frame^2 (second difference magnitude)
def d1(a):
    a = np.asarray(a); return np.linalg.norm(a[1:] - a[:-1], axis=1)
for pol in (1, 0):
    print(f'=== polish={pol}  positions @60fps (bpm 66)')
    for tag in ('old', 'new'):
        s = load(f'shots/s4/pos_{tag}_p{pol}.json'); t = np.array(s['t'])
        rows = {'R ankle': d2(s['A']['R']), 'L ankle': d2(s['A']['L']), 'R knee': d2(s['K']['R']), 'L knee': d2(s['K']['L']), 'pelvis': d2(s['pp'])}
        line = f'{tag}: ' + ' | '.join(f'{k} max {v.max():5.2f}@{t[1:-1][v.argmax()]:5.2f}' for k, v in rows.items())
        print(line)
        for k, v in rows.items():
            idx = np.where(v > 3.0)[0]
            print(f'    {k:8s} frames with d2>3 mm: {len(idx):3d}', ('at t=' + ', '.join(f'{t[1:-1][i]:.2f}({v[i]:.1f})' for i in idx[:14]) + (' …' if len(idx) > 14 else '')) if len(idx) else '')
        r = np.array(s['roll']); print(f'    roll step max {np.abs(np.diff(r)).max():.3f}°/frame @ t={t[1:][np.abs(np.diff(r)).argmax()]:.2f}')
