"""Stand-in sounds for last-bus-1 (only what sfx/ does not have yet).

Run: python3 scripts/make_film_sfx.py last-bus-1   -> writes the WAVs into sfx/
Replace any of them with a real recording of the same name (.mp3 wins).
"""
from make_sfx import *  # noqa: F401,F403


def make_bus_engine():
    """inside a city bus at night: diesel idle rumble, low road roar, a faint rattle; loops seamlessly (8 s)"""
    n = int(8.0 * SR)
    t = np.arange(n) / SR
    fire = 31.25                                                  # firing rate (divides the loop length)
    x = np.sin(2 * np.pi * fire * t)
    rumble = 0.7 * np.sign(x) * np.abs(x) ** 0.5 + 0.4 * np.sin(2 * np.pi * fire * 2 * t) + 0.2 * np.sin(2 * np.pi * fire * 3 * t)
    rumble = fft_filter(rumble, 25, 400, 2)
    road = periodic_noise(n, 701, 40, 700, 2) * 1.4
    rattle = periodic_noise(n, 702, 1500, 5000, 2) * (periodic_noise(n, 703, None, 6, 1) > 0.01) * 0.12
    y = rumble * (1 + 0.08 * np.sin(2 * np.pi * t / 2.0)) + road + rattle
    save('bus_engine.wav', y, peak=0.6)


def make_brake_squeal():
    """air brakes on a bus: a rising, wavering squeal, then the hiss of the air release (2.4 s)"""
    r = rng(711)
    t = tt(2.4)
    f = 2350 + 180 * np.clip(t / 1.3, 0, 1) + 40 * np.sin(2 * np.pi * 7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.clip(t / 0.25, 0, 1) * (1 - np.clip((t - 1.15) / 0.3, 0, 1))
    squeal = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3.01 * ph)) * env * 0.6
    hiss_env = np.clip((t - 1.45) / 0.05, 0, 1) * np.exp(-np.maximum(t - 1.5, 0) / 0.35)
    hiss = fft_filter(r.standard_normal(len(t)), 2500, 9000, 2) * hiss_env * 0.9
    save('brake_squeal.wav', reverb(fade(squeal + hiss, 0.01, 0.2), 0.5, 0.15, seed=712), peak=0.7)


def make_scared_breath():
    """held, shaky breathing: short trembling in-breaths, slow out-breaths (6 s, loops)"""
    r = rng(721)
    n = int(6.4 * SR)
    y = np.zeros(n)
    at, per = 0.05, 1.5
    while at < 6.0:
        for kind, dur, gain in [('in', per * 0.35, 0.6), ('out', per * 0.55, 0.8)]:
            tb = tt(dur); u = tb / dur
            src = r.standard_normal(len(tb))
            vt = formants(src, [(700, 450, 1.0), (1500, 600, 0.5), (2800, 900, 0.25)])
            env = np.sin(np.pi * u ** 0.6) ** 1.4 * (1 + 0.35 * np.sin(2 * np.pi * 9 * tb) * (kind == 'in'))
            place(y, fft_filter(vt, 300, 5000, 2) * env * gain * (0.85 + 0.3 * r.random()), at)
            at += dur
        at += per * 0.15
    save('scared_breath.wav', reverb(loopable(y, 0.3), 0.3, 0.1, seed=722), peak=0.6)


def make_bass_pulse():
    """a deep, slow sub pulse (like a far heartbeat in the floor): 1 pulse per 1.1 s, 8.8 s, loops"""
    n = int(8.8 * SR)
    y = np.zeros(n)
    for i in range(8):
        tp = tt(0.9)
        f = 46 + 14 * np.exp(-tp / 0.05)
        p = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tp / 0.32) * np.clip(tp / 0.01, 0, 1)
        place(y, p, i * 1.1)
    save('bass_pulse.wav', y, peak=0.8)


def make():
    """called by scripts/make_film_sfx.py"""
    make_bus_engine()
    make_brake_squeal()
    make_scared_breath()
    make_bass_pulse()
