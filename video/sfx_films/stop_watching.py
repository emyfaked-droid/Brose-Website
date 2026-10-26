"""Extra generated stand-in sounds for 'Stop Watching The Time'. Only what sfx/ does not have yet.

Run: python3 scripts/make_film_sfx.py stop-watching   -> writes the WAVs into sfx/
Prefer real recordings: drop e.g. sfx/sand_trickle.mp3 into sfx/ and it replaces the stand-in.
"""
from make_sfx import *  # noqa: F401,F403


def make_sand_trickle():
    """fine sand running through an hourglass, loopable 6 s"""
    r = rng(1401)
    n = int(6.0 * SR)
    x = fft_filter(r.standard_normal(n), 2500, 11000) * 0.35
    grains = np.zeros(n)
    for i in range(2400):
        tg = tt(0.004)
        place(grains, fft_filter(r.standard_normal(len(tg)), 3000, 12000) * np.exp(-tg / 0.0008) * (0.2 + 0.8 * r.random()), 5.99 * r.random())
    x = x * (0.85 + 0.15 * fft_filter(r.standard_normal(n), 0.3, 3)) + grains * 0.6
    save('sand_trickle.wav', loopable(reverb(x, 0.25, 0.1, seed=1402)), peak=0.6)


def make_chair_scrape():
    """a wooden chair pushed back on the floor, 0.7 s"""
    r = rng(1411)
    t = tt(0.7)
    f = 180 + 60 * np.sin(2 * np.pi * 7 * t) + 40 * fft_filter(r.standard_normal(len(t)), 2, 40)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    x = fft_filter(tone + 0.6 * r.standard_normal(len(t)), 150, 3000)
    x *= np.minimum(t / 0.04, 1) * np.exp(-np.maximum(t - 0.35, 0) / 0.12) * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * t))
    save('chair_scrape.wav', reverb(x, 0.4, 0.15, seed=1412), peak=0.7)


def make():
    """called by scripts/make_film_sfx.py"""
    make_sand_trickle()
    make_chair_scrape()
