"""Extra generated stand-in sounds for one film (only for sounds that sfx/ does not have yet).

Run: python3 scripts/make_film_sfx.py <name>   -> writes the WAVs into sfx/
All helpers of scripts/make_sfx.py are available: rng, tt, place, modes, fft_filter, reverb, fade, norm, save,
footstep, breath, cloth_burst, squeak, chime, loopable, periodic_noise, ...  (grep 'def ' scripts/make_sfx.py)
Prefer real recordings: drop e.g. sfx/door_creak.mp3 into sfx/ and skip generating it.
"""
from make_sfx import *  # noqa: F401,F403


def make_example_knock():
    """three soft knocks on a wooden door"""
    r = rng(901)
    buf = np.zeros(int(1.2 * SR))
    for i in range(3):
        t = tt(0.25)
        hit = modes(t, [(180, 0.05, 1.0), (420, 0.03, 0.5), (900, 0.015, 0.2)])
        hit += fft_filter(r.standard_normal(len(t)), 600, 3000) * np.exp(-t / 0.004) * 0.3
        place(buf, hit * (0.9 + 0.2 * r.random()), 0.1 + i * 0.28)
    save('example_knock.wav', reverb(buf, 0.35, 0.18, seed=902), peak=0.8)


def make():
    """called by scripts/make_film_sfx.py: list every generator of this film here"""
    make_example_knock()
