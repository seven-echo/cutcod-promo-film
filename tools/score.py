"""CutCod promo score — original, code-synthesized. 58 s, 120 BPM (1 bar = 2 s), F major.
Bright marimba + plucked bass + soft pad + light kit: "gallery, friendly, ready-to-use" (DIRECTION.md).
Sections follow plan.json shot edges. No samples, no third-party audio. Fixed seed → reproducible.
Usage: python tools/score.py  (writes assets/music.wav)
"""
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
from pathlib import Path
SR, DUR, BPM = 48000, 58.0, 120
B = 60 / BPM            # beat = 0.5 s
BAR = 4 * B
N = int(SR * DUR)
rng = np.random.default_rng(4242)
bus = {k: np.zeros((N, 2)) for k in ['marimba', 'bass', 'pad', 'drums', 'fx', 'bell']}
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def add(name, start, sig, pan=0.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[:N - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    bus[name][i:i + len(sig), 0] += sig * l
    bus[name][i:i + len(sig), 1] += sig * r

def env_t(d): return np.arange(int(d * SR)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)

def marimba(m, amp=.2, d=.9):
    t = env_t(d); f = hz(m)
    s = np.sin(2*np.pi*f*t)*np.exp(-t*6) + .35*np.sin(2*np.pi*f*3.93*t)*np.exp(-t*22) + .12*np.sin(2*np.pi*f*9.2*t)*np.exp(-t*60)
    return amp * s * np.minimum(1, t / .002)
def pluck_bass(m, amp=.24, d=.45):
    t = env_t(d); f = hz(m)
    s = np.sin(2*np.pi*f*t) + .3*np.sin(2*np.pi*2*f*t)*np.exp(-t*9) + .1*np.sign(np.sin(2*np.pi*f*t))*np.exp(-t*18)
    return amp * lp(s, 900) * np.exp(-t*5) * np.minimum(1, t/.004) * np.minimum(1, (d - t)/.03)
def pad(notes, d, amp=.05):
    t = env_t(d); s = np.zeros_like(t)
    for m in notes:
        for det in (-.11, .0, .12):
            ph = rng.uniform(0, 1)
            s += 2*((hz(m + det*.1)*t + ph) % 1) - 1
    s = hp(lp(s, 1500, 4), 140) / len(notes)
    e = np.minimum(1, t/.35) * np.minimum(1, (d - t)/.5)
    return amp * s * e
def bell(m, amp=.07, d=1.6):
    t = env_t(d); f = hz(m)
    s = np.sin(2*np.pi*f*t + 1.8*np.exp(-t*3)*np.sin(2*np.pi*f*3.5*t))
    return amp * s * np.exp(-t*2.6) * np.minimum(1, t/.003)
def kick(amp=.5):
    t = env_t(.32); f = 46 + 90*np.exp(-t*28)
    return amp * np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*11) * np.minimum(1, t/.001)
def clap(amp=.16):
    t = env_t(.22); n = rng.uniform(-1, 1, len(t))
    e = sum(np.exp(-np.maximum(0, t - o)*55) * (t >= o) for o in (0, .011, .022)) / 3 + .6*np.exp(-t*16)
    return amp * bp(n, 900, 5200) * e
def hat(amp=.045, d=.06):
    t = env_t(d); return amp * hp(rng.uniform(-1, 1, len(t)), 7000) * np.exp(-t*70)
def shaker(amp=.03):
    t = env_t(.09); return amp * bp(rng.uniform(-1, 1, len(t)), 4000, 11000) * np.sin(np.pi*t/.09)**2
def riser(d, amp=.12):
    t = env_t(d); n = rng.uniform(-1, 1, len(t)); out = np.zeros_like(t)
    for k in range(8):
        a, b = int(k*len(t)/8), int((k+1)*len(t)/8)
        out[a:b] = bp(n[a:b], 400 + 900*k, 1400 + 1800*k)
    return amp * out * (t/d)**2.2
def impact(amp=.4):
    t = env_t(1.4); f = 38 + 50*np.exp(-t*9)
    return amp * (np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*3.2) + .25*lp(rng.uniform(-1, 1, len(t)), 2500)*np.exp(-t*10))

# F – C – Dm – Bb, one chord per bar
PROG = [(53, [65, 69, 72, 76]), (48, [64, 67, 72, 74]), (50, [65, 69, 72, 74]), (46, [65, 70, 74, 77])]
ARP_A = [0, 2, 1, 3, 2, 1, 3, 2]   # eighth-note index into the voicing
ARP_B = [0, 1, 2, 3, 1, 2, 3, 2]
def chord(bar): return PROG[bar % 4]

def section(bar):
    t = bar * BAR
    if t < 4: return 'hook'
    if t < 8: return 'brand'
    if t < 24: return 'grooveA'
    if t < 30: return 'agent'
    if t < 44: return 'grooveB'
    if t < 50: return 'find'
    if t < 54: return 'build'
    return 'outro'

for bar in range(int(DUR / BAR)):
    t0, sec_ = bar * BAR, section(bar)
    root, v = chord(bar)
    if sec_ == 'outro':
        continue
    # pad bed everywhere except the punchy build
    add('pad', t0, pad([m - 12 for m in v[:3]] + [v[3]], BAR + .4, .05 if sec_ != 'agent' else .065), 0)
    # marimba arpeggio
    if sec_ in ('hook',):
        for i, k in enumerate([0, 2, 3, 1]):
            add('marimba', t0 + i * B, marimba(v[k] + 12, .11), (-.3, .3)[i % 2])
    elif sec_ != 'build' or True:
        pat = ARP_B if sec_ in ('grooveB', 'find') else ARP_A
        dens = 8 if sec_ != 'agent' else 4
        for i in range(8):
            if dens == 4 and i % 2: continue
            amp = (.15 if i % 2 == 0 else .11) * (.8 if sec_ == 'agent' else 1)
            add('marimba', t0 + i * B / 2, marimba(v[pat[i]] + 12, amp), -.35 if i % 2 == 0 else .35)
    # bass
    if sec_ not in ('hook',):
        for at, m in [(0, root), (1.5 * B, root), (2 * B, root + 12), (3 * B, root + 7)] if sec_ != 'agent' else [(0, root), (2 * B, root)]:
            add('bass', t0 + at, pluck_bass(m - 12 if m > 52 else m))
    # drums
    if sec_ in ('grooveA', 'grooveB', 'find', 'build', 'brand'):
        for b in range(4):
            if b in (0, 2) or (sec_ == 'build' and True): add('drums', t0 + b * B, kick(.36 if sec_ != 'brand' else .3))
            if b in (1, 3) and sec_ != 'brand': add('drums', t0 + b * B, clap(.15))
        step = 4 if sec_ in ('find', 'build') else 2
        for h in range(4 * step):
            add('drums', t0 + h * B / step, hat(.04 if h % 2 else .055), .25)
    if sec_ in ('agent',):
        for b in range(4): add('drums', t0 + b * B + B / 2, shaker(.035), -.2)
        add('drums', t0, kick(.3))
    # bell counter-melody in the B groove
    if sec_ == 'grooveB' and bar % 2 == 0:
        for at, m in [(0, v[3] + 12), (1.5 * B, v[2] + 12), (3 * B, v[1] + 12)]:
            add('bell', t0 + at, bell(m, .05), .1)

# Hook: soft pickup into the brand hit.
add('fx', 2.6, riser(1.4, .08))
add('fx', 4.0, impact(.3))
# Brand logo flight (7.25–8.0)
add('fx', 6.9, riser(1.1, .05))
# Build into the outro
add('fx', 50.0, riser(4.0, .11))
for i in range(16): add('drums', 52.0 + i * B / 4, clap(.05 + .006 * i))
# Outro: hit + held Fadd9 + marimba roll + bell, ending by 57.9
add('fx', 54.0, impact(.32))
add('pad', 54.0, pad([41, 53, 60, 65, 67, 69], 3.9, .075), 0)
add('bass', 54.0, pluck_bass(41, .28, 1.6))
for i, m in enumerate([77, 81, 84, 89, 88, 84, 81]):
    add('marimba', 54.0 + i * .14, marimba(m, .12, 1.6), (-.4 + i * .13))
add('bell', 54.6, bell(91, .06, 3.0))
add('drums', 54.0, kick(.5))

# sidechain duck on pad/bass from kicks (simple envelope from the kick grid)
duck = np.ones(N)
for bar in range(int(DUR / BAR)):
    if section(bar) in ('grooveA', 'grooveB', 'find', 'build'):
        for b in range(4):
            i = int((bar * BAR + b * B) * SR); L = int(.22 * SR)
            if i + L < N: duck[i:i + L] = np.minimum(duck[i:i + L], 1 - .45 * np.exp(-np.arange(L) / SR * 14))
for k in ('pad', 'bass'): bus[k] *= duck[:, None]

mix = (bus['marimba'] * 1.1 + bus['bass'] * 0.62 + bus['pad'] * 1.0 + bus['drums'] * 0.85 + bus['fx'] * 0.9 + bus['bell'] * 1.0)
# light room reverb on melodic buses
ir_t = np.arange(int(1.6 * SR)) / SR
ir = rng.uniform(-1, 1, (len(ir_t), 2)) * np.exp(-ir_t * 3.2)[:, None]
wet_src = bus['marimba'] + bus['bell'] + .5 * bus['pad']
wet = np.stack([fftconvolve(wet_src[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix += .045 * hp(wet.T, 300).T if False else .045 * np.stack([hp(wet[:, c], 300) for c in range(2)], 1)
mix = hp(mix.T, 32).T if False else np.stack([hp(mix[:, c], 32) for c in range(2)], 1)
fade = np.ones(N); fl = int(.25 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mix *= fade[:, None]
mix *= 10 ** (-3 / 20) / np.max(np.abs(mix))
out = Path(__file__).resolve().parents[1] / 'assets' / 'music.wav'
sf.write(out, mix.astype(np.float32), SR, subtype='PCM_24')
print('wrote', out, f'{DUR}s', BPM, 'BPM')
