"""Stand-in sounds for noise-cancel-explained. A real recording with the same name (.mp3) replaces them.

Run: python3 scripts/make_film_sfx.py noise-cancel-explained   -> writes the WAVs into sfx/
"""
from make_sfx import *  # noqa: F401,F403


def make_deep_release():
    """a soft, deep 'release' when the waves cancel: low sine swell with a long, calm tail (~2.5 s)"""
    r = rng(1401)
    t = tt(2.6)
    env = (1 - np.exp(-t / 0.05)) * np.exp(-t / 0.9)
    tone = (np.sin(2 * np.pi * 52 * t) + 0.45 * np.sin(2 * np.pi * 78 * t) + 0.18 * np.sin(2 * np.pi * 104 * t)) * env
    air = fft_filter(r.standard_normal(len(t)), 80, 600) * np.exp(-t / 0.35) * 0.15
    save('deep_release.wav', reverb(fade(tone + air, 0.0, 0.4), 0.8, 0.3, seed=1402), peak=0.8)


def make():
    make_deep_release()
