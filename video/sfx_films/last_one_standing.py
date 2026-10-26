"""Extra generated stand-in sounds for 'Pick A Color' (last one standing). Only what sfx/ does not have yet.

Run: python3 scripts/make_film_sfx.py last-one-standing   -> writes the WAVs into sfx/
Prefer real recordings: drop e.g. sfx/stone_crash.mp3 into sfx/ and it replaces the stand-in.
"""
from make_sfx import *  # noqa: F401,F403


def make_rumble_low():
    """deep earth rumble, 3 s, swells in and dies away"""
    r = rng(1201)
    t = tt(3.0)
    x = fft_filter(r.standard_normal(len(t)), 18, 90) * 2.5 + fft_filter(r.standard_normal(len(t)), 90, 300) * 0.5
    x += 0.4 * np.sin(2 * np.pi * 34 * t + 2 * np.sin(2 * np.pi * 0.7 * t))
    env = np.minimum(t / 0.35, 1) * np.exp(-np.maximum(t - 0.6, 0) / 0.9)
    save('rumble_low.wav', reverb(x * env, 0.8, 0.3, seed=1202), peak=0.85)


def make_stone_crack():
    """dry stone cracking: a burst of sharp ticks"""
    r = rng(1211)
    buf = np.zeros(int(1.2 * SR))
    at = 0.02
    for i in range(14):
        t = tt(0.05)
        tick = fft_filter(r.standard_normal(len(t)), 900, 7000) * np.exp(-t / (0.003 + 0.004 * r.random()))
        tick += modes(t, [(300 + 500 * r.random(), 0.02, 0.5)]) * 0.5
        place(buf, tick * (0.4 + 0.8 * r.random()) * np.exp(-i * 0.08), at)
        at += 0.015 + 0.07 * r.random()
    save('stone_crack.wav', reverb(buf, 0.4, 0.2, seed=1212), peak=0.8)


def make_rock_crumble():
    """stone breaking away and crumbling: low crunch plus falling grit, 1.8 s"""
    r = rng(1221)
    buf = np.zeros(int(1.8 * SR))
    t = tt(0.4)
    place(buf, fft_filter(r.standard_normal(len(t)), 60, 900) * np.exp(-t / 0.09) * 1.4, 0.0)
    for i in range(60):
        tg = tt(0.03)
        g = fft_filter(r.standard_normal(len(tg)), 1500, 8000) * np.exp(-tg / 0.004)
        place(buf, g * (0.15 + 0.35 * r.random()) * np.exp(-i / 30), 0.03 + 1.4 * r.random() ** 1.6)
    tl = tt(1.6)
    buf[:len(tl)] += fft_filter(r.standard_normal(len(tl)), 80, 2500) * np.exp(-tl / 0.5) * 0.35
    save('rock_crumble.wav', reverb(buf, 0.7, 0.28, seed=1222), peak=0.85)


def make_stone_crash():
    """big crack and crash as the pillar splits, 2.5 s"""
    r = rng(1231)
    buf = np.zeros(int(2.5 * SR))
    t = tt(0.08)
    place(buf, fft_filter(r.standard_normal(len(t)), 500, 9000) * np.exp(-t / 0.01) * 1.5, 0.0)
    t = tt(1.4)
    boom = fft_filter(r.standard_normal(len(t)), 25, 400) * np.exp(-t / 0.35) * 2.2 + 0.8 * np.sin(2 * np.pi * 48 * t) * np.exp(-t / 0.3)
    place(buf, boom, 0.01)
    for i in range(80):
        tg = tt(0.04)
        g = fft_filter(r.standard_normal(len(tg)), 700, 7000) * np.exp(-tg / 0.006)
        place(buf, g * (0.2 + 0.5 * r.random()) * np.exp(-i / 35), 0.02 + 1.6 * r.random() ** 1.4)
    save('stone_crash.wav', reverb(buf, 1.1, 0.35, seed=1232), peak=0.9)


def make_ui_pop():
    """small, soft UI pop"""
    t = tt(0.16)
    f = 520 + 380 * np.exp(-t / 0.02)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)
    save('ui_pop.wav', fade(x, 0.002, 0.02), peak=0.7)


def make_cheer_short():
    """a short "yay!" from a few voices, 1.5 s"""
    r = rng(1241)
    buf = np.zeros(int(1.8 * SR))
    for f0, delay, v in [(260, 0.0, 'e'), (310, 0.03, 'a'), (220, 0.05, 'e'), (350, 0.02, 'a'), (190, 0.07, 'a')]:
        p = voice_pulse(f0, 0.75, VOWELS[v], r, vib=6.0)
        place(buf, norm(p, 0.5) * (0.7 + 0.4 * r.random()), 0.05 + delay)
    n = len(buf)
    buf += fft_filter(r.standard_normal(n), 300, 4000) * np.exp(-np.arange(n) / SR / 0.5) * 0.08
    save('cheer_short.wav', reverb(buf, 0.6, 0.3, seed=1242), peak=0.8)


def make():
    """called by scripts/make_film_sfx.py"""
    make_rumble_low()
    make_stone_crack()
    make_rock_crumble()
    make_stone_crash()
    make_ui_pop()
    make_cheer_short()
