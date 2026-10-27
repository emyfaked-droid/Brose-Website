"""Stand-in sounds for last-bus-2 (only what sfx/ does not have yet).

Run: python3 scripts/make_film_sfx.py last-bus-2   -> writes the WAVs into sfx/
Replace any of them with a real recording of the same name (.mp3 wins).
"""
from make_sfx import *  # noqa: F401,F403


def make_pigeon_flutter():
    """a few pigeons take off in a big hall: wing claps and flutter, with a long echo (2.5 s)"""
    r = rng(801)
    y = np.zeros(int(2.5 * SR))
    for bird in range(3):
        at, rate = 0.03 + bird * 0.11 + 0.05 * r.random(), 9 + 3 * r.random()
        for k in range(int(10 + 6 * r.random())):
            t = tt(0.06)
            flap = fft_filter(r.standard_normal(len(t)), 300, 4500, 2) * np.exp(-t / 0.018)
            flap *= (1.4 if k < 2 else 0.9) * (1 - k / 18) * (0.7 + 0.5 * r.random())
            place(y, flap, at + k / rate + 0.01 * r.standard_normal())
    save('pigeon_flutter.wav', reverb(y, 1.6, 0.35, seed=802), peak=0.7)


def make_footsteps_metal():
    """slow steps on a rusty metal bus floor: a dull clank plus a short creak per step, gaps between (8 steps)"""
    r = rng(811)
    y = np.zeros(int(8 * 0.75 * SR + SR))
    for i in range(8):
        t = tt(0.45)
        clank = modes(t, [(140 + 20 * r.random(), 0.05, 1.0), (380 + 60 * r.random(), 0.03, 0.5), (1150 + 300 * r.random(), 0.015, 0.25)])
        thud = fft_filter(r.standard_normal(len(t)), 80, 900, 2) * np.exp(-t / 0.02) * 0.6
        creak = np.zeros_like(t)
        f0 = 420 + 120 * r.random()
        for j in range(int(5 + 4 * r.random())):
            tp = tt(0.03)
            place(creak, modes(tp, [(f0, 0.006, 0.5), (f0 * 1.7, 0.004, 0.25)]) * (0.4 + 0.4 * r.random()), 0.06 + j * 0.025)
        place(y, clank + thud + creak * 0.6, 0.1 + i * 0.75)
    save('footsteps_metal.wav', reverb(y, 0.6, 0.18, seed=812), peak=0.8)


def make_low_drone():
    """a deep, slowly beating drone with a faint metallic shimmer (10 s, loops)"""
    n = int(10.0 * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 41 * t) + 0.8 * np.sin(2 * np.pi * 41.5 * t) + 0.35 * np.sin(2 * np.pi * 82.2 * t) + 0.15 * np.sin(2 * np.pi * 123 * t)
    y += periodic_noise(n, 821, 1800, 3200, 2) * 0.05 * (1 + np.sin(2 * np.pi * t / 5))
    save('low_drone.wav', y, peak=0.7)


def make():
    """called by scripts/make_film_sfx.py"""
    make_pigeon_flutter()
    make_footsteps_metal()
    make_low_drone()
