"""Extra generated stand-in sounds for 'Pick A Color' (wipeout 1). Only what sfx/ does not have yet.

Run: python3 scripts/make_film_sfx.py wipeout-1   -> writes the WAVs into sfx/
Prefer real recordings: drop e.g. sfx/water_splash.mp3 into sfx/ and it replaces the stand-in.
"""
from make_sfx import *  # noqa: F401,F403


def beep(f, dur, amp=1.0):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return fade(x * amp, 0.004, 0.03)


def make_start_beeps():
    """start light: a short low beep, and the long high 'go' beep"""
    save('start_beep.wav', beep(660, 0.22), peak=0.7)
    save('start_go.wav', beep(1320, 0.6), peak=0.75)


def make_rubber_boing():
    """rubber ball bounce: a thump with a pitch that wobbles down"""
    t = tt(0.7)
    f = 140 + 220 * np.exp(-t / 0.08) + 25 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / 0.3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    r = rng(1301)
    x += fft_filter(r.standard_normal(len(t)), 80, 900) * np.exp(-t / 0.02) * 0.6
    save('rubber_boing.wav', reverb(fade(x, 0.002, 0.05), 0.3, 0.12, seed=1302), peak=0.85)


def make_water_splash():
    """big water splash: impact, a burst of spray, and water falling back, 2 s"""
    r = rng(1311)
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    imp = fft_filter(r.standard_normal(n), 60, 600) * np.exp(-t / 0.05) * 2.0
    spray = fft_filter(r.standard_normal(n), 800, 9000) * (np.minimum(t / 0.02, 1) * np.exp(-t / 0.35)) * 1.2
    back = np.zeros(n)
    for i in range(160):
        tg = tt(0.03)
        d = fft_filter(r.standard_normal(len(tg)), 1500, 8000) * np.exp(-tg / 0.006)
        place(back, d * (0.1 + 0.3 * r.random()), 0.15 + 1.2 * r.random() ** 1.5)
    x = imp + spray + back
    save('water_splash.wav', reverb(fade(x, 0.0, 0.3), 0.7, 0.25, seed=1312), peak=0.9)


def make_punch_bag_hit():
    """punching bag hit: a dull, heavy thud"""
    r = rng(1321)
    t = tt(0.5)
    x = np.sin(2 * np.pi * (70 + 60 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.12) * 1.4
    x += fft_filter(r.standard_normal(len(t)), 100, 1500) * np.exp(-t / 0.03)
    save('punch_bag_hit.wav', reverb(x, 0.35, 0.15, seed=1322), peak=0.9)


def make_slide_squeak():
    """sliding squeak (rubber on a wet slope), 1.2 s"""
    r = rng(1331)
    t = tt(1.2)
    f = 900 + 250 * np.sin(2 * np.pi * 3.1 * t) + 120 * fft_filter(r.standard_normal(len(t)), 1, 12)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    x = fft_filter(x, 500, 5000) * (np.minimum(t / 0.05, 1) * np.exp(-np.maximum(t - 0.8, 0) / 0.15))
    save('slide_squeak.wav', reverb(x, 0.3, 0.12, seed=1332), peak=0.7)


def make_buzzer():
    """game show buzzer, 1.1 s"""
    t = tt(1.1)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) * a for f, a in [(220, 1.0), (277, 0.7), (330, 0.5)])
    x = fft_filter(x, 100, 4000) * np.minimum(t / 0.01, 1) * np.where(t < 0.9, 1.0, np.exp(-(t - 0.9) / 0.05))
    save('buzzer.wav', x, peak=0.8)


def make_crowd_cheer():
    """short crowd cheer, 3 s (many voices on 'ah' and 'yeah', plus claps)"""
    r = rng(1341)
    n = int(3.0 * SR)
    buf = np.zeros(n)
    for v in range(16):
        f0 = 160 + 220 * r.random()
        p = voice_pulse(f0, 1.4 + 0.8 * r.random(), VOWELS['a' if v % 3 else 'e'], r, vib=5.0 + 2 * r.random())
        place(buf, norm(p, 0.4) * (0.5 + 0.5 * r.random()), 0.02 * v * r.random())
    for i in range(70):
        tc = tt(0.03)
        place(buf, fft_filter(r.standard_normal(len(tc)), 900, 6000) * np.exp(-tc / 0.006) * 0.5, 0.1 + 2.6 * r.random())
    tt_ = np.arange(n) / SR
    buf *= np.minimum(tt_ / 0.08, 1) * np.exp(-np.maximum(tt_ - 1.6, 0) / 0.6)
    save('crowd_cheer.wav', reverb(buf, 1.0, 0.35, seed=1342), peak=0.8)


def make_confetti_pop():
    """confetti cannon: a pop and a paper rustle"""
    r = rng(1351)
    buf = np.zeros(int(1.5 * SR))
    t = tt(0.1)
    place(buf, fft_filter(r.standard_normal(len(t)), 200, 5000) * np.exp(-t / 0.012) * 1.5, 0.0)
    tl = tt(1.4)
    place(buf, fft_filter(r.standard_normal(len(tl)), 2500, 9000) * np.exp(-tl / 0.5) * 0.25 * (1 + 0.5 * np.sin(2 * np.pi * 13 * tl)), 0.03)
    save('confetti_pop.wav', reverb(buf, 0.5, 0.2, seed=1352), peak=0.8)


def make_ui_pop():
    """small, soft UI pop"""
    t = tt(0.16)
    f = 520 + 380 * np.exp(-t / 0.02)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)
    save('ui_pop.wav', fade(x, 0.002, 0.02), peak=0.7)


def make_water_lap():
    """bed: water lapping under the course, loopable 8 s"""
    r = rng(1361)
    n = int(8.0 * SR)
    t = np.arange(n) / SR
    x = fft_filter(r.standard_normal(n), 150, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.6 * t + 2 * np.sin(2 * np.pi * 0.23 * t))) ** 2
    x += fft_filter(r.standard_normal(n), 40, 200) * 0.6
    save('water_lap.wav', loopable(reverb(x, 0.8, 0.3, seed=1362)), peak=0.6)


def make():
    """called by scripts/make_film_sfx.py"""
    make_start_beeps()
    make_rubber_boing()
    make_water_splash()
    make_punch_bag_hit()
    make_slide_squeak()
    make_buzzer()
    make_crowd_cheer()
    make_confetti_pop()
    make_ui_pop()
    make_water_lap()
