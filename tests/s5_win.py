import json, sys, numpy as np
mv = sys.argv[1]; t0 = float(sys.argv[2]); t1 = float(sys.argv[3])
def load(k): return json.load(open(f'../shots/s5/{mv}_{k}.json'))
o, n = load('old'), load('new'); t = np.array(o['t'])
def d2(a):
    a = np.asarray(a); r = np.zeros(len(a)); r[1:-1] = np.linalg.norm(a[2:] - 2 * a[1:-1] + a[:-2], axis=1); return r
fo = {k: d2(o[k]) for k in ('A', 'K', 'H', 'B', 'Tp')}; fn = {k: d2(n[k]) for k in ('A', 'K', 'H', 'B', 'Tp')}
print('frame t | OLD: mode  a  toe  sa  ankle/heel/ball/tip d2 | NEW: mode a toe sa ankle/heel/ball/tip d2')
for i in range(len(t)):
    if t0 <= t[i] <= t1:
        print(f'{i:4d} {t[i]:6.3f} | {o["mode"][i]:5s} {o["a"][i]:5.1f} {o["toe"][i]:6.1f} {o["sa"][i]:.2f} {fo["A"][i]:5.2f} {fo["H"][i]:5.2f} {fo["B"][i]:5.2f} {fo["Tp"][i]:5.2f} | {n["mode"][i]:5s} {n["a"][i]:5.1f} {n["toe"][i]:6.1f} {n["sa"][i]:.2f} {fn["A"][i]:5.2f} {fn["H"][i]:5.2f} {fn["B"][i]:5.2f} {fn["Tp"][i]:5.2f}')
