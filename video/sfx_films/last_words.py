"""Extra generated stand-in sounds for 'The Last Words'. Only what sfx/ does not have yet.

Run: python3 scripts/make_film_sfx.py last-words   -> writes the WAVs into sfx/
Prefer real recordings: drop e.g. sfx/tire_squeal.mp3 into sfx/ and it replaces the stand-in.
"""
from make_sfx import *  # noqa: F401,F403


def make_car_engine():
    """inside a car at speed: low engine drone and road rumble, loopable 6 s"""
    r = rng(1501)
    n = int(6.0 * SR)
    t = np.arange(n) / SR
    f = 52 + 3 * np.sin(2 * np.pi * 0.3 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 9)) * 0.5
    x += fft_filter(r.standard_normal(n), 30, 400) * 0.8
    save('car_engine.wav', loopable(fft_filter(x, 25, 1200)), peak=0.7)


def make_tire_squeal():
    """loud tyre squeal, 0.9 s, rising"""
    r = rng(1511)
    t = tt(0.9)
    f = 1150 + 300 * t + 60 * fft_filter(r.standard_normal(len(t)), 3, 40)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sign(np.sin(ph))
    x = fft_filter(x + 0.6 * r.standard_normal(len(t)), 600, 7000) * np.minimum(t / 0.05, 1)
    save('tire_squeal.wav', x, peak=0.9)


def make_car_crash():
    """a crash heard in the dark: a deep bang, crumpling metal, glass, 2.4 s"""
    r = rng(1521)
    buf = np.zeros(int(2.4 * SR))
    t = tt(1.2)
    place(buf, (fft_filter(r.standard_normal(len(t)), 25, 500) * 2.4 + 1.2 * np.sin(2 * np.pi * 45 * t)) * np.exp(-t / 0.18), 0.0)
    tm = tt(0.9)
    metal = sum(np.sin(2 * np.pi * f * tm + r.random() * 6) * np.exp(-tm / (0.08 + 0.2 * r.random())) for f in [310, 467, 733, 1180, 1610])
    place(buf, metal * 0.35, 0.02)
    for i in range(90):
        tg = tt(0.05)
        g = fft_filter(r.standard_normal(len(tg)), 2500, 11000) * np.exp(-tg / 0.008)
        place(buf, g * (0.15 + 0.4 * r.random()) * np.exp(-i / 40), 0.05 + 1.1 * r.random() ** 1.5)
    save('car_crash.wav', reverb(buf, 1.2, 0.3, seed=1522), peak=0.95)


def make_siren_far():
    """a siren far away (wail), 8 s, with distance: muffled and reverberant"""
    t = tt(8.0)
    f = 760 + 260 * np.sin(2 * np.pi * 0.42 * t - 1.2)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    x = fft_filter(x, 300, 2400) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * t))
    save('siren_far.wav', fade(reverb(x, 1.6, 0.45, seed=1532), 0.4, 0.6), peak=0.6)


def make_radio_static():
    """a short burst from a radio: squelch, crackle, a garbled voice, 1.4 s"""
    r = rng(1541)
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    x = fft_filter(r.standard_normal(n), 900, 3200) * 0.4
    for f0, a, b in [(170, 0.15, 0.55), (150, 0.62, 1.15)]:
        seg = (t > a) & (t < b)
        ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.08 * np.sin(2 * np.pi * 5 * t))) / SR
        v = sum(np.sin(k * ph) / k for k in range(1, 12))
        v = fft_filter(v, 500, 2800) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * t)))
        x += v * seg * 0.8
    x[:int(0.05 * SR)] += np.sin(2 * np.pi * 1400 * t[:int(0.05 * SR)]) * 0.6
    x = np.clip(x * 1.6, -1, 1)
    save('radio_static.wav', fade(x, 0.005, 0.05), peak=0.6)


def make():
    """called by scripts/make_film_sfx.py"""
    make_car_engine()
    make_tire_squeal()
    make_car_crash()
    make_siren_far()
    make_radio_static()
