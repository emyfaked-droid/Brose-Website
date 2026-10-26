#!/usr/bin/env python3
"""Generate the extra stand-in sounds of one film: python3 scripts/make_film_sfx.py <name>

Runs make() from sfx_films/<name>.py (dashes become underscores). The WAVs go to sfx/, like make_sfx.py.
"""
import importlib, os, sys

here = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2:
    sys.exit('usage: python3 scripts/make_film_sfx.py <name>')
name = sys.argv[1].replace('-', '_')
sys.argv = [sys.argv[0]]                       # make_sfx reads argv[1] as its output folder: keep the default (sfx/)
sys.path[:0] = [here, os.path.join(here, '..', 'sfx_films')]
importlib.import_module(name).make()
