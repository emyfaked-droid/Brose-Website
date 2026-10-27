"""Stand-in sounds for same-seen. A real recording with the same name (.mp3) replaces them.

Run: python3 scripts/make_film_sfx.py same-seen   -> writes the WAVs into sfx/
"""
from make_sfx import *  # noqa: F401,F403


def make_phone_typing():
    """thumb typing on a phone screen: soft irregular taps, a pause, three backspaces, taps again (~1.6 s)"""
    r = rng(1301)
    buf = np.zeros(int(1.8 * SR))
    times = [0.0, 0.11, 0.2, 0.33, 0.41, 0.52, 0.6, 0.74, 1.05, 1.13, 1.21, 1.42, 1.5, 1.61]
    for k, at in enumerate(times):
        t = tt(0.06)
        hard = 1.3 if 0.95 < at < 1.3 else 1.0          # the backspaces are a touch harder
        tap = fft_filter(r.standard_normal(len(t)), 900, 6000) * np.exp(-t / 0.006) * hard
        tap += modes(t, [(2100 + 300 * r.random(), 0.008, 0.3)])
        place(buf, tap * (0.7 + 0.3 * r.random()), at + 0.05 + 0.01 * r.standard_normal())
    save('phone_typing.wav', reverb(buf, 0.2, 0.08, seed=1302), peak=0.6)


def make():
    make_phone_typing()
