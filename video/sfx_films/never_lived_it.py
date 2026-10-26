"""Extra generated stand-in sounds for 'We Never Lived It' (only what sfx/ does not have yet).

Run: python3 scripts/make_film_sfx.py never-lived-it   -> writes the WAVs into sfx/
Prefer real recordings: drop sfx/camera_shutter.mp3 into sfx/ and it replaces the stand-in.
"""
from make_sfx import *  # noqa: F401,F403


def make_camera_shutter():
    """phone camera shutter: a short mechanical click-clack"""
    r = rng(1101)
    buf = np.zeros(int(0.5 * SR))
    for at, amp, lo, hi in [(0.02, 1.0, 1800, 9000), (0.085, 0.75, 1200, 7000)]:
        t = tt(0.06)
        click = fft_filter(r.standard_normal(len(t)), lo, hi) * np.exp(-t / 0.006)
        click += modes(t, [(2400, 0.01, 0.4), (3900, 0.006, 0.25)])
        place(buf, click * amp, at)
    save('camera_shutter.wav', reverb(buf, 0.2, 0.1, seed=1102), peak=0.8)


def make():
    """called by scripts/make_film_sfx.py"""
    make_camera_shutter()
