#!/usr/bin/env python3
"""Procedural foley for "Ask Twice": writes the 15 files listed in sfx/README.md as 48 kHz WAV.

These are *modelled* sounds, not recordings: damped resonant modes (wood, metal, plastic, glass),
filtered-noise transients, formant-filtered voice pulses, FM bird chirps, a small drum/bass loop and
convolution room reverb. They stand in until real recordings are dropped into sfx/ under the same
names (scripts/mix.js prefers .mp3 over .wav, so a real mp3 wins automatically).

usage: python3 scripts/make_sfx.py [outdir]     (needs numpy)
"""
import sys, os, wave
import numpy as np

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'sfx')
os.makedirs(OUT, exist_ok=True)


def rng(seed):
    return np.random.default_rng(seed)


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def fft_filter(x, lo=None, hi=None, order=4):
    """zero-phase Butterworth-shaped band-pass / low-pass / high-pass"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    f[0] = 1e-3
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / f) ** (2 * order))
    if hi:
        m *= 1 / (1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * m, len(x))


def formants(x, peaks):
    """sum of resonant peaks (freq, bandwidth, gain): crude vocal tract"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.zeros_like(f)
    for fc, bw, g in peaks:
        m += g / (1 + ((f - fc) / (bw / 2)) ** 2)
    return np.fft.irfft(X * m, len(x))


def reverb(x, rt=0.4, wet=0.25, seed=5, pre=0.004, damp=5000):
    r = rng(seed)
    n = int(rt * 1.2 * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-6.9 * t / rt)
    ir = fft_filter(ir, hi=damp, order=2)
    ir[: int(pre * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - wet * 0.5) + y * wet * 2.0


def place(buf, snd, at):
    i = int(at * SR)
    n = min(len(snd), len(buf) - i)
    if n > 0 and i >= 0:
        buf[i:i + n] += snd[:n]


def modes(t, parts):
    """damped sinusoids: (freq, decay_seconds, amp)"""
    y = np.zeros_like(t)
    for f, d, a in parts:
        y += a * np.sin(2 * np.pi * f * t) * np.exp(-t / d)
    return y


def norm(x, peak=0.9):
    return x * (peak / (np.max(np.abs(x)) + 1e-9))


def fade(x, a=0.0, b=0.0):
    x = x.copy()
    if a:
        n = int(a * SR); x[:n] *= np.linspace(0, 1, n)
    if b:
        n = int(b * SR); x[-n:] *= np.linspace(1, 0, n)
    return x


def save(name, x, peak=0.9, stereo=True):
    x = norm(x, peak) if peak else x
    x = np.clip(x, -1, 1)
    if stereo:   # tiny decorrelated width so it does not sit dead centre
        d = int(0.0004 * SR)
        y = np.stack([x, np.roll(x, d)], 1)
    else:
        y = np.stack([x, x], 1)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())
    print('wrote', name, f'{len(x) / SR:.1f}s')


# ------------------------------------------------------------------ footsteps on a wooden floor
def footstep(seed, weight=1.0):
    r = rng(seed)
    t = tt(0.55)
    # heel strike: broadband tick
    tick = fft_filter(r.standard_normal(len(t)), 900, 5500) * np.exp(-t / 0.004) * 1.3
    # the shoe/foot thump on a hollow floor
    f0 = 62 + 8 * r.random()
    thump = np.sin(2 * np.pi * (f0 + 40 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.055) * 1.6 * weight
    # floorboard resonances
    body = modes(t, [(135 + 25 * r.random(), 0.09, 0.55), (212 + 30 * r.random(), 0.07, 0.4),
                     (355 + 40 * r.random(), 0.05, 0.28), (610 + 60 * r.random(), 0.035, 0.16)])
    # sole scuff after the strike
    scuff = fft_filter(r.standard_normal(len(t)), 1200, 4200) * np.exp(-((t - 0.05) / 0.06) ** 2) * 0.12
    x = tick + thump + body + scuff
    x = reverb(x, 0.35, 0.18, seed=seed)
    return x


def make_footsteps():
    buf = np.zeros(int(8.0 * SR))
    for i in range(10):
        s = footstep(100 + i, weight=0.9 + 0.2 * ((i * 7) % 5) / 4)
        place(buf, norm(s, 0.8 - 0.1 * ((i * 3) % 4) / 3), 0.25 + i * 0.75)
    save('footsteps_wood.wav', buf, peak=0.85)


# ------------------------------------------------------------------ doors, locks
def make_door_close():
    r = rng(11)
    t = tt(1.8)
    thump = np.sin(2 * np.pi * (52 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.2) * 1.8
    slam = fft_filter(r.standard_normal(len(t)), 150, 1800) * np.exp(-t / 0.06) * 1.2
    wood = modes(t, [(118, 0.35, 0.8), (186, 0.3, 0.55), (310, 0.22, 0.4), (520, 0.15, 0.25), (880, 0.1, 0.12)])
    latch_t = t - 0.045
    latch = np.where(latch_t > 0, fft_filter(r.standard_normal(len(t)), 1800, 6500) * np.exp(-np.maximum(latch_t, 0) / 0.006), 0) * 0.9
    rattle = modes(np.maximum(latch_t, 0) * (latch_t > 0), [(2300, 0.04, 0.18), (3400, 0.03, 0.12)]) * (latch_t > 0)
    x = thump + slam + wood + latch + rattle
    save('door_close.wav', reverb(x, 0.7, 0.3, seed=12))


def make_lock_click():
    r = rng(21)
    t = tt(0.7)
    y = np.zeros_like(t)
    for at, g in [(0.02, 1.0), (0.17, 0.75)]:
        c = np.zeros_like(t)
        tc = t - at
        m = tc > 0
        tc = np.where(m, tc, 0)
        c = (modes(tc, [(2450, 0.012, 0.8), (3720, 0.009, 0.55), (5100, 0.006, 0.35), (1280, 0.02, 0.4)]) +
             fft_filter(r.standard_normal(len(t)), 2000, 8000) * np.exp(-tc / 0.003) * 0.8) * m
        y += c * g
    save('lock_click.wav', reverb(y, 0.25, 0.12, seed=22))


def make_door_open():
    r = rng(31)
    t = tt(2.0)
    y = np.zeros_like(t)
    # handle press: click + spring
    tc = np.maximum(t - 0.02, 0)
    y += (modes(tc, [(1900, 0.02, 0.7), (3100, 0.012, 0.5), (900, 0.05, 0.4)]) + fft_filter(r.standard_normal(len(t)), 1500, 7000) * np.exp(-tc / 0.004)) * (t > 0.02) * 0.9
    # latch pulls out of the frame
    tl = np.maximum(t - 0.22, 0)
    y += (fft_filter(r.standard_normal(len(t)), 1200, 6000) * np.exp(-tl / 0.01) * 0.7 + modes(tl, [(1500, 0.03, 0.4)])) * (t > 0.22)
    # hinge creak: gliding sine with harmonics and a jittery amplitude
    tc = np.maximum(t - 0.32, 0)
    glide = 330 + 160 * np.sin(np.minimum(tc, 1.0) * 2.2) + 40 * np.sin(tc * 31)
    ph = 2 * np.pi * np.cumsum(glide) / SR
    creak = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * fft_filter(r.standard_normal(len(t)), 0.1, 90, 2) ** 2
    env = np.exp(-((tc - 0.4) / 0.35) ** 2) * (t > 0.32)
    y += creak / (np.max(np.abs(creak)) + 1e-9) * env * 0.5
    # a little air and wood as it swings open
    y += fft_filter(r.standard_normal(len(t)), 120, 900) * np.exp(-((t - 0.7) / 0.35) ** 2) * 0.1
    save('door_open.wav', reverb(y, 0.6, 0.25, seed=32))


# ------------------------------------------------------------------ small objects
def make_cup_clink():
    r = rng(41)
    t = tt(1.0)
    cup = modes(t, [(2850, 0.07, 0.9), (4430, 0.05, 0.7), (6120, 0.035, 0.45), (7900, 0.02, 0.25), (1650, 0.09, 0.3)])
    tick = fft_filter(r.standard_normal(len(t)), 2500, 10000) * np.exp(-t / 0.002) * 0.9
    # second cup answers a few ms later at a slightly different pitch
    t2 = np.maximum(t - 0.006, 0)
    cup2 = modes(t2, [(3090, 0.06, 0.55), (4780, 0.04, 0.4), (6600, 0.03, 0.25)]) * (t > 0.006)
    save('cup_clink.wav', reverb(cup + tick + cup2, 0.3, 0.15, seed=42))


def make_mask_down():
    r = rng(51)
    t = tt(0.9)
    knock = modes(t, [(980, 0.025, 0.7), (1620, 0.018, 0.45), (2480, 0.012, 0.25)])
    tick = fft_filter(r.standard_normal(len(t)), 800, 6500) * np.exp(-t / 0.005) * 0.9
    wood = np.sin(2 * np.pi * (95 + 40 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.07) * 1.0
    table = modes(t, [(210, 0.1, 0.5), (390, 0.07, 0.3)])
    save('mask_down.wav', reverb(knock + tick + wood + table, 0.4, 0.2, seed=52))


def make_bed_creak():
    r = rng(61)
    t = tt(2.0)
    # mattress compresses: soft low thump
    thump = np.sin(2 * np.pi * (48 + 20 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.18) * 1.2
    cloth = fft_filter(r.standard_normal(len(t)), 150, 1500) * np.exp(-((t - 0.1) / 0.12) ** 2) * 0.4
    # spring squeaks: three short gliding tones with stick-slip amplitude
    y = np.zeros_like(t)
    for at, dur, f0, f1, g in [(0.05, 0.55, 520, 640, 0.9), (0.38, 0.5, 700, 590, 0.6), (0.75, 0.6, 450, 520, 0.4)]:
        tc = t - at
        m = (tc >= 0) & (tc < dur)
        u = np.clip(tc / dur, 0, 1)
        f = f0 + (f1 - f0) * u + 25 * np.sin(2 * np.pi * 7 * tc)
        ph = 2 * np.pi * np.cumsum(f) / SR
        saw = np.sin(ph) + 0.55 * np.sin(2 * ph) + 0.35 * np.sin(3 * ph) + 0.2 * np.sin(4 * ph)
        stick = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * (28 + 8 * u) * tc)) * np.sin(2 * np.pi * 3.1 * tc)
        env = np.sin(np.pi * u) ** 1.5 * m
        y += saw * stick * env * g
    y = fft_filter(y, 300, 4200)
    # frame wood groans
    frame = modes(t, [(150, 0.25, 0.4), (240, 0.2, 0.25)]) * 0.5
    save('bed_creak.wav', reverb(thump + cloth + y * 0.6 + frame, 0.5, 0.22, seed=62))


def make_clock_tick():
    r = rng(71)
    buf = np.zeros(int(9.0 * SR))
    for i in range(8):
        tock = i % 2
        t = tt(0.35)
        f = 0.9 if tock else 1.0
        click = fft_filter(r.standard_normal(len(t)), 2200 * f, 7500) * np.exp(-t / 0.0022) * 1.1
        body = modes(t, [(1250 * f, 0.02, 0.9), (2480 * f, 0.012, 0.5), (640 * f, 0.03, 0.4)])
        place(buf, reverb(click + body, 0.3, 0.15, seed=72 + i), 0.4 + i * 1.0)
    save('clock_tick.wav', buf)


def make_cloth():
    r = rng(81)
    t = tt(4.0)
    n = r.standard_normal(len(t))
    base = fft_filter(n, 700, 7000, 3)
    # random rubbing envelope: a few smooth swells with fine crackle
    env = np.zeros_like(t)
    for _ in range(9):
        c, w, a = r.random() * 3.6 + 0.2, 0.08 + 0.25 * r.random(), 0.4 + 0.6 * r.random()
        env += a * np.exp(-((t - c) / w) ** 2)
    crackle = np.abs(fft_filter(r.standard_normal(len(t)), 40, 900, 2))
    crackle = crackle / crackle.max()
    y = base * env * (0.35 + 0.65 * crackle ** 0.7)
    save('cloth_rustle.wav', fade(y, 0.02, 0.1), peak=0.6)


# ------------------------------------------------------------------ people
def voice_pulse(f0, dur, vowel, r, vib=5.0):
    t = tt(dur)
    f = f0 * (1 + 0.04 * np.sin(2 * np.pi * vib * t)) * np.linspace(1.1, 0.8, len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = sum(np.sin(k * ph) / k ** 1.2 for k in range(1, 22))
    src += 0.25 * fft_filter(r.standard_normal(len(t)), 1000, 6000)          # breath
    y = formants(src, vowel)
    env = np.minimum(t / 0.02, 1) * np.exp(-t / (dur * 0.38))
    return y * env


VOWELS = {
    'a': [(730, 120, 1.0), (1090, 160, 0.6), (2440, 300, 0.25)],
    'e': [(530, 110, 1.0), (1840, 200, 0.5), (2480, 300, 0.22)],
    'o': [(570, 110, 1.0), (840, 140, 0.6), (2410, 300, 0.2)],
}


def make_laughter():
    r = rng(91)
    buf = np.zeros(int(4.5 * SR))
    voices = [(190, 0.0, 'a'), (240, 0.07, 'e'), (155, 0.14, 'a'), (275, 0.05, 'a'), (210, 0.2, 'o'), (170, 0.11, 'e')]
    for f0, delay, v in voices:
        n = int(6 + 4 * r.random())
        rate = 5.2 + 1.6 * r.random()
        for k in range(n):
            amp = np.exp(-k * 0.16) * (0.8 + 0.4 * r.random())
            ff = f0 * (1.0 - 0.012 * k) * (1 + 0.02 * r.standard_normal())
            p = voice_pulse(ff, 0.17, VOWELS[v], r)
            place(buf, norm(p, 0.5) * amp, 0.25 + delay + k / rate + 0.012 * r.standard_normal())
    save('laughter.wav', reverb(buf, 0.5, 0.25, seed=92), peak=0.8)


def make_crowd():
    r = rng(101)
    n = int(10.0 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # chatter: many "talkers", each a pitch glide through vowel-like formants, gated by random syllables
    for v in range(14):
        f0 = 100 + 150 * r.random()
        # slow random glide
        g = fft_filter(r.standard_normal(n), 0.1, 3, 2)
        g = g / (np.abs(g).max() + 1e-9)
        f = f0 * (1 + 0.25 * g)
        ph = 2 * np.pi * np.cumsum(f) / SR
        src = sum(np.sin(k * ph) / k for k in range(1, 18)) + 0.4 * r.standard_normal(n) * 0.2
        vow = list(VOWELS.values())[v % 3]
        sig = formants(src, vow)
        syl = fft_filter(r.standard_normal(n), 0.5, 7, 2)
        syl = np.clip(syl / (np.abs(syl).max() + 1e-9) * 2.2 + 0.2, 0, 1) ** 1.5
        out += sig * syl * (0.5 + r.random())
    out += fft_filter(r.standard_normal(n), 200, 3500) * 0.05
    out = reverb(out, 0.9, 0.35, seed=102)
    save('crowd_murmur.wav', fade(out, 0.05, 0.05), peak=0.7)


# ------------------------------------------------------------------ ambiences
def make_traffic():
    r = rng(111)
    n = int(16.0 * SR)
    t = np.arange(n) / SR
    base = fft_filter(r.standard_normal(n), 25, 380, 2)
    base *= 0.5 + 0.3 * np.sin(2 * np.pi * t / 7.3) ** 2
    y = base * 1.0
    # a few cars pass: lowpassed noise swells with a rising-then-falling tone band
    for c, w, a, f in [(2.2, 0.9, 0.9, 520), (6.4, 1.3, 1.1, 430), (9.8, 0.8, 0.7, 640), (13.1, 1.1, 1.0, 480)]:
        env = np.exp(-((t - c) / w) ** 2)
        band = fft_filter(r.standard_normal(n), f * 0.35, f * 1.4, 2)
        y += band * env * a * 1.2
    # one distant horn-less siren-ish whoosh is skipped on purpose: keep it dull and distant
    y = fft_filter(y, 30, 1100, 2)
    save('traffic_distant.wav', fade(y, 0.5, 0.5), peak=0.6)


def make_birds():
    r = rng(121)
    n = int(10.0 * SR)
    out = np.zeros(n)

    def chirp(f0, f1, dur, bend=1.0, harm=0.35):
        t = tt(dur)
        u = t / dur
        f = f0 + (f1 - f0) * u ** bend
        ph = 2 * np.pi * np.cumsum(f) / SR
        y = np.sin(ph) + harm * np.sin(2 * ph)
        env = np.sin(np.pi * u) ** 0.8
        return y * env

    def bird(at, kind):
        if kind == 0:    # rapid trill
            for i in range(int(5 + 4 * r.random())):
                place(out, chirp(4300 + 300 * r.random(), 3300, 0.05, 1.0) * (0.6 + 0.2 * r.random()), at + i * 0.075)
        elif kind == 1:  # two-note whistle
            place(out, chirp(2300, 2700, 0.16, 0.8, 0.15), at)
            place(out, chirp(3000, 2500, 0.2, 1.2, 0.15) * 0.9, at + 0.22)
        elif kind == 2:  # tweet-tweet
            for i in range(3):
                place(out, chirp(3600, 4900, 0.07, 0.7, 0.3) * (1 - i * 0.15), at + i * 0.13)
        else:            # warble
            f = 3000
            for i in range(7):
                f2 = 2600 + 1800 * r.random()
                place(out, chirp(f, f2, 0.09, 1.0, 0.2) * 0.7, at + i * 0.09)
                f = f2

    for kind, at in [(0, 0.3), (1, 1.4), (2, 2.7), (3, 3.6), (0, 4.9), (2, 5.8), (1, 6.5), (3, 7.5), (0, 8.4), (2, 9.2)]:
        bird(at + 0.1 * r.random(), kind)
    # a second, quieter, further bird layer
    quiet = np.zeros(n)
    keep = out
    out = quiet
    for kind, at in [(2, 0.9), (1, 3.1), (0, 5.2), (3, 7.0), (1, 8.8)]:
        bird(at, kind)
    out = keep + fft_filter(quiet, hi=4500, order=2) * 0.35
    out = fft_filter(out, 1500, 9000, 2)
    out = reverb(out, 1.2, 0.35, seed=122)
    out += fft_filter(r.standard_normal(n), 300, 3000, 2) * 0.006     # air
    save('birds_morning.wav', fade(out, 0.1, 0.1), peak=0.6)


def make_alarm():
    t = tt(3.2)
    y = np.zeros_like(t)

    def beep(at, f):
        tc = t - at
        m = (tc >= 0) & (tc < 0.11)
        e = np.minimum(tc / 0.004, 1) * np.minimum((0.11 - tc) / 0.006, 1) * m
        s = np.sin(2 * np.pi * f * tc) + 0.4 * np.sin(2 * np.pi * 2 * f * tc) + 0.15 * np.sin(2 * np.pi * 3 * f * tc)
        return np.tanh(1.6 * s) * e

    for rep in range(3):
        base = 0.0 + rep * 1.05
        for k in range(4):
            y += beep(base + k * 0.16, 1760)
    # slight phone-speaker colouring and a faint buzz of the vibration motor
    y = fft_filter(y, 500, 7500, 2)
    buzz = np.sin(2 * np.pi * 175 * t) * (np.sin(2 * np.pi * 9 * t) > 0) * 0.07
    save('phone_alarm.wav', reverb(y + buzz, 0.25, 0.12, seed=132))


# ------------------------------------------------------------------ party music (120 bpm, 8 bars)
def make_music():
    bpm = 120
    beat = 60 / bpm
    bars = 8
    n = int(bars * 4 * beat * SR)
    out = np.zeros(n)
    r = rng(141)
    # drums
    t = tt(0.4)
    kick = np.sin(2 * np.pi * (45 + 110 * np.exp(-t / 0.025)) * t) * np.exp(-t / 0.13) * 1.4
    kick += fft_filter(r.standard_normal(len(t)), 800, 5000) * np.exp(-t / 0.003) * 0.4
    th = tt(0.12)
    hat = fft_filter(r.standard_normal(len(th)), 7000, 15000) * np.exp(-th / 0.018) * 0.5
    ohat = fft_filter(r.standard_normal(len(tt(0.3))), 6500, 15000) * np.exp(-tt(0.3) / 0.09) * 0.35
    tc = tt(0.25)
    clap = np.zeros_like(tc)
    for k, off in enumerate([0, 0.011, 0.023, 0.04]):
        m = tc > off
        clap += fft_filter(r.standard_normal(len(tc)), 900, 4500) * np.exp(-np.maximum(tc - off, 0) / (0.012 if k < 3 else 0.07)) * m * 0.7
    # harmony: Am | F | C | G, two bars each
    chords = [(220.0, [220, 261.63, 329.63]), (174.61, [174.61, 220, 261.63]), (261.63, [261.63, 329.63, 392]), (196.0, [196, 246.94, 293.66])]
    roots = [55.0, 43.65, 65.41, 49.0]
    for bar in range(bars):
        ci = bar // 2
        for b in range(4):
            at = (bar * 4 + b) * beat
            place(out, kick, at)
            place(out, hat, at + beat / 2)
            if b in (1, 3):
                place(out, clap, at)
            if b == 3:
                place(out, ohat, at + beat / 2)
            # offbeat bass: 8ths with a short saw
            for h in range(2):
                tb = tt(beat / 2)
                f = roots[ci] * (2 if (b + h) % 4 == 3 else 1)
                bass = (np.sin(2 * np.pi * f * tb) + 0.4 * np.sin(2 * np.pi * 2 * f * tb)) * np.exp(-tb / 0.18)
                if h == 1:
                    place(out, bass * 0.9, at + h * beat / 2)
        # chord stabs on the offbeats
        for b in range(4):
            at = (bar * 4 + b) * beat + beat / 2
            ts = tt(0.3)
            stab = sum(sum(np.sin(2 * np.pi * f * k * ts + 0.3 * k) / k for k in range(1, 8)) for f in chords[ci][1])
            stab = fft_filter(stab, 200, 2400, 2) * np.exp(-ts / 0.09) * 0.17
            place(out, stab, at)
        # simple lead arpeggio
        arp = chords[ci][1]
        for s in range(16):
            at = (bar * 4) * beat + s * beat / 4
            ts = tt(0.2)
            f = arp[(s * 3) % 3] * (2 if s % 4 < 2 else 4)
            note = np.sin(2 * np.pi * f * ts) * np.exp(-ts / 0.06) * 0.07
            place(out, note, at)
    # sidechain-style pump (the whole mix ducks on every kick)
    pump = np.ones(n)
    for i in range(bars * 4):
        a = int(i * beat * SR)
        d = int(0.22 * SR)
        k = np.arange(min(d, n - a)) / d
        pump[a:a + len(k)] *= 0.45 + 0.55 * k
    out = out * pump
    save('party_music.wav', out, peak=0.85)


if __name__ == '__main__':
    make_footsteps()
    make_door_close()
    make_lock_click()
    make_door_open()
    make_cup_clink()
    make_mask_down()
    make_bed_creak()
    make_clock_tick()
    make_cloth()
    make_laughter()
    make_crowd()
    make_traffic()
    make_birds()
    make_alarm()
    make_music()
