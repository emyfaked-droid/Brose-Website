"""Stand-in sounds for did-you-notice (dinner table). Real recordings with the same name (.mp3) replace them.

Run: python3 scripts/make_film_sfx.py did-you-notice   -> writes the WAVs into sfx/
"""
from make_sfx import *  # noqa: F401,F403


def make_ladle_pot():
    """metal ladle dips into a pot of stew: a dull clunk on the rim plus a thick scoop"""
    r = rng(1201)
    t = tt(0.7)
    clunk = modes(t, [(1180, 0.05, 0.8), (2310, 0.035, 0.5), (3470, 0.02, 0.3), (640, 0.06, 0.3)])
    tick = fft_filter(r.standard_normal(len(t)), 1500, 8000) * np.exp(-t / 0.003) * 0.6
    slosh = fft_filter(r.standard_normal(len(t)), 150, 1100) * np.exp(-((t - 0.12) / 0.07) ** 2) * 0.5
    save('ladle_pot.wav', reverb(clunk + tick + slosh, 0.3, 0.15, seed=1202), peak=0.8)


def make_food_plop():
    """a ladle of stew lands on a plate: soft, wet, low"""
    r = rng(1211)
    t = tt(0.5)
    plop = fft_filter(r.standard_normal(len(t)), 120, 900) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.004))
    thud = modes(t, [(210, 0.04, 0.5), (420, 0.02, 0.2)])
    save('food_plop.wav', reverb(plop + thud, 0.25, 0.12, seed=1212), peak=0.7)


def make_fork_plate():
    """a fork touches a ceramic plate: short bright tink"""
    r = rng(1221)
    t = tt(0.45)
    tink = modes(t, [(3240, 0.03, 0.8), (5120, 0.02, 0.5), (7400, 0.012, 0.3), (1900, 0.04, 0.2)])
    tick = fft_filter(r.standard_normal(len(t)), 3000, 10000) * np.exp(-t / 0.0015) * 0.7
    save('fork_plate.wav', reverb(tink + tick, 0.3, 0.14, seed=1222), peak=0.8)


def make_plate_slide():
    """a plate slid a short way across a wooden table: quiet, dry friction"""
    r = rng(1231)
    t = tt(1.1)
    env = np.sin(np.pi * np.clip(t / 0.9, 0, 1)) ** 1.5
    rough = 1 + 0.35 * fft_filter(r.standard_normal(len(t)), None, 40)
    fr = fft_filter(r.standard_normal(len(t)), 250, 2600) * env * rough
    save('plate_slide.wav', reverb(fade(fr, 0.02, 0.1), 0.25, 0.1, seed=1232), peak=0.7)


def make_pot_scrape():
    """a ladle scraping the bottom of an almost empty pot: one gritty metal stroke"""
    r = rng(1241)
    t = tt(0.6)
    env = np.sin(np.pi * np.clip(t / 0.45, 0, 1)) ** 0.8
    grit = fft_filter(r.standard_normal(len(t)), 1400, 6500) * (0.6 + 0.4 * np.abs(fft_filter(r.standard_normal(len(t)), None, 90)) * 3)
    ring = (np.sin(2 * np.pi * 2140 * t) * 0.25 + np.sin(2 * np.pi * 3320 * t) * 0.15) * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * t))
    save('pot_scrape.wav', reverb(fade((grit + ring) * env, 0.01, 0.08), 0.3, 0.18, seed=1242), peak=0.8)


def make_family_laugh():
    """a small family laughing at the table: father, mother, two children; soft and close"""
    r = rng(1251)
    buf = np.zeros(int(2.6 * SR))
    voices = [(118, 0.05, 'a', 0.7), (215, 0.0, 'e', 0.9), (310, 0.09, 'a', 0.8), (355, 0.14, 'e', 0.7)]
    for f0, delay, v, g in voices:
        n = int(5 + 3 * r.random())
        rate = 5.0 + 1.4 * r.random()
        for k in range(n):
            amp = np.exp(-k * 0.2) * (0.8 + 0.4 * r.random()) * g
            ff = f0 * (1.0 - 0.015 * k) * (1 + 0.02 * r.standard_normal())
            p = voice_pulse(ff, 0.16, VOWELS[v], r)
            place(buf, norm(p, 0.5) * amp, 0.05 + delay + k / rate + 0.012 * r.standard_normal())
    save('family_laugh.wav', reverb(fft_filter(buf, 90, 5000), 0.4, 0.2, seed=1252), peak=0.8)


def make():
    make_ladle_pot(); make_food_plop(); make_fork_plate(); make_plate_slide(); make_pot_scrape(); make_family_laugh()
