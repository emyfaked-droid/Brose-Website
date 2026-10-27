"""Stand-in sounds for ghost-walk (only what sfx/ does not have yet).

Run: python3 scripts/make_film_sfx.py ghost-walk   -> writes the WAVs into sfx/
Real recordings (sfx/<name>.mp3) replace these automatically.
"""
from make_sfx import *  # noqa: F401,F403


def make_floor_creak():
    """an old wooden floorboard creaking under a slow step"""
    r = rng(1201)
    t = tt(0.9)
    u = np.clip((t - 0.04) / 0.55, 0, 1)
    f = 210 + 90 * np.sin(np.pi * u) + 12 * np.sin(2 * np.pi * 9 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 9))
    stick = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (34 + 14 * u) * t))     # stick-slip of the wood
    env = np.sin(np.pi * u) ** 1.3 * (t > 0.04)
    y = fft_filter(saw * stick * env, 180, 3200) * 0.6
    y += modes(t, [(95, 0.12, 0.5), (160, 0.09, 0.3)]) * 0.6               # the board itself
    y += fft_filter(r.standard_normal(len(t)), 400, 2500) * np.exp(-t / 0.03) * 0.15
    save('floor_creak.wav', reverb(y, 0.7, 0.25, seed=1202), peak=0.8)


def make_tension_drone():
    """a deep dramatic drone that swells for 6.5 s (it is cut hard at the trip)"""
    r = rng(1211)
    t = tt(6.8)
    grow = np.clip(t / 6.3, 0, 1) ** 1.6
    y = np.zeros_like(t)
    for f0, g in [(41.2, 1.0), (41.6, 0.8), (61.7, 0.5), (82.4, 0.35), (87.3, 0.25 * 1.0)]:
        f = f0 * (1 + 0.012 * grow * np.sin(2 * np.pi * 0.3 * t))
        ph = 2 * np.pi * np.cumsum(f) / SR
        y += g * sum(np.sin(k * ph) / k ** 1.5 for k in range(1, 12))
    y = (fft_filter(y, 30, 300) * (1 - grow) + fft_filter(y, 30, 2500) * grow) * (0.25 + 0.75 * grow)   # opens up as it grows
    y += fft_filter(r.standard_normal(len(t)), 2000, 7000) * 0.04 * grow ** 2  # airy string noise on top
    save('tension_drone.wav', fade(reverb(y, 1.4, 0.3, seed=1212), 0.3, 0.0), peak=0.85)


def make_body_thud():
    """a whole body landing flat on a wooden floor, under a sheet"""
    r = rng(1221)
    t = tt(1.4)
    y = np.zeros_like(t)
    hit = np.sin(2 * np.pi * (52 + 70 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.16) * 1.6
    hit += fft_filter(r.standard_normal(len(t)), 120, 1400) * np.exp(-t / 0.035) * 0.9
    hit += modes(t, [(110, 0.18, 0.5), (180, 0.12, 0.3)]) * 0.5             # floorboards ring a little
    place(y, hit, 0.05)
    y += cloth_burst(r, t, 0.03, 0.4, 0.35, 300, 4000)
    save('body_thud.wav', reverb(y, 0.6, 0.15, seed=1222), peak=0.9)


def make_muffled_groan():
    """a short pained 'mmmhh' from under a sheet (no words)"""
    r = rng(1231)
    a = voice_pulse(120, 0.75, VOWELS['o'], r, vib=6.0)
    a = fft_filter(a, 90, 900)                                                # muffled by the sheet
    y = np.zeros(int(1.2 * SR))
    place(y, a, 0.05)
    save('muffled_groan.wav', reverb(fade(y, 0.0, 0.2), 0.4, 0.12, seed=1232), peak=0.7)


def make():
    make_floor_creak()
    make_tension_drone()
    make_body_thud()
    make_muffled_groan()
