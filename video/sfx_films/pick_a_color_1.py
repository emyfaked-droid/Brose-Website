"""Extra generated stand-in sounds for "PICK A COLOR. (1)" (only for sounds that sfx/ does not have yet).

Run: python3 scripts/make_film_sfx.py pick-a-color-1   -> writes the WAVs into sfx/
These are synthesized stand-ins. Real recordings with the same base name (.mp3 wins) replace them:
the search terms are in sounds/pick-a-color-1.js (FILES[...].search).
"""
from make_sfx import *  # noqa: F401,F403


def beep(f, dur, r):
    t = tt(dur + 0.25)
    env = np.minimum(t / 0.004, 1) * (t < dur) + (t >= dur) * np.exp(-(t - dur) / 0.015)
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sign(np.sin(2 * np.pi * f * t)) * 0.4) * env
    return reverb(x, 0.6, 0.18, seed=int(f))


def make_race_beeps():
    r = rng(1101)
    save('race_beep.wav', beep(740, 0.2, r), peak=0.7)
    save('race_beep_go.wav', beep(1480, 0.55, r), peak=0.75)


def metal_step(seed, weight=1.0):
    r = rng(seed)
    t = tt(0.32)
    tick = fft_filter(r.standard_normal(len(t)), 1500, 9000) * np.exp(-t / 0.003) * 1.2
    thump = np.sin(2 * np.pi * (80 + 50 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.035) * 1.1 * weight
    ring = modes(t, [(420 + 60 * r.random(), 0.06, 0.35), (980 + 120 * r.random(), 0.05, 0.22),
                     (1730 + 200 * r.random(), 0.04, 0.16), (2900 + 300 * r.random(), 0.03, 0.1)])
    return reverb(tick + thump + ring, 0.3, 0.15, seed=seed)


def make_footsteps_metal():
    buf = np.zeros(int(8.0 * SR))
    for i in range(10):
        place(buf, norm(metal_step(1200 + i, 0.9 + 0.2 * ((i * 7) % 5) / 4), 0.8 - 0.1 * ((i * 3) % 4) / 3), 0.25 + i * 0.75)
    save('footsteps_metal.wav', buf, peak=0.85)


def make_stone_crack():
    r = rng(1301)
    t = tt(1.2)
    x = np.zeros(len(t))
    for k in range(9):   # a run of small cracks, then the break
        at = 0.02 + 0.035 * k + 0.01 * r.random()
        tk = np.maximum(t - at, 0) * (t > at)
        x += fft_filter(r.standard_normal(len(t)), 1200, 8000) * np.exp(-tk / 0.004) * (t > at) * (0.4 + 0.6 * k / 8)
    tb = np.maximum(t - 0.34, 0) * (t > 0.34)
    x += (fft_filter(r.standard_normal(len(t)), 120, 3000) * np.exp(-tb / 0.12) * 1.4 +
          np.sin(2 * np.pi * (60 + 30 * np.exp(-tb / 0.04)) * tb) * np.exp(-tb / 0.18) * 1.2) * (t > 0.34)
    save('stone_crack.wav', reverb(x, 0.7, 0.3, seed=1302), peak=0.85)


def make_falling_whoosh():
    r = rng(1401)
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    base = r.standard_normal(n)
    out = np.zeros(n)
    for fc, c in [(2400, 0.15), (1600, 0.35), (1000, 0.6), (650, 0.85), (380, 1.1)]:
        out += fft_filter(base, fc * 0.6, fc * 1.4, 2) * np.exp(-((t - c) / 0.28) ** 2)
    save('falling_whoosh.wav', reverb(fade(out, 0.05, 0.4), 0.7, 0.3, seed=1402), peak=0.7)


def make_chain_swing():
    r = rng(1501)
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(26):   # chain links rattling
        at = 0.05 + 1.1 * r.random()
        tk = np.maximum(t - at, 0)
        out += modes(tk, [(2600 + 1800 * r.random(), 0.02, 0.4), (4800 + 2000 * r.random(), 0.012, 0.25)]) * (t > at) * np.exp(-((at - 0.6) / 0.4) ** 2)
    out += fft_filter(r.standard_normal(n), 250, 1200, 2) * np.exp(-((t - 0.6) / 0.25) ** 2) * 1.2   # air
    save('chain_swing.wav', reverb(out, 0.6, 0.25, seed=1502), peak=0.75)


def make_punch_impact():
    r = rng(1601)
    t = tt(0.9)
    x = (np.sin(2 * np.pi * (55 + 70 * np.exp(-t / 0.025)) * t) * np.exp(-t / 0.12) * 1.8 +
         fft_filter(r.standard_normal(len(t)), 300, 4000) * np.exp(-t / 0.02) * 1.0 +
         modes(t, [(190, 0.12, 0.5), (330, 0.08, 0.3)]))
    save('punch_impact.wav', reverb(x, 0.5, 0.2, seed=1602), peak=0.9)


def make_ice_slide():
    r = rng(1701)
    n = int(1.3 * SR)
    t = np.arange(n) / SR
    scrape = fft_filter(r.standard_normal(n), 2500, 9000) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    squeal = np.sin(2 * np.pi * np.cumsum(1900 + 500 * np.sin(2 * np.pi * 1.3 * t)) / SR) * 0.15
    env = np.minimum(t / 0.05, 1) * np.exp(-np.maximum(t - 0.6, 0) / 0.3)
    save('ice_slide.wav', reverb((scrape + squeal) * env, 0.5, 0.25, seed=1702), peak=0.65)


def make_heavy_metal_slam():
    r = rng(1801)
    t = tt(1.8)
    x = (np.sin(2 * np.pi * (38 + 45 * np.exp(-t / 0.04)) * t) * np.exp(-t / 0.3) * 2.2 +
         fft_filter(r.standard_normal(len(t)), 80, 3500) * np.exp(-t / 0.07) * 1.4 +
         modes(t, [(118, 0.5, 0.6), (243, 0.45, 0.45), (517, 0.35, 0.3), (1130, 0.25, 0.2), (2210, 0.15, 0.12)]))
    save('heavy_metal_slam.wav', reverb(x, 1.2, 0.35, seed=1802), peak=0.9)


def make_gate_grind():
    r = rng(1901)
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    rough = fft_filter(r.standard_normal(n), 60, 900, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 11 * t))
    hum = sum(np.sin(2 * np.pi * f * t + r.random() * 6) * a for f, a in [(47, 0.5), (94, 0.3), (141, 0.2), (233, 0.15)])
    screech = fft_filter(r.standard_normal(n), 1800, 3200, 3) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.3 * t)) * 0.35
    save('metal_gate_grinding.wav', reverb(fade(rough + hum * 0.6 + screech, 0.2, 0.3), 0.9, 0.3, seed=1902), peak=0.7)


def make_gate_slam():
    r = rng(2001)
    t = tt(2.2)
    x = (np.sin(2 * np.pi * (34 + 40 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.4) * 2.4 +
         fft_filter(r.standard_normal(len(t)), 60, 2500) * np.exp(-t / 0.1) * 1.6 +
         modes(t, [(92, 0.7, 0.7), (186, 0.6, 0.5), (402, 0.4, 0.3), (870, 0.3, 0.2), (1640, 0.2, 0.12)]))
    save('gate_slam.wav', reverb(x, 1.6, 0.4, seed=2002), peak=0.92)


def make_ui_pop():
    t = tt(0.25)
    f = 520 + 600 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(t / 0.002, 1) * np.exp(-t / 0.045)
    save('ui_pop.wav', reverb(x, 0.3, 0.12, seed=2101), peak=0.7)


def make_crowd_cheer():
    r = rng(2201)
    buf = np.zeros(int(3.6 * SR))
    keys = list(VOWELS)
    for v in range(16):   # voices shouting "aaah" / "yeah"
        f0 = 170 + 190 * r.random()
        p = voice_pulse(f0, 1.4 + 0.8 * r.random(), VOWELS[keys[v % 3]], r, vib=4 + 3 * r.random())
        place(buf, norm(p, 0.5) * (0.6 + 0.4 * r.random()), 0.05 + 0.25 * r.random())
    for k in range(60):   # claps
        t = tt(0.08)
        c = fft_filter(r.standard_normal(len(t)), 900, 5000) * np.exp(-t / 0.01)
        place(buf, c * (0.25 + 0.2 * r.random()), 0.2 + 2.6 * r.random())
    save('crowd_cheer.wav', reverb(fade(buf, 0.02, 0.8), 0.9, 0.3, seed=2202), peak=0.8)


def make_abyss_wind():
    r = rng(2301)
    n = int(12.0 * SR)
    t = np.arange(n) / SR
    x = fft_filter(r.standard_normal(n), 60, 500, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t))
    x += np.sin(2 * np.pi * 41 * t) * 0.08
    save('abyss_wind.wav', loopable(x), peak=0.6)


def make():
    """called by scripts/make_film_sfx.py: list every generator of this film here"""
    make_race_beeps(); make_footsteps_metal(); make_stone_crack(); make_falling_whoosh()
    make_chain_swing(); make_punch_impact(); make_ice_slide(); make_heavy_metal_slam()
    make_gate_grind(); make_gate_slam(); make_ui_pop(); make_crowd_cheer(); make_abyss_wind()
