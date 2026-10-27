"""Stand-in sounds for the daily series stick-to-strong (only what sfx/ does not have yet).

Run: python3 scripts/make_film_sfx.py stick-to-strong   -> writes the WAVs into sfx/
Real recordings with the same name (.mp3) win automatically; search terms are in sounds/stick-to-strong.js.
"""
from make_sfx import *  # noqa: F401,F403


def make_hands_floor():
    """two palms set down flat on a wooden floor"""
    r = rng(1101)
    buf = np.zeros(int(0.6 * SR))
    for i, at in enumerate([0.05, 0.13]):
        t = tt(0.4)
        slap = fft_filter(r.standard_normal(len(t)), 500, 4500) * np.exp(-t / 0.006) * 0.9
        body = modes(t, [(150 + 20 * r.random(), 0.05, 0.6), (330, 0.03, 0.3)])
        place(buf, (slap + body) * (1 - 0.25 * i), at)
    save('hands_floor.wav', reverb(buf, 0.3, 0.15, seed=1102), peak=0.8)


def make_strain_exhale():
    """2.5 s of pushing: a held, strained breath through the teeth that gets shakier, then a burst out"""
    r = rng(1111)
    dur = 2.6
    t = tt(dur)
    src = r.standard_normal(len(t))
    hiss = formants(src, [(2600, 900, 1.0), (4200, 1200, 0.6), (900, 400, 0.3)])
    trem = 1 + 0.35 * np.clip(t / dur, 0, 1) ** 2 * np.sin(2 * np.pi * 8.5 * t)
    env = np.minimum(t / 0.15, 1) * (0.35 + 0.4 * t / dur) * trem
    y = fft_filter(hiss, 400, 7000, 2) * env
    f0 = 135 + 25 * (t / dur)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    grunt = sum(np.sin(k * ph) / k ** 1.4 for k in range(1, 10)) * 0.12 * np.clip((t - 1.4) / 1.0, 0, 1) * trem
    y += formants(grunt, [(650, 150, 1.0), (1100, 200, 0.5)])
    save('strain_exhale.wav', reverb(fade(y, 0.05, 0.08), 0.35, 0.12, seed=1112), peak=0.7)


def make_body_thud():
    """a whole body flopping flat onto a wooden floor: a low dull hit, cloth, a short floor rattle"""
    r = rng(1121)
    t = tt(1.0)
    hit = np.sin(2 * np.pi * (58 + 50 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.11) * 1.6
    hit += fft_filter(r.standard_normal(len(t)), 120, 1500) * np.exp(-t / 0.03) * 0.9
    hit += modes(t, [(118, 0.12, 0.5), (205, 0.08, 0.35), (340, 0.05, 0.2)])
    cloth = cloth_burst(r, t, 0.0, 0.25, 0.35, 300, 3500)
    save('body_thud.wav', reverb(hit + cloth, 0.45, 0.14, seed=1122), peak=0.9)


def make_tip_pling():
    """short bright two-note pling for the tip card"""
    t = tt(1.2)
    y = chime(t, 1318.5, 0.35) * 0.8
    y2 = np.zeros_like(t); place(y2, chime(tt(1.1), 1975.5, 0.4), 0.07)
    save('tip_pling.wav', reverb(fade(y + y2 * 0.7, 0.002, 0.2), 0.6, 0.2, seed=1131), peak=0.6)


def make_gym_atmo():
    """gym bed: big hall, ventilation hum, distant plate clinks and murmurs (8 s loop)"""
    r = rng(1141)
    n = int(8 * SR)
    hall = periodic_noise(n, 1142, 60, 900) * 0.35 + periodic_noise(n, 1143, 900, 4000) * 0.05
    t = np.arange(n) / SR
    hum = 0.05 * np.sin(2 * np.pi * 100 * t) + 0.03 * np.sin(2 * np.pi * 50 * t)
    y = hall + hum
    for _ in range(9):
        at = r.random() * 7.6
        tc = tt(0.6)
        f = 700 + 900 * r.random()
        clink = modes(tc, [(f, 0.2, 1.0), (f * 2.76, 0.08, 0.4), (f * 5.4, 0.03, 0.2)]) * 0.12
        place(y, fft_filter(clink, 300, 6000), at)
    save('gym_atmo.wav', loopable(reverb(y, 1.4, 0.45, seed=1144)), peak=0.5)


def make_barbell_clank():
    """steel bar racked onto the hooks, plates rattle"""
    r = rng(1151)
    t = tt(1.2)
    y = modes(t, [(410, 0.35, 1.0), (1130, 0.2, 0.6), (2350, 0.1, 0.35), (3890, 0.05, 0.2)])
    y += fft_filter(r.standard_normal(len(t)), 1500, 9000) * np.exp(-t / 0.008) * 0.8
    rat = np.zeros_like(t)
    for at in [0.04, 0.09, 0.16]:
        place(rat, modes(tt(0.4), [(620 + 200 * r.random(), 0.06, 0.5), (1800, 0.03, 0.3)]), at)
    save('barbell_clank.wav', reverb(y + rat, 0.9, 0.3, seed=1152), peak=0.85)


def make_effort_grunt():
    """a short male effort grunt (lifting)"""
    r = rng(1161)
    t = tt(0.7)
    f0 = 120 + 30 * np.exp(-t / 0.2)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    v = sum(np.sin(k * ph) / k ** 1.3 for k in range(1, 14))
    v += fft_filter(r.standard_normal(len(t)), 300, 4000) * 0.3
    env = np.minimum(t / 0.03, 1) * np.exp(-np.maximum(t - 0.25, 0) / 0.12)
    y = formants(v, [(600, 140, 1.0), (1000, 180, 0.6), (2400, 300, 0.2)]) * env
    save('effort_grunt.wav', reverb(fade(y, 0.005, 0.1), 0.35, 0.12, seed=1162), peak=0.7)


def make_scale_beep():
    """bathroom scale: two short digital beeps"""
    t = tt(0.5)
    y = np.zeros_like(t)
    for at in [0.0, 0.16]:
        tb = tt(0.09)
        place(y, np.sign(np.sin(2 * np.pi * 2900 * tb)) * 0.25 * fade(np.ones_like(tb), 0.003, 0.01), at)
    save('scale_beep.wav', fft_filter(y, 500, 8000), peak=0.5)


def make():
    make_hands_floor(); make_strain_exhale(); make_body_thud(); make_tip_pling()
    make_gym_atmo(); make_barbell_clank(); make_effort_grunt(); make_scale_beep()
